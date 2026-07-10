import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
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

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("HostingManager action row", () => {
  it("renders Edit, Copy link, Group chat, and Share to Story", () => {
    render(<HostingManager activities={[hosted({})]} isOwner hostId="host-1" />);
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
    render(<HostingManager activities={[hosted({})]} isOwner hostId="host-1" />);
    expect(screen.queryByText(/Cancel activity/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cancel this activity/i)).not.toBeInTheDocument();
  });

  it("labels copy as 'Copy invite link' for private activities", () => {
    render(
      <HostingManager
        activities={[hosted({ visibility: "private" })]}
        isOwner
        hostId="host-1"
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
      />,
    );
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Share to Story" }),
    ).not.toBeInTheDocument();
  });
});

describe("HostingManager copy feedback", () => {
  it("swaps Copy link to a confirmed 'Copied' state and reverts after ~2s", async () => {
    vi.useFakeTimers();
    render(<HostingManager activities={[hosted({})]} isOwner hostId="host-1" />);

    const copy = screen.getByRole("button", { name: "Copy link" });
    await act(async () => {
      fireEvent.click(copy);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("/activity/a1"),
    );
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Copy link" }),
    ).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(
      screen.getByRole("button", { name: "Copy link" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Copied" }),
    ).not.toBeInTheDocument();
  });
});

describe("HostingManager md threshold", () => {
  it("gates button labels and the description behind md (icon-only below md)", () => {
    render(
      <HostingManager
        activities={[hosted({ description: "Canal loop, easy pace" })]}
        isOwner
        hostId="host-1"
      />,
    );

    // Description is present in the DOM but only shown from md up.
    const desc = screen.getByText("Canal loop, easy pace");
    expect(desc).toHaveClass("hidden", "md:block");

    // The button's visible label is gated to md; below md the aria-label
    // (icon-only) carries the name.
    const copy = screen.getByRole("button", { name: "Copy link" });
    const label = copy.querySelector("span");
    expect(label).not.toBeNull();
    expect(label).toHaveTextContent("Copy link");
    expect(label).toHaveClass("hidden", "md:inline");
  });
});
