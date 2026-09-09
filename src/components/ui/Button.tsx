import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'glass';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    // Apple-inspired refined button styling
    const baseStyles =
      'inline-flex items-center justify-center font-medium select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C]/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

    const variants = {
      primary:
        'bg-[#0F4C5C] hover:bg-[#134E5E] text-white shadow-xs border border-[#0F4C5C]',
      secondary:
        'bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200/60 shadow-xs',
      outline:
        'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs',
      destructive:
        'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 shadow-xs',
      ghost:
        'bg-transparent hover:bg-slate-100 text-slate-700 border border-transparent',
      glass:
        'apple-glass text-slate-800 hover:bg-white/90 border border-white/60 shadow-xs',
    };

    const sizes = {
      xs: 'text-[11px] px-2 py-1 rounded-[8px] gap-1 h-7',
      sm: 'text-xs px-2.5 py-1.5 rounded-[10px] gap-1.5 h-8',
      md: 'text-xs sm:text-sm px-3.5 py-2 rounded-[12px] gap-2 h-9 sm:h-10 font-semibold',
      lg: 'text-sm sm:text-base px-5 py-2.5 rounded-[14px] gap-2.5 h-11 sm:h-12 font-semibold',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
