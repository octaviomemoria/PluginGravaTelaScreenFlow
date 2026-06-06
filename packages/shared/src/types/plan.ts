export type Plan = "FREE" | "PRO" | "BUSINESS"

export type Visibility = "PRIVATE" | "LINK" | "PUBLIC"

export interface PlanLimits {
  recordingMinutesPerMonth: number
  transcriptionMinutesPerMonth: number
  linkExpiryDays: number | null
  watermark: boolean
  maxActiveVideos: number | null
  seats: number
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    recordingMinutesPerMonth: 120,       // 2h/mês
    transcriptionMinutesPerMonth: 0,
    linkExpiryDays: 14,                  // links expiram em 14 dias
    watermark: true,
    maxActiveVideos: 10,
    seats: 1,
  },
  PRO: {
    recordingMinutesPerMonth: 1200,      // 20h/mês
    transcriptionMinutesPerMonth: 180,   // 3h/mês
    linkExpiryDays: null,                // permanente
    watermark: false,
    maxActiveVideos: null,
    seats: 1,
  },
  BUSINESS: {
    recordingMinutesPerMonth: 9600,      // 160h/mês
    transcriptionMinutesPerMonth: 900,   // 15h/mês
    linkExpiryDays: null,
    watermark: false,
    maxActiveVideos: null,
    seats: 5,
  },
}

export const PLAN_PRICES_BRL = {
  PRO:      { monthly: 39,  annual: 390  },
  BUSINESS: { monthly: 119, annual: 1190 },
} as const

export const ADDON_PRICES_BRL = {
  extraRecordingHour:       5,
  extraTranscriptionHour:   4,
  extraSeat:               29,
  linkExtension:            9,
  customDomain:            19,
} as const
