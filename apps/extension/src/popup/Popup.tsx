import { useState, useEffect, useCallback } from "react"
import type { RecordingMode, RecordingState, RecordingConfig, RecordingResult } from "../types"
import { getApiUrl, setApiUrl } from "../lib/storage"

const MODE_OPTIONS: { value: RecordingMode; label: string; icon: string; desc: string }[] = [
  { value: "screen", label: "Tela inteira", icon: "🖥️", desc: "Toda a tela" },
  { value: "tab", label: "Aba atual", icon: "📄", desc: "Só esta aba" },
  { value: "screen+camera", label: "Tela + Câmera", icon: "🎥", desc: "Com webcam" },
  { value: "camera", label: "Câmera", icon: "📷", desc: "Só câmera" },
  { value: "audio", label: "Apenas áudio", icon: "🎙️", desc: "Só microfone" },
]

export function Popup() {
  const [state, setState] = useState<RecordingState>("idle")
  const [mode, setMode] = useState<RecordingMode>("screen")
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([])
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedMic, setSelectedMic] = useState<string | null>(null)
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null)
  const [captureSystemAudio, setCaptureSystemAudio] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [elapsed, setElapsed] = useState(0)
  const [uploadPercent, setUploadPercent] = useState(0)
  const [result, setResult] = useState<RecordingResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [apiUrl, setApiUrl_] = useState("https://screenflow.app")

  useEffect(() => {
    loadDevices()
    syncState()
    getApiUrl().then(setApiUrl_).catch(() => {})

    const listener = (msg: any) => {
      if (msg.type === "STATE_UPDATE") {
        setState(msg.state)
        setElapsed(msg.elapsed)
      }
      if (msg.type === "RECORDING_DONE") {
        setResult(msg.result)
        setState("done")
      }
      if (msg.type === "RECORDING_ERROR") {
        setError(msg.message)
        setState("error")
      }
      if (msg.type === "UPLOAD_PROGRESS") {
        setUploadPercent(msg.percent)
      }
    }

    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  async function loadDevices() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() => {})
      const devices = await navigator.mediaDevices.enumerateDevices()
      setMicDevices(devices.filter((d) => d.kind === "audioinput"))
      setCameraDevices(devices.filter((d) => d.kind === "videoinput"))
    } catch {}
  }

  async function syncState() {
    const res = await chrome.runtime.sendMessage({ type: "GET_STATE" })
    if (res) {
      setState(res.state)
      setElapsed(res.elapsed)
      if (res.uploadPercent !== undefined) setUploadPercent(res.uploadPercent)
      if (res.errorMessage) setError(res.errorMessage)
      if (res.result) setResult(res.result)
    }
  }

  async function handleStart() {
    setError(null)
    setState("countdown")
    let c = 3
    setCountdown(c)

    const tick = setInterval(() => {
      c--
      setCountdown(c)
      if (c <= 0) {
        clearInterval(tick)
        const config: RecordingConfig = {
          mode,
          micDeviceId: selectedMic,
          cameraDeviceId: selectedCamera,
          captureSystemAudio,
        }
        chrome.runtime.sendMessage({ type: "START_RECORDING", config })
        window.close()
      }
    }, 1000)
  }

  function handleStop() {
    chrome.runtime.sendMessage({ type: "STOP_RECORDING" })
  }

  function handlePause() {
    chrome.runtime.sendMessage({ type: "PAUSE_RECORDING" })
  }

  function handleResume() {
    chrome.runtime.sendMessage({ type: "RESUME_RECORDING" })
  }

  function handleCancel() {
    chrome.runtime.sendMessage({ type: "CANCEL_RECORDING" })
    setState("idle")
    setError(null)
    setResult(null)
    setUploadPercent(0)
  }

  async function handleCopyLink() {
    if (!result) return
    await navigator.clipboard.writeText(result.shareUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  async function handleOpenVideo() {
    if (!result) return
    chrome.tabs.create({ url: result.shareUrl })
  }

  function formatElapsed(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  // Countdown screen
  if (state === "countdown") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-20 h-20 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center">
          <span className="text-4xl font-bold text-accent">{countdown}</span>
        </div>
        <p className="text-text-secondary text-sm">Preparando gravação...</p>
      </div>
    )
  }

  // Recording / paused screen
  if (state === "recording" || state === "paused") {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {state === "recording" ? (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            )}
            <span className="text-sm font-semibold">
              {state === "recording" ? "Gravando" : "Pausado"}
            </span>
          </div>
          <span className="font-mono text-lg font-bold tabular-nums">{formatElapsed(elapsed)}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {state === "recording" ? (
            <button onClick={handlePause} className="col-span-1 py-2 bg-surface border border-border rounded-lg text-sm hover:bg-border transition-colors">
              ⏸ Pausar
            </button>
          ) : (
            <button onClick={handleResume} className="col-span-1 py-2 bg-surface border border-border rounded-lg text-sm hover:bg-border transition-colors">
              ▶ Continuar
            </button>
          )}
          <button onClick={handleStop} className="col-span-1 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-semibold transition-colors">
            ⏹ Parar
          </button>
          <button onClick={handleCancel} className="col-span-1 py-2 bg-surface border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/10 transition-colors">
            ✕ Cancelar
          </button>
        </div>
      </div>
    )
  }

  // Uploading screen
  if (state === "uploading") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-5 p-4">
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" stroke="#334155" strokeWidth="4" fill="none" />
            <circle
              cx="32" cy="32" r="28"
              stroke="#22C55E" strokeWidth="4" fill="none"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - uploadPercent / 100)}`}
              className="transition-all duration-300"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
            {uploadPercent}%
          </span>
        </div>
        <div className="text-center">
          <p className="font-semibold">Enviando gravação...</p>
          <p className="text-text-secondary text-xs mt-1">Aguarde, seu link será gerado em instantes</p>
        </div>
      </div>
    )
  }

  // Done screen
  if (state === "done" && result) {
    return (
      <div className="p-4 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
            <span className="text-accent text-2xl">✓</span>
          </div>
          <h2 className="font-bold">Vídeo pronto!</h2>
          <p className="text-text-secondary text-xs">Seu link já está disponível para compartilhar</p>
        </div>

        <div className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-text-secondary truncate font-mono">
          {result.shareUrl}
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleCopyLink}
            className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors text-sm"
          >
            {linkCopied ? "✓ Copiado!" : "📋 Copiar link"}
          </button>
          <button
            onClick={handleOpenVideo}
            className="w-full py-2 bg-surface border border-border text-sm rounded-lg hover:bg-border transition-colors"
          >
            🔗 Abrir vídeo
          </button>
          <button
            onClick={handleCancel}
            className="w-full py-2 text-text-secondary text-xs hover:text-text-primary transition-colors"
          >
            Gravar outro vídeo
          </button>
        </div>
      </div>
    )
  }

  // Error screen
  if (state === "error") {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center space-y-2">
          <span className="text-3xl">⚠️</span>
          <p className="font-semibold text-red-400">Erro na gravação</p>
          <p className="text-text-secondary text-xs">{error ?? "Algo deu errado"}</p>
        </div>
        <button onClick={handleCancel} className="w-full py-2 bg-surface border border-border rounded-lg text-sm hover:bg-border transition-colors">
          Tentar novamente
        </button>
      </div>
    )
  }

  // Idle (main) screen
  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-accent rounded flex items-center justify-center text-xs text-white font-black">S</span>
          <span className="font-bold text-sm">ScreenFlow</span>
        </div>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); chrome.tabs.create({ url: `${apiUrl}/dashboard` }) }}
          className="text-xs text-text-secondary hover:text-accent transition-colors"
        >
          Dashboard →
        </a>
      </div>

      {/* Mode selection */}
      <div>
        <p className="text-xs text-text-secondary mb-2 font-medium">Modo de gravação</p>
        <div className="grid grid-cols-2 gap-2">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                mode === opt.value
                  ? "border-accent bg-accent/10 text-text-primary"
                  : "border-border bg-surface text-text-secondary hover:border-accent/50"
              }`}
            >
              <span className="text-base">{opt.icon}</span>
              <div>
                <div className="text-xs font-semibold leading-tight">{opt.label}</div>
                <div className="text-[10px] opacity-60">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Device selection */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs">🎙️</span>
          <select
            value={selectedMic ?? ""}
            onChange={(e) => setSelectedMic(e.target.value || null)}
            className="flex-1 text-xs bg-surface border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-accent text-text-primary"
          >
            <option value="">Microfone padrão</option>
            {micDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Microfone ${d.deviceId.slice(0,6)}`}</option>
            ))}
          </select>
        </div>

        {(mode === "screen+camera" || mode === "camera") && (
          <div className="flex items-center gap-2">
            <span className="text-xs">📷</span>
            <select
              value={selectedCamera ?? ""}
              onChange={(e) => setSelectedCamera(e.target.value || null)}
              className="flex-1 text-xs bg-surface border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-accent text-text-primary"
            >
              <option value="">Câmera padrão</option>
              {cameraDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Câmera ${d.deviceId.slice(0,6)}`}</option>
              ))}
            </select>
          </div>
        )}

        {mode !== "audio" && mode !== "camera" && (
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={captureSystemAudio}
              onChange={(e) => setCaptureSystemAudio(e.target.checked)}
              className="accent-accent"
            />
            Capturar áudio do sistema
          </label>
        )}
      </div>

      {/* Start button */}
      <button
        onClick={handleStart}
        className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
      >
        <span className="w-2 h-2 rounded-full bg-white/70" />
        Iniciar gravação
      </button>
    </div>
  )
}
