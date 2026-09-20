import React, { useState, useEffect } from 'react';
import {
  Patient,
  MedicalOrder,
  LabResult,
  PendingTask,
  GuardiaClinicalBed,
  SuggestedLabDiagnosis,
  StructuredDiagnosis
} from '../../types';
import {
  generateSuggestedLabDiagnoses,
  analyzeLabTrendsAndResolutions
} from '../../services/ai/ClinicalLabInterpreter';
import { centralSyncService } from '../../services/centralSyncService';
import {
  Clock,
  Activity,
  Pill,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Check,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Plus,
  ChevronDown,
  ChevronUp,
  User,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Edit3,
  X
} from 'lucide-react';

export interface RowUpdateNotification {
  patientId: string;
  updatedBy: string;
  timestamp: number;
}

interface Props {
  beds: GuardiaClinicalBed[];
  patientsMap: Map<string, Patient>;
  labs: LabResult[];
  orders: MedicalOrder[];
  pendingTasks: PendingTask[];
  currentUser?: { name: string; role: string };
  lastRemoteUpdate?: RowUpdateNotification | null;
  onSelectPatient: (patient: Patient) => void;
  onOpenAddPending: (patient: Patient) => void;
  onOpenAddLab: (patient: Patient) => void;
  onOpenTrendModal: (patientName: string, paramName: string, labs: LabResult[]) => void;
  onOpenEvolutionModal?: (patient: Patient) => void;
  onOpenOrderModal?: (patient: Patient) => void;
  onOpenHistoryModal?: (patient: Patient) => void;
  onOpenAdmitToBed?: (bed: GuardiaClinicalBed) => void;
  onOpenAddOrder?: (patient: Patient) => void;
  onOpenQuickEvolution?: (patient: Patient) => void;
  onOpenQuickDiagnosis?: (patient: Patient) => void;
  onOpenEditComplaint?: (patient: Patient) => void;
  onConfirmSuggestedDiagnosis: (patient: Patient, diagName: string) => void;
  onDiscardSuggestedDiagnosis: (patient: Patient, diagName: string) => void;
}

