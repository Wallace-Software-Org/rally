'use client'

// 'use client' is required: sport pills need interactive toggle state
import { useState } from 'react'
import { createProfile } from './actions'

const SPORTS = ['pickleball', 'running', 'boxing', 'hiking', 'gym', 'paddleboard']

export default function OnboardingPage() {
  const [selectedSports, setSelectedSports] = useState<string[]>([])

  // Toggle a sport in/out of the selection array
  function toggleSport(sport: string) {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F0EAE2] px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-10">
          <span className="block w-3 h-3 rounded-full bg-[#1D9E75]" aria-hidden="true" />
          <span className="text-2xl font-bold tracking-tight text-[#2C2C2C]">
            Rally
          </span>
        </div>

        <h1 className="text-xl font-semibold text-[#2C2C2C]">
          Set up your profile
        </h1>
        <p className="mt-1 mb-8 text-sm text-[#7A6A5A]">Tell the community a bit about yourself</p>

        {/*
          action={createProfile} wires this native <form> to a Server Action.
          When submitted, Next.js serializes the FormData and calls the action on the server.
        */}
        <form action={createProfile} className="flex flex-col gap-5">
          {/*
            Sports state lives in React but must reach the server via FormData.
            Serializing to a hidden input is the standard pattern for non-input state in SA forms.
          */}
          <input type="hidden" name="sports" value={JSON.stringify(selectedSports)} />

          <Field label="Full name">
            <input
              name="full_name"
              type="text"
              required
              placeholder="Jane Smith"
              className={inputCls}
            />
          </Field>

          <Field label="Username">
            <input
              name="username"
              type="text"
              required
              placeholder="@janesmith"
              className={inputCls}
            />
          </Field>

          <Field label="Bio">
            <textarea
              name="bio"
              rows={3}
              placeholder="Outdoor enthusiast based in…"
              className={`${inputCls} resize-none`}
            />
          </Field>

          <Field label="Instagram">
            <input
              name="instagram"
              type="text"
              placeholder="@yourhandle"
              className={inputCls}
            />
          </Field>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-[#2C2C2C]">
              I&apos;m into
            </legend>
            <div className="flex flex-wrap gap-2 mt-1">
              {SPORTS.map((sport) => {
                const active = selectedSports.includes(sport)
                return (
                  <button
                    key={sport}
                    type="button" // prevent implicit form submission on click
                    onClick={() => toggleSport(sport)}
                    aria-pressed={active} // communicates toggle state to screen readers
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      active
                        ? 'bg-[#1D9E75] border-[#1D9E75] text-white'
                        : 'border-[#C8B8A8] text-[#7A6A5A] hover:border-[#1D9E75] hover:text-[#1D9E75]'
                    }`}
                  >
                    {sport}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-[#1D9E75] px-5 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#199068] active:bg-[#147a56] transition-colors"
          >
            Let&apos;s go
          </button>
        </form>
      </div>
    </main>
  )
}

// Shared Tailwind string for all text inputs — defined once to keep field markup clean
const inputCls =
  'w-full rounded-lg border border-[#C8B8A8] bg-transparent px-3.5 py-2.5 text-sm text-[#2C2C2C] placeholder:text-[#7A6A5A] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 transition'

// Thin wrapper that pairs a <label> with any form control
function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[#2C2C2C]">{label}</label>
      {children}
    </div>
  )
}
