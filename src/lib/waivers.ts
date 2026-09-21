// Waiver content, the single source of truth. Server code always stores the text
// from here (acceptWaiver never accepts text from the client), and the modals and
// the /waiver page render from here.
//
// To change a waiver, edit the text AND raise its version. The accepted check is
// "a row exists with version >= current", so a raised version makes every user
// re-accept on their next join or post. Party name is "Rally" for now; the LLC
// name lands as version 2.

export const WAIVER_TYPES = ["participant", "host"] as const;

export type WaiverType = (typeof WAIVER_TYPES)[number];

export type WaiverDefinition = {
  version: number;
  title: string;
  // Paragraphs separated by a blank line.
  text: string;
  checkboxLabel: string;
};

// The error joinActivity and createActivity return alongside waiverRequired when
// the user has not accepted the current version. The UI keys off waiverRequired.
export const WAIVER_REQUIRED_ERROR = "Waiver required";

export function isWaiverType(value: unknown): value is WaiverType {
  return (
    typeof value === "string" && (WAIVER_TYPES as readonly string[]).includes(value)
  );
}

export const WAIVERS: Record<WaiverType, WaiverDefinition> = {
  participant: {
    version: 1,
    title: "Assumption of Risk and Release of Liability",
    text: [
      "1. Activities carry risk. Outdoor and recreational activities involve risks that cannot be eliminated, including injury, drowning, heat illness, dehydration, falls, collision, equipment failure, wildlife, weather, remote terrain, and the actions of other participants. Medical help may be far away.",
      "2. Rally does not organize activities. Rally does not plan, lead, staff, supervise, inspect, or attend any activity, and does not verify that any description is accurate.",
      "3. Hosts are participants. The person who posted an activity was going to do it anyway and invited company. They are not a guide, instructor, or trip leader, and they are not trained, certified, or vetted by Rally.",
      "4. Rally does not vet anyone. No background checks, identity verification, or skill assessment is performed on any user.",
      "5. You are responsible for yourself. You decide whether an activity suits your ability, fitness, and equipment, and you may leave at any time. You confirm you are physically able to take part.",
      "6. Release. To the fullest extent permitted by Arizona law, you release Rally, its owners, and any host or participant in an activity you join from claims for injury, death, or property damage arising from your participation, including claims based on negligence. This does not cover intentional misconduct or gross negligence.",
    ].join("\n\n"),
    checkboxLabel:
      "I accept the risks and release Rally and hosts from liability.",
  },
  host: {
    version: 1,
    title: "Host Agreement",
    text: [
      "1. You are a participant, not an organizer. You are posting something you were going to do and inviting company. You are not a guide, instructor, or trip leader, and you take on no duty to supervise anyone who joins.",
      "2. You are not running a business. You are not charging, collecting fees, or operating commercially through Rally.",
      "3. You have the right to be there. The activity is lawful at the location you posted, and you have any permission you need to be there.",
      "4. Rally is not liable. Rally does not plan, staff, or attend your activity and is not responsible for anything that happens at it. You agree to cover Rally's costs for any claim arising from an activity you posted.",
    ].join("\n\n"),
    checkboxLabel: "I understand and agree.",
  },
};
