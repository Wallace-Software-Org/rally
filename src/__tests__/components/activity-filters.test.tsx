import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ActivityFilters from "@/components/activities/activity-filters";
import { SPORTS_LIST } from "@/lib/utils/sport-config";

describe("ActivityFilters", () => {
  it("renders a pill for every sport in SPORTS_LIST", () => {
    render(<ActivityFilters sport="All" onChange={vi.fn()} />);
    // The UI should mirror the centralized sport config.
    for (const sport of SPORTS_LIST) {
      expect(screen.getByRole("button", { name: sport })).toBeInTheDocument();
    }
  });

  it("calls onChange with the correct sport string when a pill is clicked", () => {
    const onChange = vi.fn();
    render(<ActivityFilters sport="All" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Running" }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("Running");
  });

  it("active pill has the teal active class", () => {
    render(<ActivityFilters sport="Running" onChange={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "Running" });
    expect(btn.className).toContain("border-[#1D9E75]");
  });

  it("inactive pill does not have the teal active class", () => {
    render(<ActivityFilters sport="All" onChange={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "Running" });
    expect(btn.className).not.toContain("border-[#1D9E75]");
  });
});
