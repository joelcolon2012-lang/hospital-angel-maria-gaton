import React, { useState } from 'react';
import { Patient, LabResult, LabPanel, LabFlag } from '../../types';
import { centralSyncService } from '../../services/centralSyncService';
import { X, TestTube2, Camera, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import { LabPhotoImportModal } from '../labs/LabPhotoImportModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  preselectedPatientId?: string;
  currentUser?: { name: string; role: string };
  onLabSaved?: (lab: LabResult) => void;
}

export const AddLabModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patients,
  preselectedPatientId,
  currentUser,
  onLabSaved
}) => {
  const [patientId, setPatientId] = useState<string>(preselectedPatientId || (patients[0]?.id || ''));
  const [mode, setMode] = useState<'MANUAL' | 'FOTO' | 'PDF' | 'SIMULADO'>('MANUAL');
  const [panel, setPanel] = useState<LabPanel>('Química');
  const [timestamp, setTimestamp] = useState(new Date().toISOString().slice(0, 16));

  // Lista de parámetros para confirmación (empieza vacía: nunca con valores de ejemplo)
  type Entry = { parameter: string; value: string; unit: string; referenceRange: string; flag: LabFlag; panel?: LabPanel };
  const blankRow = (): Entry => ({ parameter: '', value: '', unit: '', referenceRange: '', flag: 'normal' });
  const [entries, setEntries] = useState<Entry[]>([blankRow()]);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleImportedLabs = (labs: Partial<LabResult>[]) => {
    const rows: Entry[] = labs.map((l) => ({
      parameter: l.parameter || '',
      value: l.value || '',
      unit: l.unit || '',
      referenceRange: l.referenceRange || '',
      flag: (l.flag as LabFlag) || 'normal',
      panel: l.panel as LabPanel
    }));
    setEntries((prev) => [...prev.filter((e) => e.parameter.trim() || e.value.trim()), ...rows]);
    setMode('FOTO');
    setIsPreviewOpen(true);
  };

  const handleUpdateEntry = (index: number, field: string, val: string) => {
    const next = [...entries];
    (next[index] as any)[field] = val;
    setEntries(next);
  };

  const handleAddEntryRow = () => {
    setEntries([...entries, blankRow()]);
  };

  const handleRemoveEntryRow = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleSaveAllValidated = async () => {
    setIsSaving(true);
    try {
      const user = currentUser?.name || 'Dr. Joel Colón';
      for (const entry of entries) {
        if (!entry.parameter.trim() || !entry.value.trim()) continue;
        const numVal = parseFloat(entry.value.replace(',', '.'));
        const lab: LabResult = {
          id: `lab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          patientId,
          panel: entry.panel || panel,
          parameter: entry.parameter.trim(),
          value: entry.value.trim(),
          numericValue: !isNaN(numVal) ? numVal : undefined,
          unit: entry.unit.trim(),
          referenceRange: entry.referenceRange.trim(),
          flag: entry.flag,
          timestamp: new Date(timestamp).toISOString(),
          source: mode === 'MANUAL' ? 'manual' : mode === 'FOTO' ? 'foto_vision' : 'adjunto',
          registeredBy: user
        };
        await centralSyncService.saveLabCentral(lab, user);
        if (onLabSaved) onLabSaved(lab);
      }
      onClose();
    } catch (err: any) {
      alert('Error guardando analíticas: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0F4C5C] text-white px-5 py-3.5 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-800/80 rounded-lg">
              <TestTube2 className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-none uppercase tracking-wide">
                CARGA INTELIGENTE DE ANALÍTICAS / PARACLÍNICAS
              </h3>
              <p className="text-[11px] text-teal-100/80 mt-0.5">
                Extracción, validación médica humana y análisis en tiempo real
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto">
          {/* Selector de Paciente & Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Paciente:</label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.cubicle || 'S/C'}] {p.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Panel de Laboratorio:</label>
              <select
                value={panel}
                onChange={(e) => setPanel(e.target.value as LabPanel)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
              >
                <option value="Hemograma">🩸 Hemograma Completo</option>
                <option value="Química">🧪 Química Sanguínea</option>
                <option value="Electrolitos">⚡ Electrolitos Séricos (Na, K, Cl, Ca, P, Mg)</option>
                <option value="Función Renal">🩺 Función Renal & Azotemia</option>
                <option value="Función Hepática">🫀 Función Hepática & Colestasis</option>
                <option value="Gases Arteriales">💨 Gases Arteriales (Ácido-Base)</option>
                <option value="Coagulación">🩹 Coagulación (TP, TTP, INR)</option>
                <option value="Orina">🟡 Examen de Orina</option>
                <option value="Otros">📋 Otros Paneles</option>
              </select>
            </div>
          </div>

          {/* Método de Carga */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Método de Captura:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('MANUAL')}
                className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                  mode === 'MANUAL' ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                ✍️ Escribir a mano
              </button>
              <button
                type="button"
                onClick={() => setIsPhotoOpen(true)}
                className="p-2.5 rounded-xl border border-teal-600 bg-teal-700 text-white text-center font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Camera className="w-4 h-4" /> Foto / PDF (celular o PC)
              </button>
            </div>
          </div>

          {/* Tabla de Parámetros con Validación Humana Obligatoria (Sección 10) */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-100 px-3 py-2 flex items-center justify-between border-b border-slate-200">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-teal-700" />
                Vista Previa de Validación Humana Obligatoria (Sección 10):
              </span>
              <button
                type="button"
                onClick={handleAddEntryRow}
                className="px-2 py-0.5 bg-teal-700 hover:bg-teal-600 text-white rounded-md text-[11px] font-bold"
              >
                + Añadir Parámetro
              </button>
            </div>

            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-bold">
                <tr>
                  <th className="p-2">Parámetro</th>
                  <th className="p-2 w-24">Valor</th>
                  <th className="p-2 w-20">Unidad</th>
                  <th className="p-2 w-28">Ref.</th>
                  <th className="p-2 w-24">Alerta</th>
                  <th className="p-2 w-8 text-center">✕</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {entries.map((item, idx) => (
                  <tr key={idx} className={item.flag === 'critico' ? 'bg-red-50/60' : item.flag === 'alto' || item.flag === 'bajo' ? 'bg-amber-50/40' : ''}>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={item.parameter}
                        onChange={(e) => handleUpdateEntry(idx, 'parameter', e.target.value)}
                        className="w-full p-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={item.value}
                        onChange={(e) => handleUpdateEntry(idx, 'value', e.target.value)}
                        className={`w-full p-1 bg-white border rounded text-xs font-mono font-bold ${
                          item.flag === 'critico' ? 'border-red-500 text-red-700' : 'border-slate-300'
                        }`}
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleUpdateEntry(idx, 'unit', e.target.value)}
                        className="w-full p-1 bg-white border border-slate-300 rounded text-xs font-mono"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={item.referenceRange}
                        onChange={(e) => handleUpdateEntry(idx, 'referenceRange', e.target.value)}
                        className="w-full p-1 bg-white border border-slate-300 rounded text-xs text-slate-500 font-mono"
                      />
                    </td>
                    <td className="p-1.5">
                      <select
                        value={item.flag}
                        onChange={(e) => handleUpdateEntry(idx, 'flag', e.target.value)}
                        className={`w-full p-1 border rounded text-[11px] font-bold ${
                          item.flag === 'critico' ? 'bg-red-100 text-red-800 border-red-400' :
                          item.flag === 'alto' || item.flag === 'bajo' ? 'bg-amber-100 text-amber-800 border-amber-400' : 'bg-white text-slate-700'
                        }`}
                      >
                        <option value="normal">Normal</option>
                        <option value="alto">Alto ↑</option>
                        <option value="bajo">Bajo ↓</option>
                        <option value="critico">🔴 Crítico</option>
                      </select>
                    </td>
                    <td className="p-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveEntryRow(idx)}
                        className="text-slate-400 hover:text-red-600 font-bold"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-start gap-2 text-amber-900 text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Validación Médica Requerida:</strong> Verifique los valores extraídos antes de confirmar. Al presionar <strong>[CONFIRMAR Y GUARDAR EN EXPEDIENTE CENTRAL]</strong>, el motor recalculará automáticamente los diagnósticos sugeridos y las alertas de guardia.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSaving || entries.length === 0}
            onClick={handleSaveAllValidated}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSaving ? 'Guardando...' : 'Confirmar y Guardar en Expediente Central'}
          </button>
        </div>
      </div>
      <LabPhotoImportModal
        isOpen={isPhotoOpen}
        onClose={() => setIsPhotoOpen(false)}
        patientId={patientId}
        focus="todos"
        onSaveLabs={handleImportedLabs}
      />
    </div>
  );
};
