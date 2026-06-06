import type { ExtensionMessage, RecordingConfig, RecordingState } from "../types"
import { checkLimits, createUploadSession, completeUpload, uploadBlobToDrive } from "../lib/api"

let recordingState: RecordingState = "idle"
let startTime: number | null = null
let timerInterval: ReturnType<typeof setInterval> | null = null
let currentConfig: RecordingConfig | null = null

const OFFSCREEN_URL = chrome.runtime.getURL("src/offscreen/index.html")

async function ensureOffscreenDocument() {
  const existing = await chrome.offscreen.hasDocument()
  if (!existing) {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: [chrome.offscreen.Reason.USER_MEDIA, chrome.offscreen.Reason.DISPLAY_MEDIA],
      justification: "Gravação de tela e câmera via MediaRecorder",
    })
  }
}

function setState(state: RecordingState) {
  recordingState = state
  const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0
  chrome.runtime.sendMessage({ type: "STATE_UPDATE", state, elapsed }).catch(() => {})
}

function broadcastToContent(msg: ExtensionMessage) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) chrome.tabs.sendMessage(tab.id, msg).catch(() => {})
    })
  })
}

function startTimer() {
  startTime = Date.now()
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime!) / 1000)
    broadcastToContent({ type: "UPDATE_TIMER", elapsed })
  }, 1000)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

async function handleStartRecording(config: RecordingConfig) {
  try {
    const limits = await checkLimits()

    if (!limits.googleDriveConnected) {
      broadcastToContent({
        type: "RECORDING_ERROR",
        message: "Conecte seu Google Drive em Configurações antes de gravar.",
      })
      return
    }

    if (!limits.canRecord) {
      const used = Math.round(limits.recordingMinutesUsed)
      const total = limits.limits.recordingMinutesPerMonth
      broadcastToContent({
        type: "RECORDING_ERROR",
        message: `Limite mensal atingido (${used}/${total} min). Faça upgrade para continuar.`,
      })
      return
    }

    currentConfig = config
    setState("recording")

    await ensureOffscreenDocument()
    chrome.runtime.sendMessage({ type: "START_RECORDING", config })

    startTimer()
    broadcastToContent({ type: "SHOW_FLOATING_BAR" })
  } catch (err) {
    setState("error")
    broadcastToContent({ type: "RECORDING_ERROR", message: String(err) })
  }
}

async function handleStopRecording() {
  stopTimer()
  setState("uploading")
  broadcastToContent({ type: "HIDE_FLOATING_BAR" })
  chrome.runtime.sendMessage({ type: "STOP_RECORDING" })
}

function handlePauseRecording() {
  setState("paused")
  stopTimer()
  chrome.runtime.sendMessage({ type: "PAUSE_RECORDING" })
}

function handleResumeRecording() {
  setState("recording")
  startTimer()
  chrome.runtime.sendMessage({ type: "RESUME_RECORDING" })
}

function handleCancelRecording() {
  stopTimer()
  setState("idle")
  broadcastToContent({ type: "HIDE_FLOATING_BAR" })
  chrome.runtime.sendMessage({ type: "CANCEL_RECORDING" })
}

async function handleVideoReady(blob: Blob, durationSeconds: number, thumbnailDataUrl?: string) {
  try {
    broadcastToContent({ type: "UPLOAD_PROGRESS", percent: 5 })

    const title = `Gravação ${new Date().toLocaleDateString("pt-BR")}`
    const session = await createUploadSession(title, blob.type)

    broadcastToContent({ type: "UPLOAD_PROGRESS", percent: 10 })

    const googleDriveFileId = await uploadBlobToDrive(
      session.uploadUrl,
      session.googleAccessToken,
      blob,
      (pct) => {
        broadcastToContent({ type: "UPLOAD_PROGRESS", percent: 10 + Math.floor(pct * 0.85) })
      }
    )

    broadcastToContent({ type: "UPLOAD_PROGRESS", percent: 96 })

    const { shareUrl, publicId } = await completeUpload(
      session.videoId,
      googleDriveFileId,
      durationSeconds,
      thumbnailDataUrl
    )

    broadcastToContent({ type: "UPLOAD_PROGRESS", percent: 100 })

    setState("done")
    chrome.runtime.sendMessage({ type: "RECORDING_DONE", result: { shareUrl, publicId } }).catch(() => {})
  } catch (err) {
    setState("error")
    broadcastToContent({ type: "RECORDING_ERROR", message: String(err) })
  }
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  switch (message.type) {
    case "START_RECORDING":
      if (recordingState === "idle") handleStartRecording(message.config)
      break
    case "STOP_RECORDING":
      if (recordingState === "recording" || recordingState === "paused") handleStopRecording()
      break
    case "PAUSE_RECORDING":
      if (recordingState === "recording") handlePauseRecording()
      break
    case "RESUME_RECORDING":
      if (recordingState === "paused") handleResumeRecording()
      break
    case "CANCEL_RECORDING":
      handleCancelRecording()
      break
    case "GET_STATE":
      sendResponse({ state: recordingState, elapsed: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0 })
      return true
  }
})

chrome.runtime.onMessage.addListener((message: { type: string; blobBase64: string; mimeType: string; durationSeconds: number; thumbnailDataUrl?: string }) => {
  if (message.type === "VIDEO_READY") {
    const { blobBase64, mimeType, durationSeconds, thumbnailDataUrl } = message
    const binary = atob(blobBase64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)!
    const blob = new Blob([bytes], { type: mimeType })
    handleVideoReady(blob, durationSeconds, thumbnailDataUrl)
  }
})

export {}
