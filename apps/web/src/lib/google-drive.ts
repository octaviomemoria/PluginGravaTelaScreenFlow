import { prisma } from "./prisma"

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files"
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files"

export interface DriveTokens {
  accessToken: string
  refreshToken: string
  expiryDate: Date
}

export interface DriveUploadSession {
  uploadUrl: string
  fileId?: string
}

function getOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials not configured")
  return { clientId, clientSecret }
}

export function getGoogleAuthUrl(state: string): string {
  const { clientId } = getOAuthConfig()
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.file",
    access_type: "offline",
    prompt: "consent",
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string): Promise<DriveTokens> {
  const { clientId, clientSecret } = getOAuthConfig()
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to exchange code: ${err}`)
  }

  const data = (await res.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiryDate: new Date(Date.now() + data.expires_in * 1000),
  }
}

export async function refreshAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { googleRefreshToken: true, googleTokenExpiry: true, googleAccessToken: true },
  })

  if (!user.googleRefreshToken) throw new Error("No refresh token — user must reconnect Google Drive")

  // Return cached token if still valid (5-minute buffer)
  if (user.googleTokenExpiry && user.googleTokenExpiry.getTime() - Date.now() > 5 * 60 * 1000) {
    return user.googleAccessToken!
  }

  const { clientId, clientSecret } = getOAuthConfig()

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: user.googleRefreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to refresh token: ${err}`)
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }
  const newExpiry = new Date(Date.now() + data.expires_in * 1000)

  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessToken: data.access_token,
      googleTokenExpiry: newExpiry,
    },
  })

  return data.access_token
}

export async function createResumableUploadSession(
  accessToken: string,
  fileName: string,
  mimeType: string,
  folderId?: string
): Promise<string> {
  const metadata: Record<string, unknown> = {
    name: fileName,
    mimeType,
  }
  if (folderId) metadata.parents = [folderId]

  const res = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=resumable`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": mimeType,
    },
    body: JSON.stringify(metadata),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to create upload session: ${err}`)
  }

  const uploadUrl = res.headers.get("Location")
  if (!uploadUrl) throw new Error("No upload URL in Drive response")
  return uploadUrl
}

export async function setFilePermissionPublic(accessToken: string, fileId: string): Promise<void> {
  const res = await fetch(`${DRIVE_FILES_URL}/${fileId}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to set file permission: ${err}`)
  }
}

export async function setFilePermissionPrivate(accessToken: string, fileId: string): Promise<void> {
  // List and remove "anyone" permissions
  const listRes = await fetch(`${DRIVE_FILES_URL}/${fileId}/permissions`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!listRes.ok) return

  const { permissions } = (await listRes.json()) as { permissions: Array<{ id: string; type: string }> }

  for (const perm of permissions) {
    if (perm.type === "anyone") {
      await fetch(`${DRIVE_FILES_URL}/${fileId}/permissions/${perm.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    }
  }
}

export function getDriveStreamUrl(fileId: string): string {
  return `/api/proxy/video/${fileId}`
}

export async function deleteFile(accessToken: string, fileId: string): Promise<void> {
  await fetch(`${DRIVE_FILES_URL}/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function getOrCreateAppFolder(accessToken: string): Promise<string> {
  const searchRes = await fetch(
    `${DRIVE_FILES_URL}?q=name%3D'ScreenFlow'%20and%20mimeType%3D'application%2Fvnd.google-apps.folder'%20and%20trashed%3Dfalse&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (searchRes.ok) {
    const { files } = (await searchRes.json()) as { files: Array<{ id: string }> }
    if (files.length > 0) return files[0]!.id
  }

  // Create folder
  const createRes = await fetch(DRIVE_FILES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "ScreenFlow", mimeType: "application/vnd.google-apps.folder" }),
  })

  if (!createRes.ok) throw new Error("Failed to create ScreenFlow folder in Drive")
  const folder = (await createRes.json()) as { id: string }
  return folder.id
}
