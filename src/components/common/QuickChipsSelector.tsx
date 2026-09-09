import React from 'react';
import { PlusCircle } from 'lucide-react';

interface Props {
  chips: string[];
  onSelectChip: (text: string) => void;
  title?: string;
}

export const QuickChipsSelector: React.FC<Props> = ({ chips, onSelectChip, title }) => {
  return (
    <div className="my-1.5">
      {title && (
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
          {title}
        </span>
      )}
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectChip(chip)}
            className="inline-flex items-center gap-1 text-[11px] bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/80 px-2 py-0.5 rounded-full transition-colors active:scale-95 text-left"
          >
            <PlusCircle className="w-3 h-3 text-teal-600 shrink-0" />
            <span>{chip}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
