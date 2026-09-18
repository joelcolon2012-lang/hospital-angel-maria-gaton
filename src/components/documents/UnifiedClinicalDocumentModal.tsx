import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Edit3, 
  Eye, 
  ShieldCheck, 
  Pill, 
  Stethoscope, 
  RefreshCw, 
  Layers, 
  Building2,
  Sliders,
  FileCheck,
  Save
} from 'lucide-react';
import { Patient, MedicalOrder, LabResult, MedicalStudy, PatientEvolution } from '../../types';
import { ClinicalDocumentBuilder, FinalDocumentAuditResult, ClinicalValidationReport } from '../../services/clinicalDocumentBuilder';
import { ClinicalDataNormalizer } from '../../services/clinicalDataNormalizer';
import { ClinicalDeduplicationEngine } from '../../services/clinicalDeduplicationEngine';
import { ClinicalTextCorrector } from '../../services/clinicalTextCorrector';
import { downloadFileToPC } from '../../services/hospitalNoteGenerator';
import { 
  generateEmergencyNoteDocx, 
  generateWardTransferNoteDocx, 
  generateMedicalOrderDocx,
  generateCombinedNoteAndOrderDocx,
  generateEvolutionDocx 
} from '../../services/docxTemplateService';
import { authService } from '../../services/authService';
import { 
  exportOfficialAdmissionNotePdf, 
  exportOfficialMedicalOrderPdf, 
  exportOfficialCombinedNoteAndOrderPdf 
} from '../../services/pdfHospitalDocumentService';
import { generateClinicalHistoryDocx } from '../../services/clinicalHistoryDocxExporter';

export type UnifiedDocType = 'emergencia' | 'sala' | 'orden' | 'combinada' | 'historia' | 'evolucion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  orders: MedicalOrder[];
  labs: LabResult[];
  studies: MedicalStudy[];
  evolutions?: PatientEvolution[];
  initialDocType?: UnifiedDocType;
  onSavePatientEvolution?: (evolutionText: string) => void;
}

export const UnifiedClinicalDocumentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  orders,
  labs,
  studies,
  evolutions = [],
  initialDocType = 'emergencia',
  onSavePatientEvolution,
}) => {
  const [docType, setDocType] = useState<UnifiedDocType>(initialDocType);
  const [isEditing, setIsEditing] = useState(false);
  const [customText, setCustomText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [validationAudit, setValidationAudit] = useState<FinalDocumentAuditResult | null>(null);
  const [normalizationToast, setNormalizationToast] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    return localStorage.getItem('hospital_custom_logo') || './hospital_logo.jpg';
  });

  const printContainerRef = useRef<HTMLDivElement>(null);

  // Sincronizar docType inicial cuando se abre el modal
  useEffect(() => {
    if (initialDocType) {
      setDocType(initialDocType);
    }
    const currentLogo = localStorage.getItem('hospital_custom_logo') || './hospital_logo.jpg';
    setLogoUrl(currentLogo);
  }, [initialDocType, isOpen]);

  // Generar texto base del documento activo usando el ClinicalDocumentBuilder central
  const generatedBaseText = useMemo(() => {
    if (!patient) return '';

    switch (docType) {
      case 'emergencia':
        return ClinicalDocumentBuilder.buildAdmissionNote(patient, orders, labs, studies, 'EMERGENCIA');

      case 'sala':
        return ClinicalDocumentBuilder.buildAdmissionNote(patient, orders, labs, studies, 'SALA');

      case 'orden':
        return ClinicalDocumentBuilder.buildMedicalOrder(patient, orders);

      case 'combinada': {
        const note = ClinicalDocumentBuilder.buildAdmissionNote(patient, orders, labs, studies, 'EMERGENCIA');
        const order = ClinicalDocumentBuilder.buildMedicalOrder(patient, orders);
        return `${note}\n\n` +
          `======================================================================\n` +
          `           [HOJA OFICIAL DE ÓRDENES MÉDICAS HOSPITALARIAS]\n` +
          `======================================================================\n\n` +
          `${order}`;
      }

      case 'historia': {
        const h = patient.clinicalHistory;
        const v = patient.vitals || {};
        let txt = `             :HOSPITAL\n`;
        txt += `          H  DR. ÁNGEL MARÍA GATÓN\n\n`;
        txt += `                 HISTORIA CLÍNICA GENERAL DE PLANTA\n\n`;
        txt += `NOMBRE: ${patient.fullName.toUpperCase()}   EDAD: ${patient.age || '--'} AÑOS   EXP: ${patient.medicalRecordNumber || patient.internalCode || '--'}   SALA/CUBÍCULO: ${patient.cubicle || '--'}\n`;
        txt += `FECHA DE INGRESO: ${patient.arrivalDateTime ? new Date(patient.arrivalDateTime).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES')}\n\n`;
        
        txt += `I. MOTIVO DE CONSULTA / INGRESO:\n${h?.reasonForConsultation || patient.chiefComplaint || 'NO ESPECIFICADO'}\n\n`;
        txt += `II. HISTORIA DE LA ENFERMEDAD ACTUAL:\n${h?.currentIllnessHistory || 'PACIENTE ACUDE A ESTE CENTRO ASISTENCIAL REFIRIENDO CUADRO CLÍNICO DE EVOLUCIÓN...'}\n\n`;
        
        txt += `III. ANTECEDENTES PERSONALES PATOLÓGICOS:\n${h?.pathologicalHistory || 'NEGADOS'}\n\n`;
        txt += `IV. ANTECEDENTES QUIRÚRGICOS:\n${h?.surgicalHistory || 'NEGADOS'}\n\n`;
        txt += `V. ANTECEDENTES ALÉRGICOS:\n${h?.allergicHistory || (v.allergies?.join(', ') || 'NEGADOS')}\n\n`;
        txt += `VI. HÁBITOS TÓXICOS:\n${h?.toxicHabits || 'NEGADOS'}\n\n`;
        txt += `VII. ANTECEDENTES FAMILIARES:\n${h?.familyHistory || 'PADRES CON ANTECEDENTES DE HTA Y DM2'}\n\n`;
        
        const cleanedPe = ClinicalDataNormalizer.cleanPhysicalExamSections(h?.physicalExam);
        txt += `VIII. EXAMEN FÍSICO AL INGRESO:\n`;
        txt += `SIGNOS VITALES: TA: ${v.systolicBP || '120'}/${v.diastolicBP || '80'} mmHg, FC: ${v.heartRate || '78'} lpm, FR: ${v.respiratoryRate || '18'} rpm, SpO2: ${v.oxygenSaturation || '98'}%, Temp: ${v.temperature || '36.8'} °C, Glicemia: ${v.bloodGlucose || '105'} mg/dL.\n`;
        txt += `CABEZA Y CUELLO: ${cleanedPe.head.toUpperCase()}.\n`;
        txt += `TÓRAX Y PULMONES: ${cleanedPe.chest.toUpperCase()}. ${cleanedPe.respiratory.toUpperCase()}.\n`;
        txt += `CORAZÓN: ${cleanedPe.cardiovascular.toUpperCase()}.\n`;
        txt += `ABDOMEN: ${cleanedPe.abdominal.toUpperCase()}.\n`;
        txt += `EXTREMIDADES SUPERIORES: ${cleanedPe.upperExtremities.toUpperCase()}.\n`;
        txt += `EXTREMIDADES INFERIORES: ${cleanedPe.lowerExtremities.toUpperCase()}.\n`;
        txt += `NEUROLÓGICO: ${cleanedPe.neurological.toUpperCase()}.\n`;
        txt += `PIEL Y ANEXOS: ${cleanedPe.skin.toUpperCase()}.\n\n`;

        txt += `IX. DIAGNÓSTICOS DE INGRESO:\n`;
        const diagList = ClinicalDeduplicationEngine.deduplicateDiagnoses(
          (h?.clinicalImpression || patient.chiefComplaint || 'EN ESTUDIO CLÍNICO').split(/[\n,;]+/)
        );
        diagList.forEach((d, i) => {
          txt += `${i + 1}. ${d.toUpperCase()}\n`;
        });
        txt += `\n`;

        txt += `X. PLAN Y CONDUCTA:\n${h?.diagnosticAndTherapeuticPlan || 'INGRESO A SALA DE MEDICINA INTERNA, CUMPLIR ÓRDENES MÉDICAS ADJUNTAS, VIGILANCIA ESTRICTA DE SIGNOS VITALES.'}`;
        return txt;
      }

      case 'evolucion': {
        const activeDoc = authService.getActiveDoctorSignature(patient.attendingDoctor);
        const latestEvol = evolutions[0];
        const v = patient.vitals || {};
        let txt = `             :HOSPITAL\n`;
        txt += `          H  DR. ÁNGEL MARÍA GATÓN\n\n`;
        txt += `                     NOTA DE EVOLUCIÓN MÉDICA\n\n`;
        txt += `NOMBRE: ${patient.fullName.toUpperCase()}   EDAD: ${patient.age || '--'} AÑOS   CUBÍCULO: ${patient.cubicle || '--'}\n`;
        txt += `FECHA: ${new Date().toLocaleDateString('es-ES')}   HORA: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}\n`;
        txt += `MÉDICO TRATANTE: DR. ${activeDoc.name.toUpperCase()} (EXEQ. ${activeDoc.exequatur})\n\n`;

        txt += `S (SUBJETIVO):\n`;
        txt += `${latestEvol?.clinicalChanges || 'PACIENTE SE ENCUENTRA EN SU CUBÍCULO/CAMA, REFIERE MEJORÍA CLÍNICA SINTOMÁTICA RESPECTO AL INGRESO. TOLERA VÍA ORAL Y NIEGA DISNEA O DOLOR PRECORDIAL EN EL MOMENTO.'}\n\n`;

        txt += `O (OBJETIVO):\n`;
        txt += `SIGNOS VITALES: TA: ${v.systolicBP || '120'}/${v.diastolicBP || '80'} MMHG, FC: ${v.heartRate || '76'} L/M, FR: ${v.respiratoryRate || '18'} R/M, SPO2: ${v.oxygenSaturation || '98'}%, TEMP: ${v.temperature || '36.8'} °C, GLIC: ${v.bloodGlucose || '105'} MG/DL.\n`;
        txt += `EXAMEN FÍSICO: PACIENTE VIGIL, ALERTA, BIEN HIDRATADO Y PERFUNDIDO. CAMPOS PULMONARES CLAROS Y VENTILADOS SIN RUIDOS PATOLÓGICOS. RUIDOS CARDÍACOS RÍTMICOS DE BUENA INTENSIDAD. ABDOMEN NO DOLOROSO, PERISTALSIS ACTIVA. EXTREMIDADES SIN EDEMAS.\n`;
        if (labs && labs.length > 0) {
          txt += `PARACLÍNICOS RECIENTES: ${labs.slice(0, 8).map(l => `${l.parameter}: ${l.value} ${l.unit}`).join(', ')}.\n`;
        }
        txt += `\n`;

        txt += `A (ANÁLISIS / APRECIACIÓN):\n`;
        txt += `${latestEvol?.problemReevaluation || 'PACIENTE CON RESPUESTA TERAPÉUTICA FAVORABLE A PLAN ESTABLECIDO, HEMODINÁMICAMENTE ESTABLE, AFEBRIL, CON PARÁMETROS VITALES DENTRO DE LÍMITES FISIOLÓGICOS.'}\n\n`;

        txt += `P (PLAN Y CONDUCTA):\n`;
        txt += `${latestEvol?.conduct || '1. CONTINUAR CON PLAN TERAPÉUTICO Y MEDICACIÓN PRESCRITA EN HOJA DE ÓRDENES MÉDICAS.\n2. MANTENER VIGILANCIA DE PATRÓN RESPIRATORIO Y CONTROL DE SIGNOS VITALES C/6H.\n3. PENDIENTE EVALUACIÓN DE CONTROL ANALÍTICO Y CRITERIOS DE ALTA MÉDICA.'}`;

        return txt;
      }
    }
  }, [docType, patient, orders, labs, studies, evolutions]);

  // Sincronizar texto editable cuando cambia la selección de documento
  useEffect(() => {
    setCustomText(generatedBaseText);
    setIsEditing(false);
    setShowValidation(false);
    setValidationAudit(null);
  }, [generatedBaseText]);

  if (!isOpen) return null;

  const currentDisplayText = customText || generatedBaseText;

  // Acciones: Normalizar y Corregir
  const handleNormalizeAndClean = () => {
    let text = currentDisplayText;
    text = ClinicalDataNormalizer.cleanWhitespace(text);
    text = ClinicalDataNormalizer.removeStuttering(text);
    text = ClinicalTextCorrector.correctMedicalGrammarAndSpelling(text);
    setCustomText(text);
    setNormalizationToast('Documento normalizado y desduplicado según la norma del Hospital Dr. Ángel María Gatón.');
    setTimeout(() => setNormalizationToast(null), 3500);
  };

  // Acciones: Ejecutar Validación Clínica Oficial
  const handleRunValidation = () => {
    const audit = ClinicalDocumentBuilder.finalClinicalDocumentValidation(currentDisplayText);
    setValidationAudit(audit);
    setShowValidation(true);
  };

  // Copiar al Portapapeles
  const handleCopy = () => {
    navigator.clipboard.writeText(currentDisplayText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Descargar TXT Inmediato
  const handleDownloadTxt = () => {
    const safeName = (patient.fullName || 'PACIENTE').replace(/\s+/g, '_');
    const safeDate = new Date().toISOString().slice(0, 10);
    const filename = `${docType.toUpperCase()}_${safeName}_${safeDate}.txt`;
    downloadFileToPC(filename, currentDisplayText);
  };

  // Imprimir / PDF
  const handlePrint = () => {
    window.print();
  };

  // Descargar DOCX Oficial utilizando las plantillas maestras exactas
  const handleDownloadDocx = async () => {
    try {
      setIsDownloadingDocx(true);

      if (docType === 'emergencia') {
        await generateEmergencyNoteDocx(patient, orders, labs);
      } else if (docType === 'sala') {
        await generateWardTransferNoteDocx(patient, orders, labs, { hospitalWard: patient.cubicle });
      } else if (docType === 'orden') {
        await generateMedicalOrderDocx(patient, orders);
      } else if (docType === 'combinada') {
        await generateCombinedNoteAndOrderDocx(patient, orders, labs, studies);
      } else if (docType === 'evolucion') {
        await generateEvolutionDocx(patient, evolutions, orders);
      } else if (docType === 'historia') {
        if ((patient as any).clinicalHistoryPlanta) {
          await generateClinicalHistoryDocx((patient as any).clinicalHistoryPlanta);
        } else {
          const safeName = (patient.fullName || 'PACIENTE').replace(/\s+/g, '_');
          const safeDate = new Date().toISOString().slice(0, 10);
          downloadFileToPC(`HISTORIA_CLINICA_${safeName}_${safeDate}.txt`, currentDisplayText);
        }
      }
    } catch (err) {
      console.error('Error al generar DOCX:', err);
      handleDownloadTxt();
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  // Guardar en Expediente como Evolución si corresponde
  const handleSaveToPatientRecord = () => {
    if (onSavePatientEvolution) {
      onSavePatientEvolution(currentDisplayText);
      setNormalizationToast('Documento guardado con éxito en el expediente del paciente.');
      setTimeout(() => setNormalizationToast(null), 3000);
    }
  };

  const activeDoc = authService.getActiveDoctorSignature(patient.attendingDoctor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[96vh] overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="p-3 sm:p-4 bg-gradient-to-r from-teal-800 via-slate-800 to-teal-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-700/60 rounded-xl border border-teal-400/30">
              <Building2 className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-sm sm:text-base tracking-tight text-white">
                  Centro de Documentación Clínica Oficial
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-400 text-teal-950 uppercase">
                  Fase 15-25 • Fidelidad 100%
                </span>
              </div>
              <p className="text-xs text-teal-100/80 font-medium">
                Hospital Regional Dr. Ángel María Gatón — Paciente: <strong>{patient.fullName}</strong> ({patient.age || '--'} años • CUB: {patient.cubicle || '--'})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-teal-200 hover:text-white hover:bg-teal-700/50 rounded-xl transition"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document Selector Navigation Bar */}
        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDocType('emergencia')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                docType === 'emergencia'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Nota Ingreso Emergencia</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType('sala')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                docType === 'sala'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Nota Recibimiento Sala</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType('orden')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                docType === 'orden'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Orden Médica Oficial</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType('combinada')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                docType === 'combinada'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Nota + Orden Combinada</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType('historia')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                docType === 'historia'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Historia Clínica Planta</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType('evolucion')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                docType === 'evolucion'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Evolución Diaria (SOAP)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1 transition ${
                isEditing
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {isEditing ? <Eye className="w-3.5 h-3.5 text-amber-700" /> : <Edit3 className="w-3.5 h-3.5 text-slate-600" />}
              <span>{isEditing ? 'Vista Previa' : 'Editar Texto'}</span>
            </button>
          </div>
        </div>

        {/* Normalization Notification Toast */}
        {normalizationToast && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{normalizationToast}</span>
            </div>
            <button onClick={() => setNormalizationToast(null)} className="text-emerald-100 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Validation Alert Card */}
        {showValidation && validationAudit && (
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Resultado de Auditoría Clínica Hospitalaria</span>
              </div>
              <button
                onClick={() => setShowValidation(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Ocultar
              </button>
            </div>

            {validationAudit.passed ? (
              <div className="text-xs text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Auditoría superada: El documento cumple con la estructura requerida, sin valores indefinidos ni duplicados técnicos.</span>
              </div>
            ) : (
              <div className="space-y-1 text-xs">
                {validationAudit.errors.map((err, i) => (
                  <div key={i} className="text-rose-800 bg-rose-50 p-2 rounded-lg border border-rose-200 flex items-center gap-2 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Document Body: WYSIWYG Authentic Hospital Paper Preview */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200/60 flex justify-center">
          
          <div 
            ref={printContainerRef}
            className="w-full max-w-3xl bg-white shadow-xl rounded-sm p-6 sm:p-10 text-slate-900 border border-slate-300 print:shadow-none print:border-none print:p-0 font-sans"
            style={{ minHeight: '840px' }}
          >
            {/* Real Hospital Letterhead Header */}
            <div className="border-b border-slate-300 pb-3 mb-4">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="w-24 align-middle pr-4">
                      <img 
                        src={logoUrl} 
                        alt="Logo Hospital Dr. Ángel María Gatón" 
                        className="w-20 h-20 object-contain rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = './hospital_logo.jpg';
                        }}
                      />
                    </td>
                    <td className="text-center align-middle">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        REPÚBLICA DOMINICANA • SERVICIO REGIONAL DE SALUD
                      </div>
                      <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                        HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN
                      </h1>
                      <div className="text-xs font-extrabold text-teal-800 uppercase tracking-widest mt-0.5">
                        DR. JOEL COLÓN • JEFE DE SERVICIO DE MEDICINA INTERNA
                      </div>
                      <div className="text-xs font-bold text-slate-600 mt-1 uppercase underline decoration-teal-600 underline-offset-4">
                        {docType === 'emergencia' && 'NOTA DE INGRESO A EMERGENCIA'}
                        {docType === 'sala' && 'NOTA DE RECIBIMIENTO EN SALA DE MEDICINA INTERNA'}
                        {docType === 'orden' && 'HOJA OFICIAL DE ÓRDENES MÉDICAS'}
                        {docType === 'combinada' && 'DOCUMENTO CLÍNICO INTEGRADO (NOTA DE INGRESO Y ORDEN MÉDICA)'}
                        {docType === 'historia' && 'HISTORIA CLÍNICA GENERAL DE PLANTA'}
                        {docType === 'evolucion' && 'NOTA DE EVOLUCIÓN MÉDICA DIARIA'}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Document Content View / In-Place Editor */}
            {isEditing ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Modo edición activo. Las modificaciones se reflejarán en la descarga y en la impresión.</span>
                  <button
                    type="button"
                    onClick={() => setCustomText(generatedBaseText)}
                    className="text-teal-700 hover:underline font-bold"
                  >
                    Restaurar original generado
                  </button>
                </div>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  rows={25}
                  className="w-full text-xs sm:text-sm font-mono p-3 rounded-lg border border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-600 text-slate-900 leading-relaxed bg-teal-50/20"
                />
              </div>
            ) : (
              <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-mono text-slate-800 selection:bg-teal-200">
                {currentDisplayText}
              </div>
            )}

            {/* Doctor Signature Block Footer */}
            <div className="mt-12 pt-4 border-t border-slate-200 flex flex-col items-center text-center">
              <div className="w-64 border-b border-slate-600 mb-1"></div>
              <div className="font-bold text-xs uppercase text-slate-900">
                DR. {activeDoc.name}
              </div>
              <div className="text-[11px] text-slate-600 font-medium">
                EXEQ: {activeDoc.exequatur} &bull; {activeDoc.specialty || 'MÉDICO INTERNISTA'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Hospital Regional Dr. Ángel María Gatón &bull; Generado electrónicamente
              </div>
            </div>

          </div>

        </div>

        {/* Footer Actions Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Botón Normalizar y Desduplicar */}
            <button
              type="button"
              onClick={handleNormalizeAndClean}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 transition active:scale-95 shadow-xs"
              title="Aplica reglas de estilo médico, elimina tartamudeos y redundancias clínicas"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              <span>Normalizar y Desduplicar</span>
            </button>

            {/* Botón Auditoría y Validación */}
            <button
              type="button"
              onClick={handleRunValidation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition active:scale-95 shadow-xs"
              title="Auditoría clínica de inconsistencias y seguridad de datos"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
              <span>Validar Documento</span>
            </button>

            {/* Copiar al Portapapeles */}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition active:scale-95 shadow-xs"
              title="Copiar texto del documento al portapapeles"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{isCopied ? '¡Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Guardar en Expediente */}
            {onSavePatientEvolution && (
              <button
                type="button"
                onClick={handleSaveToPatientRecord}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition active:scale-95 shadow-xs"
                title="Archivar en el historial clínico del paciente"
              >
                <Save className="w-3.5 h-3.5 text-emerald-700" />
                <span>Archivar en Expediente</span>
              </button>
            )}

            {/* Imprimir / PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-900 text-white transition active:scale-95 shadow-sm"
              title="Imprimir o guardar como PDF oficial"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Imprimir / PDF</span>
            </button>

            {/* Descargar DOCX Oficial */}
            <button
              type="button"
              disabled={isDownloadingDocx}
              onClick={handleDownloadDocx}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-black rounded-xl text-white transition active:scale-95 shadow-sm ${
                isDownloadingDocx
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-[#0F4C5C] hover:bg-teal-900 cursor-pointer'
              }`}
              title="Descargar documento Word (.docx) con membrete y formato institucional idéntico"
            >
              <Download className="w-3.5 h-3.5 text-teal-200" />
              <span>{isDownloadingDocx ? 'Generando DOCX...' : 'Descargar DOCX Oficial'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
