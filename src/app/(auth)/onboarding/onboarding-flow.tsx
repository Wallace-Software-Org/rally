"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SPORTS_LIST, getSportLabel } from "@/lib/utils/sport-config";
import { checkUsername, createProfile } from "./actions";

const ACTIVITY_ITEMS = SPORTS_LIST.filter((s) => s !== "All");

const USERNAME_RE = /^[a-z0-9]{3,20}$/;

const inputCls =
  "w-full rounded-xl border border-brand-border bg-transparent px-3.5 py-2.5 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-teal/40 transition";

type UsernameStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid"
  | "error";

function usernameHint(status: UsernameStatus, username: string) {
  if (!username) return null;
  if (status === "invalid") {
    if (username.length < 3)
      return {
        color: "text-brand-muted",
        text: "At least 3 characters required.",
      };
    return {
      color: "text-brand-danger",
      text: "Lowercase letters and numbers only, no spaces.",
    };
  }
  if (status === "checking")
    return { color: "text-brand-muted", text: "Checking..." };
  if (status === "available")
    return { color: "text-brand-teal-text", text: "Available." };
  if (status === "taken")
    return { color: "text-brand-danger", text: "That username is taken." };
  if (status === "error")
    return {
      color: "text-brand-danger",
      text: "Could not check availability. Try again.",
    };
  return null;
}

export default function OnboardingFlow({
  defaultName,
  defaultUsername,
  redirectTo,
}: {
  defaultName: string;
  defaultUsername: string;
  redirectTo: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [name, setName] = useState(defaultName);
  const [username, setUsername] = useState(defaultUsername);
  // Tracks the last async check result, keyed to the username it was run against
  const [checkResult, setCheckResult] = useState<{
    username: string;
    status: "available" | "taken" | "error";
  } | null>(
    defaultUsername ? { username: defaultUsername, status: "available" } : null,
  );

  const [activities, setActivities] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // idle / invalid / checking are derived; only the async result needs state
  const usernameStatus: UsernameStatus = !username
    ? "idle"
    : !USERNAME_RE.test(username)
      ? "invalid"
      : checkResult?.username === username
        ? checkResult.status
        : "checking";

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!username || !USERNAME_RE.test(username)) return;

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await checkUsername(username);
        setCheckResult({
          username,
          status: result.available ? "available" : "taken",
        });
      } catch {
        setCheckResult({ username, status: "error" });
      }
    }, 1000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username]);

  function toggleActivity(a: string) {
    setActivities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  }

  async function handleFinish() {
    setSubmitting(true);
    setSubmitError(null);
    const result = await createProfile({
      full_name: name,
      username,
      sports: activities,
      bio,
      instagram_handle: instagram,
    });
    if (result.error) {
      setSubmitError(result.error);
      setSubmitting(false);
      return;
    }
    router.push(redirectTo);
  }

  const step1Valid = name.trim().length > 0 && usernameStatus === "available";
  const step2Valid = activities.length > 0;

  const hint = usernameHint(usernameStatus, username);

  return (
    <div className="h-dvh flex flex-col bg-brand-bg overflow-hidden">
      {/* Nav header — matches app-nav structure */}
      <header className="flex-none bg-brand-bg">
        <div className="max-w-5xl xl:max-w-none mx-auto px-4 xl:px-6 h-14 flex items-center">
          <div className="flex items-center gap-2 flex-none">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-teal block" />
            <span className="text-base font-semibold tracking-tight text-brand-text">
              Rally
            </span>
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-sm mx-auto px-6 pt-8 pb-12 mt-[10vh]">
          {/* Back navigation */}
          <div className="h-6 mb-4">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-text transition-colors"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M10 3L5 8L10 13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back
              </button>
            )}
          </div>

          {/* Progress */}
          <div className="flex items-center gap-1.5 mb-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 rounded-full transition-all duration-300 ${
                  s === step
                    ? "w-8 bg-brand-teal"
                    : s < step
                      ? "w-4 bg-brand-teal/50"
                      : "w-4 bg-brand-border"
                }`}
              />
            ))}
          </div>

          {/* Step 1 — Name and username */}
          {step === 1 && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-2xl font-bold text-brand-text">
                  What should we call you?
                </h1>
                <p className="mt-1 text-sm text-brand-muted">
                  You can update this any time.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-brand-text">
                    Full name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    className={inputCls}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-brand-text">
                    Username
                  </label>
                  <div className="relative">
                    <input
                      value={username}
                      onChange={(e) =>
                        setUsername(
                          e.target.value.replace(/\s/g, "").toLowerCase(),
                        )
                      }
                      placeholder="janesmith"
                      className={`${inputCls} pr-8 ${
                        usernameStatus === "taken" || usernameStatus === "error"
                          ? "border-brand-danger focus:ring-brand-danger/30"
                          : usernameStatus === "available"
                            ? "border-brand-teal focus:ring-brand-teal/40"
                            : ""
                      }`}
                    />
                    {/* Inline status icon */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {usernameStatus === "checking" && (
                        <svg
                          className="animate-spin w-4 h-4 text-brand-muted"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="3"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                          />
                        </svg>
                      )}
                      {usernameStatus === "available" && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 8.5L6.5 12L13 5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                      {(usernameStatus === "taken" ||
                        usernameStatus === "error") && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M4 4L12 12M12 4L4 12"
                            stroke="#CC3333"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                  {hint && (
                    <p className={`text-xs ${hint.color}`}>{hint.text}</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                className="w-full rounded-xl bg-brand-teal px-5 py-3.5 text-sm font-semibold text-white hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2 — Activities picker */}
          {step === 2 && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-2xl font-bold text-brand-text">
                  What are you into?
                </h1>
                <p className="mt-1 text-sm text-brand-muted">
                  Pick at least one activity to continue.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {ACTIVITY_ITEMS.map((a) => {
                  const active = activities.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleActivity(a)}
                      aria-pressed={active}
                      className={`rounded-xl py-3 px-2 text-sm font-medium border transition-colors text-center ${
                        active
                          ? "bg-brand-teal border-brand-teal text-white"
                          : "border-brand-border text-brand-muted hover:border-brand-teal hover:text-brand-teal bg-brand-bg"
                      }`}
                    >
                      {getSportLabel(a)}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setStep(3)}
                disabled={!step2Valid}
                className="w-full rounded-xl bg-brand-teal px-5 py-3.5 text-sm font-semibold text-white hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 3 — Bio and Instagram */}
          {step === 3 && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-2xl font-bold text-brand-text">
                  A bit about you
                </h1>
                <p className="mt-1 text-sm text-brand-muted">
                  People check profiles before joining activities. A quick intro
                  helps.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-brand-text">
                    Bio{" "}
                    <span className="text-brand-muted font-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="Your level, what you are training for, or just who you are."
                    className={`${inputCls} resize-none`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-brand-text">
                    Instagram{" "}
                    <span className="text-brand-muted font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    value={instagram}
                    onChange={(e) =>
                      setInstagram(e.target.value.replace(/^@/, ""))
                    }
                    placeholder="yourhandle"
                    className={inputCls}
                  />
                  <p className="text-xs text-brand-muted">
                    So people can find you after activities.
                  </p>
                </div>
              </div>

              {submitError && (
                <p className="text-sm text-brand-danger">{submitError}</p>
              )}

              <button
                onClick={handleFinish}
                disabled={submitting}
                className="w-full rounded-xl bg-brand-teal px-5 py-3.5 text-sm font-semibold text-white hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors disabled:opacity-40"
              >
                {submitting
                  ? "Setting up your profile..."
                  : "Start using Rally"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
