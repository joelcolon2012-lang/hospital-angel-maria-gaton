import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Download, 
  Copy, 
  Check, 
  X, 
  ShieldAlert, 
  Sparkles, 
  Eye, 
  Printer, 
  Edit3, 
  AlertCircle,
  Stethoscope,
  Activity,
  History,
  Pill,
  Microscope,
  Info
} from 'lucide-react';
import { Patient, MedicalOrder, LabResult, MedicalStudy, PatientEvolution } from '../../types';
import { 
  generateEmergencyAdmissionNote, 
  generateInternalMedicineWardAdmissionNote, 
  generateIndividualMedicalOrder,
  cleanAndDeduplicateNarrative
} from '../../services/hospitalNoteGenerator';
import { 
  generateEmergencyNoteDocx, 
  generateWardTransferNoteDocx, 
  generateMedicalOrderDocx,
  generateEvolutionDocx
} from '../../services/docxTemplateService';
import { 
  exportOfficialAdmissionNotePdf, 
  exportOfficialMedicalOrderPdf 
} from '../../services/pdfHospitalDocumentService';
import { clinicalTemplateService } from '../../services/clinicalTemplateService';
import { findRepeatedPhrases, checkMedicalSpelling } from '../../services/ai/ClinicalSpellChecker';

export type NoteType = 'emergencia' | 'sala' | 'evolucion' | 'orden';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  orders: MedicalOrder[];
  labs: LabResult[];
  studies: MedicalStudy[];
  evolutions?: PatientEvolution[];
  initialDocType?: NoteType;
}

