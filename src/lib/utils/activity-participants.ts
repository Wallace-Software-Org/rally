type ParticipantWithProfile<Profile> = {
  id: string;
  user_id: string;
  profiles: Profile | null;
};

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
