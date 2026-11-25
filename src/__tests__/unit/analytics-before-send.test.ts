import { describe, it, expect } from "vitest";
import { beforeSend } from "@/components/ui/analytics";

// beforeSend is the only thing standing between a tracked URL and the real
// data Rally puts in query strings: ?join=true and ?next= on the OAuth
// return, ?activities= and ?view= on the feed, and the prefilled
// ?title=/?lat=/?lng= the repeat flow carries. Paths must survive; query
// strings must not.
describe("analytics beforeSend", () => {
  const pageview = (url: string) => ({ type: "pageview" as const, url });

  it("keeps the path and drops the query string", () => {
    expect(beforeSend(pageview("https://rallytime.xyz/feed/casey?view=calendar")))
      .toEqual({ type: "pageview", url: "https://rallytime.xyz/feed/casey" });
  });

  it("strips the OAuth return params, which carry a destination", () => {
    expect(
      beforeSend(
        pageview("https://rallytime.xyz/login?next=/activity/abc&join=true"),
      ),
    ).toEqual({ type: "pageview", url: "https://rallytime.xyz/login" });
  });

  it("strips the repeat flow's prefilled coordinates", () => {
    expect(
      beforeSend(
        pageview("https://rallytime.xyz/activity/new?lat=33.45&lng=-111.95"),
      ),
    ).toEqual({ type: "pageview", url: "https://rallytime.xyz/activity/new" });
  });

  it("leaves a URL with no query string unchanged", () => {
    expect(beforeSend(pageview("https://rallytime.xyz/activity/abc"))).toEqual({
      type: "pageview",
      url: "https://rallytime.xyz/activity/abc",
    });
  });

  it("preserves the event discriminant rather than forcing pageview", () => {
    expect(beforeSend({ type: "event", url: "https://rallytime.xyz/x?a=1" }))
      .toEqual({ type: "event", url: "https://rallytime.xyz/x" });
  });

  it("drops an unparseable url rather than forwarding it unstripped", () => {
    expect(beforeSend(pageview("/feed/casey?view=calendar"))).toBeNull();
  });
});
