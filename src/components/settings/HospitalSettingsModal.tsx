import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  Check,
  X,
  Palette,
  User,
  ShieldCheck,
  Moon,
  Sun,
  Save,
  FileText,
  Layers,
  ListPlus,
  Stethoscope,
  BookOpen,
  ArrowUp,
  ArrowDown,
  Trash2,
  Eye,
  Plus,
  RotateCcw,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  LayoutTemplate,
  Sliders,
  Cpu,
  Users,
  Key,
  CheckCircle2,
  AlertCircle,
  EyeOff,
  ShieldAlert,
  Crown,
  Server,
  Activity,
  Globe,
  Lock
} from 'lucide-react';
import { 
  HospitalSettings, 
  OfficialTemplateId, 
  OfficialHospitalTemplate, 
  OfficialTemplateSection,
  QuickOptionItem,
  HeaderLayoutConfig,
  User as UserType,
  UserRole
} from '../../types';
import { db } from '../../db/dexieDb';
import { cloudSyncService } from '../../services/cloudSyncService';
import { clinicalTemplateService, DEFAULT_TEMPLATES } from '../../services/clinicalTemplateService';
import { quickOptionsService, DEFAULT_QUICK_OPTIONS } from '../../services/quickOptionsService';
import { CustomNormalExamModal } from './CustomNormalExamModal';
import { authService } from '../../services/authService';
import { GeminiClinicalService } from '../../services/ai/GeminiClinicalService';
import { geminiService, GeminiTelemetryStatus } from '../../services/ai/geminiService';

export const DEFAULT_HEADER_LAYOUT: HeaderLayoutConfig = {
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

export const DEFAULT_HOSPITAL_SETTINGS: HospitalSettings = {
  hospitalName: 'Hospital Regional Dr. Ángel María Gatón',
  serviceSubtitle: 'Servicio de Emergencias & Medicina Interna',
  logoUrl: '/hospital_logo.jpg',
  defaultDoctor: 'Dr. Joel Colón',
  defaultExequatur: 'EXEQ. 45892-01',
  themeColor: '#0F4C5C',
  isDarkMode: false,
  headerLayout: DEFAULT_HEADER_LAYOUT,
  geminiApiKey: '',
  geminiModel: 'gemini-flash-auto',
};

type SettingsTab = 
  | 'barra_superior' 
  | 'ia_gemini' 
  | 'usuarios' 
  | 'identidad' 
  | 'plantillas' 
  | 'opciones' 
  | 'examen_normal' 
  | 'guias_escalas';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: (settings: HospitalSettings) => void;
  initialTab?: SettingsTab;
}

