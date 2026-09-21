import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import JoinConfirmModal from "@/components/activities/join-confirm-modal";
import { WAIVERS } from "@/lib/waivers";
import { resetParticipantWaiverOverride } from "@/hooks/use-participant-waiver";
import type { JoinResult } from "@/types";

const { acceptWaiver } = vi.hoisted(() => ({ acceptWaiver: vi.fn() }));
vi.mock("@/lib/actions/waivers", () => ({ acceptWaiver }));

const activity = {
  title: "Sunrise hike at Camelback",
  starts_at: new Date(Date.now() + 2 * 24 * 3_600_000).toISOString(),
  location_name: "Camelback Mountain",
};

const joined: JoinResult = { ok: true, full: false };

function renderModal({
  waiverAccepted,
  onJoin = vi.fn(() => Promise.resolve(joined)),
  onClose = vi.fn(),
}: {
  waiverAccepted: boolean;
  onJoin?: () => Promise<JoinResult>;
  onClose?: () => void;
}) {
  render(
    <JoinConfirmModal
      activity={activity}
      waiverAccepted={waiverAccepted}
      onJoin={onJoin}
      onClose={onClose}
    />,
  );
  return { onJoin, onClose };
}

const joinButton = () => screen.getByRole("button", { name: "Join activity" });
const checkbox = () => screen.getByRole("checkbox");
const initialsInput = () => screen.getByLabelText(/sign with initials/i);

beforeEach(() => {
  vi.clearAllMocks();
  resetParticipantWaiverOverride();
  acceptWaiver.mockResolvedValue({ error: null });
});

