export type RecordingMode = "screen" | "tab" | "camera" | "screen+camera" | "audio"

export type RecordingState = "idle" | "countdown" | "recording" | "paused" | "uploading" | "done" | "error"

export interface RecordingConfig {
  mode: RecordingMode
  micDeviceId: string | null
  cameraDeviceId: string | null
  captureSystemAudio: boolean
}

export interface RecordingResult {
  shareUrl: string
  publicId: string
}

export interface UploadAuth {
  token: string | null
  apiUrl: string
}

export type ExtensionMessage =
  | { type: "START_RECORDING"; config: RecordingConfig; auth?: UploadAuth }
  | { type: "STOP_RECORDING" }
  | { type: "PAUSE_RECORDING" }
  | { type: "RESUME_RECORDING" }
  | { type: "CANCEL_RECORDING" }
  | { type: "GET_STATE" }
  | { type: "STATE_UPDATE"; state: RecordingState; elapsed: number }
  | { type: "RECORDING_DONE"; result: RecordingResult }
  | { type: "RECORDING_ERROR"; message: string }
  | { type: "OFFSCREEN_READY" }
  | { type: "KEEPALIVE" }
  | { type: "OFFSCREEN_UPLOAD_PROGRESS"; percent: number }
  | { type: "OFFSCREEN_UPLOAD_DONE"; result: RecordingResult }
  | { type: "OFFSCREEN_UPLOAD_ERROR"; message: string }
  | { type: "SHOW_FLOATING_BAR" }
  | { type: "HIDE_FLOATING_BAR" }
  | { type: "UPDATE_TIMER"; elapsed: number }
  | { type: "UPLOAD_PROGRESS"; percent: number }
