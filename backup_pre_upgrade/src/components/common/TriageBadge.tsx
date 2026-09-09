import React from 'react';
import { TriageLevel } from '../../types';

interface Props {
  level: TriageLevel;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const TriageBadge: React.FC<Props> = ({ level, showText = true, size = 'md' }) => {
  const configs: Record<TriageLevel, { bg: string; text: string; label: string; border: string }> = {
    1: { bg: 'bg-red-600', text: 'text-white', label: 'I - Reanimación', border: 'border-red-700' },
    2: { bg: 'bg-amber-500', text: 'text-white', label: 'II - Emergencia', border: 'border-amber-600' },
    3: { bg: 'bg-yellow-400', text: 'text-slate-900', label: 'III - Urgencia', border: 'border-yellow-500' },
    4: { bg: 'bg-emerald-600', text: 'text-white', label: 'IV - Prioritario', border: 'border-emerald-700' },
    5: { bg: 'bg-blue-600', text: 'text-white', label: 'V - No Urgente', border: 'border-blue-700' },
  };

  const config = configs[level] || configs[3];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs sm:text-sm px-2.5 py-1 font-semibold',
    lg: 'text-sm sm:text-base px-3.5 py-1.5 font-bold',
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${config.bg} ${config.text} ${sizeClasses} shadow-sm border ${config.border}`}>
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      {showText ? config.label : `Nivel ${level}`}
    </span>
  );
};
