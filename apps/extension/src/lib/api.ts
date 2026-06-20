import { getApiUrl, getAuthToken } from "./storage"
import type { UploadCompleteResponse, PlanLimitsResponse, UploadPrepareResponse } from "@screenflow/shared"

async function apiFetch(path: string, options: RequestInit = {}) {
  const baseUrl = await getApiUrl()
  const token = await getAuthToken()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    // No credentials:"include" — Supabase SameSite=Lax cookies don't work
    // from extension service workers. We use Bearer token auth instead.
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }))
    const e = new Error(err.error ?? `HTTP ${res.status}`) as Error & {
      limitReached?: boolean
      driveMissing?: boolean
    }
    e.limitReached = err.limitReached ?? false
    e.driveMissing = err.driveMissing ?? false
    throw e
  }

  return res.json()
}

export async function checkLimits(): Promise<PlanLimitsResponse> {
  return apiFetch("/api/me/limits")
}

export async function createUploadSession(title: string, mimeType: string): Promise<UploadPrepareResponse> {
  return apiFetch("/api/uploads/create", {
    method: "POST",
    body: JSON.stringify({ title, mimeType }),
  })
}

export async function completeUpload(
  videoId: string,
  googleDriveFileId: string,
  durationSeconds: number,
  thumbnailDataUrl?: string
): Promise<UploadCompleteResponse> {
  return apiFetch("/api/uploads/complete", {
    method: "POST",
    body: JSON.stringify({ videoId, googleDriveFileId, durationSeconds, thumbnailDataUrl }),
  })
}

/**
 * Upload blob to Google Drive resumable session URL.
 * Uses the access token returned by /api/uploads/create.
 */
export async function uploadBlobToDrive(
  uploadUrl: string,
  accessToken: string,
  blob: Blob,
  onProgress?: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", uploadUrl)
    xhr.setRequestHeader("Content-Type", blob.type)
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`)
    xhr.setRequestHeader("Content-Length", String(blob.size))
    // Don't let a stalled PUT hang forever (stuck at 0%): fail after 120s idle.
    xhr.timeout = 120000
    xhr.ontimeout = () => reject(new Error("Tempo de upload ao Drive esgotado (120s)"))

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const data = JSON.parse(xhr.responseText) as { id: string }
          resolve(data.id)
        } catch {
          reject(new Error("Invalid Drive response"))
        }
      } else {
        reject(new Error(`Drive upload failed: ${xhr.status}`))
      }
    }

    xhr.onerror = () => reject(new Error("Upload network error"))
    xhr.send(blob)
  })
}
