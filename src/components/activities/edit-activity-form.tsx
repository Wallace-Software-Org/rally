"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import type { ActivityDetail } from "@/types";

const SearchBox = dynamic(
  () => import("@mapbox/search-js-react").then((m) => m.SearchBox),
  { ssr: false },
);
import { updateActivity, cancelActivity } from "@/lib/actions/activities";
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

const SKILL_LEVELS = ["All levels", "Beginner", "Advanced"] as const;

const inputCls =
  "w-full rounded-xl border border-brand-border bg-transparent px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-[1.5px] focus:ring-brand-teal";

const primaryBtn =
  "w-full rounded-xl bg-brand-teal text-white text-sm font-semibold py-3.5 hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors disabled:opacity-40";

function parseDateParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
}

export default function EditActivityForm({
  activity,
}: {
  activity: ActivityDetail;
}) {
  const router = useRouter();
  const initDT = parseDateParts(activity.starts_at);

  const [title, setTitle] = useState(activity.title);
  const [description, setDescription] = useState(activity.description ?? "");
  const [date, setDate] = useState(initDT.date);
  const [time, setTime] = useState(initDT.time);
  const [locationName, setLocationName] = useState(activity.location_name);
  const [lat, setLat] = useState<number | null>(activity.lat);
  const [lng, setLng] = useState<number | null>(activity.lng);
  const [skillLevel, setSkillLevel] = useState(
    SKILL_LEVELS.includes(activity.skill_level as (typeof SKILL_LEVELS)[number])
      ? (activity.skill_level as string)
      : "All levels",
  );
  const [limitSpots, setLimitSpots] = useState(
    activity.max_participants !== null,
  );
  const [stepperValue, setStepperValue] = useState(
    activity.max_participants ?? 4,
  );
  const [status, setStatus] = useState<"open" | "closed">(
    activity.status === "closed" ? "closed" : "open",
  );
  const [submitting, setSubmitting] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  function startsAtIso(): string {
    if (!date || !time) return "";
    return new Date(`${date}T${time}:00`).toISOString();
  }

  const canSave = title.trim().length > 0 && !!date && !!time;

  async function handleSave() {
    const starts = startsAtIso();
    if (!canSave || !starts || submitting) return;
    setSubmitting(true);
    const { error } = await updateActivity(activity.id, {
      title: title.trim(),
      description: description.trim(),
      starts_at: starts,
      max_participants: limitSpots ? stepperValue : null,
      skill_level: skillLevel,
      location_name: locationName,
      lat,
      lng,
      status,
    });
    setSubmitting(false);
    if (!error) router.push(`/activity/${activity.id}`);
  }

  async function handleCancelActivity() {
    setCancelling(true);
    const { error } = await cancelActivity(activity.id);
    if (!error) router.push("/");
    setCancelling(false);
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col bg-brand-bg">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center px-4 pt-6 pb-4 gap-4 max-w-lg mx-auto w-full">
        <Link
          href={`/activity/${activity.id}`}
          aria-label="Back"
          className="md:hidden flex-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-brand-avatar-bg transition-colors"
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
        </Link>
        <p className="flex-1 text-center text-base font-semibold text-brand-text">
          Edit activity
        </p>
        <div className="md:hidden flex-none w-8" />
      </div>

      {/* ── Form fields ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-2 pb-12 flex flex-col gap-5 max-w-lg mx-auto w-full">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-brand-text">
            Activity title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Morning pickleball at Balboa Park"
            className={inputCls}
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-brand-text">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell people what to expect: pace, gear, meetup spot, anything useful."
            rows={4}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Date / Time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-brand-text">Date</label>
            <DatePicker
              value={date}
              onChange={setDate}
              placeholder="Select a date"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-brand-text">Time</label>
            <TimePicker
              value={time}
              onChange={setTime}
              placeholder="Select a time"
            />
          </div>
        </div>

        {/* Location */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-brand-text">
            Location
          </label>
          <div className="w-full">
            <SearchBox
              accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""}
              value={locationName}
              onChange={(value) => {
                setLocationName(value);
                setLat(null);
                setLng(null);
              }}
              onRetrieve={(result) => {
                const feat = result.features[0];
                if (!feat) return;
                const [lngVal, latVal] = feat.geometry.coordinates;
                setLocationName(feat.properties.name);
                setLat(latVal);
                setLng(lngVal);
              }}
              onClear={() => {
                setLocationName("");
                setLat(null);
                setLng(null);
              }}
              options={{ language: "en", country: "US" }}
              placeholder="e.g. Balboa Park Tennis Courts"
              theme={SEARCH_BOX_THEME}
            />
          </div>
        </div>

        {/* Skill level */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-brand-text">
            Skill level
          </label>
          <div className="flex rounded-xl overflow-hidden border border-brand-border">
            {SKILL_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSkillLevel(level)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  skillLevel === level
                    ? "bg-brand-teal text-white"
                    : "text-brand-muted hover:text-brand-text"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Limit spots */}
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
            onClick={() => setLimitSpots((p) => !p)}
            className={`w-10 h-6 rounded-full p-0.5 flex items-center transition-colors flex-none ${
              limitSpots
                ? "bg-brand-teal justify-end"
                : "bg-brand-border justify-start"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
          </button>
        </div>

        {limitSpots && (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setStepperValue((v) => Math.max(2, v - 1))}
              className="w-8 h-8 rounded-lg border border-brand-border bg-brand-bg flex items-center justify-center text-brand-text flex-none"
            >
              −
            </button>
            <span className="flex-1 text-center text-base font-semibold text-brand-text">
              {stepperValue}
            </span>
            <button
              type="button"
              onClick={() => setStepperValue((v) => Math.min(20, v + 1))}
              className="w-8 h-8 rounded-lg border border-brand-border bg-brand-bg flex items-center justify-center text-brand-text flex-none"
            >
              +
            </button>
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!canSave || submitting}
          className={primaryBtn}
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>

        {/* ── Cancel activity ──────────────────────────────── */}
        <div
          // transition={{ layout: { duration: 0.2, ease: "easeInOut" } }}
          className="border-t border-brand-border pt-6 mt-2 flex flex-col gap-3 transition-all duration-1000"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            Danger zone
          </p>

          {cancelConfirm && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-brand-muted text-center leading-relaxed">
                This will remove all participants and cancel the activity. This
                can&apos;t be undone.
              </p>
              <button
                onClick={handleCancelActivity}
                disabled={cancelling}
                className="w-full rounded-xl bg-brand-danger-dark text-white text-sm font-semibold py-3.5 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {cancelling ? "Cancelling…" : "Yes, cancel activity"}
              </button>
            </div>
          )}

          <button
            onClick={() =>
              cancelConfirm ? setCancelConfirm(false) : setCancelConfirm(true)
            }
            disabled={cancelling}
            className="w-full rounded-xl border border-brand-danger text-brand-danger text-sm font-medium py-3 hover:bg-brand-danger/5 transition-colors disabled:opacity-40"
          >
            {cancelConfirm ? "Keep it" : "Cancel activity"}
          </button>
        </div>
      </div>
    </div>
  );
}
