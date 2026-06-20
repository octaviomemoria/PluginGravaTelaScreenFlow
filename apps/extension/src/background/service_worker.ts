import type { ExtensionMessage, RecordingConfig, RecordingState } from "../types"
import { checkLimits } from "../lib/api"

let recordingState: RecordingState = "idle"
let startTime: number | null = null
let accumulatedMs = 0          // ms elapsed before the current timer segment (pause support)
let timerInterval: ReturnType<typeof setInterval> | null = null
let currentConfig: RecordingConfig | null = null
let uploadPercent = 0
let lastErrorMessage: string | null = null
let lastResult: { shareUrl: string; publicId: string } | null = null

const OFFSCREEN_URL = chrome.runtime.getURL("src/offscreen/index.html")
const SW_STATE_KEY = "sw_persisted_state"

// ── State persistence (survives Chrome terminating the service worker) ────────

async function persistState() {
  await chrome.storage.local.set({
    [SW_STATE_KEY]: { recordingState, uploadPercent, lastErrorMessage, lastResult },
  })
}

async function restoreState() {
  const data = await chrome.storage.local.get(SW_STATE_KEY)
  const saved = data[SW_STATE_KEY] as {
    recordingState?: RecordingState
    uploadPercent?: number
    lastErrorMessage?: string | null
    lastResult?: { shareUrl: string; publicId: string } | null
  } | undefined

  if (!saved) return

  // If Chrome killed us mid-recording or mid-upload, report the interruption
  if (
    saved.recordingState === "recording" ||
    saved.recordingState === "paused" ||
    saved.recordingState === "uploading"
  ) {
    console.warn("[SF] restoreState: SW reiniciado durante", saved.recordingState, "→ marcando como erro")
    recordingState = "error"
    lastErrorMessage = "A gravação foi interrompida inesperadamente. Tente novamente."
    uploadPercent = 0
    lastResult = null
  } else {
    recordingState = saved.recordingState ?? "idle"
    uploadPercent = saved.uploadPercent ?? 0
    lastErrorMessage = saved.lastErrorMessage ?? null
    lastResult = saved.lastResult ?? null
  }
}

// Restore state immediately when the service worker starts
restoreState()

// ── Helpers ───────────────────────────────────────────────────────────────────

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

async function closeOffscreenDocument() {
  try {
    if (await chrome.offscreen.hasDocument()) {
      await chrome.offscreen.closeDocument()
    }
  } catch {
    // ignore — document may already be gone
  }
}

function setState(state: RecordingState) {
  recordingState = state
  if (state !== "error") lastErrorMessage = null
  if (state === "idle") {
    uploadPercent = 0
    lastResult = null
    accumulatedMs = 0
  }
  const elapsed = getElapsedSeconds()
  chrome.runtime.sendMessage({ type: "STATE_UPDATE", state, elapsed }).catch(() => {})
  persistState()
}

function sendToPopup(msg: ExtensionMessage) {
  chrome.runtime.sendMessage(msg).catch(() => {})
}

function setProgress(percent: number) {
  uploadPercent = percent
  sendToPopup({ type: "UPLOAD_PROGRESS", percent })
  broadcastToContent({ type: "UPLOAD_PROGRESS", percent })
  persistState()
}

function broadcastToContent(msg: ExtensionMessage) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) chrome.tabs.sendMessage(tab.id, msg).catch(() => {})
    })
  })
}

// ── Timer (supports pause/resume without resetting elapsed) ──────────────────

function getElapsedSeconds(): number {
  const current = startTime ? Date.now() - startTime : 0
  return Math.floor((accumulatedMs + current) / 1000)
}

function startTimer() {
  startTime = Date.now()
  timerInterval = setInterval(() => {
    broadcastToContent({ type: "UPDATE_TIMER", elapsed: getElapsedSeconds() })
  }, 1000)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  if (startTime) {
    accumulatedMs += Date.now() - startTime
    startTime = null
  }
}

