import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import ActivityForm, {
  type ActivityFormMode,
} from "@/components/activities/activity-form";
import { WAIVERS } from "@/lib/waivers";

const { acceptWaiver } = vi.hoisted(() => ({ acceptWaiver: vi.fn() }));
vi.mock("@/lib/actions/waivers", () => ({ acceptWaiver }));
vi.mock("@/lib/actions/activities", () => ({ cancelActivity: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
// Mapbox needs browser/webgl APIs that jsdom lacks; stub the search box. The
// location comes from initialData instead.
vi.mock("@mapbox/search-js-react", () => ({ SearchBox: () => null }));

// A form that already passes client validation, so Post is enabled.
const validData = {
  id: "a1",
  title: "Morning run",
  sport: "running",
  description: "An easy pace along the canal, all levels welcome.",
  location_name: "Papago Park",
  lat: 33.45,
  lng: -111.95,
  starts_at: new Date(Date.now() + 3 * 24 * 3_600_000).toISOString(),
};

function renderForm({
  mode = "new",
  hostWaiverAccepted,
  onSubmit = vi.fn(() => Promise.resolve({ error: null })),
}: {
  mode?: ActivityFormMode;
  hostWaiverAccepted?: boolean;
  onSubmit?: (...args: never[]) => Promise<unknown>;
}) {
  render(
    <ActivityForm
      mode={mode}
      initialData={validData}
      hostWaiverAccepted={hostWaiverAccepted}
      onSubmit={onSubmit as never}
    />,
  );
  return { onSubmit };
}

const submitLabel = (mode: ActivityFormMode) =>
  mode === "edit" ? "Save changes" : "Post activity";
const submit = (mode: ActivityFormMode = "new") =>
  fireEvent.click(screen.getByRole("button", { name: submitLabel(mode) }));
const hostDialog = () => screen.getByRole("dialog", { name: "Before you post" });

beforeEach(() => {
  vi.clearAllMocks();
  acceptWaiver.mockResolvedValue({ error: null });
});

describe("ActivityForm host waiver", () => {
  it("opens the host modal instead of submitting when the waiver is not accepted", () => {
    const { onSubmit } = renderForm({ hostWaiverAccepted: false });
    submit();

    expect(hostDialog()).toBeInTheDocument();
    expect(screen.getByText("Before you post")).toBeInTheDocument();
    expect(
      screen.getByText("One time only. You will not see this again."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("applies to the duplicate flow, which posts through the same form", () => {
    const { onSubmit } = renderForm({ mode: "duplicate", hostWaiverAccepted: false });

    // Duplicate starts with the date cleared: pick one (15th of next month).
    fireEvent.click(screen.getByText("Select a date"));
    const monthLabel = screen.getByText(/^[A-Z][a-z]+ \d{4}$/);
    fireEvent.click(monthLabel.nextElementSibling as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "15" }));

    submit("duplicate");

    expect(hostDialog()).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the full host waiver, unchecked box, and empty initials", () => {
    renderForm({ hostWaiverAccepted: false });
    submit();

    const dialog = within(hostDialog());
    const box = dialog.getByRole("region", { name: WAIVERS.host.title });
    expect(box.className).toContain("overflow-y-auto");
    for (const clause of WAIVERS.host.text.split("\n\n")) {
      expect(within(box).getByText(clause)).toBeInTheDocument();
    }
    expect(dialog.getByText(WAIVERS.host.checkboxLabel)).toBeInTheDocument();
    expect(dialog.getByRole("checkbox")).not.toBeChecked();
    expect(dialog.getByLabelText(/sign with initials/i)).toHaveValue("");
  });

  it("keeps Post activity disabled until both the box and initials are filled", () => {
    renderForm({ hostWaiverAccepted: false });
    submit();

    const dialog = within(hostDialog());
    const post = () => dialog.getByRole("button", { name: "Post activity" });
    expect(post()).toBeDisabled();

    fireEvent.click(dialog.getByRole("checkbox"));
    expect(post()).toBeDisabled();

    fireEvent.change(dialog.getByLabelText(/sign with initials/i), {
      target: { value: "WP" },
    });
    expect(post()).toBeEnabled();

    fireEvent.click(dialog.getByRole("checkbox"));
    expect(post()).toBeDisabled();
  });

  it("accepts the host waiver, then submits the form as it always does", async () => {
    const order: string[] = [];
    acceptWaiver.mockImplementation(async () => {
      order.push("accept");
      return { error: null };
    });
    const onSubmit = vi.fn(async () => {
      order.push("submit");
      return { error: null };
    });
    renderForm({ hostWaiverAccepted: false, onSubmit });
    submit();

    const dialog = within(hostDialog());
    fireEvent.click(dialog.getByRole("checkbox"));
    fireEvent.change(dialog.getByLabelText(/sign with initials/i), {
      target: { value: "WP" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Post activity" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(acceptWaiver).toHaveBeenCalledWith("host", "WP");
    expect(order).toEqual(["accept", "submit"]);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Morning run", sport: "running" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("does not submit when recording the waiver fails", async () => {
    acceptWaiver.mockResolvedValue({ error: "Could not record your agreement." });
    const { onSubmit } = renderForm({ hostWaiverAccepted: false });
    submit();

    const dialog = within(hostDialog());
    fireEvent.click(dialog.getByRole("checkbox"));
    fireEvent.change(dialog.getByLabelText(/sign with initials/i), {
      target: { value: "WP" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Post activity" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent(
      "Could not record your agreement.",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Cancel closes the modal without accepting or submitting", async () => {
    const { onSubmit } = renderForm({ hostWaiverAccepted: false });
    submit();

    fireEvent.click(within(hostDialog()).getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(acceptWaiver).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits straight away, with no modal, when the waiver is already accepted", async () => {
    const { onSubmit } = renderForm({ hostWaiverAccepted: true });
    submit();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(acceptWaiver).not.toHaveBeenCalled();
  });

  it("never opens the modal on edit, even when the waiver is not accepted", async () => {
    const { onSubmit } = renderForm({ mode: "edit", hostWaiverAccepted: false });
    submit("edit");

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the modal when the server answers waiverRequired, and does not show it as an error", async () => {
    // The page said accepted, but the server disagrees (a version bump landed).
    const onSubmit = vi.fn(() =>
      Promise.resolve({ error: "Waiver required", waiverRequired: true }),
    );
    renderForm({ hostWaiverAccepted: true, onSubmit });
    submit();

    expect(await screen.findByRole("dialog", { name: "Before you post" })).toBeInTheDocument();
    expect(screen.queryByText("Waiver required")).not.toBeInTheDocument();
  });
});
