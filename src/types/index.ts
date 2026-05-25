export type ParticipantProfile = {
  full_name: string;
  avatar_url: string | null;
};

export type Participant = {
  id: string;
  user_id: string;
  profiles: ParticipantProfile | null;
};

export type Activity = {
  id: string;
  creator_id: string;
  title: string;
  sport: string;
  location_name: string;
  starts_at: string;
  max_participants: number | null;
  skill_level: string | null;
  lat: number | null;
  lng: number | null;
};

export type ActivityWithParticipants = Activity & {
  participants: Participant[];
};

export type Profile = {
  avatar_url: string | null;
  full_name: string;
  city: string | null;
} | null;

// ── Detail page types ────────────────────────────────────────────────────────

export type DetailParticipantProfile = {
  full_name: string;
  avatar_url: string | null;
  instagram_handle: string | null;
};

export type DetailParticipant = {
  id: string;
  user_id: string;
  profiles: DetailParticipantProfile | null;
};

export type HostProfile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  instagram_handle: string | null;
};

export type ActivityDetail = {
  id: string;
  title: string;
  sport: string;
  description: string | null;
  location_name: string;
  starts_at: string;
  max_participants: number | null;
  skill_level: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  creator_id: string;
  participants: DetailParticipant[];
  host: HostProfile;
  hosted_count: number;
};
