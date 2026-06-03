"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import type { ActivityDetail } from "@/types";

const SearchBox = dynamic(
  () => import("@mapbox/search-js-react").then((m) => m.SearchBox),
  { ssr: false },
);
import {
  updateActivity,
  cancelActivity,
  duplicateActivity,
} from "@/lib/actions/activities";
import PageHeader from "@/components/ui/page-header";
import DatePicker from "@/components/ui/date-picker";
import TimePicker from "@/components/ui/time-picker";
import Select from "@/components/ui/select";

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

const SKILL_LEVELS = [
  "All levels",
  "Beginner",
  "Intermediate",
  "Advanced",
] as const;

const inputCls =
  "w-full rounded-xl border border-brand-border bg-transparent px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-[1.5px] focus:ring-brand-teal";

const primaryBtn =
  "w-full rounded-xl bg-brand-teal text-white text-sm font-semibold py-3.5 hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors disabled:opacity-40";

function parseDateParts(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };

  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
}

function normalizeExternalLink(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    // Invalid URLs are handled by returning null below.
  }

  return null;
}

export default function EditActivityForm({
  activity,
}: {
  activity: ActivityDetail;
}) {
  const router = useRouter();
  const isDraftDuplicate = activity.starts_at === null;
  const initDT = parseDateParts(activity.starts_at);

  const [title, setTitle] = useState(activity.title);
  const [description, setDescription] = useState(activity.description ?? "");
  const [date, setDate] = useState(initDT.date);
  const [time, setTime] = useState(initDT.time);
  const [locationName, setLocationName] = useState(activity.location_name);
  const [externalLink, setExternalLink] = useState(
    activity.external_link ?? "",
  );
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
  const [duplicateConfirm, setDuplicateConfirm] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(isDraftDuplicate);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const duplicateButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if ((!cancelConfirm && !duplicateConfirm) || cancelling || duplicating)
      return;

    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as Node;
      if (cancelConfirm && cancelButtonRef.current?.contains(target)) return;
      if (duplicateConfirm && duplicateButtonRef.current?.contains(target))
        return;

      setCancelConfirm(false);
      setDuplicateConfirm(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [cancelConfirm, cancelling, duplicateConfirm, duplicating]);

  function startsAtIso(): string {
    if (!date || !time) return "";
    return new Date(`${date}T${time}:00`).toISOString();
  }

  const externalLinkValue = normalizeExternalLink(externalLink);
  const externalLinkValid = !externalLink.trim() || externalLinkValue !== null;
  const locationValid = locationName.trim().length > 0;
  const currentStartsAt = startsAtIso();
  const canSave =
    title.trim().length > 0 &&
    locationValid &&
    externalLinkValid &&
    !!currentStartsAt;

  async function handleSave() {
    const starts = currentStartsAt;
    if (!canSave || !starts || submitting) return;
    setSubmitting(true);
    const { error } = await updateActivity(activity.id, {
      title: title.trim(),
      description: description.trim(),
      starts_at: starts,
      max_participants: limitSpots ? stepperValue : null,
      skill_level: skillLevel,
      external_link: externalLinkValue,
      location_name: locationName.trim(),
      lat,
      lng,
      status,
    });
    setSubmitting(false);
    if (!error) {
      setShowDraftBanner(false);
      router.push(`/activity/${activity.id}`);
    }
  }

  async function handleCancelActivity() {
    setCancelling(true);
    const { error } = await cancelActivity(activity.id);
    if (!error) router.push("/");
    setCancelling(false);
  }

  async function handleDuplicateActivity() {
    if (duplicating) return;
    if (!duplicateConfirm) {
      setDuplicateError(null);
      setCancelConfirm(false);
      setDuplicateConfirm(true);
      return;
    }

    setDuplicateError(null);
    setDuplicating(true);
    const { id, error } = await duplicateActivity(activity.id);
    setDuplicating(false);
    setDuplicateConfirm(false);
    if (error || !id) {
      setDuplicateError(error ?? "Could not duplicate activity.");
      return;
    }

    router.push(`/activity/${id}/edit`);
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col bg-brand-bg">
      <PageHeader
        title={isDraftDuplicate ? "New activity" : "Edit activity"}
        backHref={`/activity/${activity.id}`}
        containerClassName="max-w-lg xl:max-w-3xl"
      />

      {showDraftBanner && (
        <div className="px-4 max-w-lg xl:max-w-3xl mx-auto w-full">
          <div className="rounded-xl border border-brand-teal bg-brand-teal/10 px-4 py-3 text-sm font-medium text-brand-teal">
            Set a date and time to finish posting this activity.
          </div>
        </div>
      )}

      {/* ── Form fields ─────────────────────────────────────── */}
      <div className="px-4 py-2 pb-12 xl:py-8 flex flex-col xl:flex-row xl:items-start gap-5 xl:gap-12 max-w-lg xl:max-w-3xl mx-auto w-full">
        {/* Left column: title, description, date/time, location */}
        <div className="flex flex-col gap-5 xl:flex-1 min-w-0">
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
            {!locationValid && (
              <p className="text-xs text-brand-danger">Location is required.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-brand-text">
              External registration link
            </label>
            <input
              type="url"
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
              placeholder="https://..."
              className={inputCls}
            />
            {!externalLinkValid && (
              <p className="text-xs text-brand-danger">
                Enter a valid http or https URL.
              </p>
            )}
          </div>

          {/* Date / Time */}
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
        </div>

        {/* Right column: skill level, limit spots, save, danger zone */}
        <div className="flex flex-col gap-5 xl:w-72">
          {/* Skill level */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-brand-text">
              Skill level
            </label>
            <Select
              value={skillLevel}
              onChange={setSkillLevel}
              options={SKILL_LEVELS}
            />
          </div>

          {/* Limit spots */}
          <div className="border border-brand-border bg-brand-bg rounded-xl">
            <div className="flex items-center justify-between px-4 py-3">
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
              <>
                <div className="border-t border-brand-border/60" />
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-brand-text">
                    Number of spots
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setStepperValue((v) => Math.max(2, v - 1))}
                      className="w-8 h-8 rounded-lg border border-brand-border bg-brand-bg flex items-center justify-center text-brand-text flex-none"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-base font-semibold text-brand-text">
                      {stepperValue}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setStepperValue((v) => Math.min(20, v + 1))
                      }
                      className="w-8 h-8 rounded-lg border border-brand-border bg-brand-bg flex items-center justify-center text-brand-text flex-none"
                    >
                      +
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!canSave || submitting}
            className={`${primaryBtn} xl:w-auto xl:px-8`}
          >
            {submitting
              ? "Saving..."
              : !currentStartsAt
                ? "Set a date to save"
                : "Save changes"}
          </button>

          {/* ── Cancel activity ──────────────────────────────── */}
          <div className="border-t border-brand-border pt-6 mt-2 flex flex-col gap-3 transition-all duration-1000">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
              Danger zone
            </p>

            {cancelConfirm && (
              <p className="text-sm text-brand-muted text-center leading-relaxed">
                This will remove all participants and cancel the activity. This
                can&apos;t be undone.
              </p>
            )}

            {!duplicateConfirm && (
              <button
                ref={cancelButtonRef}
                onClick={() => {
                  if (cancelConfirm) {
                    handleCancelActivity();
                    return;
                  }

                  setDuplicateConfirm(false);
                  setCancelConfirm(true);
                }}
                disabled={cancelling}
                className={`w-full xl:w-auto xl:px-6 rounded-xl border text-sm font-medium py-3 transition-colors disabled:opacity-40 ${
                  cancelConfirm
                    ? "border-brand-danger-dark bg-brand-danger-dark text-white hover:opacity-90"
                    : "border-brand-danger text-brand-danger hover:bg-brand-danger/5"
                }`}
              >
                {cancelling
                  ? "Cancelling…"
                  : cancelConfirm
                    ? "Yes, cancel activity"
                    : "Cancel activity"}
              </button>
            )}
            <AnimatePresence initial={false} mode="popLayout">
              {cancelConfirm && !cancelling && (
                <motion.button
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setCancelConfirm(false)}
                  className="w-full flex items-center justify-center text-sm text-brand-muted py-1 hover:text-brand-text transition-colors"
                >
                  Never mind
                </motion.button>
              )}
            </AnimatePresence>

            {!cancelConfirm && (
              <button
                ref={duplicateButtonRef}
                onClick={handleDuplicateActivity}
                disabled={duplicating}
                className={`w-full xl:w-auto xl:px-6 rounded-xl border text-sm font-medium py-3 transition-colors disabled:opacity-40 ${
                  duplicateConfirm
                    ? "border-brand-teal bg-brand-teal text-white hover:bg-brand-teal-hover active:bg-brand-teal-active"
                    : "border-brand-border text-brand-muted hover:border-brand-border-hover hover:text-brand-text"
                }`}
              >
                {duplicating
                  ? "Duplicating..."
                  : duplicateConfirm
                    ? "Confirm duplicate"
                    : "Duplicate activity"}
              </button>
            )}
            <AnimatePresence initial={false} mode="popLayout">
              {duplicateConfirm && !duplicating && (
                <motion.button
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setDuplicateConfirm(false)}
                  className="w-full flex items-center justify-center text-sm text-brand-muted py-1 hover:text-brand-text transition-colors"
                >
                  Cancel
                </motion.button>
              )}
            </AnimatePresence>
            {duplicateError && (
              <p className="text-xs text-brand-danger text-center">
                {duplicateError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
