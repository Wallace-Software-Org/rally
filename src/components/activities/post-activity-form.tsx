"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SPORT_COLORS,
  getSportLabel,
  SPORTS_LIST,
} from "@/lib/utils/sport-config";
import { formatActivityTime } from "@/lib/utils/format-time";
import { createActivity } from "@/lib/actions/activities";

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
  "w-full rounded-xl border border-[#C8B8A8] bg-white px-4 py-3 text-sm text-[#2C2C2C] placeholder:text-[#7A6A5A] focus:outline-none focus:ring-[1.5px] focus:ring-[#1D9E75]";

const primaryBtn =
  "w-full rounded-xl bg-[#1D9E75] text-white text-sm font-semibold py-3.5 hover:bg-[#199068] active:bg-[#147a56] transition-colors disabled:opacity-40";

const STEP_LABELS = [
  "Choose a sport",
  "Activity details",
  "Location & review",
] as const;

const SKILL_LEVELS = ["All levels", "Beginner", "Advanced"] as const;

const SPORTS = SPORTS_LIST.filter((s) => s !== "All");

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

  function handleUseLocation() {
    if (!navigator.geolocation || geoLoading) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          location_name: f.location_name || "Current location",
        }));
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
    );
  }

  async function handleSubmit() {
    const starts = startsAt();
    if (!form.location_name.trim() || !starts || submitting) return;
    setSubmitting(true);
    const { error } = await createActivity({ ...form, starts_at: starts });
    setSubmitting(false);
    if (!error) router.push("/");
  }

  const step2Valid = Boolean(form.title.trim() && date && time && form.description.trim().length >= 20);
  const step3Valid = Boolean(form.location_name.trim());
  const reviewStartsAt = startsAt();

  return (
    <div className="min-h-screen bg-[#F0EAE2] flex flex-col">
      {/* ── Header: back arrow + step indicator ─────────────── */}
      <div className="flex items-center px-4 pt-6 pb-4 gap-4 max-w-lg mx-auto w-full">
        <button
          onClick={goBack}
          aria-label="Go back"
          className="flex-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#D4C4B4] transition-colors"
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
              stroke="#2C2C2C"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            {([1, 2, 3] as const).map((n) => (
              <span
                key={n}
                className="w-2 h-2 rounded-full transition-colors"
                style={{ backgroundColor: n <= step ? "#1D9E75" : "#C8B8A8" }}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-[#7A6A5A]">
            {STEP_LABELS[step - 1]}
          </span>
        </div>

        {/* balances the back button so dots stay centered */}
        <div className="flex-none w-8" />
      </div>

      {/* ── Scrollable content ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-2 pb-8 flex flex-col gap-5 max-w-lg mx-auto w-full">

        {/* ── Step 1: Choose a sport ──────────────────────────── */}
        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {SPORTS.map((sport) => (
                <button
                  key={sport}
                  onClick={() => {
                    patch({ sport: sport.toLowerCase() });
                    setStep(2);
                  }}
                  className="rounded-xl border border-[#C8B8A8] bg-white p-3 flex items-center gap-2.5 cursor-pointer active:bg-[#F0EAE2] transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-none"
                    style={{
                      backgroundColor:
                        SPORT_COLORS[sport.toLowerCase()]?.text ?? "#1D9E75",
                    }}
                  />
                  <span className="text-sm font-medium text-[#2C2C2C]">
                    {getSportLabel(sport)}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#7A6A5A] text-center">
              Tap a sport to continue
            </p>
          </>
        )}

        {/* ── Step 2: Activity details ────────────────────────── */}
        {step === 2 && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#2C2C2C]">
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
                <label className="text-sm font-medium text-[#2C2C2C]">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#2C2C2C]">
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border border-[#C8B8A8] bg-white rounded-xl px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-[#2C2C2C]">Limit spots</span>
                <span className="text-[11px] text-[#7A6A5A]">
                  {limitSpots
                    ? `Max ${stepperValue} participants`
                    : "Off — open to all"}
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
                  limitSpots ? "bg-[#1D9E75] justify-end" : "bg-[#C8B8A8] justify-start"
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
                  className="w-8 h-8 rounded-lg border border-[#C8B8A8] bg-[#F0EAE2] flex items-center justify-center text-[#2C2C2C] flex-none"
                >
                  −
                </button>
                <span className="flex-1 text-center text-base font-semibold text-[#2C2C2C]">
                  {stepperValue}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const v = Math.min(20, stepperValue + 1);
                    setStepperValue(v);
                    patch({ max_participants: v });
                  }}
                  className="w-8 h-8 rounded-lg border border-[#C8B8A8] bg-[#F0EAE2] flex items-center justify-center text-[#2C2C2C] flex-none"
                >
                  +
                </button>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#2C2C2C]">
                Skill level
              </label>
              <div className="flex rounded-xl overflow-hidden border border-[#C8B8A8]">
                {SKILL_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => patch({ skill_level: level })}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                      form.skill_level === level
                        ? "bg-[#1D9E75] text-white"
                        : "text-[#7A6A5A] hover:text-[#2C2C2C]"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-sm font-medium text-[#2C2C2C]">
                  Description
                </label>
                <span className="text-[11px] text-[#7A6A5A]">
                  {form.description.trim().length}/20 min
                </span>
              </div>
              <textarea
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Tell people what to expect — pace, gear, meetup spot, anything useful."
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
              <label className="text-sm font-medium text-[#2C2C2C]">
                Location
              </label>
              <input
                type="text"
                value={form.location_name}
                onChange={(e) => patch({ location_name: e.target.value })}
                placeholder="e.g. Balboa Park Tennis Courts"
                className={inputCls}
              />
            </div>

            <button
              type="button"
              onClick={handleUseLocation}
              disabled={geoLoading}
              className="self-start border border-[#C8B8A8] text-[#1D9E75] rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 hover:border-[#1D9E75] transition-colors disabled:opacity-50"
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

            <div className="border-t border-[#C8B8A8]" />

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
  const colors = SPORT_COLORS[form.sport] ?? { bg: "#C8E6DC", text: "#1A6B52" };

  return (
    <div className="rounded-xl border border-[#C8B8A8] bg-white p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 flex-none"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {getSportLabel(form.sport)}
        </span>
        {startsAtIso && (
          <span className="text-[10px] text-[#7A6A5A] leading-4 shrink-0">
            {formatActivityTime(startsAtIso)}
          </span>
        )}
      </div>

      <p className="text-[13px] font-medium text-[#2C2C2C] leading-snug">
        {form.title}
      </p>

      <p className="text-[11px] text-[#7A6A5A] flex items-center gap-1 min-w-0">
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
          <span className="italic text-[#C8B8A8]">No location yet</span>
        )}
        {form.skill_level && (
          <span className="flex-none">· {form.skill_level}</span>
        )}
      </p>

      <p className="text-[11px] text-[#7A6A5A] pt-0.5 flex items-center gap-1">
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
          ? "Open — no spot limit"
          : `Max ${form.max_participants} participant${form.max_participants === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}
