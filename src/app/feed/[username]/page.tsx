import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHostByUsername } from "@/lib/queries/profiles";
import { getActivitiesByUser } from "@/lib/queries/activities";
import { getSiteUrl } from "@/lib/utils/site-url";
import AppNav from "@/components/nav/app-nav";
import PersonalFeed from "@/components/activities/personal-feed";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const host = await getHostByUsername(username);
  if (!host) return {};

  return {
    title: `${host.full_name} on Rally`,
    description: `Upcoming activities hosted by ${host.full_name}`,
    alternates: { canonical: `${getSiteUrl()}/feed/${host.username}` },
  };
}

// Logged-out header: wordmark only, linking home. No Post activity affordance.
function WordmarkHeader() {
  return (
    <header className="flex-none border-b border-brand-border bg-brand-bg">
      <div className="max-w-5xl xl:max-w-none mx-auto px-4 xl:px-6 h-14 flex items-center">
        <Link href="/" className="flex items-center gap-2 flex-none">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-teal block" />
          <span className="text-base font-semibold tracking-tight text-brand-text">
            Rally
          </span>
        </Link>
      </div>
    </header>
  );
}

export default async function PersonalFeedPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const [
    host,
    {
      data: { user },
    },
  ] = await Promise.all([getHostByUsername(username), supabase.auth.getUser()]);

  if (!host) notFound();

  // The page is a public read; only fetch the viewer's own profile (for the
  // normal header) when signed in.
  const [activities, viewerProfile] = await Promise.all([
    getActivitiesByUser(host.id),
    user
      ? supabase
          .from("profiles")
          .select("avatar_url, full_name, city, username, instagram_handle")
          .eq("id", user.id)
          .single()
          .then((r) => r.data)
      : Promise.resolve(null),
  ]);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-brand-bg overflow-hidden">
      {user ? (
        <AppNav profile={viewerProfile} userId={user.id} />
      ) : (
        <WordmarkHeader />
      )}
      <PersonalFeed
        activities={activities}
        userId={user?.id ?? null}
        hostId={host.id}
        host={{
          username: host.username,
          full_name: host.full_name,
          avatar_url: host.avatar_url,
          instagram_handle: host.instagram_handle,
        }}
      />
    </div>
  );
}
