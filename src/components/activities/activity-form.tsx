"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { cancelActivity } from "@/lib/actions/activities";
import { getSportLabel, SPORTS_LIST } from "@/lib/utils/sport-config";
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
  // Match the other inputs (text-base xl:text-sm): 16px on mobile to avoid iOS
  // auto-zoom, 14px on desktop (xl, 1280px+).
  cssText:
    "input { font-size: 16px; } @media (min-width: 1280px) { input { font-size: 14px; } }",
} as const;

const SKILL_LEVELS = [
  "All levels",
  "Beginner",
  "Intermediate",
  "Advanced",
] as const;

const SPORT_ITEMS = SPORTS_LIST.filter((s) => s !== "All");

const inputCls =
  "w-full rounded-xl border border-brand-border bg-transparent px-4 py-3 text-base xl:text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-[1.5px] focus:ring-brand-teal";

const primaryBtn =
  "w-full rounded-xl bg-brand-teal text-white text-sm font-semibold py-3.5 hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

export type ActivityFormMode = "edit" | "duplicate" | "new";

export type ActivityFormInitialData = Partial<{
  id: string;
  title: string;
  sport: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  visibility: "public" | "private";
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
  ends_at: string | null;
  visibility: "public" | "private";
  max_participants: number | null;
  skill_level: string;
  external_link: string | null;
  location_name: string;
  lat: number | null;
  lng: number | null;
};

type ActivityFormProps = {
  initialData?: ActivityFormInitialData;
  mode: ActivityFormMode;
  onSubmit: (
    data: ActivityFormSubmitData,
  ) => Promise<{ error: string | null } | void>;
};

type TouchedField =
  | "title"
  | "location"
  | "externalLink"
  | "date"
  | "time"
  | "description"
  | "sport";

type TouchedFields = Record<TouchedField, boolean>;

