import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WaiverAgreement from "@/components/activities/waiver-agreement";
import { WAIVERS } from "@/lib/waivers";

const waiver = WAIVERS.participant;
const HINT = "Scroll to read the full agreement.";

afterEach(() => {
  vi.restoreAllMocks();
});

// jsdom leaves scrollHeight/clientHeight at 0 (no layout engine), so left alone
// every box reads as "already at the bottom". This patches the geometry on
// Element.prototype BEFORE the component mounts (the mount effect reads it
// synchronously, before a test can reach a ref to patch just one instance), and
// lets a test drive scrollTop the way a real scroll would. Callers restore it
// with vi.restoreAllMocks() (afterEach below).
function withScrollGeometry({
  scrollHeight,
  clientHeight,
}: {
  scrollHeight: number;
  clientHeight: number;
}) {
  let scrollTop = 0;
  vi.spyOn(Element.prototype, "scrollHeight", "get").mockReturnValue(scrollHeight);
  vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(clientHeight);
  vi.spyOn(Element.prototype, "scrollTop", "get").mockImplementation(() => scrollTop);
  vi.spyOn(Element.prototype, "scrollTop", "set").mockImplementation((value: number) => {
    scrollTop = value;
  });
}

function renderAgreement() {
  render(
    <WaiverAgreement
      waiver={waiver}
      confirmLabel="Confirm"
      busyLabel="Confirming…"
      onConfirm={vi.fn(() => Promise.resolve(null))}
      onCancel={vi.fn()}
    />,
  );
  return {
    box: screen.getByRole("region", { name: waiver.title }),
    checkbox: () => screen.getByRole("checkbox"),
    initials: () => screen.getByLabelText(/sign with initials/i),
  };
}

function scrollTo(box: HTMLElement, scrollTop: number) {
  fireEvent.scroll(box, { target: { scrollTop } });
}

describe("WaiverAgreement scroll gate", () => {
  it("keeps the checkbox and initials disabled, and shows the hint, until scrolled to the bottom", () => {
    withScrollGeometry({ scrollHeight: 400, clientHeight: 200 });
    const { box, checkbox, initials } = renderAgreement();

    expect(checkbox()).toBeDisabled();
    expect(initials()).toBeDisabled();
    expect(screen.getByText(HINT)).toBeInTheDocument();

    // Not yet at the bottom (60px short, tolerance is a few px).
    scrollTo(box, 140);
    expect(checkbox()).toBeDisabled();
    expect(initials()).toBeDisabled();
    expect(screen.getByText(HINT)).toBeInTheDocument();
  });

  it("enables both controls and removes the hint once scrolled to the bottom (within tolerance)", () => {
    withScrollGeometry({ scrollHeight: 400, clientHeight: 200 });
    const { box, checkbox, initials } = renderAgreement();

    // 2px short of the exact bottom: within the tolerance.
    scrollTo(box, 198);

    expect(checkbox()).toBeEnabled();
    expect(initials()).toBeEnabled();
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
  });

  it("enables both controls immediately on mount when the text does not overflow the box", () => {
    withScrollGeometry({ scrollHeight: 200, clientHeight: 200 });
    const { checkbox, initials } = renderAgreement();

    // No scroll ever happened, yet nothing is gated.
    expect(checkbox()).toBeEnabled();
    expect(initials()).toBeEnabled();
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
  });

  it("enables immediately on mount with jsdom's default (unmocked) zero-size box", () => {
    // No withScrollGeometry at all: scrollHeight/clientHeight/scrollTop all read 0,
    // which is indistinguishable from "already at the bottom".
    const { checkbox, initials } = renderAgreement();
    expect(checkbox()).toBeEnabled();
    expect(initials()).toBeEnabled();
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
  });

  it("stays enabled after scrolling back up to the top", () => {
    withScrollGeometry({ scrollHeight: 500, clientHeight: 200 });
    const { box, checkbox, initials } = renderAgreement();

    scrollTo(box, 300); // exactly at the bottom
    expect(checkbox()).toBeEnabled();

    scrollTo(box, 0); // back to the top
    expect(checkbox()).toBeEnabled();
    expect(initials()).toBeEnabled();
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
  });

  it("does not re-lock once checked and filled in, even after scrolling back up", () => {
    withScrollGeometry({ scrollHeight: 500, clientHeight: 200 });
    const { box, checkbox, initials } = renderAgreement();
    scrollTo(box, 300);

    fireEvent.click(checkbox());
    fireEvent.change(initials(), { target: { value: "WP" } });
    scrollTo(box, 0);

    expect(checkbox()).toBeChecked();
    expect(checkbox()).toBeEnabled();
    expect(initials()).toHaveValue("WP");
  });

  it("re-checks on window resize and enables once the overflow resolves", () => {
    withScrollGeometry({ scrollHeight: 400, clientHeight: 200 });
    const { checkbox, initials } = renderAgreement();
    expect(checkbox()).toBeDisabled();

    // The viewport grows (or rotates) and the box's content no longer overflows.
    withScrollGeometry({ scrollHeight: 400, clientHeight: 400 });
    fireEvent(window, new Event("resize"));

    expect(checkbox()).toBeEnabled();
    expect(initials()).toBeEnabled();
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
  });

  it("keeps the Confirm button disabled while the scroll gate has not opened, even if checked and signed", () => {
    withScrollGeometry({ scrollHeight: 400, clientHeight: 200 });
    const { checkbox, initials } = renderAgreement();

    // Both are disabled, so this simulates state rather than a real user
    // interaction, to isolate the Confirm gate from the input gate.
    fireEvent.click(checkbox());
    fireEvent.change(initials(), { target: { value: "WP" } });

    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  });
});

describe("WaiverAgreement accessibility", () => {
  it("gives the scroll box a tabbable, labeled region naming the waiver", () => {
    const { box } = renderAgreement();
    expect(box).toHaveAttribute("tabindex", "0");
    expect(box).toHaveAttribute("aria-label", waiver.title);
    box.focus();
    expect(box).toHaveFocus();
  });

  it("labels disabled controls the normal way, with the disabled attribute doing the styling", () => {
    withScrollGeometry({ scrollHeight: 400, clientHeight: 200 });
    const { checkbox, initials } = renderAgreement();

    expect(checkbox()).toHaveClass("disabled:cursor-not-allowed", "disabled:opacity-50");
    expect(initials()).toHaveClass("disabled:cursor-not-allowed", "disabled:opacity-50");
  });
});
