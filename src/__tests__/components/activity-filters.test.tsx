import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ActivitiesPicker,
  ShowPicker,
} from "@/components/activities/activity-filters";
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

describe("ShowPicker", () => {
  it("defaults its trigger label to the selected value", () => {
    render(<ShowPicker value="all" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^All/ })).toBeInTheDocument();
  });

  it("reflects the selection in the trigger label", () => {
    render(<ShowPicker value="hosting" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^Hosting/ })).toBeInTheDocument();
  });

  it("offers All, Hosting, and Attending when opened", () => {
    render(<ShowPicker value="all" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^All/ }));
    for (const opt of ["Hosting", "Attending"]) {
      expect(screen.getByRole("button", { name: opt })).toBeInTheDocument();
    }
    // "All" appears twice when selected: the trigger and the option row.
    expect(screen.getAllByRole("button", { name: "All" })).toHaveLength(2);
  });

  it("single-selects: calls onChange with the chosen value", () => {
    const onChange = vi.fn();
    render(<ShowPicker value="all" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /^All/ }));
    fireEvent.click(screen.getByRole("button", { name: "Attending" }));
    expect(onChange).toHaveBeenCalledWith("attending");
  });

  it("trigger is not active when All is selected", () => {
    render(<ShowPicker value="all" onChange={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: /^All/ });
    expect(trigger.className).not.toContain("border-brand-teal");
  });
});

describe("FilterPanel edge awareness", () => {
  it("anchors the panel left when the pill is left of the viewport midpoint", () => {
    render(<ShowPicker value="all" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^All/ }));
    // jsdom default rect left is 0, so the panel keeps its left anchor.
    const panel = screen.getByRole("button", { name: "Hosting" }).parentElement!;
    expect(panel.className).toContain("left-0");
    expect(panel.className).not.toContain("right-0");
  });

  it("flips the panel to right-0 when the pill sits past the viewport midpoint", () => {
    const originalRect = HTMLElement.prototype.getBoundingClientRect;
    const originalWidth = window.innerWidth;
    window.innerWidth = 400;
    HTMLElement.prototype.getBoundingClientRect = vi.fn(
      () =>
        ({
          left: 320,
          right: 380,
          top: 0,
          bottom: 20,
          width: 60,
          height: 20,
          x: 320,
          y: 0,
          toJSON: () => {},
        }) as DOMRect,
    );
    try {
      render(<ShowPicker value="all" onChange={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: /^All/ }));
      const panel = screen.getByRole("button", {
        name: "Hosting",
      }).parentElement!;
      expect(panel.className).toContain("right-0");
      expect(panel.className).not.toContain("left-0");
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalRect;
      window.innerWidth = originalWidth;
    }
  });
});
