import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ActivityForm from "@/components/activities/activity-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/actions/activities", () => ({ cancelActivity: vi.fn() }));
// Mapbox needs browser/webgl APIs that jsdom lacks; stub the search box.
vi.mock("@mapbox/search-js-react", () => ({ SearchBox: () => null }));

const initialData = {
  id: "a1",
  title: "Morning run",
  sport: "running",
  location_name: "Papago Park",
  starts_at: new Date().toISOString(),
};

describe("ActivityForm danger zone", () => {
  it("shows a Cancel activity control on the edit form", () => {
    render(
      <ActivityForm mode="edit" initialData={initialData} onSubmit={vi.fn()} />,
    );
    expect(screen.getByText("Danger zone")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel activity" }),
    ).toBeInTheDocument();
  });

  it("has no danger zone on the new form", () => {
    render(<ActivityForm mode="new" onSubmit={vi.fn()} />);
    expect(screen.queryByText("Danger zone")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel activity" }),
    ).not.toBeInTheDocument();
  });
});
