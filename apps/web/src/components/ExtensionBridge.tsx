"use client"

import { useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"

/**
 * Silently passes the Supabase access token to any installed ScreenFlow
 * Chrome extension via window.postMessage. The content script stores it in
 * chrome.storage.local so the service worker can use it as a Bearer token.
 *
 * Also subscribes to auth state changes so the token is refreshed automatically
 * when Supabase silently renews it (every ~1 hour).
 */
export function ExtensionBridge() {
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    function sendToken(token: string) {
      window.postMessage({ type: "SCREENFLOW_SET_TOKEN", token }, window.location.origin)
    }

    // Send current session token immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) sendToken(session.access_token)
    })

    // Keep token fresh on every auth state change (token refresh, sign-in, sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) sendToken(session.access_token)
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}
