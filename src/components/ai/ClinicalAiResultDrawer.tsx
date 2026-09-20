import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Globe,
  ExternalLink,
  History,
  Trash2,
  AlertTriangle,
  Clock,
  Send,
  Cpu,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { AISearchSource, AISearchHistoryItem } from '../../types';
import { ClinicalMarkdownRenderer } from './ClinicalMarkdownRenderer';
import { aiSearchHistoryService } from '../../services/ai/aiSearchHistoryService';
import { authService } from '../../services/authService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  answer: string;
  sources: AISearchSource[];
  isStreaming: boolean;
  isLoading: boolean;
  mode: 'ia' | 'web';
  latencyMs?: number;
  modelUsed?: string;
  error?: string | null;
  onNewSearch: (newQuery?: string) => void;
}

export const ClinicalAiResultDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  query,
  answer,
  sources,
  isStreaming,
  isLoading,
  mode,
  latencyMs,
  modelUsed = 'gemini-3.6-flash',
  error,
  onNewSearch
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'response' | 'history'>('response');
  const [historyItems, setHistoryItems] = useState<AISearchHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const currentUser = authService.getCurrentUser();

  // Escuchar tecla ESC para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Cargar historial del usuario autenticado
  const loadUserHistory = async () => {
    if (!currentUser?.id) return;
    setIsLoadingHistory(true);
    try {
      const items = await aiSearchHistoryService.getHistoryByUser(currentUser.id);
      setHistoryItems(items);
    } catch (e) {
      console.warn('Error cargando historial:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      loadUserHistory();
    }
  }, [isOpen, activeTab]);

  const handleCopyAnswer = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleClearHistory = async () => {
    if (!currentUser?.id) return;
    if (window.confirm('¿Desea borrar todo su historial de consultas de IA clínica?')) {
      await aiSearchHistoryService.clearHistoryByUser(currentUser.id);
      setHistoryItems([]);
    }
  };

  const handleSelectHistoryItem = (item: AISearchHistoryItem) => {
    setActiveTab('response');
    onNewSearch(item.query);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop oscuro translúcido con desenfoque suave */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer deslizante desde la derecha (en móvil ocupa 100% de alto y ancho) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <aside
          className={`w-screen transition-all duration-300 ease-in-out bg-white shadow-2xl flex flex-col ${
            isExpanded ? 'sm:max-w-3xl' : 'sm:max-w-xl'
          }`}
        >
          {/* 1. ENCABEZADO DEL DRAWER */}
          <div className="bg-[#0F4C5C] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 shadow-xs border-b border-teal-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-teal-200 shadow-2xs">
                <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm sm:text-base tracking-wide leading-tight">
                    IA CLÍNICA
                  </h3>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    mode === 'web'
                      ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                      : 'bg-teal-700 text-teal-100 border border-teal-500/40'
                  }`}>
                    {mode === 'web' ? <Globe className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                    <span>{mode === 'web' ? 'WEB + IA' : 'IA'}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-teal-100/80 mt-0.5">
                  <span className="flex items-center gap-1 font-mono">
                    <Cpu className="w-3 h-3 text-teal-300" />
                    {modelUsed}
                  </span>
                  {latencyMs ? (
                    <span>• {latencyMs} ms</span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Controles de Ventana */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'response' ? 'history' : 'response')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  activeTab === 'history' ? 'bg-white/20 text-white' : 'text-teal-200 hover:text-white hover:bg-white/10'
                }`}
                title="Historial de consultas del usuario"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">Historial</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:flex text-teal-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title={isExpanded ? 'Reducir tamaño' : 'Ampliar pantalla'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-teal-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar panel (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 2. CUERPO SCROLLABLE DEL DRAWER */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {activeTab === 'history' ? (
              /* PESTAÑA DE HISTORIAL */
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-teal-700" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                      Historial de Consultas de {currentUser?.name || 'Médico'}
                    </h4>
                  </div>
                  {historyItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Borrar Historial</span>
                    </button>
                  )}
                </div>

                {isLoadingHistory ? (
                  <div className="py-12 text-center text-xs text-slate-500 animate-pulse">
                    Cargando historial...
                  </div>
                ) : historyItems.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                    <p>No tienes consultas previas registradas.</p>
                    <p className="text-[11px] text-slate-400">
                      Tus preguntas clínicas se guardan de forma privada en este dispositivo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {historyItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectHistoryItem(item)}
                        className="p-3 bg-slate-50 hover:bg-teal-50/60 rounded-xl border border-slate-200 hover:border-teal-300 transition-all cursor-pointer group space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-900 group-hover:text-teal-950 truncate max-w-[75%]">
                            {item.query}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {new Date(item.timestamp).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {item.answer}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span className="uppercase font-bold text-teal-700">
                            {item.mode === 'web' ? '🌐 Búsqueda Web' : '⚡ Modo IA'}
                          </span>
                          <span className="flex items-center gap-1 text-teal-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                            <span>Ver respuesta</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* PESTAÑA PRINCIPAL: RESPUESTA ACTUAL */
              <>
                {/* Tarjeta de la Consulta */}
                <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-teal-800">
                      Consulta Clínica
                    </span>
                    <span className="text-[10px] font-mono">
                      {new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug">
                    {query || 'Consulta en espera...'}
                  </p>
                </div>

                {/* Estado de Error */}
                {error && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold">Error en la Consulta</h4>
                      <p className="text-[11px] leading-relaxed">{error}</p>
                    </div>
                  </div>
                )}

                {/* Estado de Carga Inicial */}
                {isLoading && !answer && (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 animate-spin">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-800 animate-pulse">
                        {mode === 'web' ? 'Consultando Gemini y buscando evidencia en la web...' : 'Consultando Gemini con guías clínicas...'}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Priorizando consensos oficiales, guías vigentes y farmacología.
                      </p>
                    </div>
                  </div>
                )}

                {/* Contenido de la Respuesta de Gemini */}
                {answer ? (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-[11px] font-bold text-[#0F4C5C] uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                          <span>Respuesta Basada en Evidencia</span>
                        </span>
                        {isStreaming && (
                          <span className="text-[10px] text-teal-600 font-semibold animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                            <span>Generando...</span>
                          </span>
                        )}
                      </div>

                      {/* Renderizador de Markdown Clínico */}
                      <ClinicalMarkdownRenderer content={answer} isStreaming={isStreaming} />
                    </div>

                    {/* Sección de Fuentes Verificadas de Búsqueda Web */}
                    {sources && sources.length > 0 && (
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-teal-800">
                            <Globe className="w-3.5 h-3.5 text-teal-700" />
                            <span>Fuentes y Referencias Web Detectadas</span>
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            Google Search Grounding
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {sources.map((src, idx) => (
                            <a
                              key={idx}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 bg-white hover:bg-teal-50/80 rounded-xl border border-slate-200 hover:border-teal-300 transition-all flex items-start justify-between gap-2 group text-left"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[11px] font-bold text-slate-800 group-hover:text-teal-900 line-clamp-1">
                                  {src.title}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono truncate block">
                                  {src.url.replace(/^https?:\/\//, '')}
                                </span>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-700 shrink-0 mt-0.5" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Aviso Clínico Obligatorio */}
                    <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-[11px] text-teal-950 flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-[#0F4C5C] shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <strong>Aviso Médico:</strong> Esta respuesta es un apoyo a la decisión clínica sustentado en guías y no reemplaza el juicio clínico ni los protocolos del Hospital Regional Dr. Ángel María Gatón.
                      </p>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>

          {/* 3. PIE DE ACCIONES DEL DRAWER */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              {/* Botón Nueva Consulta */}
              <button
                type="button"
                onClick={() => onNewSearch()}
                className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-200" />
                <span>Nueva Consulta</span>
              </button>

              {/* Botón Copiar Respuesta */}
              {answer && (
                <button
                  type="button"
                  onClick={handleCopyAnswer}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                  title="Copiar texto de la respuesta al portapapeles"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copiado' : 'Copiar Respuesta'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
