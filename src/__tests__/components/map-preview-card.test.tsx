import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import MapPreviewCard from "@/components/map/map-preview-card";
import type { ActivityWithParticipants } from "@/types";

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
  onJoin = vi.fn().mockResolvedValue(true),
  onLeave = vi.fn().mockResolvedValue(true),
  onDismiss = vi.fn(),
}: {
  activity?: ActivityWithParticipants;
  userId?: string | null;
  onJoin?: () => Promise<boolean>;
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
        onJoin={vi.fn().mockResolvedValue(true)}
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
        onJoin={vi.fn().mockResolvedValue(true)}
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
        onJoin={vi.fn().mockResolvedValue(true)}
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
    expect(shareToStory).toHaveClass("btn-tier-3");
    expectBefore(primaryAction, viewDetails);
    expectBefore(viewDetails, shareToStory);
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
