import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Sparkles,
  X,
  ExternalLink,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { ClinicalAIService } from '../../services/ai/ClinicalAIService';
import { ClinicalSearchResponse } from '../../services/ai/ClinicalSearchService';

interface Props {
  patientSearchQuery: string;
  onPatientSearchChange: (q: string) => void;
}

export const SmartMedicalSearchBar: React.FC<Props> = ({
  patientSearchQuery,
  onPatientSearchChange,
}) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'medical' | 'patients'>('medical');
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [searchResult, setSearchResult] = useState<ClinicalSearchResponse | null>(null);
  const [showFullExplanation, setShowFullExplanation] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const EMERGENCY_CHIPS = [
    { label: '⚡ EVC Isquémico', query: 'Manejo actual de EVC isquémico' },
    { label: '⚡ Dosis Tenecteplasa', query: 'Dosis de tenecteplasa' },
    { label: '⚡ Neumonía NAC', query: 'Tratamiento de neumonía adquirida en la comunidad' },
    { label: '⚡ Sepsis / Shock', query: 'Criterios de sepsis y surviving sepsis' },
    { label: '⚡ KDIGO Renal', query: 'Clasificación KDIGO de lesión renal aguda' },
    { label: '⚡ Transfusión', query: 'Criterios de transfusión' },
    { label: '⚡ Hiperkalemia', query: 'Tratamiento de hiperkalemia' },
    { label: '⚡ Meningitis', query: 'Dosis de ceftriaxona en meningitis' },
  ];

  // Atajo global de teclado (Ctrl + K o Cmd + K)
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

  // Autofoco al abrir el modal
  useEffect(() => {
    if (isOpenModal) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpenModal]);

  // Búsqueda en vivo al escribir o seleccionar
  const handleExecuteSearch = (qToSearch: string) => {
    const clean = qToSearch.trim();
    if (!clean) {
      setSearchResult(null);
      return;
    }

    if (mode === 'patients') {
      onPatientSearchChange(clean);
      return;
    }

    const res = ClinicalAIService.searchKnowledge(clean);
    setSearchResult(res);
    setShowFullExplanation(false);
  };

  const handleCopyAnswer = () => {
    if (!searchResult) return;
    const textToCopy = `CONSULTA: ${searchResult.query}\nGUÍA: ${searchResult.guidelineName} (${searchResult.sourceSociety}, ${searchResult.publicationYear})\nCONDUCTA RECOMENDADA: ${searchResult.briefAnswer}`;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <>
      {/* 1. DISPARADOR EN EL HEADER (RESPONSIVO PARA MÓVIL Y ESCRITORIO) */}
      <div className="flex-1 max-w-sm sm:max-w-md mx-1 sm:mx-2">
        <button
          type="button"
          onClick={() => setIsOpenModal(true)}
          className="w-full flex items-center justify-between gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border border-teal-200 bg-teal-50/70 hover:bg-white hover:border-teal-400 text-teal-950 transition-all shadow-2xs group text-left cursor-pointer"
          title="Abrir buscador clínico inteligente (Ctrl + K)"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0 group-hover:rotate-12 transition-transform" />
            <span className="text-[11px] sm:text-xs text-slate-600 truncate font-medium">
              <span className="hidden md:inline">Consultar guías clínicas (EVC, Sepsis...)</span>
              <span className="inline md:hidden font-bold text-teal-900">Guías IA & Pacientes</span>
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-white border border-teal-200 text-teal-800 font-bold shrink-0">
            Ctrl K
          </span>
        </button>
      </div>

      {/* 2. MODAL / PALETA DE COMANDOS FLOTANTE (NUNCA SE CORTA) */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-3 sm:p-5 pt-8 sm:pt-14 overflow-y-auto animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-teal-100 overflow-hidden flex flex-col max-h-[90vh] text-xs animate-in zoom-in-95">
            {/* Header del Buscador */}
            <div className="bg-[#0F4C5C] text-white px-4 sm:px-5 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-600/60 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-teal-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base leading-tight">
                    Buscador Clínico Basado en Evidencia
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-teal-100">
                    Hospital Regional Dr. Ángel María Gatón • Consensos Oficiales Vigentes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="text-teal-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                title="Cerrar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Modo y Barra de Entrada */}
            <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                {/* Selector de Modo */}
                <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('medical');
                      if (query) handleExecuteSearch(query);
                    }}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                      mode === 'medical'
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⚡ Guías Médicas (IA)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('patients');
                      setSearchResult(null);
                    }}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                      mode === 'patients'
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    👤 Buscar Paciente
                  </button>
                </div>

                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  Presiona <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded font-mono">Esc</kbd> para salir
                </span>
              </div>

              {/* Input Principal con Icono y Botón de Limpieza */}
              <div className="relative flex items-center">
                {mode === 'medical' ? (
                  <Sparkles className="w-4 h-4 text-teal-600 absolute left-3 pointer-events-none" />
                ) : (
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={mode === 'medical' ? query : patientSearchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (mode === 'medical') {
                      setQuery(val);
                      handleExecuteSearch(val);
                    } else {
                      onPatientSearchChange(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleExecuteSearch(mode === 'medical' ? query : patientSearchQuery);
                    }
                  }}
                  placeholder={
                    mode === 'medical'
                      ? 'Escribe un diagnóstico, fármaco, escala (ej: EVC, Tenecteplasa, Sepsis, KDIGO)...'
                      : 'Escribe nombre, número de expediente, cédula o cubículo del paciente...'
                  }
                  className="w-full text-xs sm:text-sm rounded-xl pl-9 pr-8 py-2.5 bg-white border border-teal-200 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 outline-none text-slate-900 font-medium placeholder:text-slate-400 shadow-xs"
                />
                {((mode === 'medical' && query) || (mode === 'patients' && patientSearchQuery)) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (mode === 'medical') {
                        setQuery('');
                        setSearchResult(null);
                      } else {
                        onPatientSearchChange('');
                      }
                      inputRef.current?.focus();
                    }}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Chips de Acceso Rápido a Urgencias (Solo Modo Médico) */}
              {mode === 'medical' && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>Consultas Rápidas de Emergencia:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {EMERGENCY_CHIPS.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setQuery(chip.query);
                          handleExecuteSearch(chip.query);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-100/70 border border-slate-200 hover:border-teal-300 text-[11px] font-medium text-slate-700 hover:text-teal-900 transition-all active:scale-95 shadow-2xs cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Contenido de Resultados */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {mode === 'medical' ? (
                searchResult ? (
                  <div className="space-y-3.5 animate-in fade-in">
                    {/* Tarjeta de Fuente y Nivel de Evidencia */}
                    <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider">
                          Consenso Clínico Oficial:
                        </span>
                        {searchResult.evidenceLevel && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {searchResult.evidenceLevel}
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-emerald-300 leading-snug">
                        {searchResult.guidelineName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300 pt-0.5">
                        <span>Sociedad: <strong>{searchResult.sourceSociety}</strong></span>
                        <span>Año: <strong>{searchResult.publicationYear}</strong></span>
                        <a
                          href={searchResult.verifiedSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-teal-300 hover:underline font-bold ml-auto"
                        >
                          <span>Ver enlace oficial</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Conducta Clínica Sintetizada */}
                    <div className="bg-teal-50/80 border border-teal-200 p-4 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-teal-950 text-xs sm:text-sm flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-teal-700" />
                          Conducta y Dosificación Recomendada:
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyAnswer}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-teal-300 text-teal-800 hover:bg-teal-100 font-bold text-[11px] transition-all shadow-2xs active:scale-95 cursor-pointer"
                          title="Copiar recomendación clínica para pegar en notas"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopied ? '¡Copiado!' : 'Copiar Conducta'}</span>
                        </button>
                      </div>
                      <p className="text-slate-900 text-xs sm:text-sm leading-relaxed font-normal">
                        {searchResult.briefAnswer}
                      </p>
                    </div>

                    {/* Desplegable de Explicación Completa */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowFullExplanation(!showFullExplanation)}
                        className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-200 shadow-2xs cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4 text-teal-700" />
                        <span>
                          {showFullExplanation
                            ? 'OCULTAR CRITERIOS DETALLADOS'
                            : 'VER CRITERIOS COMPLETOS Y PROTOCOLO DETALLADO'}
                        </span>
                        {showFullExplanation ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </button>

                      {showFullExplanation && (
                        <div className="mt-2.5 bg-slate-50 border border-slate-300 p-4 rounded-xl text-xs font-sans text-slate-800 leading-relaxed whitespace-pre-line animate-in fade-in">
                          {searchResult.fullExplanation}
                        </div>
                      )}
                    </div>

                    {/* Preguntas Relacionadas */}
                    {searchResult.suggestedRelatedQueries && searchResult.suggestedRelatedQueries.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          Consultas relacionadas:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {searchResult.suggestedRelatedQueries.map((rq, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setQuery(rq);
                                handleExecuteSearch(rq);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 text-[11px] font-medium transition-colors"
                            >
                              {rq}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 space-y-2">
                    <Sparkles className="w-8 h-8 mx-auto text-teal-300 animate-pulse" />
                    <p className="font-bold text-xs text-slate-600">
                      Escribe tu consulta médica o haz clic en uno de los accesos rápidos arriba.
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Respuestas instantáneas fundamentadas en las guías AHA/ASA, IDSA, KDIGO, ADA, Surviving Sepsis y ATS.
                    </p>
                  </div>
                )
              ) : (
                /* Modo Búsqueda de Pacientes */
                <div className="space-y-2">
                  <p className="text-xs text-slate-600">
                    Búsqueda activa de pacientes en el sistema: <strong>"{patientSearchQuery || 'Todos'}"</strong>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Los resultados de la lista principal en pantalla se filtran en tiempo real con este término.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsOpenModal(false)}
                    className="mt-2 px-4 py-2 bg-teal-800 text-white font-bold rounded-xl text-xs"
                  >
                    Ver lista filtrada en pantalla principal
                  </button>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[10px] sm:text-[11px] text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Privacidad estricta: Cero PII o datos de pacientes transmitidos</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="px-4 py-1.5 bg-[#0F4C5C] hover:bg-teal-900 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
