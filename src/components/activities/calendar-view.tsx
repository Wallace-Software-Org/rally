"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import type { ActivityWithParticipants } from "@/types";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { formatActivityTime } from "@/lib/utils/format-time";
import { spotsLeftText } from "@/lib/utils/activity-participants";
import {
  type YearMonth,
  type DayCell,
  WEEKDAY_ABBR,
  buildMonthGrid,
  groupActivitiesByDay,
  agendaForMonth,
  monthLabel,
  localDayKey,
  keyToDate,
  longDayLabel,
  nextDayWithActivities,
  addMonths,
  isBeforeCurrentMonth,
} from "@/lib/utils/calendar";
import { ActivityCardDesktop } from "@/components/activities/activity-card";

// ── Shared day cell ───────────────────────────────────────────────────────────
// One source of truth for how a calendar day renders, consumed by both the
// mobile stack (CalendarView) and the desktop split (CalendarDesktop) so the two
// can't drift. Exactly three treatments over a plain baseline:
//   - muted    (past date or outside the current month): muted text, no fill,
//              not interactive. Today is the first non-muted day, no ring needed.
//   - active   (has at least one matching activity): pale teal filled circle.
//   - selected (the chosen day): teal filled circle, warm-muted text.
// A non-muted day with no activities is the untreated baseline (plain text).
function MonthDay({
  cell,
  todayKey,
  selectedKey,
  hasActivities,
  onSelect,
}: {
  cell: DayCell;
  todayKey: string;
  selectedKey: string | null;
  hasActivities: boolean;
  onSelect: (key: string) => void;
}) {
  const day = cell.date.getDate();
  const circle =
    "w-9 h-9 rounded-full flex items-center justify-center text-sm transition-colors duration-200";
  const muted = !cell.inMonth || cell.key < todayKey;

  if (muted) {
    return (
      <span className="flex items-center justify-center py-0.5">
        <span className={`${circle} text-brand-muted/40`}>{day}</span>
      </span>
    );
  }

  const selected = cell.key === selectedKey;
  const state = selected
    ? "bg-brand-teal text-brand-warm-muted font-semibold"
    : hasActivities
      ? "bg-brand-teal-muted text-brand-text font-medium"
      : "text-brand-text hover:bg-brand-teal-muted/50";

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.key)}
      aria-pressed={selected}
      aria-label={`${day}${
        selected ? ", selected" : hasActivities ? ", has activities" : ""
      }`}
      className="flex items-center justify-center py-0.5"
    >
      <span className={`${circle} ${state}`}>{day}</span>
    </button>
  );
}

type CalendarViewProps = {
  // Feed activities already filtered by everything except the Time pill (the
  // grid is the time filter).
  activities: ActivityWithParticipants[];
  now: Date;
  month: YearMonth;
  onMonthChange: (month: YearMonth) => void;
  selectedKey: string | null;
  onSelectDay: (key: string) => void;
};

