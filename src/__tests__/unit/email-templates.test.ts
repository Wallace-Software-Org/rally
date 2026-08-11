import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import { EMAIL_PALETTE } from "@/lib/brand";
import {
  activityCancelledEmail,
  participantJoinedEmail,
  participantLeftEmail,
} from "@/lib/email/templates";

// 02:00 UTC on Aug 15 is 19:00 the previous day in Phoenix (UTC-7, no DST). If a
// template rendered in UTC it would read "August 15 ... 2:00 AM", so asserting
// on the Phoenix wall-clock proves the timezone pinning. max 6 / count 2 -> the
// shared spotsLeftText() yields "4 spots left".
const activity = {
  id: "abc-123",
  title: "Pickup soccer",
  startsAt: "2026-08-15T02:00:00Z",
  maxParticipants: 6,
  participantCount: 2,
};

describe("participantJoinedEmail", () => {
  it("uses the specific fact as the heading and date + spots as the body", () => {
    const { subject, text } = participantJoinedEmail({
      activity,
      participantName: "Dana",
    });

    // heading == subject, the specific fact (no generic restatement)
    expect(subject).toBe("Dana joined Pickup soccer");
    expect(text).toContain("Dana joined Pickup soccer");
    // body: Phoenix date/time then spots remaining, matching the app helper
    expect(text).toContain("August 14");
    expect(text).toContain("7:00 PM");
    expect(text).toContain("4 spots left");
    expect(text).toContain("/activity/abc-123");
  });

  it("uses the shared spots helper (Open when uncapped)", () => {
    const { text } = participantJoinedEmail({
      activity: { ...activity, maxParticipants: null },
      participantName: "Dana",
    });
    expect(text).toContain("Open");
  });

  it("falls back to a neutral label when the name is null", () => {
    const { subject } = participantJoinedEmail({
      activity,
      participantName: null,
    });
    expect(subject).toBe("Someone joined Pickup soccer");
  });
});

describe("participantLeftEmail", () => {
  it("names the leaver in the heading and shows date + spots", () => {
    const { subject, text } = participantLeftEmail({
      activity,
      participantName: "Dana",
    });
    expect(subject).toBe("Dana left Pickup soccer");
    expect(text).toContain("Dana left Pickup soccer");
    expect(text).toContain("4 spots left");
  });
});

describe("activityCancelledEmail", () => {
  it("heads with the fact and names the host + date in the body", () => {
    const { subject, text } = activityCancelledEmail({
      activity,
      hostName: "Darth Degen",
    });
    expect(subject).toBe("Pickup soccer was cancelled");
    expect(text).toContain(
      "Darth Degen cancelled this activity, which was set for",
    );
    expect(text).toContain("August 14");
  });

  it("falls back to a neutral host label when the name is null", () => {
    const { text } = activityCancelledEmail({ activity, hostName: null });
    expect(text).toContain("The host cancelled this activity");
  });
});

describe("email layout", () => {
  it("renders the teal brand dot and the shortened footer link", async () => {
    const { react } = participantJoinedEmail({
      activity,
      participantName: "Dana",
    });
    const html = (await render(react)).toLowerCase();

    // Brand dot is a styled cell (background color), not an image.
    expect(html).toContain(EMAIL_PALETTE.teal.toLowerCase());
    expect(html).not.toContain("<img");
    // Footer copy shortened; wordmark already carries "Rally".
    expect(html).toContain("profile settings");
    expect(html).not.toContain("rally profile settings");
  });

  it("declares a light color scheme and restates the palette for dark mode", async () => {
    const { react } = participantJoinedEmail({
      activity,
      participantName: "Dana",
    });
    const html = (await render(react)).toLowerCase();

    // Light color scheme declared to clients (Rally is light-mode only).
    expect(html).toContain('name="color-scheme"');
    expect(html).toContain('name="supported-color-schemes"');
    expect(html).toContain('content="light"');
    // Dark-mode block restates the card so honoring clients keep it a light
    // island (the email itself has no outer background).
    expect(html).toContain("prefers-color-scheme: dark");
    expect(html).toContain(EMAIL_PALETTE.input.toLowerCase());
    expect(html).toContain(EMAIL_PALETTE.border.toLowerCase());
  });

  it("uses a white button label on brand teal for contrast", async () => {
    const { react } = participantJoinedEmail({
      activity,
      participantName: "Dana",
    });
    const html = (await render(react)).toLowerCase();

    // White label (clears WCAG 3:1 for large/bold text) on brand teal, beating
    // the old cream-on-teal while keeping brand teal.
    expect(html).toContain(EMAIL_PALETTE.buttonText.toLowerCase());
    expect(html).toContain(EMAIL_PALETTE.teal.toLowerCase());
  });
});
