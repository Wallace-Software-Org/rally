"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type RealtimeParticipant<Profile> = {
  id: string;
  user_id: string;
  profiles: Profile | null;
};

type State<Profile> = {
  activityId: string;
  seedLength: number;
  participants: RealtimeParticipant<Profile>[];
};

// Produce the next state from a transform applied to the in-sync base list. If
// the server seed changed (activity navigation or refetch) the prev state is
// stale, so fall back to the fresh seed before transforming.
function applyUpdate<Profile>(
  activityId: string,
  seedLength: number,
  seed: RealtimeParticipant<Profile>[],
  prev: State<Profile>,
  transform: (
    base: RealtimeParticipant<Profile>[],
  ) => RealtimeParticipant<Profile>[],
): State<Profile> {
  const inSync = prev.activityId === activityId && prev.seedLength === seedLength;
  const base = inSync ? prev.participants : seed;
  return { activityId, seedLength, participants: transform(base) };
}

/**
 * Maintains a live participant list for one activity via Supabase realtime.
 * INSERT fetches the new user's profile and appends; DELETE removes by row id.
 * Both dedupe by user_id so an acting user's optimistic entry is not doubled
 * when its own realtime echo arrives (the echo replaces the optimistic row and
 * upgrades it to the canonical row id).
 *
 * Profile columns are caller-supplied so each surface fetches only what it
 * renders. Count derives from the list length.
 *
 * DELETE delivery note: the subscription filters on activity_id, which is not
 * the primary key, so the participants table must have REPLICA IDENTITY FULL
 * for DELETE old-records to carry activity_id (and the row id). Without it,
 * joins still appear but leaves will not until reload.
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
  const seedLength = initialParticipants.length;

  const [state, setState] = useState<State<Profile>>(() => ({
    activityId,
    seedLength,
    participants: initialParticipants,
  }));

  // When the server prop changes (navigation or refetch), fall back to the new
  // seed until the next update commits fresh state under the new key.
  const isSync =
    state.activityId === activityId && state.seedLength === seedLength;
  const participants = isSync ? state.participants : initialParticipants;

  function addParticipant(participant: RealtimeParticipant<Profile>) {
    setState((prev) =>
      applyUpdate(activityId, seedLength, initialParticipants, prev, (base) => [
        ...base.filter((p) => p.user_id !== participant.user_id),
        participant,
      ]),
    );
  }

  function removeParticipantByUserId(userId: string) {
    setState((prev) =>
      applyUpdate(activityId, seedLength, initialParticipants, prev, (base) =>
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
                    seedLength,
                    initialParticipants,
                    prev,
                    (base) => [
                      // Idempotent on the canonical row id and dedupe any
                      // optimistic/self entry sharing this user_id.
                      ...base.filter(
                        (p) => p.id !== row.id && p.user_id !== row.user_id,
                      ),
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
                seedLength,
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
    // Re-subscribe only when the activity or its server seed changes, not on
    // every parent render that hands us a new array reference. initialParticipants
    // and profileColumns are captured intentionally; they are stable per seed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId, seedLength]);

  return {
    participants,
    participantCount: participants.length,
    addParticipant,
    removeParticipantByUserId,
  };
}
