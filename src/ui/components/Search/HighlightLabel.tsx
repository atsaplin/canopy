import type { HighlightRange } from "@core/types";

interface HighlightLabelProps {
  text: string;
  highlights: HighlightRange[];
  className?: string;
}

export function HighlightLabel({ text, highlights, className }: HighlightLabelProps) {
  if (highlights.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  const sorted = [...highlights].sort((a, b) => a.start - b.start);

  for (const { start, end } of sorted) {
    if (start > lastEnd) {
      parts.push(text.slice(lastEnd, start));
    }
    parts.push(
      <mark key={start} className="bg-[var(--color-accent)]/20 text-inherit rounded-sm px-0.5">
        {text.slice(start, end)}
      </mark>,
    );
    lastEnd = end;
  }

  if (lastEnd < text.length) {
    parts.push(text.slice(lastEnd));
  }

  return <span className={className}>{parts}</span>;
}
