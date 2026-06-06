import type { ExtensionMessage } from "../types"

let floatingBarContainer: HTMLElement | null = null
let cameraContainer: HTMLElement | null = null
let elapsed = 0
let timerEl: HTMLElement | null = null
let isPaused = false

function createFloatingBar() {
  if (floatingBarContainer) return

  const shadowHost = document.createElement("div")
  shadowHost.id = "screenflow-bar-host"
  shadowHost.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    font-family: 'Inter', system-ui, sans-serif;
  `
  document.body.appendChild(shadowHost)

  const shadow = shadowHost.attachShadow({ mode: "open" })
  const style = document.createElement("style")
  style.textContent = `
    .bar {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #1E293B;
      border: 1px solid #334155;
      border-radius: 999px;
      padding: 8px 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      user-select: none;
      backdrop-filter: blur(12px);
    }
    .rec-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      animation: pulse 1.5s infinite;
    }
    .rec-dot.paused { background: #eab308; animation: none; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .timer {
      font-family: monospace;
      font-size: 15px;
      font-weight: 700;
      color: #F8FAFC;
      min-width: 48px;
      text-align: center;
    }
    .sep { width: 1px; height: 20px; background: #334155; }
    button {
      border: none;
      background: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 6px;
      transition: background 0.15s;
      font-size: 13px;
      font-weight: 600;
    }
    button:hover { background: #334155; }
    .btn-stop { color: #22C55E; }
    .btn-pause { color: #94A3B8; }
    .btn-cancel { color: #ef4444; font-size: 11px; }
  `
  shadow.appendChild(style)

  const bar = document.createElement("div")
  bar.className = "bar"

  const dot = document.createElement("div")
  dot.className = "rec-dot"

  timerEl = document.createElement("div")
  timerEl.className = "timer"
  timerEl.textContent = "0:00"

  const sep1 = document.createElement("div")
  sep1.className = "sep"

  const btnPause = document.createElement("button")
  btnPause.className = "btn-pause"
  btnPause.innerHTML = "⏸ Pausar"
  btnPause.onclick = () => {
    if (isPaused) {
      chrome.runtime.sendMessage({ type: "RESUME_RECORDING" })
    } else {
      chrome.runtime.sendMessage({ type: "PAUSE_RECORDING" })
    }
  }

  const btnStop = document.createElement("button")
  btnStop.className = "btn-stop"
  btnStop.innerHTML = "⏹ Parar"
  btnStop.onclick = () => chrome.runtime.sendMessage({ type: "STOP_RECORDING" })

  const sep2 = document.createElement("div")
  sep2.className = "sep"

  const btnCancel = document.createElement("button")
  btnCancel.className = "btn-cancel"
  btnCancel.innerHTML = "✕"
  btnCancel.title = "Cancelar"
  btnCancel.onclick = () => chrome.runtime.sendMessage({ type: "CANCEL_RECORDING" })

  bar.append(dot, timerEl, sep1, btnPause, btnStop, sep2, btnCancel)
  shadow.appendChild(bar)

  floatingBarContainer = shadowHost

  // Store references for updates
  ;(shadowHost as any).__dot = dot
  ;(shadowHost as any).__btnPause = btnPause
}

function updateFloatingBar(elapsedSec: number, paused: boolean) {
  if (!floatingBarContainer) return
  isPaused = paused
  const dot = (floatingBarContainer as any).__dot as HTMLElement
  const btnPause = (floatingBarContainer as any).__btnPause as HTMLButtonElement

  if (timerEl) {
    const m = Math.floor(elapsedSec / 60)
    const s = elapsedSec % 60
    timerEl.textContent = `${m}:${s.toString().padStart(2, "0")}`
  }

  dot.className = `rec-dot${paused ? " paused" : ""}`
  btnPause.innerHTML = paused ? "▶ Continuar" : "⏸ Pausar"
}

function removeFloatingBar() {
  floatingBarContainer?.remove()
  floatingBarContainer = null
  timerEl = null
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  switch (message.type) {
    case "SHOW_FLOATING_BAR":
      createFloatingBar()
      break
    case "HIDE_FLOATING_BAR":
      removeFloatingBar()
      break
    case "UPDATE_TIMER":
      updateFloatingBar(message.elapsed, isPaused)
      break
    case "STATE_UPDATE":
      if (message.state === "paused") updateFloatingBar(message.elapsed, true)
      if (message.state === "recording") updateFloatingBar(message.elapsed, false)
      break
  }
})
