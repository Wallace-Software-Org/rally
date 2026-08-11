"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { USERNAME_RE } from "@/lib/utils/username";
import { isValidSport } from "@/lib/utils/activity-validation";
import { requireUser } from "@/lib/actions/require-user";

const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const FULL_NAME_MAX = 80;
const BIO_MAX = 300;
const INSTAGRAM_MAX = 30;

export async function checkUsername(
  username: string,
): Promise<{ available: boolean }> {
  if (!USERNAME_RE.test(username)) return { available: false };

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  return { available: data === null };
}

export async function uploadAvatar(
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  const { supabase, user, error: authError } = await requireUser();
  if (authError) return { url: null, error: authError };

  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return { url: null, error: "Use a JPEG, PNG, or WebP image" };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { url: null, error: "Image must be under 2MB" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { url: null, error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) return { url: null, error: updateError.message };

  revalidatePath("/");
  return { url: publicUrl, error: null };
}

export async function updateProfile(data: {
  full_name: string;
  username: string;
  bio: string;
  instagram_handle: string;
  sports: string[];
  notification_emails: boolean;
}): Promise<{ error: string | null }> {
  const { supabase, user, error: authError } = await requireUser();
  if (authError) return { error: authError };

  const username = data.username.trim();
  if (!username || !USERNAME_RE.test(username)) {
    return {
      error: "Lowercase letters, numbers, and hyphens only, no spaces.",
    };
  }

  // Mirror the form rule: the toggle is a plain boolean.
  if (typeof data.notification_emails !== "boolean") {
    return { error: "Invalid notification setting" };
  }

  if (!data.sports.every(isValidSport)) {
    return { error: "Choose activities from the list" };
  }
  if (data.full_name.trim().length > FULL_NAME_MAX) {
    return { error: "Name is too long" };
  }
  if (data.bio.trim().length > BIO_MAX) {
    return { error: "Bio is too long" };
  }
  if (data.instagram_handle.replace(/^@/, "").trim().length > INSTAGRAM_MAX) {
    return { error: "Instagram handle is too long" };
  }

  const { data: current } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: data.full_name.trim() || null,
      username,
      bio: data.bio.trim() || null,
      instagram_handle: data.instagram_handle.replace(/^@/, "").trim() || null,
      sports: data.sports,
      notification_emails: data.notification_emails,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  if (current?.username) revalidatePath(`/profile/${current.username}`);
  if (username !== current?.username) {
    revalidatePath(`/profile/${username}`);
  }
  revalidatePath("/");

  return { error: null };
}

export async function updateUserLocation(
  lat: number,
  lng: number,
): Promise<{ error: string | null }> {
  const { supabase, user, error: authError } = await requireUser();
  if (authError) return { error: authError };

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: "Invalid coordinates" };
  }
  const clampedLat = Math.min(90, Math.max(-90, lat));
  const clampedLng = Math.min(180, Math.max(-180, lng));

  // RLS restricts writes to the user's own row (auth.uid() = id); the
  // .eq("id", user.id) makes that explicit and scopes the update.
  const { error } = await supabase
    .from("profiles")
    .update({ lat: clampedLat, lng: clampedLng })
    .eq("id", user.id);

  return { error: error?.message ?? null };
}

export async function signOut(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}
