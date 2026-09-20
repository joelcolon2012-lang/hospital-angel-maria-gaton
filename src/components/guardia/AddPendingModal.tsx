import React, { useState } from 'react';
import { Patient, PendingPriority, PendingCategory, PendingTask } from '../../types';
import { centralSyncService } from '../../services/centralSyncService';
import { X, Clock, AlertTriangle, CheckCircle2, ListPlus } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  preselectedPatientId?: string;
  currentUser?: { name: string; role: string };
  onTaskCreated?: (task: PendingTask) => void;
}

export const AddPendingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patients,
  preselectedPatientId,
  currentUser,
  onTaskCreated
}) => {
  const [patientId, setPatientId] = useState<string>(preselectedPatientId || (patients[0]?.id || ''));
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PendingPriority>('NORMAL');
  const [category, setCategory] = useState<PendingCategory>('Laboratorio');
  const [time, setTime] = useState('06:00');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [responsible, setResponsible] = useState('R1 de Guardia');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const activePat = patients.find(p => p.id === patientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Por favor ingrese la descripción del pendiente.');
      return;
    }

    setIsSubmitting(true);
    try {
      const creator = currentUser?.name || 'Dr. Joel Colón';
      const newTask: PendingTask = {
        id: `tsk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        patientId,
        bedCode: activePat?.cubicle || '307-C1',
        patientName: activePat?.fullName || 'Paciente',
        service: (activePat?.service as any) || 'MEDICINA_INTERNA_I',
        description: description.trim(),
        priority,
        category,
        date,
        time,
        createdBy: creator,
        responsible: responsible.trim() || 'Médico de Guardia',
        status: 'PENDIENTE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await centralSyncService.savePendingTaskCentral(newTask, creator);
      if (onTaskCreated) onTaskCreated(newTask);
      onClose();
    } catch (err: any) {
      alert('Error guardando pendiente: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#0F4C5C] text-white px-5 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-800/80 rounded-lg">
              <ListPlus className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-none uppercase tracking-wide">
                NUEVO PENDIENTE DE GUARDIA
              </h3>
              <p className="text-[11px] text-teal-100/80 mt-0.5">
                Hospital Regional Dr. Ángel María Gatón • Pase de Guardia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Paciente y Cama */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Paciente y Cama Asignada:
            </label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
              required
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  [{p.cubicle || 'S/C'}] {p.fullName} ({p.age}a) • Récord: {p.medicalRecordNumber || p.internalCode}
                </option>
              ))}
            </select>
          </div>

          {/* Categoría y Prioridad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tipo de Pendiente:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PendingCategory)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-600"
              >
                <option value="Laboratorio">🔬 Laboratorio</option>
                <option value="Imagen">🩻 Imagen (Rx / TAC / Eco)</option>
                <option value="Interconsulta">🩺 Interconsulta</option>
                <option value="Procedimiento">💉 Procedimiento</option>
                <option value="Transfusión">🩸 Transfusión</option>
                <option value="Hemodiálisis">🧪 Hemodiálisis</option>
                <option value="Egreso">🏠 Egreso / Alta</option>
                <option value="Cirugía">🔪 Cirugía / Quirófano</option>
                <option value="Medicamento">💊 Medicamento</option>
                <option value="Otro">📋 Otro</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nivel de Prioridad:
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PendingPriority)}
                className={`w-full p-2.5 border rounded-xl text-xs font-bold ${
                  priority === 'URGENTE'
                    ? 'bg-red-50 border-red-400 text-red-700'
                    : priority === 'ALTA'
                    ? 'bg-amber-50 border-amber-400 text-amber-700'
                    : 'bg-slate-50 border-slate-300 text-slate-700'
                }`}
              >
                <option value="URGENTE">🔴 URGENTE (Primero en lista)</option>
                <option value="ALTA">🟠 ALTA</option>
                <option value="NORMAL">🟡 NORMAL</option>
                <option value="BAJA">⚪ BAJA</option>
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Descripción de la Tarea Clínica:
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Hemograma de control y Gasometría arterial a las 6:00 AM. Control de K post-polarizante."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
            />
          </div>

          {/* Horario y Responsable */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Fecha Programada:
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Hora Prevista:
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Responsable:
              </label>
              <input
                type="text"
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="R1 / R2 / Enf."
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#0F4C5C] hover:bg-[#0c3c49] text-white font-bold rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : 'Crear Pendiente Central'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
