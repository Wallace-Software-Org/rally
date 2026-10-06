import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/supabase";
import { WAIVERS, type WaiverType } from "@/lib/waivers";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// Whether the user has accepted the CURRENT version of a waiver. Accepted means a
// row exists with version >= the current version in src/lib/waivers.ts, so
// raising the version there makes every user re-accept. Takes the caller's
// client (server actions already hold one from requireUser) instead of opening a
// second. Fails closed: a query error reads as not accepted, which only ever
// costs the user one extra confirmation.
export async function hasAcceptedWaiver(
  supabase: ServerClient,
  userId: string,
  waiverType: WaiverType,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("waiver_acceptances")
    .select("id")
    .eq("user_id", userId)
    .eq("waiver_type", waiverType)
    .gte("version", WAIVERS[waiverType].version)
    .limit(1);

  return !error && Array.isArray(data) && data.length > 0;
}

export type WaiverAcceptanceInsert =
  Database["public"]["Tables"]["waiver_acceptances"]["Insert"];

// Record a waiver acceptance through the admin (service-role) client. This is the
// ONLY write path for waiver_acceptances: the table grants no client role insert,
// so acceptances cannot be forged from the browser. It takes a whole row, user_id
// included, so it must never be exported from a "use server" file (that would
// make it a callable server action with an arbitrary user_id); it lives here and
// only acceptWaiver calls it, building the row from the verified session and
// src/lib/waivers.ts, never from client input. ON CONFLICT DO NOTHING on
// (user_id, waiver_type, version), so a double submit keeps the original row.
export async function insertWaiverAcceptance(
  row: WaiverAcceptanceInsert,
): Promise<{ error: { message: string } | null }> {
  const { error } = await getAdminClient()
    .from("waiver_acceptances")
    .upsert(row, {
      onConflict: "user_id,waiver_type,version",
      ignoreDuplicates: true,
    });
  return { error };
}
