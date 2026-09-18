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
  Clock,
  LogOut,
  ShieldCheck,
  Smartphone,
  MoreVertical,
} from 'lucide-react';
import { User, Patient, HospitalSettings, HeaderLayoutConfig } from '../../types';
import { googleDriveService } from '../../services/googleDriveService';
import { authService } from '../../services/authService';
import { db } from '../../db/dexieDb';
import { SmartMedicalSearchBar } from './SmartMedicalSearchBar';

interface Props {
  currentUser?: User;
  onOpenLoginModal?: () => void;
  onLogout?: () => void;
  onOpenGuardiaApp?: () => void;
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
  onLogout,
  onOpenGuardiaApp,
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
    logoUrl: localStorage.getItem('hospital_custom_logo') || './hospital_logo.jpg',
    defaultDoctor: 'Dr. Joel Colón',
    defaultExequatur: 'EXEQ. 45892-01',
    themeColor: '#0F4C5C',
    isDarkMode: false,
    headerLayout: DEFAULT_HEADER_LAYOUT,
  }));

  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showPwaModal, setShowPwaModal] = React.useState(false);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = React.useState(false);
  const mobileToolsRef = React.useRef<HTMLDivElement>(null);

  // Cerrar menú móvil de herramientas al hacer clic o tocar fuera
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (mobileToolsRef.current && !mobileToolsRef.current.contains(e.target as Node)) {
        setIsMobileToolsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileToolsOpen(false);
    };

    if (isMobileToolsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileToolsOpen]);

  React.useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      } catch (err) {
        setShowPwaModal(true);
      }
    } else {
      setShowPwaModal(true);
    }
  };

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
    <header className="sticky top-0 z-30 h-[56px] bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-2 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-2.5 select-none">
      {/* Left: Hospital Logo, Name, Current Area & Active Patient Pill */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-hidden shrink-0 max-w-[55%] sm:max-w-none">
        {/* Hospital Logo */}
        {layout.showHospitalLogo && (
          <button
            type="button"
            onClick={handleLogoClick}
            className={`relative group h-8 w-auto max-w-[85px] sm:max-w-[140px] rounded-lg bg-white border border-slate-200 px-1 py-0.5 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden ${
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

        {/* Current Area Badge - oculto en móvil para evitar cortes */}
        {layout.showAreaBadge && (
          <div className="hidden md:flex items-center gap-1 text-xs font-bold text-slate-800 shrink-0">
            <span className="hidden sm:inline text-slate-400 font-normal">Área:</span>
            <span className="truncate max-w-[100px] sm:max-w-[150px]">{activeAreaTitle}</span>
          </div>
        )}

        {/* Active Patient Pill */}
        {layout.showActivePatientPill && activePatient && (
          <div className="flex items-center gap-1 pl-1 sm:pl-2 border-l border-slate-200 shrink min-w-0">
            <button
              onClick={onSelectActivePatient}
              className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-full bg-[#E0F2FE] hover:bg-[#bae6fd] text-[#0F4C5C] text-xs font-bold transition-all active:scale-95 truncate max-w-[105px] sm:max-w-[180px]"
              title="Volver al expediente del paciente activo"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F4C5C] shrink-0" />
              <span className="truncate">{activePatient.fullName}</span>
              <span className="hidden sm:inline text-[10px] bg-white/80 px-1 py-0.2 rounded font-mono shrink-0">
                {activePatient.cubicle}
              </span>
            </button>
            {onClearActivePatient && (
              <button
                onClick={onClearActivePatient}
                className="w-5 h-5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors shrink-0"
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
        {/* Desktop inline utilities (hidden on mobile/tablet < lg) */}
        <div className="hidden lg:flex items-center gap-1 sm:gap-2">
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

          {/* PWA Mobile Install Button */}
          <button
            onClick={handleInstallPwa}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Instalar App en Celular o Tablet (Android / iOS / PC)"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden lg:inline">Instalar App</span>
          </button>

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

          {/* Privacy Shield Desktop */}
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

          {/* Guardia Clínica App Button */}
          {onOpenGuardiaApp && (
            <button
              onClick={onOpenGuardiaApp}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-[#0F4C5C] text-white hover:bg-teal-800 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-teal-600"
              title="Abrir la Clínica Guard App (Medicina Interna I y II - Salas 301 a 316)"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span className="hidden xl:inline">Guardia Clínica</span>
            </button>
          )}

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
        </div>

        {/* Quick Privacy Shield Toggle en móvil */}
        <button
          onClick={onTogglePrivacyShield}
          className={`lg:hidden p-1.5 rounded-xl transition-all ${
            isPrivacyActive
              ? 'bg-amber-500 text-slate-900'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
          title={isPrivacyActive ? 'Desactivar escudo de privacidad' : 'Activar escudo de privacidad'}
        >
          {isPrivacyActive ? <Lock className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
        </button>

        {/* User RBAC Avatar */}
        {currentUser && (
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenLoginModal}
              className="flex items-center gap-1 sm:gap-1.5 pl-1 pr-1 sm:pr-2 py-0.5 sm:py-1 rounded-full hover:bg-slate-100 border border-slate-200 transition-all select-none cursor-pointer"
              title={`Médico activo: ${currentUser.name} (${currentUser.role}) — Clic para cambiar`}
            >
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120'}
                alt={currentUser.name}
                className="w-6 h-6 rounded-full object-cover border border-slate-300 shadow-2xs"
              />
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-[11px] font-bold text-slate-800 max-w-[80px] truncate leading-none">
                  {currentUser.name.split(' ')[0]}
                </span>
                <span className="text-[9px] text-teal-700 font-semibold uppercase leading-none mt-0.5">
                  {currentUser.isSuperAdmin ? 'Admin' : currentUser.role}
                </span>
              </div>
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="hidden lg:block p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Cerrar sesión / Bloquear acceso"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Mobile Tools Dropdown Trigger (< lg screens) */}
        <div className="relative lg:hidden" ref={mobileToolsRef}>
          <button
            type="button"
            onClick={() => setIsMobileToolsOpen((prev) => !prev)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition-all cursor-pointer border border-slate-200 touch-manipulation min-h-[34px] flex items-center justify-center"
            title="Herramientas y Opciones"
          >
            <MoreVertical className="w-4 h-4 text-slate-700" />
          </button>

          {/* Menú Desplegable de Herramientas Móvil */}
          {isMobileToolsOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xs"
                onClick={() => setIsMobileToolsOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-[290px] sm:w-[330px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95 max-h-[82vh] overflow-y-auto divide-y divide-slate-100">
                {/* Médico en turno */}
                {currentUser && (
                  <div className="px-3 py-2 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120'}
                        alt={currentUser.name}
                        className="w-7 h-7 rounded-full object-cover border border-slate-300"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 leading-tight">
                          {currentUser.name}
                        </span>
                        <span className="text-[10px] text-teal-700 font-semibold uppercase">
                          {currentUser.isSuperAdmin ? 'SuperAdmin' : currentUser.role}
                        </span>
                      </div>
                    </div>
                    {onOpenLoginModal && (
                      <button
                        onClick={() => {
                          setIsMobileToolsOpen(false);
                          onOpenLoginModal();
                        }}
                        className="text-[11px] font-bold text-[#0F4C5C] hover:underline"
                      >
                        Cambiar
                      </button>
                    )}
                  </div>
                )}

                {/* Lista de Herramientas */}
                <div className="px-2 py-1 space-y-0.5">
                  {/* IA Suite */}
                  {onOpenAiSuite && (
                    <button
                      onClick={() => {
                        setIsMobileToolsOpen(false);
                        onOpenAiSuite();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-bold text-slate-800 hover:bg-teal-50 active:bg-teal-100 transition-colors min-h-[44px] touch-manipulation"
                    >
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-teal-600 to-[#0F4C5C] flex items-center justify-center shrink-0 text-white">
                        <Sparkles className="w-4 h-4 text-teal-200" />
                      </div>
                      <div>
                        <div className="text-slate-900 font-bold">Suite IA Clínica Multimodal</div>
                        <div className="text-[10px] text-slate-500 font-normal">RX, TAC, ECG, Gases Arteriales</div>
                      </div>
                    </button>
                  )}

                  {/* Epidemiología */}
                  {onOpenEpidemiology && (
                    <button
                      onClick={() => {
                        setIsMobileToolsOpen(false);
                        onOpenEpidemiology();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors min-h-[44px] touch-manipulation"
                    >
                      <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                        <BarChart3 className="w-4 h-4 text-teal-700" />
                      </div>
                      <div>
                        <div className="text-slate-800 font-bold">Epidemiología & Reportes</div>
                        <div className="text-[10px] text-slate-500 font-normal">Estadísticas y censo hospitalario</div>
                      </div>
                    </button>
                  )}

                  {/* Calculadoras */}
                  {onOpenCalculator && (
                    <button
                      onClick={() => {
                        setIsMobileToolsOpen(false);
                        onOpenCalculator();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors min-h-[44px] touch-manipulation"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Calculator className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-slate-800 font-bold">Calculadoras y Escalas Clínicas</div>
                        <div className="text-[10px] text-slate-500 font-normal">Glasgow, CURB-65, Parkland, etc.</div>
                      </div>
                    </button>
                  )}

                  {/* Guardia Clínica App */}
                  {onOpenGuardiaApp && (
                    <button
                      onClick={() => {
                        setIsMobileToolsOpen(false);
                        onOpenGuardiaApp();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-bold text-[#0F4C5C] hover:bg-teal-50 active:bg-teal-100 transition-colors min-h-[44px] touch-manipulation"
                    >
                      <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4 text-[#0F4C5C]" />
                      </div>
                      <div>
                        <div className="text-[#0F4C5C] font-bold">Guardia Clínica App</div>
                        <div className="text-[10px] text-slate-500 font-normal">Medicina Interna Salas 301 a 316</div>
                      </div>
                    </button>
                  )}

                  {/* Instalar App (PWA) */}
                  <button
                    onClick={() => {
                      setIsMobileToolsOpen(false);
                      handleInstallPwa();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-bold text-emerald-950 hover:bg-emerald-50 active:bg-emerald-100 transition-colors min-h-[44px] touch-manipulation"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <Smartphone className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div>
                      <div className="text-emerald-950 font-bold">Instalar en Celular (PWA)</div>
                      <div className="text-[10px] text-emerald-700 font-normal">Guía iPhone y Android para pantalla inicio</div>
                    </div>
                  </button>

                  {/* Google Drive */}
                  {onOpenGoogleDriveModal && (
                    <button
                      onClick={() => {
                        setIsMobileToolsOpen(false);
                        onOpenGoogleDriveModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors min-h-[44px] touch-manipulation"
                    >
                      <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
                        <Cloud className="w-4 h-4 text-sky-700" />
                      </div>
                      <div>
                        <div className="text-slate-800 font-bold">Google Drive & Nube</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {isDriveConnected ? 'Sincronizado' : 'Conectar cuenta'}
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Compartir */}
                  {onOpenShareModal && (
                    <button
                      onClick={() => {
                        setIsMobileToolsOpen(false);
                        onOpenShareModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors min-h-[44px] touch-manipulation"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Share2 className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-slate-800 font-bold">Compartir Aplicación</div>
                        <div className="text-[10px] text-slate-500 font-normal">Enlace institucional oficial</div>
                      </div>
                    </button>
                  )}

                  {/* Configuración Institucional */}
                  {isSuperAdmin && onOpenSettings && (
                    <button
                      onClick={() => {
                        setIsMobileToolsOpen(false);
                        onOpenSettings();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-bold text-purple-900 hover:bg-purple-50 active:bg-purple-100 transition-colors min-h-[44px] touch-manipulation"
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                        <Settings className="w-4 h-4 text-purple-700" />
                      </div>
                      <div>
                        <div className="text-purple-950 font-bold">Configuración Institucional</div>
                        <div className="text-[10px] text-purple-700 font-normal">Exclusivo Dr. Joel Colón</div>
                      </div>
                    </button>
                  )}

                  {/* Cerrar Sesión */}
                  {onLogout && (
                    <button
                      onClick={() => {
                        setIsMobileToolsOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 active:bg-rose-100 transition-colors min-h-[44px] touch-manipulation"
                    >
                      <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                        <LogOut className="w-4 h-4 text-rose-600" />
                      </div>
                      <div>
                        <div className="text-rose-700 font-bold">Cerrar Sesión</div>
                        <div className="text-[10px] text-rose-500 font-normal">Bloquear acceso</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Guía de Instalación PWA */}
      {showPwaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 rounded-xl">
                  <Smartphone className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Instalar en Dispositivo Móvil</h3>
                  <p className="text-[11px] text-slate-500">Acceso directo rápido sin necesidad de tienda</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPwaModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <span>📱 En iPhone / iPad (Safari):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba ⬆️ en la barra inferior).</li>
                  <li>Desplázate hacia abajo y selecciona <strong>"Agregar al inicio"</strong>.</li>
                  <li>Toca <strong>"Agregar"</strong> en la esquina superior derecha.</li>
                </ol>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <span>🤖 En Android (Chrome / Edge):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Toca los <strong>tres puntos</strong> (⋮) en la esquina superior derecha.</li>
                  <li>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla principal"</strong>.</li>
                </ol>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowPwaModal(false)}
                className="px-4 py-2 bg-[#0F4C5C] hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
