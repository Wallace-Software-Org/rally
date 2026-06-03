"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { SearchBox } from "@mapbox/search-js-react";
import {
  getSportLabel,
  SPORTS_LIST,
} from "@/lib/utils/sport-config";
import { formatActivityTime } from "@/lib/utils/format-time";
import { createActivity } from "@/lib/actions/activities";
import ActivityPill from "@/components/ui/activity-pill";
import DatePicker from "@/components/ui/date-picker";
import TimePicker from "@/components/ui/time-picker";

const SEARCH_BOX_THEME = {
  variables: {
    fontFamily: "inherit",
    unit: "14px",
    borderRadius: "0.75rem",
    border: "1px solid rgba(90, 74, 58, 0.25)",
    colorBackground: "#E8DFD1",
    colorText: "#5A4A3A",
    colorPrimary: "#4A9B8E",
    colorSecondary: "#7A6854",
    boxShadow: "none",
    padding: "0.75em 1em",
  },
} as const;

type FormState = {
  sport: string;
  title: string;
  starts_at: string;
  max_participants: number | null;
  skill_level: string;
  description: string;
  location_name: string;
  lat: number | null;
  lng: number | null;
};

const inputCls =
  "w-full rounded-xl border border-brand-border bg-transparent px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-[1.5px] focus:ring-brand-teal";

const primaryBtn =
  "w-full rounded-xl bg-brand-teal text-white text-sm font-semibold py-3.5 hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors disabled:opacity-40";


const SKILL_LEVELS = ["All levels", "Beginner", "Advanced"] as const;

const SPORTS = SPORTS_LIST.filter((s) => s !== "All");

function subscribeMounted() {
  return () => {};
}

function getMountedSnapshot() {
  return true;
}

function getServerMountedSnapshot() {
  return false;
}

