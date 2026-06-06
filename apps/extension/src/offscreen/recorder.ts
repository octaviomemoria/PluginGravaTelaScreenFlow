import type { ExtensionMessage, RecordingConfig } from "../types"

let mediaRecorder: MediaRecorder | null = null
let recordedChunks: Blob[] = []
let displayStream: MediaStream | null = null
let cameraStream: MediaStream | null = null
let combinedStream: MediaStream | null = null
let startTime: number | null = null
let canvas: OffscreenCanvas | null = null
let thumbnailDataUrl: string | null = null

async function captureScreenThumbnail(stream: MediaStream): Promise<string | undefined> {
  try {
    const track = stream.getVideoTracks()[0]
    if (!track) return undefined

    const imageCapture = new (window as any).ImageCapture(track)
    const bitmap = await imageCapture.grabFrame()

    const c = document.createElement("canvas")
    c.width = Math.min(bitmap.width, 1280)
    c.height = Math.round((c.width / bitmap.width) * bitmap.height)
    const ctx = c.getContext("2d")!
    ctx.drawImage(bitmap, 0, 0, c.width, c.height)
    return c.toDataURL("image/jpeg", 0.7)
  } catch {
    return undefined
  }
}

async function startRecording(config: RecordingConfig) {
  recordedChunks = []
  startTime = Date.now()

  try {
    if (config.mode === "camera") {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: config.cameraDeviceId ? { deviceId: config.cameraDeviceId } : true,
        audio: config.micDeviceId ? { deviceId: config.micDeviceId } : true,
      })
      combinedStream = cameraStream
    } else {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: config.captureSystemAudio,
      })

      const tracks = [...displayStream.getTracks()]

      if (config.mode === "screen+camera" && config.cameraDeviceId !== null) {
        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({
            video: config.cameraDeviceId ? { deviceId: config.cameraDeviceId } : true,
          })
        } catch {
          // Camera failed, continue without it
        }
      }

      if (config.micDeviceId !== undefined) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: config.micDeviceId ? { deviceId: config.micDeviceId } : true,
            video: false,
          })
          micStream.getAudioTracks().forEach((t) => tracks.push(t))
        } catch {
          // Mic failed, continue without it
        }
      }

      combinedStream = new MediaStream(tracks)

      // Capture thumbnail 2s after start
      setTimeout(async () => {
        thumbnailDataUrl = (await captureScreenThumbnail(displayStream!)) ?? null
      }, 2000)
    }

    displayStream?.getVideoTracks()[0]?.addEventListener("ended", () => {
      stopRecording()
    })

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm"

    mediaRecorder = new MediaRecorder(combinedStream, { mimeType })

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: mimeType })
      const durationSeconds = startTime ? (Date.now() - startTime) / 1000 : 0

      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1]
        chrome.runtime.sendMessage({
          type: "VIDEO_READY",
          blobBase64: base64,
          mimeType: blob.type,
          durationSeconds,
          thumbnailDataUrl,
        })
      }
      reader.readAsDataURL(blob)

      stopStreams()
    }

    mediaRecorder.start(1000)
  } catch (err) {
    chrome.runtime.sendMessage({ type: "RECORDING_ERROR", message: String(err) })
  }
}

function stopRecording() {
  mediaRecorder?.stop()
}

function pauseRecording() {
  if (mediaRecorder?.state === "recording") mediaRecorder.pause()
}

function resumeRecording() {
  if (mediaRecorder?.state === "paused") mediaRecorder.resume()
}

function cancelRecording() {
  mediaRecorder?.stop()
  recordedChunks = []
  stopStreams()
}

function stopStreams() {
  displayStream?.getTracks().forEach((t) => t.stop())
  cameraStream?.getTracks().forEach((t) => t.stop())
  displayStream = null
  cameraStream = null
  combinedStream = null
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  switch (message.type) {
    case "START_RECORDING":
      startRecording(message.config)
      break
    case "STOP_RECORDING":
      stopRecording()
      break
    case "PAUSE_RECORDING":
      pauseRecording()
      break
    case "RESUME_RECORDING":
      resumeRecording()
      break
    case "CANCEL_RECORDING":
      cancelRecording()
      break
  }
})
