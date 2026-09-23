import React, { useState } from 'react';
import { MedicalOrder, OrderType, OrderStatus, Patient } from '../../types';
import { checkAllergyConflict, AllergyConflict } from '../../services/allergyChecker';
import { getTherapeuticDiscussion, DrugDiscussion } from '../../services/therapeuticDiscussionService';
import {
  Plus,
  Pill,
  AlertTriangle,
  Check,
  X,
  ShieldAlert,
  BookOpen,
  Save,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  Trash2,
  RefreshCw,
  Pencil,
  Sparkles,
  Copy,
  Search,
  Activity,
  FlaskConical,
  Image as ImageIcon,
  Settings2,
} from 'lucide-react';
import { downloadFileToPC, generateIndividualMedicalOrder } from '../../services/hospitalNoteGenerator';
import { MedicalOrderPrintModal } from '../documents/MedicalOrderPrintModal';
import { DuplicateOrderModal } from '../orders/DuplicateOrderModal';
import { TherapeuticDiscussionModal } from '../orders/TherapeuticDiscussionModal';

export interface PreloadedMedication {
  name: string;
  type: OrderType;
  dose: string;
  route: string;
  frequency: string;
  indication: string;
}

export const PRELOADED_DIET_OPTIONS = [
  'DIETA CORRIENTE',
  'DIETA HIPOSÓDICA',
  'DIETA DIABÉTICA / HIPOGLUCÍDICA',
  'DIETA BLANDA',
  'DIETA LÍQUIDA CLARA',
  'DIETA HIPOPROTEICA',
  'DIETA HIPOGRASA',
  'DIETA ASTRINGENTE',
  'NPO (NADA POR VÍA ORAL)',
  'DIETA POR SONDA NASOGÁSTRICA',
  'DIETA RENAL',
];

export const PRELOADED_POSITION_OPTIONS = [
  'POSICION SEMI FOWLER',
  'POSICION FOWLER A 45°',
  'CABECERA ELEVADA A 30°',
  'DECÚBITO LATERAL IZQUIERDO',
  'DECÚBITO LATERAL DERECHO',
  'DECÚBITO SUPINO / DORSAL',
  'POSICIÓN DE TRENDELENBURG',
];

export const PRELOADED_CARE_OPTIONS = [
  'MONITORIZACIÓN DE SIGNOS VITALES CADA 6 HORAS',
  'MONITORIZACIÓN DE SIGNOS VITALES CADA 4 HORAS',
  'MONITORIZACIÓN DE SIGNOS VITALES CADA 2 HORAS',
  'MONITORIZACIÓN CONTINUA DE CONSTANTES VITALES',
  'BARANDAS EN ALTO',
  'OXIGENOTERAPIA: SOS SI SPO2 < 92% (CÁNULA NASAL A 2-3 L/MIN)',
  'OXIGENOTERAPIA: MASCARILLA CON RESERVORIO A 10-15 L/MIN',
  'BALANCE HÍDRICO ESTRICTO Y CONTROL DE DIURESIS HORARIA',
  'GLICEMIAS CAPILARES PREPRANDIALES (C/6H)',
  'VIGILANCIA ESTRICTA DE PATRÓN RESPIRATORIO Y SIGNOS DE ALARMA',
  'CURVA TÉRMICA Y VIGILANCIA DE SANGRADO',
];

export const PRELOADED_PARACLINICS_OPTIONS = [
  'HEMOGRAMA',
  'TIPIFICACION',
  'UREA',
  'CREATININA',
  'BUN',
  'ELECTROLITOS',
  'PROTEINA TOTALES',
  'PERFIL LIPIDICO',
  'AMILASA',
  'LIPASA',
  'TGO (AST)',
  'TGP (ALT)',
  'ALBUMINA',
  'EXAMEN DE ORINA',
  'RADIOGRAFIA DE TORAX',
  'TP',
  'TPT',
  'INR',
  'GASOMETRIA ARTERIAL',
  'TROPONINAS',
  'CPK / CPK-MB',
  'DIMERO D',
  'PROCERCALCITONINA / PCR',
  'HIV',
  'HEP B',
  'HEP C',
  'VDRL',
  'ÁCIDO ÚRICO',
  'CALCIO, MAGNESIO, FÓSFORO',
  'HEMOGLOBINA GLICOSILADA (HbA1c)',
  'UROCULTIVO',
  'HEMOCULTIVOS (2 SETS)',
  'COPROCULTIVO',
];

export const STANDARD_HOSPITAL_PARACLINICS = [
  'HEMOGRAMA',
  'TIPIFICACION',
  'UREA',
  'CREATININA',
  'BUN',
  'ELECTROLITOS',
  'PROTEINA TOTALES',
  'PERFIL LIPIDICO',
  'AMILASA',
  'LIPASA',
  'HIV',
  'HEP B',
  'HEP C',
  'VDRL',
  'ALBUMINA',
  'EXAMEN DE ORINA',
  'RADIOGRAFIA DE TORAX',
  'TP',
  'TPT',
  'INR',
];

export const PRELOADED_IMAGING_OPTIONS = [
  'RADIOGRAFÍA DE TÓRAX (PA / AP)',
  'RADIOGRAFÍA DE ABDOMEN SIMPLE (DE PIE Y DECÚBITO)',
  'TOMOGRAFÍA AXIAL COMPUTARIZADA (TAC) DE CRÁNEO SIMPLE',
  'TOMOGRAFÍA AXIAL COMPUTARIZADA (TAC) DE CRÁNEO CONTRASTADA',
  'ANGIOTAC DE CRÁNEO Y CUELLO',
  'TOMOGRAFÍA DE TÓRAX DE ALTA RESOLUCIÓN (TACAR)',
  'TOMOGRAFÍA ABDOMINOPÉLVICA CONTRASTADA',
  'ELECTROCARDIOGRAMA (EKG DE 12 DERIVACIONES)',
  'ECOGRAFÍA ABDOMINAL COMPLETA',
  'ECOGRAFÍA RENAL Y VESICAL',
  'ECOCARDIOGRAMA TRANSTORÁCICO',
  'ECO-DOPPLER VASCULAR DE MIEMBROS INFERIORES',
  'RESONANCIA MAGNÉTICA (RMN) DE CRÁNEO',
  'ENDOSCOPIA DIGESTIVA ALTA (EDA)',
  'COLONOSCOPIA',
];

