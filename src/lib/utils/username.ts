import type { UsernameStatus } from "@/types";

export const USERNAME_RE = /^[a-z0-9-]{3,20}$/;

export function usernameHint(
  status: UsernameStatus,
  username: string,
): { color: string; text: string } | null {
  if (!username) return null;
  if (status === "invalid") {
    if (username.length < 3)
      return { color: "text-brand-muted", text: "At least 3 characters required." };
    return {
      color: "text-brand-danger",
      text: "Lowercase letters, numbers, and hyphens only, no spaces.",
    };
  }
  if (status === "checking")
    return { color: "text-brand-muted", text: "Checking..." };
  if (status === "available")
    return { color: "text-brand-teal-text", text: "Available." };
  if (status === "taken")
    return { color: "text-brand-danger", text: "That username is taken." };
  if (status === "error")
    return { color: "text-brand-danger", text: "Could not check availability. Try again." };
  return null;
}
