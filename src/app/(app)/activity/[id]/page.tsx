import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivityById } from "@/lib/queries/activities";
import { getProfileById } from "@/lib/queries/profiles";
import { joinActivity } from "@/lib/actions/activities";
import ActivityDetailView from "@/components/activities/activity-detail";

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const postedParam = Array.isArray(query.posted)
    ? query.posted[0]
    : query.posted;
  const joinParam = Array.isArray(query.join) ? query.join[0] : query.join;
  const joinedParam = Array.isArray(query.joined)
    ? query.joined[0]
    : query.joined;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id ?? null;
  const activity = await getActivityById(id, userId);

  if (activity === null) notFound();

  if (activity === "private") {
    // Private is unlisted, not invite-only: any authenticated user with the link
    // can view. getActivityById only returns this sentinel for logged-out
    // visitors, so the gate is purely a prompt to log in and then view.
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center gap-3">
        <p className="text-base font-medium text-brand-text">
          This activity is private.
        </p>
        <p className="text-sm text-brand-muted">
          Log in to see if you have access.
        </p>
        <Link
          href="/login"
          className="mt-1 inline-flex items-center justify-center rounded-xl bg-brand-teal px-6 py-3 text-sm font-semibold text-white hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors duration-200"
        >
          Log in
        </Link>
        <Link
          href="/login"
          className="text-sm text-brand-muted hover:text-brand-text transition-colors duration-200"
        >
          New here? Sign up
        </Link>
      </div>
    );
  }

  // Auto-join: triggered when the user lands here after completing OAuth from
  // a shared activity link. Join server-side, then redirect to strip ?join=true.
  if (joinParam === "true" && userId) {
    const isCreator = userId === activity.creator_id;
    const isParticipant = activity.participants.some(
      (p) => p.user_id === userId,
    );
    if (!isCreator && !isParticipant) {
      const { error } = await joinActivity(id);
      redirect(`/activity/${id}${error ? "" : "?joined=true"}`);
    }
    redirect(`/activity/${id}`);
  }

  const ranJoin = joinedParam === "true";

  // Fetch the viewer's profile once when authenticated and reuse it for both
  // the onboarding banner check and the optimistic Who's going avatar.
  const viewerProfile = userId ? await getProfileById(userId) : null;

  // Only show the onboarding banner to users whose profile still needs setup.
  // Existing users with a complete profile (activities + avatar) skip it.
  const profileIsComplete =
    !!viewerProfile &&
    Array.isArray(viewerProfile.sports) &&
    viewerProfile.sports.length > 0 &&
    viewerProfile.avatar_url !== null;

  return (
    <ActivityDetailView
      activity={activity}
      userId={userId}
      showPostedBanner={postedParam === "true"}
      justJoined={ranJoin && !profileIsComplete}
      viewerProfile={
        viewerProfile
          ? {
              id: viewerProfile.id,
              full_name: viewerProfile.full_name,
              username: viewerProfile.username,
              avatar_url: viewerProfile.avatar_url,
              instagram_handle: viewerProfile.instagram_handle,
            }
          : null
      }
    />
  );
}
