import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/queries/profiles";
import EditProfileForm from "@/components/profile/edit-profile-form";
import BackButton from "@/components/ui/back-button";

export default async function EditProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfileById(user.id);
  if (!profile) redirect("/login");

  return (
    <>
      <BackButton />
      <EditProfileForm profile={profile} />
    </>
  );
}
