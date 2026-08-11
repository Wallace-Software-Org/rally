import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EditProfileForm from "@/components/profile/edit-profile-form";

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("@/lib/actions/profiles", () => ({
  signOut: vi.fn(async () => ({ error: null })),
  checkUsername: vi.fn(async () => ({ available: true })),
  uploadAvatar: vi.fn(),
  updateProfile: vi.fn(),
}));

const baseProfile = {
  username: "wallace",
  full_name: "Wallace Palmer",
  avatar_url: null,
  bio: null,
  instagram_handle: null,
  sports: [],
  notification_emails: true,
};

describe("EditProfileForm sign out", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
  });

  it("redirects to the feed (not the sign-in page) after signing out", async () => {
    render(<EditProfileForm profile={baseProfile} />);

    // First click arms the confirm state, second click signs out.
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm sign out?" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
    expect(refreshMock).toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalledWith("/login");
  });
});
