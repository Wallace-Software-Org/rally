import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MapPreviewCard from "@/components/map/map-preview-card";
import type { ActivityWithParticipants } from "@/types";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
}));

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
  onJoin?: () => Promise<{ ok: boolean; full: boolean }>;
  onLeave?: () => Promise<boolean>;
  onDismiss?: () => void;
} = {}) {
  return render(
    <MapPreviewCard
      activity={activity}
      userId={userId}
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

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^full$/i })).toBeInTheDocument(),
    );
    // Both the spots line and the button read "Full".
    expect(screen.getAllByText("Full").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.queryByRole("button", { name: /join activity/i }),
    ).not.toBeInTheDocument();
  });

  it("refreshes the server snapshot when a join is rejected for capacity", async () => {
    const onJoin = vi.fn(() => Promise.resolve({ ok: false, full: true }));
    renderCard({
      activity: { ...mockActivity, max_participants: 10, participants: [] },
      onJoin,
    });

    fireEvent.click(screen.getByRole("button", { name: /join activity/i }));

    // The re-seed is what heals the feed card behind the popup, where the loser
    // tapped Join.
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("hides Register here and Share to Story for logged-out users", () => {
    renderCard({
      activity: {
        ...mockActivity,
        external_link: "https://example.com/register",
      },
      userId: null,
    });

    expect(screen.getByRole("link", { name: /sign in to join/i })).toBeInTheDocument();
    expect(screen.getByText("Sign in with Google to join.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view details/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /share to story/i }),
    ).not.toBeInTheDocument();
  });
});
