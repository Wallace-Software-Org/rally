"use client";

import { useState } from "react";
import Link from "next/link";
import type { ActivityWithParticipants } from "@/types";
import { joinActivity, leaveActivity } from "@/lib/actions/activities";
import ActivityFilters, {
  DatePickerPill,
} from "@/components/activities/activity-filters";
import { ActivityCardDesktop } from "@/components/activities/activity-card";
import MapPanel from "@/components/map/map-panel";
import { type DateFilter, matchesDateFilter } from "@/lib/utils/date-filters";

export default function ActivityFeed({
  activities,
  userId,
}: {
  activities: ActivityWithParticipants[];
  userId: string | null;
}) {
  const [sports, setSports] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [joined, setJoined] = useState<Set<string>>(
    () =>
      new Set(
        activities
          .filter((a) => a.participants.some((p) => p.user_id === userId))
          .map((a) => a.id),
      ),
  );
  const [joining, setJoining] = useState<Set<string>>(new Set());
  const [leaving, setLeaving] = useState<Set<string>>(new Set());

  const visible = activities.filter(
    (a) =>
      (sports.length === 0 ||
        sports.some((s) => s.toLowerCase() === a.sport.toLowerCase())) &&
      matchesDateFilter(a.starts_at, dateFilter),
  );

  // Optimistic updates: local state is mutated immediately so the UI responds instantly.
  // We deliberately skip revalidatePath to avoid a full server round-trip that would flash the list.
  async function handleJoin(activityId: string) {
    if (!userId || joined.has(activityId) || joining.has(activityId)) return;
    setJoining((prev) => new Set(prev).add(activityId));
    const { error } = await joinActivity(activityId);
    if (!error) setJoined((prev) => new Set(prev).add(activityId));
    setJoining((prev) => {
      const next = new Set(prev);
      next.delete(activityId);
      return next;
    });
  }

  async function handleLeave(activityId: string) {
    if (!userId || !joined.has(activityId) || leaving.has(activityId)) return;
    setLeaving((prev) => new Set(prev).add(activityId));
    const { error } = await leaveActivity(activityId);
    if (!error)
      setJoined((prev) => {
        const next = new Set(prev);
        next.delete(activityId);
        return next;
      });
    setLeaving((prev) => {
      const next = new Set(prev);
      next.delete(activityId);
      return next;
    });
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* ── Map strip — mobile, md, lg: fixed above filter bar, hidden at xl ── */}
      <div className="xl:hidden flex-none">
        <MapPanel activities={activities} userId={userId} variant="strip" />
      </div>

      {/* ── Filter bar — mobile + md (< lg): date pill left, sport pills scroll right ── */}
      <div className="lg:hidden flex-none flex items-center border-b border-[#C8B8A8]">
        <div className="pl-4 pr-2 py-3 flex-none">
          <DatePickerPill value={dateFilter} onChange={setDateFilter} />
        </div>
        <div className="w-px self-stretch bg-[#C8B8A8] flex-none" />
        <div className="relative flex-1 overflow-hidden">
          <div
            className="flex gap-2 px-3 py-3 overflow-x-scroll"
            style={
              {
                scrollbarWidth: "none",
                WebkitOverflowScrolling: "touch",
              } as React.CSSProperties
            }
          >
            <ActivityFilters sports={sports} onChange={setSports} />
          </div>
          <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-linear-to-l from-[#F0EAE2] to-transparent" />
        </div>
      </div>

      {/* ── Filter bar — lg only (1024–1279px): toolbar with overflow, date first ── */}
      <div className="hidden lg:flex xl:hidden flex-none border-b border-[#C8B8A8]">
        <div className="max-w-5xl mx-auto px-4 w-full flex items-center gap-2 py-3">
          <DatePickerPill value={dateFilter} onChange={setDateFilter} />
          <div className="w-px h-4 bg-[#C8B8A8] flex-none mx-1" />
          <ActivityFilters sports={sports} onChange={setSports} toolbar />
        </div>
      </div>

      {/* ── Content area ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">
        {/* Mobile + md + lg (< xl): single scrollable card grid */}
        <div className="xl:hidden flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4">
            {!userId && (
              <div className="mt-3 mb-1 rounded-xl bg-[#C8E6DC] px-4 py-2.5 text-[12px] text-[#1A6B52] font-medium">
                Join to see who&apos;s going and save your spot
              </div>
            )}

            {visible.length === 0 ? (
              <p className="py-20 text-center text-sm text-[#7A6A5A]">
                No open activities
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 py-4 items-start">
                {visible.map((a) => (
                  <ActivityCardDesktop
                    key={a.id}
                    activity={a}
                    userId={userId}
                    isActive={false}
                    showDetails={false}
                    isJoined={joined.has(a.id)}
                    isJoining={joining.has(a.id)}
                    isLeaving={leaving.has(a.id)}
                    onSelect={() =>
                      setSelectedId((prev) => (prev === a.id ? null : a.id))
                    }
                    onJoin={() => handleJoin(a.id)}
                    onLeave={() => handleLeave(a.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* xl (1280px+): fixed 720px left panel + map fills remaining space */}
        <div className="hidden xl:flex flex-1 overflow-hidden">
          {/* Left panel — 720px fixed, scrolls independently */}
          <div className="w-180 flex-none flex flex-col overflow-hidden border-r border-[#C8B8A8]">
            {/* Filter bar — full width of left panel, date first */}
            <div className="flex-none border-b border-[#C8B8A8] px-6 flex items-center gap-2 py-3">
              <DatePickerPill value={dateFilter} onChange={setDateFilter} />
              <div className="w-px h-4 bg-[#C8B8A8] flex-none mx-1" />
              <ActivityFilters sports={sports} onChange={setSports} toolbar />
            </div>

            {/* Scrollable card area */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-4">
                {!userId && (
                  <div className="mb-3 rounded-xl bg-[#C8E6DC] px-4 py-2.5 text-[12px] text-[#1A6B52] font-medium">
                    Join to see who&apos;s going and save your spot
                  </div>
                )}

                {visible.length === 0 ? (
                  <p className="py-20 text-center text-sm text-[#7A6A5A]">
                    No open activities
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 items-start">
                    {visible.map((a) => (
                      <ActivityCardDesktop
                        key={a.id}
                        activity={a}
                        userId={userId}
                        isActive={selectedId === a.id}
                        showDetails={true}
                        isJoined={joined.has(a.id)}
                        isJoining={joining.has(a.id)}
                        isLeaving={leaving.has(a.id)}
                        onSelect={() =>
                          setSelectedId((prev) => (prev === a.id ? null : a.id))
                        }
                        onJoin={() => handleJoin(a.id)}
                        onLeave={() => handleLeave(a.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Map panel — fills remaining space, always visible at xl */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <MapPanel
              activities={visible}
              userId={userId}
              variant="full"
              selectedId={selectedId}
              onDotClick={(id) =>
                setSelectedId((prev) => (prev === id ? null : id))
              }
            />
          </div>
        </div>
      </div>

      {/* ── Post activity button — mobile (full width) and md/lg (max-w-xs centered) ── */}
      {userId && (
        <div className="lg:hidden flex-none border-t border-[#C8B8A8] p-3">
          <Link
            href="/activity/new"
            className="w-full md:max-w-xs md:mx-auto flex items-center justify-center gap-2 rounded-xl bg-[#1D9E75] text-white text-sm font-semibold py-3.5 hover:bg-[#199068] active:bg-[#147a56] transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7 1.5V12.5M1.5 7H12.5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Post an activity
          </Link>
        </div>
      )}
    </div>
  );
}
