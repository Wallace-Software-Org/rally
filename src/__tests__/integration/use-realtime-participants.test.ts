import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRealtimeParticipants } from "@/hooks/use-realtime-participants";

type Handler = (payload: {
  eventType: "INSERT" | "DELETE";
  new?: { id: string; user_id: string };
  old?: { id?: string; user_id?: string };
}) => void;

// Captures the postgres_changes handler so tests can fire realtime events, and
// stubs the per-insert profile fetch.
const { captured, removeChannel } = vi.hoisted(() => ({
  captured: { handler: null as Handler | null },
  removeChannel: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => {
    const channel = {
      on: (_event: string, _filter: unknown, handler: Handler) => {
        captured.handler = handler;
        return channel;
      },
      subscribe: () => channel,
    };
    return {
      channel: () => channel,
      removeChannel,
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: { full_name: "User", avatar_url: null },
              }),
          }),
        }),
      }),
    };
  },
}));

type P = { full_name: string; avatar_url: string | null };
const seed = (...userIds: string[]) =>
  userIds.map((u) => ({ id: `local-${u}`, user_id: u, profiles: null }));

async function fireInsert(userId: string, rowId = `row-${userId}`) {
  await act(async () => {
    captured.handler?.({
      eventType: "INSERT",
      new: { id: rowId, user_id: userId },
    });
  });
}

beforeEach(() => {
  captured.handler = null;
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("useRealtimeParticipants dedupe", () => {
  it("optimistic join + realtime INSERT for the same user yields one entry", async () => {
    // Feed-style optimism: the viewer's entry is already in the seed.
    const { result } = renderHook(() =>
      useRealtimeParticipants<P>({
        activityId: "act-1",
        initialParticipants: seed("u1"),
        profileColumns: "full_name, avatar_url",
      }),
    );
    expect(result.current.participantCount).toBe(1);

    // The realtime echo for the same user must replace, not append.
    await fireInsert("u1");
    expect(result.current.participantCount).toBe(1);
    expect(result.current.participants.map((p) => p.user_id)).toEqual(["u1"]);
    // Upgraded to the canonical row id.
    expect(result.current.participants[0].id).toBe("row-u1");
  });

  it("leaving (seed drops the user) yields zero and the correct count", async () => {
    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) =>
        useRealtimeParticipants<P>({
          activityId: "act-1",
          initialParticipants: seed(...ids),
          profileColumns: "full_name, avatar_url",
        }),
      { initialProps: { ids: ["u1"] } },
    );

    await fireInsert("u1");
    expect(result.current.participantCount).toBe(1);

    // Optimistic leave removes the viewer from the seed.
    rerender({ ids: [] });
    expect(result.current.participantCount).toBe(0);
    expect(result.current.participants).toEqual([]);
  });

  it("realtime INSERT for a different user appends", async () => {
    const { result } = renderHook(() =>
      useRealtimeParticipants<P>({
        activityId: "act-1",
        initialParticipants: seed("u1"),
        profileColumns: "full_name, avatar_url",
      }),
    );

    await fireInsert("u2");
    expect(result.current.participantCount).toBe(2);
    expect(result.current.participants.map((p) => p.user_id)).toEqual([
      "u1",
      "u2",
    ]);
  });
});
