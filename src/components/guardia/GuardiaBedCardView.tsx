import React from 'react';
import { Patient, GuardiaClinicalBed, PendingTask, LabResult } from '../../types';
import { Bed, User, Activity, AlertCircle, Clock, CheckCircle2, ShieldAlert, Plus } from 'lucide-react';

interface Props {
  beds: GuardiaClinicalBed[];
  patientsMap: Map<string, Patient>;
  pendingTasks: PendingTask[];
  labs: LabResult[];
  onSelectPatient: (patient: Patient) => void;
  onOpenAddPending: (patient: Patient) => void;
  onOpenAdmitToBed?: (bed: GuardiaClinicalBed) => void;
}

export const GuardiaBedCardView: React.FC<Props> = ({
  beds,
  patientsMap,
  pendingTasks,
  labs,
  onSelectPatient,
  onOpenAddPending,
  onOpenAdmitToBed
}) => {
  // Agrupar camas por sala/pabellón
  const roomsMap = new Map<string, GuardiaClinicalBed[]>();
  beds.forEach(b => {
    const list = roomsMap.get(b.room) || [];
    list.push(b);
    roomsMap.set(b.room, list);
  });

  // Ordenar salas: primero los pabellones con pacientes, luego por orden numérico y alfabético
  const sortedRooms = Array.from(roomsMap.keys()).sort((a, b) => {
    const aHasPatients = (roomsMap.get(a) || []).some(b => b.patientId);
    const bHasPatients = (roomsMap.get(b) || []).some(b => b.patientId);
    if (aHasPatients && !bHasPatients) return -1;
    if (!aHasPatients && bHasPatients) return 1;

    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    if (!isNaN(numA)) return -1;
    if (!isNaN(numB)) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-4">
      {sortedRooms.map(room => {
        const roomBeds = roomsMap.get(room) || [];
        return (
          <div key={room} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <span className="px-2.5 py-0.5 bg-[#0F4C5C] text-white font-mono font-bold text-xs rounded-md">
                PABELLÓN {room}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {roomBeds.length} Camas Clínicas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roomBeds.map(bed => {
                const pat = bed.patientId ? patientsMap.get(bed.patientId) : undefined;
                const isOccupied = bed.status === 'OCUPADA' || Boolean(pat);
                const patTasks = pat ? pendingTasks.filter(t => t.patientId === pat.id && t.status === 'PENDIENTE') : [];
                const hasUrgentTask = patTasks.some(t => t.priority === 'URGENTE');

                return (
                  <div
                    key={bed.code}
                    onClick={() => {
                      if (pat) {
                        onSelectPatient(pat);
                      } else if (onOpenAdmitToBed) {
                        onOpenAdmitToBed(bed);
                      }
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      !isOccupied
                        ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50'
                        : hasUrgentTask
                        ? 'bg-rose-50/50 border-rose-300 hover:border-rose-400'
                        : 'bg-slate-50/80 border-slate-200 hover:border-teal-400 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                          {bed.code}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          !isOccupied
                            ? 'bg-emerald-100 text-emerald-800'
                            : bed.status === 'AISLAMIENTO'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {!isOccupied ? 'DISPONIBLE' : bed.status}
                        </span>
                      </div>

                      {patTasks.length > 0 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          hasUrgentTask ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-100 text-amber-800'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {patTasks.length} Pendiente{patTasks.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {pat ? (
                      <div>
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {pat.fullName.toUpperCase()}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>{pat.age}a</span>
                          <span>•</span>
                          <span>{pat.sex}</span>
                          <span>•</span>
                          <span>Récord: {pat.medicalRecordNumber || pat.internalCode}</span>
                        </div>
                        {pat.chiefComplaint && (
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-1 italic">
                            "{pat.chiefComplaint}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="py-2 flex flex-col items-center justify-center gap-2">
                        <span className="text-emerald-700 font-medium text-xs flex items-center gap-1.5">
                          <Bed className="w-4 h-4 text-emerald-600" /> Cama Lista para Ingreso
                        </span>
                        {onOpenAdmitToBed && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenAdmitToBed(bed);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-extrabold shadow-xs transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Ingresar / Asignar</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
