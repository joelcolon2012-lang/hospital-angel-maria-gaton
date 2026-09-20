import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Globe,
  X,
  Loader2,
  Stethoscope,
  Calculator,
  BookOpen,
  Pill,
  Activity,
  Heart,
  Droplets,
  AlertCircle,
  User as UserIcon,
} from 'lucide-react';
import { AISearchSource } from '../../types';
import { clinicalAiSearchService } from '../../services/ai/clinicalAiSearchService';
import { aiSearchHistoryService } from '../../services/ai/aiSearchHistoryService';
import { authService } from '../../services/authService';
import { ClinicalAiResultDrawer } from './ClinicalAiResultDrawer';

interface QuickSuggestionCategory {
  id: string;
  category: string;
  icon: any;
  items: Array<{ label: string; query: string; web?: boolean }>;
}

export interface ClinicalAiTopBarProps {
  patientSearchQuery?: string;
  onPatientSearchChange?: (q: string) => void;
}

const QUICK_SUGGESTIONS: QuickSuggestionCategory[] = [
  {
    id: 'evc',
    category: 'EVC & Neurología',
    icon: Activity,
    items: [
      { label: 'Manejo inicial del EVC isquémico', query: 'Manejo inicial del EVC isquémico agudo según AHA/ASA' },
      { label: 'Criterios de trombolisis r-tPA', query: 'Criterios de inclusión y exclusión de trombolisis con alteplasa en EVC' },
      { label: 'ICH Score y hematoma', query: 'Cómo calcular e interpretar el ICH Score en hemorragia intracerebral' },
    ]
  },
  {
    id: 'cardio',
    category: 'Cardiología & SCA',
    icon: Heart,
    items: [
      { label: 'Criterios de Sgarbossa', query: 'Criterios de Sgarbossa y Smith-Sgarbossa para IAM con bloqueo de rama izquierda' },
      { label: 'Dosis amiodarona en TV/FV', query: 'Protocolo y dosis de amiodarona en paro cardíaco por TV/FV según ACLS' },
      { label: 'Clasificación Killip', query: 'Clasificación de Killip y Kimball en infarto agudo de miocardio' },
    ]
  },
  {
    id: 'nefro',
    category: 'Nefrología & Renal',
    icon: Droplets,
    items: [
      { label: 'Clasificación KDIGO', query: 'Criterios de estadificación KDIGO para Lesión Renal Aguda (LRA)' },
      { label: 'Manejo de hiperkalemia severa', query: 'Protocolo de estabilización de membrana y desplazamiento celular en hiperkalemia severa' },
      { label: 'Cálculo de déficit de agua', query: 'Fórmula de cálculo de déficit de agua libre en hipernatremia' },
    ]
  },
  {
    id: 'farmaco',
    category: 'Medicamento / Dosis',
    icon: Pill,
    items: [
      { label: 'Dosis vancomicina en ERC', query: 'Ajuste de dosis y carga de vancomicina en paciente con ERC' },
      { label: 'Dosis noradrenalina shock', query: 'Titulación de infusión de norepinefrina en shock séptico según Surviving Sepsis' },
      { label: 'Reversión de anticoagulantes', query: 'Protocolo de reversión urgente de warfarina y DOACs (apixaban/rivaroxaban)' },
    ]
  },
  {
    id: 'sepsis',
    category: 'Sepsis & Antibioterapia',
    icon: Stethoscope,
    items: [
      { label: 'Protocolo Surviving Sepsis', query: 'Paquete de la primera hora (1-hour bundle) Surviving Sepsis Campaign' },
      { label: 'Antibióticos en NAC severa', query: 'Esquema antibiótico empírico en neumonía adquirida en la comunidad severa según IDSA' },
      { label: 'Criterios diagnósticos HHS / CAD', query: 'Criterios diagnósticos y diferencias entre Cetoacidosis Diabética y Estado Hiperosmolar' },
    ]
  },
  {
    id: 'escalas',
    category: 'Calcular Escala',
    icon: Calculator,
    items: [
      { label: 'Criterios Wells TEP', query: 'Escala de Wells para Tromboembolismo Pulmonar e interpretación' },
      { label: 'Escala ABCD2 para AIT', query: 'Cálculo y estratificación de riesgo de la escala ABCD2 en AIT' },
      { label: 'CURB-65 en neumonía', query: 'Puntuación CURB-65 y criterios de ingreso hospitalario vs UCI' },
    ]
  },
];

