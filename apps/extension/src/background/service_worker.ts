import type { ExtensionMessage, RecordingConfig, RecordingState } from "../types"
import { checkLimits, createUploadSession, completeUpload, uploadBlobToDrive } from "../lib/api"

let recordingState: RecordingState = "idle"
let startTime: number | null = null
let timerInterval: ReturnType<typeof setInterval> | null = null
let currentConfig: RecordingConfig | null = null
let uploadPercent = 0
let lastErrorMessage: string | null = null
let lastResult: { shareUrl: string; publicId: string } | null = null

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
  if (state !== "error") lastErrorMessage = null
  if (state === "idle") { uploadPercent = 0; lastResult = null }
  const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0
  chrome.runtime.sendMessage({ type: "STATE_UPDATE", state, elapsed }).catch(() => {})
}

function sendToPopup(msg: ExtensionMessage) {
  chrome.runtime.sendMessage(msg).catch(() => {})
}

function setProgress(percent: number) {
  uploadPercent = percent
  sendToPopup({ type: "UPLOAD_PROGRESS", percent })
  broadcastToContent({ type: "UPLOAD_PROGRESS", percent })
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
      const msg = "Conecte seu Google Drive em Configurações antes de gravar."
      lastErrorMessage = msg
      setState("error")
      sendToPopup({ type: "RECORDING_ERROR", message: msg })
      broadcastToContent({ type: "RECORDING_ERROR", message: msg })
      return
    }

    if (!limits.canRecord) {
      const used = Math.round(limits.recordingMinutesUsed)
      const total = limits.limits.recordingMinutesPerMonth
      const msg = `Limite mensal atingido (${used}/${total} min). Faça upgrade para continuar.`
      lastErrorMessage = msg
      setState("error")
      sendToPopup({ type: "RECORDING_ERROR", message: msg })
      broadcastToContent({ type: "RECORDING_ERROR", message: msg })
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
    setProgress(5)

    const title = `Gravação ${new Date().toLocaleDateString("pt-BR")}`
    const session = await createUploadSession(title, blob.type)

    setProgress(10)

    const googleDriveFileId = await uploadBlobToDrive(
      session.uploadUrl,
      session.googleAccessToken,
      blob,
      (pct) => {
        setProgress(10 + Math.floor(pct * 0.85))
      }
    )

    setProgress(96)

    const { shareUrl, publicId } = await completeUpload(
      session.videoId,
      googleDriveFileId,
      durationSeconds,
      thumbnailDataUrl
    )

    setProgress(100)

    lastResult = { shareUrl, publicId }
    setState("done")
    chrome.runtime.sendMessage({ type: "RECORDING_DONE", result: { shareUrl, publicId } }).catch(() => {})
  } catch (err) {
    const msg = String(err)
    lastErrorMessage = msg
    setState("error")
    sendToPopup({ type: "RECORDING_ERROR", message: msg })
    broadcastToContent({ type: "RECORDING_ERROR", message: msg })
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
      sendResponse({
        state: recordingState,
        elapsed: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0,
        uploadPercent,
        errorMessage: lastErrorMessage,
        result: lastResult,
      })
      return true
  }
})

chrome.runtime.onMessage.addListener((message: { type: string; blobBase64: string; mimeType: string; durationSeconds: number; thumbnailDataUrl?: string }) => {
  if (message.type === "VIDEO_READY") {
    // Only process if we are actually waiting for a video (not cancelled)
    if (recordingState !== "uploading") return
    const { blobBase64, mimeType, durationSeconds, thumbnailDataUrl } = message
    const binary = atob(blobBase64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)!
    const blob = new Blob([bytes], { type: mimeType })
    handleVideoReady(blob, durationSeconds, thumbnailDataUrl)
  }
})

export {}
