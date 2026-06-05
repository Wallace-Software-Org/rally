"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { cancelActivity } from "@/lib/actions/activities";
import { getSportLabel, SPORTS_LIST } from "@/lib/utils/sport-config";
import PageHeader from "@/components/ui/page-header";
import DatePicker from "@/components/ui/date-picker";
import TimePicker from "@/components/ui/time-picker";
import Select from "@/components/ui/select";

const SearchBox = dynamic(
  () => import("@mapbox/search-js-react").then((m) => m.SearchBox),
  { ssr: false },
);

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

const SPORT_ITEMS = SPORTS_LIST.filter((s) => s !== "All");

const inputCls =
  "w-full rounded-xl border border-brand-border bg-transparent px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-[1.5px] focus:ring-brand-teal";

const primaryBtn =
  "w-full rounded-xl bg-brand-teal text-white text-sm font-semibold py-3.5 hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors disabled:opacity-40";

export type ActivityFormMode = "edit" | "duplicate" | "new";

export type ActivityFormInitialData = Partial<{
  id: string;
  title: string;
  sport: string;
  description: string | null;
  starts_at: string | null;
  max_participants: number | null;
  skill_level: string | null;
  external_link: string | null;
  location_name: string;
  lat: number | null;
  lng: number | null;
  status: string;
}>;

export type ActivityFormSubmitData = {
  title: string;
  sport: string;
  description: string;
  starts_at: string;
  max_participants: number | null;
  skill_level: string;
  external_link: string | null;
  location_name: string;
  lat: number | null;
  lng: number | null;
  status: string;
};

type ActivityFormProps = {
  initialData?: ActivityFormInitialData;
  mode: ActivityFormMode;
  onSubmit: (
    data: ActivityFormSubmitData,
  ) => Promise<{ error: string | null } | void>;
};

