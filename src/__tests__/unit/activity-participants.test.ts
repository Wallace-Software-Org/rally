import { describe, expect, it } from "vitest";
import {
  getParticipantsWithHostFirst,
  spotsLeftText,
} from "@/lib/utils/activity-participants";
import type { ParticipantProfile } from "@/types";

describe("spotsLeftText", () => {
  it("returns Open when there is no participant cap", () => {
    expect(spotsLeftText(null, 5)).toBe("Open");
  });

  it("returns Full when no spots remain", () => {
    expect(spotsLeftText(4, 4)).toBe("Full");
    expect(spotsLeftText(4, 6)).toBe("Full");
  });

  it("uses the singular noun when exactly one spot is left", () => {
    expect(spotsLeftText(4, 3)).toBe("1 spot left");
  });

  it("uses the plural noun when more than one spot is left", () => {
    expect(spotsLeftText(10, 0)).toBe("10 spots left");
    expect(spotsLeftText(4, 2)).toBe("2 spots left");
  });
});

describe("activity participant utilities", () => {
  it("moves the host first and uses the canonical host profile", () => {
    const hostProfile: ParticipantProfile = {
      full_name: "Wallace Palmer",
      avatar_url: "host.jpg",
    };
    const participants = [
      {
        id: "p-2",
        user_id: "participant-1",
        profiles: { full_name: "Pat Avery", avatar_url: null },
      },
      {
        id: "p-1",
        user_id: "host-1",
        profiles: { full_name: "Wrong Host", avatar_url: null },
      },
    ];

    const ordered = getParticipantsWithHostFirst({
      participants,
      creatorId: "host-1",
      hostProfile,
    });

    expect(ordered.map((participant) => participant.user_id)).toEqual([
      "host-1",
      "participant-1",
    ]);
    expect(ordered[0].profiles).toEqual(hostProfile);
  });

  it("can add a host display row when the host participant is missing", () => {
    const ordered = getParticipantsWithHostFirst({
      participants: [
        {
          id: "p-2",
          user_id: "participant-1",
          profiles: { full_name: "Pat Avery", avatar_url: null },
        },
      ],
      creatorId: "host-1",
      hostProfile: {
        full_name: "Wallace Palmer",
        avatar_url: "host.jpg",
      } as ParticipantProfile,
      createHostParticipant: (profile) => ({
        id: "host-host-1",
        user_id: "host-1",
        profiles: profile,
      }),
    });

    expect(ordered.map((participant) => participant.user_id)).toEqual([
      "host-1",
      "participant-1",
    ]);
  });
});