export const GuardiaHorizontalTable: React.FC<Props> = ({
  beds,
  patientsMap,
  labs,
  orders,
  pendingTasks,
  currentUser,
  lastRemoteUpdate,
  onSelectPatient,
  onOpenAddPending,
  onOpenAddLab,
  onOpenTrendModal,
  onOpenEvolutionModal,
  onOpenOrderModal,
  onOpenHistoryModal,
  onOpenAdmitToBed,
  onOpenAddOrder,
  onOpenQuickEvolution,
  onOpenQuickDiagnosis,
  onOpenEditComplaint,
  onConfirmSuggestedDiagnosis,
  onDiscardSuggestedDiagnosis
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeHighlightPatientId, setActiveHighlightPatientId] = useState<string | null>(null);

  // Escuchar notificaciones de actualización remota para resaltar la fila por 3 segundos (Sección 28)
  useEffect(() => {
    if (lastRemoteUpdate && lastRemoteUpdate.patientId) {
      setActiveHighlightPatientId(lastRemoteUpdate.patientId);
      const timer = setTimeout(() => {
        setActiveHighlightPatientId(null);
      }, 3200);
      return () => clearTimeout(timer);
    }
  }, [lastRemoteUpdate]);

  const toggleRowExpand = (bedCode: string) => {
    const next = new Set(expandedRows);
    if (next.has(bedCode)) next.delete(bedCode);
    else next.add(bedCode);
    setExpandedRows(next);
  };

  const handleToggleTaskStatus = async (task: PendingTask) => {
    const nextStatus = task.status === 'REALIZADO' ? 'PENDIENTE' : 'REALIZADO';
    const user = currentUser?.name || 'Dr. Joel Colón';
    await centralSyncService.updatePendingTaskStatusCentral(task.id, nextStatus, user);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Horizontal Scrollable Table Container */}
      <div 
        className="overflow-x-auto select-none"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x pan-y'
        }}
      >
        <table className="w-full text-left border-collapse min-w-[1250px]">
          {/* Header Fijo */}
          <thead className="sticky top-0 z-30 bg-[#0F4C5C] text-white text-[11px] uppercase tracking-wider font-extrabold shadow-sm">
            <tr>
              {/* Columna 1 Fija: CAMA */}
              <th className="sticky left-0 z-40 bg-[#0F4C5C] px-3 py-3 w-[80px] text-center border-r border-teal-700/60 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]">
                CAMA
              </th>

              {/* Columna 2 Fija: PACIENTE */}
              <th className="sticky left-[80px] z-40 bg-[#0F4C5C] px-3 py-3 w-[190px] border-r border-teal-700/60 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]">
                PACIENTE
              </th>

              {/* Columnas Desplazables */}
              <th className="px-3 py-3 w-[160px] border-r border-teal-700/60">
                MOTIVO DE CONSULTA
              </th>

              <th className="px-3 py-3 w-[230px] border-r border-teal-700/60">
                DIAGNÓSTICOS CLÍNICOS & SUGERIDOS
              </th>

              <th className="px-3 py-3 w-[260px] border-r border-teal-700/60">
                PARACLÍNICAS & TENDENCIAS
              </th>

              <th className="px-3 py-3 w-[230px] border-r border-teal-700/60">
                TRATAMIENTO & DÍAS ABX
              </th>

              <th className="px-3 py-3 w-[220px] border-r border-teal-700/60">
                PENDIENTES DE GUARDIA
              </th>

              <th className="px-2 py-3 w-[90px] text-center">
                ACCIONES
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-200 text-xs">
            {beds.map((bed) => {
              const pat = bed.patientId ? patientsMap.get(bed.patientId) : undefined;
              const isOccupied = Boolean(pat) || bed.status === 'OCUPADA';
              const isExpanded = expandedRows.has(bed.code);
              const isUpdatedRecently = pat && activeHighlightPatientId === pat.id;

              // Analíticas del paciente
              const patLabs = pat
                ? labs.filter(l => l.patientId === pat.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                : [];

              // Órdenes médicas del paciente
              const patOrders = pat
                ? orders.filter(o => o.patientId === pat.id && o.status !== 'Suspendida')
                : [];

              // Pendientes del paciente
              const patTasks = pat
                ? pendingTasks
                    .filter(t => t.patientId === pat.id)
                    .sort((a, b) => {
                      if (a.status === 'REALIZADO' && b.status !== 'REALIZADO') return 1;
                      if (a.status !== 'REALIZADO' && b.status === 'REALIZADO') return -1;
                      if (a.priority === 'URGENTE' && b.priority !== 'URGENTE') return -1;
                      if (a.priority !== 'URGENTE' && b.priority === 'URGENTE') return 1;
                      return 0;
                    })
                : [];

              // Diagnósticos sugeridos por motor de laboratorios (Secciones 11 y 12)
              const suggestedDiagnoses = patLabs.length > 0 ? generateSuggestedLabDiagnoses(patLabs) : [];

              // Tendencias y resoluciones cinéticas (Secciones 14 y 15)
              const { trends, resolved } = patLabs.length > 0 ? analyzeLabTrendsAndResolutions(patLabs) : { trends: [], resolved: [] };

              // Diagnósticos activos del paciente
              const activeDiagnoses = pat?.diagnosesList?.map(d => d.name) || [];

              // Motivo de consulta
              const chiefComplaint = pat?.chiefComplaint || pat?.clinicalHistory?.reasonForConsultation || '';

              // Estilo de fila si está ocupada o resaltada
              const rowBg = isUpdatedRecently
                ? 'bg-emerald-50 ring-2 ring-emerald-400 transition-colors duration-500'
                : !isOccupied
                ? 'bg-slate-50/40'
                : patTasks.some(t => t.priority === 'URGENTE' && t.status !== 'REALIZADO')
                ? 'bg-rose-50/20'
                : 'hover:bg-slate-50/70';

              return (
                <tr 
                  key={bed.code} 
                  className={`transition-all ${rowBg}`}
                >
                  {/* ========================================================== */}
                  {/* COLUMNA 1: CAMA (STICKY IZQUIERDA)                        */}
                  {/* ========================================================== */}
                  <td className="sticky left-0 z-20 bg-inherit px-2 py-3 text-center border-r border-slate-200 align-top shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-mono font-black text-xs px-2 py-0.5 bg-slate-900 text-white rounded shadow-xs">
                        {bed.code}
                      </span>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-tighter ${
                        !isOccupied
                          ? 'bg-emerald-100 text-emerald-800'
                          : bed.status === 'AISLAMIENTO'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {!isOccupied ? 'LIBRE' : bed.status}
                      </span>
                      {isUpdatedRecently && (
                        <span className="text-[8px] px-1 bg-emerald-600 text-white rounded font-bold animate-pulse mt-0.5 whitespace-nowrap">
                          {lastRemoteUpdate?.updatedBy ? `Dr. ${lastRemoteUpdate.updatedBy.split(' ')[1] || ''}` : 'Actualizado'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* ========================================================== */}
                  {/* COLUMNA 2: PACIENTE (STICKY IZQUIERDA)                     */}
                  {/* ========================================================== */}
                  <td className="sticky left-[80px] z-20 bg-inherit px-3 py-3 border-r border-slate-200 align-top shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                    {pat ? (
                      <div className="space-y-1">
                        <button
                          onClick={() => onSelectPatient(pat)}
                          title="Clic para abrir Vista Rápida del paciente"
                          className="font-black text-xs text-slate-900 hover:text-teal-700 text-left leading-snug line-clamp-2 uppercase group flex items-center gap-1"
                        >
                          <span className="group-hover:underline">{pat.fullName}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-teal-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 font-medium">
                          <span>{pat.age}a</span>
                          <span>•</span>
                          <span>{pat.sex}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px]">Réc: {pat.medicalRecordNumber || pat.internalCode}</span>
                        </div>
                        {pat.clinicalHistory?.morbidList && pat.clinicalHistory.morbidList.length > 0 && (
                          <div className="text-[10px] text-slate-600 line-clamp-1 bg-slate-100 px-1.5 py-0.5 rounded">
                            {pat.clinicalHistory.morbidList.map(m => m.disease).join(', ')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-2 text-center space-y-1.5">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          DISPONIBLE
                        </span>
                        <div>
                          {onOpenAdmitToBed && (
                            <button
                              onClick={() => onOpenAdmitToBed(bed)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-extrabold shadow-xs transition-all active:scale-95 cursor-pointer"
                              title={`Ingresar o asignar paciente a la cama ${bed.code}`}
                            >
                              <Plus className="w-3 h-3" />
                              <span>+ Ingresar / Asignar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* ========================================================== */}
                  {/* COLUMNA 3: MOTIVO DE CONSULTA                              */}
                  {/* ========================================================== */}
                  <td className="px-3 py-3 border-r border-slate-200 align-top">
                    {pat ? (
                      <div className="text-slate-800 text-[11px] leading-relaxed group">
                        <div className="flex items-start justify-between gap-1">
                          <p className={isExpanded ? '' : 'line-clamp-3'}>
                            {chiefComplaint || 'Sin motivo de consulta registrado en historia.'}
                          </p>
                          {onOpenEditComplaint && (
                            <button
                              onClick={() => onOpenEditComplaint(pat)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-opacity shrink-0 cursor-pointer"
                              title="Editar motivo de consulta"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {chiefComplaint.length > 90 && (
                          <button
                            onClick={() => toggleRowExpand(bed.code)}
                            className="text-[10px] font-bold text-teal-700 hover:underline mt-0.5 flex items-center gap-0.5"
                          >
                            {isExpanded ? 'Ver menos' : 'Ver más'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">--</span>
                    )}
                  </td>

                  {/* ========================================================== */}
                  {/* COLUMNA 4: DIAGNÓSTICOS CLÍNICOS & SUGERIDOS POR SISTEMA  */}
                  {/* ========================================================== */}
                  <td className="px-3 py-3 border-r border-slate-200 align-top space-y-2">
                    {pat ? (
                      <>
                        {/* Diagnósticos Activos */}
                        <div className="space-y-1">
                          {activeDiagnoses.length > 0 ? (
                            activeDiagnoses.map((d, i) => (
                              <div key={i} className="text-[11px] font-semibold text-slate-800 flex items-start gap-1">
                                <span className="text-teal-600 font-black">•</span>
                                <span>{d}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Diagnóstico en estudio</span>
                          )}

                          {onOpenQuickDiagnosis && (
                            <button
                              onClick={() => onOpenQuickDiagnosis(pat)}
                              className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 text-[10px] font-bold transition-colors cursor-pointer"
                              title="Agregar diagnóstico nosológico al paciente"
                            >
                              <Plus className="w-3 h-3 text-teal-600" />
                              <span>+ Diagnóstico</span>
                            </button>
                          )}
                        </div>

                        {/* DIAGNÓSTICOS DE LABORATORIO SUGERIDOS POR SISTEMA (Sección 12) */}
                        {suggestedDiagnoses.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-amber-200/80 space-y-1.5">
                            <div className="text-[10px] font-black text-amber-900 uppercase flex items-center gap-1 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300">
                              <Sparkles className="w-3 h-3 text-amber-700 shrink-0" />
                              Sugeridos por Laboratorio (IA/Reglas):
                            </div>
                            {suggestedDiagnoses.map((sug) => {
                              const alreadyAdded = activeDiagnoses.some(
                                d => d.toLowerCase().includes(sug.name.toLowerCase()) || sug.name.toLowerCase().includes(d.toLowerCase())
                              );
                              if (alreadyAdded) return null;

                              return (
                                <div
                                  key={sug.id}
                                  className="bg-amber-50/90 border border-amber-300/80 p-2 rounded-lg text-[10px] space-y-1 shadow-2xs"
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <span className="font-bold text-amber-950 uppercase leading-tight">
                                      {sug.name}
                                    </span>
                                    {sug.severity === 'SEVERO' && (
                                      <span className="text-[8px] bg-red-600 text-white font-black px-1 rounded">
                                        SEVERO
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-amber-800 text-[9px] font-mono">
                                    {sug.criteria}
                                  </div>
                                  {/* Botones [CONFIRMAR] [DESCARTAR] (Sección 12) */}
                                  <div className="flex items-center gap-1.5 pt-1">
                                    <button
                                      onClick={() => onConfirmSuggestedDiagnosis(pat, sug.name)}
                                      className="px-2 py-0.5 bg-teal-800 hover:bg-teal-700 text-white font-bold rounded text-[9px] flex items-center gap-0.5"
                                    >
                                      <Check className="w-2.5 h-2.5" /> Confirmar
                                    </button>
                                    <button
                                      onClick={() => onDiscardSuggestedDiagnosis(pat, sug.name)}
                                      className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-[9px]"
                                    >
                                      Descartar
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">--</span>
                    )}
                  </td>

                  {/* ========================================================== */}
                  {/* COLUMNA 5: PARACLÍNICAS & TENDENCIAS                      */}
                  {/* ========================================================== */}
                  <td className="px-3 py-3 border-r border-slate-200 align-top space-y-2">
                    {pat ? (
                      <>
                        {/* Alertas de Cinética / Tendencias (Sección 14 y 15) */}
                        {trends.length > 0 && (
                          <div className="space-y-1 mb-2">
                            {trends.map((t, idx) => (
                              <div
                                key={idx}
                                onClick={() => onOpenTrendModal(pat.fullName, t.parameter, patLabs)}
                                className="bg-rose-50 border border-rose-300 text-rose-900 p-1.5 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-rose-100"
                              >
                                <TrendingUp className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span className="line-clamp-1">{t.alertText}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Resoluciones Automáticas (Sección 15) */}
                        {resolved.length > 0 && (
                          <div className="space-y-1 mb-2">
                            {resolved.map((res, idx) => (
                              <div
                                key={idx}
                                className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-1.5 rounded-md text-[10px] font-bold flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{res.condition} ({res.timestamp})</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Lista de analíticas cronológicas inversas (Sección 9) */}
                        {patLabs.length > 0 ? (
                          <div className="space-y-1.5">
                            {/* Agrupadas por fecha */}
                            {Array.from(new Set(patLabs.map(l => (l.timestamp || '').slice(0, 10)))).slice(0, isExpanded ? 5 : 2).map(dateKey => {
                              const dayLabs = patLabs.filter(l => (l.timestamp || '').slice(0, 10) === dateKey);
                              return (
                                <div key={dateKey} className="bg-slate-50 p-1.5 rounded-lg border border-slate-200/80">
                                  <div className="text-[10px] font-mono font-bold text-slate-500 mb-1">
                                    {dateKey}:
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {dayLabs.map(l => {
                                      const isCrit = l.flag === 'critico';
                                      const isAlter = l.flag === 'alto' || l.flag === 'bajo';
                                      const arrow = l.flag === 'alto' ? '↑' : l.flag === 'bajo' ? '↓' : '';

                                      return (
                                        <button
                                          key={l.id}
                                          onClick={() => onOpenTrendModal(pat.fullName, l.parameter, patLabs)}
                                          title={`Clic para ver curva evolutiva de ${l.parameter}`}
                                          className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold transition-all ${
                                            isCrit
                                              ? 'bg-red-100 text-red-900 border border-red-300 hover:bg-red-200 shadow-2xs'
                                              : isAlter
                                              ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                              : 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-100'
                                          }`}
                                        >
                                          {l.parameter}: {l.value} {arrow} {isCrit && '🔴'}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}

                            {patLabs.length > 4 && (
                              <button
                                onClick={() => toggleRowExpand(bed.code)}
                                className="text-[10px] font-bold text-teal-700 hover:underline"
                              >
                                {isExpanded ? 'Menos fechas' : `Ver más analíticas anteriores...`}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-400 italic text-[11px] py-1">
                            Sin paraclínicas recientes
                          </div>
                        )}

                        <div className="pt-1 mt-1 border-t border-slate-100">
                          <button
                            onClick={() => onOpenAddLab(pat)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
                            title="Cargar analítica de laboratorio"
                          >
                            <Plus className="w-3 h-3 text-teal-600" />
                            <span>+ Analítica</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">--</span>
                    )}
                  </td>

                  {/* ========================================================== */}
                  {/* COLUMNA 6: TRATAMIENTO & SEGUIMIENTO DÍAS ABX             */}
                  {/* ========================================================== */}
                  <td className="px-3 py-3 border-r border-slate-200 align-top space-y-1.5">
                    {pat ? (
                      <div>
                        {patOrders.length > 0 ? (
                          <div className="space-y-1.5">
                            {patOrders.slice(0, isExpanded ? 8 : 4).map(ord => (
                              <div key={ord.id} className="text-[11px] leading-snug flex items-start justify-between gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200/60">
                                <div>
                                  <span className="font-bold text-slate-900">{ord.name}</span>{' '}
                                  <span className="text-slate-600 text-[10px] font-mono">
                                    {ord.dose} {ord.frequency}
                                  </span>
                                </div>
                                {ord.treatmentDay && (
                                  <span className="px-1.5 py-0.2 bg-blue-100 text-blue-900 font-mono font-extrabold rounded text-[9px] shrink-0 border border-blue-200">
                                    D-{ord.treatmentDay}
                                  </span>
                                )}
                              </div>
                            ))}
                            {patOrders.length > 4 && (
                              <button
                                onClick={() => toggleRowExpand(bed.code)}
                                className="text-[10px] font-bold text-teal-700 hover:underline block"
                              >
                                {isExpanded ? 'Ocultar órdenes' : `+ ${patOrders.length - 4} órdenes más...`}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px] block py-1">Sin tratamiento indicado</span>
                        )}

                        {onOpenAddOrder && (
                          <div className="pt-1 mt-1 border-t border-slate-100">
                            <button
                              onClick={() => onOpenAddOrder(pat)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                              title="Prescribir indicación médica o antibiótico"
                            >
                              <Plus className="w-3 h-3 text-blue-600" />
                              <span>+ Indicación / Antibiótico</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">--</span>
                    )}
                  </td>

                  {/* ========================================================== */}
                  {/* COLUMNA 7: PENDIENTES DE GUARDIA                          */}
                  {/* ========================================================== */}
                  <td className="px-3 py-3 border-r border-slate-200 align-top space-y-1.5">
                    {pat ? (
                      <>
                        {patTasks.length > 0 ? (
                          <div className="space-y-1.5">
                            {patTasks.slice(0, isExpanded ? 10 : 4).map(task => {
                              const isUrgent = task.priority === 'URGENTE';
                              const isDone = task.status === 'REALIZADO';

                              return (
                                <div
                                  key={task.id}
                                  className={`p-1.5 rounded-lg border text-[10px] transition-all flex items-start justify-between gap-1.5 ${
                                    isDone
                                      ? 'bg-emerald-50/60 border-emerald-200 text-slate-600'
                                      : isUrgent
                                      ? 'bg-red-50 border-red-300 text-red-950 font-bold shadow-2xs'
                                      : task.priority === 'ALTA'
                                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                                      : 'bg-slate-50 border-slate-200 text-slate-800'
                                  }`}
                                >
                                  <div className="space-y-0.5 flex-1 min-w-0">
                                    <div className="flex items-center gap-1 text-[9px] font-mono font-bold">
                                      <span className={isUrgent ? 'text-red-700' : 'text-slate-500'}>
                                        [{task.priority}]
                                      </span>
                                      <span>{task.category}</span>
                                      <span>•</span>
                                      <span>{task.time}</span>
                                    </div>
                                    <p className={`line-clamp-2 ${isDone ? 'line-through text-slate-400' : ''}`}>
                                      {task.description}
                                    </p>
                                  </div>

                                  {/* Botón rápido toggle REALIZADO (Sección 19) */}
                                  <button
                                    onClick={() => handleToggleTaskStatus(task)}
                                    title={isDone ? 'Marcar como pendiente' : 'Marcar como realizado'}
                                    className={`p-1 rounded-md transition-colors shrink-0 ${
                                      isDone
                                        ? 'bg-emerald-200 text-emerald-800 hover:bg-emerald-300'
                                        : 'bg-slate-200 hover:bg-teal-600 hover:text-white text-slate-700'
                                    }`}
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}

                            {patTasks.length > 4 && (
                              <button
                                onClick={() => toggleRowExpand(bed.code)}
                                className="text-[10px] font-bold text-teal-700 hover:underline block"
                              >
                                {isExpanded ? 'Ocultar pendientes' : `+ ${patTasks.length - 4} pendientes más...`}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px] block py-1">
                            Sin pendientes activos
                          </span>
                        )}

                        <button
                          onClick={() => onOpenAddPending(pat)}
                          className="text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 mt-1"
                        >
                          <Plus className="w-3 h-3" /> Añadir Pendiente
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">--</span>
                    )}
                  </td>

                  {/* ========================================================== */}
                  {/* COLUMNA 8: BOTONES RÁPIDOS POR FILA (Sección 41)           */}
                  {/* ========================================================== */}
                  <td className="px-2 py-3 text-center align-top">
                    {pat ? (
                      <div className="flex flex-col gap-1 items-stretch">
                        {(onOpenQuickEvolution || onOpenEvolutionModal) && (
                          <button
                            onClick={() => (onOpenQuickEvolution ? onOpenQuickEvolution(pat) : onOpenEvolutionModal?.(pat))}
                            title="Añadir nota de evolución de guardia"
                            className="px-2 py-1 bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-800 font-bold rounded text-[10px] w-full transition-colors border border-teal-200 cursor-pointer"
                          >
                            + Evolución
                          </button>
                        )}
                        {(onOpenAddOrder || onOpenOrderModal) && (
                          <button
                            onClick={() => (onOpenAddOrder ? onOpenAddOrder(pat) : onOpenOrderModal?.(pat))}
                            title="Prescribir órdenes médicas / antibióticos"
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-800 font-bold rounded text-[10px] w-full transition-colors border border-blue-200 cursor-pointer"
                          >
                            + Orden
                          </button>
                        )}
                        <button
                          onClick={() => onOpenAddLab(pat)}
                          title="Cargar analítica de laboratorio"
                          className="px-2 py-1 bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-800 font-bold rounded text-[10px] w-full transition-colors border border-purple-200 cursor-pointer"
                        >
                          + Lab
                        </button>
                        {onOpenHistoryModal ? (
                          <button
                            onClick={() => onOpenHistoryModal(pat)}
                            title="Ver historia clínica"
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-700 hover:text-white text-slate-700 font-bold rounded text-[10px] w-full transition-colors cursor-pointer"
                          >
                            Historia
                          </button>
                        ) : (
                          <button
                            onClick={() => onSelectPatient(pat)}
                            title="Ver expediente del paciente"
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-700 hover:text-white text-slate-700 font-bold rounded text-[10px] w-full transition-colors cursor-pointer"
                          >
                            Expediente
                          </button>
                        )}
                      </div>
                    ) : onOpenAdmitToBed ? (
                      <button
                        onClick={() => onOpenAdmitToBed(bed)}
                        className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 font-bold rounded text-[10px] w-full border border-emerald-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title={`Ingresar o asignar paciente a la cama ${bed.code}`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>Asignar</span>
                      </button>
                    ) : (
                      <span className="text-slate-300 text-xs">--</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
