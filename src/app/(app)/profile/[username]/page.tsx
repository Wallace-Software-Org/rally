import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUsername } from "@/lib/queries/profiles";
import ProfileView from "@/components/profile/profile-view";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  // The viewer is resolved first: the profile query needs it to decide whether
  // to fetch the owner-only Attending list at all.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getProfileByUsername(username, user?.id ?? null);

  if (!profile) notFound();

  return <ProfileView profile={profile} currentUserId={user?.id ?? null} />;
}
