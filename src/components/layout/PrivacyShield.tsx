import React, { useEffect, useState } from 'react';
import { Lock, EyeOff } from 'lucide-react';

interface Props {
  isManualActive: boolean;
  onDeactivate: () => void;
}

export const PrivacyShield: React.FC<Props> = ({ isManualActive, onDeactivate }) => {
  const [isAutoHidden, setIsAutoHidden] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsAutoHidden(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const shouldCover = isManualActive || isAutoHidden;

  if (!shouldCover) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-petrol-800/80 border border-teal-500/40 flex items-center justify-center mb-4 shadow-2xl">
        <Lock className="w-8 h-8 text-emerald-400" />
      </div>
      <h2 className="text-xl font-bold mb-2">Modo Privacidad Clínico Activo</h2>
      <p className="text-sm text-slate-300 max-w-sm mb-6">
        Los datos médicos de los pacientes han sido protegidos de miradas no autorizadas según los protocolos de confidencialidad médica.
      </p>
      <button
        onClick={() => {
          setIsAutoHidden(false);
          onDeactivate();
        }}
        className="px-6 py-3 bg-petrol-700 hover:bg-petrol-600 text-white rounded-xl font-semibold shadow-lg transition-transform active:scale-95 flex items-center gap-2"
      >
        <EyeOff className="w-4 h-4" />
        <span>Desbloquear y Ver Pacientes</span>
      </button>
    </div>
  );
};
