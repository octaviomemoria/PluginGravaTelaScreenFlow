import type { RecordingState } from "../types"

const STORAGE_KEY = "screenflow_token"
const API_URL_KEY = "screenflow_api_url"

export async function getAuthToken(): Promise<string | null> {
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
  const result = await chrome.storage.local.get(API_URL_KEY)
  return (result[API_URL_KEY] as string) ?? "https://screenflow.app"
}

export async function setApiUrl(url: string): Promise<void> {
  await chrome.storage.local.set({ [API_URL_KEY]: url })
}
