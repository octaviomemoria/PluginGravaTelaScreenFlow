import type { ExtensionMessage, RecordingConfig, UploadAuth } from "../types"
import { createUploadSession, uploadBlobToDrive, completeUpload, type AuthOverride } from "../lib/api"

// The offscreen document cannot read chrome.storage, so the service worker
// forwards the auth token + API URL with START_RECORDING; we keep them here.
let uploadAuth: AuthOverride = {}
let mediaRecorder: MediaRecorder | null = null
let recordedChunks: Blob[] = []
let displayStream: MediaStream | null = null
let cameraStream: MediaStream | null = null
let micStream: MediaStream | null = null
let combinedStream: MediaStream | null = null
let startTime: number | null = null
let thumbnailDataUrl: string | null = null
let isCancelled = false
let animHandle: number | null = null      // setInterval id for the canvas draw loop
let keepAliveHandle: number | null = null // setInterval id that pings the SW so MV3 doesn't kill it

// MV3 kills an idle service worker after ~30s. While the offscreen document is
// alive (recording + during the upload), ping the SW every 20s so it stays warm
// and the recording state / progress messages are not lost.
function startKeepAlive() {
  if (keepAliveHandle !== null) clearInterval(keepAliveHandle)
  keepAliveHandle = setInterval(() => {
    chrome.runtime.sendMessage({ type: "KEEPALIVE" }, () => void chrome.runtime.lastError)
  }, 20000) as unknown as number
}

function stopKeepAlive() {
  if (keepAliveHandle !== null) {
    clearInterval(keepAliveHandle)
    keepAliveHandle = null
  }
}

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

