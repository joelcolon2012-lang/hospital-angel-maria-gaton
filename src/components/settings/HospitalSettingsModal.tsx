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
  ToggleRight
} from 'lucide-react';
import { 
  HospitalSettings, 
  OfficialTemplateId, 
  OfficialHospitalTemplate, 
  OfficialTemplateSection,
  QuickOptionItem 
} from '../../types';
import { db } from '../../db/dexieDb';
import { cloudSyncService } from '../../services/cloudSyncService';
import { clinicalTemplateService, DEFAULT_TEMPLATES } from '../../services/clinicalTemplateService';
import { quickOptionsService, DEFAULT_QUICK_OPTIONS } from '../../services/quickOptionsService';
import { CustomNormalExamModal } from './CustomNormalExamModal';

export const DEFAULT_HOSPITAL_SETTINGS: HospitalSettings = {
  hospitalName: 'Hospital Regional Dr. Ángel María Gatón',
  serviceSubtitle: 'Servicio de Emergencias & Medicina Interna',
  logoUrl: '/hospital_logo.jpg',
  defaultDoctor: 'Dr. Colón',
  defaultExequatur: '12345-67',
  themeColor: '#0F4C5C',
  isDarkMode: false,
};

type SettingsTab = 'identidad' | 'plantillas' | 'opciones' | 'examen_normal' | 'guias_escalas';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: (settings: HospitalSettings) => void;
}

