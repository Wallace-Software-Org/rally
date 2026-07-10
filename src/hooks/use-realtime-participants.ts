"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dedupeByUserId } from "@/lib/utils/activity-participants";

export type RealtimeParticipant<Profile> = {
  id: string;
  user_id: string;
  profiles: Profile | null;
};

type State<Profile> = {
  activityId: string;
  seedKey: string;
  participants: RealtimeParticipant<Profile>[];
};

// Membership identity of a seed — the set of user_ids, order-independent. Used
// to decide when the server seed has meaningfully changed (someone joined/left,
// including the viewer's optimistic entry) versus just a new array reference for
// the same members.
function seedKeyOf<Profile>(list: RealtimeParticipant<Profile>[]): string {
  return list
    .map((p) => p.user_id)
    .sort()
    .join(",");
}

// Produce the next state from a transform applied to the in-sync base list. If
// the seed's membership changed (navigation, refetch, or an optimistic add/
// remove) the prev state is stale, so fall back to the fresh seed before
// transforming.
function applyUpdate<Profile>(
  activityId: string,
  seedKey: string,
  seed: RealtimeParticipant<Profile>[],
  prev: State<Profile>,
  transform: (
    base: RealtimeParticipant<Profile>[],
  ) => RealtimeParticipant<Profile>[],
): State<Profile> {
  const inSync = prev.activityId === activityId && prev.seedKey === seedKey;
  const base = inSync ? prev.participants : seed;
  return { activityId, seedKey, participants: dedupeByUserId(transform(base)) };
}

/**
 * Maintains a live participant list for one activity via Supabase realtime.
 * INSERT fetches the new user's profile and appends; DELETE removes by row id.
 * Everything dedupes by user_id so an acting user's optimistic entry is never
 * doubled when its own realtime echo arrives (the echo replaces the optimistic
 * row and upgrades it to the canonical row id), and the returned list is always
 * one entry per user.
 *
 * Profile columns are caller-supplied so each surface fetches only what it
 * renders. Count derives from the deduped list length.
 *
 * DELETE delivery note: the subscription filters on activity_id, which is not
 * the primary key, so the participants table must have REPLICA IDENTITY FULL
 * for DELETE old-records to carry activity_id (and the row id). Without it,
 * joins still appear but leaves will not until reload — the seed-membership sync
 * still drops the viewer's own optimistic leave regardless.
 */
export function useRealtimeParticipants<Profile>({
  activityId,
  initialParticipants,
  profileColumns,
}: {
  activityId: string;
  initialParticipants: RealtimeParticipant<Profile>[];
  profileColumns: string;
}): {
  participants: RealtimeParticipant<Profile>[];
  participantCount: number;
  addParticipant: (participant: RealtimeParticipant<Profile>) => void;
  removeParticipantByUserId: (userId: string) => void;
} {
  const seedKey = seedKeyOf(initialParticipants);

  const [state, setState] = useState<State<Profile>>(() => ({
    activityId,
    seedKey,
    participants: initialParticipants,
  }));

  // When the seed's membership changes (navigation, refetch, or an optimistic
  // add/remove), fall back to the new seed until the next update commits fresh
  // state under the new key. Always deduped by user_id.
  const isSync = state.activityId === activityId && state.seedKey === seedKey;
  const participants = dedupeByUserId(
    isSync ? state.participants : initialParticipants,
  );

  function addParticipant(participant: RealtimeParticipant<Profile>) {
    setState((prev) =>
      applyUpdate(activityId, seedKey, initialParticipants, prev, (base) => [
        ...base.filter((p) => p.user_id !== participant.user_id),
        participant,
      ]),
    );
  }

  function removeParticipantByUserId(userId: string) {
    setState((prev) =>
      applyUpdate(activityId, seedKey, initialParticipants, prev, (base) =>
        base.filter((p) => p.user_id !== userId),
      ),
    );
  }

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return;
    }

    const supabase = createClient();
    const channelId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    const channel = supabase
      .channel(`participants:${activityId}:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `activity_id=eq.${activityId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as { id: string; user_id: string };
            void supabase
              .from("profiles")
              .select(profileColumns)
              .eq("id", row.user_id)
              .single()
              .then(({ data: profile }) => {
                setState((prev) =>
                  applyUpdate(
                    activityId,
                    seedKey,
                    initialParticipants,
                    prev,
                    (base) => [
                      // Replace any existing entry for this user (an optimistic
                      // or self entry) with the canonical row, keyed on user_id.
                      ...base.filter((p) => p.user_id !== row.user_id),
                      {
                        id: row.id,
                        user_id: row.user_id,
                        profiles: (profile as Profile | null) ?? null,
                      },
                    ],
                  ),
                );
              });
          }

          if (payload.eventType === "DELETE") {
            const row = payload.old as { id?: string; user_id?: string };
            setState((prev) =>
              applyUpdate(
                activityId,
                seedKey,
                initialParticipants,
                prev,
                (base) =>
                  base.filter(
                    (p) =>
                      (row.id === undefined || p.id !== row.id) &&
                      (row.user_id === undefined || p.user_id !== row.user_id),
                  ),
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // Re-subscribe only when the activity or its seed membership changes, not on
    // every parent render that hands us a new array reference. initialParticipants
    // and profileColumns are captured intentionally; they are stable per seed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId, seedKey]);

  return {
    participants,
    participantCount: participants.length,
    addParticipant,
    removeParticipantByUserId,
  };
}
