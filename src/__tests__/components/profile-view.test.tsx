import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfileView from "@/components/profile/profile-view";
import type { ProfilePage } from "@/types";

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

// The tab managers are exercised elsewhere; stub them down to a marker so these
// tests can tell which list the body is showing without their internals.
vi.mock("@/components/profile/hosting-manager", () => ({
  default: () => <div>hosting-list</div>,
}));
vi.mock("@/components/profile/attending-manager", () => ({
  default: () => <div>attending-list</div>,
}));

function makeProfile(over: Partial<ProfilePage> = {}): ProfilePage {
  return {
    id: "u1",
    username: "wallace",
    full_name: "Wallace Palmer",
    avatar_url: null,
    bio: "Runner",
    instagram_handle: "wallaceig",
    sports: ["running"],
    hosted_count: 0,
    attended_count: 0,
    going: [],
    hosting: [],
    ...over,
  };
}

const links = (name: string) => screen.queryAllByRole("link", { name });

describe("ProfileView header action row", () => {
  it("does not render the raw instagram handle as a pill", () => {
    render(<ProfileView profile={makeProfile()} currentUserId="u1" />);
    expect(screen.queryByText("wallaceig")).not.toBeInTheDocument();
  });

  it("owner with instagram shows both, sharing the row", () => {
    render(<ProfileView profile={makeProfile()} currentUserId="u1" />);
    expect(links("Instagram").length).toBeGreaterThan(0);
    expect(links("Edit profile").length).toBeGreaterThan(0);
    // Instagram button links to the handle, labeled "Instagram".
    expect(links("Instagram")[0]).toHaveAttribute(
      "href",
      "https://instagram.com/wallaceig",
    );
    // Side by side below xl, stacked full width at xl.
    expect(links("Instagram")[0]).toHaveClass("flex-1", "xl:w-full");
    expect(links("Edit profile")[0]).toHaveClass("flex-1", "xl:w-full");
  });

  it("visitor with instagram shows Instagram only, unstretched", () => {
    render(<ProfileView profile={makeProfile()} currentUserId="other" />);
    expect(links("Instagram").length).toBeGreaterThan(0);
    expect(links("Edit profile").length).toBe(0);
    // Alone in the row it keeps its own width instead of filling the card.
    expect(links("Instagram")[0]).toHaveClass("flex-none", "xl:w-full");
    expect(links("Instagram")[0].className).not.toContain("flex-1");
  });

  it("owner without instagram shows Edit profile only", () => {
    render(
      <ProfileView
        profile={makeProfile({ instagram_handle: null })}
        currentUserId="u1"
      />,
    );
    expect(links("Instagram").length).toBe(0);
    expect(links("Edit profile").length).toBeGreaterThan(0);
    expect(links("Edit profile")[0]).toHaveClass("flex-1", "xl:w-full");
  });

  it("visitor without instagram shows no action buttons", () => {
    render(
      <ProfileView
        profile={makeProfile({ instagram_handle: null })}
        currentUserId="other"
      />,
    );
    expect(links("Instagram").length).toBe(0);
    expect(links("Edit profile").length).toBe(0);
  });

  it("drops View feed for everyone", () => {
    render(<ProfileView profile={makeProfile()} currentUserId="u1" />);
    expect(links("View feed").length).toBe(0);
  });
});

describe("ProfileView share feed", () => {
  const shareButtons = () =>
    screen.queryAllByRole("button", { name: "Copy feed link" });

  it("owner sees the share icon by the username", () => {
    render(<ProfileView profile={makeProfile()} currentUserId="u1" />);
    expect(shareButtons().length).toBeGreaterThan(0);
    // The old full-width labelled button is gone.
    expect(screen.queryByText("Share feed")).not.toBeInTheDocument();
  });

  it("visitor sees it too", () => {
    render(<ProfileView profile={makeProfile()} currentUserId="other" />);
    expect(shareButtons().length).toBeGreaterThan(0);
  });

  it("copies the feed url and flips to a copied state", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ProfileView profile={makeProfile()} currentUserId="other" />);
    fireEvent.click(shareButtons()[0]);

    await waitFor(() =>
      expect(
        screen.queryAllByRole("button", { name: "Feed link copied" }).length,
      ).toBeGreaterThan(0),
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("/feed/wallace"),
    );
  });
});

// Both layout trees mount at once (mobile and desktop), so these count matches
// rather than asserting on a single node.
const tabs = (name: RegExp) => screen.queryAllByRole("button", { name });

describe("ProfileView tabs", () => {
  it("owner sees both tabs, starting on Hosting", () => {
    render(<ProfileView profile={makeProfile()} currentUserId="u1" />);
    expect(tabs(/Hosting/).length).toBeGreaterThan(0);
    expect(tabs(/Attending/).length).toBeGreaterThan(0);
    expect(screen.queryAllByText("hosting-list").length).toBeGreaterThan(0);
    expect(screen.queryByText("attending-list")).not.toBeInTheDocument();
  });

  it("visitor sees no tab bar at all", () => {
    render(<ProfileView profile={makeProfile()} currentUserId="other" />);
    expect(tabs(/Hosting/).length).toBe(0);
    expect(tabs(/Attending/).length).toBe(0);
  });

  it("visitor gets the hosting list as the profile body, never attending", () => {
    render(
      <ProfileView
        profile={makeProfile({ going: [] })}
        currentUserId="other"
      />,
    );
    expect(screen.queryAllByText("hosting-list").length).toBeGreaterThan(0);
    expect(screen.queryByText("attending-list")).not.toBeInTheDocument();
  });

  it("signed-out visitor is treated as a visitor", () => {
    render(<ProfileView profile={makeProfile()} currentUserId={null} />);
    expect(tabs(/Attending/).length).toBe(0);
    expect(screen.queryAllByText("hosting-list").length).toBeGreaterThan(0);
  });
});
