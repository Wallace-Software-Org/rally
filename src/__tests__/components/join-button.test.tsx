import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import JoinButton from "@/components/activities/join-button";

// Defaults describe a joinable activity before the user has joined.
const base = {
  isJoined: false,
  isJoining: false,
  isLeaving: false,
  spotsLeft: 3,
  onJoin: vi.fn(),
  onLeave: vi.fn(),
};

describe("JoinButton", () => {
  it('renders "Join" when not joined and spots are available', () => {
    render(<JoinButton {...base} />);
    expect(screen.getByRole("button", { name: "Join" })).toBeInTheDocument();
  });

  it('renders "Joined ✓" when already joined', () => {
    render(<JoinButton {...base} isJoined={true} />);
    expect(
      screen.getByRole("button", { name: "Joined ✓" }),
    ).toBeInTheDocument();
  });

  it('clicking "Joined ✓" shows the "Leave" confirm button', () => {
    render(<JoinButton {...base} isJoined={true} />);
    fireEvent.click(screen.getByRole("button", { name: "Joined ✓" }));
    expect(screen.getByRole("button", { name: "Leave" })).toBeInTheDocument();
  });

  it("renders nothing when spotsLeft is 0 and not joined", () => {
    const { container } = render(<JoinButton {...base} spotsLeft={0} />);
    // Full activities should not show an unavailable action.
    expect(container).toBeEmptyDOMElement();
  });
});
