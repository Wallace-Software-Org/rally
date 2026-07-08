import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HostingManager from "@/components/profile/hosting-manager";
import type { HostedActivity } from "@/types";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/actions/activities", () => ({
  repeatActivity: vi.fn(),
  cancelActivity: vi.fn(),
}));

vi.mock("@/hooks/use-realtime-participants", () => ({
  useRealtimeParticipants: ({
    initialParticipants,
  }: {
    initialParticipants: unknown[];
  }) => ({
    participants: initialParticipants,
    participantCount: initialParticipants.length,
    addParticipant: vi.fn(),
    removeParticipantByUserId: vi.fn(),
  }),
}));

vi.mock("@/components/activities/group-chat-modal", () => ({
  default: () => null,
}));
vi.mock("@/components/ui/share-story-modal", () => ({ default: () => null }));

const FUTURE = new Date(Date.now() + 3 * 24 * 3_600_000).toISOString();

function hosted(over: Partial<HostedActivity>): HostedActivity {
  return {
    id: "a1",
    title: "Morning run",
    sport: "running",
    description: "Nice easy pace along the canal",
    location_name: "Papago Park",
    skill_level: "Beginner",
    starts_at: FUTURE,
    max_participants: 6,
    visibility: "public",
    status: "open",
    participants: [
      { id: "p1", user_id: "host-1", profiles: null },
      { id: "p2", user_id: "u2", profiles: null },
    ],
    ...over,
  };
}

describe("HostingManager action row", () => {
  it("renders Edit, Copy link, Group chat, and Share to Story", () => {
    render(
      <HostingManager
        activities={[hosted({})]}
        isOwner
        hostId="host-1"
        variant="desktop"
      />,
    );
    expect(screen.getByRole("link", { name: "Edit" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy link" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Group chat" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Share to Story" }),
    ).toBeInTheDocument();
  });

  it("does not render any Cancel control on the card", () => {
    render(
      <HostingManager
        activities={[hosted({})]}
        isOwner
        hostId="host-1"
        variant="desktop"
      />,
    );
    expect(screen.queryByText(/Cancel activity/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cancel this activity/i)).not.toBeInTheDocument();
  });

  it("labels copy as 'Copy invite link' for private activities", () => {
    render(
      <HostingManager
        activities={[hosted({ visibility: "private" })]}
        isOwner
        hostId="host-1"
        variant="desktop"
      />,
    );
    expect(
      screen.getByRole("button", { name: "Copy invite link" }),
    ).toBeInTheDocument();
  });

  it("hides owner actions for non-owners", () => {
    render(
      <HostingManager
        activities={[hosted({})]}
        isOwner={false}
        hostId="host-1"
        variant="desktop"
      />,
    );
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Share to Story" }),
    ).not.toBeInTheDocument();
  });
});
