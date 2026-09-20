import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Check,
  Copy,
  ExternalLink,
  Clock,
  Trash2,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { AISearchSource, Patient } from '../../types';
import { clinicalAiSearchService } from '../../services/ai/clinicalAiSearchService';
import { aiSearchHistoryService } from '../../services/ai/aiSearchHistoryService';
import { authService } from '../../services/authService';
import { ClinicalMarkdownRenderer } from './ClinicalMarkdownRenderer';
import { db } from '../../db/dexieDb';

interface QuickSuggestionCategory {
  id: string;
  category: string;
  icon: any;
  items: Array<{ label: string; query: string; web?: boolean }>;
}

export interface ClinicalAiTopBarProps {
  patientSearchQuery?: string;
  onPatientSearchChange?: (q: string) => void;
  onSelectPatient?: (patient: Patient) => void;
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
  patientSearchQuery = '',
  onPatientSearchChange,
  onSelectPatient,
}) => {
  // Estado modal desplegable principal
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [mode, setMode] = useState<'ia' | 'web' | 'pacientes'>('ia');
  const [query, setQuery] = useState('');

  // Estado de respuesta de IA
  const [activeQuery, setActiveQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<AISearchSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | undefined>();
  const [modelUsed, setModelUsed] = useState('gemini-3.6-flash');
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Estado de lista de pacientes para modo 'pacientes'
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [filteredModalPatients, setFilteredModalPatients] = useState<Patient[]>([]);

  // Pestaña de historial en el modal
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);

  const modalInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Atajo global de teclado (Ctrl + K o Cmd + K) y ESC para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpenModal(true);
      }
      if (e.key === 'Escape' && isOpenModal) {
        setIsOpenModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenModal]);

  // Autofoco y recarga de pacientes al abrir modal
  useEffect(() => {
    if (isOpenModal) {
      setTimeout(() => {
        modalInputRef.current?.focus();
        modalInputRef.current?.select();
      }, 100);

      // Cargar pacientes desde Dexie para búsqueda instantánea
      db.patients.toArray().then((list) => {
        setAllPatients(list);
        setFilteredModalPatients(list);
      }).catch(() => {});

      // Cargar historial del usuario
      const u = authService.getCurrentUser();
      if (u?.id) {
        aiSearchHistoryService.getHistoryByUser(u.id).then(setHistoryItems).catch(() => {});
      }
    }
  }, [isOpenModal]);

  // Filtrado reactivo de pacientes cuando se escribe en modo 'pacientes'
  useEffect(() => {
    if (mode === 'pacientes') {
      const q = query.toLowerCase().trim();
      if (!q) {
        setFilteredModalPatients(allPatients);
      } else {
        const matches = allPatients.filter((p) => {
          return (
            (p.fullName && p.fullName.toLowerCase().includes(q)) ||
            (p.internalCode && p.internalCode.toLowerCase().includes(q)) ||
            (p.medicalRecordNumber && p.medicalRecordNumber.toLowerCase().includes(q)) ||
            (p.cubicle && p.cubicle.toLowerCase().includes(q)) ||
            (p.chiefComplaint && p.chiefComplaint.toLowerCase().includes(q)) ||
            (p.idDocument && p.idDocument.toLowerCase().includes(q))
          );
        });
        setFilteredModalPatients(matches);
      }
      // Sincronizar con el filtro global de la pantalla principal
      onPatientSearchChange?.(query);
    }
  }, [query, mode, allPatients, onPatientSearchChange]);

  // Ejecutar búsqueda clínica con Gemini
  const handleExecuteSearch = async (overrideQuery?: string, overrideMode?: 'ia' | 'web') => {
    const q = (overrideQuery !== undefined ? overrideQuery : query).trim();
    if (!q) return;

    if (mode === 'pacientes' && !overrideMode) {
      // En modo pacientes, cerrar modal para ver la lista filtrada
      setIsOpenModal(false);
      return;
    }

    const currentMode: 'ia' | 'web' = overrideMode || (mode === 'web' ? 'web' : 'ia');
    if (overrideMode) setMode(overrideMode);

    setShowHistory(false);
    setActiveQuery(q);
    setAnswer('');
    setSources([]);
    setError(null);
    setIsLoading(true);
    setIsStreaming(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const ac = new AbortController();
    abortControllerRef.current = ac;

    const startTime = Date.now();

    try {
      const res = await clinicalAiSearchService.search({
        query: q,
        useWeb: currentMode === 'web',
        signal: ac.signal,
        onChunk: (accumulated) => {
          setAnswer(accumulated);
          setIsStreaming(true);
        },
      });

      const totalLatency = Date.now() - startTime;
      setLatencyMs(res.latencyMs || totalLatency);
      if (res.modelUsed) setModelUsed(res.modelUsed);
      if (res.sources) setSources(res.sources);
      if (res.answer) setAnswer(res.answer);

      // Guardar en Dexie DB
      const currentUser = authService.getCurrentUser();
      if (currentUser?.id && res.answer) {
        await aiSearchHistoryService.saveHistoryItem({
          userId: currentUser.id,
          query: q,
          answer: res.answer,
          sources: res.sources,
          mode: currentMode,
          latencyMs: res.latencyMs || totalLatency,
          modelUsed: res.modelUsed || 'gemini-3.6-flash',
        });
        // Recargar historial
        aiSearchHistoryService.getHistoryByUser(currentUser.id).then(setHistoryItems).catch(() => {});
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

  const handleCopyAnswer = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleClearHistory = async () => {
    const u = authService.getCurrentUser();
    if (u?.id) {
      await aiSearchHistoryService.clearHistoryByUser(u.id);
      setHistoryItems([]);
    }
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DISPARADOR PERMANENTE EN EL HEADER (TOTALMENTE DESPLEGABLE AL CLIC)     */}
      {/* ========================================================================= */}
      <div className="flex-1 max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl mx-1 sm:mx-3">
        <button
          type="button"
          onClick={() => setIsOpenModal(true)}
          className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-full border border-teal-200/90 bg-teal-50/70 hover:bg-white hover:border-[#0F4C5C] focus:border-[#0F4C5C] text-slate-800 shadow-2xs transition-all cursor-pointer group text-left"
          title="Abrir buscador clínico inteligente con IA y pacientes (Ctrl + K)"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 group-hover:rotate-12 transition-transform" />
            <span className="text-xs text-slate-600 truncate font-medium">
              <span className="hidden md:inline">
                {query || (patientSearchQuery ? `Paciente: ${patientSearchQuery}` : '✨ Pregunta a la IA clínica o busca pacientes...')}
              </span>
              <span className="inline md:hidden font-bold text-teal-900">
                {query || 'IA Clínica & Pacientes'}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-white border border-teal-200 text-teal-800 font-bold">
              Ctrl K
            </span>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0F4C5C] text-white text-[11px] font-bold rounded-full shadow-2xs group-hover:bg-[#0c3c49] transition-colors">
              <Search className="w-3 h-3" />
              <span className="hidden sm:inline">Buscar</span>
            </div>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. MODAL DESPLEGABLE / PALETA DE COMANDOS COMPLETA VIA REACT PORTAL       */}
      {/* ========================================================================= */}
      {isOpenModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 sm:pt-8 md:pt-12 overflow-y-auto select-text animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsOpenModal(false);
            }}
          >
            <div
              className="bg-white w-full max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl border border-teal-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in zoom-in-95 duration-200 my-auto text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del Modal */}
              <div className="bg-[#0F4C5C] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 shadow-md">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-600/90 flex items-center justify-center shadow-xs">
                    <Sparkles className="w-5 h-5 text-teal-200 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base leading-tight">
                      Buscador Clínico Inteligente & Pacientes
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-teal-100">
                      Hospital Regional Dr. Ángel María Gatón • Consensos Oficiales & Google Gemini
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      showHistory
                        ? 'bg-white text-teal-900 border-white shadow-xs'
                        : 'border-teal-400/50 text-teal-100 hover:bg-white/10'
                    }`}
                    title="Historial de consultas previas"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Historial</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpenModal(false)}
                    className="p-1.5 rounded-xl text-teal-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Cerrar ventana (Esc)"
                    aria-label="Cerrar modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Barra de Entrada y Selector de Modos */}
              <div className="p-3 sm:p-5 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
                {/* Selector de Modo */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center bg-slate-200/90 p-0.5 rounded-xl border border-slate-300">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('ia');
                        setShowHistory(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                        mode === 'ia'
                          ? 'bg-teal-800 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                      <span>IA Clínica</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('web');
                        setShowHistory(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                        mode === 'web'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="IA con búsqueda activa en Google Search para literatura reciente"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>IA + WEB</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('pacientes');
                        setShowHistory(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                        mode === 'pacientes'
                          ? 'bg-sky-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>Buscar Paciente</span>
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    Presiona <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">Esc</kbd> para salir
                  </span>
                </div>

                {/* Input Principal */}
                <div className="relative flex items-center">
                  {mode === 'pacientes' ? (
                    <UserIcon className="w-5 h-5 text-sky-600 absolute left-3.5 pointer-events-none" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-emerald-600 absolute left-3.5 pointer-events-none" />
                  )}

                  <input
                    ref={modalInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (mode === 'pacientes') {
                          onPatientSearchChange?.(query);
                          setIsOpenModal(false);
                        } else {
                          handleExecuteSearch();
                        }
                      }
                    }}
                    placeholder={
                      mode === 'pacientes'
                        ? 'Escribe nombre, número de expediente, cédula o cubículo del paciente...'
                        : mode === 'web'
                        ? 'Consulta médica con búsqueda en internet (ej: Guía Surviving Sepsis 2024, DOACs)...'
                        : 'Pregunta a la IA clínica (ej: Criterios Sgarbossa, Dosis vancomicina en ERC, EVC)...'
                    }
                    style={{ fontSize: '16px' }} // Previene auto-zoom molesto en iOS Safari
                    className="w-full rounded-2xl pl-11 pr-24 py-3 bg-white border border-teal-200 focus:border-[#0F4C5C] focus:ring-2 focus:ring-[#0F4C5C]/20 outline-none text-slate-900 font-medium placeholder:text-slate-400 shadow-xs"
                  />

                  <div className="absolute right-2.5 flex items-center gap-1">
                    {query && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuery('');
                          if (mode === 'pacientes') onPatientSearchChange?.('');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
                        title="Limpiar texto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {mode !== 'pacientes' ? (
                      <button
                        type="button"
                        onClick={() => handleExecuteSearch()}
                        disabled={!query.trim() || isLoading}
                        className="px-3.5 py-1.5 bg-[#0F4C5C] hover:bg-[#0c3c49] text-white text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-40 shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-300" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                        <span>Buscar</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsOpenModal(false)}
                        className="px-3.5 py-1.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                      >
                        Aplicar
                      </button>
                    )}
                  </div>
                </div>

                {/* Chips de Sugerencias Rápidas de Emergencia */}
                {mode !== 'pacientes' && !showHistory && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>Consultas Rápidas Recomendadas:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {QUICK_SUGGESTIONS.flatMap((c) => c.items).map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setQuery(item.query);
                            handleExecuteSearch(item.query, item.web ? 'web' : undefined);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-[11px] font-medium text-slate-700 hover:text-teal-900 transition-all active:scale-95 shadow-2xs cursor-pointer truncate max-w-xs"
                          title={item.query}
                        >
                          ⚡ {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Cuerpo de Contenido */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {showHistory ? (
                  /* ================= VISTA DE HISTORIAL ================= */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                        Historial de Consultas Médicas
                      </span>
                      {historyItems.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearHistory}
                          className="text-[11px] text-red-600 hover:text-red-800 flex items-center gap-1 font-bold cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Vaciar historial</span>
                        </button>
                      )}
                    </div>

                    {historyItems.length === 0 ? (
                      <div className="py-10 text-center text-slate-400">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p>No tienes consultas previas registradas.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {historyItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-teal-50/60 hover:border-teal-300 transition-all space-y-1.5 cursor-pointer"
                            onClick={() => {
                              setActiveQuery(item.query);
                              setAnswer(item.answer);
                              setSources(item.sources || []);
                              setLatencyMs(item.latencyMs);
                              setModelUsed(item.modelUsed || 'gemini-3.6-flash');
                              setMode(item.mode || 'ia');
                              setShowHistory(false);
                            }}
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-900 truncate max-w-md">
                                {item.query}
                              </span>
                              <span className="text-slate-400 font-mono text-[10px]">
                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-2">
                              {item.answer}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : mode === 'pacientes' ? (
                  /* ================= VISTA DE PACIENTES ================= */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-200">
                      <span>
                        Mostrando <strong>{filteredModalPatients.length}</strong> de <strong>{allPatients.length}</strong> pacientes
                      </span>
                      {query && (
                        <span className="text-teal-800 font-bold">
                          Filtrado por: "{query}"
                        </span>
                      )}
                    </div>

                    {filteredModalPatients.length === 0 ? (
                      <div className="py-10 text-center text-slate-400">
                        <UserIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-bold text-sm text-slate-700">No se encontraron pacientes</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Verifica el nombre, cédula o cubículo ingresado.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {filteredModalPatients.map((patient) => (
                          <div
                            key={patient.id}
                            onClick={() => {
                              onSelectPatient?.(patient);
                              onPatientSearchChange?.(patient.fullName);
                              setIsOpenModal(false);
                            }}
                            className="p-3 bg-white hover:bg-teal-50/80 border border-slate-200 hover:border-teal-400 rounded-xl transition-all shadow-2xs flex items-center justify-between gap-2 cursor-pointer group"
                          >
                            <div className="space-y-0.5 truncate">
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-slate-900 group-hover:text-teal-950 text-xs sm:text-sm truncate">
                                  {patient.fullName}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                  {patient.cubicle}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">
                                {patient.chiefComplaint || 'Sin motivo especificado'}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                <span>{patient.internalCode}</span>
                                {patient.age && <span>• {patient.age} años ({patient.sex})</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 text-teal-700 font-bold text-xs shrink-0 group-hover:translate-x-0.5 transition-transform">
                              <span className="hidden sm:inline">Ver</span>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ================= VISTA DE RESPUESTA DE IA ================= */
                  <div>
                    {isLoading && !answer && (
                      <div className="py-12 text-center space-y-3">
                        <Loader2 className="w-8 h-8 mx-auto text-teal-600 animate-spin" />
                        <p className="font-bold text-slate-800 text-sm">Consultando guías médicas con Google Gemini...</p>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Analizando consensos oficiales y evidencia clínica vigente para <em>"{activeQuery}"</em>.
                        </p>
                      </div>
                    )}

                    {error && (
                      <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-xs">Error en la consulta médica</h4>
                          <p className="text-[11px] mt-0.5">{error}</p>
                        </div>
                      </div>
                    )}

                    {answer && (
                      <div className="space-y-4 animate-in fade-in">
                        {/* Banner de Metadatos */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-teal-900 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{modelUsed}</span>
                            </span>
                            {latencyMs && (
                              <span className="text-slate-500 font-mono">
                                ({(latencyMs / 1000).toFixed(1)}s)
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                              {mode === 'web' ? 'Búsqueda Web Grounding' : 'Consensos Oficiales'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleCopyAnswer}
                              className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-teal-50 hover:text-teal-900 font-bold text-[11px] transition-all flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{isCopied ? '¡Copiado!' : 'Copiar'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setQuery('');
                                setAnswer('');
                                setActiveQuery('');
                                modalInputRef.current?.focus();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-teal-800 text-white font-bold text-[11px] hover:bg-teal-900 transition-all shadow-2xs cursor-pointer"
                            >
                              + Nueva Pregunta
                            </button>
                          </div>
                        </div>

                        {/* Texto Markdown Renderizado */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
                          <ClinicalMarkdownRenderer content={answer} isStreaming={isStreaming} />
                        </div>

                        {/* Fuentes Oficiales Verificadas */}
                        {sources && sources.length > 0 && (
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                              Fuentes y Referencias Oficiales:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {sources.map((src, idx) => (
                                <a
                                  key={idx}
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-[11px] text-teal-800 font-medium transition-all shadow-2xs"
                                >
                                  <span className="truncate max-w-xs">{src.title || src.url}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {!isLoading && !answer && !error && (
                      <div className="py-12 text-center text-slate-400 space-y-2">
                        <Sparkles className="w-8 h-8 mx-auto text-teal-400 animate-pulse" />
                        <p className="font-bold text-sm text-slate-700">
                          Escribe tu pregunta clínica o haz clic en una de las sugerencias rápidas arriba.
                        </p>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          Respuestas estructuradas basadas en evidencia, guías internacionales (AHA, IDSA, KDIGO, Surviving Sepsis) y búsqueda activa en la web.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer del Modal */}
              <div className="bg-slate-100 border-t border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
                <span>
                  Uso exclusivo médico • Hospital Regional Dr. Ángel María Gatón
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-3 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-200 font-bold cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
