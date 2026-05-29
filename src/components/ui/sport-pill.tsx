import { getSportLabel } from "@/lib/utils/sport-config";

export default function SportPill({ sport }: { sport: string }) {
  return (
    <span className="tag-teal w-min rounded-full px-2.5 py-0.5 text-xs font-medium">
      {getSportLabel(sport)}
    </span>
  );
}
