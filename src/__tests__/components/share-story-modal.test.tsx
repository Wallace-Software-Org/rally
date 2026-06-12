import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ShareStoryModal from "@/components/ui/share-story-modal";

describe("ShareStoryModal", () => {
  it("renders all four steps", () => {
    render(<ShareStoryModal onClose={vi.fn()} />);

    expect(screen.getByText("Image saved to your photos")).toBeInTheDocument();
    expect(
      screen.getByText("Open Instagram, Snapchat, or any app with Stories"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Add the saved image to your Story"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Tap the link sticker and paste your link, it's already copied",
      ),
    ).toBeInTheDocument();
  });

  it("calls onClose when Got it is clicked", () => {
    const onClose = vi.fn();

    render(<ShareStoryModal onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /got it/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders modal content without animation-specific assertions", () => {
    render(<ShareStoryModal onClose={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: /share to your story/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /got it/i })).toBeInTheDocument();
  });
});
