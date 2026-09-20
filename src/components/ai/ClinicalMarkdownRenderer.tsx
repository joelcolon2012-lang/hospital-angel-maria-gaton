import React from 'react';

interface Props {
  content: string;
  isStreaming?: boolean;
}

export const ClinicalMarkdownRenderer: React.FC<Props> = ({ content, isStreaming = false }) => {
  if (!content) return null;

  // Parser simple, robusto y seguro de markdown médico
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];

  let inList = false;
  let listItems: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushList = (key: string) => {
    if (inList && listItems.length > 0) {
      renderedElements.push(
        <ul key={key} className="space-y-1.5 my-2.5 pl-5 list-disc text-slate-700 text-xs">
          {listItems}
        </ul>
      );
      inList = false;
      listItems = [];
    }
  };

  const flushTable = (key: string) => {
    if (inTable && tableRows.length > 0) {
      const header = tableRows[0];
      const body = tableRows.slice(1).filter(r => !r.every(c => /^[-:]+$/.test(c.trim())));

      renderedElements.push(
        <div key={key} className="my-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-teal-50/80 border-b border-teal-200 text-teal-900 font-bold">
                {header.map((col, idx) => (
                  <th key={idx} className="p-2 border-r border-teal-200/50 last:border-r-0">
                    {formatInline(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2 border-r border-slate-100 last:border-r-0 text-slate-700">
                      {formatInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      inTable = false;
      tableRows = [];
    }
  };

  const formatInline = (text: string): React.ReactNode => {
    // 1. Negrita **texto**
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 text-teal-800 font-mono text-[10.5px] border border-slate-200">{part.slice(1, -1)}</code>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={idx} className="italic text-slate-800">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    // Tabla markdown: | Col 1 | Col 2 |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList(`flush-list-${lineIdx}`);
      inTable = true;
      const cells = trimmed.slice(1, -1).split('|').map(c => c.trim());
      tableRows.push(cells);
      return;
    } else if (inTable) {
      flushTable(`flush-table-${lineIdx}`);
    }

    // Encabezados
    if (trimmed.startsWith('### ')) {
      flushList(`flush-list-${lineIdx}`);
      renderedElements.push(
        <h4 key={lineIdx} className="font-bold text-slate-900 text-xs sm:text-sm mt-3 mb-1.5 flex items-center gap-1.5 text-[#0F4C5C]">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
          <span>{formatInline(trimmed.slice(4))}</span>
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList(`flush-list-${lineIdx}`);
      renderedElements.push(
        <h3 key={lineIdx} className="font-black text-slate-900 text-sm sm:text-base mt-4 mb-2 pb-1 border-b border-slate-200 flex items-center gap-2 text-[#0F4C5C]">
          <span>{formatInline(trimmed.slice(3))}</span>
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushList(`flush-list-${lineIdx}`);
      renderedElements.push(
        <h2 key={lineIdx} className="font-black text-slate-900 text-base sm:text-lg mt-4 mb-2 text-[#0F4C5C]">
          {formatInline(trimmed.slice(2))}
        </h2>
      );
      return;
    }

    // Citas / Blockquotes
    if (trimmed.startsWith('> ')) {
      flushList(`flush-list-${lineIdx}`);
      renderedElements.push(
        <div key={lineIdx} className="my-2.5 p-2.5 bg-teal-50/60 border-l-4 border-[#0F4C5C] rounded-r-xl text-xs text-teal-950 font-medium">
          {formatInline(trimmed.slice(2))}
        </div>
      );
      return;
    }

    // Elementos de lista
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      listItems.push(
        <li key={lineIdx} className="leading-relaxed">
          {formatInline(trimmed.slice(2))}
        </li>
      );
      return;
    }

    // Elementos numerados
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      inList = true;
      listItems.push(
        <li key={lineIdx} className="leading-relaxed list-decimal">
          {formatInline(numMatch[2])}
        </li>
      );
      return;
    }

    // Si había una lista acumulada y ya no es línea de lista
    flushList(`flush-list-${lineIdx}`);

    // Línea vacía
    if (!trimmed) {
      return;
    }

    // Párrafo regular
    renderedElements.push(
      <p key={lineIdx} className="text-xs sm:text-[12.5px] leading-relaxed text-slate-700 my-1.5 font-normal">
        {formatInline(trimmed)}
      </p>
    );
  });

  flushList('final-list');
  flushTable('final-table');

  return (
    <div className="space-y-1 text-xs">
      {renderedElements}
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-[#0F4C5C] animate-pulse align-middle" />
      )}
    </div>
  );
};
