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
} from 'lucide-react';
import { downloadFileToPC, generateIndividualMedicalOrder } from '../../services/hospitalNoteGenerator';
import { MedicalOrderPrintModal } from '../documents/MedicalOrderPrintModal';

export interface PreloadedMedication {
  name: string;
  type: OrderType;
  dose: string;
  route: string;
  frequency: string;
  indication: string;
}

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
}

export const MedicalOrdersTab: React.FC<Props> = ({
  patient,
  orders,
  onAddOrder,
  onEditOrder,
  onUpdateOrderStatus,
  onDeleteOrder,
}) => {
  const patientAllergies = patient.vitals?.allergies || [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [expandedDiscussion, setExpandedDiscussion] = useState<Record<string, boolean>>({});

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

  return (
    <div className="space-y-4 pb-12">
      {/* Top Action Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <Pill className="w-4 h-4 text-teal-700" />
          <span>Apartado: <strong>Órdenes Médicas y Farmacoterapia</strong></span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Cargar / Actualizar con Orden Anterior */}
          <button
            type="button"
            onClick={handleLoadPreviousDailyOrder}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 transition-all active:scale-95 shadow-sm"
            title="Carga la pauta de orden diaria hospitalaria para modificar, agregar o eliminar rápidamente"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-700" />
            <span>Actualizar con Orden Anterior</span>
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

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
          <Pill className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700 text-sm">No hay órdenes médicas prescritas</p>
          <p className="text-xs text-slate-400 mt-1">Presiona "Nueva Orden" para prescribir medicamentos o soluciones.</p>
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
    </div>
  );
};
