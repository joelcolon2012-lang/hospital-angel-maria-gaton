import React from 'react';
import { AlertTriangle, Clock, FlaskConical, Images, HeartPulse, ChevronRight, ShieldAlert } from 'lucide-react';
import { Patient, MedicalStudy, LabResult } from '../../types';

interface Props {
  patients: Patient[];
  studies: MedicalStudy[];
  labs: LabResult[];
  onSelectPatient: (p: Patient) => void;
}

export const AttentionRequiredSection: React.FC<Props> = ({
  patients,
  studies,
  labs,
  onSelectPatient,
}) => {
  // Filtro de pacientes con criterios de atención clínica urgente
  const attentionItems: Array<{
    patient: Patient;
    reason: string;
    type: 'critical-vitals' | 'triage' | 'pending-labs' | 'pending-studies' | 'allergy';
    severity: 'danger' | 'warning';
  }> = [];

  patients.forEach((p) => {
    if (p.status === 'alta' || p.isArchived || p.isDeleted) return;

    // 1. Triaje I o II (Reanimación / Emergencia Crítica)
    if (p.triageLevel === 1) {
      attentionItems.push({
        patient: p,
        reason: 'Triaje Nivel I: Reanimación inmediata requerida',
        type: 'triage',
        severity: 'danger',
      });
      return;
    }

    // 2. Signos vitales críticos
    if (p.vitals) {
      const v = p.vitals;
      if (v.oxygenSaturation && v.oxygenSaturation < 90) {
        attentionItems.push({
          patient: p,
          reason: `Hipoxemia Severa: SpO2 ${v.oxygenSaturation}%`,
          type: 'critical-vitals',
          severity: 'danger',
        });
        return;
      }
      if (v.systolicBP && v.systolicBP >= 180) {
        attentionItems.push({
          patient: p,
          reason: `Crisis Hipertensiva: PA ${v.systolicBP}/${v.diastolicBP || '--'} mmHg`,
          type: 'critical-vitals',
          severity: 'danger',
        });
        return;
      }
      if (v.heartRate && (v.heartRate > 130 || v.heartRate < 45)) {
        attentionItems.push({
          patient: p,
          reason: `Arritmia / Frecuencia Crítica: FC ${v.heartRate} lpm`,
          type: 'critical-vitals',
          severity: 'warning',
        });
        return;
      }
    }

    // 3. Laboratorios críticos de este paciente
    const patientLabs = labs.filter((l) => l.patientId === p.id);
    const criticalLab = patientLabs.find((l) => l.flag === 'critico');
    if (criticalLab) {
      attentionItems.push({
        patient: p,
        reason: `Laboratorio Crítico: ${criticalLab.parameter} ${criticalLab.value} ${criticalLab.unit}`,
        type: 'pending-labs',
        severity: 'danger',
      });
      return;
    }

    // 4. Estudios pendientes
    const patientStudies = studies.filter((s) => s.patientId === p.id);
    const pendingStudy = patientStudies.find((s) => s.status === 'Pendiente');
    if (pendingStudy) {
      attentionItems.push({
        patient: p,
        reason: `Estudio de Imagen Pendiente: ${pendingStudy.title || pendingStudy.category}${
          pendingStudy.anatomicalRegion ? ` (${pendingStudy.anatomicalRegion})` : ''
        }`,
        type: 'pending-studies',
        severity: 'warning',
      });
      return;
    }

    // 5. Triaje II
    if (p.triageLevel === 2) {
      attentionItems.push({
        patient: p,
        reason: 'Triaje Nivel II: Emergencia con alta prioridad',
        type: 'triage',
        severity: 'warning',
      });
      return;
    }
  });

  if (attentionItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-[16px] border border-red-200/80 p-4 shadow-[0_2px_8px_-2px_rgba(220,38,38,0.06)] mb-4">
      <div className="flex items-center justify-between pb-3 border-b border-red-100/80 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h3 className="text-xs sm:text-sm font-black text-red-950 uppercase tracking-wider">
            Pacientes que Requieren Atención Prioritaria ({attentionItems.length})
          </h3>
        </div>
        <span className="text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
          Revisión Inmediata
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {attentionItems.slice(0, 6).map((item, idx) => {
          const isDanger = item.severity === 'danger';
          return (
            <button
              key={`${item.patient.id}-${idx}`}
              onClick={() => onSelectPatient(item.patient)}
              className={`text-left p-3 rounded-[12px] border transition-all active:scale-[0.99] flex items-center justify-between gap-2.5 ${
                isDanger
                  ? 'bg-red-50/40 hover:bg-red-50/70 border-red-200/90 text-red-950'
                  : 'bg-amber-50/40 hover:bg-amber-50/70 border-amber-200/90 text-amber-950'
              }`}
            >
              <div className="overflow-hidden">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-black truncate">{item.patient.fullName}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-white/80 border border-slate-200 shrink-0">
                    {item.patient.cubicle}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-600 truncate flex items-center gap-1">
                  {isDanger ? (
                    <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                  ) : (
                    <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                  )}
                  <span className="truncate">{item.reason}</span>
                </p>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
