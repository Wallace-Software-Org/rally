import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActivityCardDesktop } from "@/components/activities/activity-card";
import type { ActivityWithParticipants } from "@/types";

// Representative activity data shared by render and interaction tests.
const mockActivity: ActivityWithParticipants = {
  id: "1",
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

  it("clicking the card title calls onSelect", () => {
    const onSelect = vi.fn();
    render(<ActivityCardDesktop {...base} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Morning Run at Papago Park"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("clicking the Join button does not propagate to onSelect", () => {
    const onSelect = vi.fn();
    render(<ActivityCardDesktop {...base} onSelect={onSelect} />);
    // Joining should not also select the surrounding card.
    fireEvent.click(screen.getByRole("button", { name: "Join" }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
