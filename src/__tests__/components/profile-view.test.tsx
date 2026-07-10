import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

// The tab managers are exercised elsewhere; stub them so this test focuses on
// the profile header action row.
vi.mock("@/components/profile/hosting-manager", () => ({ default: () => null }));
vi.mock("@/components/profile/attending-manager", () => ({
  default: () => null,
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

  it("owner with instagram shows both, stacked full width", () => {
    render(<ProfileView profile={makeProfile()} currentUserId="u1" />);
    expect(links("Instagram").length).toBeGreaterThan(0);
    expect(links("Edit profile").length).toBeGreaterThan(0);
    // Instagram button links to the handle, labeled "Instagram".
    expect(links("Instagram")[0]).toHaveAttribute(
      "href",
      "https://instagram.com/wallaceig",
    );
    // Full width, never half-width.
    expect(links("Instagram")[0]).toHaveClass("w-full");
    expect(links("Edit profile")[0]).toHaveClass("w-full");
    expect(links("Instagram")[0].className).not.toContain("w-1/2");
  });

  it("visitor with instagram shows Instagram only, full width", () => {
    render(<ProfileView profile={makeProfile()} currentUserId="other" />);
    expect(links("Instagram").length).toBeGreaterThan(0);
    expect(links("Edit profile").length).toBe(0);
    expect(links("Instagram")[0]).toHaveClass("w-full");
    expect(links("Instagram")[0].className).not.toContain("w-1/2");
  });

  it("owner without instagram shows Edit profile only, full width", () => {
    render(
      <ProfileView
        profile={makeProfile({ instagram_handle: null })}
        currentUserId="u1"
      />,
    );
    expect(links("Instagram").length).toBe(0);
    expect(links("Edit profile").length).toBeGreaterThan(0);
    expect(links("Edit profile")[0]).toHaveClass("w-full");
    expect(links("Edit profile")[0].className).not.toContain("w-1/2");
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
});
