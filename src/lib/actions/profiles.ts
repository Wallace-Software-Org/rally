"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { USERNAME_RE } from "@/lib/utils/username";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { url: null, error: "Not authenticated" };

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
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const username = data.username.trim();
  if (!username || !USERNAME_RE.test(username)) {
    return {
      error: "Lowercase letters, numbers, and hyphens only, no spaces.",
    };
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // RLS restricts writes to the user's own row (auth.uid() = id); the
  // .eq("id", user.id) makes that explicit and scopes the update.
  const { error } = await supabase
    .from("profiles")
    .update({ lat, lng })
    .eq("id", user.id);

  return { error: error?.message ?? null };
}

export async function signOut(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}
