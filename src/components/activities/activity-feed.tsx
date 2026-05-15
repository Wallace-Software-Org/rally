"use client";

import { useState } from "react";
import type { ActivityWithParticipants, Profile } from "@/types";
import { joinActivity, leaveActivity } from "@/lib/actions/activities";
import AppNav from "@/components/nav/app-nav";
import ActivityFilters from "@/components/activities/activity-filters";
import {
  ActivityCardMobile,
  ActivityCardDesktop,
} from "@/components/activities/activity-card";
import MapPanel from "@/components/map/map-panel";
import MapPreviewCard from "@/components/map/map-preview-card";

export default function ActivityFeed({
  activities,
  profile,
  userId,
}: {
  activities: ActivityWithParticipants[];
  profile: Profile;
  userId: string | null;
}) {
  const [sport, setSport] = useState("All");
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

  const visible =
    sport === "All"
      ? activities
      : activities.filter((a) => a.sport.toLowerCase() === sport.toLowerCase());

  const selectedActivity = selectedId
    ? (activities.find((a) => a.id === selectedId) ?? null)
    : null;

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
    <div className="h-screen flex flex-col bg-white dark:bg-zinc-950 overflow-hidden">
      <AppNav profile={profile} />

      {/* ── Filter pills (mobile) ─────────────────────────────── */}
      <div
        className="flex-none flex gap-2 px-4 py-3 overflow-x-auto border-b border-zinc-100 dark:border-zinc-800 lg:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        <ActivityFilters sport={sport} onChange={setSport} />
      </div>

      {/* ── Scrollable body (mobile) ──────────────────────────── */}
      <div className="flex-1 overflow-y-auto lg:hidden">
        <MapPanel activities={activities} variant="strip" />

        {visible.length === 0 ? (
          <p className="py-20 text-center text-sm text-zinc-400">
            No open activities
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-[14px]">
            {visible.map((a) => (
              <ActivityCardMobile
                key={a.id}
                activity={a}
                isJoined={joined.has(a.id)}
                isJoining={joining.has(a.id)}
                isLeaving={leaving.has(a.id)}
                onJoin={() => handleJoin(a.id)}
                onLeave={() => handleLeave(a.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom bar (mobile) ───────────────────────────────── */}
      <div className="flex-none border-t border-zinc-100 dark:border-zinc-800 p-3 lg:hidden">
        <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1D9E75] text-white text-sm font-semibold py-3.5 hover:bg-[#199068] active:bg-[#147a56] transition-colors">
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
        </button>
      </div>

      {/* ── Desktop layout ────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="flex flex-col w-[380px] flex-none border-r border-zinc-100 dark:border-zinc-800 overflow-hidden">
          <div
            className="flex-none flex gap-2 px-4 py-3 overflow-x-auto border-b border-zinc-100 dark:border-zinc-800"
            style={{ scrollbarWidth: "none" }}
          >
            <ActivityFilters sport={sport} onChange={setSport} />
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {visible.length === 0 ? (
              <p className="py-20 text-center text-sm text-zinc-400">
                No open activities
              </p>
            ) : (
              visible.map((a) => (
                <ActivityCardDesktop
                  key={a.id}
                  activity={a}
                  isActive={selectedId === a.id}
                  isJoined={joined.has(a.id)}
                  isJoining={joining.has(a.id)}
                  isLeaving={leaving.has(a.id)}
                  onSelect={() =>
                    setSelectedId((prev) => (prev === a.id ? null : a.id))
                  }
                  onJoin={() => handleJoin(a.id)}
                  onLeave={() => handleLeave(a.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Map panel */}
        <MapPanel
          activities={activities}
          selectedId={selectedId}
          onDotClick={(id) =>
            setSelectedId((prev) => (prev === id ? null : id))
          }
        >
          {selectedActivity && (
            <MapPreviewCard
              activity={selectedActivity}
              isJoined={joined.has(selectedActivity.id)}
              isJoining={joining.has(selectedActivity.id)}
              isLeaving={leaving.has(selectedActivity.id)}
              onJoin={() => handleJoin(selectedActivity.id)}
              onLeave={() => handleLeave(selectedActivity.id)}
              onDismiss={() => setSelectedId(null)}
            />
          )}
        </MapPanel>
      </div>
    </div>
  );
}
