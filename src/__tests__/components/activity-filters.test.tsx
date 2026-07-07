import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActivitiesPicker } from "@/components/activities/activity-filters";
import { SPORTS_LIST } from "@/lib/utils/sport-config";

const SPORTS = SPORTS_LIST.filter((s) => s !== "All");

describe("ActivitiesPicker", () => {
  it("shows the base label when nothing is selected", () => {
    render(<ActivitiesPicker selected={[]} onChange={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /^Activities$/ }),
    ).toBeInTheDocument();
  });

  it("shows a count in the label when activities are selected", () => {
    render(<ActivitiesPicker selected={["Running", "Tennis"]} onChange={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /Activities \(2\)/ }),
    ).toBeInTheDocument();
  });

  it("lists every activity when opened", () => {
    render(<ActivitiesPicker selected={[]} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Activities/ }));
    // The panel should mirror the centralized sport config (minus "All").
    for (const sport of SPORTS) {
      expect(screen.getByRole("button", { name: sport })).toBeInTheDocument();
    }
  });

  it("toggles a sport on when clicked", () => {
    const onChange = vi.fn();
    render(<ActivitiesPicker selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Activities/ }));
    fireEvent.click(screen.getByRole("button", { name: "Running" }));
    expect(onChange).toHaveBeenCalledWith(["Running"]);
  });

  it("toggles a sport off when it is already selected", () => {
    const onChange = vi.fn();
    render(<ActivitiesPicker selected={["Running"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Activities/ }));
    fireEvent.click(screen.getByRole("button", { name: "Running" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("trigger has the teal active class when a sport is selected", () => {
    render(<ActivitiesPicker selected={["Running"]} onChange={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: /Activities/ });
    expect(trigger.className).toContain("border-brand-teal");
  });

  it("trigger is not active when nothing is selected", () => {
    render(<ActivitiesPicker selected={[]} onChange={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: /^Activities$/ });
    expect(trigger.className).not.toContain("border-brand-teal");
  });

  it("renders Your activities and Other activities sections", () => {
    render(
      <ActivitiesPicker
        selected={[]}
        onChange={vi.fn()}
        userActivities={["Running"]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Activities/ }));
    expect(screen.getByText("Your activities")).toBeInTheDocument();
    expect(screen.getByText("Other activities")).toBeInTheDocument();
    // Every activity still appears exactly once across the two sections.
    for (const sport of SPORTS) {
      expect(screen.getByRole("button", { name: sport })).toBeInTheDocument();
    }
  });

  it("omits the Your activities section when the user has no saved sports", () => {
    render(<ActivitiesPicker selected={[]} onChange={vi.fn()} userActivities={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Activities/ }));
    expect(screen.queryByText("Your activities")).not.toBeInTheDocument();
    expect(screen.getByText("Other activities")).toBeInTheDocument();
  });
});
