import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ActivityFilters from "@/components/activities/activity-filters";
import { SPORTS_LIST } from "@/lib/utils/sport-config";

describe("ActivityFilters", () => {
  it("renders a pill for every sport in SPORTS_LIST", () => {
    render(<ActivityFilters sports={[]} onChange={vi.fn()} />);
    // The UI should mirror the centralized sport config (All + each sport).
    for (const sport of SPORTS_LIST) {
      expect(screen.getByRole("button", { name: sport })).toBeInTheDocument();
    }
  });

  it("calls onChange with the toggled sport array when a pill is clicked", () => {
    const onChange = vi.fn();
    render(<ActivityFilters sports={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Running" }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(["Running"]);
  });

  it("calls onChange with empty array when All is clicked", () => {
    const onChange = vi.fn();
    render(<ActivityFilters sports={["Running"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("active sport pill has the teal active class", () => {
    render(<ActivityFilters sports={["Running"]} onChange={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "Running" });
    expect(btn.className).toContain("border-brand-teal");
  });

  it("inactive sport pill does not have the teal active class", () => {
    render(<ActivityFilters sports={[]} onChange={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "Running" });
    expect(btn.className).not.toContain("border-brand-teal");
  });

  it("All pill is active when no sports are selected", () => {
    render(<ActivityFilters sports={[]} onChange={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "All" });
    expect(btn.className).toContain("border-brand-teal");
  });
});
