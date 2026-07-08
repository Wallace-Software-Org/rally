import type { HostParticipant } from "@/types";
import { spotsLeftText } from "@/lib/utils/activity-participants";

// Split activities into upcoming and past by start time. Cancelled activities
// whose start time is still in the future stay in Upcoming (shown cancelled)
// until their date passes; then they fall into Past like any other. Upcoming is
// soonest-first; Past is most-recent-first. Shared by Hosting and Attending.
export function splitActivitiesByTime<T extends { starts_at: string }>(
  activities: T[],
  now: number = Date.now(),
): { upcoming: T[]; past: T[] } {
  const upcoming: T[] = [];
  const past: T[] = [];

  for (const a of activities) {
    if (new Date(a.starts_at).getTime() > now) upcoming.push(a);
    else past.push(a);
  }

  upcoming.sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
  past.sort(
    (a, b) =>
      new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
  );

  return { upcoming, past };
}

// Tab badge count: only upcoming, non-cancelled activities. Shared by the
// Hosting and Attending tabs.
export function upcomingOpenCount<
  T extends { status: string; starts_at: string },
>(activities: T[], now: number = Date.now()): number {
  return activities.filter(
    (a) => a.status === "open" && new Date(a.starts_at).getTime() > now,
  ).length;
}

export function isCancelled(activity: { status: string }): boolean {
  return activity.status === "cancelled";
}

// Participants other than the host. The host is a participant row (auto-joined
// on create) but does not count as someone who "joined".
export function joinedCount(
  participants: HostParticipant[],
  hostId: string,
): number {
  return participants.filter((p) => p.user_id !== hostId).length;
}

export type ParticipantLine = {
  text: string;
  tone: "muted" | "teal";
};

// Capacity line shared by Hosting and Attending cards.
//   - full     -> teal "Full"
//   - capped   -> "X of Y · Z spots left"
//   - uncapped -> "X joined"
export function capacityLine(
  participantCount: number,
  maxParticipants: number | null,
): ParticipantLine {
  if (maxParticipants == null) {
    return { text: `${participantCount} joined`, tone: "muted" };
  }
  const spots = spotsLeftText(maxParticipants, participantCount);
  if (spots === "Full") {
    return { text: "Full", tone: "teal" };
  }
  return {
    text: `${participantCount} of ${maxParticipants} · ${spots}`,
    tone: "muted",
  };
}

// The capacity/availability line for an open host card. Adds the host-only
// "share to fill spots" nudge when no one else has joined.
export function hostParticipantLine(
  participantCount: number,
  maxParticipants: number | null,
  others: number,
): ParticipantLine {
  if (others === 0) {
    return { text: "Share the link to fill spots", tone: "muted" };
  }
  return capacityLine(participantCount, maxParticipants);
}

// The participant line for a cancelled host card.
export function cancelledParticipantLine(others: number): string {
  if (others === 0) return "No one had joined";
  return `${others} ${others === 1 ? "person" : "people"} had joined`;
}
