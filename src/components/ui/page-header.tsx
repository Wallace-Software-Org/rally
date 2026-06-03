import Link from "next/link";

interface PageHeaderProps {
  title: string;
  backHref?: string;
}

export default function PageHeader({ title, backHref }: PageHeaderProps) {
  return (
    <div className="relative flex items-center justify-center px-4 pt-6 pb-4 max-w-lg mx-auto w-full">
      {backHref && (
        <Link
          href={backHref}
          aria-label="Back"
          className="absolute left-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-brand-avatar-bg transition-colors"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M11 14L6 9l5-5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      )}
      <h1 className="text-base font-semibold text-brand-text">{title}</h1>
    </div>
  );
}
