import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-white text-slate-800 text-xs sm:text-sm rounded-[12px] border ${
              error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-[#0F4C5C] focus:ring-[#0F4C5C]/15'
            } px-3 py-2 sm:py-2.5 focus:outline-none focus:ring-3 transition-all placeholder:text-slate-400 ${
              leftIcon ? 'pl-9' : ''
            } ${rightIcon ? 'pr-9' : ''} ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-slate-400 pointer-events-none flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
        {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, children, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700 select-none">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`w-full bg-white text-slate-800 text-xs sm:text-sm rounded-[12px] border ${
            error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-[#0F4C5C] focus:ring-[#0F4C5C]/15'
          } px-3 py-2 sm:py-2.5 focus:outline-none focus:ring-3 transition-all cursor-pointer ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const areaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={areaId} className="block text-xs font-semibold text-slate-700 select-none">
            {label}
          </label>
        )}
        <textarea
          id={areaId}
          ref={ref}
          className={`w-full bg-white text-slate-800 text-xs sm:text-sm rounded-[12px] border ${
            error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-[#0F4C5C] focus:ring-[#0F4C5C]/15'
          } p-3 focus:outline-none focus:ring-3 transition-all placeholder:text-slate-400 leading-relaxed ${className}`}
          {...props}
        />
        {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
        {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