export const PRELOADED_HOSPITAL_MEDICATIONS: PreloadedMedication[] = [
  // Soluciones y Cristaloides
  { name: 'Solución Salina al 0.9%', type: 'Solución', dose: '1,000 mL', route: 'Intravenosa', frequency: 'Cada 24 horas', indication: 'Hidratación parenteral y vía venosa permeable' },
  { name: 'Solución Salina al 0.9%', type: 'Solución', dose: '2,000 mL', route: 'Intravenosa', frequency: 'Cada 24 horas', indication: 'Hidratación de mantenimiento y perfusión hemodinámica' },
  { name: 'Lactato de Ringer (Hartmann)', type: 'Solución', dose: '1,000 mL', route: 'Intravenosa', frequency: 'Cada 24 horas', indication: 'Reposición hidroelectrolítica y balance de fluidos' },
  { name: 'Dextrosa al 5% en Agua', type: 'Solución', dose: '1,000 mL', route: 'Intravenosa', frequency: 'Cada 24 horas', indication: 'Aporte hidrocalórico y mantenimiento' },
  { name: 'Dextrosa al 5% en Solución Salina al 0.9% (Mixta)', type: 'Solución', dose: '1,000 mL', route: 'Intravenosa', frequency: 'Cada 24 horas', indication: 'Mantenimiento hidroelectrolítico y calórico' },

  // Gastroprotectores y Antieméticos
  { name: 'Omeprazol', type: 'Medicamento', dose: '40 mg', route: 'Intravenosa', frequency: 'Cada 24 horas', indication: 'Gastroprotección en paciente hospitalizado' },
  { name: 'Pantoprazol', type: 'Medicamento', dose: '40 mg', route: 'Intravenosa', frequency: 'Cada 24 horas', indication: 'Profilaxis de úlceras por estrés / Gastroprotección' },
  { name: 'Ondansetrón', type: 'Medicamento', dose: '8 mg', route: 'Intravenosa', frequency: 'Cada 8 horas', indication: 'Antiemético / Control de náuseas y vómitos' },
  { name: 'Metoclopramida', type: 'Medicamento', dose: '10 mg', route: 'Intravenosa', frequency: 'Cada 8 horas', indication: 'Antiemético y procinético gastrointestinal' },

  // Cardiovasculares y Antihipertensivos
  { name: 'Labetalol', type: 'Medicamento', dose: '20 mg', route: 'Intravenosa', frequency: 'SOS si TAD ≥ 110 mmHg', indication: 'Control de crisis hipertensiva en emergencia / EVC' },
  { name: 'Labetalol', type: 'Medicamento', dose: '100 mg', route: 'Vía Oral', frequency: 'Cada 12 horas', indication: 'Control tensional continuo hospitalario' },
  { name: 'Amlodipino', type: 'Medicamento', dose: '5 mg', route: 'Vía Oral', frequency: 'Cada 24 horas', indication: 'Manejo de hipertensión arterial esencial' },
  { name: 'Amlodipino', type: 'Medicamento', dose: '10 mg', route: 'Vía Oral', frequency: 'Cada 24 horas', indication: 'Hipertensión arterial estadio 2' },
  { name: 'Losartán', type: 'Medicamento', dose: '50 mg', route: 'Vía Oral', frequency: 'Cada 12 horas', indication: 'Control de presión arterial e insuficiencia cardíaca' },
  { name: 'Enalapril', type: 'Medicamento', dose: '10 mg', route: 'Vía Oral', frequency: 'Cada 12 horas', indication: 'Antihipertensivo / Bloqueo del SRAA' },
  { name: 'Enalaprilato', type: 'Medicamento', dose: '1.25 mg', route: 'Intravenosa', frequency: 'Cada 6 horas', indication: 'Urgencia hipertensiva en paciente internado' },
  { name: 'Furosemida', type: 'Medicamento', dose: '20 mg', route: 'Intravenosa', frequency: 'Cada 12 horas', indication: 'Diurético de asa / Control de volemia' },
  { name: 'Furosemida', type: 'Medicamento', dose: '40 mg', route: 'Intravenosa', frequency: 'Cada 8 horas', indication: 'Sobrecarga de volumen / Insuficiencia cardíaca aguda' },
  { name: 'Espironolactona', type: 'Medicamento', dose: '25 mg', route: 'Vía Oral', frequency: 'Cada 24 horas', indication: 'Antagonista de aldosterona / Insuficiencia cardíaca' },
  { name: 'Carvedilol', type: 'Medicamento', dose: '6.25 mg', route: 'Vía Oral', frequency: 'Cada 12 horas', indication: 'Betabloqueador / Cardiopatía isquémica' },

  // Antitrombóticos y Anticoagulantes
  { name: 'Ácido Acetilsalicílico (Aspirina)', type: 'Medicamento', dose: '81 mg', route: 'Vía Oral', frequency: 'Cada 24 horas', indication: 'Antiagregación plaquetaria secundaria' },
  { name: 'Ácido Acetilsalicílico (Aspirina)', type: 'Medicamento', dose: '300 mg', route: 'Vía Oral', frequency: 'Dosis de carga inmediata', indication: 'Antiagregación de ataque en SCA / EVC isquémico' },
  { name: 'Clopidogrel', type: 'Medicamento', dose: '75 mg', route: 'Vía Oral', frequency: 'Cada 24 horas', indication: 'Antiagregación plaquetaria / Prevención vascular' },
  { name: 'Clopidogrel', type: 'Medicamento', dose: '300 mg', route: 'Vía Oral', frequency: 'Dosis de carga inmediata', indication: 'Dosis de ataque en SCA' },
  { name: 'Atorvastatina', type: 'Medicamento', dose: '40 mg', route: 'Vía Oral', frequency: 'Cada 24 horas', indication: 'Estabilización de placa ateromatosa y prevención vascular' },
  { name: 'Atorvastatina', type: 'Medicamento', dose: '80 mg', route: 'Vía Oral', frequency: 'Cada 24 horas', indication: 'Estatina de alta potencia en SCA o EVC isquémico' },
  { name: 'Enoxaparina', type: 'Medicamento', dose: '40 mg', route: 'Subcutánea', frequency: 'Cada 24 horas', indication: 'Profilaxis tromboembólica venosa' },
  { name: 'Enoxaparina', type: 'Medicamento', dose: '1 mg/kg', route: 'Subcutánea', frequency: 'Cada 12 horas', indication: 'Anticoagulación terapéutica plena en SCA/TEP' },
  { name: 'Heparina Sódica', type: 'Medicamento', dose: '5,000 UI', route: 'Subcutánea', frequency: 'Cada 8 horas', indication: 'Tromboprofilaxis hospitalaria' },

  // Antibióticos
  { name: 'Ceftriaxona', type: 'Medicamento', dose: '1 g', route: 'Intravenosa', frequency: 'Cada 12 horas', indication: 'Antibioticoterapia de amplio espectro' },
  { name: 'Ceftriaxona', type: 'Medicamento', dose: '2 g', route: 'Intravenosa', frequency: 'Cada 24 horas', indication: 'Infección bacteriana grave / Neumonía / Meningitis' },
  { name: 'Ciprofloxacina', type: 'Medicamento', dose: '400 mg', route: 'Intravenosa', frequency: 'Cada 12 horas', indication: 'Infección urinaria complicada / Cobertura gram-negativos' },
  { name: 'Levofloxacina', type: 'Medicamento', dose: '750 mg', route: 'Intravenosa', frequency: 'Cada 24 horas', indication: 'Neumonía adquirida en la comunidad / Infección grave' },
  { name: 'Ampicilina / Sulbactam', type: 'Medicamento', dose: '1.5 g', route: 'Intravenosa', frequency: 'Cada 6 horas', indication: 'Infección mixta respiratoria / intraabdominal' },
  { name: 'Piperacilina / Tazobactam', type: 'Medicamento', dose: '4.5 g', route: 'Intravenosa', frequency: 'Cada 8 horas', indication: 'Sepsis nosocomial / Cobertura pseudomonas' },
  { name: 'Meropenem', type: 'Medicamento', dose: '1 g', route: 'Intravenosa', frequency: 'Cada 8 horas', indication: 'Infección severa por patógenos multirresistentes' },
  { name: 'Vancomicina', type: 'Medicamento', dose: '1 g', route: 'Intravenosa', frequency: 'Cada 12 horas', indication: 'Infección por estafilococo meticilino-resistente (SAMR)' },
  { name: 'Metronidazol', type: 'Medicamento', dose: '500 mg', route: 'Intravenosa', frequency: 'Cada 8 horas', indication: 'Cobertura anaerobia / Infección intraabdominal' },

  // Analgésicos y Antiinflamatorios
  { name: 'Paracetamol (Acetaminofén)', type: 'Medicamento', dose: '1 g', route: 'Intravenosa', frequency: 'Cada 8 horas', indication: 'Analgesia y control de temperatura' },
  { name: 'Paracetamol (Acetaminofén)', type: 'Medicamento', dose: '500 mg', route: 'Vía Oral', frequency: 'Cada 8 horas', indication: 'Dolor leve a moderado / Antipirético' },
  { name: 'Ketorolaco', type: 'Medicamento', dose: '30 mg', route: 'Intravenosa', frequency: 'Cada 8 horas', indication: 'Analgesia en dolor agudo moderado a severo' },
  { name: 'Dexketoprofeno', type: 'Medicamento', dose: '50 mg', route: 'Intravenosa', frequency: 'Cada 8 horas', indication: 'Dolor agudo musculoesquelético / Cólico' },
  { name: 'Tramadol', type: 'Medicamento', dose: '50 mg', route: 'Intravenosa', frequency: 'Cada 8 horas', indication: 'Dolor moderado a severo (infusión lenta diluida)' },
  { name: 'Morfina', type: 'Medicamento', dose: '2 a 4 mg', route: 'Intravenosa', frequency: 'SOS si EVA ≥ 7/10', indication: 'Dolor isquémico coronario / Dolor severo' },

  // Endocrino y Respiratorio
  { name: 'Insulina Rápida (Regular)', type: 'Medicamento', dose: 'Según escala móvil', route: 'Subcutánea', frequency: 'SOS si Glicemia ≥ 180 mg/dL', indication: 'Corrección de hiperglicemia hospitalaria' },
  { name: 'Insulina NPH', type: 'Medicamento', dose: 'Dosis según requerimiento', route: 'Subcutánea', frequency: 'Cada 12 horas', indication: 'Mantenimiento basal de glucosa' },
  { name: 'Salbutamol', type: 'Medicamento', dose: '2.5 mg', route: 'Inhalatoria', frequency: 'Cada 6 horas', indication: 'Broncodilatación en crisis obstructiva' },
  { name: 'Bromuro de Ipratropio', type: 'Medicamento', dose: '0.5 mg', route: 'Inhalatoria', frequency: 'Cada 6 horas', indication: 'Broncodilatador anticolinérgico inhalado' },
  { name: 'Hidrocortisona', type: 'Medicamento', dose: '100 mg', route: 'Intravenosa', frequency: 'Cada 8 horas', indication: 'Corticoterapia sistémica / Crisis bronquial / Shock' },
  { name: 'Metilprednisolona', type: 'Medicamento', dose: '40 mg', route: 'Intravenosa', frequency: 'Cada 12 horas', indication: 'Antiinflamatorio esteroideo en exacerbación respiratoria' },
];

