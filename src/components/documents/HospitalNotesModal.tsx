import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Copy, 
  Download, 
  Check, 
  X, 
  Building2, 
  Printer, 
  Pill, 
  Edit3, 
  Eye, 
  Sparkles,
  ChevronDown,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { Patient, MedicalOrder, LabResult, MedicalStudy } from '../../types';
import {
  generateEmergencyAdmissionNote,
  generateInternalMedicineWardAdmissionNote,
  generateIndividualMedicalOrder,
  downloadFileToPC,
} from '../../services/hospitalNoteGenerator';
import { 
  exportOfficialAdmissionNotePdf, 
  exportOfficialMedicalOrderPdf 
} from '../../services/pdfHospitalDocumentService';
import { 
  exportAdmissionNoteToWord, 
  exportMedicalOrderToWord, 
  exportClinicalHistoryToWord 
} from '../../services/wordExportService';
import { 
  generateEmergencyNoteDocx, 
  generateWardTransferNoteDocx, 
  generateMedicalOrderDocx 
} from '../../services/docxTemplateService';

export type HospitalDocType = 'emergencia' | 'sala' | 'orden' | 'historia';

interface Props {
  patient: Patient;
  orders: MedicalOrder[];
  labs: LabResult[];
  studies: MedicalStudy[];
  isOpen: boolean;
  onClose: () => void;
  initialDocType?: HospitalDocType;
}

