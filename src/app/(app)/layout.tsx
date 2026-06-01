import { createClient } from "@/lib/supabase/server";
import AppNav from "@/components/nav/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user
    ? (
        await supabase
          .from("profiles")
          .select("avatar_url, full_name, city, username, instagram_handle")
          .eq("id", user.id)
          .single()
      ).data
    : null;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-brand-bg overflow-hidden">
      <AppNav profile={profile} userId={user?.id ?? null} />
      {children}
    </div>
  );
}
