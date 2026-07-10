import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AttendingManager from "@/components/profile/attending-manager";
import type { AttendedActivity } from "@/types";
import { leaveActivity } from "@/lib/actions/activities";

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/actions/activities", () => ({
  leaveActivity: vi.fn().mockResolvedValue({ error: null }),
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

const FUTURE = new Date(Date.now() + 3 * 24 * 3_600_000).toISOString();

function attended(over: Partial<AttendedActivity>): AttendedActivity {
  return {
    id: "a1",
    title: "Morning run",
    sport: "running",
    description: "Canal loop, easy pace",
    location_name: "Papago Park",
    skill_level: "Beginner",
    starts_at: FUTURE,
    max_participants: 6,
    visibility: "public",
    status: "open",
    participants: [
      { id: "p1", user_id: "host-9", profiles: null },
      { id: "p2", user_id: "me", profiles: null },
    ],
    host: { full_name: "Casey Host", avatar_url: null, username: "casey" },
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AttendingManager card", () => {
  it("renders the host line linking to the host profile", () => {
    render(<AttendingManager activities={[attended({})]} isOwner />);
    const hostLink = screen.getByRole("link", { name: /Hosted by Casey Host/ });
    expect(hostLink).toHaveAttribute("href", "/profile/casey");
  });

  it("shows the capacity count and no management actions", () => {
    render(<AttendingManager activities={[attended({})]} isOwner />);
    expect(screen.getByText("2 of 6 · 4 spots left")).toBeInTheDocument();
    for (const name of ["Edit", "Copy link", "Group chat", "Share to Story", "Repeat"]) {
      expect(
        screen.queryByRole("button", { name }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name })).not.toBeInTheDocument();
    }
  });

  it("leaves via a confirm step that calls the leave action", async () => {
    render(<AttendingManager activities={[attended({})]} isOwner />);
    fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, leave" }));
    await waitFor(() =>
      expect(leaveActivity).toHaveBeenCalledWith("a1"),
    );
  });

  it("hides Leave for non-owners", () => {
    render(<AttendingManager activities={[attended({})]} isOwner={false} />);
    expect(
      screen.queryByRole("button", { name: "Leave" }),
    ).not.toBeInTheDocument();
  });

  it("shows a cancelled attended activity with no Leave action", () => {
    render(
      <AttendingManager
        activities={[attended({ status: "cancelled" })]}
        isOwner
      />,
    );
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Leave" }),
    ).not.toBeInTheDocument();
    // Host line still shown on the cancelled card.
    expect(screen.getByText(/Hosted by Casey Host/)).toBeInTheDocument();
  });

  it("shows the empty state for the owner with no attended activities", () => {
    render(<AttendingManager activities={[]} isOwner />);
    expect(
      screen.getByText(/You aren't attending anything yet/i),
    ).toBeInTheDocument();
  });
});
