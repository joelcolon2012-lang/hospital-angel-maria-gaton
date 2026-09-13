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
  BarChart3,
  Sparkles,
  Clock
} from 'lucide-react';
import { User, Patient, HospitalSettings, HeaderLayoutConfig } from '../../types';
import { googleDriveService } from '../../services/googleDriveService';
import { authService } from '../../services/authService';
import { db } from '../../db/dexieDb';
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
  onOpenEpidemiology?: () => void;
  onOpenAiSuite?: () => void;
  onTogglePrivacyShield: () => void;
  isPrivacyActive: boolean;
  onToggleMobileMenu?: () => void;
}

const DEFAULT_HEADER_LAYOUT: HeaderLayoutConfig = {
  showHospitalLogo: true,
  showHospitalName: true,
  showSubtitle: true,
  showAreaBadge: true,
  showActivePatientPill: true,
  showClockTurno: true,
  showQuickCalculator: true,
  showEpidemiologyButton: true,
  showAiAssistantButton: true,
  showCloudSyncStatus: true,
};

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
  onOpenEpidemiology,
  onOpenAiSuite,
  onTogglePrivacyShield,
  isPrivacyActive,
}) => {
  const isDriveConnected = googleDriveService.isConnected();
  const isSuperAdmin = authService.isSuperAdmin();

  const [settings, setSettings] = React.useState<HospitalSettings>(() => ({
    hospitalName: 'Hospital Regional Dr. Ángel María Gatón',
    serviceSubtitle: 'Servicio de Emergencias & Medicina Interna',
    logoUrl: localStorage.getItem('hospital_custom_logo') || '/hospital_logo.jpg',
    defaultDoctor: 'Dr. Joel Colón',
    defaultExequatur: 'EXEQ. 45892-01',
    themeColor: '#0F4C5C',
    isDarkMode: false,
    headerLayout: DEFAULT_HEADER_LAYOUT,
  }));

  const [currentTime, setCurrentTime] = React.useState(() => {
    return new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
  });

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const record = await db.settings.get('hospital_identity_settings');
        if (record && record.value) {
          setSettings(prev => ({
            ...prev,
            ...record.value,
            headerLayout: { ...DEFAULT_HEADER_LAYOUT, ...(record.value.headerLayout || {}) }
          }));
        } else {
          const localStored = localStorage.getItem('hospital_general_settings');
          const customLogo = localStorage.getItem('hospital_custom_logo');
          if (localStored) {
            const parsed = JSON.parse(localStored);
            setSettings(prev => ({
              ...prev,
              ...parsed,
              logoUrl: customLogo || parsed.logoUrl || prev.logoUrl,
              headerLayout: { ...DEFAULT_HEADER_LAYOUT, ...(parsed.headerLayout || {}) }
            }));
          }
        }
      } catch (err) {
        console.warn('Error cargando ajustes de cabecera:', err);
      }
    };

    loadSettings();
    window.addEventListener('hospital_settings_changed', loadSettings);
    return () => window.removeEventListener('hospital_settings_changed', loadSettings);
  }, []);

  const layout = settings.headerLayout || DEFAULT_HEADER_LAYOUT;

  const handleLogoClick = () => {
    if (isSuperAdmin && onOpenSettings) {
      onOpenSettings();
    }
  };

  return (
    <header className="sticky top-0 z-30 h-[56px] bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-5 flex items-center justify-between gap-2.5 select-none">
      {/* Left: Hospital Logo, Name, Current Area & Active Patient Pill */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
        {/* Hospital Logo */}
        {layout.showHospitalLogo && (
          <button
            type="button"
            onClick={handleLogoClick}
            className={`relative group h-8 w-auto max-w-[130px] sm:max-w-[160px] rounded-lg bg-white border border-slate-200 px-1 py-0.5 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden ${
              isSuperAdmin ? 'cursor-pointer active:scale-95' : 'cursor-default'
            }`}
            title={isSuperAdmin ? 'Clic para configurar logo institucional (Dr. Colón)' : settings.hospitalName}
          >
            <img
              src={settings.logoUrl}
              alt="Logo Hospital"
              className="h-full w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = './hospital_logo.jpg';
              }}
            />
            {isSuperAdmin && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </button>
        )}

        {/* Hospital Name & Subtitle if enabled */}
        {layout.showHospitalName && (
          <div className="hidden 2xl:flex flex-col truncate max-w-[200px]">
            <span className="text-xs font-black text-slate-900 leading-tight truncate">
              {settings.hospitalName}
            </span>
            {layout.showSubtitle && (
              <span className="text-[10px] text-slate-500 font-medium truncate">
                {settings.serviceSubtitle}
              </span>
            )}
          </div>
        )}

        {/* Current Area Badge */}
        {layout.showAreaBadge && (
          <div className="flex items-center gap-1 text-xs font-bold text-slate-800 shrink-0">
            <span className="hidden sm:inline text-slate-400 font-normal">Área:</span>
            <span className="truncate max-w-[120px] sm:max-w-[160px]">{activeAreaTitle}</span>
          </div>
        )}

        {/* Active Patient Pill */}
        {layout.showActivePatientPill && activePatient && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <button
              onClick={onSelectActivePatient}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E0F2FE] hover:bg-[#bae6fd] text-[#0F4C5C] text-xs font-bold transition-all active:scale-95 truncate max-w-[160px] sm:max-w-[220px]"
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

      {/* Center: Smart Medical AI Search Bar & Patient Query */}
      <SmartMedicalSearchBar
        patientSearchQuery={searchQuery}
        onPatientSearchChange={onSearchChange}
      />

      {/* Right: Actions, Modules, Autosave & User */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Clock / Turno */}
        {layout.showClockTurno && (
          <div className="hidden xl:flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{currentTime}</span>
          </div>
        )}

        {/* Epidemiology Tab Trigger */}
        {layout.showEpidemiologyButton && onOpenEpidemiology && (
          <button
            type="button"
            onClick={onOpenEpidemiology}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 border border-teal-200/70"
            title="Abrir Módulo de Estadísticas y Epidemiología"
          >
            <BarChart3 className="w-4 h-4 text-teal-700" />
            <span className="hidden lg:inline">Epidemiología</span>
          </button>
        )}

        {/* AI Multimodal Suite Trigger */}
        {layout.showAiAssistantButton && onOpenAiSuite && (
          <button
            type="button"
            onClick={onOpenAiSuite}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-gradient-to-r from-teal-600 to-[#0F4C5C] hover:from-teal-700 hover:to-[#0c3c49] text-white text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
            title="Suite de IA Multimodal (Redacción, RX, TAC, Gases, ECG)"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-200" />
            <span className="hidden lg:inline">IA Clínica</span>
          </button>
        )}

        {/* Autosave / Cloud Sync Status Pill */}
        {layout.showCloudSyncStatus && (
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
              {syncStatus === 'saved' && 'Sincronizado'}
              {syncStatus === 'offline' && 'Local'}
            </span>
          </div>
        )}

        {/* Quick Calculator Trigger */}
        {layout.showQuickCalculator && onOpenCalculator && (
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
            className="p-1.5 sm:px-2 sm:py-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold flex items-center gap-1 transition-all"
            title="Compartir enlace institucional"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Google Drive Status */}
        {onOpenGoogleDriveModal && (
          <button
            onClick={onOpenGoogleDriveModal}
            className={`p-1.5 rounded-xl text-xs font-semibold flex items-center transition-all ${
              isDriveConnected
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
            title={isDriveConnected ? 'Google Drive sincronizado' : 'Conectar Google Drive'}
          >
            <Cloud className="w-3.5 h-3.5" />
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

        {/* Settings Button: Visible ÚNICAMENTE para SuperAdmin Dr. Joel Colón */}
        {isSuperAdmin && onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
            title="Configuración Institucional (Exclusivo SuperAdmin Dr. Joel Colón)"
          >
            <Settings className="w-4 h-4 text-purple-700" />
            <span className="hidden xl:inline">Configuración</span>
          </button>
        )}

        {/* User RBAC Avatar */}
        {currentUser && (
          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full hover:bg-slate-100 border border-slate-200 transition-all select-none cursor-pointer"
            title={`Usuario activo: ${currentUser.name} (${currentUser.role}) — Clic para cambiar médico`}
          >
            <img
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120'}
              alt={currentUser.name}
              className="w-6 h-6 rounded-full object-cover border border-slate-300 shadow-2xs"
            />
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[11px] font-bold text-slate-800 max-w-[80px] truncate leading-none">
                {currentUser.name.split(' ')[0]}
              </span>
              <span className="text-[9px] text-teal-700 font-semibold uppercase leading-none mt-0.5">
                {currentUser.isSuperAdmin ? 'Admin' : currentUser.role}
              </span>
            </div>
          </button>
        )}
      </div>
    </header>
  );
};
