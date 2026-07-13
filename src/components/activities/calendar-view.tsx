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
  addMonths,
  isBeforeCurrentMonth,
} from "@/lib/utils/calendar";

type CalendarViewProps = {
  // Feed activities already filtered by everything except the Time pill (the
  // grid is the time filter).
  activities: ActivityWithParticipants[];
  now: Date;
  month: YearMonth;
  onMonthChange: (month: YearMonth) => void;
  selectedKey: string | null;
  onSelectDay: (key: string) => void;
  // stack = mobile (grid over agenda); split = desktop (sticky grid + agenda).
  variant: "stack" | "split";
};

export default function CalendarView({
  activities,
  now,
  month,
  onMonthChange,
  selectedKey,
  onSelectDay,
  variant,
}: CalendarViewProps) {
  const todayKey = localDayKey(now);
  const grouped = useMemo(
    () => groupActivitiesByDay(activities),
    [activities],
  );
  const cells = useMemo(() => buildMonthGrid(month, now), [month, now]);
  const agenda = useMemo(
    () => agendaForMonth(grouped, month, now),
    [grouped, month, now],
  );

  const groupRefs = useRef(new Map<string, HTMLDivElement | null>());
  // The agenda's own scroll container (stack/mobile only). On split/desktop the
  // agenda scrolls in the feed's wrapper, so this stays null.
  const agendaScrollRef = useRef<HTMLDivElement | null>(null);

  // Scroll the agenda to the selected day whenever it changes. Compute the
  // offset against the scroll container (not the window) so the fixed grid above
  // stays put; fall back to scrollIntoView when the agenda has no own container.
  useEffect(() => {
    if (!selectedKey) return;
    const target = groupRefs.current.get(selectedKey);
    if (!target) return;
    const container = agendaScrollRef.current;
    if (container) {
      const delta =
        target.getBoundingClientRect().top -
        container.getBoundingClientRect().top;
      container.scrollTo({
        top: container.scrollTop + delta - 12,
        behavior: "smooth",
      });
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedKey]);

  const prevDisabled = isBeforeCurrentMonth(addMonths(month, -1), now);

  const grid = (
    <div className="flex flex-col gap-3">
      {/* Month header */}
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold text-brand-text">
          {monthLabel(month)}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            disabled={prevDisabled}
            onClick={() => onMonthChange(addMonths(month, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-full text-brand-muted transition-colors duration-200 hover:text-brand-text disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon size={16} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => onMonthChange(addMonths(month, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full text-brand-muted transition-colors duration-200 hover:text-brand-text"
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
      </div>

      {/* Weekday header */}
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

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => (
          <div key={cell.key} className="flex items-center justify-center py-0.5">
            <DayCellButton
              cell={cell}
              hasActivities={cell.key >= todayKey && grouped.has(cell.key)}
              selected={cell.key === selectedKey}
              onSelect={() => onSelectDay(cell.key)}
            />
          </div>
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
            {/* Date rail */}
            <div className="flex-none w-9 flex flex-col items-center pt-2">
              <span className="text-lg font-semibold text-brand-text leading-none">
                {group.date.getDate()}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-brand-muted mt-0.5">
                {WEEKDAY_ABBR[group.date.getDay()]}
              </span>
            </div>

            {/* Rows */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              {group.activities.map((activity) => (
                <AgendaRow key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );

  if (variant === "split") {
    return (
      <div className="mx-auto w-full max-w-4xl flex gap-8 px-6 py-6">
        <div className="flex-none w-80 self-start sticky top-0">{grid}</div>
        <div className="flex-1 min-w-0">{agendaContent}</div>
      </div>
    );
  }

  // Stack (mobile): grid fixed, only the agenda scrolls — mirroring the map
  // view's fixed-map / scrolling-list split.
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-none px-4 pt-4 pb-3">{grid}</div>
      <div
        ref={agendaScrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 pb-4"
      >
        {agendaContent}
      </div>
    </div>
  );
}

function DayCellButton({
  cell,
  hasActivities,
  selected,
  onSelect,
}: {
  cell: DayCell;
  hasActivities: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const day = cell.date.getDate();
  const base =
    "w-9 h-9 rounded-full flex items-center justify-center text-sm transition-colors duration-200";

  // Adjacent-month days: muted and non-interactive.
  if (!cell.inMonth) {
    return <span className={`${base} text-brand-muted/30`}>{day}</span>;
  }

  // Selected wins over every other state.
  if (selected) {
    return (
      <button
        type="button"
        aria-label={`${day}, selected`}
        onClick={onSelect}
        className={`${base} bg-brand-teal text-brand-warm-muted font-semibold`}
      >
        {day}
      </button>
    );
  }

  const todayOutline = cell.isToday ? "border-[1.5px] border-brand-teal" : "";

  // Has at least one activity after filters: interactive teal-muted chip.
  if (hasActivities) {
    return (
      <button
        type="button"
        aria-label={`${day}, has activities`}
        onClick={onSelect}
        className={`${base} bg-brand-teal-muted text-brand-teal-text font-medium ${todayOutline}`}
      >
        {day}
      </button>
    );
  }

  // No activities: non-interactive. Today still shows its outline.
  return (
    <span className={`${base} text-brand-text/70 ${todayOutline}`}>{day}</span>
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
