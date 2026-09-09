import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200/70 rounded-[8px] ${className}`} />
);

export const PatientCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-[16px] p-4 border border-slate-200/80 shadow-xs space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-16 rounded-full" />
    </div>
    <Skeleton className="h-3 w-48" />
    <div className="flex gap-2 pt-2 border-t border-slate-100">
      <Skeleton className="h-6 w-20 rounded-[8px]" />
      <Skeleton className="h-6 w-20 rounded-[8px]" />
    </div>
  </div>
);
