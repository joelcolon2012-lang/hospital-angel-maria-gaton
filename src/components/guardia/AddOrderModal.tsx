import React, { useState } from 'react';
import { Patient, MedicalOrder, OrderType, OrderStatus, User } from '../../types';
import { db } from '../../db/dexieDb';
import { centralSyncService } from '../../services/centralSyncService';
import { X, Pill, Plus, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  currentUser?: User;
  onOrderSaved?: () => Promise<void>;
}

const COMMON_DRUGS = [
  { name: 'Ceftriaxona', dose: '1g', route: 'IV', freq: 'c/12h', isAbx: true },
  { name: 'Meropenem', dose: '1g', route: 'IV', freq: 'c/8h', isAbx: true },
  { name: 'Vancomicina', dose: '1g', route: 'IV', freq: 'c/12h', isAbx: true },
  { name: 'Piperacilina / Tazobactam', dose: '4.5g', route: 'IV', freq: 'c/6h', isAbx: true },
  { name: 'Ciprofloxacina', dose: '400mg', route: 'IV', freq: 'c/12h', isAbx: true },
  { name: 'Enoxaparina', dose: '40mg', route: 'SC', freq: 'c/24h', isAbx: false },
  { name: 'Omeprazol', dose: '40mg', route: 'IV', freq: 'c/24h', isAbx: false },
  { name: 'Furosemida', dose: '20mg', route: 'IV', freq: 'c/12h', isAbx: false },
  { name: 'Paracetamol', dose: '1g', route: 'IV', freq: 'c/8h', isAbx: false },
  { name: 'Metoclopramida', dose: '10mg', route: 'IV', freq: 'c/8h PRN', isAbx: false }
];

export const AddOrderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  currentUser,
  onOrderSaved
}) => {
  const [type, setType] = useState<OrderType>('Medicamento');
  const [name, setName] = useState('');
  const [dose, setDose] = useState('1g');
  const [route, setRoute] = useState('IV');
  const [frequency, setFrequency] = useState('c/12h');
  const [treatmentDay, setTreatmentDay] = useState<number | undefined>(1);
  const [isAntibiotic, setIsAntibiotic] = useState(true);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !patient) return null;

  const handleSelectQuickDrug = (drug: typeof COMMON_DRUGS[0]) => {
    setName(drug.name);
    setDose(drug.dose);
    setRoute(drug.route);
    setFrequency(drug.freq);
    setIsAntibiotic(drug.isAbx);
    if (!drug.isAbx) setTreatmentDay(undefined);
    else if (!treatmentDay) setTreatmentDay(1);
  };

  const handleSaveOrder = async () => {
    if (!name.trim()) {
      alert('El nombre del medicamento o solución es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const newOrder: MedicalOrder = {
        id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        patientId: patient.id,
        type,
        name: name.trim(),
        dose: dose.trim(),
        route: route.trim(),
        frequency: frequency.trim(),
        startTime: now,
        treatmentDay: isAntibiotic && treatmentDay ? Number(treatmentDay) : undefined,
        status: 'Indicada',
        specialInstructions: specialInstructions.trim() || undefined,
        createdAt: now,
        createdBy: currentUser?.name || 'Dr. Joel Colón',
        doctorName: currentUser?.name || 'Dr. Joel Colón'
      };

      await db.orders.put(newOrder);
      await centralSyncService.createOrder(newOrder, currentUser?.name || 'Dr. Joel Colón');
      if (onOrderSaved) await onOrderSaved();
      onClose();
    } catch (err: any) {
      alert('Error al guardar indicación: ' + (err.message || 'Error desconocido'));
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
              <Pill className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">Agregar Tratamiento / Indicación</h3>
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

        {/* Chips de Medicamentos Frecuentes */}
        <div className="bg-slate-50 p-3 border-b border-slate-200">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1.5">
            Frecuentes en Guardia de Medicina Interna:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_DRUGS.map((d) => (
              <button
                key={d.name}
                type="button"
                onClick={() => handleSelectQuickDrug(d)}
                className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold transition-all ${
                  name === d.name
                    ? 'bg-[#0F4C5C] text-white border-[#0F4C5C]'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-teal-500 hover:bg-teal-50'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>

        {/* Formulario */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nombre del Medicamento / Solución *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Ceftriaxona, Solución Salina 0.9%"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden font-bold text-slate-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Dosis</label>
              <input
                type="text"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                placeholder="Ej. 1g, 500mg"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden font-mono font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Vía</label>
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden font-bold"
              >
                <option value="IV">IV (Intravenosa)</option>
                <option value="VO">VO (Oral)</option>
                <option value="SC">SC (Subcutánea)</option>
                <option value="IM">IM (Intramuscular)</option>
                <option value="Inhalatoria">Inhalatoria</option>
                <option value="Tópica">Tópica</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Frecuencia</label>
              <input
                type="text"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="Ej. c/12h"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden font-semibold"
              />
            </div>
          </div>

          {/* Récord de Antibióticos Día D-X */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAntibiotic}
                  onChange={(e) => setIsAntibiotic(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <span className="font-extrabold text-amber-900">¿Es Antimicrobiano / Antibiótico?</span>
              </label>
              {isAntibiotic && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-mono">
                  D-{treatmentDay || 1}
                </span>
              )}
            </div>

            {isAntibiotic && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[11px] text-amber-800 font-semibold">Día de Tratamiento Actual:</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={treatmentDay || 1}
                  onChange={(e) => setTreatmentDay(parseInt(e.target.value, 10) || 1)}
                  className="w-20 px-3 py-1 bg-white border border-amber-300 rounded-xl font-bold font-mono text-center focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                />
                <span className="text-[10px] text-amber-700">Se mostrará en la tabla de guardia como [D-{treatmentDay || 1}]</span>
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Instrucciones Especiales / Indicación</label>
            <input
              type="text"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Ej. Pasar en 100ml solución salina en 30 min"
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
            onClick={handleSaveOrder}
            disabled={isSubmitting || !name.trim()}
            className="px-5 py-2 bg-[#0F4C5C] hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{isSubmitting ? 'Guardando...' : 'Prescribir e Indicar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
