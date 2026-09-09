import React, { useState } from 'react';
import { Patient, Vitals } from '../../types';
import { Activity, AlertTriangle, Plus, X, Heart, Wind, Thermometer, ShieldAlert, Save, Download, Check, Trash2, AlertCircle, Info } from 'lucide-react';
import { downloadFileToPC } from '../../services/hospitalNoteGenerator';
import { validateVitals } from '../../services/clinicalValidationService';

interface Props {
  patient: Patient;
  onUpdateVitals: (vitals: Vitals) => void;
}

export const TriageVitalsTab: React.FC<Props> = ({ patient, onUpdateVitals }) => {
  const [vitals, setVitals] = useState<Vitals>(patient.vitals || {
    hemodynamicStatus: 'Estable',
    allergies: [],
    comorbidities: [],
  });

  const [newAllergy, setNewAllergy] = useState('');
  const [newComorbidity, setNewComorbidity] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleSaveAndDownload = () => {
    onUpdateVitals(vitals);
    const filename = `Signos_Triaje_${patient.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    const data = {
      patientId: patient.id,
      patientName: patient.fullName,
      internalCode: patient.internalCode,
      savedAt: new Date().toISOString(),
      vitals,
    };
    downloadFileToPC(filename, JSON.stringify(data, null, 2), 'application/json');
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  // Handle vitals change with automatic MAP and BMI calculations
  const handleChange = (field: keyof Vitals, val: any) => {
    const updated = { ...vitals, [field]: val };

    // Auto calculate MAP = (2*DBP + SBP) / 3
    if (field === 'systolicBP' || field === 'diastolicBP') {
      const sbp = field === 'systolicBP' ? Number(val) : Number(updated.systolicBP || 0);
      const dbp = field === 'diastolicBP' ? Number(val) : Number(updated.diastolicBP || 0);
      if (sbp > 0 && dbp > 0) {
        updated.map = Math.round((sbp + 2 * dbp) / 3);
      }
    }

    // Auto calculate BMI = kg / (m^2)
    if (field === 'weight' || field === 'height') {
      const w = field === 'weight' ? Number(val) : Number(updated.weight || 0);
      const h = field === 'height' ? Number(val) : Number(updated.height || 0);
      if (w > 0 && h > 0) {
        const heightMeters = h / 100;
        updated.bmi = parseFloat((w / (heightMeters * heightMeters)).toFixed(1));
      }
    }

    // Auto calculate Glasgow Total
    if (field === 'glasgowEye' || field === 'glasgowVerbal' || field === 'glasgowMotor') {
      const eye = field === 'glasgowEye' ? Number(val) : Number(updated.glasgowEye || 4);
      const ver = field === 'glasgowVerbal' ? Number(val) : Number(updated.glasgowVerbal || 5);
      const mot = field === 'glasgowMotor' ? Number(val) : Number(updated.glasgowMotor || 6);
      updated.glasgowTotal = eye + ver + mot;
    }

    setVitals(updated);
    onUpdateVitals(updated);
  };

  const addAllergy = () => {
    if (!newAllergy.trim()) return;
    const list = [...(vitals.allergies || []), newAllergy.trim()];
    handleChange('allergies', list);
    setNewAllergy('');
  };

  const removeAllergy = (index: number) => {
    const list = (vitals.allergies || []).filter((_, i) => i !== index);
    handleChange('allergies', list);
  };

  const addComorbidity = () => {
    if (!newComorbidity.trim()) return;
    const list = [...(vitals.comorbidities || []), newComorbidity.trim()];
    handleChange('comorbidities', list);
    setNewComorbidity('');
  };

  const removeComorbidity = (index: number) => {
    const list = (vitals.comorbidities || []).filter((_, i) => i !== index);
    handleChange('comorbidities', list);
  };

  const handleClearVitals = () => {
    if (window.confirm('¿Deseas restablecer y vaciar todos los signos vitales y constantes registradas de este paciente?')) {
      const emptyVitals: Vitals = {
        systolicBP: undefined,
        diastolicBP: undefined,
        heartRate: undefined,
        respiratoryRate: undefined,
        temperature: undefined,
        oxygenSaturation: undefined,
        bloodGlucose: undefined,
        painScale: undefined,
        glasgowTotal: 15,
        glasgowEye: 4,
        glasgowVerbal: 5,
        glasgowMotor: 6,
        weight: undefined,
        height: undefined,
        bmi: undefined,
        map: undefined,
        hemodynamicStatus: 'Estable',
        allergies: [],
        comorbidities: [],
      };
      setVitals(emptyVitals);
      onUpdateVitals(emptyVitals);
    }
  };

  const validation = validateVitals(vitals);
  const hasErrors = Object.keys(validation.errors).length > 0;
  const hasWarnings = Object.keys(validation.warnings).length > 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Save & Auto-Download Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <Activity className="w-4 h-4 text-teal-700" />
          <span>Apartado: <strong>Signos Vitales y Triaje Clínico</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearVitals}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-all active:scale-95 shadow-sm"
            title="Restablecer y vaciar los signos vitales"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span>Limpiar Constantes</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndDownload}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-[#0F4C5C] hover:bg-petrol-800 text-white transition-all active:scale-95 shadow-sm"
            title="Guarda los signos vitales y genera la descarga inmediata en tu PC"
          >
            {savedFeedback ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
            {savedFeedback ? '¡Guardado y Descargado!' : 'Guardar y Descargar en PC'}
          </button>
        </div>
      </div>

      {/* Validation Errors & Clinical Warnings Banner */}
      {(hasErrors || hasWarnings) && (
        <div className="space-y-2">
          {hasErrors && (
            <div className="bg-red-50 border border-red-300 p-3 rounded-xl text-xs text-red-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-red-900">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Valores no fisiológicos detectados:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-1">
                {Object.entries(validation.errors).map(([k, msg]) => (
                  <li key={k}>{msg}</li>
                ))}
              </ul>
            </div>
          )}

          {hasWarnings && (
            <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Alertas clínicas de constantes vitales (Vigilar estrechamente):</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-1">
                {Object.entries(validation.warnings).map(([k, msg]) => (
                  <li key={k}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 1. Signos Vitales Principales */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-petrol-900 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600" />
          <span>Constantes Vitales de Ingreso</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* PAS */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              PA Sistólica (mmHg)
            </label>
            <input
              type="number"
              value={vitals.systolicBP || ''}
              onChange={(e) => handleChange('systolicBP', e.target.value)}
              placeholder="120"
              className={`w-full border rounded-xl px-3 py-2 text-sm font-bold ${
                vitals.systolicBP && (vitals.systolicBP < 90 || vitals.systolicBP > 140)
                  ? 'border-red-500 bg-red-50 text-red-900'
                  : 'border-slate-300 bg-slate-50 text-slate-800'
              }`}
            />
          </div>

          {/* PAD */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              PA Diastólica (mmHg)
            </label>
            <input
              type="number"
              value={vitals.diastolicBP || ''}
              onChange={(e) => handleChange('diastolicBP', e.target.value)}
              placeholder="80"
              className={`w-full border rounded-xl px-3 py-2 text-sm font-bold ${
                vitals.diastolicBP && (vitals.diastolicBP < 60 || vitals.diastolicBP > 90)
                  ? 'border-red-500 bg-red-50 text-red-900'
                  : 'border-slate-300 bg-slate-50 text-slate-800'
              }`}
            />
          </div>

          {/* PAM */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              PAM Calc. (mmHg)
            </label>
            <input
              type="number"
              readOnly
              value={vitals.map || ''}
              className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-petrol-900 cursor-not-allowed"
            />
          </div>

          {/* FC */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Frecuencia Cardiaca (lpm)
            </label>
            <input
              type="number"
              value={vitals.heartRate || ''}
              onChange={(e) => handleChange('heartRate', e.target.value)}
              placeholder="75"
              className={`w-full border rounded-xl px-3 py-2 text-sm font-bold ${
                vitals.heartRate && (vitals.heartRate < 60 || vitals.heartRate > 100)
                  ? 'border-red-500 bg-red-50 text-red-900'
                  : 'border-slate-300 bg-slate-50 text-slate-800'
              }`}
            />
          </div>

          {/* FR */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Frecuencia Respiratoria (rpm)
            </label>
            <input
              type="number"
              value={vitals.respiratoryRate || ''}
              onChange={(e) => handleChange('respiratoryRate', e.target.value)}
              placeholder="16"
              className={`w-full border rounded-xl px-3 py-2 text-sm font-bold ${
                vitals.respiratoryRate && (vitals.respiratoryRate < 12 || vitals.respiratoryRate > 20)
                  ? 'border-red-500 bg-red-50 text-red-900'
                  : 'border-slate-300 bg-slate-50 text-slate-800'
              }`}
            />
          </div>

          {/* Temp */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Temperatura (°C)
            </label>
            <input
              type="number"
              step="0.1"
              value={vitals.temperature || ''}
              onChange={(e) => handleChange('temperature', e.target.value)}
              placeholder="36.5"
              className={`w-full border rounded-xl px-3 py-2 text-sm font-bold ${
                vitals.temperature && (vitals.temperature < 36.0 || vitals.temperature >= 38.0)
                  ? 'border-red-500 bg-red-50 text-red-900'
                  : 'border-slate-300 bg-slate-50 text-slate-800'
              }`}
            />
          </div>

          {/* SpO2 */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Saturación O2 (%)
            </label>
            <input
              type="number"
              value={vitals.oxygenSaturation || ''}
              onChange={(e) => handleChange('oxygenSaturation', e.target.value)}
              placeholder="98"
              className={`w-full border rounded-xl px-3 py-2 text-sm font-bold ${
                vitals.oxygenSaturation && vitals.oxygenSaturation < 94
                  ? 'border-red-500 bg-red-50 text-red-900'
                  : 'border-slate-300 bg-slate-50 text-slate-800'
              }`}
            />
          </div>

          {/* Glucemia */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Glucemia Capilar (mg/dL)
            </label>
            <input
              type="number"
              value={vitals.bloodGlucose || ''}
              onChange={(e) => handleChange('bloodGlucose', e.target.value)}
              placeholder="100"
              className={`w-full border rounded-xl px-3 py-2 text-sm font-bold ${
                vitals.bloodGlucose && (vitals.bloodGlucose < 70 || vitals.bloodGlucose > 180)
                  ? 'border-red-500 bg-red-50 text-red-900'
                  : 'border-slate-300 bg-slate-50 text-slate-800'
              }`}
            />
          </div>
        </div>

        {/* Antropometría */}
        <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Peso (kg)</label>
            <input
              type="number"
              value={vitals.weight || ''}
              onChange={(e) => handleChange('weight', e.target.value)}
              placeholder="70"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Talla (cm)</label>
            <input
              type="number"
              value={vitals.height || ''}
              onChange={(e) => handleChange('height', e.target.value)}
              placeholder="170"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">IMC Calc.</label>
            <input
              type="number"
              readOnly
              value={vitals.bmi || ''}
              className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-petrol-900"
            />
          </div>
        </div>
      </div>

      {/* 2. Escalas Neurológica (Glasgow) y Dolor (EVA) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-petrol-900 uppercase tracking-wider flex items-center justify-between">
          <span>Escalas Clínicas de Emergencia</span>
          <span className="text-xs bg-petrol-50 text-petrol-900 px-2.5 py-1 rounded-lg border border-teal-200">
            Glasgow Total: <strong>{vitals.glasgowTotal || 15}/15</strong>
          </span>
        </h3>

        {/* Glasgow inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Apertura Ocular</label>
            <select
              value={vitals.glasgowEye || 4}
              onChange={(e) => handleChange('glasgowEye', e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-medium"
            >
              <option value="4">4 - Espontánea</option>
              <option value="3">3 - Al llamado verbal</option>
              <option value="2">2 - Al estímulo doloroso</option>
              <option value="1">1 - Sin respuesta</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Respuesta Verbal</label>
            <select
              value={vitals.glasgowVerbal || 5}
              onChange={(e) => handleChange('glasgowVerbal', e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-medium"
            >
              <option value="5">5 - Orientado y conversa</option>
              <option value="4">4 - Confuso / Desorientado</option>
              <option value="3">3 - Palabras inapropiadas</option>
              <option value="2">2 - Sonidos incomprensibles</option>
              <option value="1">1 - Sin respuesta</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Respuesta Motora</label>
            <select
              value={vitals.glasgowMotor || 6}
              onChange={(e) => handleChange('glasgowMotor', e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-medium"
            >
              <option value="6">6 - Obedece órdenes</option>
              <option value="5">5 - Localiza el dolor</option>
              <option value="4">4 - Retira al dolor (flexión)</option>
              <option value="3">3 - Flexión anormal (decorticación)</option>
              <option value="2">2 - Extensión anormal (descerebración)</option>
              <option value="1">1 - Sin respuesta / flacidez</option>
            </select>
          </div>
        </div>

        {/* Dolor EVA */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
            <span>Escala Visual Analógica de Dolor (EVA):</span>
            <span className="text-sm font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
              {vitals.painScale ?? 0} / 10
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            value={vitals.painScale ?? 0}
            onChange={(e) => handleChange('painScale', parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>0 (Sin dolor)</span>
            <span>5 (Moderado)</span>
            <span>10 (Peor dolor imaginable)</span>
          </div>
        </div>

        {/* Oxígeno suplementario y Hemodinámica */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Oxígeno Suplementario</label>
            <input
              type="text"
              value={vitals.supplementalOxygen || ''}
              onChange={(e) => handleChange('supplementalOxygen', e.target.value)}
              placeholder="Ej. Cánula nasal 3 L/min, Venturi 28%, Ninguno..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Estado Hemodinámico</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleChange('hemodynamicStatus', 'Estable')}
                className={`flex-1 py-2 rounded-xl font-bold border transition-all ${
                  vitals.hemodynamicStatus === 'Estable'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                Estable
              </button>
              <button
                type="button"
                onClick={() => handleChange('hemodynamicStatus', 'Inestable')}
                className={`flex-1 py-2 rounded-xl font-bold border transition-all ${
                  vitals.hemodynamicStatus === 'Inestable'
                    ? 'bg-red-600 text-white border-red-700 shadow-sm animate-pulse'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                Inestable
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Alergias y Comorbilidades (Con Alerta de Seguridad) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600" />
          <span>Alergias Conocidas y Condiciones Especiales</span>
        </h3>

        {/* Allergies list */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Alergias Medicamentosas / Ambientales
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(vitals.allergies || []).map((allergy, idx) => (
              <span
                key={idx}
                className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-red-200 flex items-center gap-1.5"
              >
                <span>{allergy}</span>
                <button
                  type="button"
                  onClick={() => removeAllergy(idx)}
                  className="text-red-600 hover:text-red-900"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {(!vitals.allergies || vitals.allergies.length === 0) && (
              <span className="text-xs text-slate-400 italic">No hay alergias registradas</span>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
              placeholder="Ej. Penicilina, AINEs, Yodo, Sulfas..."
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
            />
            <button
              type="button"
              onClick={addAllergy}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir</span>
            </button>
          </div>
        </div>

        {/* Pregnancy & Anticoagulation toggles */}
        <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
          <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={vitals.isPregnant || false}
              onChange={(e) => handleChange('isPregnant', e.target.checked)}
              className="w-4 h-4 rounded text-petrol-800 focus:ring-petrol-800"
            />
            <span className="font-semibold text-slate-800">Embarazo / Sospecha</span>
          </label>

          <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={vitals.anticoagulation || false}
              onChange={(e) => handleChange('anticoagulation', e.target.checked)}
              className="w-4 h-4 rounded text-petrol-800 focus:ring-petrol-800"
            />
            <span className="font-semibold text-slate-800">Anticoagulado / Antiagregado</span>
          </label>
        </div>
      </div>

      {/* Bottom Save & Download Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSaveAndDownload}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-[#0F4C5C] hover:bg-petrol-800 text-white transition-all active:scale-95 shadow-md"
        >
          {savedFeedback ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          {savedFeedback ? '¡Signos Guardados y Descargados!' : 'Guardar y Descargar Signos en PC'}
        </button>
      </div>
    </div>
  );
};
