import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import ActivityDetailView from "@/components/activities/activity-detail";
import type { ActivityDetail } from "@/types";

// ── Mock server actions ───────────────────────────────────────────────────────
vi.mock("@/lib/actions/activities", () => ({
  joinActivity: vi.fn().mockResolvedValue({ error: null }),
  leaveActivity: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

import {
  joinActivity,
  leaveActivity,
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
  visibility: "public",
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
        username: "jakekline",
      },
    },
  ],
  host: {
    id: "host-1",
    full_name: "Jake Kline",
    avatar_url: null,
    instagram_handle: "jakekline",
    username: "jakekline",
  },
  hosted_count: 5,
};

// Helper: renders as a non-host viewer who has not joined
function renderAsViewer(overrides: Partial<ActivityDetail> = {}) {
  return render(
    <ActivityDetailView
      activity={{ ...mockActivity, ...overrides }}
      userId="viewer-99"
    />,
  );
}

// Helper: renders as the activity host
function renderAsHost(overrides: Partial<ActivityDetail> = {}) {
  return render(
    <ActivityDetailView
      activity={{ ...mockActivity, ...overrides }}
      userId="host-1"
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
            profiles: {
              full_name: "Wallace Palmer",
              avatar_url: null,
              instagram_handle: "wallacepalmer",
              username: "wallacepalmer",
            },
          },
        ],
      }}
      userId="viewer-99"
    />,
  );
}

// Helper: renders unauthenticated
function renderUnauthenticated(overrides: Partial<ActivityDetail> = {}) {
  return render(
    <ActivityDetailView
      activity={{ ...mockActivity, ...overrides }}
      userId={null}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockShareBrowserApis() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    blob: vi.fn().mockResolvedValue(new Blob(["card"], { type: "image/png" })),
  });
  const writeText = vi.fn().mockResolvedValue(undefined);
  const createObjectURL = vi.fn(() => "blob:rally-card");
  const revokeObjectURL = vi.fn();

  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectURL,
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  return { fetchMock, writeText, createObjectURL, revokeObjectURL };
}

