import React, { useState } from 'react';
import { MedicalOrder, OrderType, Patient } from '../../types';
import {
  X,
  Copy,
  Plus,
  Trash2,
  Check,
  Calendar,
  Clock,
  Pill,
  Activity,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

const COMMON_ANTIBIOTICS = [
  'ceftriaxona',
  'ciprofloxacina',
  'levofloxacina',
  'ampicilina',
  'sulbactam',
  'piperacilina',
  'tazobactam',
  'meropenem',
  'vancomicina',
  'metronidazol',
  'amikacina',
  'gentamicina',
  'azitromicina',
  'claritromicina',
  'cefepima',
  'ertapenem',
  'oxacilina',
];

const isAntibioticDrug = (name: string): boolean => {
  const norm = name.toLowerCase();
  return COMMON_ANTIBIOTICS.some((ab) => norm.includes(ab));
};

interface OrderDraftItem {
  id: string;
  type: OrderType;
  name: string;
  dose: string;
  route: string;
  frequency: string;
  indication: string;
  treatmentDay: number;
  isAntibiotic: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  existingOrders: MedicalOrder[];
  onSaveNewOrders: (newOrders: Partial<MedicalOrder>[]) => void;
}

export const DuplicateOrderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  existingOrders,
  onSaveNewOrders,
}) => {
  const now = new Date();
  const todayDateStr = now.toISOString().slice(0, 10);
  const nowTimeStr = now.toTimeString().slice(0, 5);

  // General measures state
  const [diet, setDiet] = useState('Dieta para hipertenso, hiposódica');
  const [position, setPosition] = useState('Posición Semifowler a 30-45°');
  const [oxygen, setOxygen] = useState('Oxigenoterapia SOS si SpO2 < 92%');
  const [vitalsFrequency, setVitalsFrequency] = useState('Signos vitales cada 6 horas');
  const [diagnoses, setDiagnoses] = useState(
    patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint || 'En estudio'
  );
  const [paraclinicos, setParaclinicos] = useState('Hemograma, Glucemia, Urea, Creatinina, Electrolitos');
  const [imaging, setImaging] = useState('Radiografía de Tórax, Electrocardiograma');
  const [interconsultas, setInterconsultas] = useState('Interconsulta si deterioro clínico');
  const [otherMeasures, setOtherMeasures] = useState('Vía venosa periférica permeable con salino');

  // Clone active orders into editable items with incremented treatment/antibiotic days
  const [items, setItems] = useState<OrderDraftItem[]>(() => {
    if (!existingOrders || existingOrders.length === 0) {
      return [
        {
          id: `draft-init-1`,
          type: 'Solución',
          name: 'Solución Salina al 0.9%',
          dose: '1,000 mL',
          route: 'Intravenosa',
          frequency: 'Cada 24 horas',
          indication: 'Hidratación y vía venosa permeable',
          treatmentDay: 2,
          isAntibiotic: false,
        },
        {
          id: `draft-init-2`,
          type: 'Medicamento',
          name: 'Omeprazol',
          dose: '40 mg',
          route: 'Intravenosa',
          frequency: 'Cada 24 horas',
          indication: 'Gastroprotección',
          treatmentDay: 2,
          isAntibiotic: false,
        },
      ];
    }

    return existingOrders.map((ord, idx) => {
      const isAb = isAntibioticDrug(ord.name);
      const nextDay = (ord.treatmentDay || 1) + 1;
      return {
        id: `draft-${idx}-${Date.now()}`,
        type: ord.type,
        name: ord.name,
        dose: ord.dose || '',
        route: ord.route || 'Intravenosa',
        frequency: ord.frequency || 'Cada 8 horas',
        indication: ord.indication || '',
        treatmentDay: nextDay,
        isAntibiotic: isAb,
      };
    });
  });

  if (!isOpen) return null;

  const handleUpdateItem = (id: string, field: keyof OrderDraftItem, val: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: val } : it))
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleAddItem = () => {
    const newItem: OrderDraftItem = {
      id: `draft-new-${Date.now()}`,
      type: 'Medicamento',
      name: '',
      dose: '',
      route: 'Intravenosa',
      frequency: 'Cada 8 horas',
      indication: '',
      treatmentDay: 1,
      isAntibiotic: false,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleConfirmAndSave = () => {
    const createdDateStr = `${todayDateStr} ${nowTimeStr}`;
    const newOrdersToInsert: Partial<MedicalOrder>[] = items
      .filter((it) => it.name.trim().length > 0)
      .map((it) => ({
        patientId: patient.id,
        type: it.type,
        name: it.name.trim(),
        dose: it.dose.trim(),
        route: it.route.trim(),
        frequency: it.frequency.trim(),
        indication: it.indication.trim(),
        treatmentDay: it.treatmentDay,
        specialInstructions: it.isAntibiotic ? `Antibiótico Día ${it.treatmentDay}` : undefined,
        status: 'Indicada',
        startTime: createdDateStr,
        createdAt: createdDateStr,
        createdBy: 'Dr. Joel Colón',
      }));

    onSaveNewOrders(newOrdersToInsert);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#0F4C5C] px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Copy className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                DUPLICAR ORDEN MÉDICA ANTERIOR
              </h3>
              <p className="text-xs text-teal-100 font-medium">
                Genera una <strong className="text-white">NUEVA ORDEN</strong> editable con incremento automático de días de antibiótico y tratamiento. La orden previa permanece intacta.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner de Seguridad Clínica */}
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-900 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Orden Nueva del Día:</strong> Fecha: <strong>{todayDateStr} {nowTimeStr}</strong> • Paciente: <strong>{patient.fullName}</strong> ({patient.cubicle})
            </span>
          </div>
          <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Borrador Editable
          </span>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Medidas Generales y Diagnósticos */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-200 pb-2">
              <Activity className="w-4 h-4 text-[#0F4C5C]" />
              <span>1. Medidas Generales, Dieta y Diagnósticos</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Dieta
                </label>
                <input
                  type="text"
                  value={diet}
                  onChange={(e) => setDiet(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:border-[#0F4C5C] outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Posición
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:border-[#0F4C5C] outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Oxigenoterapia
                </label>
                <input
                  type="text"
                  value={oxygen}
                  onChange={(e) => setOxygen(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:border-[#0F4C5C] outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Control de Signos Vitales
                </label>
                <input
                  type="text"
                  value={vitalsFrequency}
                  onChange={(e) => setVitalsFrequency(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:border-[#0F4C5C] outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Diagnósticos Activos
                </label>
                <input
                  type="text"
                  value={diagnoses}
                  onChange={(e) => setDiagnoses(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:border-[#0F4C5C] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Listado Editable de Medicamentos y Soluciones */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Pill className="w-4 h-4 text-[#0F4C5C]" />
                <span>2. Fármacos y Soluciones Copiadas ({items.length})</span>
              </h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Medicamento</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((it, idx) => (
                <div
                  key={it.id}
                  className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all shadow-2xs space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black text-slate-400 font-mono w-5">
                        #{idx + 1}
                      </span>
                      <select
                        value={it.type}
                        onChange={(e) => handleUpdateItem(it.id, 'type', e.target.value as OrderType)}
                        className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 outline-none"
                      >
                        <option value="Medicamento">Medicamento</option>
                        <option value="Solución">Solución</option>
                        <option value="Procedimiento">Procedimiento</option>
                        <option value="Interconsulta">Interconsulta</option>
                      </select>
                      {it.isAntibiotic && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                          🛡️ Antibiótico (Día {it.treatmentDay})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                        <span>Día:</span>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={it.treatmentDay}
                          onChange={(e) => handleUpdateItem(it.id, 'treatmentDay', parseInt(e.target.value, 10) || 1)}
                          className="w-12 text-center text-xs font-bold border border-slate-200 rounded px-1 py-0.5 bg-slate-50"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                        title="Eliminar de la nueva orden"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                        Fármaco / Solución *
                      </label>
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          handleUpdateItem(it.id, 'name', name);
                          handleUpdateItem(it.id, 'isAntibiotic', isAntibioticDrug(name));
                        }}
                        className="w-full px-2.5 py-1 rounded border border-slate-300 font-semibold text-slate-800 outline-none focus:border-[#0F4C5C]"
                        placeholder="Nombre comercial o genérico"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                        Dosis *
                      </label>
                      <input
                        type="text"
                        value={it.dose}
                        onChange={(e) => handleUpdateItem(it.id, 'dose', e.target.value)}
                        className="w-full px-2.5 py-1 rounded border border-slate-300 text-slate-800 outline-none focus:border-[#0F4C5C]"
                        placeholder="Ej. 1 g, 40 mg, 1,000 mL"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                        Vía de Administración
                      </label>
                      <select
                        value={it.route}
                        onChange={(e) => handleUpdateItem(it.id, 'route', e.target.value)}
                        className="w-full px-2.5 py-1 rounded border border-slate-300 text-slate-800 outline-none focus:border-[#0F4C5C]"
                      >
                        <option value="Intravenosa">Intravenosa (EV)</option>
                        <option value="Vía Oral">Vía Oral (VO)</option>
                        <option value="Subcutánea">Subcutánea (SC)</option>
                        <option value="Intramuscular">Intramuscular (IM)</option>
                        <option value="Inhalatoria">Inhalatoria</option>
                        <option value="Tópica">Tópica</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                        Frecuencia / Horario
                      </label>
                      <input
                        type="text"
                        value={it.frequency}
                        onChange={(e) => handleUpdateItem(it.id, 'frequency', e.target.value)}
                        className="w-full px-2.5 py-1 rounded border border-slate-300 text-slate-800 outline-none focus:border-[#0F4C5C]"
                        placeholder="Ej. Cada 8 horas, C/24h"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Paraclínicos, Imágenes e Interconsultas */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-200 pb-2">
              <Calendar className="w-4 h-4 text-[#0F4C5C]" />
              <span>3. Paraclínicos, Imágenes e Interconsultas</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Paraclínicos Solicitados
                </label>
                <textarea
                  rows={2}
                  value={paraclinicos}
                  onChange={(e) => setParaclinicos(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:border-[#0F4C5C] outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Estudios de Imágenes
                </label>
                <textarea
                  rows={2}
                  value={imaging}
                  onChange={(e) => setImaging(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:border-[#0F4C5C] outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Interconsultas y Otras Medidas
                </label>
                <textarea
                  rows={2}
                  value={interconsultas}
                  onChange={(e) => setInterconsultas(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:border-[#0F4C5C] outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500 font-medium">
            Se generarán <strong className="text-slate-800">{items.length}</strong> prescripciones con fecha de hoy.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmAndSave}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-black shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 text-emerald-300" />
              <span>CONFIRMAR Y CREAR NUEVA ORDEN</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
