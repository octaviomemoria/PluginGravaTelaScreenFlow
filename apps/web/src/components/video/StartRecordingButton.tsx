"use client"

import { useState, useEffect } from "react"

export function StartRecordingButton() {
  const [extensionReady, setExtensionReady] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // Wait for the content script to announce itself
    const handler = () => setExtensionReady(true)
    document.addEventListener("screenflow-ready", handler)

    // Give the content script 800 ms to announce
    const timer = setTimeout(() => setChecked(true), 800)

    return () => {
      document.removeEventListener("screenflow-ready", handler)
      clearTimeout(timer)
    }
  }, [])

  function startRecording(mode: "screen" | "audio" = "screen") {
    window.postMessage(
      {
        type: "SCREENFLOW_START_RECORDING",
        config: {
          mode,
          micDeviceId: null,
          cameraDeviceId: null,
          captureSystemAudio: false,
        },
      },
      "*"
    )
  }

  // Not yet checked — render nothing to avoid flash
  if (!checked && !extensionReady) return null

  if (!extensionReady) {
    return (
      <a
        href="https://chrome.google.com/webstore"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-semibold hover:border-accent/50 transition-colors"
        title="Instale a extensão Chrome para gravar"
      >
        <span className="w-2 h-2 rounded-full bg-border" />
        Instalar extensão
      </a>
    )
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={() => startRecording("screen")}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
      >
        <span className="w-2 h-2 rounded-full bg-white/70" />
        Gravar agora
      </button>
      <button
        onClick={() => startRecording("audio")}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface border border-border hover:border-accent/50 text-text-primary rounded-xl text-sm font-semibold transition-colors"
        title="Gravar apenas áudio do microfone"
      >
        🎙️ Gravar áudio
      </button>
    </div>
  )
}