export const ClinicalAiTopBar: React.FC<ClinicalAiTopBarProps> = ({
  patientSearchQuery,
  onPatientSearchChange,
}) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'ia' | 'web' | 'pacientes'>('ia');
  const [isFocused, setIsFocused] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);

  // Estado de Drawer y Consulta Activa
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeQuery, setActiveQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<AISearchSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | undefined>();
  const [modelUsed, setModelUsed] = useState('gemini-3.6-flash');
  const [error, setError] = useState<string | null>(null);

  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Atajos de teclado: Ctrl + K / Cmd + K para enfocar; ESC para cerrar popover
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        desktopInputRef.current?.focus();
        desktopInputRef.current?.select();
        setIsFocused(true);
      }
      if (e.key === 'Escape') {
        setIsFocused(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ejecución de la consulta clínica
  const handleExecuteSearch = async (overrideQuery?: string, overrideMode?: 'ia' | 'web') => {
    const q = (overrideQuery !== undefined ? overrideQuery : query).trim();
    if (!q) return;

    const currentMode: 'ia' | 'web' = overrideMode || (mode === 'web' ? 'web' : 'ia');

    // Cerrar sugerencias y modal móvil si estaba abierto
    setIsFocused(false);
    setShowMobileModal(false);

    // Preparar estado del drawer
    setActiveQuery(q);
    setAnswer('');
    setSources([]);
    setError(null);
    setIsLoading(true);
    setIsStreaming(true);
    setIsDrawerOpen(true);

    // Cancelar consulta previa si existía
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const startTime = performance.now();

    try {
      const res = await clinicalAiSearchService.search({
        query: q,
        useWeb: currentMode === 'web',
        signal: abortController.signal,
        onChunk: (chunk) => {
          setIsLoading(false);
          setAnswer(prev => prev + chunk);
        }
      });

      const totalLatency = Math.round(performance.now() - startTime);
      setLatencyMs(res.latencyMs || totalLatency);
      if (res.modelUsed) setModelUsed(res.modelUsed);
      if (res.sources) setSources(res.sources);
      if (res.answer) setAnswer(res.answer);

      // Guardar en historial por usuario
      const currentUser = authService.getCurrentUser();
      if (currentUser?.id && res.answer) {
        await aiSearchHistoryService.saveHistoryItem({
          userId: currentUser.id,
          query: q,
          answer: res.answer,
          sources: res.sources,
          mode: currentMode,
          latencyMs: res.latencyMs || totalLatency,
          modelUsed: res.modelUsed || 'gemini-3.6-flash'
        });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'No fue posible completar la consulta.');
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleClear = () => {
    if (mode === 'pacientes') {
      onPatientSearchChange?.('');
    } else {
      setQuery('');
    }
    desktopInputRef.current?.focus();
  };

  const handleSuggestionClick = (sQuery: string, sWeb?: boolean) => {
    setQuery(sQuery);
    const newMode = sWeb ? 'web' : mode === 'pacientes' ? 'ia' : mode;
    if (sWeb) setMode('web');
    else if (mode === 'pacientes') setMode('ia');
    handleExecuteSearch(sQuery, newMode);
  };

  const isPatientMode = mode === 'pacientes';
  const currentInputValue = isPatientMode ? (patientSearchQuery ?? '') : query;

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. BARRA PRINCIPAL EN EL HEADER (DESKTOP) & BOTÓN EXPANDIBLE (MÓVIL)     */}
      {/* ========================================================================= */}
      <div ref={containerRef} className="relative flex-1 max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl mx-1 sm:mx-3">
        {/* VISTA DESKTOP / TABLET (visible desde sm) */}
        <div className={`hidden sm:flex items-center gap-1.5 bg-slate-50 hover:bg-white focus-within:bg-white border rounded-full px-2 py-1 shadow-2xs transition-all ${
          isPatientMode
            ? 'border-sky-300 focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-600/20'
            : 'border-teal-200/90 focus-within:border-[#0F4C5C] focus-within:ring-2 focus-within:ring-[#0F4C5C]/20'
        }`}>
          {/* Icono de IA o Paciente */}
          <div className="pl-1 shrink-0">
            {isPatientMode ? (
              <UserIcon className="w-4 h-4 text-sky-600" />
            ) : (
              <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
            )}
          </div>

          {/* Input Principal */}
          <input
            ref={desktopInputRef}
            type="text"
            value={currentInputValue}
            onChange={(e) => {
              if (isPatientMode) {
                onPatientSearchChange?.(e.target.value);
              } else {
                setQuery(e.target.value);
              }
            }}
            onFocus={() => {
              if (!isPatientMode) setIsFocused(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (!isPatientMode) {
                  handleExecuteSearch();
                }
              }
            }}
            placeholder={
              isPatientMode
                ? 'Buscar paciente (nombre, cédula, cubículo)...'
                : isLoading
                ? 'Consultando IA...'
                : 'Pregunta a la IA clínica...'
            }
            disabled={isLoading}
            className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none font-medium truncate"
          />

          {/* Botón Limpiar */}
          {currentInputValue && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              title="Limpiar texto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Selector de Modo: [ IA ] [ WEB ] [ Pacientes ] */}
          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-full text-[10px] font-extrabold shrink-0 border border-slate-300/60">
            <button
              type="button"
              onClick={() => setMode('ia')}
              className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                mode === 'ia'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Modo IA General: Razonamiento clínico sobre consensos oficiales"
            >
              IA
            </button>
            <button
              type="button"
              onClick={() => setMode('web')}
              className={`px-2 py-0.5 rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                mode === 'web'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Modo WEB + IA: Búsqueda activa en Google Grounding para guías recientes"
            >
              <Globe className="w-2.5 h-2.5" />
              <span>WEB</span>
            </button>
            {onPatientSearchChange && (
              <button
                type="button"
                onClick={() => setMode('pacientes')}
                className={`px-2 py-0.5 rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                  mode === 'pacientes'
                    ? 'bg-sky-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Modo Pacientes: Filtrar pacientes por nombre, cédula o cubículo"
              >
                <UserIcon className="w-2.5 h-2.5" />
                <span className="hidden md:inline">Pacientes</span>
              </button>
            )}
          </div>

          {/* Botón Buscar */}
          {!isPatientMode && (
            <button
              type="button"
              onClick={() => handleExecuteSearch()}
              disabled={!query.trim() || isLoading}
              className="inline-flex items-center gap-1 px-3 py-1 bg-[#0F4C5C] hover:bg-[#0c3c49] text-white text-[11px] font-bold rounded-full transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-2xs cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-300" />
                  <span className="hidden md:inline">Buscando</span>
                </>
              ) : (
                <>
                  <Search className="w-3 h-3" />
                  <span>Buscar</span>
                </>
              )}
            </button>
          )}

          {/* Atajo de Teclado Visual (Ctrl K) */}
          <span className="hidden xl:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-white border border-slate-200 text-slate-400 font-bold shrink-0">
            Ctrl K
          </span>
        </div>

        {/* VISTA MÓVIL (visible en < sm) */}
        <div className="flex sm:hidden items-center justify-end">
          <button
            type="button"
            onClick={() => setShowMobileModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-300/80 text-teal-900 text-xs font-black shadow-2xs active:scale-95 transition-all"
            title="Abrir buscador de IA clínica"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>IA Clínica</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 2. POPOVER DE CONSULTAS RÁPIDAS (DESKTOP)                                */}
        {/* ========================================================================= */}
        {isFocused && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white rounded-2xl shadow-xl border border-teal-200/80 p-3 sm:p-4 text-xs space-y-3 animate-in fade-in slide-in-from-top-2 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-[10px] font-extrabold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sugerencias Clínicas Rápidas</span>
              </span>
              <span className="text-[10px] text-slate-400">
                Presiona <kbd className="px-1 py-0.5 bg-slate-100 rounded border text-[9px]">Esc</kbd> para salir
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {QUICK_SUGGESTIONS.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <div key={cat.id} className="p-2 bg-slate-50/70 rounded-xl border border-slate-200/60 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                      <IconComponent className="w-3.5 h-3.5 text-teal-700" />
                      <span>{cat.category}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {cat.items.map((it, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSuggestionClick(it.query, it.web);
                          }}
                          className="text-left px-2 py-1 rounded-lg bg-white hover:bg-teal-50 border border-slate-200/70 hover:border-teal-300 text-[11px] text-slate-700 hover:text-teal-950 transition-all truncate"
                          title={it.query}
                        >
                          {it.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL MÓVIL / BOTTOM SHEET FULLSCREEN PARA IPHONE Y ANDROID             */}
      {/* ========================================================================= */}
      {showMobileModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end sm:hidden animate-in fade-in">
          <div className="bg-white rounded-t-3xl border-t border-teal-200 p-4 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            {/* Header Móvil */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Consulta con IA Clínica</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input y Botón Móvil */}
            <div className="space-y-2">
              <div className="relative">
                <input
                  ref={mobileInputRef}
                  type="text"
                  value={currentInputValue}
                  onChange={(e) => {
                    if (isPatientMode) {
                      onPatientSearchChange?.(e.target.value);
                    } else {
                      setQuery(e.target.value);
                    }
                  }}
                  placeholder={
                    isPatientMode
                      ? 'Buscar paciente (nombre, cédula)...'
                      : 'Pregunta a la IA clínica...'
                  }
                  style={{ fontSize: '16px' }} // Evita auto-zoom en iOS Safari
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-[#0F4C5C]"
                />
                {currentInputValue && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Selector y Botón Buscar */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setMode('ia')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      mode === 'ia' ? 'bg-teal-800 text-white shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    IA
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('web')}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                      mode === 'web' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    <span>WEB</span>
                  </button>
                  {onPatientSearchChange && (
                    <button
                      type="button"
                      onClick={() => setMode('pacientes')}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                        mode === 'pacientes' ? 'bg-sky-700 text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      <UserIcon className="w-3 h-3" />
                      <span>Pacientes</span>
                    </button>
                  )}
                </div>

                {!isPatientMode ? (
                  <button
                    type="button"
                    onClick={() => handleExecuteSearch()}
                    disabled={!query.trim() || isLoading}
                    className="flex-1 py-2 px-4 bg-[#0F4C5C] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>BUSCAR</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowMobileModal(false)}
                    className="flex-1 py-2 px-4 bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>VER LISTA</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sugerencias Rápidas en Móvil */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Consultas Rápidas Recomendadas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUGGESTIONS.flatMap(c => c.items).slice(0, 8).map((it, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestionClick(it.query, it.web)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-medium active:bg-teal-100"
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DRAWER LATERAL DE RESULTADOS                                            */}
      {/* ========================================================================= */}
      <ClinicalAiResultDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        query={activeQuery}
        answer={answer}
        sources={sources}
        isStreaming={isStreaming}
        isLoading={isLoading}
        mode={mode === 'web' ? 'web' : 'ia'}
        latencyMs={latencyMs}
        modelUsed={modelUsed}
        error={error}
        onNewSearch={(newQ) => {
          if (newQ) {
            setQuery(newQ);
            handleExecuteSearch(newQ);
          } else {
            setIsDrawerOpen(false);
            setTimeout(() => {
              desktopInputRef.current?.focus();
            }, 150);
          }
        }}
      />
    </>
  );
};