interface Props {
  patient: Patient;
  orders: MedicalOrder[];
  onAddOrder: (order: Partial<MedicalOrder>) => void;
  onEditOrder?: (orderId: string, order: Partial<MedicalOrder>) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onDeleteOrder: (orderId: string) => void;
  onUpdatePatient?: (updatedData: Partial<Patient>) => void;
}

export const MedicalOrdersTab: React.FC<Props> = ({
  patient,
  orders,
  onAddOrder,
  onEditOrder,
  onUpdateOrderStatus,
  onDeleteOrder,
  onUpdatePatient,
}) => {
  const patientAllergies = patient.vitals?.allergies || [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isTherapeuticDiscussionModalOpen, setIsTherapeuticDiscussionModalOpen] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [expandedDiscussion, setExpandedDiscussion] = useState<Record<string, boolean>>({});

  // 1. MEDIDAS GENERALES STATE
  const initialMeasures = patient.generalMeasures || 'MEDIDAS GENERALES: DIETA CORRIENTE, POSICION SEMI FOWLER, MONITORIZACIÓN DE SIGNOS VITALES CADA 6 HORAS, BARANDAS EN ALTO.';
  const [generalMeasuresText, setGeneralMeasuresText] = useState(initialMeasures);
  const [isMeasuresSectionOpen, setIsMeasuresSectionOpen] = useState(true);
  const [measuresFeedback, setMeasuresFeedback] = useState(false);

  // 2. PARACLÍNICOS STATE
  const initialParaclinics = patient.requestedParaclinics && patient.requestedParaclinics.length > 0
    ? patient.requestedParaclinics
    : STANDARD_HOSPITAL_PARACLINICS;
  const [selectedParaclinics, setSelectedParaclinics] = useState<string[]>(initialParaclinics);
  const [isParaclinicsDropdownOpen, setIsParaclinicsDropdownOpen] = useState(false);
  const [paraclinicsSearch, setParaclinicsSearch] = useState('');
  const [customParaclinicInput, setCustomParaclinicInput] = useState('');
  const [paraclinicsFeedback, setParaclinicsFeedback] = useState(false);

  // 3. IMÁGENES STATE
  const initialImaging = patient.requestedImaging || [];
  const [selectedImaging, setSelectedImaging] = useState<string[]>(initialImaging);
  const [isImagingDropdownOpen, setIsImagingDropdownOpen] = useState(false);
  const [imagingSearch, setImagingSearch] = useState('');
  const [customImagingInput, setCustomImagingInput] = useState('');
  const [imagingFeedback, setImagingFeedback] = useState(false);

  const [formData, setFormData] = useState({
    type: 'Medicamento' as OrderType,
    name: '',
    dose: '',
    route: 'Intravenosa',
    frequency: 'Cada 8 horas',
    indication: '',
    notes: '',
    overrideReason: '',
  });

  const [activeConflict, setActiveConflict] = useState<AllergyConflict | null>(null);
  const [activeDiscussion, setActiveDiscussion] = useState<DrugDiscussion | null>(null);

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({ ...prev, name }));
    const conflict = checkAllergyConflict(patientAllergies, name);
    setActiveConflict(conflict);
    const disc = getTherapeuticDiscussion(name);
    setActiveDiscussion(disc);
  };

  const toggleDiscussion = (orderId: string) => {
    setExpandedDiscussion((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleSaveAndDownload = () => {
    const filename = `Ordenes_Medicas_${patient.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    const content = generateIndividualMedicalOrder(patient, orders);
    downloadFileToPC(filename, content);

    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  // Cargar / Actualizar con Orden Diaria Anterior
  const handleLoadPreviousDailyOrder = () => {
    if (orders && orders.length > 0) {
      // Si el paciente ya tiene órdenes previas, replicarlas para el nuevo pase de visita incrementando el día de tratamiento
      orders.forEach((ord) => {
        onAddOrder({
          patientId: patient.id,
          type: ord.type,
          name: ord.name,
          presentation: ord.presentation,
          dose: ord.dose,
          route: ord.route,
          frequency: ord.frequency,
          indication: ord.indication,
          specialInstructions: ord.specialInstructions,
          treatmentDay: (ord.treatmentDay || 1) + 1,
          status: 'Indicada',
          startTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
          createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        });
      });
      alert('¡Órdenes médicas del día anterior actualizadas! Se incrementó el día de tratamiento de los fármacos en curso. Puedes añadir o eliminar medicamentos según la evolución.');
      return;
    }

    const defaultHospitalOrders: Partial<MedicalOrder>[] = [
      {
        patientId: patient.id,
        type: 'Solución',
        name: 'Solución Salina al 0.9%',
        dose: '2,000 mL',
        route: 'EV',
        frequency: 'C/24 horas',
        indication: 'Hidratación y mantenimiento hemodinámico',
        status: 'Indicada',
      },
      {
        patientId: patient.id,
        type: 'Medicamento',
        name: 'Omeprazol',
        dose: '40 mg',
        route: 'EV',
        frequency: 'C/24 horas',
        indication: 'Gastroprotección',
        status: 'Indicada',
      },
      {
        patientId: patient.id,
        type: 'Medicamento',
        name: 'Labetalol',
        dose: '20 mg',
        route: 'EV',
        frequency: 'SOS si TAD ≥ 110 mmHg',
        indication: 'Control de crisis hipertensiva',
        status: 'Indicada',
      },
      {
        patientId: patient.id,
        type: 'Medicamento',
        name: 'Ácido Acetilsalicílico',
        dose: '81 mg',
        route: 'VO',
        frequency: 'C/24 horas',
        indication: 'Antiagregación plaquetaria',
        status: 'Indicada',
      },
      {
        patientId: patient.id,
        type: 'Medicamento',
        name: 'Atorvastatina',
        dose: '40 mg',
        route: 'VO',
        frequency: 'C/24 horas',
        indication: 'Estabilización de placa y prevención vascular',
        status: 'Indicada',
      },
      {
        patientId: patient.id,
        type: 'Medicamento',
        name: 'Enoxaparina',
        dose: '40 mg',
        route: 'SC',
        frequency: 'C/24 horas',
        indication: 'Profilaxis tromboembólica',
        status: 'Indicada',
      },
      {
        patientId: patient.id,
        type: 'Medicamento',
        name: 'Insulina Rápida',
        dose: 'Por esquema',
        route: 'SC',
        frequency: 'SOS si Glicemia ≥ 180 mg/dL',
        indication: 'Control glicémico estricto',
        status: 'Indicada',
      },
    ];

    defaultHospitalOrders.forEach((ord) => {
      onAddOrder({
        ...ord,
        treatmentDay: 1,
        startTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      });
    });
  };

  // Eliminar todas las órdenes
  const handleClearAllOrders = () => {
    if (confirm('¿Estás seguro de que deseas eliminar todas las órdenes actuales de este paciente?')) {
      orders.forEach((o) => onDeleteOrder(o.id));
    }
  };

  // Editar orden existente
  const handleStartEditOrder = (ord: MedicalOrder) => {
    setEditingOrderId(ord.id);
    setFormData({
      type: ord.type,
      name: ord.name,
      dose: ord.dose || '',
      route: ord.route || 'Intravenosa',
      frequency: ord.frequency || 'Cada 8 horas',
      indication: ord.indication || '',
      notes: ord.notes || '',
      overrideReason: ord.allergyOverrideReason || '',
    });
    handleNameChange(ord.name);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (activeConflict && !formData.overrideReason.trim()) {
      alert('¡ALERTA DE SEGURIDAD! Para prescribir un fármaco con potencial alérgico debes ingresar la justificación médica.');
      return;
    }

    if (editingOrderId && onEditOrder) {
      onEditOrder(editingOrderId, {
        type: formData.type,
        name: formData.name,
        dose: formData.dose,
        route: formData.route,
        frequency: formData.frequency,
        indication: formData.indication,
        notes: formData.notes,
        allergyWarningIgnored: activeConflict ? true : false,
        allergyOverrideReason: formData.overrideReason,
      });
    } else {
      onAddOrder({
        patientId: patient.id,
        type: formData.type,
        name: formData.name,
        dose: formData.dose,
        route: formData.route,
        frequency: formData.frequency,
        indication: formData.indication,
        notes: formData.notes,
        allergyWarningIgnored: activeConflict ? true : false,
        allergyOverrideReason: formData.overrideReason,
        status: 'Indicada',
        startTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      });
    }

    setIsModalOpen(false);
    setEditingOrderId(null);
    setFormData({
      type: 'Medicamento',
      name: '',
      dose: '',
      route: 'Intravenosa',
      frequency: 'Cada 8 horas',
      indication: '',
      notes: '',
      overrideReason: '',
    });
    setActiveConflict(null);
    setActiveDiscussion(null);
  };

  // Helper to persist patient configuration
  const persistPatientConfig = (updated: Partial<Patient>) => {
    if (onUpdatePatient) {
      onUpdatePatient(updated);
    }
  };

  const handleSaveGeneralMeasures = (textToSave?: string) => {
    const text = textToSave !== undefined ? textToSave : generalMeasuresText;
    setGeneralMeasuresText(text);
    persistPatientConfig({ generalMeasures: text });
    setMeasuresFeedback(true);
    setTimeout(() => setMeasuresFeedback(false), 2000);
  };

  const handleApplyDietOption = (diet: string) => {
    let current = generalMeasuresText;
    if (/DIETA\s+[^,]+/i.test(current)) {
      current = current.replace(/DIETA\s+[^,]+/i, diet);
    } else {
      current = `MEDIDAS GENERALES: ${diet}, ${current.replace(/^MEDIDAS GENERALES:\s*/i, '')}`;
    }
    setGeneralMeasuresText(current);
    handleSaveGeneralMeasures(current);
  };

  const handleApplyPositionOption = (pos: string) => {
    let current = generalMeasuresText;
    if (/POSICION\s+[^,]+|POSICIÓN\s+[^,]+|CABECERA\s+[^,]+|DECÚBITO\s+[^,]+|TRENDELENBURG/i.test(current)) {
      current = current.replace(/POSICION\s+[^,]+|POSICIÓN\s+[^,]+|CABECERA\s+[^,]+|DECÚBITO\s+[^,]+|TRENDELENBURG/i, pos);
    } else {
      current = `${current.trim().replace(/\.?$/, '')}, ${pos}.`;
    }
    setGeneralMeasuresText(current);
    handleSaveGeneralMeasures(current);
  };

  const handleToggleCareOption = (care: string) => {
    let current = generalMeasuresText;
    const careUpper = care.toUpperCase();
    if (current.toUpperCase().includes(careUpper)) {
      current = current.replace(new RegExp(`,?\\s*${careUpper}`, 'i'), '');
    } else {
      current = `${current.trim().replace(/\.?$/, '')}, ${care}.`;
    }
    current = current.replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ');
    setGeneralMeasuresText(current);
    handleSaveGeneralMeasures(current);
  };

  const handleToggleParaclinic = (test: string) => {
    const testUpper = test.toUpperCase().trim();
    let updated: string[];
    if (selectedParaclinics.includes(testUpper)) {
      updated = selectedParaclinics.filter((p) => p !== testUpper);
    } else {
      updated = [...selectedParaclinics, testUpper];
    }
    setSelectedParaclinics(updated);
    persistPatientConfig({ requestedParaclinics: updated });
    setParaclinicsFeedback(true);
    setTimeout(() => setParaclinicsFeedback(false), 1500);
  };

  const handleSelectAllHospitalParaclinics = () => {
    setSelectedParaclinics(STANDARD_HOSPITAL_PARACLINICS);
    persistPatientConfig({ requestedParaclinics: STANDARD_HOSPITAL_PARACLINICS });
    setParaclinicsFeedback(true);
    setTimeout(() => setParaclinicsFeedback(false), 2000);
  };

  const handleClearParaclinics = () => {
    setSelectedParaclinics([]);
    persistPatientConfig({ requestedParaclinics: [] });
  };

  const handleAddCustomParaclinic = () => {
    if (!customParaclinicInput.trim()) return;
    const item = customParaclinicInput.trim().toUpperCase();
    if (!selectedParaclinics.includes(item)) {
      const updated = [...selectedParaclinics, item];
      setSelectedParaclinics(updated);
      persistPatientConfig({ requestedParaclinics: updated });
    }
    setCustomParaclinicInput('');
  };

  const handleToggleImaging = (study: string) => {
    const studyUpper = study.toUpperCase().trim();
    let updated: string[];
    if (selectedImaging.includes(studyUpper)) {
      updated = selectedImaging.filter((s) => s !== studyUpper);
    } else {
      updated = [...selectedImaging, studyUpper];
    }
    setSelectedImaging(updated);
    persistPatientConfig({ requestedImaging: updated });
    setImagingFeedback(true);
    setTimeout(() => setImagingFeedback(false), 1500);
  };

  const handleClearImaging = () => {
    setSelectedImaging([]);
    persistPatientConfig({ requestedImaging: [] });
  };

  const handleAddCustomImaging = () => {
    if (!customImagingInput.trim()) return;
    const item = customImagingInput.trim().toUpperCase();
    if (!selectedImaging.includes(item)) {
      const updated = [...selectedImaging, item];
      setSelectedImaging(updated);
      persistPatientConfig({ requestedImaging: updated });
    }
    setCustomImagingInput('');
  };

  const filteredParaclinics = PRELOADED_PARACLINICS_OPTIONS.filter((p) =>
    p.toLowerCase().includes(paraclinicsSearch.toLowerCase())
  );

  const filteredImaging = PRELOADED_IMAGING_OPTIONS.filter((i) =>
    i.toLowerCase().includes(imagingSearch.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Top Action Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <Pill className="w-4 h-4 text-teal-700" />
          <span>Apartado: <strong>Órdenes Médicas y Farmacoterapia</strong></span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* DUPLICAR ORDEN ANTERIOR */}
          <button
            type="button"
            onClick={() => setIsDuplicateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl bg-teal-700 hover:bg-teal-800 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Copia y duplica la orden anterior en una nueva orden con incremento automático de días de tratamiento y antibióticos"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-300" />
            <span>DUPLICAR ORDEN ANTERIOR</span>
          </button>

          {/* DISCUSIÓN TERAPÉUTICA CON IA (Sección 30, 31, 32, 33) */}
          <button
            type="button"
            onClick={() => setIsTherapeuticDiscussionModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Genera discusión terapéutica oficial anclada en el Diagnóstico #1 y las órdenes activas"
          >
            <BookOpen className="w-3.5 h-3.5 text-teal-700" />
            <span>Discusión Terapéutica IA</span>
          </button>

          {/* Cargar / Actualizar con Orden Anterior */}
          <button
            type="button"
            onClick={handleLoadPreviousDailyOrder}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 transition-all active:scale-95 shadow-sm"
            title="Carga la pauta de orden diaria hospitalaria para modificar, agregar o eliminar rápidamente"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-700" />
            <span>Actualizar Rápido</span>
          </button>

          {/* Eliminar Todas las Órdenes */}
          {orders.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllOrders}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-all active:scale-95 shadow-sm"
              title="Eliminar todas las órdenes médicas del paciente"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Eliminar Todas</span>
            </button>
          )}

          {/* Print/Download Hospital Format Modal */}
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition-all active:scale-95 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-700" />
            <span>Formato Oficial Hospital</span>
          </button>

          {/* Quick Save & Auto-Download */}
          <button
            type="button"
            onClick={handleSaveAndDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#0F4C5C] hover:bg-petrol-800 text-white transition-all active:scale-95 shadow-sm"
            title="Guarda las órdenes y genera la descarga inmediata del archivo en tu PC"
          >
            {savedFeedback ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
            {savedFeedback ? '¡Guardado y Descargado!' : 'Guardar y Descargar en PC'}
          </button>

          <button
            onClick={() => {
              setEditingOrderId(null);
              setFormData({
                type: 'Medicamento',
                name: '',
                dose: '',
                route: 'Intravenosa',
                frequency: 'Cada 8 horas',
                indication: '',
                notes: '',
                overrideReason: '',
              });
              setActiveConflict(null);
              setActiveDiscussion(null);
              setIsModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Orden</span>
          </button>
        </div>
      </div>

      {/* 1. SECCIÓN: MEDIDAS GENERALES */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div
          onClick={() => setIsMeasuresSectionOpen(!isMeasuresSectionOpen)}
          className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-700" />
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wide">
              1. Medidas Generales (Dietas, Posición y Monitorización)
            </h3>
            {measuresFeedback && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" /> ¡Guardado!
              </span>
            )}
          </div>
          <button type="button" className="text-slate-400 hover:text-slate-600">
            {isMeasuresSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {isMeasuresSectionOpen && (
          <div className="p-4 space-y-3.5">
            {/* Opciones Rápidas Preestablecidas */}
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  🥗 Dietas Preestablecidas (Haz clic para aplicar):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRELOADED_DIET_OPTIONS.map((diet, idx) => (
                    <button
                      key={`diet-${idx}`}
                      type="button"
                      onClick={() => handleApplyDietOption(diet)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
                        generalMeasuresText.toUpperCase().includes(diet)
                          ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-teal-50 hover:border-teal-300'
                      }`}
                    >
                      {diet}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  🛏️ Posición Preestablecida:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRELOADED_POSITION_OPTIONS.map((pos, idx) => (
                    <button
                      key={`pos-${idx}`}
                      type="button"
                      onClick={() => handleApplyPositionOption(pos)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
                        generalMeasuresText.toUpperCase().includes(pos)
                          ? 'bg-sky-700 text-white border-sky-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-sky-50 hover:border-sky-300'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  🩺 Cuidados y Monitorización Hospitalaria:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRELOADED_CARE_OPTIONS.map((care, idx) => {
                    const isSelected = generalMeasuresText.toUpperCase().includes(care.toUpperCase());
                    return (
                      <button
                        key={`care-${idx}`}
                        type="button"
                        onClick={() => handleToggleCareOption(care)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{care}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Textarea Editable de Medidas Generales */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Texto de Medidas Generales (Editable libremente):
                </label>
                <button
                  type="button"
                  onClick={() => handleSaveGeneralMeasures()}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Medidas</span>
                </button>
              </div>
              <textarea
                value={generalMeasuresText}
                onChange={(e) => setGeneralMeasuresText(e.target.value)}
                onBlur={() => handleSaveGeneralMeasures()}
                rows={3}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:border-teal-600 outline-hidden transition-all shadow-inner"
                placeholder="MEDIDAS GENERALES: DIETA CORRIENTE, POSICION SEMI FOWLER..."
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. SECCIÓN: FARMACOTERAPIA Y SOLUCIONES */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-teal-700" />
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wide">
              2. Farmacoterapia y Soluciones Prescritas ({orders.length})
            </h3>
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
            <Pill className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-sm">No hay órdenes médicas prescritas</p>
            <p className="text-xs text-slate-400 mt-1">Presiona "Nueva Orden" o "Actualizar Rápido" para prescribir medicamentos o soluciones.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((ord) => {
              const discussion = getTherapeuticDiscussion(ord.name);
              const isExpanded = !!expandedDiscussion[ord.id];

              return (
                <div
                  key={ord.id}
                  className={`bg-white rounded-2xl border p-4 shadow-sm space-y-3 ${
                    ord.allergyWarningIgnored ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{ord.name}</span>
                        <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {ord.type}
                        </span>
                        {ord.allergyWarningIgnored && (
                          <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Alerta Justificada
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        <strong>Dosis: </strong>{ord.dose} • <strong>Vía: </strong>{ord.route} • <strong>Frecuencia: </strong>{ord.frequency}
                      </p>
                      {ord.indication && (
                        <p className="text-xs text-slate-500 mt-0.5">Indicación: {ord.indication}</p>
                      )}
                      {ord.allergyOverrideReason && (
                        <p className="text-[11px] text-amber-800 font-semibold mt-1 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                          Justificación médica: {ord.allergyOverrideReason}
                        </p>
                      )}
                    </div>

                    {/* Status and actions */}
                    <div className="flex items-center gap-2">
                      <select
                        value={ord.status}
                        onChange={(e) => onUpdateOrderStatus(ord.id, e.target.value as OrderStatus)}
                        className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border cursor-pointer ${
                          ord.status === 'Completada'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : ord.status === 'Administrada'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : ord.status === 'Suspendida'
                            ? 'bg-slate-200 text-slate-700 border-slate-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        <option value="Indicada">Indicada</option>
                        <option value="Administrada">Administrada</option>
                        <option value="Completada">Completada</option>
                        <option value="Suspendida">Suspendida</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleStartEditOrder(ord)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-teal-800 hover:text-white hover:bg-[#0F4C5C] border border-teal-300 hover:border-[#0F4C5C] rounded-lg transition-all shadow-xs active:scale-95"
                        title="Modificar fármaco, dosis, vía, frecuencia o indicación"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Modificar</span>
                      </button>

                      <button
                        onClick={() => onDeleteOrder(ord.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg transition-all shadow-xs active:scale-95"
                        title="Eliminar esta orden médica"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>

                  {/* DISCUSIÓN TERAPÉUTICA BASADA EN GUÍAS */}
                  {discussion && (
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => toggleDiscussion(ord.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-950 transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                        <span>Discusión Terapéutica Basada en Guías Clínicas ({discussion.primaryGuide.split('(')[0]})</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-slate-700 space-y-2 leading-relaxed">
                          <div className="font-bold text-teal-950 flex items-center gap-1.5">
                            <span>Guía de Referencia:</span>
                            <span className="font-semibold text-teal-800">{discussion.primaryGuide}</span>
                          </div>

                          <div>
                            <strong>Mecanismo y Justificación:</strong> {discussion.therapeuticRationale}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <div className="bg-white p-2 rounded-lg border border-teal-100">
                              <strong>Dosis recomendada:</strong> {discussion.recommendedDose}
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-teal-100">
                              <strong>Ajuste renal / hepático:</strong> {discussion.renalHepaticAdjustment}
                            </div>
                          </div>

                          <div>
                            <strong>Seguridad y Monitoreo:</strong> {discussion.monitoringAndSafety}
                          </div>

                          <div className="bg-white/80 p-2.5 rounded-lg border border-teal-200/80 text-[11px] text-teal-950 italic">
                            "{discussion.discussionSummary}"
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. SECCIÓN: PARACLÍNICOS SOLICITADOS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-teal-700" />
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wide">
              3. Paraclínicos Solicitados
            </h3>
            <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
              {selectedParaclinics.length} seleccionados
            </span>
            {paraclinicsFeedback && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" /> ¡Actualizado!
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllHospitalParaclinics}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg transition-all active:scale-95"
              title="Selecciona el paquete estándar de 20 paraclínicos oficiales del hospital"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>⭐️ Paquete Oficial Hospital (20)</span>
            </button>
            {selectedParaclinics.length > 0 && (
              <button
                type="button"
                onClick={handleClearParaclinics}
                className="text-[11px] font-semibold text-red-600 hover:text-red-800 px-2 py-1"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Multi-Selección de Paraclínicos */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsParaclinicsDropdownOpen(!isParaclinicsDropdownOpen)}
            className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 flex items-center justify-between transition-all"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Desplegar menú multi-selección de pruebas ({PRELOADED_PARACLINICS_OPTIONS.length} disponibles)...</span>
            </span>
            {isParaclinicsDropdownOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>

          {isParaclinicsDropdownOpen && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 space-y-2 max-h-72 overflow-y-auto">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={paraclinicsSearch}
                  onChange={(e) => setParaclinicsSearch(e.target.value)}
                  placeholder="Buscar prueba (ej: Hemograma, Tipificación, Urea...)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-600 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 pt-1">
                {filteredParaclinics.map((test, idx) => {
                  const isChecked = selectedParaclinics.includes(test);
                  return (
                    <label
                      key={`paraclinic-${idx}`}
                      className={`flex items-center gap-2 p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        isChecked ? 'bg-teal-50 text-teal-950 font-bold border border-teal-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleParaclinic(test)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="truncate">{test}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Selected Paraclinics Chips */}
        {selectedParaclinics.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedParaclinics.map((p, idx) => (
              <span
                key={`p-chip-${idx}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-teal-50 text-teal-900 border border-teal-200 px-2.5 py-1 rounded-lg"
              >
                <span>{p}</span>
                <button
                  type="button"
                  onClick={() => handleToggleParaclinic(p)}
                  className="text-teal-500 hover:text-red-600 hover:bg-white rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No hay paraclínicos seleccionados para esta orden.</p>
        )}

        {/* Add Custom Paraclinic Input */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <input
            type="text"
            value={customParaclinicInput}
            onChange={(e) => setCustomParaclinicInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomParaclinic();
              }
            }}
            placeholder="Añadir prueba o laboratorio personalizado..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:bg-white focus:ring-2 focus:ring-teal-600 outline-hidden"
          />
          <button
            type="button"
            onClick={handleAddCustomParaclinic}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar</span>
          </button>
        </div>
      </div>

      {/* 4. SECCIÓN: IMÁGENES Y ESTUDIOS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-sky-700" />
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wide">
              4. Imágenes y Estudios Diagnósticos
            </h3>
            <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">
              {selectedImaging.length} seleccionados
            </span>
            {imagingFeedback && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" /> ¡Actualizado!
              </span>
            )}
          </div>

          {selectedImaging.length > 0 && (
            <button
              type="button"
              onClick={handleClearImaging}
              className="text-[11px] font-semibold text-red-600 hover:text-red-800 px-2 py-1"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Dropdown Multi-Selección de Imágenes */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsImagingDropdownOpen(!isImagingDropdownOpen)}
            className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 flex items-center justify-between transition-all"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Desplegar menú multi-selección de imágenes ({PRELOADED_IMAGING_OPTIONS.length} disponibles)...</span>
            </span>
            {isImagingDropdownOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>

          {isImagingDropdownOpen && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 space-y-2 max-h-72 overflow-y-auto">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={imagingSearch}
                  onChange={(e) => setImagingSearch(e.target.value)}
                  placeholder="Buscar imagen (ej: Radiografía, TAC, Ecografía, EKG...)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-sky-600 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                {filteredImaging.map((study, idx) => {
                  const isChecked = selectedImaging.includes(study);
                  return (
                    <label
                      key={`imaging-${idx}`}
                      className={`flex items-center gap-2 p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        isChecked ? 'bg-sky-50 text-sky-950 font-bold border border-sky-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleImaging(study)}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <span className="truncate">{study}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Selected Imaging Chips */}
        {selectedImaging.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedImaging.map((img, idx) => (
              <span
                key={`img-chip-${idx}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-sky-50 text-sky-900 border border-sky-200 px-2.5 py-1 rounded-lg"
              >
                <span>{img}</span>
                <button
                  type="button"
                  onClick={() => handleToggleImaging(img)}
                  className="text-sky-500 hover:text-red-600 hover:bg-white rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No hay imágenes ni estudios seleccionados para esta orden.</p>
        )}

        {/* Add Custom Imaging Input */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <input
            type="text"
            value={customImagingInput}
            onChange={(e) => setCustomImagingInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomImaging();
              }
            }}
            placeholder="Añadir estudio o imagen personalizada..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:bg-white focus:ring-2 focus:ring-sky-600 outline-hidden"
          />
          <button
            type="button"
            onClick={handleAddCustomImaging}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar</span>
          </button>
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
          {savedFeedback ? '¡Órdenes Guardadas y Descargadas!' : 'Guardar y Descargar Órdenes en PC'}
        </button>
      </div>

      {/* Official Medical Order Print/Download Modal */}
      <MedicalOrderPrintModal
        patient={patient}
        orders={orders}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />

      {/* Add Order Modal with Live Discussion */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-petrol-900 flex items-center gap-2">
                {editingOrderId ? <Pencil className="w-4 h-4 text-teal-700" /> : <Plus className="w-4 h-4 text-emerald-600" />}
                <span>{editingOrderId ? 'Modificar Fármaco / Orden Médica' : 'Prescribir Medicamento / Tratamiento'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {/* Selector de Catálogo Preestablecido */}
              <div className="bg-teal-50/70 p-3 rounded-2xl border border-teal-200 space-y-1.5 shadow-xs">
                <label className="block font-bold text-petrol-900 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Precargar desde Catálogo Hospitalario (Dosis y Horario en 1 Clic):</span>
                </label>
                <select
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    if (!selectedVal) return;
                    const found = PRELOADED_HOSPITAL_MEDICATIONS.find((m) => `${m.name} (${m.dose})` === selectedVal || m.name === selectedVal);
                    if (found) {
                      setFormData((prev) => ({
                        ...prev,
                        type: found.type,
                        name: found.name,
                        dose: found.dose,
                        route: found.route,
                        frequency: found.frequency,
                        indication: found.indication,
                      }));
                      handleNameChange(found.name);
                    }
                  }}
                  className="w-full bg-white border border-teal-300 rounded-xl p-2 font-bold text-xs text-petrol-900 shadow-xs focus:ring-2 focus:ring-teal-600 focus:border-teal-600 cursor-pointer"
                >
                  <option value="">-- Selecciona un fármaco o solución hospitalaria --</option>
                  <optgroup label="💧 Soluciones y Cristaloides">
                    {PRELOADED_HOSPITAL_MEDICATIONS.filter((m) => m.type === 'Solución').map((m, idx) => (
                      <option key={`sol-${idx}`} value={`${m.name} (${m.dose})`}>
                        {m.name} • {m.dose} • {m.route} • {m.frequency}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="💊 Medicamentos de Emergencia y Medicina Interna">
                    {PRELOADED_HOSPITAL_MEDICATIONS.filter((m) => m.type === 'Medicamento').map((m, idx) => (
                      <option key={`med-${idx}`} value={`${m.name} (${m.dose})`}>
                        {m.name} • {m.dose} • {m.route} • {m.frequency} ({m.indication})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Orden</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as OrderType }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-semibold"
                >
                  <option value="Medicamento">Medicamento</option>
                  <option value="Solución">Solución / Cristaloides / Dieta</option>
                  <option value="Procedimiento">Procedimiento</option>
                  <option value="Interconsulta">Interconsulta</option>
                  <option value="Estudio">Estudio de Urgencia</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre del Fármaco o Solución *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ej. Ceftriaxona, Enoxaparina, Furosemida, Norepinefrina, Omeprazol, Aspirina..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm font-semibold"
                />
              </div>

              {/* Fármacos frecuentes clickeables */}
              <div className="flex flex-wrap gap-1">
                {['Ceftriaxona', 'Enoxaparina', 'Furosemida', 'Omeprazol', 'Norepinefrina', 'Aspirina', 'Atorvastatina', 'Insulina regular'].map(
                  (drug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleNameChange(drug)}
                      className="text-[10px] bg-slate-100 hover:bg-teal-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full"
                    >
                      + {drug}
                    </button>
                  )
                )}
              </div>

              {/* LIVE THERAPEUTIC DISCUSSION PREVIEW */}
              {activeDiscussion && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-1.5 text-[11px] text-slate-700">
                  <div className="font-bold text-teal-900 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                    <span>Discusión en Guías: {activeDiscussion.primaryGuide}</span>
                  </div>
                  <p>{activeDiscussion.therapeuticRationale}</p>
                  <div className="text-[10px] text-teal-800">
                    <strong>Ajuste renal:</strong> {activeDiscussion.renalHepaticAdjustment}
                  </div>
                </div>
              )}

              {/* Allergy Warning Pop-in */}
              {activeConflict && (
                <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-3.5 space-y-2 animate-pulse">
                  <div className="flex items-center gap-2 text-red-700 font-bold text-xs">
                    <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                    <span>{activeConflict.warningMessage}</span>
                  </div>
                  <div>
                    <label className="block font-bold text-red-900 text-[11px] mb-1">
                      Justificación Médica para Proceder (Obligatoria):
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.overrideReason}
                      onChange={(e) => setFormData((prev) => ({ ...prev, overrideReason: e.target.value }))}
                      placeholder="Indique motivo clínico o premedicación anti-alérgica..."
                      className="w-full bg-white border border-red-300 rounded-xl p-2 text-xs text-red-900 font-semibold"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dosis *</label>
                  <input
                    type="text"
                    required
                    value={formData.dose}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dose: e.target.value }))}
                    placeholder="Ej. 1 g, 40 mg, 1000 cc..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vía de Administración</label>
                  <select
                    value={formData.route}
                    onChange={(e) => setFormData((prev) => ({ ...prev, route: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-semibold"
                  >
                    <option value="Intravenosa">Intravenosa (IV)</option>
                    <option value="Vía Oral">Vía Oral (VO)</option>
                    <option value="Sublingual">Sublingual (SL)</option>
                    <option value="Subcutánea">Subcutánea (SC)</option>
                    <option value="Intramuscular">Intramuscular (IM)</option>
                    <option value="Inhalatoria">Inhalatoria / Nebulizada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Frecuencia / Horario</label>
                  <input
                    type="text"
                    value={formData.frequency}
                    onChange={(e) => setFormData((prev) => ({ ...prev, frequency: e.target.value }))}
                    placeholder="Ej. Cada 8 horas, Cada 24h, Dosis única..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Indicación Clínica</label>
                  <input
                    type="text"
                    value={formData.indication}
                    onChange={(e) => setFormData((prev) => ({ ...prev, indication: e.target.value }))}
                    placeholder="Ej. Tromboprofilaxis, Cobertura empírica..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-sm active:scale-95"
                >
                  {editingOrderId ? 'Guardar Cambios' : 'Confirmar Orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Impresión / Formato Oficial */}
      <MedicalOrderPrintModal
        patient={patient}
        orders={orders}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />

      {/* Modal de Duplicar Orden Anterior */}
      {isDuplicateModalOpen && (
        <DuplicateOrderModal
          isOpen={isDuplicateModalOpen}
          onClose={() => setIsDuplicateModalOpen(false)}
          patient={patient}
          existingOrders={orders}
          onSaveNewOrders={(newOrders) => {
            newOrders.forEach((ord) => onAddOrder(ord));
          }}
        />
      )}

      {/* Modal de Discusión Terapéutica Basada en Guías (Sección 30, 31, 32, 33) */}
      <TherapeuticDiscussionModal
        isOpen={isTherapeuticDiscussionModalOpen}
        onClose={() => setIsTherapeuticDiscussionModalOpen(false)}
        patient={patient}
        orders={orders}
      />
    </div>
  );
};
