import React from 'react';
import { BarChart3 } from 'lucide-react';

interface ChartItem {
  label: string;
  value: number;
  color?: string;
}

interface ChartPayload {
  type?: 'bar' | 'donut';
  title?: string;
  unit?: string;
  items: ChartItem[];
}

const CHART_PALETTE = [
  '#0b4a3a',
  '#10634e',
  '#2d7a5e',
  '#3e9c79',
  '#d97706',
  '#0284c7',
];

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={key++} className="font-semibold text-stone-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={key++} className="italic text-stone-700">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 text-[#063428] font-mono text-[11px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

const ChartBlock: React.FC<{ rawJson: string }> = ({ rawJson }) => {
  let parsed: ChartPayload | null = null;
  try {
    const candidate = JSON.parse(rawJson.trim());
    if (candidate && Array.isArray(candidate.items) && candidate.items.length > 0) {
      parsed = {
        type: candidate.type === 'donut' ? 'donut' : 'bar',
        title: typeof candidate.title === 'string' ? candidate.title : undefined,
        unit: typeof candidate.unit === 'string' ? candidate.unit : '',
        items: candidate.items
          .filter((it: any) => it && typeof it.label === 'string' && Number.isFinite(Number(it.value)))
          .map((it: any) => ({
            label: String(it.label),
            value: Number(it.value),
            color: typeof it.color === 'string' ? it.color : undefined,
          })),
      };
    }
  } catch {
    return null;
  }

  if (!parsed || parsed.items.length === 0) return null;

  const total = parsed.items.reduce((sum, it) => sum + Math.max(0, it.value), 0);
  const maxVal = Math.max(...parsed.items.map((it) => Math.abs(it.value)), 1);
  const unitSuffix = parsed.unit ? ` ${parsed.unit}` : '';

  if (parsed.type === 'donut' && total > 0) {
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
      <div className="my-2.5 rounded-lg border border-stone-200 bg-white p-3.5 shadow-2xs">
        <div className="flex items-center gap-1.5 mb-3">
          <BarChart3 className="w-3.5 h-3.5 text-[#10634e] shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#063428]">
            {parsed.title || 'Répartition visuelle'}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <svg viewBox="0 0 100 100" className="w-24 h-24 shrink-0 -rotate-90">
            {parsed.items.map((item, idx) => {
              const val = Math.max(0, item.value);
              const segLen = (val / total) * circumference;
              const color = item.color || CHART_PALETTE[idx % CHART_PALETTE.length];
              const el = (
                <circle
                  key={idx}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={color}
                  strokeWidth="14"
                  strokeDasharray={`${segLen} ${circumference - segLen}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += segLen;
              return el;
            })}
          </svg>
          <div className="flex-1 w-full space-y-1.5">
            {parsed.items.map((item, idx) => {
              const pct = total > 0 ? Math.round((Math.max(0, item.value) / total) * 100) : 0;
              const color = item.color || CHART_PALETTE[idx % CHART_PALETTE.length];
              return (
                <div key={idx} className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-stone-700 truncate">{item.label}</span>
                  </div>
                  <span className="font-mono-numbers font-bold text-[#063428] shrink-0">
                    {item.value}
                    {unitSuffix} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-2.5 rounded-lg border border-stone-200 bg-white p-3.5 shadow-2xs">
      <div className="flex items-center gap-1.5 mb-2.5">
        <BarChart3 className="w-3.5 h-3.5 text-[#10634e] shrink-0" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#063428]">
          {parsed.title || 'Graphique comparatif'}
        </span>
      </div>
      <div className="space-y-2">
        {parsed.items.map((item, idx) => {
          const widthPct = Math.max(4, Math.min(100, (Math.abs(item.value) / maxVal) * 100));
          const color = item.color || CHART_PALETTE[idx % CHART_PALETTE.length];
          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-medium text-stone-700 truncate">{item.label}</span>
                <span className="font-mono-numbers font-bold text-[#063428] shrink-0">
                  {item.value}
                  {unitSuffix}
                </span>
              </div>
              <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${widthPct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|');
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c.trim()));
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function renderTextSegment(segment: string, keyPrefix: string): React.ReactNode[] {
  const lines = segment.replace(/\r\n/g, '\n').split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Markdown table: header row + separator row + body rows
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const headers = splitTableRow(lines[i]);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes('|') && !isTableSeparator(lines[i])) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }

      nodes.push(
        <div key={`${keyPrefix}-tbl-${i}`} className="my-2.5 overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-left border-collapse text-[11.5px]">
            <thead>
              <tr className="bg-[#edf5f0] border-b border-stone-200">
                {headers.map((h, hIdx) => (
                  <th key={hIdx} className="px-2.5 py-2 font-bold text-[#063428] whitespace-nowrap">
                    {renderInlineMarkdown(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-stone-50/60' : 'bg-white'}>
                  {headers.map((_, cIdx) => (
                    <td key={cIdx} className="px-2.5 py-1.5 text-stone-700 align-top leading-snug">
                      {renderInlineMarkdown(row[cIdx] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Headings (#, ##, ###, ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const cls =
        level <= 2
          ? 'text-[13px] font-extrabold text-[#063428] mt-3 mb-1 border-b border-stone-200/80 pb-1'
          : 'text-xs font-bold text-[#0b4a3a] mt-2.5 mb-1';
      nodes.push(
        <div key={`${keyPrefix}-h-${i}`} className={cls}>
          {renderInlineMarkdown(content)}
        </div>
      );
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      nodes.push(
        <div
          key={`${keyPrefix}-q-${i}`}
          className="my-2 pl-3 pr-2.5 py-1.5 border-l-2 border-[#10634e] bg-[#edf5f0]/60 rounded-r-md text-[11.5px] text-stone-700 space-y-0.5"
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx}>{renderInlineMarkdown(ql)}</p>
          ))}
        </div>
      );
      continue;
    }

    // Unordered list
    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i++;
      }
      nodes.push(
        <ul key={`${keyPrefix}-ul-${i}`} className="my-1.5 space-y-1 pl-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-stone-800 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#10634e] shrink-0" />
              <span>{renderInlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: Array<{ num: string; text: string }> = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        const m = lines[i].trim().match(/^(\d+)[.)]\s+(.+)$/);
        if (m) items.push({ num: m[1], text: m[2] });
        i++;
      }
      nodes.push(
        <ol key={`${keyPrefix}-ol-${i}`} className="my-1.5 space-y-1 pl-0.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-stone-800 leading-relaxed">
              <span className="font-mono-numbers font-bold text-[#0b4a3a] shrink-0 min-w-[16px]">
                {item.num}.
              </span>
              <span>{renderInlineMarkdown(item.text)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      nodes.push(<hr key={`${keyPrefix}-hr-${i}`} className="my-2 border-stone-200" />);
      i++;
      continue;
    }

    // Standard paragraph (collect consecutive non-special lines)
    const paraLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i].trim();
      if (
        !cur ||
        /^#{1,4}\s+/.test(cur) ||
        cur.startsWith('>') ||
        /^[-*•]\s+/.test(cur) ||
        /^\d+[.)]\s+/.test(cur) ||
        /^[-*_]{3,}$/.test(cur) ||
        (cur.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
      ) {
        break;
      }
      paraLines.push(cur);
      i++;
    }
    if (paraLines.length > 0) {
      nodes.push(
        <p key={`${keyPrefix}-p-${i}`} className="text-xs text-stone-800 leading-[1.65] my-1.5">
          {renderInlineMarkdown(paraLines.join(' '))}
        </p>
      );
    }
  }

  return nodes;
}

export const AssistantMessageRenderer: React.FC<{ content: string }> = ({ content }) => {
  const parts: Array<{ type: 'text' | 'chart'; value: string }> = [];
  const fenceRegex = /```(?:chart|json-chart)\s*\n([\s\S]*?)```/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'chart', value: match[1] });
    lastIndex = fenceRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return (
    <div className="space-y-1.5">
      {parts.map((part, idx) =>
        part.type === 'chart' ? (
          <ChartBlock key={`chart-${idx}`} rawJson={part.value} />
        ) : (
          <React.Fragment key={`text-${idx}`}>
            {renderTextSegment(part.value, `seg-${idx}`)}
          </React.Fragment>
        )
      )}
    </div>
  );
};
