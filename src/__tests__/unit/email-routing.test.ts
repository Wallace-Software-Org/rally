import { describe, it, expect, afterEach, vi } from "vitest";
import {
  applyTestRedirect,
  classifySendStatus,
  filterOptedIn,
  formatSendLog,
} from "@/lib/email/routing";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("applyTestRedirect", () => {
  it("reroutes every recipient to the test inbox and prefixes the original into the subject when EMAIL_TEST_REDIRECT is set", () => {
    vi.stubEnv("EMAIL_TEST_REDIRECT", "inbox@example.com");

    const out = applyTestRedirect("real@user.com", "Pickup soccer was cancelled");

    expect(out.to).toBe("inbox@example.com");
    expect(out.subject).toBe("[test -> real@user.com] Pickup soccer was cancelled");
  });

  it("passes recipient and subject through untouched when EMAIL_TEST_REDIRECT is unset (production)", () => {
    vi.stubEnv("EMAIL_TEST_REDIRECT", "");

    const out = applyTestRedirect("real@user.com", "Someone joined Pickup soccer");

    expect(out.to).toBe("real@user.com");
    expect(out.subject).toBe("Someone joined Pickup soccer");
  });
});

describe("filterOptedIn", () => {
  it("drops recipients with notifications off, before the address list is built", () => {
    const recipients = [
      { email: "a@x.com", notification_emails: true },
      { email: "b@x.com", notification_emails: false },
      { email: "c@x.com", notification_emails: true },
    ];

    expect(filterOptedIn(recipients).map((r) => r.email)).toEqual([
      "a@x.com",
      "c@x.com",
    ]);
  });
});

describe("classifySendStatus", () => {
  it("counts a clean send as sent", () => {
    expect(classifySendStatus(null)).toBe("sent");
    expect(classifySendStatus(undefined)).toBe("sent");
  });

  it("treats an idempotency-key collision as deduped, not sent or failed", () => {
    expect(classifySendStatus("concurrent_idempotent_requests")).toBe("deduped");
  });

  it("treats any other error as failed", () => {
    expect(classifySendStatus("rate_limit_exceeded")).toBe("failed");
    expect(classifySendStatus("daily_quota_exceeded")).toBe("failed");
  });
});

describe("formatSendLog", () => {
  it("emits a single greppable line with type, activity id, count, and status", () => {
    expect(
      formatSendLog("participant_joined", "act-123", 1, "sent"),
    ).toBe("[email] type=participant_joined activityId=act-123 recipients=1 status=sent");
  });

  it("carries the deduped status so it can be excluded from volume counts", () => {
    expect(
      formatSendLog("participant_joined", "act-123", 1, "deduped"),
    ).toBe("[email] type=participant_joined activityId=act-123 recipients=1 status=deduped");
  });
});