export const HospitalSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSettingsSaved,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('identidad');

  // Estado general de identidad institucional
  const [settings, setSettings] = useState<HospitalSettings>(DEFAULT_HOSPITAL_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState(false);

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
          setSettings({ ...DEFAULT_HOSPITAL_SETTINGS, ...identityRecord.value });
        } else {
          const savedLocal = localStorage.getItem('hospital_general_settings');
          const customLogo = localStorage.getItem('hospital_custom_logo');
          if (savedLocal) {
            const parsed = JSON.parse(savedLocal);
            setSettings({
              ...DEFAULT_HOSPITAL_SETTINGS,
              ...parsed,
              logoUrl: customLogo || parsed.logoUrl || DEFAULT_HOSPITAL_SETTINGS.logoUrl
            });
          }
        }
      } catch (e) {
        console.warn('Error cargando identidad:', e);
      }

      // 2. Cargar plantillas hospitalarias
      try {
        const tpls = await clinicalTemplateService.getTemplates();
        setTemplates(tpls);
      } catch (e) {
        console.warn('Error cargando plantillas:', e);
      }

      // 3. Cargar opciones rápidas
      try {
        const opts = await quickOptionsService.getAllOptions();
        setQuickOptions(opts);
      } catch (e) {
        console.warn('Error cargando opciones rápidas:', e);
      }
    };

    loadAllConfig();
  }, [isOpen]);

  if (!isOpen) return null;

  // Manejador para cargar logo institucional
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setSettings((prev) => ({ ...prev, logoUrl: DEFAULT_HOSPITAL_SETTINGS.logoUrl }));
    localStorage.removeItem('hospital_custom_logo');
  };

  // Guardar configuración de Identidad
  const handleSaveIdentity = async () => {
    try {
      // 1. Guardar en Dexie DB
      await db.settings.put({
        id: 'hospital_identity_settings',
        value: settings
      });

      // 2. Respaldo local
      if (settings.logoUrl && settings.logoUrl !== DEFAULT_HOSPITAL_SETTINGS.logoUrl) {
        localStorage.setItem('hospital_custom_logo', settings.logoUrl);
      }
      localStorage.setItem('hospital_general_settings', JSON.stringify(settings));

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
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err: any) {
      alert('Error guardando configuración: ' + err.message);
    }
  };

  // -------------------------------------------------------------
  // ACCIONES DEL EDITOR DE PLANTILLAS OFICIALES (SECCIÓN 15 & 16)
  // -------------------------------------------------------------
  const activeTpl = templates[selectedTemplateId] || DEFAULT_TEMPLATES[selectedTemplateId];

  const handleMoveTemplateSection = async (sectionId: string, direction: 'up' | 'down') => {
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
  const currentCategoryOptions = quickOptions[selectedCategory] || [];

  const handleAddQuickOption = async () => {
    if (!newOptionText.trim()) return;
    await quickOptionsService.addOption(selectedCategory, newOptionText);
    const updated = await quickOptionsService.getAllOptions();
    setQuickOptions(updated);
    setNewOptionText('');
  };

  const handleToggleQuickOption = async (id: string, active: boolean) => {
    await quickOptionsService.toggleOptionActive(selectedCategory, id, active);
    const updated = await quickOptionsService.getAllOptions();
    setQuickOptions(updated);
  };

  const handleDeleteQuickOption = async (id: string) => {
    await quickOptionsService.deleteOption(selectedCategory, id);
    const updated = await quickOptionsService.getAllOptions();
    setQuickOptions(updated);
  };

  const themeColors = [
    { name: 'Azul Petróleo Hospitalario (Oficial)', hex: '#0F4C5C' },
    { name: 'Azul Clínico Royal', hex: '#0284C7' },
    { name: 'Verde Quirúrgico', hex: '#059669' },
    { name: 'Borgoña Clínico', hex: '#881337' },
    { name: 'Grafito Minimalista', hex: '#1E293B' },
  ];

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
      <div className="relative bg-white w-full max-w-4xl rounded-[22px] shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25)] border border-slate-200/80 overflow-hidden flex flex-col max-h-[94vh] z-10">
        {/* Cabecera Principal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0F4C5C]/10 flex items-center justify-center text-[#0F4C5C]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Panel de Administración & Configuración Clínica (Sección 39)
              </h3>
              <p className="text-xs text-slate-500">
                Hospital Regional Dr. Ángel María Gatón • Control administrativo centralizado
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

        {/* Barra de Navegación de Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-3 sm:px-5 py-2 flex flex-wrap items-center gap-1.5 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('identidad')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
              activeTab === 'identidad'
                ? 'bg-[#0F4C5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Identidad & Logo</span>
          </button>

          <button
            onClick={() => setActiveTab('plantillas')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
              activeTab === 'plantillas'
                ? 'bg-[#0F4C5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Editor de Plantillas & Versionado</span>
          </button>

          <button
            onClick={() => setActiveTab('opciones')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
              activeTab === 'opciones'
                ? 'bg-[#0F4C5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" />
            <span>Opciones Predefinidas (Secc. 40)</span>
          </button>

          <button
            onClick={() => setActiveTab('examen_normal')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
              activeTab === 'examen_normal'
                ? 'bg-[#0F4C5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Examen Físico Normal</span>
          </button>

          <button
            onClick={() => setActiveTab('guias_escalas')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
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
          {/* 1. TAB: IDENTIDAD & LOGO (Secciones 17, 38, 39) */}
          {activeTab === 'identidad' && (
            <div className="space-y-6">
              {/* Sección Logo Oficial */}
              <div className="bg-slate-50/90 rounded-2xl p-4.5 border border-slate-200/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider">
                    <ImageIcon className="w-4 h-4 text-[#0F4C5C]" />
                    <span>Logo Oficial Centralizado del Hospital (Sección 17 & 38)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleResetLogo}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Restaurar Escudo Original</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl bg-white p-2 shadow-sm border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={settings.logoUrl}
                      alt="Logo Oficial"
                      className="w-full h-full object-contain rounded-xl"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/hospital_logo.jpg';
                      }}
                    />
                  </div>

                  <div className="flex-1 space-y-1.5 text-center sm:text-left">
                    <p className="text-xs font-bold text-slate-800">
                      Cargar nueva imagen oficial del hospital
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      El logo se almacena de forma centralizada en la base de datos maestra y se sincroniza automáticamente con todos los dispositivos y exportaciones Word/PDF sin depender de rutas locales de computadora.
                    </p>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoFileChange}
                      accept="image/*"
                      className="hidden"
                    />

                    <div className="pt-1.5 flex flex-wrap gap-2 justify-center sm:justify-start">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-bold rounded-xl active:scale-95 shadow-xs transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir Imagen de Logo</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Datos de la Institución */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Datos Institucionales y Membretes
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Hospital</label>
                    <input
                      type="text"
                      value={settings.hospitalName}
                      onChange={(e) => setSettings({ ...settings, hospitalName: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 focus:border-[#0F4C5C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Servicio o Departamento</label>
                    <input
                      type="text"
                      value={settings.serviceSubtitle}
                      onChange={(e) => setSettings({ ...settings, serviceSubtitle: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 focus:border-[#0F4C5C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Médico Especialista Responsable</label>
                    <input
                      type="text"
                      value={settings.defaultDoctor}
                      onChange={(e) => setSettings({ ...settings, defaultDoctor: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 focus:border-[#0F4C5C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Exequátur / Matrícula Profesional</label>
                    <input
                      type="text"
                      value={settings.defaultExequatur}
                      onChange={(e) => setSettings({ ...settings, defaultExequatur: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 focus:border-[#0F4C5C]"
                    />
                  </div>
                </div>
              </div>

              {/* Colores */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-[#0F4C5C]" />
                  <span>Color de Acento Institucional</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {themeColors.map((color) => {
                    const isSelected = settings.themeColor === color.hex;
                    return (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => setSettings({ ...settings, themeColor: color.hex })}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-slate-800 bg-slate-50 font-bold shadow-2xs'
                            : 'border-slate-200 hover:bg-slate-50/50 text-slate-700'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: color.hex }} />
                        <span className="text-xs truncate">{color.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botón Guardar Identidad */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveIdentity}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
                  <span>{savedSuccess ? '¡Identidad Guardada!' : 'Guardar Identidad del Hospital'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. TAB: EDITOR DE PLANTILLAS & VERSIONADO (Secciones 15 & 16) */}
          {activeTab === 'plantillas' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Seleccionar Plantilla Oficial:
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value as OfficialTemplateId)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 shadow-xs outline-none"
                  >
                    <option value="nota_emergencia">🚨 NOTA DE INGRESO EMERGENCIA</option>
                    <option value="nota_recibimiento">🏥 NOTA DE RECIBIMIENTO EN SALA</option>
                    <option value="evolucion">📈 EVOLUCIÓN MÉDICA HOSPITALARIA</option>
                    <option value="orden_medica">💊 ORDEN MÉDICA OFICIAL</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-300">
                    PLANTILLA OFICIAL ACTIVA: v{activeTpl.activeVersion}
                  </span>
                  <button
                    type="button"
                    onClick={handleResetTemplateToFactory}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium"
                  >
                    Valores de Fábrica
                  </button>
                </div>
              </div>

              {templateSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-2 font-semibold">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{templateSuccessMsg}</span>
                </div>
              )}

              {/* Lista Ordenada de Secciones */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase px-1">
                  <span>Orden Oficial de Secciones ({activeTpl.currentSections.length} secciones)</span>
                  <span>Mover / Estado</span>
                </div>

                <div className="space-y-1.5">
                  {activeTpl.currentSections.map((sec, idx) => (
                    <div
                      key={sec.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        sec.enabled
                          ? 'bg-white border-slate-200 shadow-2xs'
                          : 'bg-slate-50/70 border-dashed border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{sec.title}</span>
                            {sec.required && (
                              <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                                Requerido
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">{sec.description}</p>
                        </div>
                      </div>

                      {/* Controles de Orden y Toggle */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveTemplateSection(sec.id, 'up')}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center text-slate-700 transition-colors"
                          title="Subir sección"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          disabled={idx === activeTpl.currentSections.length - 1}
                          onClick={() => handleMoveTemplateSection(sec.id, 'down')}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center text-slate-700 transition-colors"
                          title="Bajar sección"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleTemplateSection(sec.id, !sec.enabled)}
                          className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                            sec.enabled
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {sec.enabled ? 'Activa' : 'Oculta'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Historial de Versiones Inmutables (Sección 16) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#0F4C5C]" />
                  <span>Historial de Versiones Preservadas (Sección 16)</span>
                </h5>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Ninguna versión anterior es destruida. Cada modificación crea una nueva entrada con fecha y usuario facultado.
                </p>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {activeTpl.versionHistory && activeTpl.versionHistory.map((vh) => (
                    <div
                      key={vh.version}
                      className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-[#0F4C5C]">Versión v{vh.version}</span>
                        <span className="text-slate-400 mx-1.5">•</span>
                        <span className="text-slate-600">{vh.updatedBy}</span>
                        <span className="text-slate-400 mx-1.5">•</span>
                        <span className="text-slate-500 text-[11px]">{new Date(vh.updatedAt).toLocaleDateString('es-DO')}</span>
                        <p className="text-[11px] text-slate-500 italic mt-0.5">{vh.changeSummary}</p>
                      </div>

                      {vh.version !== activeTpl.activeVersion && (
                        <button
                          type="button"
                          onClick={() => handleRollbackTemplate(vh.version)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restaurar</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. TAB: OPCIONES PREDEFINIDAS PERSONALIZABLES (Sección 40) */}
          {activeTab === 'opciones' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Categoría de Examen / Orden:
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 shadow-xs outline-none"
                  >
                    {Object.entries(categoryNames).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => quickOptionsService.resetCategoryToDefault(selectedCategory).then(() => quickOptionsService.getAllOptions().then(setQuickOptions))}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium"
                >
                  Restaurar Opciones por Defecto
                </button>
              </div>

              {/* Formulario para Agregar Nueva Opción */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Agregar nueva opción a ${categoryNames[selectedCategory] || selectedCategory}... (Ej: Estertores velcro)`}
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddQuickOption()}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 shadow-inner focus:ring-2 focus:ring-[#0F4C5C]/20 focus:border-[#0F4C5C] outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddQuickOption}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Opción</span>
                </button>
              </div>

              {/* Lista de Opciones Activas/Inactivas */}
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {currentCategoryOptions.map((opt, idx) => (
                  <div
                    key={opt.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      opt.isActive
                        ? 'bg-white border-slate-200 shadow-2xs'
                        : 'bg-slate-100/60 border-dashed border-slate-200 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">{opt.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleQuickOption(opt.id, !opt.isActive)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                          opt.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {opt.isActive ? 'Activa' : 'Desactivada'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuickOption(opt.id)}
                        className="w-6 h-6 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors"
                        title="Eliminar opción"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. TAB: EXAMEN FÍSICO NORMAL PERSONALIZABLE (Sección 21 & 39) */}
          {activeTab === 'examen_normal' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 text-[#0F4C5C]">
                  <Stethoscope className="w-4 h-4" />
                  <span>Plantilla de Examen Físico Normal del Dr. Colón (16 Sistemas)</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Permite definir sus frases estándar de normalidad para cada uno de los 16 sistemas independientes (Cabeza, Cuello, Tórax, Pulmones, Corazón, Abdomen, Extremidades, Neurológico, etc.). Al presionar "Cargar Examen Normal" en cualquier paciente nuevo, se pre-llenan automáticamente.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNormalExamOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>Abrir Editor de Examen Físico Normal Personalizado</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. TAB: GUÍAS CLÍNICAS & ESCALAS ACTIVAS (Sección 1 & 39) */}
          {activeTab === 'guias_escalas' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 text-[#0F4C5C]">
                  <BookOpen className="w-4 h-4" />
                  <span>Sociedades Científicas Oficiales Vinculadas (Sección 1)</span>
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
                  <span>Escalas Clínicas Integradas Activas (Sección 10 & 25)</span>
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
          <span className="text-[11px] text-slate-500">
            Sincronización multiusuario y en la nube activa 24/7 (Google Apps Script v2-realtime)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors"
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
