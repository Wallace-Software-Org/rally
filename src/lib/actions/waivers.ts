"use server";

import { headers } from "next/headers";
import { requireUser } from "@/lib/actions/require-user";
import { insertWaiverAcceptance } from "@/lib/queries/waivers";
import { isWaiverType, WAIVERS } from "@/lib/waivers";
import { normalizeInitials } from "@/lib/utils/waiver-validation";

// Audit columns come from client-controlled headers, so cap them rather than
// store arbitrarily long strings.
const MAX_IP_LENGTH = 64;
const MAX_USER_AGENT_LENGTH = 512;

function clean(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

// Records the user's acceptance of the CURRENT version of a waiver. The stored
// text and version always come from src/lib/waivers.ts, never from the caller,
// and user_id always comes from the verified session, never from input.
//
// The insert goes through the admin (service-role) client, not the user's client:
// waiver_acceptances grants no client role insert, so the row cannot be forged
// from the browser. requireUser() is still the identity check. Idempotent: ON
// CONFLICT DO NOTHING on (user_id, waiver_type, version), so a double submit or a
// re-accept of the same version keeps the original row.
export async function acceptWaiver(
  waiverType: string,
  initials: string,
): Promise<{ error: string | null }> {
  const { user, error: authError } = await requireUser();
  if (authError) return { error: authError };

  if (!isWaiverType(waiverType)) return { error: "Unknown waiver" };

  const signed = normalizeInitials(initials);
  if (!signed) return { error: "Enter your initials (1 to 10 characters)" };

  const waiver = WAIVERS[waiverType];
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0];

  try {
    const { error } = await insertWaiverAcceptance({
      user_id: user.id,
      waiver_type: waiverType,
      version: waiver.version,
      initials: signed,
      waiver_text: waiver.text,
      ip_address: clean(forwardedFor, MAX_IP_LENGTH),
      user_agent: clean(requestHeaders.get("user-agent"), MAX_USER_AGENT_LENGTH),
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    // Includes a missing SUPABASE_SECRET_KEY. Log the cause, show a friendly line.
    console.error("[waiver] could not record acceptance", err);
    return { error: "Could not record your agreement. Please try again." };
  }

  return { error: null };
}
