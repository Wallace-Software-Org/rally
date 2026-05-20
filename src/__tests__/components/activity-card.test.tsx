import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActivityCardDesktop } from "@/components/activities/activity-card";
import type { ActivityWithParticipants } from "@/types";

// Representative activity data shared by render and interaction tests.
const mockActivity: ActivityWithParticipants = {
  id: "act-1",
  title: "Morning Run at Papago Park",
  sport: "running",
  location_name: "Papago Park",
  starts_at: new Date(Date.now() + 3_600_000).toISOString(),
  max_participants: 10,
  skill_level: "beginner",
  lat: 33.4584,
  lng: -111.9503,
  participants: [],
};

// Stable defaults keep each test focused on one prop or callback.
const base = {
  activity: mockActivity,
  userId: "user-123",
  isActive: false,
  isJoined: false,
  isJoining: false,
  isLeaving: false,
  onSelect: vi.fn(),
  onJoin: vi.fn(),
  onLeave: vi.fn(),
};

describe("ActivityCardDesktop", () => {
  it("renders title, sport tag, and location", () => {
    render(<ActivityCardDesktop {...base} />);
    expect(screen.getByText("Morning Run at Papago Park")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Papago Park")).toBeInTheDocument();
  });

  it("has teal ring class when isActive is true", () => {
    const { container } = render(
      <ActivityCardDesktop {...base} isActive={true} />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("ring-[#1D9E75]");
  });

  it("does not have teal ring class when isActive is false", () => {
    const { container } = render(
      <ActivityCardDesktop {...base} isActive={false} />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).not.toContain("ring-[#1D9E75]");
  });

  it("clicking the card container calls onSelect", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <ActivityCardDesktop {...base} onSelect={onSelect} />,
    );
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("clicking the title link does NOT propagate to onSelect", () => {
    // Title is now a Next.js Link with stopPropagation — navigates instead of selecting.
    const onSelect = vi.fn();
    render(<ActivityCardDesktop {...base} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Morning Run at Papago Park"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("title link points to the activity detail page", () => {
    render(<ActivityCardDesktop {...base} />);
    const titleLink = screen.getByText("Morning Run at Papago Park").closest("a");
    expect(titleLink).toHaveAttribute("href", "/activity/act-1");
  });

  it("clicking the Join button does not propagate to onSelect", () => {
    const onSelect = vi.fn();
    render(<ActivityCardDesktop {...base} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Join" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders a "Details" link pointing to the activity detail page', () => {
    render(<ActivityCardDesktop {...base} />);
    const detailsLink = screen.getByRole("link", { name: "Details" });
    expect(detailsLink).toBeInTheDocument();
    expect(detailsLink).toHaveAttribute("href", "/activity/act-1");
  });

  it("clicking Details link does not propagate to onSelect", () => {
    const onSelect = vi.fn();
    render(<ActivityCardDesktop {...base} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("link", { name: "Details" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows "Sign in" link and Details link when userId is null', () => {
    render(<ActivityCardDesktop {...base} userId={null} />);
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Details" })).toBeInTheDocument();
  });

  it('shows spots remaining when max_participants is set', () => {
    render(<ActivityCardDesktop {...base} />);
    // 10 max - 0 participants = 10 spots
    expect(screen.getByText("10 spots")).toBeInTheDocument();
  });

  it('shows "Open" when max_participants is null', () => {
    const activity = { ...mockActivity, max_participants: null };
    render(<ActivityCardDesktop {...base} activity={activity} />);
    expect(screen.getByText("Open")).toBeInTheDocument();
  });
});
