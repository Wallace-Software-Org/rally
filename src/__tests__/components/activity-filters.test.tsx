import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ActivitiesPicker,
  ShowPicker,
  DistancePickerPill,
} from "@/components/activities/activity-filters";
import { SPORTS_LIST } from "@/lib/utils/sport-config";

// next/link needs the app-router context it can't get in a unit test; render a
// plain anchor instead.
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
  it("fixes the panel to the left edge when the pill is left of the midpoint", () => {
    render(<ShowPicker value="all" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^All/ }));
    // jsdom default rect is all zeros, so the panel anchors to the left.
    const panel = screen.getByRole("button", { name: "Hosting" }).parentElement!;
    expect(panel.style.position).toBe("fixed");
    expect(panel.style.left).toBe("0px");
    expect(panel.style.right).toBe("");
  });

  it("anchors the panel to the right when the pill sits past the midpoint", () => {
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
      expect(panel.style.position).toBe("fixed");
      // right = innerWidth - trigger.right = 400 - 380 = 20
      expect(panel.style.right).toBe("20px");
      expect(panel.style.left).toBe("");
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalRect;
      window.innerWidth = originalWidth;
    }
  });
});

describe("DistancePickerPill", () => {
  const base = {
    value: 100 as const,
    onChange: vi.fn(),
    hasCoords: false,
    status: "idle" as const,
    isLoggedIn: false,
    onRequestLocation: vi.fn(),
  };

  it("labels the pill Distance and stays inactive without coords", () => {
    render(<DistancePickerPill {...base} />);
    const trigger = screen.getByRole("button", { name: "Distance" });
    expect(trigger.className).not.toContain("border-brand-teal");
  });

  it("labels the pill with the radius when coords are available", () => {
    render(<DistancePickerPill {...base} hasCoords status="granted" />);
    expect(
      screen.getByRole("button", { name: /100 mi/ }),
    ).toBeInTheDocument();
  });

  it("never requests location on render or on opening the panel", () => {
    const onRequestLocation = vi.fn();
    render(<DistancePickerPill {...base} onRequestLocation={onRequestLocation} />);
    expect(onRequestLocation).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Distance" }));
    expect(onRequestLocation).not.toHaveBeenCalled();
  });

  it("shows the prompt and requests location only on the button press", () => {
    const onRequestLocation = vi.fn();
    render(<DistancePickerPill {...base} onRequestLocation={onRequestLocation} />);
    fireEvent.click(screen.getByRole("button", { name: "Distance" }));
    expect(
      screen.getByText("Distance filtering needs your location."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enable location" }));
    expect(onRequestLocation).toHaveBeenCalledOnce();
  });

  it("shows blocked copy with a profile link when denied and logged in", () => {
    render(<DistancePickerPill {...base} status="denied" isLoggedIn />);
    fireEvent.click(screen.getByRole("button", { name: "Distance" }));
    expect(screen.getByText(/Location is blocked\. Add a city/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "profile" })).toHaveAttribute(
      "href",
      "/profile/edit",
    );
    expect(
      screen.queryByRole("button", { name: "Enable location" }),
    ).not.toBeInTheDocument();
  });

  it("shows browser-settings copy when denied and logged out", () => {
    render(<DistancePickerPill {...base} status="denied" isLoggedIn={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Distance" }));
    expect(
      screen.getByText(
        "Location is blocked. You can allow it in your browser settings.",
      ),
    ).toBeInTheDocument();
  });

  it("shows radius options and toggles them when coords are available", () => {
    const onChange = vi.fn();
    render(
      <DistancePickerPill
        {...base}
        onChange={onChange}
        hasCoords
        status="granted"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /100 mi/ }));
    fireEvent.click(screen.getByRole("button", { name: "10 mi" }));
    expect(onChange).toHaveBeenCalledWith(10);
  });
});
