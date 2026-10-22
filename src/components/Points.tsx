import { toPoints } from '@/lib/project/points';

type Props = { text: string; label?: string; className?: string };

/** A card text as a short line, or as a bullet list when it holds several points. */
export function Points({ text, label, className }: Props) {
  const points = toPoints(text);
  if (points.length === 0) return null;
  if (points.length === 1) {
    return (
      <p className={className}>
        {label && <span className="font-medium">{label}: </span>}
        {points[0]}
      </p>
    );
  }
  return (
    <div className={className}>
      {label && <p className="font-medium">{label}:</p>}
      <ul className="list-disc space-y-0.5 pl-5">
        {points.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
