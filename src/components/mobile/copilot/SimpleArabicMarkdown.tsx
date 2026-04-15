import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Minimal markdown: **bold**, tables (| a | b |), newlines — RTL-friendly */
export default function SimpleArabicMarkdown({ text, className }: { text: string; className?: string }) {
  const blocks = splitIntoBlocks(text);
  return (
    <div className={cn("space-y-2 text-right leading-relaxed", className)} dir="rtl">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

type Block =
  | { kind: "table"; rows: string[][] }
  | { kind: "lines"; lines: string[] };

function splitIntoBlocks(raw: string): Block[] {
  const lines = raw.split("\n");
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isTableLine(line) && !isMarkdownTableSeparator(line)) {
      const rows: string[][] = [];
      while (i < lines.length && isTableLine(lines[i])) {
        if (!isMarkdownTableSeparator(lines[i])) {
          rows.push(parseTableRow(lines[i]!));
        }
        i++;
      }
      if (rows.length) out.push({ kind: "table", rows });
      continue;
    }
    const chunk: string[] = [];
    while (i < lines.length && !isTableLine(lines[i])) {
      chunk.push(lines[i]);
      i++;
    }
    if (chunk.length) out.push({ kind: "lines", lines: chunk });
  }
  return out;
}

function isTableLine(line: string | undefined): boolean {
  if (!line || !line.trim()) return false;
  const t = line.trim();
  return t.includes("|") && t.split("|").filter(Boolean).length >= 2;
}

function isMarkdownTableSeparator(line: string | undefined): boolean {
  if (!line?.trim()) return false;
  const t = line.trim();
  return t.includes("|") && /^[\s|:\-]+$/.test(t) && /-{2,}/.test(t);
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function Block({ block }: { block: Block }) {
  if (block.kind === "table") {
    const [header, ...rest] = block.rows;
    if (!header?.length) return null;
    return (
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
        <table className="w-full min-w-[200px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-white/10">
              {header.map((h, j) => (
                <th key={j} className="px-3 py-2 text-xs font-bold text-zinc-300">
                  {formatLine(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rest.map((row, ri) => (
              <tr key={ri} className="border-b border-white/5 last:border-0">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 align-top text-zinc-100">
                    {formatLine(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <>
      {block.lines.map((line, i) => {
        const t = line.trim();
        if (!t) return <div key={i} className="h-1" />;
        return (
          <p key={i} className="whitespace-pre-wrap">
            {formatLine(t)}
          </p>
        );
      })}
    </>
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
