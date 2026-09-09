import React from 'react';
import { Shield, Cloud, HardDrive, Lock, Calculator, Smartphone, Share2 } from 'lucide-react';
import { googleDriveService } from '../../services/googleDriveService';

interface Props {
  onOpenGoogleDriveModal: () => void;
  onOpenCloudSyncModal?: () => void;
  onOpenShareModal?: () => void;
  onOpenCalculator?: () => void;
  onTogglePrivacyShield: () => void;
  isPrivacyActive: boolean;
}

export const Navbar: React.FC<Props> = ({
  onOpenGoogleDriveModal,
  onOpenCloudSyncModal,
  onOpenShareModal,
  onOpenCalculator,
  onTogglePrivacyShield,
  isPrivacyActive,
}) => {
  const isDriveConnected = googleDriveService.isConnected();

  return (
    <header className="sticky top-0 z-40 bg-[#0F4C5C] text-white shadow-md border-b border-petrol-950/20 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Hospital Logo & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-white p-0.5 flex items-center justify-center shadow-md overflow-hidden border border-teal-300/40 shrink-0">
            <img
              src="/hospital_logo.jpg"
              alt="Logo Hospital Regional Ángel María Gatón"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs sm:text-sm font-black tracking-tight text-white uppercase">
                Hospital Regional
              </span>
              <span className="text-[11px] sm:text-xs bg-petrol-800 text-teal-200 font-black px-2 py-0.5 rounded-md border border-petrol-700 tracking-wide">
                ÁNGEL MARÍA GATÓN
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-teal-100/80 font-medium">
              Servicio de Emergencias & Medicina Interna — Dr. Colón
            </p>
          </div>
        </div>

        {/* Right: Tools & Status */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Quick Calculator Search Button */}
          {onOpenCalculator && (
            <button
              onClick={onOpenCalculator}
              title="Calculadoras y Escalas Clínicas Rápidas"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-800/80 hover:bg-teal-700 text-white rounded-xl text-xs font-bold border border-teal-500/50 shadow-sm active:scale-95 transition-all"
            >
              <Calculator className="w-3.5 h-3.5 text-teal-200" />
              <span className="hidden md:inline">Cálculos / Escalas</span>
            </button>
          )}

          {/* Compartir Link para Móviles y Colegas */}
          {onOpenShareModal && (
            <button
              onClick={onOpenShareModal}
              title="Compartir link para abrir en celular u otras computadoras"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-black border border-teal-300/40 shadow-sm active:scale-95 transition-all"
            >
              <Share2 className="w-3.5 h-3.5 text-white" />
              <span>Compartir Link</span>
            </button>
          )}

          {/* Cloud Sync & Phone Access Button */}
          {onOpenCloudSyncModal && (
            <button
              onClick={onOpenCloudSyncModal}
              title="Acceso en Celulares y Persistencia en la Nube 24/7"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-800/80 hover:bg-teal-700 text-white rounded-xl text-xs font-bold border border-teal-500/50 shadow-sm active:scale-95 transition-all"
            >
              <Smartphone className="w-3.5 h-3.5 text-teal-200" />
              <span className="hidden lg:inline">Celular & Nube</span>
            </button>
          )}

          {/* Google Drive Status Button */}
          <button
            onClick={onOpenGoogleDriveModal}
            title={isDriveConnected ? 'Google Drive conectado' : 'Conectar con Google Drive'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-xl font-medium transition-all ${
              isDriveConnected
                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-800/60'
                : 'bg-white/10 text-slate-200 border border-white/20 hover:bg-white/20'
            }`}
          >
            <Cloud className={`w-3.5 h-3.5 ${isDriveConnected ? 'text-emerald-400' : 'text-slate-300'}`} />
            <span className="hidden sm:inline">Drive</span>
            <span className={`w-2 h-2 rounded-full ${isDriveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
          </button>

          {/* Privacy Shield Button */}
          <button
            onClick={onTogglePrivacyShield}
            title={isPrivacyActive ? 'Desactivar escudo de privacidad' : 'Activar escudo de privacidad (oculta datos médicos)'}
            className={`p-1.5 rounded-xl border transition-all ${
              isPrivacyActive
                ? 'bg-amber-500 text-slate-900 border-amber-600'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}
          >
            {isPrivacyActive ? <Lock className="w-4 h-4" /> : <Shield className="w-4 h-4 text-teal-200" />}
          </button>
        </div>
      </div>
    </header>
  );
};