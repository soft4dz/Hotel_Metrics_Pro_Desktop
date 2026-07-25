import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'table'; rows: string[][] };

function parseInline(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="rounded bg-muted px-1 py-0.5 text-sm">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function parseMarkdown(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: line.slice(2).trim() });
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3).trim() });
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.slice(4).trim() });
      i++;
      continue;
    }
    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!lines[i].includes('---')) {
          rows.push(
            lines[i].split('|').slice(1, -1).map((c) => c.trim()),
          );
        }
        i++;
      }
      if (rows.length) blocks.push({ type: 'table', rows });
      continue;
    }
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, '').trim());
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, '').trim());
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }
    if (line.trim() === '') {
      i++;
      continue;
    }
    if (line.startsWith('```')) {
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'p', text: codeLines.join('\n') });
      i++;
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith('#') && !lines[i].startsWith('|') && !/^[-*]\s/.test(lines[i]) && !/^\d+\.\s/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'p', text: para.join(' ') });
  }

  return blocks;
}

interface Props {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: Props) {
  const blocks = parseMarkdown(content);

  return (
    <article className={cn('prose prose-sm max-w-none dark:prose-invert space-y-4', className)}>
      {blocks.map((block, idx) => {
        if (block.type === 'h1') {
          return <h1 key={idx} className="text-2xl font-bold tracking-tight">{parseInline(block.text)}</h1>;
        }
        if (block.type === 'h2') {
          return <h2 key={idx} className="text-lg font-semibold mt-6 border-b pb-1">{parseInline(block.text)}</h2>;
        }
        if (block.type === 'h3') {
          return <h3 key={idx} className="text-base font-semibold mt-4">{parseInline(block.text)}</h3>;
        }
        if (block.type === 'ul') {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1">
              {block.items.map((item, j) => (
                <li key={j}>{parseInline(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={idx} className="list-decimal pl-5 space-y-1">
              {block.items.map((item, j) => (
                <li key={j}>{parseInline(item)}</li>
              ))}
            </ol>
          );
        }
        if (block.type === 'table') {
          const [head, ...body] = block.rows;
          return (
            <div key={idx} className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                {head && (
                  <thead className="bg-muted/50">
                    <tr>{head.map((c, j) => <th key={j} className="px-3 py-2 text-left font-medium">{parseInline(c)}</th>)}</tr>
                  </thead>
                )}
                <tbody>
                  {body.map((row, ri) => (
                    <tr key={ri} className="border-t">{row.map((c, ci) => <td key={ci} className="px-3 py-2">{parseInline(c)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return <p key={idx} className="leading-relaxed text-muted-foreground">{parseInline(block.text)}</p>;
      })}
    </article>
  );
}
