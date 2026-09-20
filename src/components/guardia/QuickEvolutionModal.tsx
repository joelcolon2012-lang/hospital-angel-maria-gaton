import React, { useState } from 'react';
import { Patient, PatientEvolution, User } from '../../types';
import { db } from '../../db/dexieDb';
import { centralSyncService } from '../../services/centralSyncService';
import { X, FileText, CheckCircle2, Clock, Activity } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  currentUser?: User;
  onEvolutionSaved?: () => Promise<void>;
}

export const QuickEvolutionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  currentUser,
  onEvolutionSaved
}) => {
  const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const [timestamp, setTimestamp] = useState(nowStr);
  const [vitalSignsSummary, setVitalSignsSummary] = useState(
    patient?.vitals
      ? `TA: ${patient.vitals.systolicBP ? `${patient.vitals.systolicBP}/${patient.vitals.diastolicBP || '--'}` : '--'} mmHg • FC: ${patient.vitals.heartRate || '--'} lpm • FR: ${patient.vitals.respiratoryRate || '--'} rpm • SpO2: ${patient.vitals.oxygenSaturation || '--'}% • Temp: ${patient.vitals.temperature || '--'}°C`
      : 'Signos vitales estables en rango terapéutico.'
  );
  const [clinicalChanges, setClinicalChanges] = useState('Paciente hemodinámicamente estable durante el turno de guardia. Afebril, tolerando vía oral.');
  const [conduct, setConduct] = useState('Continuar con esquema de tratamiento actual. Mantener vigilancia de diuresis y paraclínicas de control.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !patient) return null;

  const handleSave = async () => {
    if (!clinicalChanges.trim()) {
      alert('Por favor ingrese la descripción de los cambios clínicos o evolución.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const newEvo: PatientEvolution = {
        id: `evo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        patientId: patient.id,
        timestamp: timestamp || now,
        doctorName: currentUser?.name || 'Dr. Joel Colón',
        vitalSignsSummary: vitalSignsSummary.trim(),
        clinicalChanges: clinicalChanges.trim(),
        newResults: 'Revisados en guardia.',
        problemReevaluation: patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint || 'Bajo seguimiento de guardia.',
        updatedDiagnoses: (patient.diagnosesList || []).map(d => d.name).join(', ') || 'Sin cambios en diagnósticos activos.',
        conduct: conduct.trim()
      };

      await db.evolutions.put(newEvo);
      await centralSyncService.createEvolution(newEvo, currentUser?.name || 'Dr. Joel Colón');
      if (onEvolutionSaved) await onEvolutionSaved();
      onClose();
    } catch (err: any) {
      alert('Error al guardar evolución: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in select-none">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0F4C5C] px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-800/80 flex items-center justify-center border border-teal-500/40">
              <FileText className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">Evolución Rápida de Guardia</h3>
              <p className="text-[11px] text-teal-200">
                Paciente: <strong className="text-white">{patient.fullName}</strong> • Cama: {patient.cubicle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-teal-200 hover:text-white hover:bg-teal-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3.5 text-xs">
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-700">Médico de Guardia:</span>
            <span className="font-extrabold text-[#0F4C5C]">{currentUser?.name || 'Dr. Joel Colón'}</span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Resumen de Signos Vitales</label>
            <input
              type="text"
              value={vitalSignsSummary}
              onChange={(e) => setVitalSignsSummary(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden font-mono font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Evolución Clínica durante el Turno *</label>
            <textarea
              rows={3}
              value={clinicalChanges}
              onChange={(e) => setClinicalChanges(e.target.value)}
              placeholder="Describa el estado clínico del paciente en el turno..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Conducta Médica / Plan de Guardia</label>
            <textarea
              rows={2}
              value={conduct}
              onChange={(e) => setConduct(e.target.value)}
              placeholder="Conducta médica a seguir..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting || !clinicalChanges.trim()}
            className="px-5 py-2 bg-[#0F4C5C] hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{isSubmitting ? 'Guardando...' : 'Firmar y Registrar Evolución'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
