import type { ReactNode } from "react";

/** Minimal markdown: **bold**, newlines — RTL-friendly */
export default function SimpleArabicMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2 text-right leading-relaxed" dir="rtl">
      {lines.map((line, i) => {
        const t = line.trim();
        if (!t) return <div key={i} className="h-1" />;
        return (
          <p key={i} className="whitespace-pre-wrap">
            {formatLine(t)}
          </p>
        );
      })}
    </div>
  );
}

function formatLine(line: string): ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, j) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={j} className="font-bold text-white">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={j}>{p}</span>;
  });
}
