import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import MapPreviewCard from "@/components/map/map-preview-card";
import { resetParticipantWaiverOverride } from "@/hooks/use-participant-waiver";
import type { ActivityWithParticipants, JoinResult } from "@/types";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
}));

// The join modal imports this server action; nothing here reaches it because the
// waiver is treated as already accepted.
vi.mock("@/lib/actions/waivers", () => ({ acceptWaiver: vi.fn() }));

// Tapping Join on the popup opens the join modal; the join itself runs when the
// user confirms there.
function confirmJoinInModal() {
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: /join activity/i }));
}

const joinOk = () => Promise.resolve({ ok: true, full: false });
function participant(userId: string) {
  return {
    id: `p-${userId}`,
    user_id: userId,
    profiles: { full_name: userId, avatar_url: null },
  };
}

const mockActivity: ActivityWithParticipants = {
  id: "act-1",
  creator_id: "host-1",
  title: "Morning Run at Papago Park",
  sport: "running",
  external_link: null,
  location_name: "Papago Park",
  starts_at: new Date(Date.now() + 3_600_000).toISOString(),
  ends_at: null,
  visibility: "public",
  max_participants: 10,
  skill_level: "beginner",
  lat: 33.4584,
  lng: -111.9503,
  host: {
    full_name: "Host Person",
    avatar_url: null,
  },
  participants: [],
};

const viewerParticipant = {
  id: "participant-viewer",
  user_id: "viewer-1",
  profiles: {
    full_name: "Wallace Palmer",
    avatar_url: null,
  },
};

function renderCard({
  activity = mockActivity,
  userId = "viewer-1",
  onJoin = vi.fn(joinOk),
  onLeave = vi.fn().mockResolvedValue(true),
  onDismiss = vi.fn(),
}: {
  activity?: ActivityWithParticipants;
  userId?: string | null;
  onJoin?: () => Promise<JoinResult>;
  onLeave?: () => Promise<boolean>;
  onDismiss?: () => void;
} = {}) {
  return render(
    <MapPreviewCard
      activity={activity}
      userId={userId}
      participantWaiverAccepted={true}
      onJoin={onJoin}
      onLeave={onLeave}
      onDismiss={onDismiss}
    />,
  );
}

