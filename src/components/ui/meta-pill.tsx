export default function MetaPill({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <span className="tag-warm rounded-full px-3 py-1 text-xs font-medium inline-flex items-center gap-1.5 self-start">
      {icon}
      {children}
    </span>
  );
}
