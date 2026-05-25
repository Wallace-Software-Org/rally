import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActivityCardDesktop } from "@/components/activities/activity-card";
import type { ActivityWithParticipants } from "@/types";

const mockActivity: ActivityWithParticipants = {
  id: "act-1",
  creator_id: "creator-999",
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

const base = {
  activity: mockActivity,
  userId: "user-123",
  isActive: false,
  showDetails: true,
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

  // ── showDetails=true (xl): div wrapper, onSelect, Details pill ────────────

  it("card wrapper is a div[role=button] when showDetails=true", () => {
    const { container } = render(<ActivityCardDesktop {...base} showDetails={true} />);
    const card = container.firstChild as HTMLElement;
    expect(card.tagName).toBe("DIV");
    expect(card).toHaveAttribute("role", "button");
  });

  it("clicking the card calls onSelect when showDetails=true", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <ActivityCardDesktop {...base} showDetails={true} onSelect={onSelect} />,
    );
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("has teal border when isActive=true and showDetails=true", () => {
    const { container } = render(
      <ActivityCardDesktop {...base} showDetails={true} isActive={true} />,
    );
    expect((container.firstChild as HTMLElement).className).toContain("border-brand-teal");
  });

  it("does not have teal border when isActive=false", () => {
    const { container } = render(
      <ActivityCardDesktop {...base} showDetails={true} isActive={false} />,
    );
    expect((container.firstChild as HTMLElement).className).not.toContain("border-brand-teal");
  });

  it("renders Details link when showDetails=true", () => {
    render(<ActivityCardDesktop {...base} showDetails={true} />);
    const link = screen.getByRole("link", { name: "Details" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/activity/act-1");
  });

  it("clicking Details link does not propagate to onSelect", () => {
    const onSelect = vi.fn();
    render(<ActivityCardDesktop {...base} showDetails={true} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("link", { name: "Details" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("clicking Join button does not propagate to onSelect", () => {
    const onSelect = vi.fn();
    render(<ActivityCardDesktop {...base} showDetails={true} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Join" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  // ── showDetails=false (< xl): Link wrapper, no Details pill ──────────────

  it("card wrapper is a div[role=button] when showDetails=false", () => {
    const { container } = render(
      <ActivityCardDesktop {...base} showDetails={false} />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.tagName).toBe("DIV");
    expect(card).toHaveAttribute("role", "button");
  });

  it("does not render Details link when showDetails=false", () => {
    render(<ActivityCardDesktop {...base} showDetails={false} />);
    expect(screen.queryByRole("link", { name: "Details" })).not.toBeInTheDocument();
  });

  // ── Shared ────────────────────────────────────────────────────────────────

  it('shows "Sign in" link when userId is null', () => {
    render(<ActivityCardDesktop {...base} userId={null} />);
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows spots remaining when max_participants is set", () => {
    render(<ActivityCardDesktop {...base} />);
    expect(screen.getByText("10 spots")).toBeInTheDocument();
  });

  it('shows "Open" when max_participants is null', () => {
    render(
      <ActivityCardDesktop {...base} activity={{ ...mockActivity, max_participants: null }} />,
    );
    expect(screen.getByText("Open")).toBeInTheDocument();
  });
});
