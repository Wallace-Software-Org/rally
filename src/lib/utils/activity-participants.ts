type ParticipantWithProfile<Profile> = {
  id: string;
  user_id: string;
  profiles: Profile | null;
};

// The exact error joinActivity returns when the atomic capacity check rejects a
// join. The UI keys its immediate "Full" state off this so a rejected join
// reflects Full even before realtime catches up.
export const ACTIVITY_FULL_ERROR = "This activity is full";

// Quick-join login link for logged-out viewers. After Google OAuth the user
// returns to the activity and auto-joins via the next and join params.
export function quickJoinLoginHref(activityId: string): string {
  return `/login?next=/activity/${activityId}&join=true`;
}

// Availability label for an activity's capacity. Singular/plural aware:
// "Open" (no cap), "Full" (none left), "1 spot left", "2 spots left".
export function spotsLeftText(
  maxParticipants: number | null,
  participantCount: number,
): string {
  if (maxParticipants === null) return "Open";

  const spotsLeft = Math.max(0, maxParticipants - participantCount);
  if (spotsLeft === 0) return "Full";

  return `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`;
}

export function getParticipantsWithHostFirst<
  Participant extends ParticipantWithProfile<Profile>,
  Profile,
>({
  participants,
  creatorId,
  hostProfile,
  createHostParticipant,
}: {
  participants: Participant[];
  creatorId: string;
  hostProfile?: Profile | null;
  createHostParticipant?: (profile: Profile | null) => Participant;
}): Participant[] {
  const seenUserIds = new Set<string>();
  const uniqueParticipants = participants.filter((participant) => {
    if (seenUserIds.has(participant.user_id)) return false;
    seenUserIds.add(participant.user_id);
    return true;
  });

  const hostParticipant = uniqueParticipants.find(
    (participant) => participant.user_id === creatorId,
  );
  const otherParticipants = uniqueParticipants.filter(
    (participant) => participant.user_id !== creatorId,
  );

  if (hostParticipant) {
    return [
      hostProfile
        ? ({ ...hostParticipant, profiles: hostProfile } as Participant)
        : hostParticipant,
      ...otherParticipants,
    ];
  }

  if (createHostParticipant) {
    return [createHostParticipant(hostProfile ?? null), ...otherParticipants];
  }

  return otherParticipants;
}