// ── Recording handlers ────────────────────────────────────────────────────────

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
    accumulatedMs = 0  // Reset accumulated time for a fresh recording
    setState("recording")

    // Close any lingering offscreen document from a previous (possibly stuck)
    // session so each recording starts from a clean slate.
    await closeOffscreenDocument()
    await ensureOffscreenDocument()
    chrome.runtime.sendMessage({ type: "START_RECORDING", config })

    startTimer()
    broadcastToContent({ type: "SHOW_FLOATING_BAR" })
  } catch (err) {
    const msg = err instanceof Error && (err as any).limitReached
      ? (err as Error).message
      : err instanceof Error && (err as any).driveMissing
        ? "Conecte seu Google Drive em Configurações antes de gravar."
        : String(err)
    lastErrorMessage = msg
    setState("error")
    sendToPopup({ type: "RECORDING_ERROR", message: msg })
    broadcastToContent({ type: "RECORDING_ERROR", message: msg })
  }
}

async function handleStopRecording() {
  stopTimer()
  setState("uploading")
  broadcastToContent({ type: "HIDE_FLOATING_BAR" })
  chrome.runtime.sendMessage({ type: "STOP_RECORDING" })
}

function handlePauseRecording() {
  stopTimer()  // stopTimer accumulates elapsed into accumulatedMs
  setState("paused")
  chrome.runtime.sendMessage({ type: "PAUSE_RECORDING" })
}

function handleResumeRecording() {
  setState("recording")
  startTimer()  // picks up from accumulatedMs (pause duration is excluded)
  chrome.runtime.sendMessage({ type: "RESUME_RECORDING" })
}

function handleCancelRecording() {
  stopTimer()
  setState("idle")
  broadcastToContent({ type: "HIDE_FLOATING_BAR" })
  chrome.runtime.sendMessage({ type: "CANCEL_RECORDING" })
  closeOffscreenDocument()
}

// O upload acontece DENTRO do documento offscreen (ver recorder.ts). O service
// worker só reage aos resultados via OFFSCREEN_UPLOAD_PROGRESS/DONE/ERROR.

function handleUploadDone(shareUrl: string, publicId: string) {
  setProgress(100)
  lastResult = { shareUrl, publicId }
  setState("done")
  chrome.runtime.sendMessage({ type: "RECORDING_DONE", result: { shareUrl, publicId } }).catch(() => {})
  closeOffscreenDocument()
}

function handleUploadError(message: string) {
  console.error("[SF] OFFSCREEN_UPLOAD_ERROR:", message)
  lastErrorMessage = message
  setState("error")
  sendToPopup({ type: "RECORDING_ERROR", message })
  broadcastToContent({ type: "RECORDING_ERROR", message })
  closeOffscreenDocument()
}

// ── Message listeners ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  switch (message.type) {
    case "START_RECORDING":
      // Allow starting from any non-active state (idle/error/done/countdown) so a
      // stale "error"/"done" from a previous session never blocks a new recording.
      if (recordingState !== "recording" && recordingState !== "paused" && recordingState !== "uploading") {
        handleStartRecording(message.config)
      }
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
    case "OFFSCREEN_UPLOAD_PROGRESS":
      setProgress(message.percent)
      break
    case "OFFSCREEN_UPLOAD_DONE":
      // State-agnostic: apply even if the SW was restarted and restored to "error".
      handleUploadDone(message.result.shareUrl, message.result.publicId)
      break
    case "OFFSCREEN_UPLOAD_ERROR":
      handleUploadError(message.message)
      break
    case "KEEPALIVE":
      // No-op: simply receiving this message resets the MV3 idle timer,
      // keeping the service worker alive through recording + upload.
      break
    case "RECORDING_ERROR":
      // Error raised inside the offscreen document (e.g. camera acquisition failed).
      // Reset SW state so the user isn't stuck in "recording". Guard against the
      // SW's own broadcasts by only acting on messages from the offscreen document.
      if (sender.url?.includes("offscreen") && recordingState !== "error") {
        lastErrorMessage = message.message
        setState("error")
        broadcastToContent({ type: "HIDE_FLOATING_BAR" })
        closeOffscreenDocument()
      }
      break
    case "GET_STATE":
      sendResponse({
        state: recordingState,
        elapsed: getElapsedSeconds(),
        uploadPercent,
        errorMessage: lastErrorMessage,
        result: lastResult,
      })
      return true
  }
})

export {}
