import type { Plan, Visibility } from "./plan"

export interface VideoMeta {
  id: string
  publicId: string
  title: string
  googleDriveFileId: string
  playbackUrl: string
  thumbnailUrl: string | null
  durationSeconds: number | null
  recordingMinutes: number
  visibility: Visibility
  linkExpiresAt: string | null
  createdAt: string
  userId: string
}

export interface UserProfile {
  id: string
  email: string
  name: string | null
  plan: Plan
  stripeCustomerId: string | null
  googleDriveConnected: boolean
}

export interface UploadPrepareResponse {
  videoId: string
  uploadUrl: string          // URL da sessão de upload no Google Drive
  googleAccessToken: string  // token temporário para a extensão usar
  fileId?: string            // ID do arquivo no Drive (após criação da sessão)
}

export interface UploadCompletePayload {
  videoId: string
  googleDriveFileId: string
  durationSeconds: number
  thumbnailDataUrl?: string
}

export interface UploadCompleteResponse {
  shareUrl: string
  publicId: string
}

export interface PlanLimitsResponse {
  plan: Plan
  recordingMinutesUsed: number
  transcriptionMinutesUsed: number
  limits: {
    recordingMinutesPerMonth: number
    transcriptionMinutesPerMonth: number
    linkExpiryDays: number | null
    watermark: boolean
    maxActiveVideos: number | null
  }
  canRecord: boolean
  googleDriveConnected: boolean
}

export interface TranscriptSegment {
  start: number
  end: number
  text: string
  confidence: number
}

export interface TranscriptData {
  videoId: string
  language: string
  segments: TranscriptSegment[]
  fullText: string
  createdAt: string
}