function parseDateParts(iso: string | null | undefined): {
  date: string;
  time: string;
} {
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

function normalizeSkillLevel(value: string | null | undefined): string {
  if (SKILL_LEVELS.includes(value as (typeof SKILL_LEVELS)[number])) {
    return value as string;
  }

  const normalized = value?.toLowerCase();
  const matchingLevel = SKILL_LEVELS.find(
    (level) =>
      level.toLowerCase() === normalized ||
      (normalized === "all" && level === "All levels"),
  );

  if (matchingLevel) return matchingLevel;

  return "All levels";
}

export default function ActivityForm({
  initialData = {},
  mode,
  onSubmit,
}: ActivityFormProps) {
  const router = useRouter();
  const parsedStartsAt = parseDateParts(initialData.starts_at);
  const startsAtParts =
    mode === "duplicate"
      ? { date: "", time: parsedStartsAt.time }
      : parsedStartsAt;

  const [title, setTitle] = useState(initialData.title ?? "");
  const [sport, setSport] = useState(initialData.sport?.toLowerCase() ?? "");
  const [description, setDescription] = useState(initialData.description ?? "");
  const [date, setDate] = useState(startsAtParts.date);
  const [time, setTime] = useState(startsAtParts.time);
  const [locationName, setLocationName] = useState(
    initialData.location_name ?? "",
  );
  const [externalLink, setExternalLink] = useState(
    initialData.external_link ?? "",
  );
  const [lat, setLat] = useState<number | null>(initialData.lat ?? null);
  const [lng, setLng] = useState<number | null>(initialData.lng ?? null);
  const [skillLevel, setSkillLevel] = useState(
    normalizeSkillLevel(initialData.skill_level),
  );
  const [limitSpots, setLimitSpots] = useState(
    initialData.max_participants !== undefined &&
      initialData.max_participants !== null,
  );
  const [stepperValue, setStepperValue] = useState(
    initialData.max_participants ?? 4,
  );
  const [status] = useState<"open" | "closed">(
    initialData.status === "closed" ? "closed" : "open",
  );
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [duplicateConfirm, setDuplicateConfirm] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const duplicateButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (mode !== "edit") return;
    if ((!cancelConfirm && !duplicateConfirm) || cancelling) return;

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
  }, [cancelConfirm, cancelling, duplicateConfirm, mode]);

  function startsAtIso(): string {
    if (!date || !time) return "";
    return new Date(`${date}T${time}:00`).toISOString();
  }

  function handleDuplicateActivity() {
    if (!duplicateConfirm) {
      setCancelConfirm(false);
      setDuplicateConfirm(true);
      return;
    }

    const params = new URLSearchParams();
    params.set("title", title.trim());
    params.set("sport", sport);
    params.set("location", locationName.trim());
    params.set("description", description.trim());
    params.set("skill_level", skillLevel);
    if (initialData.starts_at) params.set("starts_at", initialData.starts_at);
    if (typeof lat === "number") params.set("lat", String(lat));
    if (typeof lng === "number") params.set("lng", String(lng));
    if (limitSpots) params.set("max_participants", String(stepperValue));
    if (externalLink.trim()) params.set("external_link", externalLink.trim());

    router.push(`/activity/duplicate?${params.toString()}`);
  }

  async function handleCancelActivity() {
    if (!initialData.id) return;

    setCancelling(true);
    const { error } = await cancelActivity(initialData.id);
    if (!error) router.push("/");
    setCancelling(false);
  }

  async function handleSubmit() {
    const starts = startsAtIso();
    setHasSubmitted(true);
    if (!canSubmit || !starts || submitting) return;

    setSubmitError(null);
    setSubmitting(true);
    const result = await onSubmit({
      title: title.trim(),
      sport,
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

    if (result?.error) {
      setSubmitError(result.error);
    }
  }

  const externalLinkValue = normalizeExternalLink(externalLink);
  const externalLinkValid = !externalLink.trim() || externalLinkValue !== null;
  const locationValid = locationName.trim().length > 0;
  const currentStartsAt = startsAtIso();
  const canSubmit =
    title.trim().length > 0 &&
    sport.trim().length > 0 &&
    locationValid &&
    externalLinkValid &&
    !!currentStartsAt;
  const pageTitle = mode === "edit" ? "Edit activity" : "New activity";
  const backHref =
    mode === "edit" && initialData.id ? `/activity/${initialData.id}` : "/";
  const submitLabel =
    mode === "edit"
      ? submitting
        ? "Saving..."
        : !currentStartsAt
          ? "Set a date to save"
          : "Save changes"
      : submitting
        ? "Posting..."
        : "Post activity";
  const highlightedDateCls =
    mode === "duplicate" && !date
      ? "[&>div>button]:border-brand-teal [&>div>button]:ring-[1.5px] [&>div>button]:ring-brand-teal"
      : "";
  const highlightedTimeCls =
    mode === "duplicate" && !time
      ? "[&>div>button]:border-brand-teal [&>div>button]:ring-[1.5px] [&>div>button]:ring-brand-teal"
      : "";

  return (
    <div className="flex-1 overflow-y-auto flex flex-col bg-brand-bg">
      <PageHeader
        title={pageTitle}
        backHref={backHref}
        containerClassName="max-w-lg xl:max-w-3xl"
      />

      {mode === "duplicate" && (
        <div className="px-4 max-w-lg xl:max-w-3xl mx-auto w-full">
          <div className="rounded-xl border border-brand-teal bg-brand-teal/10 px-4 py-3 text-sm font-medium text-brand-teal">
            Set a date to post this activity
          </div>
        </div>
      )}

      <div className="px-4 py-2 pb-12 xl:py-8 flex flex-col xl:flex-row xl:items-start gap-5 xl:gap-12 max-w-lg xl:max-w-3xl mx-auto w-full">
        <div className="flex flex-col gap-5 xl:flex-1 min-w-0">
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
            {hasSubmitted && !locationValid && (
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
            {hasSubmitted && !externalLinkValid && (
              <p className="text-xs text-brand-danger">
                Enter a valid http or https URL.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-brand-text">
                Date
              </label>
              <div className={highlightedDateCls}>
                <DatePicker
                  value={date}
                  onChange={setDate}
                  placeholder="Select a date"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-brand-text">
                Time
              </label>
              <div className={highlightedTimeCls}>
                <TimePicker
                  value={time}
                  onChange={setTime}
                  placeholder="Select a time"
                />
              </div>
            </div>
          </div>

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

        <div className="flex flex-col gap-5 xl:w-72">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-brand-text">
              Sport
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SPORT_ITEMS.map((a) => {
                const key = a.toLowerCase();
                const active = sport === key;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setSport(key)}
                    aria-pressed={active}
                    className={`cursor-pointer rounded-xl py-3 px-2 text-sm font-medium border transition-colors text-center ${
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
          </div>

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

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`${primaryBtn} xl:w-auto xl:px-8`}
          >
            {submitLabel}
          </button>

          {submitError && (
            <p className="text-xs text-brand-danger text-center">
              {submitError}
            </p>
          )}

          {mode === "edit" && (
            <div className="border-t border-brand-border pt-6 mt-2 flex flex-col gap-3 transition-all duration-1000">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
                Danger zone
              </p>

              {cancelConfirm && (
                <p className="text-sm text-brand-muted text-center leading-relaxed">
                  This will remove all participants and cancel the activity.
                  This can&apos;t be undone.
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
                    ? "Cancelling..."
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
                  className={`w-full xl:w-auto xl:px-6 rounded-xl border text-sm font-medium py-3 transition-colors disabled:opacity-40 ${
                    duplicateConfirm
                      ? "border-brand-teal bg-brand-teal text-white hover:bg-brand-teal-hover active:bg-brand-teal-active"
                      : "border-brand-border text-brand-muted hover:border-brand-border-hover hover:text-brand-text"
                  }`}
                >
                  {duplicateConfirm
                    ? "Confirm duplicate"
                    : "Duplicate activity"}
                </button>
              )}
              <AnimatePresence initial={false} mode="popLayout">
                {duplicateConfirm && (
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
