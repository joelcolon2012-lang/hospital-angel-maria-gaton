import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  BrainCircuit, 
  AlertTriangle, 
  Activity, 
  Clock, 
  Zap, 
  CheckCircle2, 
  FileText, 
  Stethoscope, 
  Trash2,
  Calendar,
  User as UserIcon,
  HelpCircle
} from 'lucide-react';
import { 
  StrokeRecord, 
  StrokeType, 
  IschemicStrokeData, 
  HemorrhagicStrokeData, 
  TransientIschemicAttackData 
} from '../../types/strokeRegistry';
import { strokeRegistryService } from '../../services/strokeRegistryService';
import { Patient } from '../../types';

interface StrokeRegistryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient | null;
  existingRecord?: StrokeRecord | null;
  onSaved?: (record: StrokeRecord) => void;
}

export const StrokeRegistryModal: React.FC<StrokeRegistryModalProps> = ({
  isOpen,
  onClose,
  patient,
  existingRecord,
  onSaved,
}) => {
  const [strokeType, setStrokeType] = useState<StrokeType>('ISQUEMICO');
  const [patientName, setPatientName] = useState<string>('');
  const [patientRecordNumber, setPatientRecordNumber] = useState<string>('');
  const [age, setAge] = useState<number>(65);
  const [sex, setSex] = useState<'M' | 'F'>('M');
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [symptomOnsetTime, setSymptomOnsetTime] = useState<string>('');
  const [hospitalArrivalTime, setHospitalArrivalTime] = useState<string>('');
  const [service, setService] = useState<string>('Emergencias');
  const [attendingDoctor, setAttendingDoctor] = useState<string>('Dr. Joel Colón');
  const [premorbidRankin, setPremorbidRankin] = useState<number>(0);

  // Ischemic fields
  const [ischemicData, setIschemicData] = useState<IschemicStrokeData>({
    nihssArrival: 8,
    nihssDischarge: 4,
    timeFromOnsetHours: 2.5,
    withinTherapeuticWindow: true,
    thrombolysisPerformed: false,
    doorToNeedleMinutes: 45,
    mechanicalThrombectomy: false,
    vascularTerritory: 'ACM',
    aspectsScore: 9,
    modifiedRankinDischarge: 1,
    antiplateletTherapy: true,
    anticoagulationTherapy: false,
    statinTherapy: true,
    disposition: 'HOSPITALIZACION_SALA'
  });

  // Hemorrhagic fields
  const [hemorrhagicData, setHemorrhagicData] = useState<HemorrhagicStrokeData>({
    bleedingLocation: 'GANGLIOS_BASALES',
    hematomaVolumeMl: 15,
    ventricularExtension: false,
    glasgowArrival: 13,
    ichScore: 1,
    surgicalManagement: 'MEDICO_CONSERVADOR',
    strictBpControlAchieved: true,
    systolicBpArrival: 180,
    modifiedRankinDischarge: 3,
    icuAdmission: false,
    inHospitalMortality: false
  });

  // TIA fields
  const [tiaData, setTiaData] = useState<TransientIschemicAttackData>({
    abcd2Score: 4,
    symptomDurationMinutes: 35,
    symptoms: {
      unilateralWeakness: true,
      speechDisturbance: true,
      visualLossAmaurosis: false,
      sensoryLoss: false,
      ataxiaOrVertigo: false
    },
    carotidEchoDone: false,
    angioCtDone: true,
    dualAntiplateletStarted: true,
    highIntensityStatin: true,
    recurrenceRisk48h: 'MODERADO (4.1%)'
  });

  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Inicializar con paciente o registro existente
  useEffect(() => {
    if (!isOpen) return;

    if (existingRecord) {
      setStrokeType(existingRecord.strokeType);
      setPatientName(existingRecord.patientName);
      setPatientRecordNumber(existingRecord.patientRecordNumber || '');
      setAge(existingRecord.age);
      setSex(existingRecord.sex);
      setEventDate(existingRecord.eventDate);
      setSymptomOnsetTime(existingRecord.symptomOnsetTime || '');
      setHospitalArrivalTime(existingRecord.hospitalArrivalTime || '');
      setService(existingRecord.service || 'Emergencias');
      setAttendingDoctor(existingRecord.attendingDoctor || 'Dr. Joel Colón');
      setPremorbidRankin(existingRecord.premorbidRankin || 0);
      setClinicalNotes(existingRecord.clinicalNotes || '');
      if (existingRecord.ischemicData) setIschemicData(existingRecord.ischemicData);
      if (existingRecord.hemorrhagicData) setHemorrhagicData(existingRecord.hemorrhagicData);
      if (existingRecord.tiaData) setTiaData(existingRecord.tiaData);
    } else if (patient) {
      setPatientName(patient.fullName);
      setPatientRecordNumber(patient.medicalRecordNumber || patient.internalCode || patient.id);
      setAge(patient.age || 65);
      setSex(patient.sex === 'F' ? 'F' : 'M');
      setEventDate(new Date().toISOString().split('T')[0]);
      setHospitalArrivalTime(patient.arrivalDateTime || new Date().toISOString().substring(11, 16));
      if (patient.vitals?.systolicBP) {
        setHemorrhagicData(prev => ({ ...prev, systolicBpArrival: patient.vitals?.systolicBP || 160 }));
      }
    }
  }, [isOpen, existingRecord, patient]);

  // Recalcular ABCD2 automáticamente para AIT
  useEffect(() => {
    if (strokeType !== 'AIT') return;
    let score = 0;
    // A: Age >= 60 (1 pt)
    if (age >= 60) score += 1;
    // B: BP >= 140/90 (1 pt)
    if (patient?.vitals && (patient.vitals.systolicBP >= 140 || patient.vitals.diastolicBP >= 90)) score += 1;
    // C: Clinical features: unilateral weakness (2 pts), speech without weakness (1 pt)
    if (tiaData.symptoms.unilateralWeakness) score += 2;
    else if (tiaData.symptoms.speechDisturbance) score += 1;
    // D: Duration: >= 60 min (2 pts), 10-59 min (1 pt)
    if (tiaData.symptomDurationMinutes >= 60) score += 2;
    else if (tiaData.symptomDurationMinutes >= 10) score += 1;
    // D: Diabetes (1 pt)
    if (patient?.diagnosesList?.some(d => d.name.toLowerCase().includes('diab'))) score += 1;

    let risk = 'BAJO (1.0%)';
    if (score >= 6) risk = 'ALTO (8.1% a 48h)';
    else if (score >= 4) risk = 'MODERADO (4.1% a 48h)';

    setTiaData(prev => ({
      ...prev,
      abcd2Score: score,
      recurrenceRisk48h: risk
    }));
  }, [age, tiaData.symptomDurationMinutes, tiaData.symptoms, strokeType]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!patientName.trim()) {
      alert('Por favor ingrese el nombre del paciente.');
      return;
    }

    setIsSaving(true);
    try {
      const recordToSave: StrokeRecord = {
        id: existingRecord?.id || `STK-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        patientId: existingRecord?.patientId || patient?.id || 'EXT',
        patientName: patientName.toUpperCase().trim(),
        patientRecordNumber,
        age: Number(age) || 0,
        sex,
        eventDate,
        symptomOnsetTime,
        hospitalArrivalTime,
        strokeType,
        service,
        attendingDoctor,
        premorbidRankin,
        ischemicData: strokeType === 'ISQUEMICO' ? ischemicData : undefined,
        hemorrhagicData: strokeType === 'HEMORRAGICO' ? hemorrhagicData : undefined,
        tiaData: strokeType === 'AIT' ? tiaData : undefined,
        clinicalNotes,
        createdAt: existingRecord?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const saved = await strokeRegistryService.saveRecord(recordToSave);
      alert('¡Registro de Evento Cerebrovascular guardado con éxito!');
      if (onSaved) onSaved(saved);
      onClose();
    } catch (err: any) {
      alert('Error al guardar el registro de EVC: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingRecord?.id) return;
    if (!confirm('¿Está seguro de eliminar este registro del registro epidemiológico de EVC?')) return;
    try {
      await strokeRegistryService.deleteRecord(existingRecord.id);
      alert('Registro eliminado.');
      onClose();
    } catch (e: any) {
      alert('Error eliminando: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header con gradiente vascular cerebral */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-800 via-indigo-800 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-sm">
              <BrainCircuit className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {existingRecord ? 'Modificar Registro de EVC' : 'Nuevo Registro de Evento Cerebrovascular'}
              </h2>
              <p className="text-xs text-purple-200">
                Hospital Regional Dr. Ángel María Gatón • Vigilancia Vascular Aguda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs text-slate-700">
          {/* SELECCIÓN OBLIGATORIA: 3 ENTIDADES INDEPENDIENTES */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
              Clasificación Nosológica (3 Entidades Estrictamente Separadas):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Isquémico */}
              <button
                type="button"
                onClick={() => setStrokeType('ISQUEMICO')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-center justify-between cursor-pointer ${
                  strokeType === 'ISQUEMICO'
                    ? 'border-blue-600 bg-blue-50/80 text-blue-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <div>
                  <span className="block text-xs font-bold text-blue-700">1. EVC Isquémico</span>
                  <span className="text-[10px] text-slate-500 font-normal">Trombolisis / Ventana / NIHSS</span>
                </div>
                {strokeType === 'ISQUEMICO' && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>

              {/* 2. Hemorrágico */}
              <button
                type="button"
                onClick={() => setStrokeType('HEMORRAGICO')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-center justify-between cursor-pointer ${
                  strokeType === 'HEMORRAGICO'
                    ? 'border-rose-600 bg-rose-50/80 text-rose-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <div>
                  <span className="block text-xs font-bold text-rose-700">2. EVC Hemorrágico</span>
                  <span className="text-[10px] text-slate-500 font-normal">Hematoma / ICH / Irrupción</span>
                </div>
                {strokeType === 'HEMORRAGICO' && <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />}
              </button>

              {/* 3. AIT */}
              <button
                type="button"
                onClick={() => setStrokeType('AIT')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-center justify-between cursor-pointer ${
                  strokeType === 'AIT'
                    ? 'border-amber-600 bg-amber-50/80 text-amber-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <div>
                  <span className="block text-xs font-bold text-amber-700">3. AIT (Transitorio)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Escala ABCD2 / Riesgo 48h</span>
                </div>
                {strokeType === 'AIT' && <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />}
              </button>
            </div>
          </div>

          {/* DATOS DEMOGRÁFICOS Y TIEMPOS */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <UserIcon className="w-3.5 h-3.5 text-slate-500" />
              Datos del Paciente & Tiempos Asistenciales
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <span className="text-[10px] text-slate-500 font-semibold block mb-1">Nombre Completo:</span>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Nombre y Apellidos..."
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-1">No. Récord / Cédula:</span>
                <input
                  type="text"
                  value={patientRecordNumber}
                  onChange={(e) => setPatientRecordNumber(e.target.value)}
                  placeholder="Ej: REC-98210"
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-1">Edad (Años):</span>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-1">Sexo:</span>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white"
                >
                  <option value="M">Masculino (M)</option>
                  <option value="F">Femenino (F)</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-1">Fecha del Evento:</span>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-1">Rankin Premórbido:</span>
                <select
                  value={premorbidRankin}
                  onChange={(e) => setPremorbidRankin(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value={0}>0 - Sin síntomas previos</option>
                  <option value={1}>1 - Sin incapacidad significativa</option>
                  <option value={2}>2 - Incapacidad leve</option>
                  <option value={3}>3 - Incapacidad moderada</option>
                  <option value={4}>4 - Incapacidad moderadamente severa</option>
                  <option value={5}>5 - Incapacidad severa (en cama)</option>
                </select>
              </div>
            </div>
          </div>

          {/* CAMPOS ESPECÍFICOS SEGÚN ENTIDAD */}

          {/* 1. SECCIÓN EVC ISQUÉMICO */}
          {strokeType === 'ISQUEMICO' && (
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 space-y-4">
              <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                <h4 className="font-bold text-blue-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  Variables Específicas: EVC Isquémico
                </h4>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-600 text-white">
                  Protocolo Trombolisis
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] text-blue-800 font-bold block mb-1">NIHSS al Ingreso:</span>
                  <input
                    type="number"
                    min="0"
                    max="42"
                    value={ischemicData.nihssArrival || 0}
                    onChange={(e) => setIschemicData({ ...ischemicData, nihssArrival: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-blue-300 rounded-lg font-bold bg-white text-blue-950"
                  />
                  <span className="text-[9px] text-slate-500">
                    {ischemicData.nihssArrival < 5 ? 'Leve' : ischemicData.nihssArrival <= 14 ? 'Moderado' : ischemicData.nihssArrival <= 20 ? 'Grave' : 'Muy Grave'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-blue-800 font-bold block mb-1">NIHSS al Egreso:</span>
                  <input
                    type="number"
                    min="0"
                    max="42"
                    value={ischemicData.nihssDischarge ?? ''}
                    onChange={(e) => setIschemicData({ ...ischemicData, nihssDischarge: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-blue-300 rounded-lg font-bold bg-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-blue-800 font-bold block mb-1">Tiempo Evolución (Horas):</span>
                  <input
                    type="number"
                    step="0.5"
                    value={ischemicData.timeFromOnsetHours || 0}
                    onChange={(e) => {
                      const h = parseFloat(e.target.value) || 0;
                      setIschemicData({ 
                        ...ischemicData, 
                        timeFromOnsetHours: h,
                        withinTherapeuticWindow: h <= 4.5
                      });
                    }}
                    className="w-full p-2 border border-blue-300 rounded-lg font-bold bg-white"
                  />
                  <span className="text-[9px] font-semibold text-blue-600">
                    {ischemicData.timeFromOnsetHours <= 4.5 ? '✓ En Ventana (<4.5h)' : '✗ Fuera de Ventana (>4.5h)'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-blue-800 font-bold block mb-1">Escala ASPECTS (TAC):</span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={ischemicData.aspectsScore || 10}
                    onChange={(e) => setIschemicData({ ...ischemicData, aspectsScore: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-blue-300 rounded-lg font-bold bg-white"
                  />
                </div>
              </div>

              {/* Trombolisis y Tiempos */}
              <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={ischemicData.thrombolysisPerformed}
                      onChange={(e) => setIschemicData({ ...ischemicData, thrombolysisPerformed: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                    <span className="text-xs font-black text-blue-950">
                      Trombolisis Intravenosa Realizada (Alteplasa / Tenecteplasa)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={ischemicData.mechanicalThrombectomy}
                      onChange={(e) => setIschemicData({ ...ischemicData, mechanicalThrombectomy: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      Trombectomía Mecánica
                    </span>
                  </label>
                </div>

                {ischemicData.thrombolysisPerformed && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-100">
                    <div>
                      <span className="text-[10px] text-blue-800 font-semibold block mb-1">
                        Tiempo Puerta-Aguja (Minutos desde arribo a bolo):
                      </span>
                      <input
                        type="number"
                        value={ischemicData.doorToNeedleMinutes || 45}
                        onChange={(e) => setIschemicData({ ...ischemicData, doorToNeedleMinutes: parseInt(e.target.value) || 0 })}
                        className="w-full p-2 border border-blue-300 rounded-lg font-bold text-blue-900 bg-blue-50/50"
                      />
                      <span className="text-[9px] text-slate-500">Meta recomendada AHA/ASA: ≤ 60 minutos</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-800 font-semibold block mb-1">Territorio Vascular:</span>
                      <select
                        value={ischemicData.vascularTerritory}
                        onChange={(e) => setIschemicData({ ...ischemicData, vascularTerritory: e.target.value as any })}
                        className="w-full p-2 border border-blue-300 rounded-lg bg-white"
                      >
                        <option value="ACM">ACM (Arteria Cerebral Media)</option>
                        <option value="ACA">ACA (Arteria Cerebral Anterior)</option>
                        <option value="ACP">ACP (Arteria Cerebral Posterior)</option>
                        <option value="VERTEBROBASILAR">Circulación Posterior / Vertebrobasilar</option>
                        <option value="LACUNAR">Infarto Lacunar de Pequeño Vaso</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Rankin al egreso y destino */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-blue-800 font-bold block mb-1">Rankin Modificado (mRS) Egreso:</span>
                  <select
                    value={ischemicData.modifiedRankinDischarge || 0}
                    onChange={(e) => setIschemicData({ ...ischemicData, modifiedRankinDischarge: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-blue-300 rounded-lg bg-white font-bold"
                  >
                    <option value={0}>0 - Sin síntomas residuales</option>
                    <option value={1}>1 - Sin incapacidad importante</option>
                    <option value={2}>2 - Incapacidad leve (independiente)</option>
                    <option value={3}>3 - Incapacidad moderada (requiere ayuda)</option>
                    <option value={4}>4 - Incapacidad moderadamente severa</option>
                    <option value={5}>5 - Incapacidad severa / Confinado a cama</option>
                    <option value={6}>6 - Fallecido</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-blue-800 font-bold block mb-1">Disposición Final:</span>
                  <select
                    value={ischemicData.disposition}
                    onChange={(e) => setIschemicData({ ...ischemicData, disposition: e.target.value as any })}
                    className="w-full p-2 border border-blue-300 rounded-lg bg-white font-bold"
                  >
                    <option value="HOSPITALIZACION_SALA">Hospitalización en Sala General</option>
                    <option value="UCI">Traslado a Unidad de Cuidados Intensivos</option>
                    <option value="ALTA_DOMICILIO">Alta Médica a Domicilio</option>
                    <option value="TRASLADO_TERCER_NIVEL">Traslado a Centro de Tercer Nivel</option>
                    <option value="MORTALIDAD_INTRAHOSPITALARIA">Mortalidad Intrahospitalaria</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 2. SECCIÓN EVC HEMORRÁGICO */}
          {strokeType === 'HEMORRAGICO' && (
            <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200 space-y-4">
              <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                <h4 className="font-bold text-rose-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-600" />
                  Variables Específicas: EVC Hemorrágico
                </h4>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-600 text-white">
                  Protocolo Hematoma / ICH
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-rose-800 font-bold block mb-1">Localización del Sangrado:</span>
                  <select
                    value={hemorrhagicData.bleedingLocation}
                    onChange={(e) => setHemorrhagicData({ ...hemorrhagicData, bleedingLocation: e.target.value as any })}
                    className="w-full p-2 border border-rose-300 rounded-lg bg-white font-bold"
                  >
                    <option value="GANGLIOS_BASALES">Ganglios Basales / Cápsula Interna</option>
                    <option value="LOBAR">Lobar (Frontal / Parietal / Temporal / Occipital)</option>
                    <option value="TALAMO">Tálamo</option>
                    <option value="TALLO_CEREBRAL">Tallo Cerebral / Puente</option>
                    <option value="CEREBELO">Cerebelo</option>
                    <option value="SUBARACNOIDEO">Hemorragia Subaracnoidea (HSA)</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-rose-800 font-bold block mb-1">Volumen Hematoma (cm³ - ABC/2):</span>
                  <input
                    type="number"
                    step="0.1"
                    value={hemorrhagicData.hematomaVolumeMl || 0}
                    onChange={(e) => setHemorrhagicData({ ...hemorrhagicData, hematomaVolumeMl: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-rose-300 rounded-lg font-bold bg-white"
                  />
                  <span className="text-[9px] text-slate-500">Fórmula ABC / 2</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-800 font-bold block mb-1">Escala ICH Score:</span>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={hemorrhagicData.ichScore || 0}
                    onChange={(e) => setHemorrhagicData({ ...hemorrhagicData, ichScore: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-rose-300 rounded-lg font-bold bg-white text-rose-900"
                  />
                  <span className="text-[9px] text-slate-500">Mortalidad estimada: 0 (0%), 3 (72%), 5-6 (100%)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-rose-800 font-bold block mb-1">Glasgow al Ingreso:</span>
                  <input
                    type="number"
                    min="3"
                    max="15"
                    value={hemorrhagicData.glasgowArrival || 15}
                    onChange={(e) => setHemorrhagicData({ ...hemorrhagicData, glasgowArrival: parseInt(e.target.value) || 3 })}
                    className="w-full p-2 border border-rose-300 rounded-lg font-bold bg-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-rose-800 font-bold block mb-1">TA Sistólica Inicial (mmHg):</span>
                  <input
                    type="number"
                    value={hemorrhagicData.systolicBpArrival || 180}
                    onChange={(e) => setHemorrhagicData({ ...hemorrhagicData, systolicBpArrival: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-rose-300 rounded-lg font-bold bg-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-rose-800 font-bold block mb-1">Tipo de Manejo:</span>
                  <select
                    value={hemorrhagicData.surgicalManagement}
                    onChange={(e) => setHemorrhagicData({ ...hemorrhagicData, surgicalManagement: e.target.value as any })}
                    className="w-full p-2 border border-rose-300 rounded-lg bg-white font-bold"
                  >
                    <option value="MEDICO_CONSERVADOR">Médico / Conservador</option>
                    <option value="CRANEOTOMIA_EVACUACION">Craneotomía / Evacuación Quirúrgica</option>
                    <option value="DERIVACION_VENTRICULAR">Derivación Ventricular Externa (DVE)</option>
                  </select>
                </div>
              </div>

              {/* Irrupción ventricular & Control estricto */}
              <div className="p-3 bg-white rounded-xl border border-rose-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hemorrhagicData.ventricularExtension}
                    onChange={(e) => setHemorrhagicData({ ...hemorrhagicData, ventricularExtension: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-rose-950">
                    Irrupción Ventricular (IVH)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hemorrhagicData.strictBpControlAchieved}
                    onChange={(e) => setHemorrhagicData({ ...hemorrhagicData, strictBpControlAchieved: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Meta de TA Lograda (&lt;140 mmHg)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hemorrhagicData.inHospitalMortality}
                    onChange={(e) => setHemorrhagicData({ ...hemorrhagicData, inHospitalMortality: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-rose-700">
                    Mortalidad Intrahospitalaria
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* 3. SECCIÓN AIT */}
          {strokeType === 'AIT' && (
            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-4">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <h4 className="font-bold text-amber-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Variables Específicas: Ataque Isquémico Transitorio (AIT)
                </h4>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-600 text-white">
                  Score ABCD2: {tiaData.abcd2Score} pts
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-amber-900 font-bold block mb-1">Duración Síntomas (Minutos):</span>
                  <input
                    type="number"
                    value={tiaData.symptomDurationMinutes || 0}
                    onChange={(e) => setTiaData({ ...tiaData, symptomDurationMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-amber-300 rounded-lg font-bold bg-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-amber-900 font-bold block mb-1">Puntaje ABCD2 Calculado:</span>
                  <input
                    type="text"
                    readOnly
                    value={`${tiaData.abcd2Score} / 7 Puntos`}
                    className="w-full p-2 border border-amber-300 rounded-lg font-black bg-amber-100/60 text-amber-950"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-amber-900 font-bold block mb-1">Riesgo Recurrencia a 48h:</span>
                  <input
                    type="text"
                    readOnly
                    value={tiaData.recurrenceRisk48h}
                    className="w-full p-2 border border-amber-300 rounded-lg font-bold bg-amber-100/60 text-amber-950"
                  />
                </div>
              </div>

              {/* Síntomas presentes */}
              <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Síntomas Focales Transitorios:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={tiaData.symptoms.unilateralWeakness}
                      onChange={(e) => setTiaData({
                        ...tiaData,
                        symptoms: { ...tiaData.symptoms, unilateralWeakness: e.target.checked }
                      })}
                      className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                    />
                    <span className="text-xs text-slate-800">Debilidad Unilateral</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={tiaData.symptoms.speechDisturbance}
                      onChange={(e) => setTiaData({
                        ...tiaData,
                        symptoms: { ...tiaData.symptoms, speechDisturbance: e.target.checked }
                      })}
                      className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                    />
                    <span className="text-xs text-slate-800">Disfasia / Trastorno Lenguaje</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={tiaData.symptoms.visualLossAmaurosis}
                      onChange={(e) => setTiaData({
                        ...tiaData,
                        symptoms: { ...tiaData.symptoms, visualLossAmaurosis: e.target.checked }
                      })}
                      className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                    />
                    <span className="text-xs text-slate-800">Amaurosis Fugaz</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* NOTAS CLÍNICAS ADICIONALES */}
          <div>
            <span className="text-[10px] text-slate-500 font-semibold block mb-1">Notas Clínicas y Evolución Vascular:</span>
            <textarea
              rows={2}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Observaciones de neuroimagen, comorbilidades, etiología TOAST o complicaciones..."
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-xs"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {existingRecord?.id && (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar Registro</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:bg-slate-400 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Registro de EVC</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