async function startRecording(config: RecordingConfig, auth?: UploadAuth) {
  recordedChunks = []
  isCancelled = false
  animHandle = null
  startTime = Date.now()
  thumbnailDataUrl = null
  if (auth) uploadAuth = { token: auth.token, baseUrl: auth.apiUrl }

  try {
    let mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm"

    if (config.mode === "audio") {
      // Audio only — no screen, no camera, no canvas, no thumbnail
      mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm"
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: config.micDeviceId ? { deviceId: { ideal: config.micDeviceId } } : true,
        video: false,
      })
      combinedStream = new MediaStream(micStream.getAudioTracks())
    } else if (config.mode === "camera") {
      // Camera only
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: config.cameraDeviceId ? { deviceId: config.cameraDeviceId } : true,
        audio: config.micDeviceId ? { deviceId: config.micDeviceId } : true,
      })
      combinedStream = cameraStream
    } else {
      // Screen capture
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: config.captureSystemAudio,
      })

      // Microphone
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: config.micDeviceId ? { deviceId: config.micDeviceId } : true,
          video: false,
        })
      } catch {
        micStream = null
      }

      if (config.mode === "screen+camera") {
        // Try to get camera. Use `ideal` (not `exact`) so a stale/invalid
        // deviceId falls back to the default camera instead of throwing.
        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({
            video: config.cameraDeviceId ? { deviceId: { ideal: config.cameraDeviceId } } : true,
          })
        } catch (camErr) {
          cameraStream = null
          console.error("[SF] FALHA ao adquirir câmera (getUserMedia)", camErr)
          stopStreams() // release the screen/mic streams already acquired
          chrome.runtime.sendMessage({
            type: "RECORDING_ERROR",
            message: "Não foi possível acessar a câmera. Verifique as permissões e tente novamente.",
          })
          return
        }
      }

      if (config.mode === "screen+camera" && cameraStream) {
        // Canvas compositing: screen + circular camera bubble in the bottom-right
        const screenTrack = displayStream.getVideoTracks()[0]!
        const settings = screenTrack.getSettings()
        const W = settings.width || 1920
        const H = settings.height || 1080

        const compositeCanvas = document.createElement("canvas")
        compositeCanvas.width = W
        compositeCanvas.height = H
        const ctx = compositeCanvas.getContext("2d")!

        const screenVid = document.createElement("video")
        screenVid.srcObject = displayStream
        screenVid.muted = true
        await new Promise<void>((res) => {
          screenVid.onloadedmetadata = () => { screenVid.play().then(res).catch(res) }
        })

        const camVid = document.createElement("video")
        camVid.srcObject = cameraStream
        camVid.muted = true
        await new Promise<void>((res) => {
          camVid.onloadedmetadata = () => { camVid.play().then(res).catch(res) }
        })

        const camRadius = Math.round(Math.min(W, H) * 0.13)
        const margin = Math.round(Math.min(W, H) * 0.025)
        const cx = W - margin - camRadius
        const cy = H - margin - camRadius

        function draw() {
          ctx.drawImage(screenVid, 0, 0, W, H)
          // Draw circular camera bubble
          ctx.save()
          ctx.beginPath()
          ctx.arc(cx, cy, camRadius, 0, Math.PI * 2)
          ctx.clip()
          ctx.drawImage(camVid, cx - camRadius, cy - camRadius, camRadius * 2, camRadius * 2)
          ctx.restore()
          // White border around bubble
          ctx.beginPath()
          ctx.arc(cx, cy, camRadius + 2, 0, Math.PI * 2)
          ctx.strokeStyle = "rgba(255,255,255,0.8)"
          ctx.lineWidth = 3
          ctx.stroke()
        }
        // Use setInterval (not requestAnimationFrame): rAF is throttled/suspended
        // in a non-rendered offscreen document, which left the camera bubble frozen.
        draw()
        animHandle = setInterval(draw, 1000 / 30) as unknown as number

        const canvasStream = compositeCanvas.captureStream(30)
        const audioTracks: MediaStreamTrack[] = []
        micStream?.getAudioTracks().forEach((t) => audioTracks.push(t))
        displayStream.getAudioTracks().forEach((t) => audioTracks.push(t))
        combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks])
      } else {
        // Screen only (or screen + mic)
        const tracks = [...displayStream.getTracks()]
        micStream?.getAudioTracks().forEach((t) => tracks.push(t))
        combinedStream = new MediaStream(tracks)
      }

      // Capture thumbnail at 2s
      setTimeout(async () => {
        if (!isCancelled) {
          thumbnailDataUrl = (await captureScreenThumbnail(displayStream!)) ?? null
        }
      }, 2000)
    }

    // Stop recording when user ends screen share natively
    displayStream?.getVideoTracks()[0]?.addEventListener("ended", () => {
      if (!isCancelled) stopRecording()
    })

    // Cap the bitrate so the resulting blob stays manageable. The canvas-composited
    // screen+camera stream would otherwise produce a very large file, which
    // lengthened the window in which the MV3 service worker could be killed.
    mediaRecorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 2_500_000 })

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      // Stop canvas compositing
      if (animHandle !== null) {
        clearInterval(animHandle)
        animHandle = null
      }

      if (isCancelled) {
        // Don't upload — just clean up
        stopKeepAlive()
        stopStreams()
        return
      }

      const blob = new Blob(recordedChunks, { type: mimeType })
      const durationSeconds = startTime ? (Date.now() - startTime) / 1000 : 0
      console.log("[SF] onstop: blob pronto", { size: blob.size, type: blob.type, durationSeconds })

      // Free the capture streams now — the blob is already in memory.
      stopStreams()

      const sendToSW = (msg: object) =>
        chrome.runtime.sendMessage(msg, () => void chrome.runtime.lastError)

      // Signal immediately so the popup shows movement past the stop and the SW
      // stays warm even before the Drive upload reports its first byte.
      sendToSW({ type: "OFFSCREEN_UPLOAD_PROGRESS", percent: 2 })

      // Upload directly from the offscreen document. This avoids serializing a
      // huge base64 blob through a single chrome.runtime message AND removes the
      // dependency on the MV3 service worker staying alive during the upload.
      // Wrapped in an overall timeout so a stalled request never hangs silently.
      try {
        if (!uploadAuth.token) {
          throw new Error("Sessão não encontrada. Abra o dashboard e faça login, depois tente gravar novamente.")
        }
        const isAudio = mimeType.startsWith("audio/")
        const title = isAudio
          ? `Áudio ${new Date().toLocaleDateString("pt-BR")}`
          : `Gravação ${new Date().toLocaleDateString("pt-BR")}`

        const withTimeout = <T>(p: Promise<T>, ms: number, label: string): Promise<T> =>
          Promise.race([
            p,
            new Promise<T>((_, reject) =>
              setTimeout(() => reject(new Error(`Tempo esgotado em ${label} (${ms / 1000}s)`)), ms)
            ),
          ])

        console.log("[SF] upload: criando sessão...", { hasToken: !!uploadAuth.token, baseUrl: uploadAuth.baseUrl })
        const session = await withTimeout(createUploadSession(title, blob.type, uploadAuth), 30000, "criar sessão")
        console.log("[SF] upload: sessão criada", { videoId: session.videoId })

        const googleDriveFileId = await withTimeout(
          uploadBlobToDrive(
            session.uploadUrl,
            session.googleAccessToken,
            blob,
            (pct) => sendToSW({ type: "OFFSCREEN_UPLOAD_PROGRESS", percent: 5 + Math.floor(pct * 0.9) })
          ),
          180000,
          "enviar ao Drive"
        )
        console.log("[SF] upload: Drive OK", { googleDriveFileId })

        const { shareUrl, publicId } = await withTimeout(
          completeUpload(session.videoId, googleDriveFileId, durationSeconds, thumbnailDataUrl ?? undefined, uploadAuth),
          30000,
          "finalizar"
        )
        console.log("[SF] upload: concluído", { shareUrl, publicId })

        sendToSW({ type: "OFFSCREEN_UPLOAD_DONE", result: { shareUrl, publicId } })
      } catch (uploadErr) {
        console.error("[SF] upload falhou no offscreen:", uploadErr)
        sendToSW({ type: "OFFSCREEN_UPLOAD_ERROR", message: String(uploadErr) })
      } finally {
        stopKeepAlive()
      }
    }

    mediaRecorder.start(1000)
    startKeepAlive() // keep the MV3 service worker warm through recording + upload
  } catch (err) {
    console.error("[SF] EXCEÇÃO em startRecording:", err)
    chrome.runtime.sendMessage({ type: "RECORDING_ERROR", message: String(err) })
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop()
  } else {
    console.warn("[SF] stopRecording: mediaRecorder inativo — onstop não vai disparar")
  }
}

function pauseRecording() {
  if (mediaRecorder?.state === "recording") mediaRecorder.pause()
}

function resumeRecording() {
  if (mediaRecorder?.state === "paused") mediaRecorder.resume()
}

function cancelRecording() {
  isCancelled = true
  stopKeepAlive()
  if (animHandle !== null) {
    clearInterval(animHandle)
    animHandle = null
  }
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop()
  } else {
    stopStreams()
  }
}

function stopStreams() {
  displayStream?.getTracks().forEach((t) => t.stop())
  cameraStream?.getTracks().forEach((t) => t.stop())
  micStream?.getTracks().forEach((t) => t.stop())
  combinedStream?.getTracks().forEach((t) => t.stop()) // includes the canvas captureStream track
  displayStream = null
  cameraStream = null
  micStream = null
  combinedStream = null
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  switch (message.type) {
    case "START_RECORDING":
      startRecording(message.config, message.auth)
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
