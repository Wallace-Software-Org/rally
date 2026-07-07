"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { ActivityWithParticipants } from "@/types";
import { joinActivity, leaveActivity } from "@/lib/actions/activities";
import { updateUserLocation } from "@/lib/actions/profiles";
import MapPreviewCard from "@/components/map/map-preview-card";
import ActivityFilters, {
  DatePickerPill,
  DistancePickerPill,
} from "@/components/activities/activity-filters";
import { ActivityCardDesktop } from "@/components/activities/activity-card";
import { useLocation } from "@/hooks/use-location";
import { type DateFilter, matchesDateFilter } from "@/lib/utils/date-filters";
import {
  type DistanceFilter,
  DEFAULT_DISTANCE_FILTER,
  calculateDistance,
} from "@/lib/utils/distance";

const MapPanel = dynamic(() => import("@/components/map/map-panel"), {
  ssr: false,
});

export default function ActivityFeed({
  activities,
  userId,
  userActivities = [],
  profileLat = null,
  profileLng = null,
}: {
  activities: ActivityWithParticipants[];
  userId: string | null;
  userActivities?: string[];
  profileLat?: number | null;
  profileLng?: number | null;
}) {
  const {
    lat: userLat,
    lng: userLng,
    loading: locationLoading,
  } = useLocation();
  const [sports, setSports] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [distance, setDistance] = useState<DistanceFilter>(
    DEFAULT_DISTANCE_FILTER,
  );
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

  // Persist browser coords to the user's profile on every successful read so
  // their stored location stays current (and can serve as a fallback later).
  // Fire and forget: never block feed render on the write.
  useEffect(() => {
    if (!userId || userLat == null || userLng == null) return;
    void updateUserLocation(userLat, userLng);
  }, [userId, userLat, userLng]);

  // Location source + fallback chain for the distance filter:
  //   1. browser geolocation (primary)
  //   2. stored profile coords (when geolocation is denied/unsupported)
  //   3. neither -> filter disabled, all activities shown
  const filterLat = userLat ?? profileLat;
  const filterLng = userLng ?? profileLng;
  const hasCoords = filterLat != null && filterLng != null;
  // While geolocation is still resolving, don't filter yet (avoids a flicker
  // from filtering by profile coords and then re-filtering by browser coords).
  const canFilterDistance = !locationLoading && hasCoords;
  const distanceDisabled = !locationLoading && !hasCoords;

  const activitiesWithLocalParticipation = useMemo(() => {
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

  // Client-side distance filtering for now. Move server-side (bounding box /
  // PostGIS) once data scales beyond a single region.
  function withinDistance(a: ActivityWithParticipants): boolean {
    if (!canFilterDistance || distance === "any") return true;
    // Never hide activities that are missing coordinates.
    if (a.lat == null || a.lng == null) return true;
    return (
      calculateDistance(filterLat!, filterLng!, a.lat, a.lng) <= distance
    );
  }

  const visible = activitiesWithLocalParticipation.filter(
    (a) =>
      (sports.length === 0 ||
        sports.some((s) => s.toLowerCase() === a.sport.toLowerCase())) &&
      matchesDateFilter(a.starts_at, dateFilter) &&
      withinDistance(a),
  );

  const selectedActivity = visible.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;
    const el = cardRefs.current.get(selectedId);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  // Optimistic updates: local state is mutated immediately so the UI responds instantly.
  // We deliberately skip revalidatePath to avoid a full server round-trip that would flash the list.
  async function handleJoin(activityId: string): Promise<boolean> {
    if (!userId || joined.has(activityId) || joining.has(activityId)) {
      return false;
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

    return !error;
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

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-brand-bg overflow-hidden">
      {/* ── Map strip — mobile, md, lg: fixed above filter bar, hidden at xl ── */}
      <div className="xl:hidden flex-none">
        <MapPanel
          activities={visible}
          userId={userId}
          variant="strip"
          selectedId={selectedId}
          onDotClick={(id) =>
            setSelectedId((prev) => (prev === id ? null : id))
          }
        />
      </div>

      {/* ── Filter bar — mobile + md (< lg): date pill left, sport pills scroll right ── */}
      <div className="xl:hidden flex-none relative z-10 flex items-center border-b border-brand-border">
        <div className="pl-4 pr-2 py-3 flex-none flex items-center gap-2">
          <DatePickerPill value={dateFilter} onChange={setDateFilter} />
          <DistancePickerPill
            value={distance}
            onChange={setDistance}
            disabled={distanceDisabled}
          />
        </div>
        <div className="w-px self-stretch bg-brand-border flex-none" />
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
            <ActivityFilters sports={sports} onChange={setSports} userActivities={userActivities} />
          </div>
          <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-linear-to-l from-brand-bg to-transparent" />
        </div>
      </div>

      {/* ── Content area ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">
        {/* Mobile + md + lg (< xl): single scrollable card grid */}
        <div className="xl:hidden flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4">
            {!userId && (
              <div className="mt-3 mb-1 rounded-xl bg-brand-teal-muted px-4 py-2.5 text-xs text-brand-teal-text font-medium">
                Join to see who&apos;s going and save your spot
              </div>
            )}

            {visible.length === 0 ? (
              <p className="py-20 text-center text-sm text-brand-muted">
                No open activities
              </p>
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
            {/* Filter bar — full width of left panel, date first */}
            <div className="flex-none relative z-10 border-b border-brand-border px-6 flex items-center gap-2 py-3">
              <DatePickerPill value={dateFilter} onChange={setDateFilter} />
              <DistancePickerPill
                value={distance}
                onChange={setDistance}
                disabled={distanceDisabled}
              />
              <div className="w-px h-4 bg-brand-border flex-none mx-1" />
              <ActivityFilters sports={sports} onChange={setSports} toolbar userActivities={userActivities} />
            </div>

            {/* Scrollable card area */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-4">
                {!userId && (
                  <div className="mb-3 rounded-xl bg-brand-teal-muted px-4 py-2.5 text-xs text-brand-teal-text font-medium">
                    Join to see who&apos;s going and save your spot
                  </div>
                )}

                {visible.length === 0 ? (
                  <p className="py-20 text-center text-sm text-brand-muted">
                    No open activities
                  </p>
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
              userLat={userLat}
              userLng={userLng}
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

      {/* ── Post activity button — mobile (full width) and md/lg (max-w-xs centered) ── */}
      {userId && (
        <div className="xl:hidden flex-none border-t border-brand-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Link
            href="/activity/new"
            className="w-full md:max-w-xs md:mx-auto flex items-center justify-center gap-2 rounded-xl bg-brand-teal text-white text-sm font-semibold py-3.5 hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors"
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
