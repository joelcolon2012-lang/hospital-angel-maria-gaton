import React from 'react';
import { Users, UserPlus, Search, BarChart3, ShieldCheck } from 'lucide-react';

interface Props {
  activeTab: 'dashboard' | 'search' | 'stats' | 'drive' | 'epidemiologia' | 'guardia';
  onChangeTab: (tab: 'dashboard' | 'search' | 'stats' | 'drive' | 'epidemiologia' | 'guardia') => void;
  onOpenRegister: () => void;
}

export const BottomNav: React.FC<Props> = ({
  activeTab,
  onChangeTab,
  onOpenRegister,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:hidden select-none">
      <div className="flex items-center justify-around">
        {/* Tablero */}
        <button
          onClick={() => onChangeTab('dashboard')}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all touch-manipulation min-h-[44px] ${
            activeTab === 'dashboard'
              ? 'text-petrol-900 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className={`w-5 h-5 ${activeTab === 'dashboard' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">Pacientes</span>
        </button>

        {/* Buscador */}
        <button
          onClick={() => onChangeTab('search')}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all touch-manipulation min-h-[44px] ${
            activeTab === 'search'
              ? 'text-petrol-900 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Search className={`w-5 h-5 ${activeTab === 'search' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">Buscar</span>
        </button>

        {/* Quick Register FAB in center */}
        <button
          onClick={onOpenRegister}
          className="flex flex-col items-center justify-center -mt-5 bg-petrol-900 text-white w-13 h-13 rounded-full shadow-lg hover:bg-petrol-800 active:scale-95 transition-all border-4 border-white touch-manipulation"
          title="Registrar nuevo paciente"
        >
          <UserPlus className="w-5 h-5" />
          <span className="sr-only">Registrar</span>
        </button>

        {/* Guardia Médica */}
        <button
          onClick={() => onChangeTab('guardia')}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all touch-manipulation min-h-[44px] ${
            activeTab === 'guardia'
              ? 'text-[#0F4C5C] font-black'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className={`w-5 h-5 ${activeTab === 'guardia' ? 'stroke-[2.5] text-emerald-600' : ''}`} />
          <span className="text-[10px] mt-0.5">Guardia</span>
        </button>

        {/* Estadísticas */}
        <button
          onClick={() => onChangeTab('stats')}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all touch-manipulation min-h-[44px] ${
            activeTab === 'stats'
              ? 'text-petrol-900 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className={`w-5 h-5 ${activeTab === 'stats' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">Reportes</span>
        </button>
      </div>
    </nav>
  );
};