export const HospitalNotesModal: React.FC<Props> = ({
  patient,
  orders,
  labs,
  studies,
  isOpen,
  onClose,
  initialDocType = 'emergencia',
}) => {
  const [docType, setDocType] = useState<HospitalDocType>(initialDocType);
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customText, setCustomText] = useState('');
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    return localStorage.getItem('hospital_custom_logo') || '/hospital_logo.jpg';
  });
  const [logoFeedback, setLogoFeedback] = useState(false);

  const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setLogoUrl(base64);
      localStorage.setItem('hospital_custom_logo', base64);
      window.dispatchEvent(new Event('storage'));
      setLogoFeedback(true);
      setTimeout(() => setLogoFeedback(false), 3000);
    };
    reader.readAsDataURL(file);
  };

  // Sincronizar docType inicial cuando se abre el modal
  useEffect(() => {
    if (initialDocType) {
      setDocType(initialDocType);
    }
    const current = localStorage.getItem('hospital_custom_logo') || '/hospital_logo.jpg';
    setLogoUrl(current);
  }, [initialDocType, isOpen]);

  // Generar contenido base según el tipo de documento seleccionado
  const getDefaultContent = (type: HospitalDocType): string => {
    switch (type) {
      case 'emergencia':
        return generateEmergencyAdmissionNote(patient, orders, labs, studies);
      case 'sala':
        return generateInternalMedicineWardAdmissionNote(patient, orders, labs, studies);
      case 'orden':
        return generateIndividualMedicalOrder(patient, orders);
      case 'historia':
        return `HISTORIA CLÍNICA Y EXAMEN FÍSICO COMPLETO\nHOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN\n\n` +
          `NOMBRE: ${patient.fullName.toUpperCase()}  EDAD: ${patient.age || '--'} AÑOS  CUBÍCULO: ${patient.cubicle}\n\n` +
          `MOTIVO DE CONSULTA:\n${patient.clinicalHistory?.reasonForConsultation || patient.chiefComplaint || 'Consulta médica'}\n\n` +
          `HISTORIA DE LA ENFERMEDAD ACTUAL:\n${patient.clinicalHistory?.currentIllnessHistory || 'No especificada'}\n\n` +
          `ANTECEDENTES MÓRBIDOS: ${patient.clinicalHistory?.pathologicalHistory || 'Negados'}\n` +
          `ANTECEDENTES QUIRÚRGICOS: ${patient.clinicalHistory?.surgicalHistory || 'Negados'}\n` +
          `ALERGIAS: ${patient.clinicalHistory?.allergicHistory || (patient.vitals?.allergies?.join(', ') || 'Negadas')}\n` +
          `MEDICAMENTOS HABITUALES: ${patient.clinicalHistory?.habitualMedications || 'Ninguno'}\n` +
          `HÁBITOS TÓXICOS: ${patient.clinicalHistory?.toxicHabits || 'Negados'}\n\n` +
          `EXAMEN FÍSICO:\n` +
          `General: ${patient.clinicalHistory?.physicalExam?.general || 'Normal'}\n` +
          `Cardiovascular: ${patient.clinicalHistory?.physicalExam?.cardiovascular || 'Normal'}\n` +
          `Respiratorio: ${patient.clinicalHistory?.physicalExam?.respiratory || 'Normal'}\n` +
          `Abdominal: ${patient.clinicalHistory?.physicalExam?.abdominal || 'Normal'}\n` +
          `Neurológico: ${patient.clinicalHistory?.physicalExam?.neurological || 'Normal'}\n` +
          `Extremidades: ${patient.clinicalHistory?.physicalExam?.extremities || 'Normal'}\n\n` +
          `IMPRESIÓN DIAGNÓSTICA:\n${patient.clinicalHistory?.clinicalImpression || 'En estudio'}\n\n` +
          `PLAN DIAGNÓSTICO Y TERAPÉUTICO:\n${patient.clinicalHistory?.diagnosticAndTherapeuticPlan || 'Manejo en sala'}`;
    }
  };

  // Actualizar el texto editable cuando cambia el tipo de documento
  useEffect(() => {
    setCustomText(getDefaultContent(docType));
    setIsEditing(false);
  }, [docType, patient, orders, labs, studies]);

  if (!isOpen) return null;

  const currentContent = customText || getDefaultContent(docType);

  // Copiar al portapapeles
  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Descargar archivo TXT
  const handleDownloadTxt = () => {
    const safeName = patient.fullName.replace(/\s+/g, '_');
    const safeDate = new Date().toISOString().slice(0, 10);
    const filenames: Record<HospitalDocType, string> = {
      emergencia: `Nota_Ingreso_Emergencia_${safeName}_${safeDate}.txt`,
      sala: `Nota_Recibimiento_Sala_${safeName}_${safeDate}.txt`,
      orden: `Orden_Medica_${safeName}_${safeDate}.txt`,
      historia: `Historia_Clinica_${safeName}_${safeDate}.txt`,
    };
    downloadFileToPC(filenames[docType], currentContent);
  };

  // Descargar PDF Oficial con formato del hospital
  const handleDownloadPdf = () => {
    if (docType === 'emergencia' || docType === 'sala') {
      exportOfficialAdmissionNotePdf(patient, orders, labs, studies, docType);
    } else if (docType === 'orden') {
      exportOfficialMedicalOrderPdf(patient, orders);
    } else {
      exportAdmissionNoteToWord(patient, orders, labs, studies, 'emergencia');
    }
  };

  // Descargar Word (.DOCX Oficial de Plantilla Real)
  const handleDownloadDocx = () => {
    if (docType === 'emergencia') {
      generateEmergencyNoteDocx(patient, orders, labs);
    } else if (docType === 'sala') {
      generateWardTransferNoteDocx(patient, orders, labs);
    } else if (docType === 'orden') {
      generateMedicalOrderDocx(patient, orders);
    } else {
      exportClinicalHistoryToWord(patient);
    }
  };

  // Descargar Word (.DOC alternativo)
  const handleDownloadDoc = () => {
    if (docType === 'orden') {
      exportMedicalOrderToWord(patient, orders);
    } else if (docType === 'historia') {
      exportClinicalHistoryToWord(patient);
    } else {
      exportAdmissionNoteToWord(patient, orders, labs, studies, docType);
    }
  };

  // Título e información de cabecera según el tipo
  const getDocHeaderTitle = () => {
    switch (docType) {
      case 'emergencia':
        return 'NOTA DE INGRESO EMERGENCIA';
      case 'sala':
        return 'NOTA DE RECIBIMIENTO';
      case 'orden':
        return 'ORDEN MEDICA';
      case 'historia':
        return 'HISTORIA CLÍNICA Y EXAMEN FÍSICO';
    }
  };

  const getDocPatientHeaderLine = () => {
    const d = new Date(patient.arrivalDateTime || Date.now());
    const dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (docType === 'emergencia') {
      return `NOMBRE: ${patient.fullName.toUpperCase()}. EDAD: ${patient.age || '--'} AÑOS, FECHA: ${dateStr} HORA: ${timeStr}`;
    } else if (docType === 'sala') {
      return `NOMBRE: ${patient.fullName.toUpperCase()}, EDAD:${patient.age || '--'} AÑOS, SALA: ${patient.cubicle}, FECHA INGRESO:${dateStr}. HORA: ${timeStr}`;
    } else if (docType === 'orden') {
      return `NOMBRE: ${patient.fullName.toUpperCase()} EDAD: ${patient.age || '--'} AÑOS, EMERGENCIA: CUB ${patient.cubicle}  FECHA: ${dateStr} HORA: ${timeStr}`;
    } else {
      return `NOMBRE: ${patient.fullName.toUpperCase()} | EDAD: ${patient.age || '--'} AÑOS | CUBÍCULO: ${patient.cubicle} | FECHA: ${dateStr}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] animate-fade-in">
        {/* Top Header */}
        <div className="bg-[#0F4C5C] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-teal-300" />
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Centro de Documentos Clínicos Hospitalarios
              </h3>
              <p className="text-xs text-teal-100/80">
                Hospital Regional Dr. Ángel María Gatón • Paciente: <strong className="text-white">{patient.fullName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menú Desplegable Selector de Notas */}
        <div className="bg-slate-100 border-b border-slate-200 p-3 sm:px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="select-note-type" className="text-xs font-bold uppercase tracking-wider text-slate-700 whitespace-nowrap">
              Seleccionar Nota:
            </label>
            <div className="relative flex-1 sm:w-80">
              <select
                id="select-note-type"
                value={docType}
                onChange={(e) => setDocType(e.target.value as HospitalDocType)}
                className="w-full bg-white text-slate-900 font-bold text-xs sm:text-sm py-2 px-3 pr-8 rounded-xl border border-slate-300 shadow-xs focus:ring-2 focus:ring-teal-600 focus:border-teal-600 appearance-none cursor-pointer"
              >
                <option value="emergencia">🚨 NOTA DE INGRESO EMERGENCIA</option>
                <option value="sala">🏥 NOTA DE RECIBIMIENTO EN SALA (MEDICINA INTERNA)</option>
                <option value="orden">💊 HOJA DE ORDEN MÉDICA OFICIAL (INDIVIDUAL)</option>
                <option value="historia">📝 HISTORIA CLÍNICA Y EXAMEN FÍSICO COMPLETO</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Toggle de Modo Edición y Cargar Logo Oficial */}
          <div className="flex flex-wrap items-center gap-2">
            <label
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-900 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Cargar o modificar el logo oficial del hospital para todas las notas y documentos"
            >
              <Upload className="w-3.5 h-3.5 text-sky-700" />
              <span>{logoFeedback ? '¡Logo Actualizado!' : 'Cargar Logo Hospital'}</span>
              <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
            </label>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                isEditing
                  ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
              title="Permite editar o ajustar el texto antes de generar el documento final"
            >
              {isEditing ? <Eye className="w-3.5 h-3.5 text-amber-700" /> : <Edit3 className="w-3.5 h-3.5 text-slate-600" />}
              <span>{isEditing ? 'Ver Formato Oficial' : 'Editar Texto de la Nota'}</span>
            </button>
          </div>
        </div>

        {/* Barra de Acciones de Descarga Oficial */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-2.5 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
              Descargas Oficiales:
            </span>
            {/* Descargar PDF Oficial */}
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-teal-800 hover:bg-teal-900 text-white transition-all shadow-sm active:scale-95"
              title="Descargar en PDF idéntico al formato oficial del Hospital Ángel María Gatón"
            >
              <Printer className="w-3.5 h-3.5 text-teal-200" />
              <span>Descargar PDF</span>
            </button>

            {/* Descargar Word (.DOCX Oficial) */}
            <button
              onClick={handleDownloadDocx}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#0F4C5C] hover:bg-petrol-800 text-white transition-all shadow-sm active:scale-95"
              title="Descargar plantilla real de Microsoft Word (.DOCX) conservando fuentes, márgenes y membrete"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-300" />
              <span>Plantilla Word (.DOCX)</span>
            </button>

            {/* Descargar Word (.DOC) */}
            <button
              onClick={handleDownloadDoc}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs active:scale-95 hidden md:inline-flex"
              title="Descargar en formato alternativo editable (.DOC)"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Word (.DOC)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors active:scale-95 shadow-xs"
              title="Copiar texto de la nota al portapapeles"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? '¡Copiado!' : 'Copiar'}</span>
            </button>

            <button
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors active:scale-95 shadow-xs"
              title="Descargar nota en archivo de texto plano (.txt)"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>TXT</span>
            </button>
          </div>
        </div>

        {/* Visor / Editor del Documento con Formato Oficial Hospitalario */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/80 flex justify-center">
          {isEditing ? (
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-md border border-amber-300 p-4 space-y-2 flex flex-col">
              <div className="flex items-center justify-between text-xs text-amber-800 pb-2 border-b border-amber-100">
                <span className="font-bold flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5" />
                  Modo Edición Manual — Realiza ajustes de texto antes de descargar:
                </span>
                <button
                  onClick={() => setCustomText(getDefaultContent(docType))}
                  className="text-[11px] text-red-600 hover:underline"
                >
                  Restablecer Original
                </button>
              </div>
              <textarea
                rows={18}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full flex-1 p-3 text-xs sm:text-sm font-sans leading-relaxed border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-900"
              />
            </div>
          ) : (
            /* Vista Hoja Impresa Oficial (WYSIWYG con Formato del Hospital) */
            <div className="w-full max-w-2xl bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 text-slate-900 text-xs sm:text-sm font-sans space-y-4">
              {/* Membrete Oficial con Logo Real */}
              <div className="flex flex-col items-center justify-center gap-2 pb-3 border-b border-slate-200">
                <img
                  src={logoUrl}
                  alt="Hospital Regional Dr. Ángel María Gatón"
                  className="max-h-16 max-w-[320px] object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/hospital_logo.jpg';
                  }}
                />
              </div>

              {/* Título de la Nota */}
              <h4 className="text-center font-black text-sm uppercase tracking-wider text-slate-900 pt-1">
                {getDocHeaderTitle()}
              </h4>

              {/* Fila de Datos de Filiación del Paciente */}
              <div className="font-bold text-[11px] sm:text-xs text-slate-900 border-b border-slate-100 pb-2.5">
                {getDocPatientHeaderLine()}
              </div>

              {/* Cuerpo del Documento */}
              <div className="leading-relaxed text-slate-900 text-xs sm:text-[13px] font-normal text-justify whitespace-pre-wrap">
                <pre className="font-sans whitespace-pre-wrap leading-relaxed text-justify text-slate-800 uppercase">
                  {currentContent.replace(/^(?:[\s\S]*?:HOSPITAL[\s\S]*?HORA:[^\n]+\n+)/, '')}
                </pre>
              </div>

              {/* Pie de Firma del Médico */}
              <div className="pt-8 text-center text-xs border-t border-slate-100 mt-6">
                <div className="w-48 mx-auto border-t border-slate-400 mb-1"></div>
                <p className="font-bold text-slate-900 uppercase">
                  {patient.attendingDoctor || 'DR. COLÓN'}
                </p>
                <p className="text-[11px] text-slate-500 uppercase">
                  MÉDICO TRATANTE • HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:px-5 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            Formato oficial estandarizado del Hospital Regional Dr. Ángel María Gatón
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
