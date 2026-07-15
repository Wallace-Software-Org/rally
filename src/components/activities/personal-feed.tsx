"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import type { ActivityWithParticipants } from "@/types";
import { joinActivity, leaveActivity } from "@/lib/actions/activities";
import { ACTIVITY_FULL_ERROR } from "@/lib/utils/activity-participants";
import MapPreviewCard from "@/components/map/map-preview-card";
import { ActivityCardDesktop } from "@/components/activities/activity-card";
import HostStrip, { type HostSummary } from "@/components/activities/host-strip";

const MapPanel = dynamic(() => import("@/components/map/map-panel"), {
  ssr: false,
});

// The main feed scoped to a single host: same layout trees and cards, no
// filters, no radius logic. The filter pill bar is replaced by the HostStrip.
export default function PersonalFeed({
  activities,
  userId,
  hostId,
  host,
}: {
  activities: ActivityWithParticipants[];
  userId: string | null;
  hostId: string;
  host: HostSummary;
}) {
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

  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  const visible = useMemo(() => {
    if (!userId) return activities;

    return activities.map((activity) => {
      const hasUserParticipant = activity.participants.some(
        (participant) => participant.user_id === userId,
      );
      const shouldBeJoined = joined.has(activity.id);

      if (hasUserParticipant === shouldBeJoined) return activity;

      return {
        ...activity,
        participants: shouldBeJoined
          ? [
              ...activity.participants,
              {
                id: `local-${activity.id}-${userId}`,
                user_id: userId,
                profiles: null,
              },
            ]
          : activity.participants.filter(
              (participant) => participant.user_id !== userId,
            ),
      };
    });
  }, [activities, joined, userId]);

  const emptyMessage = `${host.full_name} has no upcoming activities`;

  const selectedActivity = visible.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;
    const el = cardRefs.current.get(selectedId);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  // Optimistic join/leave, mirroring the main feed: local state flips instantly,
  // the server action reconciles, and a capacity rejection surfaces as `full`.
  async function handleJoin(
    activityId: string,
  ): Promise<{ ok: boolean; full: boolean }> {
    if (!userId || joined.has(activityId) || joining.has(activityId)) {
      return { ok: false, full: false };
    }

    setJoining((prev) => new Set(prev).add(activityId));
    setJoined((prev) => new Set(prev).add(activityId));

    const { error } = await joinActivity(activityId);

    if (error) {
      setJoined((prev) => {
        const next = new Set(prev);
        next.delete(activityId);
        return next;
      });
    }

    setJoining((prev) => {
      const next = new Set(prev);
      next.delete(activityId);
      return next;
    });

    return { ok: !error, full: error === ACTIVITY_FULL_ERROR };
  }

  async function handleLeave(activityId: string): Promise<boolean> {
    if (!userId) return false;

    setJoined((prev) => {
      const next = new Set(prev);
      next.delete(activityId);
      return next;
    });

    const { error } = await leaveActivity(activityId);

    if (error) {
      setJoined((prev) => new Set(prev).add(activityId));
    }

    return !error;
  }

  const emptyPanel = (
    <div className="py-16 flex items-center justify-center">
      <div className="w-full rounded-xl bg-brand-surface border border-brand-border px-6 py-16 text-center text-sm text-brand-muted">
        {emptyMessage}
      </div>
    </div>
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-brand-bg overflow-hidden">
      {/* ── Map strip — mobile, md, lg: fixed above host strip, hidden at xl ── */}
      <div className="xl:hidden flex-none">
        <MapPanel
          activities={visible}
          userId={userId}
          variant="strip"
          selectedId={selectedId}
          fitToPins
          onDotClick={(id) =>
            setSelectedId((prev) => (prev === id ? null : id))
          }
        />
      </div>

      {/* ── Host strip — replaces the filter bar (mobile + md, < xl) ── */}
      <div className="xl:hidden flex-none relative z-10 border-b border-brand-border px-4 py-3">
        <HostStrip host={host} />
      </div>

      {/* ── Content area ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">
        {/* Mobile + md + lg (< xl): single scrollable card grid */}
        <div className="xl:hidden flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4">
            {visible.length === 0 ? (
              emptyPanel
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 py-4">
                {visible.map((a) => (
                  <div
                    key={a.id}
                    className="h-full"
                    ref={(el) => {
                      if (el) cardRefs.current.set(a.id, el);
                      else cardRefs.current.delete(a.id);
                    }}
                  >
                    <ActivityCardDesktop
                      activity={a}
                      userId={userId}
                      isActive={selectedId === a.id}
                      showDetails={false}
                      isJoined={joined.has(a.id)}
                      isJoining={joining.has(a.id)}
                      onSelect={() =>
                        setSelectedId((prev) => (prev === a.id ? null : a.id))
                      }
                      onJoin={() => handleJoin(a.id)}
                      showHostedBy={a.creator_id !== hostId}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* xl (1280px+): fixed 720px left panel + map fills remaining space */}
        <div className="hidden xl:flex flex-1 overflow-hidden">
          {/* Left panel — 720px fixed, scrolls independently */}
          <div className="w-180 flex-none flex flex-col border-r border-brand-border">
            {/* Host strip — full width of left panel, in the filter bar slot */}
            <div className="flex-none relative z-10 border-b border-brand-border px-6 py-3">
              <HostStrip host={host} />
            </div>

            {/* Scrollable card area */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-4">
                {visible.length === 0 ? (
                  emptyPanel
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {visible.map((a) => (
                      <ActivityCardDesktop
                        key={a.id}
                        activity={a}
                        userId={userId}
                        isActive={selectedId === a.id}
                        showDetails={true}
                        isJoined={joined.has(a.id)}
                        isJoining={joining.has(a.id)}
                        onSelect={() =>
                          setSelectedId((prev) => (prev === a.id ? null : a.id))
                        }
                        onJoin={() => handleJoin(a.id)}
                        showHostedBy={a.creator_id !== hostId}
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
              fitToPins
              onDotClick={(id) =>
                setSelectedId((prev) => (prev === id ? null : id))
              }
            >
              {selectedActivity && (
                <MapPreviewCard
                  key={selectedActivity.id}
                  activity={selectedActivity}
                  userId={userId}
                  onJoin={() => handleJoin(selectedActivity.id)}
                  onLeave={() => handleLeave(selectedActivity.id)}
                  onDismiss={() => setSelectedId(null)}
                />
              )}
            </MapPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
