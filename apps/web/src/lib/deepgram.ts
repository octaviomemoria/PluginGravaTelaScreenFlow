export interface DeepgramWord {
  word: string
  start: number
  end: number
  confidence: number
}

export interface DeepgramUtterance {
  start: number
  end: number
  confidence: number
  transcript: string
  words: DeepgramWord[]
}

export interface DeepgramResult {
  transcript: string
  utterances: DeepgramUtterance[]
  language: string
}

export async function transcribeAudioUrl(audioUrl: string, language = "pt-BR"): Promise<DeepgramResult> {
  const apiKey = process.env.DEEPGRAM_API_KEY
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY not configured")

  const res = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&utterances=true&language=" + encodeURIComponent(language), {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: audioUrl }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Deepgram error: ${err}`)
  }

  const data = (await res.json()) as {
    results: {
      channels: Array<{
        alternatives: Array<{ transcript: string }>
      }>
      utterances?: DeepgramUtterance[]
    }
    metadata: { language: string }
  }

  const transcript = data.results.channels[0]?.alternatives[0]?.transcript ?? ""
  const utterances = data.results.utterances ?? []

  return {
    transcript,
    utterances,
    language: data.metadata.language ?? language,
  }
}
