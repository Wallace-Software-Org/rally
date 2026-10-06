import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { activityLoginHref, quickJoinLoginHref } from "@/lib/utils/activity-participants";

const { mockGetUser, getActivityById } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  getActivityById: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));
vi.mock("@/lib/queries/activities", () => ({ getActivityById }));
vi.mock("@/lib/queries/profiles", () => ({ getProfileById: vi.fn() }));
vi.mock("@/lib/queries/waivers", () => ({ hasAcceptedWaiver: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
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

import ActivityPage from "@/app/(app)/activity/[id]/page";

async function renderPrivateGate() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
  getActivityById.mockResolvedValue("private");
  const element = await ActivityPage({
    params: Promise.resolve({ id: "act-1" }),
    searchParams: Promise.resolve({}),
  });
  render(element as React.ReactElement);
}

beforeEach(() => vi.clearAllMocks());

describe("private activity gate, signed out", () => {
  it("carries the activity as the login return path on the Log in link", async () => {
    await renderPrivateGate();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login?next=/activity/act-1",
    );
  });

  it("carries the same return path on the Sign up link (same login action)", async () => {
    await renderPrivateGate();
    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute(
      "href",
      "/login?next=/activity/act-1",
    );
  });

  it("does not carry join=true: viewing is not joining", async () => {
    await renderPrivateGate();
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toContain("join=true");
    }
  });

  it("states the activity is private and asks to log in, without mentioning access, permission, or being allowed", async () => {
    await renderPrivateGate();
    expect(screen.getByText("This activity is private.")).toBeInTheDocument();
    expect(screen.getByText("Log in to view it.")).toBeInTheDocument();

    const gate = screen.getByText("This activity is private.").closest("div");
    const copy = gate?.textContent ?? "";
    expect(copy).not.toMatch(/access/i);
    expect(copy).not.toMatch(/permission/i);
    expect(copy).not.toMatch(/allowed/i);
  });
});

describe("activityLoginHref, the shared return-path helper", () => {
  it("builds a plain return (no join) for the private gate", () => {
    expect(activityLoginHref("act-1")).toBe("/login?next=/activity/act-1");
  });

  it("builds the quick-join return (with join=true) when asked", () => {
    expect(activityLoginHref("act-1", { join: true })).toBe(
      "/login?next=/activity/act-1&join=true",
    );
  });

  it("is the same helper quickJoinLoginHref uses, just with join set", () => {
    expect(quickJoinLoginHref("act-1")).toBe(
      activityLoginHref("act-1", { join: true }),
    );
  });
});
