import React from 'react';
import {
  Search,
  Calculator,
  Share2,
  Lock,
  Shield,
  Cloud,
  ChevronRight,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  X,
  User as UserIcon,
  Camera,
  Settings,
} from 'lucide-react';
import { User, Patient } from '../../types';
import { googleDriveService } from '../../services/googleDriveService';
import { SmartMedicalSearchBar } from './SmartMedicalSearchBar';

interface Props {
  currentUser?: User;
  onOpenLoginModal?: () => void;
  syncStatus?: 'saving' | 'saved' | 'offline';
  activeAreaTitle: string;
  activePatient: Patient | null;
  onSelectActivePatient: () => void;
  onClearActivePatient?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCalculator?: () => void;
  onOpenShareModal?: () => void;
  onOpenCloudSyncModal?: () => void;
  onOpenGoogleDriveModal?: () => void;
  onOpenSettings?: () => void;
  onTogglePrivacyShield: () => void;
  isPrivacyActive: boolean;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<Props> = ({
  currentUser,
  onOpenLoginModal,
  syncStatus = 'saved',
  activeAreaTitle,
  activePatient,
  onSelectActivePatient,
  onClearActivePatient,
  searchQuery,
  onSearchChange,
  onOpenCalculator,
  onOpenShareModal,
  onOpenCloudSyncModal,
  onOpenGoogleDriveModal,
  onOpenSettings,
  onTogglePrivacyShield,
  isPrivacyActive,
}) => {
  const isDriveConnected = googleDriveService.isConnected();

  const [currentLogo, setCurrentLogo] = React.useState(() => {
    return localStorage.getItem('hospital_custom_logo') || '/hospital_logo.jpg';
  });

  React.useEffect(() => {
    const handleUpdate = () => {
      setCurrentLogo(localStorage.getItem('hospital_custom_logo') || '/hospital_logo.jpg');
    };
    window.addEventListener('hospital_settings_changed', handleUpdate);
    return () => window.removeEventListener('hospital_settings_changed', handleUpdate);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-[56px] bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-6 flex items-center justify-between gap-3 select-none">
      {/* Left: Hospital Logo with quick edit & Current Area & Active Patient Pill */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
        {/* Hospital Logo Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="relative group w-8 h-8 rounded-full bg-white border border-slate-200 overflow-hidden shadow-2xs shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
          title="Clic para cargar o modificar el logo del hospital"
        >
          <img
            src={currentLogo}
            alt="Logo Hospital"
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/hospital_logo.jpg';
            }}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Camera className="w-3.5 h-3.5 text-white" />
          </div>
        </button>

        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 shrink-0">
          <span className="hidden sm:inline text-slate-400 font-normal">Área:</span>
          <span className="truncate max-w-[140px] sm:max-w-[180px]">{activeAreaTitle}</span>
        </div>

        {/* Active Patient Apple-like Pill */}
        {activePatient && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <button
              onClick={onSelectActivePatient}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E0F2FE] hover:bg-[#bae6fd] text-[#0F4C5C] text-xs font-bold transition-all active:scale-95 truncate max-w-[180px] sm:max-w-[240px]"
              title="Volver al expediente del paciente activo"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F4C5C] shrink-0" />
              <span className="truncate">{activePatient.fullName}</span>
              <span className="text-[10px] bg-white/80 px-1 py-0.2 rounded font-mono shrink-0">
                {activePatient.cubicle}
              </span>
            </button>
            {onClearActivePatient && (
              <button
                onClick={onClearActivePatient}
                className="w-5 h-5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                title="Cerrar paciente activo"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Center: Smart Medical AI Search Bar & Patient Query (Sección 1) */}
      <SmartMedicalSearchBar
        patientSearchQuery={searchQuery}
        onPatientSearchChange={onSearchChange}
      />

      {/* Right: Actions, Autosave & User */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Autosave Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-medium text-slate-600">
          <span
            className={`w-2 h-2 rounded-full ${
              syncStatus === 'saving'
                ? 'bg-amber-400 animate-ping'
                : syncStatus === 'saved'
                ? 'bg-emerald-500'
                : 'bg-red-400'
            }`}
          />
          <span>
            {syncStatus === 'saving' && 'Guardando...'}
            {syncStatus === 'saved' && 'Guardado'}
            {syncStatus === 'offline' && 'Local'}
          </span>
        </div>

        {/* Quick Calculator Trigger */}
        {onOpenCalculator && (
          <button
            onClick={onOpenCalculator}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 transition-all"
            title="Calculadoras y Escalas Clínicas"
          >
            <Calculator className="w-4 h-4 text-slate-500" />
            <span className="hidden xl:inline">Cálculos</span>
          </button>
        )}

        {/* Share App Modal Trigger */}
        {onOpenShareModal && (
          <button
            onClick={onOpenShareModal}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-[#0F4C5C]/10 hover:bg-[#0F4C5C]/15 text-[#0F4C5C] text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
            title="Compartir enlace para teléfono móvil"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Compartir</span>
          </button>
        )}

        {/* Google Drive Status */}
        {onOpenGoogleDriveModal && (
          <button
            onClick={onOpenGoogleDriveModal}
            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isDriveConnected
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
            title={isDriveConnected ? 'Drive conectado' : 'Conectar Google Drive'}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Drive</span>
          </button>
        )}

        {/* Privacy Shield */}
        <button
          onClick={onTogglePrivacyShield}
          className={`p-1.5 rounded-xl transition-all ${
            isPrivacyActive
              ? 'bg-amber-500 text-slate-900'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
          title={isPrivacyActive ? 'Desactivar escudo de privacidad' : 'Activar escudo de privacidad (oculta nombres)'}
        >
          {isPrivacyActive ? <Lock className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
        </button>

        {/* Settings Button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-1.5 sm:px-2 sm:py-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            title="Configuración de la Página & Logo"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span className="hidden xl:inline">Configuración</span>
          </button>
        )}

        {/* User RBAC Avatar */}
        {currentUser && (
          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full hover:bg-slate-100 border border-slate-200 transition-all select-none"
            title={`Usuario: ${currentUser.name} (${currentUser.role})`}
          >
            <img
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120'}
              alt={currentUser.name}
              className="w-5 h-5 rounded-full object-cover border border-slate-300"
            />
            <span className="text-xs font-bold text-slate-800 max-w-[70px] truncate hidden sm:inline">
              {currentUser.name.split(' ')[0]}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
