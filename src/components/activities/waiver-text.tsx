// Renders a waiver's full text, one paragraph per numbered clause. Server-safe (no
// hooks) so the /waiver page renders it without shipping client JS; the modals
// reuse it inside their scroll box.
export default function WaiverText({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3">
      {text.split("\n\n").map((paragraph, i) => (
        <p key={i} className="text-sm leading-relaxed text-brand-text">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
