export const SPORT_COLORS: Record<string, { bg: string; text: string }> = {
  pickleball: { bg: "#E1F5EE", text: "#0F6E56" },
  running: { bg: "#EAF3DE", text: "#3B6D11" },
  boxing: { bg: "#FAEEDA", text: "#854F0B" },
  hiking: { bg: "#EAF3DE", text: "#3B6D11" },
  gym: { bg: "#E6F1FB", text: "#185FA5" },
  paddleboard: { bg: "#E1F5EE", text: "#0F6E56" },
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
