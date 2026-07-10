import { describe, it, expect } from "vitest";
import {
  splitActivitiesByTime,
  upcomingOpenCount,
  joinedCount,
  capacityLine,
  hostParticipantLine,
  cancelledParticipantLine,
} from "@/lib/utils/hosting";
import type { HostedActivity, HostParticipant } from "@/types";

const NOW = new Date("2026-07-08T12:00:00Z").getTime();
const iso = (offsetHours: number) =>
  new Date(NOW + offsetHours * 3_600_000).toISOString();

function act(over: Partial<HostedActivity> & { id: string }): HostedActivity {
  return {
    title: "Morning run",
    sport: "running",
    description: null,
    location_name: "Papago Park",
    skill_level: null,
    starts_at: iso(1),
    max_participants: null,
    visibility: "public",
    status: "open",
    participants: [],
    ...over,
  };
}

function participant(userId: string): HostParticipant {
  return { id: `p-${userId}`, user_id: userId, profiles: null };
}

describe("splitActivitiesByTime", () => {
  it("splits on starts_at vs now", () => {
    const activities = [
      act({ id: "future", starts_at: iso(24) }),
      act({ id: "past", starts_at: iso(-24) }),
    ];
    const { upcoming, past } = splitActivitiesByTime(activities, NOW);
    expect(upcoming.map((a) => a.id)).toEqual(["future"]);
    expect(past.map((a) => a.id)).toEqual(["past"]);
  });

  it("keeps a cancelled future activity in upcoming", () => {
    const activities = [
      act({ id: "cancelled-future", starts_at: iso(24), status: "cancelled" }),
      act({ id: "cancelled-past", starts_at: iso(-24), status: "cancelled" }),
    ];
    const { upcoming, past } = splitActivitiesByTime(activities, NOW);
    expect(upcoming.map((a) => a.id)).toEqual(["cancelled-future"]);
    expect(past.map((a) => a.id)).toEqual(["cancelled-past"]);
  });

  it("orders upcoming soonest-first and past most-recent-first", () => {
    const activities = [
      act({ id: "u-late", starts_at: iso(48) }),
      act({ id: "u-soon", starts_at: iso(2) }),
      act({ id: "p-old", starts_at: iso(-48) }),
      act({ id: "p-recent", starts_at: iso(-2) }),
    ];
    const { upcoming, past } = splitActivitiesByTime(activities, NOW);
    expect(upcoming.map((a) => a.id)).toEqual(["u-soon", "u-late"]);
    expect(past.map((a) => a.id)).toEqual(["p-recent", "p-old"]);
  });
});

describe("upcomingOpenCount", () => {
  it("counts only upcoming, non-cancelled activities", () => {
    const activities = [
      act({ id: "upcoming-open", starts_at: iso(24) }),
      act({ id: "upcoming-cancelled", starts_at: iso(24), status: "cancelled" }),
      act({ id: "past-open", starts_at: iso(-24) }),
    ];
    expect(upcomingOpenCount(activities, NOW)).toBe(1);
  });
});

describe("capacityLine", () => {
  it("shows a plain joined count when uncapped", () => {
    expect(capacityLine(3, null)).toEqual({ text: "3 joined", tone: "muted" });
  });

  it("shows teal Full when at capacity", () => {
    expect(capacityLine(6, 6)).toEqual({ text: "Full", tone: "teal" });
  });

  it("shows X of Y and spots left when there is room", () => {
    expect(capacityLine(4, 6)).toEqual({
      text: "4 of 6 · 2 spots left",
      tone: "muted",
    });
  });
});

describe("joinedCount", () => {
  it("excludes the host from the joined count", () => {
    const participants = [
      participant("host-1"),
      participant("u2"),
      participant("u3"),
    ];
    expect(joinedCount(participants, "host-1")).toBe(2);
  });
});

describe("hostParticipantLine", () => {
  it("nudges to share when no one else has joined", () => {
    expect(hostParticipantLine(1, 6, 0)).toEqual({
      text: "Share the link to fill spots",
      tone: "muted",
    });
  });

  it("shows a plain joined count when uncapped", () => {
    expect(hostParticipantLine(3, null, 2)).toEqual({
      text: "3 joined",
      tone: "muted",
    });
  });

  it("shows teal Full when at capacity", () => {
    expect(hostParticipantLine(6, 6, 5)).toEqual({
      text: "Full",
      tone: "teal",
    });
  });

  it("shows X of Y and spots left when there is room", () => {
    expect(hostParticipantLine(4, 6, 3)).toEqual({
      text: "4 of 6 · 2 spots left",
      tone: "muted",
    });
  });
});

describe("cancelledParticipantLine", () => {
  it("handles zero, one, and many", () => {
    expect(cancelledParticipantLine(0)).toBe("No one had joined");
    expect(cancelledParticipantLine(1)).toBe("1 person had joined");
    expect(cancelledParticipantLine(3)).toBe("3 people had joined");
  });
});