// The section wrapping the Who's going label, its header row, and the avatars.
function whosGoingSection(): HTMLElement {
  return screen.getByText("Who's going").parentElement!.parentElement!;
}

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

  it("shows the host in Who's going when participants are empty", () => {
    renderAsViewer({ participants: [] });

    const section = whosGoingSection();
    expect(within(section).getAllByText("Jake").length).toBeGreaterThan(0);
    expect(screen.queryByText(/no one yet/i)).not.toBeInTheDocument();
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

  it("hides Register here and Share to Story when userId is null", () => {
    renderUnauthenticated({ external_link: "https://example.com/register" });

    expect(
      screen.getAllByRole("link", { name: /sign in to join/i }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Sign in with Google to join.").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("link", { name: /register here/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /share to story/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps host avatar sharp and blurs participant avatars when userId is null", () => {
    renderUnauthenticated({
      host: {
        ...mockActivity.host,
        full_name: "Wallace Palmer",
        avatar_url: null,
      },
      participants: [
        {
          id: "p-2",
          user_id: "participant-1",
          profiles: {
            full_name: "Pat Avery",
            avatar_url: null,
            instagram_handle: "patavery",
            username: "patavery",
          },
        },
        {
          id: "p-1",
          user_id: "host-1",
          profiles: {
            full_name: "Wrong Host",
            avatar_url: null,
            instagram_handle: "wronghost",
            username: "wronghost",
          },
        },
      ],
    });

    const section = whosGoingSection();
    const hostInitials = within(section).getAllByText("WP");
    const participantInitials = within(section).getAllByText("PA");

    expect(within(section).queryByText("WH")).not.toBeInTheDocument();
    expect(
      hostInitials[0].compareDocumentPosition(participantInitials[0]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      hostInitials.every((el) => !el.classList.contains("blur-sm")),
    ).toBe(true);
    expect(
      participantInitials.every((el) => el.classList.contains("blur-sm")),
    ).toBe(true);
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

// ── Share flow + CTA tiers ───────────────────────────────────────────────────

describe("ActivityDetailView — share flow and CTA tiers", () => {
  it("Edit is a teal text action, not the primary action", () => {
    renderAsHost();
    const editLinks = screen.getAllByRole("link", { name: /edit/i });

    expect(editLinks.length).toBeGreaterThan(0);
    editLinks.forEach((link) => {
      expect(link).toHaveClass("link-action");
      expect(link.className).not.toContain("btn-tier");
    });
  });

  it("Get directions and Group chat share the link-action treatment", () => {
    renderAsHost(withRoster("jakekline", ["joinerig"]));

    for (const button of screen.getAllByRole("button", {
      name: /get directions/i,
    })) {
      expect(button).toHaveClass("link-action");
    }
    for (const button of groupChatButton()) {
      expect(button).toHaveClass("link-action");
      expect(button.className).not.toContain("btn-tier");
    }
  });

  it("host rail leads with Share to Story at tier-1 and Copy invite link at tier-2", () => {
    renderAsHost();

    const shareButtons = screen.getAllByRole("button", {
      name: /share to story/i,
    });
    expect(shareButtons.length).toBeGreaterThan(0);
    shareButtons.forEach((button) => {
      expect(button).toHaveClass("btn-tier-1");
    });

    const copyButtons = screen.getAllByRole("button", {
      name: /copy invite link/i,
    });
    expect(copyButtons.length).toBeGreaterThan(0);
    copyButtons.forEach((button) => {
      expect(button).toHaveClass("btn-tier-2");
    });
  });

  it("Share to Story and Register here use btn-tier-2 in both placements", () => {
    renderAsViewer({ external_link: "https://example.com/register" });

    const shareButtons = screen.getAllByRole("button", {
      name: /share to story/i,
    });
    const registerLinks = screen.getAllByRole("link", {
      name: /register here/i,
    });

    // Both the mobile placement (below Who's going) and the desktop right
    // panel use btn-tier-2. Both render in jsdom since media queries don't apply.
    expect(shareButtons.length).toBeGreaterThan(0);
    expect(registerLinks.length).toBeGreaterThan(0);
    shareButtons.forEach((button) => {
      expect(button).toHaveClass("btn-tier-2");
    });
    registerLinks.forEach((link) => {
      expect(link).toHaveClass("btn-tier-2");
    });
  });

  it("Share to Story button triggers share flow on click", async () => {
    const { fetchMock, writeText, createObjectURL, revokeObjectURL } =
      mockShareBrowserApis();

    renderAsViewer();
    fireEvent.click(
      screen.getAllByRole("button", { name: /share to story/i })[0],
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/activity/act-1/card");
      expect(createObjectURL).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:rally-card");
      expect(writeText).toHaveBeenCalledWith(window.location.href);
    });
    expect(
      await screen.findByText("Image saved to your photos"),
    ).toBeInTheDocument();
  });
});

// ── Leave flow (cycling pill) ─────────────────────────────────────────────────

describe("ActivityDetailView — leave flow", () => {
  it('shows "Going ✓" pill when the user has joined', () => {
    renderAsJoinedViewer();
    expect(screen.getAllByText("Going ✓").length).toBeGreaterThan(0);
  });

  it('first tap on pill transitions to "Leave activity?" confirm state', () => {
    renderAsJoinedViewer();
    // desktop cycling button (md/lg or xl) is the first interactive pill in DOM order
    fireEvent.click(screen.getAllByRole("button", { name: "Going ✓" })[0]);
    expect(screen.getAllByRole("button", { name: /leave activity\?/i }).length).toBeGreaterThan(0);
  });

  it("second tap on confirm calls leaveActivity", async () => {
    renderAsJoinedViewer();
    fireEvent.click(screen.getAllByRole("button", { name: "Going ✓" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /leave activity\?/i })[0]);
    await waitFor(() => {
      expect(leaveActivity).toHaveBeenCalledWith("act-1");
    });
  });
});

// ── Host actions ─────────────────────────────────────────────────────────────

describe("ActivityDetailView — host actions", () => {
  it("shows Edit link when the current user is the host", () => {
    renderAsHost();
    expect(screen.getAllByRole("link", { name: /edit/i }).length).toBeGreaterThan(0);
  });

  it("hides Edit link for non-host viewers", () => {
    renderAsViewer();
    expect(screen.queryByRole("link", { name: /edit/i })).not.toBeInTheDocument();
  });

  it("Edit link points to the edit page", () => {
    renderAsHost();
    const editLink = screen.getAllByRole("link", { name: /edit/i })[0];
    expect(editLink).toHaveAttribute("href", "/activity/act-1/edit");
  });

  it("shows Private pill when visibility is private", () => {
    renderAsViewer({ visibility: "private" });
    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("shows Copy invite link button for host on private activity", () => {
    renderAsHost({ visibility: "private" });
    // Renders in both the mobile and desktop host action stacks.
    expect(
      screen.getAllByRole("button", { name: /copy invite link/i }).length,
    ).toBeGreaterThan(0);
  });

  it("does not show Copy invite link button for non-host on private activity", () => {
    renderAsViewer({ visibility: "private" });
    expect(screen.queryByRole("button", { name: /copy invite link/i })).not.toBeInTheDocument();
  });

  it("shows Copy invite link button for host on public activity", () => {
    renderAsHost({ visibility: "public" });
    // Copy invite link is now host-only on all activities, not private-only.
    expect(
      screen.getAllByRole("button", { name: /copy invite link/i }).length,
    ).toBeGreaterThan(0);
  });
});

// ── Group chat ───────────────────────────────────────────────────────────────

// Host plus joiners, where `handles` gives each joiner's instagram_handle.
function withRoster(
  hostHandle: string | null,
  handles: (string | null)[],
): Partial<ActivityDetail> {
  return {
    host: { ...mockActivity.host, instagram_handle: hostHandle },
    participants: [
      {
        id: "p-1",
        user_id: "host-1",
        profiles: {
          full_name: "Jake Kline",
          avatar_url: null,
          instagram_handle: hostHandle,
          username: "jakekline",
        },
      },
      ...handles.map((handle, i) => ({
        id: `p-${i + 2}`,
        user_id: `joiner-${i + 1}`,
        profiles: {
          full_name: `Joiner ${i + 1}`,
          avatar_url: null,
          instagram_handle: handle,
          username: `joiner${i + 1}`,
        },
      })),
    ],
  };
}

const groupChatButton = () =>
  screen.queryAllByRole("button", { name: /^group chat$/i });

describe("ActivityDetailView — group chat", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("hides the button when no joiner has Instagram", () => {
    // Host has a handle, but there is no one else to invite.
    renderAsHost(withRoster("jakekline", [null]));
    expect(groupChatButton().length).toBe(0);
  });

  it("hides the button when the host is the only person going", () => {
    renderAsHost(withRoster("jakekline", []));
    expect(groupChatButton().length).toBe(0);
  });

  it("shows the button once a joiner has Instagram", () => {
    renderAsHost(withRoster("jakekline", ["joinerig"]));
    expect(groupChatButton().length).toBeGreaterThan(0);
  });

  it("hides the button from non-host viewers", () => {
    renderAsViewer(withRoster("jakekline", ["joinerig"]));
    expect(groupChatButton().length).toBe(0);
  });

  it("counts the host in the total, even with no handle of their own", () => {
    renderAsHost(withRoster(null, ["one", "two", null]));
    fireEvent.click(groupChatButton()[0]);
    expect(screen.getByText("2 of 4 going have Instagram")).toBeInTheDocument();
  });

  it("counts and copies the host's own handle when they have one", async () => {
    renderAsHost(withRoster("jakekline", ["one", null]));
    fireEvent.click(groupChatButton()[0]);
    expect(screen.getByText("2 of 3 going have Instagram")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /copy all handles/i }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "@jakekline, @one",
      );
    });
  });

  it("omits a handle-less host from the copied list", async () => {
    renderAsHost(withRoster(null, ["one", "two"]));
    fireEvent.click(groupChatButton()[0]);

    fireEvent.click(screen.getByRole("button", { name: /copy all handles/i }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("@one, @two");
    });
  });
});
