import type { ExtensionMessage, RecordingConfig } from "../types"

let mediaRecorder: MediaRecorder | null = null
let recordedChunks: Blob[] = []
let displayStream: MediaStream | null = null
let cameraStream: MediaStream | null = null
let micStream: MediaStream | null = null
let combinedStream: MediaStream | null = null
let startTime: number | null = null
let thumbnailDataUrl: string | null = null
let isCancelled = false
let animHandle: number | null = null

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
  isCancelled = false
  animHandle = null
  startTime = Date.now()
  thumbnailDataUrl = null

  console.log("[SF] startRecording", {
    mode: config.mode,
    cameraDeviceId: config.cameraDeviceId,
    micDeviceId: config.micDeviceId,
    captureSystemAudio: config.captureSystemAudio,
  })

  try {
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm"

    if (config.mode === "camera") {
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
        // Try to get camera
        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({
            video: config.cameraDeviceId ? { deviceId: { exact: config.cameraDeviceId } } : true,
          })
          console.log("[SF] câmera adquirida", {
            videoTracks: cameraStream.getVideoTracks().length,
            label: cameraStream.getVideoTracks()[0]?.label,
          })
        } catch (camErr) {
          cameraStream = null
          console.error("[SF] FALHA ao adquirir câmera (getUserMedia)", camErr)
        }
      }

      console.log("[SF] ramo de gravação:", {
        mode: config.mode,
        cameraStream: !!cameraStream,
        branch:
          config.mode === "screen+camera" && cameraStream
            ? "compositing (tela+câmera)"
            : "só-tela",
      })

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

        console.log("[SF] compositing iniciado", {
          W, H,
          screenVidReady: screenVid.readyState,
          camVidReady: camVid.readyState,
          camVidSize: `${camVid.videoWidth}x${camVid.videoHeight}`,
        })

        let frameCount = 0
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
          frameCount++
          if (frameCount % 30 === 0) {
            console.log(`[SF] draw loop ativo — ${frameCount} frames desenhados`)
          }
          animHandle = requestAnimationFrame(draw)
        }
        draw()

        const canvasStream = compositeCanvas.captureStream(30)
        console.log("[SF] canvasStream criado", {
          videoTracks: canvasStream.getVideoTracks().length,
        })
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

    console.log("[SF] combinedStream", {
      videoTracks: combinedStream!.getVideoTracks().length,
      audioTracks: combinedStream!.getAudioTracks().length,
    })

    mediaRecorder = new MediaRecorder(combinedStream, { mimeType })

    let totalBytes = 0
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunks.push(e.data)
        totalBytes += e.data.size
      }
    }

    mediaRecorder.onstop = async () => {
      console.log("[SF] mediaRecorder.onstop disparado", {
        chunks: recordedChunks.length,
        totalBytes,
        isCancelled,
      })
      // Stop canvas compositing
      if (animHandle !== null) {
        cancelAnimationFrame(animHandle)
        animHandle = null
      }

      if (isCancelled) {
        // Don't upload — just clean up
        stopStreams()
        return
      }

      const blob = new Blob(recordedChunks, { type: mimeType })
      const durationSeconds = startTime ? (Date.now() - startTime) / 1000 : 0
      console.log("[SF] blob montado", { size: blob.size, type: blob.type, durationSeconds })

      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1]!
        console.log("[SF] enviando VIDEO_READY", {
          base64Length: base64?.length ?? 0,
          approxMB: ((base64?.length ?? 0) / 1.37 / 1024 / 1024).toFixed(2),
        })
        try {
          chrome.runtime.sendMessage({
            type: "VIDEO_READY",
            blobBase64: base64,
            mimeType: blob.type,
            durationSeconds,
            thumbnailDataUrl,
          }, () => {
            if (chrome.runtime.lastError) {
              console.error("[SF] FALHA no envio do VIDEO_READY:", chrome.runtime.lastError.message)
            } else {
              console.log("[SF] VIDEO_READY entregue ao service worker")
            }
          })
        } catch (sendErr) {
          console.error("[SF] EXCEÇÃO ao enviar VIDEO_READY:", sendErr)
        }
      }
      reader.onerror = () => {
        console.error("[SF] FileReader falhou ao ler o blob")
        chrome.runtime.sendMessage({ type: "RECORDING_ERROR", message: "Falha ao processar o vídeo gravado. Tente novamente." })
      }
      reader.readAsDataURL(blob)

      stopStreams()
    }

    mediaRecorder.start(1000)
    console.log("[SF] mediaRecorder.start()", { state: mediaRecorder.state, mimeType })
  } catch (err) {
    console.error("[SF] EXCEÇÃO em startRecording:", err)
    chrome.runtime.sendMessage({ type: "RECORDING_ERROR", message: String(err) })
  }
}

function stopRecording() {
  console.log("[SF] stopRecording chamado", { state: mediaRecorder?.state })
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop()
  } else {
    console.warn("[SF] stopRecording: mediaRecorder inativo ou nulo — onstop não vai disparar")
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
  if (animHandle !== null) {
    cancelAnimationFrame(animHandle)
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
  displayStream = null
  cameraStream = null
  micStream = null
  combinedStream = null
}

console.log("[SF] offscreen recorder.ts carregado")

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