export default function PostActivityForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>({
    sport: "",
    title: "",
    starts_at: "",
    max_participants: null,
    skill_level: "All levels",
    description: "",
    location_name: "",
    lat: null,
    lng: null,
  });
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [limitSpots, setLimitSpots] = useState(false);
  const [stepperValue, setStepperValue] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const mounted = useSyncExternalStore(
    subscribeMounted,
    getMountedSnapshot,
    getServerMountedSnapshot,
  );

  function patch(update: Partial<FormState>) {
    setForm((f) => ({ ...f, ...update }));
  }

  function goBack() {
    if (step === 1) router.push("/");
    else setStep((s) => (s - 1) as 1 | 2 | 3);
  }

  function startsAt(): string {
    if (!date || !time) return "";
    return new Date(`${date}T${time}:00`).toISOString();
  }

  async function handleUseLocation() {
    if (!navigator.geolocation || geoLoading) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let locationName = "Current location";
        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
              `?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&types=poi,neighborhood,place&limit=1`,
          );
          const data = await res.json();
          if (data.features?.[0]?.text) locationName = data.features[0].text;
        } catch {
          // fall through to "Current location"
        }
        setForm((f) => ({ ...f, lat, lng, location_name: locationName }));
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
    );
  }

  async function handleSubmit() {
    const starts = startsAt();
    if (!form.lat || !form.lng || !form.location_name.trim() || !starts || submitting) return;
    setSubmitting(true);
    const { error } = await createActivity({ ...form, starts_at: starts });
    setSubmitting(false);
    if (!error) router.push("/");
  }

  const step2Valid = Boolean(form.title.trim() && date && time && form.description.trim().length >= 50);
  const step3Valid = Boolean(form.lat != null && form.lng != null);
  const reviewStartsAt = startsAt();

  return (
    <div className="flex-1 overflow-y-auto flex flex-col bg-brand-bg">
      {/* ── Header: back arrow + step indicator ─────────────── */}
      <div className="flex items-center px-4 pt-6 pb-4 gap-4 max-w-lg mx-auto w-full">
        <button
          onClick={goBack}
          aria-label="Go back"
          className="flex-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-brand-avatar-bg transition-colors"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M11 14L6 9l5-5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="flex-1 flex items-center justify-center gap-1.5">
          {([1, 2, 3] as const).map((n) => (
            <div
              key={n}
              className={`h-1 rounded-full transition-all duration-300 ${
                n === step
                  ? "w-8 bg-brand-teal"
                  : n < step
                    ? "w-4 bg-brand-teal/50"
                    : "w-4 bg-brand-border"
              }`}
            />
          ))}
        </div>

        {/* balances the back button so dots stay centered */}
        <div className="flex-none w-8" />
      </div>

      {/* ── Scrollable content ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-2 pb-8 flex flex-col gap-5 max-w-lg mx-auto w-full">

        {/* ── Step 1: Choose a sport ──────────────────────────── */}
        {step === 1 && (
          <div className="grid grid-cols-3 gap-2">
            {SPORTS.map((sport) => (
              <button
                key={sport}
                type="button"
                onClick={() => {
                  patch({ sport: sport.toLowerCase() });
                  setStep(2);
                }}
                className="rounded-xl py-3 px-2 text-sm font-medium border border-brand-border text-brand-muted hover:border-brand-teal hover:text-brand-teal bg-brand-bg transition-colors text-center"
              >
                {getSportLabel(sport)}
              </button>
            ))}
          </div>
        )}

        {/* ── Step 2: Activity details ────────────────────────── */}
        {step === 2 && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-brand-text">
                Activity title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="e.g. Morning pickleball at Balboa Park"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-brand-text">
                  Date
                </label>
                <DatePicker
                  value={date}
                  onChange={setDate}
                  placeholder="Select a date"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-brand-text">
                  Time
                </label>
                <TimePicker
                  value={time}
                  onChange={setTime}
                  placeholder="Select a time"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border border-brand-border bg-brand-bg rounded-xl px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-brand-text">Limit spots</span>
                <span className="text-xs text-brand-muted">
                  {limitSpots
                    ? `Max ${stepperValue} participants`
                    : "Off, open to all"}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={limitSpots}
                onClick={() => {
                  const next = !limitSpots;
                  setLimitSpots(next);
                  patch({ max_participants: next ? stepperValue : null });
                }}
                className={`w-10 h-6 rounded-full p-0.5 flex items-center transition-colors flex-none ${
                  limitSpots ? "bg-brand-teal justify-end" : "bg-brand-border justify-start"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
              </button>
            </div>

            {limitSpots && (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const v = Math.max(2, stepperValue - 1);
                    setStepperValue(v);
                    patch({ max_participants: v });
                  }}
                  className="w-8 h-8 rounded-lg border border-brand-border bg-brand-bg flex items-center justify-center text-brand-text flex-none"
                >
                  −
                </button>
                <span className="flex-1 text-center text-base font-semibold text-brand-text">
                  {stepperValue}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const v = Math.min(20, stepperValue + 1);
                    setStepperValue(v);
                    patch({ max_participants: v });
                  }}
                  className="w-8 h-8 rounded-lg border border-brand-border bg-brand-bg flex items-center justify-center text-brand-text flex-none"
                >
                  +
                </button>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-brand-text">
                Skill level
              </label>
              <div className="flex rounded-xl overflow-hidden border border-brand-border">
                {SKILL_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => patch({ skill_level: level })}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                      form.skill_level === level
                        ? "bg-brand-teal text-white"
                        : "text-brand-muted hover:text-brand-text"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-sm font-medium text-brand-text">
                  Description
                </label>
                {(() => {
                  const len = form.description.trim().length;
                  const remaining = Math.max(0, 50 - len);
                  return (
                    <span className="text-xs text-brand-muted">
                      {remaining > 0 ? `${remaining} more needed` : `${len} chars`}
                    </span>
                  );
                })()}
              </div>
              <textarea
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Tell people what to expect: pace, gear, meetup spot, anything useful."
                rows={4}
                className={`${inputCls} resize-none`}
              />
            </div>

            <button
              onClick={() => setStep(3)}
              disabled={!step2Valid}
              className={primaryBtn}
            >
              Next
            </button>
          </>
        )}

        {/* ── Step 3: Location & review ───────────────────────── */}
        {step === 3 && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-brand-text">
                Location
              </label>
              <div className="w-full">
                {mounted ? (
                  <SearchBox
                    accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""}
                    value={form.location_name}
                    onChange={(value) =>
                      patch({ location_name: value, lat: null, lng: null })
                    }
                    onRetrieve={(result) => {
                      const feat = result.features[0];
                      if (!feat) return;
                      const [lng, lat] = feat.geometry.coordinates;
                      patch({ location_name: feat.properties.name, lat, lng });
                    }}
                    onClear={() =>
                      patch({ location_name: "", lat: null, lng: null })
                    }
                    options={{
                      language: "en",
                      country: "US",
                      proximity: { lng: -111.94, lat: 33.4995 },
                    }}
                    placeholder="e.g. Balboa Park Tennis Courts"
                    theme={SEARCH_BOX_THEME}
                  />
                ) : (
                  <input
                    type="text"
                    value={form.location_name}
                    onChange={(e) => patch({ location_name: e.target.value })}
                    placeholder="e.g. Balboa Park Tennis Courts"
                    className={inputCls}
                  />
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleUseLocation}
              disabled={geoLoading}
              className="self-start border border-brand-border text-brand-teal rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 hover:border-brand-teal transition-colors disabled:opacity-50"
            >
              <svg
                width="10"
                height="13"
                viewBox="0 0 8 10"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M4 0C2.07 0 .5 1.57.5 3.5.5 6.125 4 10 4 10S7.5 6.125 7.5 3.5C7.5 1.57 5.93 0 4 0Zm0 4.75A1.25 1.25 0 1 1 4 2.25a1.25 1.25 0 0 1 0 2.5Z" />
              </svg>
              {geoLoading ? "Getting location…" : "Use my current location"}
            </button>

            <div className="border-t border-brand-border" />

            <ReviewCard form={form} startsAtIso={reviewStartsAt} />

            <button
              onClick={handleSubmit}
              disabled={!step3Valid || submitting}
              className={primaryBtn}
            >
              {submitting ? "Posting…" : "Post activity"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ReviewCard({
  form,
  startsAtIso,
}: {
  form: FormState;
  startsAtIso: string;
}) {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-bg p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <ActivityPill sport={form.sport} />
        {startsAtIso && (
          <span className="text-xs text-brand-muted leading-4 shrink-0">
            {formatActivityTime(startsAtIso)}
          </span>
        )}
      </div>

      <p className="text-sm font-medium text-brand-text leading-snug">
        {form.title}
      </p>

      <p className="text-xs text-brand-muted flex items-center gap-1 min-w-0">
        <svg
          width="8"
          height="10"
          viewBox="0 0 8 10"
          fill="currentColor"
          className="flex-none"
          aria-hidden="true"
        >
          <path d="M4 0C2.07 0 .5 1.57.5 3.5.5 6.125 4 10 4 10S7.5 6.125 7.5 3.5C7.5 1.57 5.93 0 4 0Zm0 4.75A1.25 1.25 0 1 1 4 2.25a1.25 1.25 0 0 1 0 2.5Z" />
        </svg>
        {form.location_name ? (
          <span className="truncate">{form.location_name}</span>
        ) : (
          <span className="italic text-brand-border">No location yet</span>
        )}
        {form.skill_level && (
          <span className="flex-none">· {form.skill_level}</span>
        )}
      </p>

      <p className="text-xs text-brand-muted pt-0.5 flex items-center gap-1">
        <svg
          width="13"
          height="11"
          viewBox="0 0 14 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M10 11c0-2.21-2.24-4-5-4S0 8.79 0 11M5 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14 11c0-1.86-1.28-3.44-3-3.87M9.5 3.13a3 3 0 0 1 0 5.74"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
        {form.max_participants === null
          ? "Open, no spot limit"
          : `Max ${form.max_participants} participant${form.max_participants === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}
