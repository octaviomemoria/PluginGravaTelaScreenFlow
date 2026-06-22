import type { RecordingState } from "../types"

const STORAGE_KEY = "screenflow_token"
const API_URL_KEY = "screenflow_api_url"
const DEFAULT_API_URL = "https://plugin-grava-tela-screen-flow-exten.vercel.app"

// chrome.storage is NOT available in every extension context (notably the
// offscreen document). Guard so these helpers degrade gracefully instead of
// throwing "Cannot read properties of undefined (reading 'local')".
function hasStorage(): boolean {
  return typeof chrome !== "undefined" && !!chrome.storage?.local
}

export async function getAuthToken(): Promise<string | null> {
  if (!hasStorage()) return null
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return (result[STORAGE_KEY] as string) ?? null
}

export async function setAuthToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: token })
}

export async function clearAuthToken(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY)
}

export async function getApiUrl(): Promise<string> {
  if (!hasStorage()) return DEFAULT_API_URL
  const result = await chrome.storage.local.get(API_URL_KEY)
  return (result[API_URL_KEY] as string) ?? DEFAULT_API_URL
}

export async function setApiUrl(url: string): Promise<void> {
  await chrome.storage.local.set({ [API_URL_KEY]: url })
}
