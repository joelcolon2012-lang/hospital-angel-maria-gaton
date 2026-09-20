import React from 'react';
import { Patient, LabResult, MedicalOrder, PendingTask, PatientEvolution } from '../../types';
import { X, User, Activity, FileText, Pill, Clock, AlertCircle, ExternalLink, Calendar, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  labs: LabResult[];
  orders: MedicalOrder[];
  pendingTasks: PendingTask[];
  evolutions: PatientEvolution[];
  onOpenFullDossier?: (patient: Patient) => void;
  onOpenAddPending?: (patient: Patient) => void;
  onOpenAddLab?: (patient: Patient) => void;
}

export const FastPatientDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  labs,
  orders,
  pendingTasks,
  evolutions,
  onOpenFullDossier,
  onOpenAddPending,
  onOpenAddLab
}) => {
  if (!isOpen || !patient) return null;

  const patLabs = labs.filter(l => l.patientId === patient.id).slice(0, 8);
  const patOrders = orders.filter(o => o.patientId === patient.id && o.status !== 'Suspendida');
  const patTasks = pendingTasks.filter(t => t.patientId === patient.id);
  const patEvos = evolutions.filter(e => e.patientId === patient.id).slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="bg-[#0F4C5C] text-white p-5 flex items-start justify-between shadow-md shrink-0">
            <div className="min-w-0 pr-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-teal-800 text-teal-200 font-mono font-bold text-xs rounded border border-teal-600">
                  {patient.cubicle || 'S/C'}
                </span>
                <span className="text-[10px] uppercase font-bold text-teal-300 tracking-wider">
                  {patient.service || 'Medicina Interna'}
                </span>
              </div>
              <h2 className="text-base font-black truncate">{patient.fullName.toUpperCase()}</h2>
              <div className="text-xs text-teal-100/90 flex flex-wrap items-center gap-2 mt-1">
                <span>{patient.age} años</span>
                <span>•</span>
                <span>Sexo: {patient.sex}</span>
                <span>•</span>
                <span>Exp: {patient.medicalRecordNumber || patient.internalCode}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5 overflow-y-auto text-xs">
            {/* Motivo de Consulta & Antecedentes */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div>
                <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wide">
                  Motivo de Consulta:
                </span>
                <p className="text-slate-800 font-medium mt-0.5">
                  {patient.chiefComplaint || patient.clinicalHistory?.reasonForConsultation || 'No registrado'}
                </p>
              </div>
              {patient.clinicalHistory?.pathologicalHistory && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wide">
                    Antecedentes Patológicos:
                  </span>
                  <p className="text-slate-600 mt-0.5">
                    {patient.clinicalHistory.pathologicalHistory}
                  </p>
                </div>
              )}
            </div>

            {/* Diagnósticos Activos */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal-700" />
                  Diagnósticos Activos
                </h4>
              </div>
              <div className="space-y-1.5">
                {patient.diagnosesList && patient.diagnosesList.length > 0 ? (
                  patient.diagnosesList.map((d, i) => (
                    <div key={i} className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{d.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded font-bold">
                        {d.type || 'Primario'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">Sin diagnósticos estructurados registrados.</p>
                )}
              </div>
            </div>

            {/* Paraclínicos Recientes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-teal-700" />
                  Últimos Laboratorios
                </h4>
                {onOpenAddLab && (
                  <button
                    onClick={() => onOpenAddLab(patient)}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-900"
                  >
                    + Cargar Lab
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {patLabs.length > 0 ? (
                  patLabs.map((l, i) => (
                    <div key={i} className={`p-2 rounded-lg border text-[11px] ${
                      l.flag === 'critico' ? 'bg-red-50 border-red-300 text-red-900' :
                      l.flag === 'alto' || l.flag === 'bajo' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="font-medium text-slate-500 text-[10px] truncate">{l.parameter}</div>
                      <div className="font-mono font-bold text-xs mt-0.5">
                        {l.value} {l.unit}
                        {l.flag === 'alto' && ' ↑'}
                        {l.flag === 'bajo' && ' ↓'}
                        {l.flag === 'critico' && ' 🔴'}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic col-span-2">Sin analíticas recientes.</p>
                )}
              </div>
            </div>

            {/* Tratamiento Activo */}
            <div>
              <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[11px] flex items-center gap-1.5 mb-1.5">
                <Pill className="w-3.5 h-3.5 text-teal-700" />
                Tratamiento Activo
              </h4>
              <div className="space-y-1.5">
                {patOrders.length > 0 ? (
                  patOrders.map((o, i) => (
                    <div key={i} className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800">{o.name}</span>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {o.dose} • {o.route} • {o.frequency}
                        </div>
                      </div>
                      {o.treatmentDay && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono font-bold rounded text-[10px]">
                          D-{o.treatmentDay}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">Sin órdenes médicas activas.</p>
                )}
              </div>
            </div>

            {/* Pendientes de Guardia */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-700" />
                  Pendientes ({patTasks.length})
                </h4>
                {onOpenAddPending && (
                  <button
                    onClick={() => onOpenAddPending(patient)}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-900"
                  >
                    + Nuevo Pendiente
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {patTasks.length > 0 ? (
                  patTasks.map((t, i) => (
                    <div key={i} className={`p-2 rounded-lg border ${
                      t.priority === 'URGENTE' ? 'bg-red-50 border-red-300 text-red-900' :
                      t.status === 'REALIZADO' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between font-bold text-[10px]">
                        <span>[{t.priority}] {t.category}</span>
                        <span>{t.time}</span>
                      </div>
                      <p className="mt-1 font-medium">{t.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">No hay pendientes para este paciente.</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold rounded-xl"
            >
              Cerrar
            </button>
            {onOpenFullDossier && (
              <button
                onClick={() => {
                  onClose();
                  onOpenFullDossier(patient);
                }}
                className="px-4 py-2 bg-[#0F4C5C] hover:bg-[#0c3c49] text-white font-bold rounded-xl shadow-md flex items-center gap-1.5 active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir Expediente Completo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
