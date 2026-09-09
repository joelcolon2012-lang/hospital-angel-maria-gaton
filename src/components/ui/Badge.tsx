import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'outline';
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className = '',
  variant = 'neutral',
  size = 'sm',
  dot = false,
  ...props
}) => {
  const variants = {
    primary: 'bg-[#E0F2FE] text-[#0F4C5C] border border-[#0F4C5C]/20',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-900 border border-amber-200/80',
    danger: 'bg-red-50 text-red-700 border border-red-200',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200/60',
    outline: 'bg-transparent text-slate-700 border border-slate-300',
  };

  const dotColors = {
    primary: 'bg-[#0F4C5C]',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    neutral: 'bg-slate-400',
    outline: 'bg-slate-400',
  };

  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5 rounded-[6px] font-semibold',
    sm: 'text-[11px] px-2 py-0.5 rounded-[8px] font-semibold',
    md: 'text-xs px-2.5 py-1 rounded-[10px] font-bold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 leading-none select-none tracking-tight ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
