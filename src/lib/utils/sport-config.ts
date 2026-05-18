// Single tag palette across all sports — brand uses one unified sport tag color
const TAG = { bg: "#C8E6DC", text: "#1A6B52" };

export const SPORT_COLORS: Record<string, { bg: string; text: string }> = {
  pickleball:  TAG,
  running:     TAG,
  boxing:      TAG,
  hiking:      TAG,
  gym:         TAG,
  paddleboard: TAG,
};

export function getSportLabel(sport: string): string {
  return sport.charAt(0).toUpperCase() + sport.slice(1);
}

export const SPORTS_LIST = [
  "All",
  "Pickleball",
  "Running",
  "Boxing",
  "Hiking",
  "Gym",
  "Paddleboard",
];
