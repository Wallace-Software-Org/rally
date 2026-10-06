import type { Metadata } from "next";
import BackButton from "@/components/ui/back-button";
import WaiverText from "@/components/activities/waiver-text";
import { WAIVER_TYPES, WAIVERS } from "@/lib/waivers";

export const metadata: Metadata = {
  title: "Waivers | Rally",
  description: "The agreements you accept to join or post an activity on Rally.",
};

// Public: readable logged out, so the join modal's link and a shared link both
// work. Renders straight from src/lib/waivers.ts, the same source the modals and
// the stored acceptance records use.
export default function WaiverPage() {
  return (
    <>
      <BackButton />
      <div className="page-with-back flex-1 overflow-y-auto bg-brand-bg">
        <div className="px-4 py-6 xl:py-8 max-w-2xl mx-auto w-full flex flex-col gap-8">
          <h1 className="text-xl font-semibold text-brand-text">Waivers</h1>

          {WAIVER_TYPES.map((type) => {
            const waiver = WAIVERS[type];
            return (
              <section
                key={type}
                aria-labelledby={`waiver-${type}`}
                className="flex flex-col gap-3 border-t border-brand-border pt-6"
              >
                <div className="flex flex-col gap-1">
                  <h2
                    id={`waiver-${type}`}
                    className="text-base font-semibold text-brand-text"
                  >
                    {waiver.title}
                  </h2>
                  <p className="text-xs text-brand-muted">
                    Version {waiver.version}
                    {type === "participant"
                      ? ", accepted the first time you join an activity"
                      : ", accepted the first time you post an activity"}
                  </p>
                </div>
                <WaiverText text={waiver.text} />
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
