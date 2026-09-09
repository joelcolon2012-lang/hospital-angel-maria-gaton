import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`p-8 sm:p-12 text-center flex flex-col items-center justify-center rounded-[20px] bg-slate-50/50 border border-dashed border-slate-200 ${className}`}>
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-400 mb-3.5">
          <Icon className="w-6 h-6 stroke-[1.5]" />
        </div>
      )}
      <h4 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h4>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