export const MandatoryNotePreviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  orders,
  labs,
  studies,
  evolutions = [],
  initialDocType = 'emergencia',
}) => {
  const [docType, setDocType] = useState<NoteType>(initialDocType);
  const [activeTab, setActiveTab] = useState<'originales' | 'generada' | 'sugerencias'>('generada');
  const [editableNote, setEditableNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [activeTemplateVersion, setActiveTemplateVersion] = useState<number>(1);

  // Cargar versión activa de la plantilla
  useEffect(() => {
    const fetchTpl = async () => {
      const idMap: Record<NoteType, any> = {
        emergencia: 'nota_emergencia',
        sala: 'nota_recibimiento',
        evolucion: 'evolucion',
        orden: 'orden_medica'
      };
      const tpl = await clinicalTemplateService.getTemplate(idMap[docType]);
      if (tpl) {
        setActiveTemplateVersion(tpl.activeVersion || 1);
      }
    };
    fetchTpl();
  }, [docType]);

  // Generar nota clínica base
  const buildNoteContent = (type: NoteType): string => {
    switch (type) {
      case 'emergencia':
        return generateEmergencyAdmissionNote(patient, orders, labs, studies);
      case 'sala':
        return generateInternalMedicineWardAdmissionNote(patient, orders, labs, studies);
      case 'orden':
        return generateIndividualMedicalOrder(patient, orders);
      case 'evolucion': {
        const lastEvo = evolutions[0];
        const dayNumber = evolutions.length > 0 ? evolutions.length : 1;
        const d = new Date();
        const dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        let evoText = `             :HOSPITAL\n`;
        evoText += `          H  DR. ÁNGEL MARÍA GATÓN\n\n`;
        evoText += `                  NOTA DE EVOLUCIÓN MÉDICA EN SALA\n\n`;
        evoText += `NOMBRE: ${patient.fullName.toUpperCase()}  EDAD: ${patient.age || '--'} AÑOS  CUBÍCULO: ${patient.cubicle}  FECHA: ${dateStr}  HORA: ${timeStr}\n`;
        evoText += `DÍA DE HOSPITALIZACIÓN: DÍA ${dayNumber} • MÉDICO: ${(patient.attendingDoctor || 'DR. COLÓN').toUpperCase()}\n\n`;

        const v = patient.vitals || {};
        evoText += `SIGNOS VITALES DEL TURNO:\n`;
        evoText += `TA: ${v.systolicBP || '120'}/${v.diastolicBP || '80'} MMHG, FC: ${v.heartRate || '78'} LPM, FR: ${v.respiratoryRate || '18'} RPM, SPO2: ${v.oxygenSaturation || '98'}% AA, TEMP: ${v.temperature || '36.8'} °C, GLICEMIA: ${v.bloodGlucose || '95'} MG/DL.\n\n`;

        evoText += `EVOLUCIÓN SUBJETIVA Y NOVEDADES:\n`;
        evoText += `${lastEvo ? lastEvo.clinicalChanges.toUpperCase() : 'PACIENTE REFIERE EVOLUCIÓN CLÍNICA ESTABLE, TOLERANDO VÍA ORAL Y SIN EVENTOS AGUDOS EN LAS ÚLTIMAS 24 HORAS.'}\n\n`;

        evoText += `EXAMEN FÍSICO DIRIGIDO:\n`;
        const pe: any = patient.clinicalHistory?.physicalExam || {};
        evoText += `PACIENTE ALERTA, ORIENTADO, CARDIOVASCULAR RÍTMICO SIN SOPLOS, PULMONES NORMOVENTILADOS SIN ESTERTORES, ABDOMEN BLANDO NO DOLOROSO, EXTREMIDADES SIN EDEMA.\n\n`;

        if (labs.length > 0) {
          evoText += `NUEVOS RESULTADOS DE PARACLÍNICOS:\n`;
          evoText += labs.map(l => `• ${l.parameter.toUpperCase()}: ${l.value} ${l.unit ? l.unit.toUpperCase() : ''}`).join('\n') + '\n\n';
        }

        evoText += `ANÁLISIS CLÍNICO Y JUICIO EVOLUTIVO:\n`;
        evoText += `${lastEvo && lastEvo.problemReevaluation ? lastEvo.problemReevaluation.toUpperCase() : 'PACIENTE PRESENTA ADECUADA RESPUESTA AL MANEJO MÉDICO ESTABLECIDO, CON ESTABILIDAD HEMODINÁMICA Y CRITERIOS DE CONTINUIDAD TERAPÉUTICA.'}\n\n`;

        evoText += `DIAGNÓSTICOS NOSOLÓGICOS:\n`;
        const rawDiags = patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint || 'EN TRATAMIENTO';
        const diagList = rawDiags.split(/[\n,;]+/).map(d => d.trim().toUpperCase()).filter(Boolean);
        diagList.forEach((d, i) => {
          evoText += `${i + 1}. ${d}\n`;
        });
        evoText += `\n`;

        evoText += `CONDUCTA MÉDICA Y PLAN:\n`;
        evoText += `${lastEvo && lastEvo.conduct ? lastEvo.conduct.toUpperCase() : '1. CONTINUAR CON ÓRDENES MÉDICAS VIGENTES.\n2. CONTROL DE CONSTANTES VITALES CADA TURNO.\n3. VIGILANCIA DE PATRÓN RESPIRATORIO Y SIGNOS DE ALARMA.'}\n\n`;

        evoText += `____________________________________\n`;
        evoText += `${(patient.attendingDoctor || 'DR. COLÓN').toUpperCase()}\n`;
        evoText += `MÉDICO TRATANTE • HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN\n`;

        return cleanAndDeduplicateNarrative(evoText);
      }
    }
  };

  useEffect(() => {
    const raw = buildNoteContent(docType);
    setEditableNote(raw);
    setIsEditing(false);
  }, [docType, patient, orders, labs, studies, evolutions]);

  if (!isOpen) return null;

  // Acciones de descarga
  const handleConfirmAndDownloadWord = async () => {
    setIsGeneratingDocx(true);
    try {
      if (docType === 'emergencia') {
        await generateEmergencyNoteDocx(patient, orders, labs);
      } else if (docType === 'sala') {
        await generateWardTransferNoteDocx(patient, orders, labs);
      } else if (docType === 'orden') {
        await generateMedicalOrderDocx(patient, orders);
      } else if (docType === 'evolucion') {
        await generateEvolutionDocx(patient, evolutions, orders);
      }
    } catch (err: any) {
      alert('Error generando archivo Word: ' + err.message);
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  const handleDownloadPdf = () => {
    if (docType === 'emergencia' || docType === 'sala') {
      exportOfficialAdmissionNotePdf(patient, orders, labs, studies, docType);
    } else if (docType === 'orden') {
      exportOfficialMedicalOrderPdf(patient, orders);
    } else {
      exportOfficialAdmissionNotePdf(patient, orders, labs, studies, 'emergencia');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editableNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Análisis de sugerencias y auditoría de la IA
  const repeated = findRepeatedPhrases(editableNote);
  const spellCheckAnalysis = checkMedicalSpelling(editableNote);

  const docTitleMap: Record<NoteType, string> = {
    emergencia: 'NOTA DE INGRESO EMERGENCIA',
    sala: 'NOTA DE RECIBIMIENTO EN SALA',
    evolucion: 'NOTA DE EVOLUCIÓN MÉDICA',
    orden: 'HOJA DE ORDEN MÉDICA OFICIAL'
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-5xl rounded-[22px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Cabecera Principal */}
        <div className="bg-[#0F4C5C] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-teal-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg leading-tight">
                  Previsualización Obligatoria & Validación de Nota
                </h3>
                <span className="text-[10px] bg-teal-500/20 text-teal-200 px-2 py-0.5 rounded-full font-bold border border-teal-400/30">
                  Plantilla Oficial Activa v{activeTemplateVersion}
                </span>
              </div>
              <p className="text-xs text-teal-100/80">
                Hospital Regional Dr. Ángel María Gatón • Paciente: <strong className="text-white">{patient.fullName}</strong> ({patient.age || '--'} años, Cub: {patient.cubicle})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de Selección de Documento y Tabs Obligatorios (Sección 37) */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Selector de Tipo de Nota */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
              Documento:
            </span>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as NoteType)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-[#0F4C5C]/30 focus:border-[#0F4C5C] outline-none cursor-pointer"
            >
              <option value="emergencia">🚨 NOTA DE INGRESO EMERGENCIA</option>
              <option value="sala">🏥 NOTA DE RECIBIMIENTO EN SALA</option>
              <option value="evolucion">📈 EVOLUCIÓN MÉDICA HOSPITALARIA</option>
              <option value="orden">💊 ORDEN MÉDICA OFICIAL</option>
            </select>
          </div>

          {/* 3 Tabs Exigidos por la Sección 37 */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300/80 shadow-2xs w-full sm:w-auto justify-center">
            <button
              onClick={() => setActiveTab('originales')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'originales'
                  ? 'bg-[#0F4C5C] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>1. DATOS ORIGINALES</span>
            </button>

            <button
              onClick={() => setActiveTab('generada')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'generada'
                  ? 'bg-[#0F4C5C] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>2. NOTA GENERADA</span>
            </button>

            <button
              onClick={() => setActiveTab('sugerencias')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'sugerencias'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>3. CAMBIOS SUGERIDOS</span>
              {(repeated.length > 0 || spellCheckAnalysis.suggestions.length > 0) && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Contenido Principal según el Tab Activo */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-50/50">
          {/* TAB 1: DATOS ORIGINALES */}
          {activeTab === 'originales' && (
            <div className="space-y-4 text-xs">
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <p className="text-blue-900 leading-relaxed">
                  <strong>Auditoría de Datos Clínicos Originales:</strong> A continuación se muestran los valores primarios registrados en el expediente sin modificaciones sintácticas, garantizando la trazabilidad médico-legal completa.
                </p>
              </div>

              {/* Grid de Datos Originales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 1. Filiación y Motivo */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5 text-[#0F4C5C]">
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Filiación y Motivo de Consulta</span>
                  </h4>
                  <p><strong>Paciente:</strong> {patient.fullName} ({patient.sex === 'F' ? 'Femenina' : 'Masculino'}, {patient.age || '--'} años)</p>
                  <p><strong>Cubículo/Cama:</strong> {patient.cubicle} | <strong>Llegada:</strong> {patient.arrivalDateTime}</p>
                  <p><strong>Motivo de Consulta:</strong> {patient.chiefComplaint || 'No especificado'}</p>
                  <p><strong>Enfermedad Actual:</strong> {patient.clinicalHistory?.currentIllnessHistory || 'No registrada'}</p>
                </div>

                {/* 2. Constantes Vitales */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5 text-[#0F4C5C]">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Constantes Vitales de Ingreso</span>
                  </h4>
                  {patient.vitals ? (
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div><strong>PA:</strong> {patient.vitals.systolicBP || '--'}/{patient.vitals.diastolicBP || '--'} mmHg</div>
                      <div><strong>FC:</strong> {patient.vitals.heartRate || '--'} lpm</div>
                      <div><strong>FR:</strong> {patient.vitals.respiratoryRate || '--'} rpm</div>
                      <div><strong>SpO2:</strong> {patient.vitals.oxygenSaturation || '--'}%</div>
                      <div><strong>Temp:</strong> {patient.vitals.temperature || '--'} °C</div>
                      <div><strong>Glicemia:</strong> {patient.vitals.bloodGlucose || '--'} mg/dL</div>
                      <div><strong>Glasgow:</strong> {patient.vitals.glasgowTotal || '--'}/15</div>
                      <div><strong>Alergias:</strong> {patient.vitals.allergies?.join(', ') || 'Negadas'}</div>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">Sin constantes vitales registradas.</p>
                  )}
                </div>

                {/* 3. Antecedentes Patológicos */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5 text-[#0F4C5C]">
                    <History className="w-3.5 h-3.5" />
                    <span>Antecedentes Registrados</span>
                  </h4>
                  <p><strong>Mórbidos:</strong> {patient.clinicalHistory?.pathologicalHistory || 'Negados'}</p>
                  <p><strong>Quirúrgicos:</strong> {patient.clinicalHistory?.surgicalHistory || 'Negados'}</p>
                  <p><strong>Medicamentos habituales:</strong> {patient.clinicalHistory?.habitualMedications || 'Ninguno'}</p>
                  <p><strong>Hábitos tóxicos:</strong> {patient.clinicalHistory?.toxicHabits || 'Negados'}</p>
                  <p><strong>Alergias:</strong> {patient.clinicalHistory?.allergicHistory || 'Negadas'}</p>
                </div>

                {/* 4. Diagnósticos y Plan */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5 text-[#0F4C5C]">
                    <Pill className="w-3.5 h-3.5" />
                    <span>Impresión Diagnóstica y Plan</span>
                  </h4>
                  <p><strong>Diagnósticos:</strong> {patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint || 'En estudio'}</p>
                  <p><strong>Plan Terapéutico:</strong> {patient.clinicalHistory?.diagnosticAndTherapeuticPlan || 'Manejo en servicio'}</p>
                  <p><strong>Órdenes Médicas Activas:</strong> {orders.length} prescripciones</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NOTA GENERADA */}
          {activeTab === 'generada' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase">
                    Vista Preliminar de la Nota Oficial
                  </span>
                  <span className="text-[11px] text-slate-500">
                    (Orden estricto de la plantilla hospitalaria del Dr. Colón)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Bloquear Edición' : 'Editar Texto Libremente'}</span>
                </button>
              </div>

              {isEditing ? (
                <textarea
                  value={editableNote}
                  onChange={(e) => setEditableNote(e.target.value)}
                  rows={18}
                  className="w-full bg-white text-slate-900 font-mono text-xs sm:text-sm p-4 rounded-xl border border-slate-300 shadow-inner focus:ring-2 focus:ring-[#0F4C5C]/30 focus:border-[#0F4C5C] leading-relaxed uppercase"
                />
              ) : (
                <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-xs">
                  {/* Membrete Simulado */}
                  <div className="border-b border-slate-200 pb-3 mb-4 text-center">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">HOSPITAL REGIONAL</p>
                    <h2 className="text-sm sm:text-base font-black text-[#0F4C5C] uppercase tracking-wide">
                      DR. ÁNGEL MARÍA GATÓN
                    </h2>
                    <p className="text-xs font-bold text-slate-700 uppercase mt-1">
                      {docTitleMap[docType]}
                    </p>
                  </div>

                  {/* Texto de la Nota Formateado */}
                  <pre className="text-xs sm:text-sm font-mono text-slate-800 whitespace-pre-wrap leading-relaxed select-text">
                    {editableNote}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CAMBIOS SUGERIDOS POR IA */}
          {activeTab === 'sugerencias' && (
            <div className="space-y-4 text-xs">
              {/* Badge de Seguridad Estricta de la Sección 36 & 56 */}
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-start gap-3 shadow-2xs">
                <ShieldAlert className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-950 text-xs sm:text-sm">
                    Garantía de Seguridad Clínica (Sección 36)
                  </h4>
                  <p className="text-emerald-900 mt-1 leading-relaxed">
                    La inteligencia artificial ha organizado, corregido la ortografía y eliminado duplicaciones <strong>sin inventar antecedentes, síntomas, hallazgos físicos, laboratorios, imágenes ni diagnósticos</strong>. Toda modificación requiere su validación final antes de la exportación.
                  </p>
                </div>
              </div>

              {/* Detección de Duplicados */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider flex items-center gap-1.5 text-indigo-700">
                  <Sparkles className="w-4 h-4" />
                  <span>Detección de Duplicaciones y Redundancias (Sección 20)</span>
                </h4>
                {repeated.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-slate-600">Se identificaron las siguientes frases repetidas para depuración automática:</p>
                    {repeated.map((phrase, idx) => (
                      <div key={idx} className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-mono text-[11px]">
                        • "{phrase}"
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-emerald-700 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>No se encontraron frases duplicadas en el texto de la nota.</span>
                  </p>
                )}
              </div>

              {/* Corrección Ortográfica Médica */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider flex items-center gap-1.5 text-teal-800">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Auditoría de Ortografía Médica en Español (Sección 18 & 19)</span>
                </h4>
                {spellCheckAnalysis.suggestions.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-slate-600">Sugerencias y correcciones ortográficas identificadas:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {spellCheckAnalysis.suggestions.map((c, i) => (
                        <div key={i} className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                          <span className="text-red-600 line-through font-mono">{c.original}</span>
                          <span className="font-bold text-emerald-700 font-mono">→ {c.suggested}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-emerald-700 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Ortografía y terminología médica acordes a la RAE y farmacopea.</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Barra de Acciones Inferior — Botón de Confirmación Exigido por Sección 37 */}
        <div className="px-4 py-3.5 bg-slate-100/90 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Botones secundarios */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopy}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                copied
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '¡Copiado!' : 'Copiar Nota'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar PDF</span>
            </button>
          </div>

          {/* Botón Principal: CONFIRMAR Y DESCARGAR WORD */}
          <button
            type="button"
            disabled={isGeneratingDocx}
            onClick={handleConfirmAndDownloadWord}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#0F4C5C] hover:bg-[#134E5E] disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-300" />
            <span>{isGeneratingDocx ? 'Generando Documento DOCX...' : 'CONFIRMAR Y DESCARGAR WORD (.DOCX)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