export const HospitalSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSettingsSaved,
  initialTab = 'barra_superior',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Estado general de identidad institucional y configuración
  const [settings, setSettings] = useState<HospitalSettings>(DEFAULT_HOSPITAL_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // RBAC & Permisos
  const isSuperAdmin = authService.isSuperAdmin();
  const currentUser = authService.getCurrentUser();
  const [users, setUsers] = useState<UserType[]>([]);

  // Estado nuevo usuario
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('MÉDICO');
  const [newUserSpecialty, setNewUserSpecialty] = useState('');
  const [newUserExequatur, setNewUserExequatur] = useState('');
  const [newUserPin, setNewUserPin] = useState('1234');
  const [userSuccessMsg, setUserSuccessMsg] = useState('');

  // Estado Gemini AI & Telemetría Backend
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [geminiTelemetry, setGeminiTelemetry] = useState<GeminiTelemetryStatus | null>(null);
  const [backendUrl, setBackendUrl] = useState<string>(() => geminiService.getBaseUrl());
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Estado del Editor de Plantillas Oficiales (Secciones 15 & 16)
  const [selectedTemplateId, setSelectedTemplateId] = useState<OfficialTemplateId>('nota_emergencia');
  const [templates, setTemplates] = useState<Record<OfficialTemplateId, OfficialHospitalTemplate>>(DEFAULT_TEMPLATES);
  const [templateChangeSummary, setTemplateChangeSummary] = useState('');
  const [templateSuccessMsg, setTemplateSuccessMsg] = useState('');

  // Estado de Opciones Predefinidas Personalizables (Sección 40)
  const [selectedCategory, setSelectedCategory] = useState<string>('pulmones');
  const [quickOptions, setQuickOptions] = useState<Record<string, QuickOptionItem[]>>({});
  const [newOptionText, setNewOptionText] = useState('');

  // Modal de Examen Normal
  const [isNormalExamOpen, setIsNormalExamOpen] = useState(false);

  // Cargar configuración completa desde Dexie DB y localStorage al abrir
  useEffect(() => {
    if (!isOpen) return;

    const loadAllConfig = async () => {
      // 1. Cargar identidad institucional
      try {
        const identityRecord = await db.settings.get('hospital_identity_settings');
        if (identityRecord && identityRecord.value) {
          setSettings({
            ...DEFAULT_HOSPITAL_SETTINGS,
            ...identityRecord.value,
            headerLayout: {
              ...DEFAULT_HEADER_LAYOUT,
              ...(identityRecord.value.headerLayout || {})
            }
          });
        } else {
          const savedLocal = localStorage.getItem('hospital_general_settings');
          const customLogo = localStorage.getItem('hospital_custom_logo');
          if (savedLocal) {
            const parsed = JSON.parse(savedLocal);
            setSettings({
              ...DEFAULT_HOSPITAL_SETTINGS,
              ...parsed,
              logoUrl: customLogo || parsed.logoUrl || DEFAULT_HOSPITAL_SETTINGS.logoUrl,
              headerLayout: {
                ...DEFAULT_HEADER_LAYOUT,
                ...(parsed.headerLayout || {})
              }
            });
          }
        }
      } catch (e) {
        console.warn('Error cargando identidad:', e);
      }

      // 2. Cargar usuarios del sistema hospitalario
      try {
        const uList = await authService.getAllUsers();
        setUsers(uList);
      } catch (e) {
        console.warn('Error cargando usuarios:', e);
      }

      // 3. Cargar plantillas hospitalarias
      try {
        const tpls = await clinicalTemplateService.getTemplates();
        setTemplates(tpls);
      } catch (e) {
        console.warn('Error cargando plantillas:', e);
      }

      // 4. Cargar opciones rápidas
      try {
        const opts = await quickOptionsService.getAllOptions();
        setQuickOptions(opts);
      } catch (e) {
        console.warn('Error cargando opciones rápidas:', e);
      }

      // 5. Cargar modelos compatibles de Google Gemini
      try {
        setIsLoadingModels(true);
        const models = await geminiService.getAvailableGeminiModels();
        setAvailableModels(models);
        if (models.length > 0) {
          const current = settings.geminiModel;
          if (!current || current === 'gemini-flash-auto' || !models.includes(current)) {
            const best = geminiService.selectBestGeminiModel(models);
            setSettings(s => ({ ...s, geminiModel: best }));
          }
        }
      } catch (e) {
        console.warn('Error cargando modelos de Gemini:', e);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadAllConfig();
  }, [isOpen]);

  if (!isOpen) return null;

  // Manejador para cargar logo institucional
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isSuperAdmin) {
      alert('Solo el Dr. Joel Colón (SuperAdmin) tiene autorización para cambiar el logotipo del hospital.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setSettings((prev) => ({ ...prev, logoUrl: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    if (!isSuperAdmin) return;
    setSettings((prev) => ({ ...prev, logoUrl: DEFAULT_HOSPITAL_SETTINGS.logoUrl }));
    localStorage.removeItem('hospital_custom_logo');
  };

  // Toggle para elementos de la barra superior
  const handleToggleHeaderItem = (key: keyof HeaderLayoutConfig) => {
    if (!isSuperAdmin) {
      alert('Solo el Dr. Joel Colón (SuperAdmin) puede modificar la estructura de la cabecera.');
      return;
    }
    setSettings((prev) => {
      const currentLayout = prev.headerLayout || DEFAULT_HEADER_LAYOUT;
      return {
        ...prev,
        headerLayout: {
          ...currentLayout,
          [key]: !currentLayout[key],
        },
      };
    });
  };

  // Guardar configuración completa (Identidad, Barra, Gemini)
  const handleSaveSettings = async () => {
    if (!isSuperAdmin) {
      alert('Acceso restringido: Solo el Dr. Joel Colón (SuperAdmin) puede guardar cambios de configuración institucional.');
      return;
    }

    try {
      // 1. Guardar en Dexie DB
      await db.settings.put({
        id: 'hospital_identity_settings',
        value: settings,
      });

      // 2. Respaldo local
      if (settings.logoUrl && settings.logoUrl !== DEFAULT_HOSPITAL_SETTINGS.logoUrl) {
        localStorage.setItem('hospital_custom_logo', settings.logoUrl);
      }
      localStorage.setItem('hospital_general_settings', JSON.stringify(settings));

      // Guardar URL de Backend independiente si fue modificada
      if (backendUrl !== undefined) {
        geminiService.setBaseUrl(backendUrl);
      }
      if (settings.geminiModel) {
        geminiService.setActiveModel(settings.geminiModel);
      }
      // Limpiar cualquier residuo previo en localStorage por seguridad absoluta
      try {
        localStorage.removeItem('hospital_gemini_api_key');
        localStorage.removeItem('hospital_gemini_model');
      } catch {}

      // 3. Aplicar estilos
      document.documentElement.style.setProperty('--primary-color', settings.themeColor);
      if (settings.isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // 4. Sincronizar en la nube
      cloudSyncService.scheduleAutoSync();
      window.dispatchEvent(new Event('hospital_settings_changed'));

      if (onSettingsSaved) {
        onSettingsSaved(settings);
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      alert('Error guardando configuración: ' + err.message);
    }
  };

  // Probar conexión con Gemini (Frontend -> Backend Render -> Google Gemini API)
  const handleTestGeminiConnection = async () => {
    setIsTestingGemini(true);
    setGeminiTestResult(null);
    try {
      if (backendUrl !== undefined) {
        geminiService.setBaseUrl(backendUrl);
      }
      const telemetry = await geminiService.testConnectionFull();
      setGeminiTelemetry(telemetry);
      setGeminiTestResult({
        success: telemetry.geminiConnected,
        message: telemetry.message,
      });
      if (telemetry.model && telemetry.model !== 'Desconectado' && telemetry.model !== 'Sin respuesta' && telemetry.model !== 'Error de autenticación') {
        setSettings(s => ({ ...s, geminiModel: telemetry.model }));
      }
    } catch (err: any) {
      const errorMsg = 'No fue posible contactar el servidor de inteligencia artificial.';
      setGeminiTelemetry({
        backendConnected: false,
        geminiConnected: false,
        model: 'Desconectado',
        latencyMs: 0,
        checkedAt: new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        message: errorMsg,
      });
      setGeminiTestResult({
        success: false,
        message: errorMsg,
      });
    } finally {
      setIsTestingGemini(false);
    }
  };

  // Agregar nuevo médico/usuario
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert('Solo el Dr. Joel Colón puede registrar nuevos usuarios médicos.');
      return;
    }
    if (!newUserName.trim() || !newUserExequatur.trim()) {
      alert('Por favor complete el nombre y el exequátur del médico.');
      return;
    }

    const newUser: UserType = {
      id: 'usr-' + Date.now().toString(36),
      name: newUserName.trim(),
      email: `${newUserName.toLowerCase().replace(/[^a-z0-9]/g, '')}@hospitalangelgaton.gob.do`,
      role: newUserRole,
      isSuperAdmin: false,
      specialty: newUserSpecialty.trim() || 'Médico de Emergencias',
      exequatur: newUserExequatur.trim(),
      pin: newUserPin.trim() || '1234',
      isActive: true,
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=80',
    };

    await authService.saveUser(newUser);
    const updatedUsers = await authService.getAllUsers();
    setUsers(updatedUsers);

    setNewUserName('');
    setNewUserSpecialty('');
    setNewUserExequatur('');
    setNewUserPin('1234');
    setUserSuccessMsg(`Médico ${newUser.name} registrado exitosamente con firma oficial.`);
    setTimeout(() => setUserSuccessMsg(''), 4000);
  };

  // -------------------------------------------------------------
  // ACCIONES DEL EDITOR DE PLANTILLAS OFICIALES
  // -------------------------------------------------------------
  const activeTpl = templates[selectedTemplateId] || DEFAULT_TEMPLATES[selectedTemplateId];

  const handleMoveTemplateSection = async (sectionId: string, direction: 'up' | 'down') => {
    if (!isSuperAdmin) {
      alert('Solo el Dr. Joel Colón puede reordenar las secciones de las plantillas maestras.');
      return;
    }
    const updated = await clinicalTemplateService.moveSection(
      selectedTemplateId,
      sectionId,
      direction,
      `${settings.defaultDoctor || 'Dr. Colón'} (Administrador)`
    );
    setTemplates((prev) => ({ ...prev, [selectedTemplateId]: updated }));
    setTemplateSuccessMsg(`Sección reordenada. Nueva versión oficial v${updated.activeVersion} creada.`);
    setTimeout(() => setTemplateSuccessMsg(''), 3000);
  };

  const handleToggleTemplateSection = async (sectionId: string, enabled: boolean) => {
    if (!isSuperAdmin) {
      alert('Solo el Dr. Joel Colón puede activar/desactivar secciones de plantillas maestras.');
      return;
    }
    const updated = await clinicalTemplateService.toggleSectionEnabled(
      selectedTemplateId,
      sectionId,
      enabled,
      `${settings.defaultDoctor || 'Dr. Colón'} (Administrador)`
    );
    setTemplates((prev) => ({ ...prev, [selectedTemplateId]: updated }));
    setTemplateSuccessMsg(`Estatus de sección actualizado. Versión oficial v${updated.activeVersion}.`);
    setTimeout(() => setTemplateSuccessMsg(''), 3000);
  };

  const handleRollbackTemplate = async (versionNumber: number) => {
    if (!isSuperAdmin) return;
    if (!window.confirm(`¿Seguro que desea restaurar la plantilla a la versión v${versionNumber}?`)) return;
    const updated = await clinicalTemplateService.rollbackToVersion(
      selectedTemplateId,
      versionNumber,
      `${settings.defaultDoctor || 'Dr. Colón'} (Administrador)`
    );
    setTemplates((prev) => ({ ...prev, [selectedTemplateId]: updated }));
    setTemplateSuccessMsg(`Restaurada exitosamente a versión v${versionNumber} (Nueva activa: v${updated.activeVersion}).`);
    setTimeout(() => setTemplateSuccessMsg(''), 3000);
  };

  const handleResetTemplateToFactory = async () => {
    if (!isSuperAdmin) return;
    if (!window.confirm('¿Desea restablecer todas las plantillas al formato original institucional v1?')) return;
    await clinicalTemplateService.resetToDefaults(`${settings.defaultDoctor || 'Dr. Colón'} (Administrador)`);
    const fresh = await clinicalTemplateService.getTemplates();
    setTemplates(fresh);
    setTemplateSuccessMsg('Plantillas oficiales restablecidas a la versión de fábrica v1.');
    setTimeout(() => setTemplateSuccessMsg(''), 3000);
  };

  // -------------------------------------------------------------
  // ACCIONES DE OPCIONES PREDEFINIDAS PERSONALIZABLES (SECCIÓN 40)
  // -------------------------------------------------------------
  const handleAddQuickOption = async () => {
    if (!newOptionText.trim()) return;
    await quickOptionsService.addOption(selectedCategory, newOptionText.trim());
    const all = await quickOptionsService.getAllOptions();
    setQuickOptions(all);
    setNewOptionText('');
  };

  const handleDeleteQuickOption = async (optionId: string) => {
    await quickOptionsService.deleteOption(selectedCategory, optionId);
    const all = await quickOptionsService.getAllOptions();
    setQuickOptions(all);
  };

  const handleResetQuickOptionsCategory = async () => {
    if (!window.confirm(`¿Restablecer las opciones de esta categoría al listado por defecto?`)) return;
    await quickOptionsService.resetCategoryToDefault(selectedCategory);
    const all = await quickOptionsService.getAllOptions();
    setQuickOptions(all);
  };

  const currentLayout = settings.headerLayout || DEFAULT_HEADER_LAYOUT;

  const categoryNames: Record<string, string> = {
    pulmones: '🫁 Pulmones & Respiratorio',
    corazon: '❤️ Corazón & Cardiovascular',
    cabeza: '🧠 Cabeza & Ojos',
    cuello: '🧣 Cuello & Tiroides',
    abdomen: '🩺 Abdomen & Peristalsis',
    neurologico: '⚡ Neurológico & Conciencia',
    extremidades: '🦵 Extremidades & Pulsos',
    dietas: '🥗 Dietas Hospitalarias',
    soluciones: '💧 Soluciones Parenterales',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-5xl rounded-[22px] shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25)] border border-slate-200/80 overflow-hidden flex flex-col max-h-[94vh] z-10">
        
        {/* Cabecera Principal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F4C5C]/10 flex items-center justify-center text-[#0F4C5C] shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Panel de Configuración & Administración Institucional
                </h3>
                {isSuperAdmin && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full shadow-2xs">
                    <Crown className="w-3 h-3 text-amber-600" />
                    Dr. Joel Colón (SuperAdmin)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Hospital Regional Dr. Ángel María Gatón • Control integral de barra superior, IA Gemini, firmas y plantillas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notificación de Modo Restringido para usuarios que no son SuperAdmin */}
        {!isSuperAdmin && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2 text-xs font-semibold text-amber-800">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Sesión actual: <strong>{currentUser.name}</strong> ({currentUser.role}). Solo el <strong>Dr. Joel Colón (SuperAdmin)</strong> está facultado para modificar la estructura de la barra superior, llaves de IA, logotipo institucional y cuentas médicas. Modo de solo consulta.
            </span>
          </div>
        )}

        {/* Barra de Navegación de Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-3 sm:px-5 py-2 flex flex-wrap items-center gap-1.5 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('barra_superior')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'barra_superior'
                ? 'bg-[#0F4C5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            <span>Barra Superior 100% Editable</span>
          </button>

          <button
            onClick={() => setActiveTab('ia_gemini')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'ia_gemini'
                ? 'bg-[#0F4C5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-300" />
            <span>Inteligencia Artificial Gemini</span>
          </button>

          <button
            onClick={() => setActiveTab('usuarios')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'usuarios'
                ? 'bg-[#0F4C5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Médicos & Firmas Dinámicas</span>
          </button>

          <button
            onClick={() => setActiveTab('identidad')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'identidad'
                ? 'bg-[#0F4C5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Identidad & Colores</span>
          </button>

          <button
            onClick={() => setActiveTab('plantillas')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'plantillas'
                ? 'bg-[#0F4C5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Editor de Plantillas</span>
          </button>

          <button
            onClick={() => setActiveTab('opciones')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'opciones'
                ? 'bg-[#0F4C5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" />
            <span>Opciones Rápidas</span>
          </button>

          <button
            onClick={() => setActiveTab('examen_normal')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'examen_normal'
                ? 'bg-[#0F4C5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Examen Normal</span>
          </button>

          <button
            onClick={() => setActiveTab('guias_escalas')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'guias_escalas'
                ? 'bg-[#0F4C5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Guías & Escalas</span>
          </button>
        </div>

        {/* Contenedor del Tab Activo */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 text-xs sm:text-sm">
          
          {/* ========================================================================= */}
          {/* TAB 1: BARRA SUPERIOR 100% EDITABLE                                      */}
          {/* ========================================================================= */}
          {activeTab === 'barra_superior' && (
            <div className="space-y-6">
              {/* Resumen explicativo */}
              <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-4 flex items-start gap-3">
                <LayoutTemplate className="w-5 h-5 text-[#0F4C5C] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Personalización Total de la Barra Superior</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Edita el nombre del hospital, subtítulo, logotipo institucional y activa o desactiva de forma individual cada componente de la cabecera. Todos los cambios se reflejan inmediatamente y persisten en la base de datos Dexie y en la nube.
                  </p>
                </div>
              </div>

              {/* Logotipo del Hospital */}
              <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-200 space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider">
                    <ImageIcon className="w-4 h-4 text-[#0F4C5C]" />
                    <span>Logotipo Institucional de la Cabecera</span>
                  </label>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={handleResetLogo}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Restaurar Escudo Original</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-48 h-18 rounded-2xl bg-white p-2 shadow-sm border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={settings.logoUrl}
                      alt="Logo Oficial"
                      className="w-full h-full object-contain rounded-xl"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = './hospital_logo.jpg';
                      }}
                    />
                  </div>

                  <div className="flex-1 space-y-1.5 text-center sm:text-left">
                    <p className="text-xs font-bold text-slate-800">
                      Cargar nueva imagen oficial del hospital
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      El logo se sincroniza automáticamente con la barra superior, notas clínicas, órdenes médicas y exportaciones Word/PDF oficiales.
                    </p>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoFileChange}
                      accept="image/*"
                      className="hidden"
                      disabled={!isSuperAdmin}
                    />

                    {isSuperAdmin && (
                      <div className="pt-1.5 flex flex-wrap gap-2 justify-center sm:justify-start">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-bold rounded-xl active:scale-95 shadow-xs transition-all cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Subir Nuevo Logo</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Textos de la Cabecera */}
              <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 text-[#0F4C5C]">
                  <Sliders className="w-4 h-4" />
                  <span>Textos e Información de la Cabecera</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nombre Oficial del Hospital:
                    </label>
                    <input
                      type="text"
                      value={settings.hospitalName}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setSettings({ ...settings, hospitalName: e.target.value })}
                      placeholder="Ej: Hospital Regional Dr. Ángel María Gatón"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-medium focus:ring-2 focus:ring-[#0F4C5C] focus:border-transparent outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Subtítulo del Servicio / Departamento:
                    </label>
                    <input
                      type="text"
                      value={settings.serviceSubtitle}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setSettings({ ...settings, serviceSubtitle: e.target.value })}
                      placeholder="Ej: Servicio de Emergencias & Medicina Interna"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-medium focus:ring-2 focus:ring-[#0F4C5C] focus:border-transparent outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Médico de Cabecera Predeterminado:
                    </label>
                    <input
                      type="text"
                      value={settings.defaultDoctor}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setSettings({ ...settings, defaultDoctor: e.target.value })}
                      placeholder="Ej: Dr. Joel Colón"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-medium focus:ring-2 focus:ring-[#0F4C5C] focus:border-transparent outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Exequátur Predeterminado:
                    </label>
                    <input
                      type="text"
                      value={settings.defaultExequatur}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setSettings({ ...settings, defaultExequatur: e.target.value })}
                      placeholder="Ej: EXEQ. 45892-01"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-medium focus:ring-2 focus:ring-[#0F4C5C] focus:border-transparent outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Conmutadores de Visibilidad de Componentes de la Cabecera */}
              <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-200 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 text-[#0F4C5C]">
                    <Eye className="w-4 h-4" />
                    <span>Elementos Visibles en la Cabecera (Interruptores Activos)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Haz clic en cualquier interruptor para mostrar u ocultar
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'showHospitalLogo', label: 'Logotipo Oficial del Hospital', desc: 'Muestra el logo institucional en el extremo izquierdo' },
                    { key: 'showHospitalName', label: 'Nombre de la Institución', desc: 'Muestra "Hospital Regional Ángel María Gatón"' },
                    { key: 'showSubtitle', label: 'Subtítulo del Servicio', desc: 'Muestra "Emergencias & Medicina Interna"' },
                    { key: 'showAreaBadge', label: 'Insignia de Área Clínica', desc: 'Muestra el área hospitalaria actual activa' },
                    { key: 'showActivePatientPill', label: 'Píldora de Paciente Activo', desc: 'Nombre, edad y triaje del paciente seleccionado con botón de deselección' },
                    { key: 'showClockTurno', label: 'Reloj de Turno en Tiempo Real', desc: 'Hora exacta actualizada cada minuto para control de turnos' },
                    { key: 'showQuickCalculator', label: 'Botón de Calculadoras Clínicas', desc: 'Acceso directo a fórmulas médicas y escalas rápidas' },
                    { key: 'showEpidemiologyButton', label: 'Botón de Epidemiología & Patologías', desc: 'Acceso al módulo de estadísticas y agrupación por enfermedades' },
                    { key: 'showAiAssistantButton', label: 'Botón Asistente IA Multimodal (Gemini)', desc: 'Acceso a interpretación de RX, TAC, ABG, ECG y redacción' },
                    { key: 'showCloudSyncStatus', label: 'Estatus de Sincronización Nube', desc: 'Píldora verde/amarilla de guardado y conexión' },
                  ].map(({ key, label, desc }) => {
                    const isChecked = Boolean(currentLayout[key as keyof HeaderLayoutConfig]);
                    return (
                      <div
                        key={key}
                        onClick={() => handleToggleHeaderItem(key as keyof HeaderLayoutConfig)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isChecked
                            ? 'bg-white border-teal-300 shadow-2xs'
                            : 'bg-slate-100/70 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isChecked ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <span>{label}</span>
                          </div>
                          <p className="text-[11px] text-slate-500">{desc}</p>
                        </div>

                        <div className="shrink-0 text-[#0F4C5C]">
                          {isChecked ? (
                            <ToggleRight className="w-6 h-6 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botón Guardar */}
              {isSuperAdmin && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Estructura de la Barra Superior</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: INTELIGENCIA ARTIFICIAL GEMINI                                      */}
          {/* ========================================================================= */}
          {activeTab === 'ia_gemini' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-teal-900 to-[#0F4C5C] rounded-2xl p-4.5 text-white shadow-sm space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white">Google Gemini Clinical AI Integration</h4>
                    <p className="text-xs text-teal-100/80">
                      Potenciador de búsqueda en guías mundiales, lectura óptica de laboratorios y análisis multimodal de imagen y ECG.
                    </p>
                  </div>
                </div>
              </div>

              {/* Configuración de API Key */}
              {/* Panel de Telemetría y Estado de Google Gemini */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 text-[#0F4C5C]">
                      <Activity className="w-4 h-4 text-[#0F4C5C]" />
                      <span>ESTADO DE GEMINI & ARQUITECTURA SEGURA</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Frontend en GitHub Pages vinculado al backend independiente seguro en Render (sin exposición de claves).
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <Lock className="w-3 h-3 text-emerald-700" />
                      Zero Client-Secrets
                    </span>
                  </div>
                </div>

                {/* 4 Tarjetas de Telemetría */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Tarjeta 1: Backend */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-slate-600" />
                        Backend (Render)
                      </span>
                    </div>
                    <div>
                      {geminiTelemetry ? (
                        geminiTelemetry.backendConnected ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Conectado
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            Desconectado
                          </div>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                          Sin verificar
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate" title={geminiService.getBaseUrl() || 'Proxy / Relativo'}>
                      {geminiService.getBaseUrl() || 'Modo Local / Proxy'}
                    </p>
                  </div>

                  {/* Tarjeta 2: API Gemini */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        API Gemini
                      </span>
                    </div>
                    <div>
                      {geminiTelemetry ? (
                        geminiTelemetry.geminiConnected ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Conectado
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            Desconectado
                          </div>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                          Sin verificar
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      Validación end-to-end
                    </p>
                  </div>

                  {/* Tarjeta 3: Modelo Activo */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-teal-600" />
                        Modelo Activo
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 font-mono truncate" title={geminiTelemetry?.model || settings.geminiModel || 'gemini-2.5-flash'}>
                      {geminiTelemetry?.model && geminiTelemetry.model !== 'Desconectado' && geminiTelemetry.model !== 'Sin respuesta'
                        ? geminiTelemetry.model
                        : (settings.geminiModel || 'gemini-2.5-flash')}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Auto-detección Flash estable
                    </p>
                  </div>

                  {/* Tarjeta 4: Latencia & Diagnóstico */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-indigo-600" />
                        Latencia
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      {geminiTelemetry ? `${geminiTelemetry.latencyMs} ms` : '-- ms'}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {geminiTelemetry?.checkedAt ? `Última: ${geminiTelemetry.checkedAt}` : 'Última: Ninguna'}
                    </p>
                  </div>
                </div>

                {/* Configuración URL Backend & Selector de Modelo */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                  <div className="sm:col-span-6 space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      URL del Backend Render:
                    </label>
                    <input
                      type="text"
                      value={backendUrl}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setBackendUrl(e.target.value)}
                      placeholder="https://hospital-angel-maria-gaton-api.onrender.com"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-mono outline-none focus:ring-2 focus:ring-[#0F4C5C] disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-500">
                      Configurado vía <code>VITE_API_BASE_URL</code> o sobreescritura personalizada para este entorno.
                    </p>
                  </div>

                  <div className="sm:col-span-6 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        Modelo de Gemini Preferido:
                      </label>
                      {isLoadingModels && (
                        <span className="text-[10px] text-teal-600 font-semibold animate-pulse">
                          Consultando...
                        </span>
                      )}
                    </div>
                    <select
                      value={settings.geminiModel || geminiService.getActiveModel()}
                      disabled={!isSuperAdmin}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettings({ ...settings, geminiModel: val });
                        geminiService.setActiveModel(val);
                      }}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#0F4C5C]"
                    >
                      {availableModels.length === 0 ? (
                        <option value={settings.geminiModel || 'gemini-2.5-flash'}>
                          {settings.geminiModel || 'gemini-2.5-flash'} (Selección Automática Flash)
                        </option>
                      ) : (
                        availableModels.map((m) => {
                          const isFlash = m.toLowerCase().includes('flash');
                          return (
                            <option key={m} value={m}>
                              {m} {isFlash ? '⚡ (Recomendado Ultrarrápido)' : '🧠 (Alta Capacidad)'}
                            </option>
                          );
                        })
                      )}
                    </select>
                    <p className="text-[10px] text-slate-500">
                      Filtrado exclusivamente a modelos compatibles con <code>generateContent</code>.
                    </p>
                  </div>
                </div>

                {/* Botón de Comprobación */}
                <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Prueba dual: valida <code>/api/health</code> y <code>/api/gemini/test</code> calculando latencia en tiempo real.</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestGeminiConnection}
                    disabled={isTestingGemini}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0F4C5C] hover:bg-[#0c3c49] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-300" />
                    <span>{isTestingGemini ? 'Verificando Backend y Gemini...' : 'Probar Conexión con Gemini'}</span>
                  </button>
                </div>

                {/* Resultado de la prueba */}
                {geminiTestResult && (
                  <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 transition-all ${
                    geminiTestResult.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}>
                    {geminiTestResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <div className="flex-1">
                      <span className="font-bold">{geminiTestResult.message}</span>
                      {geminiTelemetry && (
                        <span className="block text-[11px] opacity-80 mt-0.5">
                          Latencia: {geminiTelemetry.latencyMs} ms · Modelo: {geminiTelemetry.model} · Comprobado: {geminiTelemetry.checkedAt}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Catálogo de Capacidades Activas de la Suite */}
              <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 text-[#0F4C5C]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Protocolos Clínicos & Garantías Institucionales</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Citas Oficiales sin Alucinaciones</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Búsqueda sustentada exclusivamente en AHA, ACC, ESC, IDSA, KDIGO, ADA, GINA, GOLD y Surviving Sepsis.
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Zero-Latency Fallback Local</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Si el hospital se queda sin internet o no hay API Key, el sistema responde instantáneamente desde el catálogo médico local indexado.
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Visión Multimodal para Laboratorios</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Transcripción fiel de fotos de hemograma (14 parámetros en orden exacto) y químicas con botón horizontal de copia rápida.
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Estilo Dr. Joel Colón Aprendido</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Redacción hospitalaria rigurosa para notas de ingreso, evolución y egreso con firma médica automática.
                    </p>
                  </div>
                </div>
              </div>

              {isSuperAdmin && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Configuración de IA Gemini</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: MÉDICOS & FIRMAS DINÁMICAS (RBAC)                                   */}
          {/* ========================================================================= */}
          {activeTab === 'usuarios' && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 text-[#0F4C5C]">
                  <Users className="w-4 h-4" />
                  <span>Médicos Habilitados en el Hospital & Firmas Automáticas</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cada médico en sesión firma automáticamente al pie de página todas las notas de ingreso, órdenes médicas, transferencias y documentos PDF/Word generados con su nombre, especialidad y exequátur legal oficial.
                </p>
              </div>

              {/* Mensaje de éxito de registro de usuario */}
              {userSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{userSuccessMsg}</span>
                </div>
              )}

              {/* Lista de Usuarios Registrados */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Personal Médico Registrado ({users.length})
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {users.map((u) => {
                    const isColon = u.isSuperAdmin || u.id === 'usr-admin-colon';
                    return (
                      <div
                        key={u.id}
                        className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                          isColon
                            ? 'bg-amber-50/60 border-amber-300/80 shadow-xs'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <img
                          src={u.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120'}
                          alt={u.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                        />

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <h6 className="font-bold text-xs text-slate-900 truncate flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isColon && (
                                <span title="SuperAdmin del Sistema">
                                  <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                </span>
                              )}
                            </h6>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide ${
                              u.role === 'ADMINISTRADOR'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : u.role === 'MÉDICO'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : u.role === 'RESIDENTE'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                            }`}>
                              {u.role}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 truncate">{u.specialty}</p>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                            <span className="font-mono font-bold text-slate-700">{u.exequatur || 'Sin Exeq.'}</span>
                            <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                              PIN: {u.pin ? '••••' : 'No asignado'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Formulario para Agregar Nuevo Médico (Solo Dr. Colón SuperAdmin) */}
              {isSuperAdmin && (
                <form onSubmit={handleCreateUser} className="bg-slate-50 rounded-2xl p-4.5 border border-slate-200 space-y-4">
                  <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-[#0F4C5C]">
                    <Plus className="w-4 h-4" />
                    <span>Registrar Nuevo Médico para Firmas Oficiales</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nombre Completo del Médico:
                      </label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="Ej: Dra. Carmen Ramírez"
                        required
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-medium focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Rol en el Hospital:
                      </label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-medium focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                      >
                        <option value="MÉDICO">MÉDICO TRATANTE / ESPECIALISTA</option>
                        <option value="RESIDENTE">MÉDICO RESIDENTE</option>
                        <option value="ADMINISTRADOR">ADMINISTRADOR CLÍNICO</option>
                        <option value="LECTURA">PERSONAL DE AUDITORÍA / LECTURA</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Especialidad o Función Clínica:
                      </label>
                      <input
                        type="text"
                        value={newUserSpecialty}
                        onChange={(e) => setNewUserSpecialty(e.target.value)}
                        placeholder="Ej: Especialista en Medicina Interna"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-medium focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Exequátur Oficial (República Dominicana):
                      </label>
                      <input
                        type="text"
                        value={newUserExequatur}
                        onChange={(e) => setNewUserExequatur(e.target.value)}
                        placeholder="Ej: EXEQ. 78910-15"
                        required
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-medium focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Código PIN de Seguridad (4 Dígitos):
                      </label>
                      <input
                        type="text"
                        value={newUserPin}
                        maxLength={6}
                        onChange={(e) => setNewUserPin(e.target.value)}
                        placeholder="1234"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-mono font-bold focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Habilitar Médico en el Sistema</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: IDENTIDAD INSTITUCIONAL & COLORES                                   */}
          {/* ========================================================================= */}
          {activeTab === 'identidad' && (
            <div className="space-y-6">
              {/* Selector de Color y Tema */}
              <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 text-[#0F4C5C]">
                  <Palette className="w-4 h-4" />
                  <span>Color del Tema & Aspecto Visual</span>
                </h4>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Color Primario:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.themeColor}
                        disabled={!isSuperAdmin}
                        onChange={(e) => setSettings({ ...settings, themeColor: e.target.value })}
                        className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5"
                      />
                      <span className="font-mono text-xs text-slate-700 font-bold">{settings.themeColor}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Modo Oscuro:</label>
                    <button
                      type="button"
                      disabled={!isSuperAdmin}
                      onClick={() => setSettings({ ...settings, isDarkMode: !settings.isDarkMode })}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        settings.isDarkMode
                          ? 'bg-slate-900 text-white border-slate-800'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {settings.isDarkMode ? <Moon className="w-4 h-4 text-amber-300" /> : <Sun className="w-4 h-4 text-amber-500" />}
                      <span>{settings.isDarkMode ? 'Oscuro Activo' : 'Claro Activo'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {isSuperAdmin && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Identidad Institucional</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: EDITOR DE PLANTILLAS OFICIALES & VERSIONADO (Secciones 15 & 16)      */}
          {/* ========================================================================= */}
          {activeTab === 'plantillas' && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 text-[#0F4C5C]">
                    <FileText className="w-4 h-4" />
                    <span>Plantilla Oficial Activa a Editar</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Modifica el orden y la visibilidad de los acápites institucionales.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value as OfficialTemplateId)}
                    className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#0F4C5C]"
                  >
                    <option value="nota_emergencia">1. Nota de Emergencia / Ingreso</option>
                    <option value="nota_traslado">2. Nota de Traslado a Sala</option>
                    <option value="orden_medica">3. Hoja Oficial de Órdenes Médicas</option>
                    <option value="nota_egreso">4. Nota de Alta / Egreso</option>
                    <option value="nota_evolucion">5. Nota de Evolución Diaria</option>
                  </select>

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={handleResetTemplateToFactory}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-white text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Restablecer plantilla a versión inicial"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Fábrica</span>
                    </button>
                  )}
                </div>
              </div>

              {templateSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{templateSuccessMsg}</span>
                </div>
              )}

              {/* Listado de Secciones de la Plantilla */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                  <span>Estructura de Secciones (Versión Activa v{activeTpl.activeVersion})</span>
                  <span>{(activeTpl.currentSections || []).filter((s) => s.enabled).length} de {(activeTpl.currentSections || []).length} activas</span>
                </div>

                <div className="space-y-2">
                  {(activeTpl.currentSections || []).map((section, index) => (
                    <div
                      key={section.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        section.enabled
                          ? 'bg-white border-slate-200 shadow-2xs'
                          : 'bg-slate-100/70 border-slate-200 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 font-mono font-bold text-xs flex items-center justify-center text-slate-600 shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <h5 className="font-bold text-xs text-slate-800 truncate">{section.title}</h5>
                          <p className="text-[11px] text-slate-400 font-mono truncate">{section.description || 'Sección clínica oficial'}</p>
                        </div>
                      </div>

                      {isSuperAdmin && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleTemplateSection(section.id, !section.enabled)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              section.enabled
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            {section.enabled ? 'Activa' : 'Oculta'}
                          </button>

                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveTemplateSection(section.id, 'up')}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={index === (activeTpl.currentSections || []).length - 1}
                            onClick={() => handleMoveTemplateSection(section.id, 'down')}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: OPCIONES PREDEFINIDAS PERSONALIZABLES (SECCIÓN 40)                   */}
          {/* ========================================================================= */}
          {activeTab === 'opciones' && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 text-[#0F4C5C]">
                    <ListPlus className="w-4 h-4" />
                    <span>Categoría de Examen u Órdenes a Personalizar</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Agrega o elimina frases clínicas rápidas utilizadas en los formularios.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#0F4C5C]"
                  >
                    {Object.entries(categoryNames).map(([catKey, catLabel]) => (
                      <option key={catKey} value={catKey}>{catLabel}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleResetQuickOptionsCategory}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-white text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restablecer</span>
                  </button>
                </div>
              </div>

              {/* Agregar nueva opción */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddQuickOption()}
                  placeholder="Escribir nueva opción o hallazgo clínico rápido..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-medium focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddQuickOption}
                  className="px-4 py-2 bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-bold rounded-xl active:scale-95 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar</span>
                </button>
              </div>

              {/* Lista de Opciones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(quickOptions[selectedCategory] || DEFAULT_QUICK_OPTIONS[selectedCategory] || []).map((opt) => (
                  <div
                    key={opt.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <span className="text-xs text-slate-800 font-medium">{opt.label}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuickOption(opt.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: EXAMEN FÍSICO NORMAL PERSONALIZABLE                                 */}
          {/* ========================================================================= */}
          {activeTab === 'examen_normal' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 text-[#0F4C5C]">
                  <Stethoscope className="w-4 h-4" />
                  <span>Examen Físico Normal Predeterminado (Personalizable)</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Configura los textos por defecto que se insertan al pulsar el botón "Examen Físico Normal" en cada sistema anatómico (cabeza, cuello, tórax, abdomen, extremidades, neurológico).
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNormalExamOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>Abrir Editor de Examen Físico Normal</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 8: GUÍAS CLÍNICAS & ESCALAS ACTIVAS                                    */}
          {/* ========================================================================= */}
          {activeTab === 'guias_escalas' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 text-[#0F4C5C]">
                  <BookOpen className="w-4 h-4" />
                  <span>Sociedades Científicas Oficiales Vinculadas</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Fuentes oficiales incorporadas en el buscador inteligente y en la discusión terapéutica de medicamentos:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  {['AHA / ASA (EVC)', 'ACC / AHA (Cardiología)', 'ESC (Cardiología)', 'IDSA (Infecciosas)', 'ATS / ERS (Neumología)', 'KDIGO (Nefrología)', 'ADA (Diabetes)', 'ACG / AGA (Gastro)', 'Surviving Sepsis', 'GINA (Asma)', 'GOLD (EPOC)', 'AABB (Transfusiones)'].map((guide, i) => (
                    <div key={i} className="p-2 bg-white rounded-lg border border-slate-200 font-bold text-slate-700 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{guide}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 text-[#0F4C5C]">
                  <Sparkles className="w-4 h-4" />
                  <span>Escalas Clínicas Integradas Activas</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { name: 'NIHSS (EVC)', range: '0 - 42' },
                    { name: 'Rankin modificado', range: 'mRS 0 - 6' },
                    { name: 'CURB-65 (NAC)', range: '0 - 5' },
                    { name: 'PSI / PORT (NAC)', range: 'Clase I - V' },
                    { name: 'Glasgow-Blatchford', range: '0 - 23' },
                    { name: 'SOFA (Sepsis)', range: '0 - 24' },
                    { name: 'qSOFA (Tamizaje)', range: '0 - 3' },
                    { name: 'NEWS2 (Alerta)', range: '0 - 20' },
                  ].map((scale, i) => (
                    <div key={i} className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-800">{scale.name}</div>
                      <div className="text-[11px] text-slate-500">Rango: {scale.range}</div>
                      <span className="inline-block mt-1 text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                        Activa 100%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            {savedSuccess ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1 animate-bounce">
                <Check className="w-3.5 h-3.5" />
                <span>Configuración guardada exitosamente y sincronizada</span>
              </span>
            ) : (
              <span>
                Sincronización multiusuario activa en la nube • Dr. Joel Colón (SuperAdmin)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Cerrar Panel
          </button>
        </div>
      </div>

      {/* Modal Secundario de Examen Normal */}
      <CustomNormalExamModal
        isOpen={isNormalExamOpen}
        onClose={() => setIsNormalExamOpen(false)}
      />
    </div>
  );
};