function expectBefore(first: HTMLElement, second: HTMLElement) {
  expect(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
}

afterEach(() => {
  vi.clearAllMocks();
  // The "accepted" answer is shared client state; don't let one test leak it.
  resetParticipantWaiverOverride();
});

describe("MapPreviewCard", () => {
  it("shows Going state when userId is in activity.participants", () => {
    renderCard({
      activity: {
        ...mockActivity,
        participants: [viewerParticipant],
      },
    });

    expect(screen.getByRole("button", { name: /going/i })).toBeInTheDocument();
  });

  it("shows Join state when userId is not in activity.participants", () => {
    renderCard();

    expect(screen.getByRole("button", { name: /join/i })).toBeInTheDocument();
  });

  it("isJoined updates when activity.participants prop changes", () => {
    const { rerender } = renderCard();

    expect(screen.getByRole("button", { name: /join/i })).toBeInTheDocument();

    rerender(
      <MapPreviewCard
        activity={{
          ...mockActivity,
          participants: [viewerParticipant],
        }}
        userId="viewer-1"
        participantWaiverAccepted={true}
        onJoin={vi.fn(joinOk)}
        onLeave={vi.fn().mockResolvedValue(true)}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /going/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /join activity/i }),
    ).not.toBeInTheDocument();
  });

  it("Manage button shows for host, Join/Going shows for non-host", () => {
    const { rerender } = renderCard({ userId: "host-1" });

    const manageLink = screen.getByRole("link", { name: /manage/i });
    expect(manageLink).toBeInTheDocument();
    expect(manageLink).toHaveClass("btn-tier-1");
    expect(
      screen.queryByRole("button", { name: /join/i }),
    ).not.toBeInTheDocument();

    rerender(
      <MapPreviewCard
        activity={mockActivity}
        userId="viewer-1"
        participantWaiverAccepted={true}
        onJoin={vi.fn(joinOk)}
        onLeave={vi.fn().mockResolvedValue(true)}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /join/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /manage/i }),
    ).not.toBeInTheDocument();

    rerender(
      <MapPreviewCard
        activity={{
          ...mockActivity,
          participants: [viewerParticipant],
        }}
        userId="viewer-1"
        participantWaiverAccepted={true}
        onJoin={vi.fn(joinOk)}
        onLeave={vi.fn().mockResolvedValue(true)}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /going/i })).toBeInTheDocument();
  });

  it("button order is: primary action, View details, Share to Story", () => {
    renderCard();

    const primaryAction = screen.getByRole("button", { name: /join/i });
    const viewDetails = screen.getByRole("link", { name: /view details/i });
    const shareToStory = screen.getByRole("button", {
      name: /share to story/i,
    });

    expect(primaryAction).toHaveClass("btn-tier-1");
    expect(viewDetails).toHaveClass("btn-tier-2");
    expect(shareToStory).toHaveClass("btn-tier-2");
    expectBefore(primaryAction, viewDetails);
    expectBefore(viewDetails, shareToStory);
  });

  it("shows Full (button + spots line) from the live count at capacity", () => {
    renderCard({
      activity: {
        ...mockActivity,
        max_participants: 2,
        participants: [participant("other-1"), participant("other-2")],
      },
    });

    expect(screen.getByRole("button", { name: /^full$/i })).toBeInTheDocument();
    // Both the spots line and the button read "Full".
    expect(screen.getAllByText("Full").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.queryByRole("button", { name: /join activity/i }),
    ).not.toBeInTheDocument();
  });

  it("flips to Full immediately when a join is rejected for capacity", async () => {
    const onJoin = vi.fn(() => Promise.resolve({ ok: false, full: true }));
    renderCard({
      activity: { ...mockActivity, max_participants: 10, participants: [] },
      onJoin,
    });

    fireEvent.click(screen.getByRole("button", { name: /join activity/i }));
    confirmJoinInModal();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^full$/i })).toBeInTheDocument(),
    );
    // Both the spots line and the button read "Full".
    expect(screen.getAllByText("Full").length).toBeGreaterThanOrEqual(2);
    // The modal closes on Full, and the popup no longer offers Join.
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /join activity/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("does not join on tap: it opens the returning join modal when the waiver is accepted", () => {
    const onJoin = vi.fn(joinOk);
    renderCard({ onJoin });

    fireEvent.click(screen.getByRole("button", { name: /join activity/i }));

    expect(
      screen.getByRole("heading", { name: `Join ${mockActivity.title}?` }),
    ).toBeInTheDocument();
    expect(onJoin).not.toHaveBeenCalled();
  });

  it("opens the first-time waiver modal when the waiver is not accepted", () => {
    const onJoin = vi.fn(joinOk);
    render(
      <MapPreviewCard
        activity={mockActivity}
        userId="viewer-1"
        participantWaiverAccepted={false}
        onJoin={onJoin}
        onLeave={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /join activity/i }));

    expect(screen.getByText("Before you join")).toBeInTheDocument();
    expect(onJoin).not.toHaveBeenCalled();
  });

  it("refreshes the server snapshot when a join is rejected for capacity", async () => {
    const onJoin = vi.fn(() => Promise.resolve({ ok: false, full: true }));
    renderCard({
      activity: { ...mockActivity, max_participants: 10, participants: [] },
      onJoin,
    });

    fireEvent.click(screen.getByRole("button", { name: /join activity/i }));
    confirmJoinInModal();

    // The re-seed is what heals the feed card behind the popup, where the loser
    // tapped Join.
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("clears the Full override once the live count catches up, so a held-open popup reopens on a leave", async () => {
    const onJoin = vi.fn(() => Promise.resolve({ ok: false, full: true }));
    const full1 = { ...mockActivity, max_participants: 2 };
    const rest = {
      userId: "viewer-1" as const,
      onJoin,
      onLeave: vi.fn().mockResolvedValue(true),
      onDismiss: vi.fn(),
    };
    const { rerender } = renderCard({
      activity: { ...full1, participants: [participant("other-a")] },
      onJoin,
    });

    // One spot left → Join is available.
    expect(
      screen.getByRole("button", { name: /join activity/i }),
    ).toBeInTheDocument();

    // A full-rejected join flips to Full via the override.
    fireEvent.click(screen.getByRole("button", { name: /join activity/i }));
    confirmJoinInModal();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /^full$/i }),
      ).toBeInTheDocument(),
    );

    // Live count reaches max (the re-seed): the override clears, but the real
    // count keeps the popup Full. The popup is never remounted here.
    rerender(
      <MapPreviewCard
        activity={{
          ...full1,
          participants: [participant("other-a"), participant("other-b")],
        }}
        participantWaiverAccepted={true}
        {...rest}
      />,
    );
    expect(screen.getByRole("button", { name: /^full$/i })).toBeInTheDocument();

    // Someone leaves (realtime DELETE lowers the count): with the override gone,
    // the held-open popup reopens the spot instead of staying stuck on Full.
    rerender(
      <MapPreviewCard
        activity={{ ...full1, participants: [participant("other-a")] }}
        participantWaiverAccepted={true}
        {...rest}
      />,
    );
    // The join modal closed on Full and may still be animating out.
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /join activity/i }),
      ).toBeInTheDocument(),
    );
  });

  it("hides Register here and Share to Story for logged-out users", () => {
    renderCard({
      activity: {
        ...mockActivity,
        external_link: "https://example.com/register",
      },
      userId: null,
    });

    expect(screen.getByRole("link", { name: /join activity/i })).toBeInTheDocument();
    expect(screen.getByText("You will log in with Google.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view details/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /share to story/i }),
    ).not.toBeInTheDocument();
  });
});
