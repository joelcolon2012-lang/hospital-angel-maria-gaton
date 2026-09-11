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
  const [isOpenResultModal, setIsOpenResultModal] = useState(false);
  const [searchResult, setSearchResult] = useState<ClinicalSearchResponse | null>(null);
  const [showFullExplanation, setShowFullExplanation] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const QUICK_EXAMPLES = [
    'Manejo actual de EVC isquémico',
    'Dosis de tenecteplasa',
    'Tratamiento de neumonía adquirida en la comunidad',
    'Criterios de transfusión',
    'Clasificación KDIGO de lesión renal aguda',
    'Tratamiento de hiperkalemia',
    'Dosis de ceftriaxona en meningitis',
  ];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExecuteSearch = (qToSearch: string) => {
    if (!qToSearch.trim()) return;

    if (mode === 'patients') {
      onPatientSearchChange(qToSearch);
      return;
    }

    // Modo Médico con IA (Sección 1)
    const res = ClinicalAIService.searchKnowledge(qToSearch);
    setSearchResult(res);
    setShowFullExplanation(false);
    setIsOpenResultModal(true);
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleExecuteSearch(query);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-lg mx-2 hidden sm:block">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        {mode === 'medical' ? (
          <Sparkles className="w-3.5 h-3.5 text-teal-600 absolute left-3 pointer-events-none" />
        ) : (
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
        )}

        <input
          type="text"
          value={mode === 'medical' ? query : patientSearchQuery}
          onChange={(e) => {
            if (mode === 'medical') {
              setQuery(e.target.value);
            } else {
              onPatientSearchChange(e.target.value);
            }
          }}
          onFocus={() => {
            if (mode === 'medical') setIsDropdownOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === 'medical'
              ? 'Consultar guía, medicamento, diagnóstico, escala o manejo clínico…'
              : 'Buscar paciente por nombre, expediente o cubículo...'
          }
          className={`w-full text-xs rounded-full pl-8 pr-24 py-1.5 border outline-none transition-all placeholder:text-slate-400 ${
            mode === 'medical'
              ? 'bg-teal-50/50 border-teal-200 focus:bg-white focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 text-teal-950 font-medium'
              : 'bg-slate-100 hover:bg-slate-100 focus:bg-white text-slate-800 border-transparent focus:border-slate-300'
          }`}
        />

        {/* Mode Toggle Switch Pill */}
        <div className="absolute right-1.5 flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const nextMode = mode === 'medical' ? 'patients' : 'medical';
              setMode(nextMode);
              if (nextMode === 'patients') setIsDropdownOpen(false);
            }}
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-colors ${
              mode === 'medical'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
            title="Alternar entre Consulta Médica con IA y Búsqueda de Pacientes"
          >
            {mode === 'medical' ? 'IA Guías' : 'Pacientes'}
          </button>

          {((mode === 'medical' && query) || (mode === 'patients' && patientSearchQuery)) && (
            <button
              onClick={() => {
                if (mode === 'medical') setQuery('');
                else onPatientSearchChange('');
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Suggested Queries Dropdown (Sección 1) */}
      {isDropdownOpen && mode === 'medical' && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-teal-100 p-3 z-50 text-xs space-y-2 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold border-b border-slate-100 pb-1.5">
            <span className="flex items-center gap-1 text-teal-800">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Consultas Clínicas Rápidas (AHA, ESC, IDSA, KDIGO, ADA, ACG):</span>
            </span>
            <span className="text-[10px] text-slate-400">Presiona Enter para buscar</span>
          </div>

          <div className="grid grid-cols-1 gap-1">
            {QUICK_EXAMPLES.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(ex);
                  handleExecuteSearch(ex);
                }}
                className="text-left px-2.5 py-1.5 rounded-xl hover:bg-teal-50 text-slate-800 text-[11px] font-medium flex items-center justify-between group transition-colors"
              >
                <span>{ex}</span>
                <ArrowRight className="w-3 h-3 text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>

          <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Privacidad estricta: Cero PII o datos de pacientes transmitidos</span>
            <span className="font-semibold text-teal-800">Guías Oficiales Vigentes</span>
          </div>
        </div>
      )}

      {/* Medical AI Answer Modal (Sección 1) */}
      {isOpenResultModal && searchResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-xs animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-[#0F4C5C] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-300" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base leading-tight">
                    Consulta Médica Basada en Guías Oficiales
                  </h3>
                  <p className="text-[11px] text-teal-100">
                    Hospital Regional Ángel María Gatón — Requisito 1
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpenResultModal(false)}
                className="text-teal-200 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* Query Badge */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Consulta solicitada:
                </span>
                <p className="text-slate-900 font-extrabold text-sm sm:text-base mt-0.5">
                  "{searchResult.query}"
                </p>
              </div>

              {/* Verified Source Citation Box (Sección 1) */}
              <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block">
                  Fuente Médica Oficial Verificada:
                </span>
                <h4 className="font-extrabold text-xs sm:text-sm text-emerald-300">
                  {searchResult.guidelineName}
                </h4>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300 pt-0.5">
                  <span>Sociedad: <strong>{searchResult.sourceSociety}</strong></span>
                  <span>Año: <strong>{searchResult.publicationYear}</strong></span>
                  {searchResult.evidenceLevel && (
                    <span>Nivel: <strong>{searchResult.evidenceLevel}</strong></span>
                  )}
                  <a
                    href={searchResult.verifiedSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-teal-300 hover:underline font-bold"
                  >
                    <span>Ver enlace a la fuente</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Brief Clinical Answer Initially (Sección 1) */}
              <div className="bg-teal-50/70 border border-teal-200 p-4 rounded-xl space-y-2">
                <span className="font-bold text-teal-950 block text-xs">
                  Respuesta Clínica Sintetizada:
                </span>
                <p className="text-slate-800 text-xs sm:text-sm leading-relaxed">
                  {searchResult.briefAnswer}
                </p>
              </div>

              {/* Button: "VER EXPLICACIÓN COMPLETA" (Sección 1) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowFullExplanation(!showFullExplanation)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-300 shadow-2xs"
                >
                  <BookOpen className="w-4 h-4 text-teal-700" />
                  <span>
                    {showFullExplanation
                      ? 'OCULTAR EXPLICACIÓN DETALLADA'
                      : 'VER EXPLICACIÓN COMPLETA'}
                  </span>
                  {showFullExplanation ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {/* Expanded Full Explanation */}
                {showFullExplanation && (
                  <div className="mt-3 bg-slate-50 border border-slate-300 p-4 rounded-xl text-xs font-sans text-slate-800 leading-relaxed whitespace-pre-line animate-in fade-in">
                    {searchResult.fullExplanation}
                  </div>
                )}
              </div>

              {/* Related Queries Pills */}
              {searchResult.suggestedRelatedQueries.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 block">
                    Consultas relacionadas:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {searchResult.suggestedRelatedQueries.map((rq, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleExecuteSearch(rq)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 text-[11px] font-medium transition-colors"
                      >
                        {rq}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Solo fuentes y sociedades oficiales (AHA, ESC, IDSA, KDIGO, ADA)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpenResultModal(false)}
                className="px-5 py-2 bg-[#0F4C5C] hover:bg-petrol-800 text-white rounded-xl font-bold text-xs shadow-md"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
