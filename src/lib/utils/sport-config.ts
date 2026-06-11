// Single tag palette across all sports — brand uses one unified sport tag color
const TAG = { bg: "#C8E6DC", text: "#1A6B52" };
const OTHER_TAG = { bg: "#E2DBD3", text: "#7A6A5A" };

export const SPORT_COLORS: Record<string, { bg: string; text: string }> = {
  running:     TAG,
  walking:     TAG,
  hiking:      TAG,
  gym:         TAG,
  yoga:        TAG,
  cycling:     TAG,
  pickleball:  TAG,
  tennis:      TAG,
  swimming:    TAG,
  soccer:      TAG,
  basketball:  TAG,
  boxing:      TAG,
  golf:        TAG,
  pilates:     TAG,
  paddleboard: TAG,
  other:       OTHER_TAG,
};

export function getSportLabel(sport: string): string {
  return sport.charAt(0).toUpperCase() + sport.slice(1);
}

export const SPORTS_LIST = [
  "All",
  "Running",
  "Walking",
  "Hiking",
  "Gym",
  "Yoga",
  "Cycling",
  "Pickleball",
  "Tennis",
  "Swimming",
  "Soccer",
  "Basketball",
  "Boxing",
  "Golf",
  "Pilates",
  "Paddleboard",
  "Other",
];
