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

// Used by AppNav — includes username so the avatar can link to own profile
export type Profile = {
  avatar_url: string | null;
  full_name: string;
  city: string | null;
  username: string | null;
} | null;

// ── Detail page types ────────────────────────────────────────────────────────

export type DetailParticipantProfile = {
  full_name: string;
  avatar_url: string | null;
  instagram_handle: string | null;
  username: string | null;
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
  username: string | null;
};

// ── Profile page types ───────────────────────────────────────────────────────

export type ProfileActivity = {
  id: string;
  title: string;
  sport: string;
  location_name: string;
  skill_level: string | null;
  starts_at: string;
};

export type ProfilePage = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  instagram_handle: string | null;
  sports: string[];
  hosted_count: number;
  attended_count: number;
  going: ProfileActivity[];
  hosting: ProfileActivity[];
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
