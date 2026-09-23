import React from 'react';
import { X, FileDown, FileText, Printer } from 'lucide-react';
import { ClinicalHistoryPlanta } from '../../types';
import { generateClinicalHistoryDocx } from '../../services/clinicalHistoryDocxExporter';
import { generateClinicalHistoryPdf } from '../../services/clinicalHistoryPdfExporter';
import { printOfficialHospitalDocument } from '../../services/directPrintService';
import { authService } from '../../services/authService';

interface WysiwygPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ClinicalHistoryPlanta;
}

export const WysiwygPreviewModal: React.FC<WysiwygPreviewModalProps> = ({
  isOpen,
  onClose,
  history
}) => {
  if (!isOpen) return null;

  const activeDoc = authService.getActiveDoctorSignature();

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-300 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header bar */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="text-sm font-bold">Vista Previa Impresa (WYSIWYG)</h3>
              <p className="text-[11px] text-slate-400">
                Hospital Regional Dr. Ángel María Gatón &bull; Plantilla Institucional Maestra
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => generateClinicalHistoryDocx(history)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Descargar en formato Word editable manteniendo la plantilla"
            >
              <FileDown className="w-4 h-4" /> Word .DOCX
            </button>
            <button
              onClick={() => generateClinicalHistoryPdf(history)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Descargar en PDF para impresión oficial"
            >
              <FileDown className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={() => {
                const element = document.getElementById('wysiwyg-paper-content');
                if (element) {
                  printOfficialHospitalDocument({
                    content: element.innerText,
                    docType: 'historia',
                    patient: { fullName: history.generalData.nombre, age: parseInt(history.generalData.edad) || 0 } as any,
                  });
                } else {
                  window.print();
                }
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              title="Imprimir directamente en formato oficial sin descargas"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 flex justify-center">
          <div id="wysiwyg-paper-content" className="bg-white w-full max-w-3xl shadow-xl rounded-sm p-10 md:p-14 text-slate-900 border border-slate-200 font-sans leading-relaxed text-[13px]">
            
            {/* Official Hospital Header */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <img 
                  src="./hospital_logo.jpg" 
                  alt="Hospital Logo" 
                  className="h-14 object-contain"
                  onError={(e) => {
                    // Fallback visual header if image fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <h1 className="text-lg font-bold tracking-wide uppercase text-slate-900 underline decoration-1 underline-offset-4">
                HISTORIA CLÍNICA
              </h1>
            </div>

            {/* 1. DATOS GENERALES */}
            <div className="mb-5">
              <h2 className="text-sm font-bold uppercase underline decoration-1 underline-offset-2 mb-2 text-slate-900">
                DATOS GENERALES
              </h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                <div><span className="font-bold">NOMBRE:</span> {history.generalData.nombre}</div>
                <div><span className="font-bold">ESTADO CIVIL:</span> {history.generalData.estadoCivil}</div>
                <div><span className="font-bold">EDAD:</span> {history.generalData.edad}</div>
                <div><span className="font-bold">RAZA:</span> {history.generalData.raza}</div>
                <div><span className="font-bold">SEXO:</span> {history.generalData.sexo}</div>
                <div><span className="font-bold">RELIGIÓN:</span> {history.generalData.religion}</div>
                <div><span className="font-bold">ESCOLARIDAD:</span> {history.generalData.escolaridad}</div>
                <div><span className="font-bold">SALA:</span> {history.generalData.sala}</div>
                <div><span className="font-bold">FUENTE:</span> {history.generalData.fuente}</div>
                <div><span className="font-bold">FECHA INGRESO:</span> {history.generalData.fechaIngreso}</div>
                <div><span className="font-bold">HORA:</span> {history.generalData.hora}</div>
                <div><span className="font-bold">PROCEDENCIA:</span> {history.generalData.procedencia}</div>
              </div>
            </div>

            {/* 2. MOTIVOS DE CONSULTA */}
            <div className="mb-5">
              <h2 className="text-sm font-bold uppercase underline decoration-1 underline-offset-2 mb-1 text-slate-900">
                MOTIVOS DE CONSULTA:
              </h2>
              <div className="text-xs space-y-0.5">
                {history.chiefComplaints && history.chiefComplaints.length > 0 ? (
                  history.chiefComplaints.map((c, i) => <p key={i}>{c.toUpperCase()}</p>)
                ) : (
                  <p>NO REGISTRADO</p>
                )}
              </div>
            </div>

            {/* 3. HISTORIA DE LA ENFERMEDAD ACTUAL */}
            <div className="mb-5">
              <h2 className="text-sm font-bold uppercase underline decoration-1 underline-offset-2 mb-1 text-slate-900">
                HISTORIA DE LA ENFERMEDAD ACTUAL:
              </h2>
              <p className="text-xs text-justify leading-relaxed">
                {history.presentIllness || 'PENDIENTE DE EVALUACIÓN.'}
              </p>
            </div>

            {/* 4. ANTECEDENTES PERSONALES PATOLÓGICOS */}
            <div className="mb-5">
              <h2 className="text-sm font-bold uppercase underline decoration-1 underline-offset-2 mb-1.5 text-slate-900">
                ANTECEDENTES PERSONALES PATOLÓGICOS:
              </h2>
              <div className="text-xs space-y-1">
                <div><span className="font-bold">NIÑEZ:</span> {history.pathologicalHistory.childhood}</div>
                <div><span className="font-bold">ADOLESCENCIA:</span> {history.pathologicalHistory.adolescence}</div>
                <div><span className="font-bold">ADULTEZ:</span> {history.pathologicalHistory.adulthood}</div>
                <div><span className="font-bold">ANTECEDENTES HOSPITALARIOS:</span> {history.pathologicalHistory.hospitalizations}</div>
                <div><span className="font-bold">ANTECEDENTES QUIRÚRGICOS:</span> {history.pathologicalHistory.surgeries}</div>
                <div><span className="font-bold">ANTECEDENTES TRAUMÁTICOS:</span> {history.pathologicalHistory.trauma}</div>
                <div><span className="font-bold">TRANFUSIONALES:</span> {history.pathologicalHistory.transfusions}</div>
                <div><span className="font-bold">ANTECEDENTES ALÉRGICOS:</span> {history.pathologicalHistory.allergies}</div>
                <div>
                  <span className="font-bold">ANTECEDENTES MEDICAMENTOSOS:</span>{' '}
                  {history.pathologicalHistory.medications && history.pathologicalHistory.medications.length > 0
                    ? history.pathologicalHistory.medications.map(m => `${m.name} ${m.dose} ${m.unit} ${m.route} ${m.frequency}`).join(', ')
                    : 'NEGADOS.'}
                </div>
              </div>
            </div>

            {/* 5. ANTECEDENTES PERSONALES NO PATOLÓGICOS */}
            <div className="mb-5">
              <h2 className="text-sm font-bold uppercase underline decoration-1 underline-offset-2 mb-1.5 text-slate-900">
                ANTECEDENTES PERSONALES NO PATOLÓGICOS:
              </h2>
              <div className="text-xs space-y-1">
                <div>
                  <span className="font-bold">TABACO:</span>{' '}
                  {history.nonPathologicalHistory.tobacco.consumes
                    ? `${history.nonPathologicalHistory.tobacco.cigarettesPerDay} CIGARRILLOS AL DÍA DURANTE ${history.nonPathologicalHistory.tobacco.yearsSmoking} AÑOS PARA UN IPA DE ${history.nonPathologicalHistory.tobacco.packYears}.`
                    : 'NEGADO.'}
                </div>
                <div><span className="font-bold">CAFÉ:</span> {history.nonPathologicalHistory.coffee}</div>
                <div><span className="font-bold">ALCOHOL:</span> {history.nonPathologicalHistory.alcohol}</div>
                <div><span className="font-bold">DROGAS ILÍCITAS:</span> {history.nonPathologicalHistory.illicitDrugs}</div>
                <div><span className="font-bold">TÉ:</span> {history.nonPathologicalHistory.tea}</div>
                <div><span className="font-bold">TRABAJOS ANTERIORES:</span> {history.nonPathologicalHistory.previousJobs}</div>
                <div><span className="font-bold">EXPOSICIÓN A TÓXICOS:</span> {history.nonPathologicalHistory.toxicExposure}</div>
              </div>
            </div>

            {/* 6. ANTECEDENTES PERSONALES HEREDOFAMILIARES */}
            <div className="mb-5">
              <h2 className="text-sm font-bold uppercase underline decoration-1 underline-offset-2 mb-1.5 text-slate-900">
                ANTECEDENTES PERSONALES HEREDOFAMILIARES:
              </h2>
              <div className="text-xs space-y-1">
                <div><span className="font-bold">PADRE:</span> {history.familyHistory.father.alive ? `VIVO, ${history.familyHistory.father.morbidities}` : `FALLECIDO, CAUSA: ${history.familyHistory.father.causeOfDeath}`}</div>
                <div><span className="font-bold">MADRE:</span> {history.familyHistory.mother.alive ? `VIVA, ${history.familyHistory.mother.morbidities}` : `FALLECIDA, CAUSA: ${history.familyHistory.mother.causeOfDeath}`}</div>
                <div><span className="font-bold">HERMANOS:</span> {history.familyHistory.siblings.count} HERMANOS. {history.familyHistory.siblings.details}</div>
                <div><span className="font-bold">HIJOS:</span> {history.familyHistory.children.count} HIJOS. {history.familyHistory.children.details}</div>
              </div>
            </div>

            {/* 7. ESFERA PSICOSOCIAL */}
            <div className="mb-5">
              <h2 className="text-sm font-bold uppercase underline decoration-1 underline-offset-2 mb-1.5 text-slate-900">
                ESFERA PSICOSOCIAL:
              </h2>
              <div className="text-xs space-y-1">
                <div><span className="font-bold">INGRESOS MENSUALES AL HOGAR:</span> {history.psychosocialHistory.monthlyIncome}</div>
                <div>
                  <span className="font-bold">VIVIENDA:</span>{' '}
                  {history.psychosocialHistory.narrativeText || `VIVIENDA ${history.psychosocialHistory.housing.housingType}, TECHO DE ${history.psychosocialHistory.housing.roofMaterial}, PISO DE ${history.psychosocialHistory.housing.floorMaterial}.`}
                </div>
              </div>
            </div>

            {/* 8. REVISIÓN POR SISTEMAS */}
            <div className="mb-5">
              <h2 className="text-sm font-bold uppercase underline decoration-1 underline-offset-2 mb-1.5 text-slate-900">
                REVISIÓN POR SISTEMAS:
              </h2>
              <div className="text-xs space-y-1">
                <div><span className="font-bold">CARDIOVASCULAR:</span> {history.reviewOfSystems.cardiovascular.status === 'NORMAL' ? 'SIN PATOLOGÍAS REFERIDAS.' : history.reviewOfSystems.cardiovascular.notes}</div>
                <div><span className="font-bold">PULMONAR:</span> {history.reviewOfSystems.pulmonary.status === 'NORMAL' ? 'SIN PATOLOGÍAS REFERIDAS.' : history.reviewOfSystems.pulmonary.notes}</div>
                <div><span className="font-bold">GASTROINTESTINAL:</span> {history.reviewOfSystems.gastrointestinal.status === 'NORMAL' ? 'SIN PATOLOGÍAS REFERIDAS.' : history.reviewOfSystems.gastrointestinal.notes}</div>
                <div><span className="font-bold">GENITOURINARIO:</span> {history.reviewOfSystems.genitourinary.status === 'NORMAL' ? 'SIN PATOLOGÍAS REFERIDAS.' : history.reviewOfSystems.genitourinary.notes}</div>
                <div><span className="font-bold">ENDOCRINOMETABÓLICO:</span> {history.reviewOfSystems.endocrinometabolic.status === 'NORMAL' ? 'SIN PATOLOGÍAS REFERIDAS.' : history.reviewOfSystems.endocrinometabolic.notes}</div>
                <div><span className="font-bold">NEUROSENSORIAL:</span> {history.reviewOfSystems.neurosensory.status === 'NORMAL' ? 'SIN PATOLOGÍAS REFERIDAS.' : history.reviewOfSystems.neurosensory.notes}</div>
                <div><span className="font-bold">MUSCULOESQUELÉTICO:</span> {history.reviewOfSystems.musculoskeletal.status === 'NORMAL' ? 'SIN PATOLOGÍAS REFERIDAS.' : history.reviewOfSystems.musculoskeletal.notes}</div>
                <div><span className="font-bold">HEMATOLÓGICO:</span> {history.reviewOfSystems.hematologic.status === 'NORMAL' ? 'SIN PATOLOGÍAS REFERIDAS.' : history.reviewOfSystems.hematologic.notes}</div>
              </div>
            </div>

            {/* 9. EXAMEN FÍSICO / ESTADO GENERAL */}
            <div className="mb-5">
              <h2 className="text-sm font-bold uppercase underline decoration-1 underline-offset-2 mb-1.5 text-slate-900">
                EXAMEN FÍSICO
              </h2>
              <div className="text-xs space-y-1">
                <div><span className="font-bold">ESTADO GENERAL:</span> {history.generalStatus.generalStatusSummary}</div>
                <div className="my-1.5 bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="font-bold">SIGNOS VITALES:</span> TA: {history.vitalSigns.systolicBP || '--'}/{history.vitalSigns.diastolicBP || '--'} MMHG, FC: {history.vitalSigns.heartRate || '--'} L/M, FR: {history.vitalSigns.respiratoryRate || '--'} R/M, TEMP: {history.vitalSigns.temperature || '--'} °C, SPO2: {history.vitalSigns.oxygenSaturation || '--'}% {history.vitalSigns.bmi ? `, IMC: ${history.vitalSigns.bmi} KG/M²` : ''}.
                </div>
                <div><span className="font-bold">CABEZA:</span> {history.physicalExam.head}</div>
                <div><span className="font-bold">OJOS:</span> {history.physicalExam.eyes}</div>
                <div><span className="font-bold">OÍDOS:</span> {history.physicalExam.ears}</div>
                <div><span className="font-bold">NARIZ:</span> {history.physicalExam.nose}</div>
                <div><span className="font-bold">BOCA:</span> {history.physicalExam.mouth}</div>
                <div><span className="font-bold">CUELLO:</span> {history.physicalExam.neck}</div>
                <div><span className="font-bold">TÓRAX:</span> {history.physicalExam.thorax}</div>
                <div><span className="font-bold">PULMONES:</span> {history.physicalExam.lungs}</div>
                <div><span className="font-bold">CORAZÓN:</span> {history.physicalExam.heart}</div>
                <div><span className="font-bold">ABDOMEN:</span> {history.physicalExam.abdomen}</div>
                <div><span className="font-bold">GENITALES EXTERNOS:</span> {history.physicalExam.externalGenitals}</div>
                <div><span className="font-bold">PIEL Y ANEXOS:</span> {history.physicalExam.skin}</div>
                <div><span className="font-bold">EXTREMIDADES SUPERIORES:</span> {history.physicalExam.upperExtremities}</div>
                <div><span className="font-bold">EXTREMIDADES INFERIORES:</span> {history.physicalExam.lowerExtremities}</div>
                <div>
                  <span className="font-bold">NEUROLÓGICO:</span>{' '}
                  {history.neurologicalExam?.narrativeText || history.physicalExam.neurological}
                </div>
              </div>
            </div>

            {/* 10. DIAGNÓSTICOS */}
            <div className="mb-10">
              <h2 className="text-sm font-bold uppercase underline decoration-1 underline-offset-2 mb-1.5 text-slate-900">
                DIAGNÓSTICO
              </h2>
              <div className="text-xs space-y-0.5">
                {history.diagnoses && history.diagnoses.length > 0 ? (
                  history.diagnoses.map((d, i) => (
                    <p key={d.id} className="font-semibold text-slate-900">
                      {i + 1}. {d.name.toUpperCase()}
                    </p>
                  ))
                ) : (
                  <p>1. DIAGNÓSTICO EN ESTUDIO</p>
                )}
              </div>
            </div>

            {/* Firma médica */}
            <div className="text-center pt-8 border-t border-slate-200 mt-12">
              <div className="w-56 h-0.5 bg-slate-400 mx-auto mb-2"></div>
              <p className="text-xs font-bold text-slate-900 uppercase">{activeDoc.name}</p>
              <p className="text-[11px] text-slate-500">{activeDoc.exequatur} &bull; {activeDoc.specialty || 'MEDICINA INTERNA'}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
