'use client'

// 'use client' is required here: we use window.location and a click handler
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  async function handleGoogleSignIn() {
    const supabase = createClient()

    // Redirects the browser to Google's OAuth consent screen.
    // After the user approves, Google sends them back to /auth/callback?code=...
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-bg px-6">
      <div className="flex flex-col items-center w-full max-w-xs gap-10">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="block w-3 h-3 rounded-full bg-brand-teal" aria-hidden="true" />
            <span className="text-2xl font-bold tracking-tight text-brand-text">
              Rally
            </span>
          </div>
          <p className="text-sm text-brand-muted">Active people, real plans</p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="cursor-pointer w-full flex items-center justify-center gap-3 rounded-xl bg-brand-teal px-5 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </div>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908C16.658 14.121 17.64 11.813 17.64 9.205z"
        fill="white"
        fillOpacity="0.9"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="white"
        fillOpacity="0.9"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="white"
        fillOpacity="0.9"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="white"
        fillOpacity="0.9"
      />
    </svg>
  )
}
