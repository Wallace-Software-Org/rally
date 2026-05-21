import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ActivityDetailView from "@/components/activities/activity-detail";
import type { ActivityDetail } from "@/types";

// ── Mock server actions ───────────────────────────────────────────────────────
vi.mock("@/lib/actions/activities", () => ({
  joinActivity: vi.fn().mockResolvedValue({ error: null }),
  leaveActivity: vi.fn().mockResolvedValue({ error: null }),
  cancelActivity: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

import {
  joinActivity,
  leaveActivity,
  cancelActivity,
} from "@/lib/actions/activities";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockActivity: ActivityDetail = {
  id: "act-1",
  title: "Morning doubles at Chaparral",
  sport: "pickleball",
  description: "Casual doubles, all levels welcome.",
  location_name: "Chaparral Park",
  starts_at: new Date(Date.now() + 3_600_000).toISOString(),
  max_participants: 4,
  skill_level: "all",
  lat: 33.5722,
  lng: -111.926,
  status: "open",
  creator_id: "host-1",
  participants: [
    {
      id: "p-1",
      user_id: "host-1",
      profiles: {
        full_name: "Jake Kline",
        avatar_url: null,
        instagram_handle: "jakekline",
      },
    },
  ],
  host: {
    id: "host-1",
    full_name: "Jake Kline",
    avatar_url: null,
    instagram_handle: "jakekline",
  },
  hosted_count: 5,
};

const userProfile = { full_name: "Wallace Palmer", avatar_url: null, city: "Scottsdale" };

// Helper: renders as a non-host viewer who has not joined
function renderAsViewer(overrides: Partial<ActivityDetail> = {}) {
  return render(
    <ActivityDetailView
      activity={{ ...mockActivity, ...overrides }}
      userId="viewer-99"
      userProfile={userProfile}
    />,
  );
}

// Helper: renders as the activity host
function renderAsHost(overrides: Partial<ActivityDetail> = {}) {
  return render(
    <ActivityDetailView
      activity={{ ...mockActivity, ...overrides }}
      userId="host-1"
      userProfile={userProfile}
    />,
  );
}

// Helper: renders as a non-host viewer who has already joined
function renderAsJoinedViewer() {
  return render(
    <ActivityDetailView
      activity={{
        ...mockActivity,
        participants: [
          ...mockActivity.participants,
          {
            id: "p-2",
            user_id: "viewer-99",
            profiles: { full_name: "Wallace Palmer", avatar_url: null, instagram_handle: "wallacepalmer" },
          },
        ],
      }}
      userId="viewer-99"
      userProfile={userProfile}
    />,
  );
}

// Helper: renders unauthenticated
function renderUnauthenticated() {
  return render(
    <ActivityDetailView
      activity={mockActivity}
      userId={null}
      userProfile={null}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe("ActivityDetailView — rendering", () => {
  it("renders the activity title", () => {
    renderAsViewer();
    expect(screen.getByRole("heading", { name: /morning doubles at chaparral/i })).toBeInTheDocument();
  });

  it("renders the sport tag", () => {
    renderAsViewer();
    expect(screen.getByText("Pickleball")).toBeInTheDocument();
  });

  it("renders the host name", () => {
    renderAsViewer();
    // Host name appears in both Hosted By and Who's Going (host is also a participant)
    expect(screen.getAllByText("Jake Kline").length).toBeGreaterThan(0);
  });

  it("renders the hosted count badge", () => {
    renderAsViewer();
    expect(screen.getByText("5 activities hosted")).toBeInTheDocument();
  });

  it("renders participant instagram handles", () => {
    renderAsViewer();
    // Handle appears in Hosted By and Who's Going sections
    expect(screen.getAllByText("@jakekline").length).toBeGreaterThan(0);
  });

  it('shows "No one yet — be the first" when participants is empty', () => {
    renderAsViewer({ participants: [] });
    expect(screen.getByText(/no one yet/i)).toBeInTheDocument();
  });

  it("renders the About section when description is present", () => {
    renderAsViewer();
    expect(screen.getByText("Casual doubles, all levels welcome.")).toBeInTheDocument();
  });

  it("does not render the About section when description is null", () => {
    renderAsViewer({ description: null });
    expect(screen.queryByText(/casual doubles/i)).not.toBeInTheDocument();
  });

  it("renders skill level and spots as meta pills", () => {
    renderAsViewer();
    // 4 max - 1 participant = 3 spots left
    expect(screen.getAllByText("3 spots left").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/all levels/i).length).toBeGreaterThan(0);
  });
});

// ── Unauthenticated ───────────────────────────────────────────────────────────

describe("ActivityDetailView — unauthenticated", () => {
  it('shows "Sign in to join" link instead of a Join button', () => {
    renderUnauthenticated();
    const links = screen.getAllByRole("link", { name: /sign in to join/i });
    expect(links.length).toBeGreaterThan(0);
  });

  it("does not show Join button when userId is null", () => {
    renderUnauthenticated();
    expect(screen.queryByRole("button", { name: /join activity/i })).not.toBeInTheDocument();
  });
});

// ── Join flow ────────────────────────────────────────────────────────────────

describe("ActivityDetailView — join flow", () => {
  it('shows "Join activity" button when viewer has not joined', () => {
    renderAsViewer();
    const joinBtns = screen.getAllByRole("button", { name: /join activity/i });
    expect(joinBtns.length).toBeGreaterThan(0);
  });

  it("calls joinActivity when Join button is clicked", async () => {
    renderAsViewer();
    fireEvent.click(screen.getAllByRole("button", { name: /join activity/i })[0]);
    await waitFor(() => {
      expect(joinActivity).toHaveBeenCalledWith("act-1");
    });
  });
});

// ── Leave flow (cycling pill) ─────────────────────────────────────────────────

describe("ActivityDetailView — leave flow", () => {
  it('shows "✓ You\'re going" pill when the user has joined', () => {
    renderAsJoinedViewer();
    expect(screen.getAllByText(/you're going/i).length).toBeGreaterThan(0);
  });

  it('first tap on pill transitions to "Leave activity?" confirm state', () => {
    renderAsJoinedViewer();
    // desktop cycling button (md/lg or xl) is the first interactive pill in DOM order
    fireEvent.click(screen.getAllByRole("button", { name: /you're going/i })[0]);
    expect(screen.getAllByRole("button", { name: /leave activity\?/i }).length).toBeGreaterThan(0);
  });

  it("second tap on confirm calls leaveActivity", async () => {
    renderAsJoinedViewer();
    fireEvent.click(screen.getAllByRole("button", { name: /you're going/i })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /leave activity\?/i })[0]);
    await waitFor(() => {
      expect(leaveActivity).toHaveBeenCalledWith("act-1");
    });
  });
});

// ── Host actions ─────────────────────────────────────────────────────────────

describe("ActivityDetailView — host actions", () => {
  it("shows Edit and Cancel buttons when the current user is the host", () => {
    renderAsHost();
    expect(screen.getAllByRole("link", { name: /edit activity/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /cancel activity/i }).length).toBeGreaterThan(0);
  });

  it("hides Edit and Cancel buttons for non-host viewers", () => {
    renderAsViewer();
    expect(screen.queryByRole("link", { name: /edit activity/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel activity/i })).not.toBeInTheDocument();
  });

  it('first click on Cancel shows "Confirm cancel?" state', () => {
    renderAsHost();
    fireEvent.click(screen.getAllByRole("button", { name: /cancel activity/i })[0]);
    expect(screen.getAllByRole("button", { name: /confirm cancel/i }).length).toBeGreaterThan(0);
  });

  it("second click on Cancel calls cancelActivity", async () => {
    renderAsHost();
    const cancelBtn = screen.getAllByRole("button", { name: /cancel activity/i })[0];
    fireEvent.click(cancelBtn);
    const confirmBtn = screen.getAllByRole("button", { name: /confirm cancel/i })[0];
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(cancelActivity).toHaveBeenCalledWith("act-1");
    });
  });

  it("Edit activity link points to the edit page", () => {
    renderAsHost();
    const editLink = screen.getAllByRole("link", { name: /edit activity/i })[0];
    expect(editLink).toHaveAttribute("href", "/activity/act-1/edit");
  });
});
