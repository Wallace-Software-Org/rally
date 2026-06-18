import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivityById } from "@/lib/queries/activities";
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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id ?? null;
  const activity = await getActivityById(id, userId);

  if (activity === null) notFound();

  if (activity === "private") {
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
          className="mt-1 inline-flex items-center justify-center rounded-xl bg-brand-teal px-6 py-3 text-sm font-semibold text-white hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors"
        >
          Log in
        </Link>
        <Link
          href="/login"
          className="text-sm text-brand-muted hover:text-brand-text transition-colors"
        >
          New here? Sign up
        </Link>
      </div>
    );
  }

  return (
    <ActivityDetailView
      activity={activity}
      userId={userId}
      showPostedBanner={postedParam === "true"}
    />
  );
}
