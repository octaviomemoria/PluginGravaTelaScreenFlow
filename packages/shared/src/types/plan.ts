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
    recordingMinutesPerMonth: 240,       // 4h/mês
    transcriptionMinutesPerMonth: 60,    // 1h/mês
    linkExpiryDays: 7,                   // links expiram em 7 dias
    watermark: true,
    maxActiveVideos: 10,
    seats: 1,
  },
  PRO: {
    recordingMinutesPerMonth: 1800,      // 30h/mês
    transcriptionMinutesPerMonth: 300,   // 5h/mês
    linkExpiryDays: null,                // permanente
    watermark: false,
    maxActiveVideos: null,
    seats: 1,
  },
  BUSINESS: {
    recordingMinutesPerMonth: 7200,      // 120h/mês
    transcriptionMinutesPerMonth: 600,   // 10h/mês
    linkExpiryDays: null,
    watermark: false,
    maxActiveVideos: null,
    seats: 5,
  },
}

export const PLAN_PRICES_BRL = {
  PRO:      { monthly: 49,  annual: 490  },
  BUSINESS: { monthly: 99,  annual: 990  },
} as const

// R$0,40 por minuto excedente (PRO e BUSINESS)
export const OVERAGE_PRICE_BRL = {
  pricePerMinute: 0.40,
} as const

export const ADDON_PRICES_BRL = {
  extraRecordingHour:       24,  // R$0,40 × 60min
  extraTranscriptionHour:    4,
  extraSeat:                29,
  linkExtension:             9,
  customDomain:             19,
} as const