describe("JoinConfirmModal modal selection", () => {
  it("opens the first-time modal when the waiver is not accepted", () => {
    renderModal({ waiverAccepted: false });

    expect(screen.getByText("Before you join")).toBeInTheDocument();
    expect(
      screen.getByText("One time only. You will not see this again."),
    ).toBeInTheDocument();
    expect(checkbox()).toBeInTheDocument();
    expect(initialsInput()).toBeInTheDocument();
    expect(
      screen.queryByText(`Join ${activity.title}?`),
    ).not.toBeInTheDocument();
  });

  it("opens the short confirmation when the waiver is accepted", () => {
    renderModal({ waiverAccepted: true });

    expect(
      screen.getByRole("heading", { name: `Join ${activity.title}?` }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Before you join")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/sign with initials/i)).not.toBeInTheDocument();
  });
});

describe("first-time modal", () => {
  it("shows the full participant waiver in a scrollable box", () => {
    renderModal({ waiverAccepted: false });

    const box = screen.getByRole("region", { name: WAIVERS.participant.title });
    expect(box.className).toContain("overflow-y-auto");
    for (const clause of WAIVERS.participant.text.split("\n\n")) {
      expect(within(box).getByText(clause)).toBeInTheDocument();
    }
    expect(
      screen.getByText(WAIVERS.participant.checkboxLabel),
    ).toBeInTheDocument();
  });

  it("starts with the box unchecked and initials empty, Join disabled", () => {
    renderModal({ waiverAccepted: false });

    expect(checkbox()).not.toBeChecked();
    expect(initialsInput()).toHaveValue("");
    expect(joinButton()).toBeDisabled();
  });

  it("keeps Join disabled until both the box is checked and initials are entered", () => {
    renderModal({ waiverAccepted: false });

    // Box only.
    fireEvent.click(checkbox());
    expect(joinButton()).toBeDisabled();

    // Initials only.
    fireEvent.click(checkbox());
    fireEvent.change(initialsInput(), { target: { value: "WP" } });
    expect(joinButton()).toBeDisabled();

    // Both.
    fireEvent.click(checkbox());
    expect(joinButton()).toBeEnabled();

    // Unchecking disables it again.
    fireEvent.click(checkbox());
    expect(joinButton()).toBeDisabled();
  });

  it("treats whitespace-only initials as not entered", () => {
    renderModal({ waiverAccepted: false });
    fireEvent.click(checkbox());
    fireEvent.change(initialsInput(), { target: { value: "   " } });
    expect(joinButton()).toBeDisabled();
  });

  it("limits the initials field to 10 characters", () => {
    renderModal({ waiverAccepted: false });
    expect(initialsInput()).toHaveAttribute("maxlength", "10");
  });

  it("accepts the waiver, then joins, then closes", async () => {
    const order: string[] = [];
    acceptWaiver.mockImplementation(async () => {
      order.push("accept");
      return { error: null };
    });
    const onJoin = vi.fn(async () => {
      order.push("join");
      return joined;
    });
    const { onClose } = renderModal({ waiverAccepted: false, onJoin });

    fireEvent.click(checkbox());
    fireEvent.change(initialsInput(), { target: { value: " WP " } });
    fireEvent.click(joinButton());

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(acceptWaiver).toHaveBeenCalledWith("participant", "WP");
    expect(order).toEqual(["accept", "join"]);
  });

  it("does not join, and shows the error, when recording the waiver fails", async () => {
    acceptWaiver.mockResolvedValue({ error: "Could not record your agreement." });
    const { onJoin, onClose } = renderModal({ waiverAccepted: false });

    fireEvent.click(checkbox());
    fireEvent.change(initialsInput(), { target: { value: "WP" } });
    fireEvent.click(joinButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not record your agreement.",
    );
    expect(onJoin).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps the { ok, full } handling: a full rejection still closes the modal", async () => {
    const onJoin = vi.fn(() => Promise.resolve({ ok: false, full: true }));
    const { onClose } = renderModal({ waiverAccepted: false, onJoin });

    fireEvent.click(checkbox());
    fireEvent.change(initialsInput(), { target: { value: "WP" } });
    fireEvent.click(joinButton());

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onJoin).toHaveBeenCalledTimes(1);
  });

  it("shows a join failure inline and stays open", async () => {
    const onJoin = vi.fn(() =>
      Promise.resolve({
        ok: false,
        full: false,
        error: "This activity is no longer open",
      }),
    );
    const { onClose } = renderModal({ waiverAccepted: false, onJoin });

    fireEvent.click(checkbox());
    fireEvent.change(initialsInput(), { target: { value: "WP" } });
    fireEvent.click(joinButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This activity is no longer open",
    );
    expect(onClose).not.toHaveBeenCalled();
    // Still the first-time view, not swapped out from under the message.
    expect(screen.getByText("Before you join")).toBeInTheDocument();
  });

  it("Cancel closes without accepting or joining", () => {
    const { onJoin, onClose } = renderModal({ waiverAccepted: false });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(acceptWaiver).not.toHaveBeenCalled();
    expect(onJoin).not.toHaveBeenCalled();
  });
});

describe("returning join modal", () => {
  it("shows the date and location between two hairline dividers", () => {
    renderModal({ waiverAccepted: true });

    const location = screen.getByText(activity.location_name);
    const details = location.parentElement as HTMLElement;
    expect(details.previousElementSibling).toHaveClass("h-px", "bg-brand-border");
    expect(details.nextElementSibling).toHaveClass("h-px", "bg-brand-border");
    expect(details.children).toHaveLength(2); // date line, location line
  });

  it("links 'assumption of risk' to /waiver in the muted supporting line", () => {
    renderModal({ waiverAccepted: true });

    const link = screen.getByRole("link", { name: "assumption of risk" });
    expect(link).toHaveAttribute("href", "/waiver");
    expect(link).toHaveClass("link-action");

    const line = link.closest("p") as HTMLElement;
    expect(line).toHaveClass("text-brand-muted");
    expect(line.textContent).toBe(
      "Activities carry risk. Rally does not organize or supervise them, and hosts are participants, not guides. You accepted the assumption of risk when you first joined.",
    );
  });

  it("joins directly on confirm, with no acceptance step", async () => {
    const { onJoin, onClose } = renderModal({ waiverAccepted: true });

    fireEvent.click(joinButton());

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onJoin).toHaveBeenCalledTimes(1);
    expect(acceptWaiver).not.toHaveBeenCalled();
  });

  it("Cancel closes without joining", () => {
    const { onJoin, onClose } = renderModal({ waiverAccepted: true });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(onJoin).not.toHaveBeenCalled();
  });

  it("switches to the first-time modal when the server answers waiverRequired", async () => {
    // The page said accepted, but the server disagrees (a version bump landed).
    const onJoin = vi.fn(() =>
      Promise.resolve({ ok: false, full: false, waiverRequired: true }),
    );
    const { onClose } = renderModal({ waiverAccepted: true, onJoin });

    fireEvent.click(joinButton());

    expect(await screen.findByText("Before you join")).toBeInTheDocument();
    expect(checkbox()).not.toBeChecked();
    expect(onClose).not.toHaveBeenCalled();
    expect(onJoin).toHaveBeenCalledTimes(1);
  });

  it("completes the join from the first-time view it switched to", async () => {
    const onJoin = vi
      .fn<() => Promise<JoinResult>>()
      .mockResolvedValueOnce({ ok: false, full: false, waiverRequired: true })
      .mockResolvedValueOnce(joined);
    const { onClose } = renderModal({ waiverAccepted: true, onJoin });

    fireEvent.click(joinButton());
    await screen.findByText("Before you join");

    fireEvent.click(checkbox());
    fireEvent.change(initialsInput(), { target: { value: "WP" } });
    fireEvent.click(joinButton());

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(acceptWaiver).toHaveBeenCalledWith("participant", "WP");
    expect(onJoin).toHaveBeenCalledTimes(2);
  });
});

describe("acceptance is remembered across join surfaces", () => {
  it("shows the returning modal on the next join after signing, even before a refresh", async () => {
    const first = renderModal({ waiverAccepted: false });
    fireEvent.click(checkbox());
    fireEvent.change(initialsInput(), { target: { value: "WP" } });
    fireEvent.click(joinButton());
    await waitFor(() => expect(first.onClose).toHaveBeenCalled());

    // Another card on the same page: its server prop is still the stale false.
    document.body.innerHTML = "";
    renderModal({ waiverAccepted: false });
    expect(
      screen.getByRole("heading", { name: `Join ${activity.title}?` }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Before you join")).not.toBeInTheDocument();
  });
});
