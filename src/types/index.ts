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
