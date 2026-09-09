import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'elevated' | 'glass';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  interactive = false,
  ...props
}) => {
  const variants = {
    default: 'bg-white border border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.03)]',
    subtle: 'bg-slate-50/60 border border-slate-200/60',
    elevated: 'bg-white border border-slate-200/60 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.06)]',
    glass: 'apple-glass border border-white/60 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.05)]',
  };

  const interactiveStyles = interactive
    ? 'cursor-pointer hover:border-[#0F4C5C]/30 hover:shadow-[0_4px_14px_-2px_rgba(15,76,92,0.08)] active:scale-[0.99] transition-all'
    : '';

  return (
    <div
      className={`rounded-[16px] overflow-hidden ${variants[variant]} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-100 flex items-center justify-between ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <h3 className={`text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <p className={`text-xs text-slate-500 mt-0.5 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`p-4 sm:p-5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`px-4 sm:px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between ${className}`} {...props}>
    {children}
  </div>
);