// Mobile stack: fixed month grid over a scrolling month agenda.
export default function CalendarView({
  activities,
  now,
  month,
  onMonthChange,
  selectedKey,
  onSelectDay,
}: CalendarViewProps) {
  const todayKey = localDayKey(now);
  const grouped = useMemo(() => groupActivitiesByDay(activities), [activities]);
  const cells = useMemo(() => buildMonthGrid(month), [month]);
  const agenda = useMemo(
    () => agendaForMonth(grouped, month, now),
    [grouped, month, now],
  );

  const groupRefs = useRef(new Map<string, HTMLDivElement | null>());
  const agendaScrollRef = useRef<HTMLDivElement | null>(null);

  // Scroll the agenda to the selected day whenever it changes, against the
  // scroll container so the fixed grid above stays put.
  useEffect(() => {
    if (!selectedKey) return;
    const target = groupRefs.current.get(selectedKey);
    if (!target) return;
    const container = agendaScrollRef.current;
    if (!container) return;
    const delta =
      target.getBoundingClientRect().top -
      container.getBoundingClientRect().top;
    container.scrollTo({
      top: container.scrollTop + delta - 12,
      behavior: "smooth",
    });
  }, [selectedKey]);

  const prevDisabled = isBeforeCurrentMonth(addMonths(month, -1), now);
  const chevronBtn =
    "w-7 h-7 flex-none flex items-center justify-center rounded-full text-brand-muted transition-colors duration-200 hover:text-brand-text disabled:opacity-30 disabled:cursor-not-allowed";

  const grid = (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-brand-text">
          {monthLabel(month)}
        </p>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Previous month"
            disabled={prevDisabled}
            onClick={() => onMonthChange(addMonths(month, -1))}
            className={chevronBtn}
          >
            <ChevronLeftIcon size={16} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => onMonthChange(addMonths(month, 1))}
            className={chevronBtn}
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAY_ABBR.map((abbr) => (
          <span
            key={abbr}
            className="text-center text-[11px] font-medium text-brand-muted"
          >
            {abbr[0]}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell) => (
          <MonthDay
            key={cell.key}
            cell={cell}
            todayKey={todayKey}
            selectedKey={selectedKey}
            hasActivities={grouped.has(cell.key)}
            onSelect={onSelectDay}
          />
        ))}
      </div>
    </div>
  );

  const agendaContent =
    agenda.length === 0 ? (
      <p className="py-20 text-center text-sm text-brand-muted">
        No activities in {monthLabel(month).split(" ")[0]}
      </p>
    ) : (
      <div className="flex flex-col gap-6">
        {agenda.map((group) => (
          <div
            key={group.key}
            ref={(el) => {
              groupRefs.current.set(group.key, el);
            }}
            className="flex gap-3 scroll-mt-4"
          >
            <div className="flex-none w-9 flex flex-col items-center pt-2">
              <span className="text-lg font-semibold text-brand-text leading-none">
                {group.date.getDate()}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-brand-muted mt-0.5">
                {WEEKDAY_ABBR[group.date.getDay()]}
              </span>
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-2">
              {group.activities.map((activity) => (
                <AgendaRow key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );

  // min-w-0 lets this shrink to the viewport so the grid never overflows.
  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col">
      <div className="flex-none px-4 pt-3 pb-2">{grid}</div>
      <div
        ref={agendaScrollRef}
        className="flex-1 min-w-0 min-h-0 overflow-y-auto px-4 pb-4"
      >
        {agendaContent}
      </div>
    </div>
  );
}

function AgendaRow({ activity }: { activity: ActivityWithParticipants }) {
  const meta = [
    activity.starts_at ? formatActivityTime(activity.starts_at) : null,
    activity.location_name,
    spotsLeftText(activity.max_participants, activity.participants.length),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/activity/${activity.id}`}
      className="flex items-stretch gap-3 rounded-xl border border-brand-border bg-brand-bg p-3 transition-colors duration-200 card-hover-tint hover:border-brand-border-hover"
    >
      <div className="w-0.75 flex-none rounded-full bg-brand-teal-muted" />
      <div className="min-w-0 flex flex-col gap-0.5">
        <p className="font-semibold text-brand-text truncate">
          {activity.title}
        </p>
        <p className="text-xs text-brand-muted truncate">{meta}</p>
      </div>
    </Link>
  );
}

// ── Desktop calendar ──────────────────────────────────────────────────────────
// The xl left panel: month grid pinned at the top, the selected day's activities
// scrolling below as a single column of the same feed cards (ActivityCardDesktop,
// showDetails so a click selects the activity on the map). Distinct from the
// mobile stack above, which lists the whole month's agenda under a fixed grid.
export function CalendarDesktop({
  activities,
  now,
  month,
  onMonthChange,
  selectedKey,
  onSelectDay,
  userId,
  joined,
  joining,
  selectedId,
  onSelectActivity,
  onJoin,
}: {
  activities: ActivityWithParticipants[];
  now: Date;
  month: YearMonth;
  onMonthChange: (month: YearMonth) => void;
  selectedKey: string;
  onSelectDay: (key: string) => void;
  userId: string | null;
  joined: Set<string>;
  joining: Set<string>;
  selectedId: string | null;
  onSelectActivity: (id: string) => void;
  onJoin: (id: string) => Promise<{ ok: boolean; full: boolean }>;
}) {
  const todayKey = localDayKey(now);
  const grouped = useMemo(() => groupActivitiesByDay(activities), [activities]);
  const cells = useMemo(() => buildMonthGrid(month), [month]);

  const dayActivities = grouped.get(selectedKey) ?? [];
  const selectedDate = keyToDate(selectedKey);
  const nextDay = nextDayWithActivities(grouped, selectedKey);
  const prevDisabled = isBeforeCurrentMonth(addMonths(month, -1), now);

  const chevronBtn =
    "w-8 h-8 flex-none flex items-center justify-center rounded-full text-brand-muted transition-colors duration-200 hover:text-brand-text disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Month grid — pinned */}
      <div className="flex-none border-b border-brand-border px-6 pt-5 pb-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-semibold text-brand-text">
              {monthLabel(month)}
            </p>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                aria-label="Previous month"
                disabled={prevDisabled}
                onClick={() => onMonthChange(addMonths(month, -1))}
                className={chevronBtn}
              >
                <ChevronLeftIcon size={16} />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => onMonthChange(addMonths(month, 1))}
                className={chevronBtn}
              >
                <ChevronRightIcon size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_ABBR.map((abbr) => (
              <span
                key={abbr}
                className="text-center text-xs font-medium text-brand-muted"
              >
                {abbr[0]}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell) => (
              <MonthDay
                key={cell.key}
                cell={cell}
                todayKey={todayKey}
                selectedKey={selectedKey}
                hasActivities={grouped.has(cell.key)}
                onSelect={onSelectDay}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Selected-day header + activities — single column, scrolls */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        <p className="mb-3 text-sm font-semibold text-brand-text">
          {longDayLabel(selectedDate)}
        </p>
        {dayActivities.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-brand-muted">No activities on this day.</p>
            {nextDay && (
              <button
                type="button"
                onClick={() => onSelectDay(nextDay.key)}
                className="mt-1.5 text-sm font-medium text-brand-teal-text hover:underline"
              >
                Next up: {longDayLabel(nextDay.date)}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {dayActivities.map((a) => (
              <ActivityCardDesktop
                key={a.id}
                activity={a}
                userId={userId}
                isActive={selectedId === a.id}
                showDetails={true}
                isJoined={joined.has(a.id)}
                isJoining={joining.has(a.id)}
                onSelect={() => onSelectActivity(a.id)}
                onJoin={() => onJoin(a.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
