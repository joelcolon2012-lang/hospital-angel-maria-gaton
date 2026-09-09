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
} from 'lucide-react';
import { HospitalSettings } from '../../types';

export const DEFAULT_HOSPITAL_SETTINGS: HospitalSettings = {
  hospitalName: 'Hospital Regional Dr. Ángel María Gatón',
  serviceSubtitle: 'Servicio de Emergencias & Medicina Interna',
  logoUrl: '/hospital_logo.jpg',
  defaultDoctor: 'Dr. Colón',
  defaultExequatur: '12345-67',
  themeColor: '#0F4C5C',
  isDarkMode: false,
};

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

  const [settings, setSettings] = useState<HospitalSettings>(DEFAULT_HOSPITAL_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Cargar configuración guardada al abrir
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hospital_general_settings');
      const customLogo = localStorage.getItem('hospital_custom_logo');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({
          ...DEFAULT_HOSPITAL_SETTINGS,
          ...parsed,
          logoUrl: customLogo || parsed.logoUrl || DEFAULT_HOSPITAL_SETTINGS.logoUrl,
        });
      } else if (customLogo) {
        setSettings((prev) => ({ ...prev, logoUrl: customLogo }));
      }
    } catch {
      // Usar defaults
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Manejo de carga de archivo de logo
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

  const handleSave = () => {
    // 1. Guardar logo en localStorage
    if (settings.logoUrl && settings.logoUrl !== DEFAULT_HOSPITAL_SETTINGS.logoUrl) {
      localStorage.setItem('hospital_custom_logo', settings.logoUrl);
    }

    // 2. Guardar configuración completa
    localStorage.setItem('hospital_general_settings', JSON.stringify(settings));

    // 3. Aplicar color primario CSS variable
    document.documentElement.style.setProperty('--primary-color', settings.themeColor);

    // 4. Aplicar modo oscuro si aplica
    if (settings.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // 5. Notificar a toda la aplicación
    window.dispatchEvent(new Event('hospital_settings_changed'));

    if (onSettingsSaved) {
      onSettingsSaved(settings);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const themeColors = [
    { name: 'Azul Petróleo Hospitalario (Oficial)', hex: '#0F4C5C' },
    { name: 'Azul Clínico Royal', hex: '#0284C7' },
    { name: 'Verde Médico Quirúrgico', hex: '#059669' },
    { name: 'Borgoña Clínico', hex: '#881337' },
    { name: 'Grafito Minimalista', hex: '#1E293B' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-2xl rounded-[20px] shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18)] border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh] z-10">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0F4C5C]/10 flex items-center justify-center text-[#0F4C5C]">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Configuración de la Aplicación & Logo
              </h3>
              <p className="text-xs text-slate-500">
                Personaliza la identidad institucional, membretes y apariencia visual
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
          {/* 1. SECCIÓN: LOGO DEL HOSPITAL */}
          <div className="bg-slate-50/80 rounded-[16px] p-4 border border-slate-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <ImageIcon className="w-4 h-4 text-[#0F4C5C]" />
                <span>Logo Oficial del Hospital</span>
              </label>
              <button
                type="button"
                onClick={handleResetLogo}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                title="Restaurar el logo institucional original"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Restaurar Original</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Preview Circle */}
              <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-sm border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src={settings.logoUrl}
                  alt="Logo del Hospital"
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/hospital_logo.jpg';
                  }}
                />
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-1.5 text-center sm:text-left">
                <p className="text-xs font-semibold text-slate-700">
                  Cargar nueva imagen o escudo hospitalario
                </p>
                <p className="text-[11px] text-slate-500">
                  Formato recomendado: PNG transparente o JPG cuadrado. Se reflejará en la cabecera y en los documentos PDF y Word.
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoFileChange}
                  accept="image/*"
                  className="hidden"
                />

                <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-bold rounded-[10px] active:scale-95 shadow-xs transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Seleccionar Archivo de Imagen</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. SECCIÓN: DATOS DE LA INSTITUCIÓN */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Identidad de la Institución & Servicio
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre del Hospital
                </label>
                <input
                  type="text"
                  value={settings.hospitalName}
                  onChange={(e) => setSettings({ ...settings, hospitalName: e.target.value })}
                  placeholder="Ej. Hospital Regional Dr. Ángel María Gatón"
                  className="w-full bg-white border border-slate-200 rounded-[12px] p-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 focus:border-[#0F4C5C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Servicio o Departamento
                </label>
                <input
                  type="text"
                  value={settings.serviceSubtitle}
                  onChange={(e) => setSettings({ ...settings, serviceSubtitle: e.target.value })}
                  placeholder="Ej. Servicio de Emergencias & Medicina Interna"
                  className="w-full bg-white border border-slate-200 rounded-[12px] p-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 focus:border-[#0F4C5C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Médico Especialista a Cargo
                </label>
                <input
                  type="text"
                  value={settings.defaultDoctor}
                  onChange={(e) => setSettings({ ...settings, defaultDoctor: e.target.value })}
                  placeholder="Ej. Dr. Colón"
                  className="w-full bg-white border border-slate-200 rounded-[12px] p-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 focus:border-[#0F4C5C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Exequátur / Registro Médico
                </label>
                <input
                  type="text"
                  value={settings.defaultExequatur}
                  onChange={(e) => setSettings({ ...settings, defaultExequatur: e.target.value })}
                  placeholder="Ej. 12345-67"
                  className="w-full bg-white border border-slate-200 rounded-[12px] p-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 focus:border-[#0F4C5C]"
                />
              </div>
            </div>
          </div>

          {/* 3. SECCIÓN: COLOR PRINCIPAL & TEMA */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-[#0F4C5C]" />
              <span>Color de Acento de la Interfaz</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {themeColors.map((color) => {
                const isSelected = settings.themeColor === color.hex;
                return (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setSettings({ ...settings, themeColor: color.hex })}
                    className={`flex items-center gap-3 p-2.5 rounded-[12px] border text-left transition-all ${
                      isSelected
                        ? 'border-slate-800 bg-slate-50 font-bold shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50/50 text-slate-700'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-xs truncate">{color.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-[10px] hover:bg-slate-200/60 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-bold rounded-[12px] shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            <span>{savedSuccess ? '¡Configuración Guardada!' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
