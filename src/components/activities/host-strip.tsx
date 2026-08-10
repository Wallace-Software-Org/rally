import Link from "next/link";
import Avatar from "@/components/ui/avatar";
import { InstagramIcon } from "@/components/ui/icons";

export type HostSummary = {
  username: string;
  // Nullable: the profiles column has no NOT NULL constraint. Avatar and the
  // name row both tolerate a null name.
  full_name: string | null;
  avatar_url: string | null;
  instagram_handle: string | null;
};

// The header row of the personal feed at /feed/[username], sitting where the
// main feed's filter pills go. Avatar and name link to the host's profile; the
// Instagram button (teal outline, matching the profile header) shows only when
// a handle is set. Single row, no bio.
export default function HostStrip({ host }: { host: HostSummary }) {
  const profileHref = `/profile/${host.username}`;

  return (
    <div className="flex items-center gap-3">
      <Link href={profileHref} className="flex-none">
        <Avatar
          src={host.avatar_url}
          name={host.full_name}
          dimension={44}
          className="w-11 h-11 border-[1.5px] border-brand-border"
          initialsClassName="text-sm"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={profileHref}
          className="block truncate text-sm font-semibold text-brand-text hover:underline"
        >
          {host.full_name}
        </Link>
        <span className="block truncate text-xs text-brand-muted">
          @{host.username}
        </span>
      </div>

      {host.instagram_handle && (
        <a
          href={`https://instagram.com/${host.instagram_handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-none flex items-center gap-1.5 rounded-[10px] border border-brand-teal bg-transparent text-brand-teal text-sm font-semibold px-3.5 py-2 hover:bg-brand-teal/15 transition-colors duration-200"
        >
          <InstagramIcon size={14} />
          Instagram
        </a>
      )}
    </div>
  );
}
