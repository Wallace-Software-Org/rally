import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";
import { createClient } from "@/lib/supabase/server";
import { getInvitePhrase } from "@/lib/utils/invite-phrase";

async function loadFonts() {
  const [bold, medium] = await Promise.all([
    readFile(join(process.cwd(), "public/fonts/Quicksand-Bold.ttf")),
    readFile(join(process.cwd(), "public/fonts/Quicksand-Medium.ttf")),
  ]);
  return [
    { name: "Quicksand", data: bold.buffer as ArrayBuffer, weight: 700 as const, style: "normal" as const },
    { name: "Quicksand", data: medium.buffer as ArrayBuffer, weight: 500 as const, style: "normal" as const },
  ];
}

const WIDTH = 1080;
const HEIGHT = 1920;
const CACHE_CONTROL = "public, max-age=3600";
const APP_TIME_ZONE = "America/Phoenix";
const BG = "#4A9B8E";
const CREAM = "#E8DCC8";
const CONTENT_WIDTH = WIDTH - 160; // 80px padding each side

// Derive the largest font size where the longest word in the phrase still fits
// within the content width. Quicksand Bold has an empirical ~0.62 width-to-size
// ratio for mixed-case latin text. Each word now occupies its own line so the
// cap is 220px (short words). Floor stays at 72px.
function getHeadlineFontSize(phrase: string): number {
  const maxWordLen = Math.max(...phrase.split(" ").map((w) => w.length));
  return Math.min(220, Math.max(72, Math.floor(CONTENT_WIDTH / (maxWordLen * 0.62))));
}

type ActivityCardData = {
  sport: string;
  starts_at: string;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function formatInviteDate(startsAt: string): string {
  const date = new Date(startsAt);
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: APP_TIME_ZONE,
  });
  // Within the current week (7 days or fewer out): weekday name, for example
  // "Saturday". Further out: full month and day, for example "July 18".
  const withinWeek = date.getTime() - Date.now() <= WEEK_MS;
  const datePart = withinWeek
    ? date.toLocaleDateString("en-US", {
        weekday: "long",
        timeZone: APP_TIME_ZONE,
      })
    : date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        timeZone: APP_TIME_ZONE,
      });
  return `${datePart}, ${time}`;
}

async function getActivityCardData(id: string) {
  const supabase = await createClient();

  const { data: activity, error } = await supabase
    .from("activities")
    .select("sport, starts_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!activity) return null;

  return activity as ActivityCardData;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const cardData = await getActivityCardData(id);
    if (!cardData) {
      return new Response("Activity not found", { status: 404 });
    }

    const phrase = getInvitePhrase(cardData.sport);
    const dateTime = formatInviteDate(cardData.starts_at);
    const headlineFontSize = getHeadlineFontSize(phrase);
    const fonts = await loadFonts();

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: BG,
            padding: 80,
            fontFamily: "Quicksand",
          }}
        >
          {/* Headline + date/time — left-aligned, vertically centered */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: headlineFontSize,
                fontWeight: 700,
                color: CREAM,
                lineHeight: 1.05,
                letterSpacing: -1,
              }}
            >
              {phrase.split(" ").map((word, i) => (
                <div key={i} style={{ display: "flex" }}>
                  {word.charAt(0).toUpperCase() + word.slice(1)}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 48,
                fontSize: 52,
                fontWeight: 500,
                color: CREAM,
                opacity: 0.6,
                letterSpacing: 0,
                lineHeight: 1,
              }}
            >
              {dateTime}
            </div>
          </div>

          {/* Rally wordmark — bottom right, cream dot */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 999,
                backgroundColor: CREAM,
                opacity: 0.6,
                marginRight: 20,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                display: "flex",
                fontSize: 96,
                fontWeight: 700,
                color: CREAM,
                letterSpacing: -3,
                lineHeight: 1,
              }}
            >
              Rally
            </div>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        fonts,
        headers: { "cache-control": CACHE_CONTROL },
      },
    );
  } catch (error) {
    console.error("Failed to generate activity card image", error);
    return new Response("Failed to generate activity card image", {
      status: 500,
    });
  }
}
