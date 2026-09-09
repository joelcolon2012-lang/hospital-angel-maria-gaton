import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'pill' | 'underline';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  variant = 'pill',
}) => {
  if (variant === 'underline') {
    return (
      <div className={`flex border-b border-slate-200 gap-6 overflow-x-auto no-scrollbar ${className}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-[#0F4C5C] text-[#0F4C5C]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-[#0F4C5C]' : 'text-slate-400'}`} />}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-[#0F4C5C]/10 text-[#0F4C5C]' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Segmented control / Pill style (Apple-like)
  return (
    <div className={`bg-slate-100/90 p-1 rounded-[14px] flex gap-1 overflow-x-auto no-scrollbar ${className}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-[10px] text-xs font-semibold whitespace-nowrap transition-all select-none cursor-pointer ${
              isActive
                ? 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            {Icon && (
              <Icon
                className={`w-3.5 h-3.5 ${
                  isActive ? 'text-[#0F4C5C]' : 'text-slate-400'
                }`}
              />
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive
                    ? 'bg-[#0F4C5C]/10 text-[#0F4C5C]'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
