// Emoji are stripped — @vercel/og/satori requires a dedicated emoji font
// (e.g. Noto Emoji) loaded in the ImageResponse fonts array to render them.
// Add an emoji font to /public/fonts/ and the route's loadFonts() to re-enable.
const INVITE_PHRASES: Record<string, string> = {
  running: "Let's go running!",
  pickleball: "Let's go play pickleball!",
  paddleboard: "Let's go paddleboarding!",
  boxing: "Let's go boxing!",
  hiking: "Let's go hiking!",
  cycling: "Let's go cycling!",
  swimming: "Let's go swimming!",
  gym: "Let's go lift!",
  yoga: "Let's go do yoga!",
  pilates: "Let's go do pilates!",
  tennis: "Let's go play tennis!",
  soccer: "Let's go play soccer!",
  basketball: "Let's go play basketball!",
  golf: "Let's go play golf!",
  walking: "Let's go for a walk!",
  other: "Let's go!",
};

export function getInvitePhrase(sport: string): string {
  return INVITE_PHRASES[sport.trim().toLowerCase()] ?? "Let's go!";
}
