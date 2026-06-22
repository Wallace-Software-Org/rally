export function getInitials(name: string | null | undefined): string {
  const trimmedName = name?.trim();

  if (!trimmedName) return "?";

  return trimmedName
    .split(/\s+/)
    .map((word) => word[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function shouldBlurAvatarForViewer(
  viewerUserId: string | null,
  isHostAvatar: boolean,
): boolean {
  return viewerUserId === null && !isHostAvatar;
}