const initialTouchedFields: TouchedFields = {
  title: false,
  location: false,
  externalLink: false,
  date: false,
  time: false,
  description: false,
  sport: false,
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

function localDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function nextHalfHourTimeValue(date: Date = new Date()): string {
  const minutesSinceMidnight =
    date.getHours() * 60 +
    date.getMinutes() +
    (date.getSeconds() > 0 || date.getMilliseconds() > 0 ? 1 : 0);
  const roundedMinutes = Math.ceil(minutesSinceMidnight / 30) * 30;
  const hours = Math.floor(roundedMinutes / 60) % 24;
  const minutes = roundedMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
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
  const parsedEndsAt = parseDateParts(initialData.ends_at);

  const [title, setTitle] = useState(initialData.title ?? "");
  const initialSportKey = (initialData.sport?.trim() ?? "").toLowerCase();
  const [selectedSport, setSelectedSport] = useState(
    SPORT_ITEMS.some((item) => item.toLowerCase() === initialSportKey)
      ? initialSportKey
      : "",
  );
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
  const [endTime, setEndTime] = useState(parsedEndsAt.time);
  const [endTimeVisible, setEndTimeVisible] = useState(
    Boolean(initialData.ends_at),
  );
  const [visibility, setVisibility] = useState<"public" | "private">(
    initialData.visibility ?? "public",
  );
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<TouchedFields>(initialTouchedFields);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [externalLinkOpen, setExternalLinkOpen] = useState(
    Boolean(initialData.external_link),
  );
  const [validationNow, setValidationNow] = useState(() => new Date());
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

  useEffect(() => {
    const interval = window.setInterval(() => {
      setValidationNow(new Date());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  function startsAtIso(): string {
    if (!date || !time) return "";
    return new Date(`${date}T${time}:00`).toISOString();
  }

  function endsAtIso(): string | null {
    if (!endTimeVisible || !endTime || !date) return null;
    return new Date(`${date}T${endTime}:00`).toISOString();
  }

  function markTouched(field: TouchedField) {
    setTouched((prev) => {
      if (prev[field]) return prev;
      return { ...prev, [field]: true };
    });
  }

  function handleDuplicateActivity() {
    if (!duplicateConfirm) {
      setCancelConfirm(false);
      setDuplicateConfirm(true);
      return;
    }

    const params = new URLSearchParams();
    params.set("title", title.trim());
    params.set("sport", sportValue);
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
    if (!canSubmit || !starts || submitting) return;

    setSubmitError(null);
    setSubmitting(true);
    const result = await onSubmit({
      title: title.trim(),
      sport: sportValue,
      description: description.trim(),
      starts_at: starts,
      ends_at: endsAtIso(),
      visibility,
      max_participants: limitSpots ? stepperValue : null,
      skill_level: skillLevel,
      external_link: externalLinkValue,
      location_name: locationName.trim(),
      lat,
      lng,
    });
    setSubmitting(false);

    if (result?.error) {
      setSubmitError(result.error);
    }
  }

  const externalLinkValue = normalizeExternalLink(externalLink);
  const externalLinkValid = !externalLink.trim() || externalLinkValue !== null;
  const titleValid = title.trim().length > 0;
  const descriptionValid = description.trim().length >= 20;
  const sportValue = selectedSport;
  const sportValid = Boolean(selectedSport);
  const todayDate = localDateString(validationNow);
  const dateValid = date.trim().length > 0 && date >= todayDate;
  const timeSelected = time.trim().length > 0;
  const selectedDateIsToday = date === todayDate;
  const selectedStartTime =
    date && timeSelected ? new Date(`${date}T${time}:00`) : null;
  const timeAtLeastThirtyMinutesFromNow =
    !selectedDateIsToday ||
    !selectedStartTime ||
    selectedStartTime.getTime() >= validationNow.getTime() + 30 * 60 * 1000;
  const timeValid = timeSelected && timeAtLeastThirtyMinutesFromNow;
  const defaultOpenTime = date ? nextHalfHourTimeValue(validationNow) : "08:00";
  const locationHasSelectedResult =
    locationName.trim().length > 0 &&
    lat !== null &&
    lng !== null;
  const locationValid = locationHasSelectedResult;
  const currentStartsAt = startsAtIso();
  const canSubmit =
    titleValid &&
    sportValid &&
    locationValid &&
    descriptionValid &&
    dateValid &&
    timeValid &&
    !!currentStartsAt;
  const submitDisabled = submitting || !canSubmit;
  const showTitleError = touched.title && !titleValid;
  const showLocationError = touched.location && !locationValid;
  const showExternalLinkError = touched.externalLink && !externalLinkValid;
  const showDateError = touched.date && !dateValid;
  const showTimeRequiredError = touched.time && !timeSelected;
  const showTimeLeadTimeError =
    touched.time && timeSelected && !timeAtLeastThirtyMinutesFromNow;
  const showDescriptionError = touched.description && !descriptionValid;
  const showSportError = touched.sport && !sportValid;
  const pageTitle = mode === "edit" ? "Edit activity" : "New activity";
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
      ? "[&_button]:border-brand-teal [&_button]:ring-[1.5px] [&_button]:ring-brand-teal"
      : "";
  const highlightedTimeCls =
    mode === "duplicate" && !time
      ? "[&_button]:border-brand-teal [&_button]:ring-[1.5px] [&_button]:ring-brand-teal"
      : "";

  return (
    <div className="page-with-back xl:pt-0 flex-1 overflow-y-auto flex flex-col bg-brand-bg">
      <div className="px-4 pt-6 pb-4 max-w-lg xl:max-w-5xl mx-auto w-full">
        <h1 className="text-xl font-semibold text-brand-text">{pageTitle}</h1>
      </div>

      {mode === "duplicate" && (
        <div className="px-4 max-w-lg xl:max-w-5xl mx-auto w-full">
          <div className="rounded-xl border border-brand-teal bg-brand-teal/10 px-4 py-3 text-sm font-medium text-brand-teal">
            Set a date to post this activity
          </div>
        </div>
      )}

      <div className="px-4 py-2 pb-12 xl:py-8 flex flex-col xl:flex-row xl:items-stretch gap-8 xl:gap-0 max-w-lg xl:max-w-5xl mx-auto w-full">
        <div className="flex flex-col gap-5 xl:flex-1 xl:pr-10 min-w-0">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-brand-text">
              Activity title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => markTouched("title")}
              placeholder="e.g. Morning pickleball at Balboa Park"
              className={inputCls}
            />
            {showTitleError && (
              <p className="text-red-500 text-sm">Activity title is required</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-brand-text">Sport</label>
            <Select
              value={selectedSport ? getSportLabel(selectedSport) : ""}
              onChange={(label) => {
                markTouched("sport");
                setSelectedSport(label.toLowerCase());
              }}
              options={SPORT_ITEMS}
              placeholder="Select a sport"
              listClassName="max-h-[240px] overflow-y-auto"
            />
            {showSportError && (
              <p className="text-red-500 text-sm">Select a sport to continue</p>
            )}
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
                onBlur={() => markTouched("location")}
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
            {showLocationError && (
              <p className="text-red-500 text-sm">
                Select a location from the suggestions
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-brand-text">Date</label>
            <div className={highlightedDateCls}>
              <div
                onBlur={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node | null))
                    return;
                  markTouched("date");
                }}
              >
                <DatePicker
                  value={date}
                  onChange={(value) => {
                    markTouched("date");
                    setValidationNow(new Date());
                    setDate(value);
                  }}
                  minDate={todayDate}
                  placeholder="Select a date"
                />
              </div>
            </div>
            {showDateError && (
              <p className="text-red-500 text-sm">Select a date</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center">
              <label className="text-sm font-medium text-brand-text flex-1">
                Start time
              </label>
              <button
                type="button"
                onClick={() => setEndTimeVisible((v) => !v)}
                className="flex items-center justify-center w-5 h-5 rounded-full border border-brand-border text-brand-muted hover:border-brand-teal hover:text-brand-teal transition-colors flex-none"
                aria-label={endTimeVisible ? "Remove end time" : "Add end time"}
              >
                {endTimeVisible ? (
                  <svg width="8" height="2" viewBox="0 0 8 2" fill="currentColor" aria-hidden="true">
                    <rect width="8" height="1.5" rx="0.75" y="0.25" />
                  </svg>
                ) : (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" aria-hidden="true">
                    <rect x="3.25" width="1.5" height="8" rx="0.75" />
                    <rect y="3.25" width="8" height="1.5" rx="0.75" />
                  </svg>
                )}
              </button>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <div className={highlightedTimeCls}>
                  <div
                    onBlur={(e) => {
                      if (
                        e.currentTarget.contains(e.relatedTarget as Node | null)
                      )
                        return;
                      markTouched("time");
                    }}
                  >
                    <TimePicker
                      value={time}
                      onChange={(value) => {
                        markTouched("time");
                        setValidationNow(new Date());
                        setTime(value);
                      }}
                      defaultOpenValue={defaultOpenTime}
                      placeholder="Select a time"
                    />
                  </div>
                </div>
              </div>
              {endTimeVisible && (
                <div className="flex-1">
                  <TimePicker
                    value={endTime}
                    onChange={setEndTime}
                    defaultOpenValue={time || defaultOpenTime}
                    placeholder="End time"
                  />
                </div>
              )}
            </div>
            {showTimeRequiredError && (
              <p className="text-red-500 text-sm">Select a time</p>
            )}
            {showTimeLeadTimeError && (
              <p className="text-red-500 text-sm">
                Choose a time at least 30 minutes from now
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-brand-text">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => markTouched("description")}
              placeholder="Tell people what to expect: pace, gear, meetup spot, anything useful."
              rows={4}
              className={`${inputCls} resize-none`}
            />
            {showDescriptionError && (
              <p className="text-red-500 text-sm">
                Tell people what to expect (20 characters minimum)
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5 xl:w-80 xl:border-l-[0.5px] xl:border-brand-border xl:pl-10 xl:self-stretch">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            Optional
          </p>

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

          <div className="border border-brand-border bg-brand-bg rounded-xl">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-brand-text">
                  {visibility === "public" ? "Public activity" : "Private activity"}
                </span>
                <span className="text-xs text-brand-muted">
                  {visibility === "public"
                    ? "Anyone can find and join"
                    : "Only joinable via link"}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={visibility === "private"}
                onClick={() =>
                  setVisibility((v) => (v === "public" ? "private" : "public"))
                }
                className={`w-10 h-6 rounded-full p-0.5 flex items-center transition-colors flex-none ${
                  visibility === "private"
                    ? "bg-brand-teal justify-end"
                    : "bg-brand-border justify-start"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
              </button>
            </div>
          </div>

          <div className="border border-brand-border bg-brand-bg rounded-xl">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-brand-text">
                  External registration link
                </span>
                <span className="text-xs text-brand-muted">
                  Redirect joiners to register elsewhere
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={externalLinkOpen}
                onClick={() => setExternalLinkOpen((p) => !p)}
                className={`w-10 h-6 rounded-full p-0.5 flex items-center transition-colors flex-none ${
                  externalLinkOpen
                    ? "bg-brand-teal justify-end"
                    : "bg-brand-border justify-start"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
              </button>
            </div>
            {externalLinkOpen && (
              <>
                <div className="border-t border-brand-border/60" />
                <div className="px-4 py-3 flex flex-col gap-1.5">
                  <input
                    type="url"
                    value={externalLink}
                    onChange={(e) => setExternalLink(e.target.value)}
                    onBlur={() => markTouched("externalLink")}
                    placeholder="https://..."
                    className={inputCls}
                  />
                  {showExternalLinkError && (
                    <p className="text-red-500 text-sm">
                      Enter a valid http or https URL.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2 xl:mt-auto">
            <button
              onClick={handleSubmit}
              disabled={submitDisabled}
              className={`${primaryBtn} xl:w-auto xl:px-8`}
            >
              {submitLabel}
            </button>

            {submitError && (
              <p className="text-xs text-brand-danger text-center">
                {submitError}
              </p>
            )}
          </div>

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
