import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Filter,
  Users,
  Activity,
  Heart,
  Wind,
  ShieldAlert,
  Flame,
  Droplets,
  Brain,
  Bone,
  Baby,
  FileText,
  Search,
  ChevronRight,
  ExternalLink,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { Patient, PathologyCategory, PathologyGroupInfo } from '../../types';

interface Props {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
  onOpenSettings?: () => void;
}

export const PATHOLOGY_GROUPS: PathologyGroupInfo[] = [
  {
    category: 'Cardiovascular',
    title: 'Cardiovascular & Hemodinámico',
    color: '#EF4444',
    bgLight: 'bg-red-50',
    borderColor: 'border-red-300',
    iconName: 'Heart',
    description: 'Hipertensión arterial severa, Crisis hipertensiva, Síndrome coronario agudo, EVC isquémico/hemorrágico, Insuficiencia cardíaca, Fibrilación auricular.'
  },
  {
    category: 'Respiratorio',
    title: 'Respiratorio & Pulmonar',
    color: '#3B82F6',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-300',
    iconName: 'Wind',
    description: 'Neumonía adquirida en la comunidad (NAC/NIH), EPOC agudizado, Crisis asmática, SDRA, Derrame pleural, Insuficiencia respiratoria aguda.'
  },
  {
    category: 'Infeccioso',
    title: 'Infeccioso & Sepsis',
    color: '#F97316',
    bgLight: 'bg-orange-50',
    borderColor: 'border-orange-300',
    iconName: 'ShieldAlert',
    description: 'Sepsis de cualquier foco, Choque séptico, Pielonefritis / ITU complicada, Dengue con signos de alarma, Celulitis severa, Meningitis, COVID-19.'
  },
  {
    category: 'Gastrointestinal',
    title: 'Gastrointestinal & Hepático',
    color: '#EAB308',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-300',
    iconName: 'Flame',
    description: 'Hemorragia digestiva alta/baja, Pancreatitis aguda, Cirrosis hepática descompensada, Encefalopatía hepática, Colecistitis, Apendicitis.'
  },
  {
    category: 'Metabólico',
    title: 'Metabólico & Endocrino',
    color: '#10B981',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    iconName: 'TrendingUp',
    description: 'Diabetes mellitus descompensada, Cetoacidosis diabética (CAD), Estado hiperosmolar hiperglucémico (EHH), Hipoglucemia severa, Trastornos tiroideos.'
  },
  {
    category: 'Nefrológico',
    title: 'Nefrológico & Renal',
    color: '#6366F1',
    bgLight: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    iconName: 'Droplets',
    description: 'Lesión renal aguda (KDIGO), Enfermedad renal crónica agudizada, Síndrome urémico, Hiperkalemia, Hiponatremia severa, Trastornos electrolíticos.'
  },
  {
    category: 'Neurológico',
    title: 'Neurológico & Neurovascular',
    color: '#8B5CF6',
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-300',
    iconName: 'Brain',
    description: 'EVC isquémico agudo, Hemorragia subaracnoidea, Estado epiléptico, Crisis convulsivas, Encefalopatías metabólicas, Deterioro del sensorio.'
  },
  {
    category: 'Trauma',
    title: 'Trauma & Quirúrgico',
    color: '#F43F5E',
    bgLight: 'bg-rose-50',
    borderColor: 'border-rose-300',
    iconName: 'Bone',
    description: 'Politraumatismo, Traumatismo craneoencefálico (TCE), Fracturas mayores, Heridas penetrantes, Abdomen agudo quirúrgico.'
  },
  {
    category: 'Gineco-Obstétrico',
    title: 'Gineco-Obstétrico',
    color: '#EC4899',
    bgLight: 'bg-pink-50',
    borderColor: 'border-pink-300',
    iconName: 'Baby',
    description: 'Preeclampsia con criterios de severidad, Eclampsia, Hemorragia obstétrica, Amenaza de parto pretérmino, Sepsis puerperal.'
  },
  {
    category: 'Otros',
    title: 'Otras Patologías & En Estudio',
    color: '#64748B',
    bgLight: 'bg-slate-100',
    borderColor: 'border-slate-300',
    iconName: 'FileText',
    description: 'Síndrome consuntivo, Fiebre de origen oscuro (FOD), Intoxicaciones agudas, Dolor inespecífico en evaluación, Anemia severa sin filiar.'
  }
];

export const EpidemiologyView: React.FC<Props> = ({
  patients,
  onSelectPatient,
}) => {
  // Años disponibles calculados a partir de los datos
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    const currentYear = new Date().getFullYear();
    yearsSet.add(currentYear);
    yearsSet.add(currentYear - 1);
    yearsSet.add(2024);

    patients.forEach((p) => {
      const date = new Date(p.arrivalDateTime || p.createdAt);
      if (!isNaN(date.getFullYear())) {
        yearsSet.add(date.getFullYear());
      }
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [patients]);

  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<PathologyCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<PathologyCategory | null>('Cardiovascular');

  // Función clasificadora de patologías con alta precisión epidemiológica basada en diagnósticos de ingreso
  const classifyPatientPathology = (patient: Patient): PathologyCategory => {
    // 1. Diagnósticos explícitos de ingreso y motivo
    const primaryDiagText = [
      ...(patient.diagnosesList || []).map((d) => d.name || ''),
      patient.clinicalHistory?.clinicalImpression || '',
      patient.clinicalHistory?.reasonForConsultation || '',
      patient.chiefComplaint || '',
    ].join(' ').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 2. Texto complementario de la historia clínica
    const backgroundText = [
      patient.clinicalHistory?.currentIllnessHistory || '',
      patient.clinicalHistory?.pathologicalHistory || '',
      patient.clinicalHistory?.diagnosticAndTherapeuticPlan || '',
    ].join(' ').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const fullText = `${primaryDiagText} ${backgroundText}`;

    // 1. Cardiovascular & Hemodinámico
    if (/\b(hta|iam|sca|evc|acv|fa|icc)\b|hipertens|infarto|coronari|cardiac|cardio|arritmia|fibrilaci|insuficiencia cardiaca|angina|edema agudo de pulmon|sincope|shock cardiogenico|trombosis|diseccion aortica|tep\b|bloqueo av/i.test(primaryDiagText) ||
        /\b(hta|iam|sca|evc|acv)\b|infarto de miocardio|insuficiencia cardiaca/i.test(fullText)) {
      return 'Cardiovascular';
    }

    // 2. Respiratorio & Pulmonar
    if (/\b(nac|nih|epoc|ira|sdra)\b|neumoni|bronconeumoni|asma|broncoespasmo|respiratori|saturaci|derrame pleural|infiltrado|disnea aguda|edema pulmonar|laringotraqueitis|atelectasia|hemoptisis/i.test(primaryDiagText) ||
        /\b(nac|nih|epoc)\b|neumonia|crisis asmatica/i.test(fullText)) {
      return 'Respiratorio';
    }

    // 3. Infeccioso & Sepsis
    if (/\b(itu|sida|vih)\b|sepsis|choque septico|shock septico|pielonefrit|infeccion de vias urinarias|celulit|absceso|dengue|meningit|bacteriemia|covid|infecci|erisipela|leptospir|malaria|bacteriana/i.test(primaryDiagText) ||
        /sepsis|choque septico|dengue|pielonefritis/i.test(fullText)) {
      return 'Infeccioso';
    }

    // 4. Gastrointestinal & Hepático
    if (/\b(hda|hdb)\b|sangrado digestivo|hemorragia digest|pancreatit|cirrosis|gastritis|ulcera|apendicit|colecistit|colangitis|diarrea|vomit|ictericia|oclusion intestinal|abdomen agudo|peritonitis|hepatitis/i.test(primaryDiagText) ||
        /\b(hda|hdb)\b|hemorragia digestiva|pancreatitis|cirrosis hepatica/i.test(fullText)) {
      return 'Gastrointestinal';
    }

    // 5. Metabólico & Endocrino
    if (/\b(dm|cad|ehh)\b|diabet|cetoacidosis|hiperosmolar|hipoglucemi|glicemi|tiroid|coma diabet|tirotoxicosis|mixedema|cetoacidotico/i.test(primaryDiagText) ||
        /\b(cad|ehh)\b|cetoacidosis diabetica|estado hiperosmolar|diabetes mellitus descompensada/i.test(fullText)) {
      return 'Metabólico';
    }

    // 6. Nefrológico & Renal
    if (/\b(lra|erc|kdigo)\b|renal|creatinin|uremia|hiperkalemi|potasio|sodio|dialisis|oliguria|anuria|sindrome nefrotico|sindrome nefritico|glomerulonefrit/i.test(primaryDiagText) ||
        /\b(lra|erc)\b|lesion renal aguda|insuficiencia renal/i.test(fullText)) {
      return 'Nefrológico';
    }

    // 7. Neurológico & Neurovascular
    if (/\b(tce|evc|acv)\b|convulsi|epilep|coma|glasgow|deterioro cognitivo|meningismo|neurologic|ictus|isquemia cerebral|hemorragia subaracnoidea|hematoma epidural|hematoma subdural|encefalopatia|guillain/i.test(primaryDiagText) ||
        /accidente cerebrovascular|crisis convulsiva|estatus epileptico/i.test(fullText)) {
      return 'Neurológico';
    }

    // 8. Trauma & Quirúrgico
    if (/\b(haf|hab|tce)\b|trauma|politrauma|fractura|accidente|herida|caida|contusion|luxacion|quemadura/i.test(primaryDiagText) ||
        /politraumatismo|trauma craneoencefalico|herida por arma/i.test(fullText)) {
      return 'Trauma';
    }

    // 9. Gineco-Obstétrico
    if (/embarazo|gestaci|preeclampsia|eclampsia|hellp|parto|obstetr|cesarea|puerperi|amenaza de aborto|amenaza de parto|dppni|placenta previa/i.test(primaryDiagText) ||
        /preeclampsia|eclampsia|embarazo complicado/i.test(fullText)) {
      return 'Gineco-Obstétrico';
    }

    return 'Otros';
  };

  // Filtrado temporal y por texto
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      if (p.isDeleted) return false;

      const date = new Date(p.arrivalDateTime || p.createdAt);
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1-12

      if (selectedYear !== 'all' && year !== selectedYear) return false;
      if (selectedMonth !== 'all' && month !== selectedMonth) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.fullName.toLowerCase().includes(q);
        const matchDiag = (p.clinicalHistory?.clinicalImpression || p.chiefComplaint || '').toLowerCase().includes(q);
        const matchCubicle = p.cubicle.toLowerCase().includes(q);
        if (!matchName && !matchDiag && !matchCubicle) return false;
      }

      return true;
    });
  }, [patients, selectedYear, selectedMonth, searchQuery]);

  // Agrupación de pacientes por patología
  const patientsByCategory = useMemo(() => {
    const map: Record<PathologyCategory, Patient[]> = {
      Cardiovascular: [],
      Respiratorio: [],
      Infeccioso: [],
      Gastrointestinal: [],
      Metabólico: [],
      Nefrológico: [],
      Neurológico: [],
      Trauma: [],
      'Gineco-Obstétrico': [],
      Otros: [],
    };

    filteredPatients.forEach((p) => {
      const cat = classifyPatientPathology(p);
      map[cat].push(p);
    });

    return map;
  }, [filteredPatients]);

  // Métricas Clave
  const totalPatientsCount = filteredPatients.length;
  const topCategory = useMemo(() => {
    let bestCat: PathologyCategory = 'Cardiovascular';
    let maxCount = -1;
    (Object.keys(patientsByCategory) as PathologyCategory[]).forEach((cat) => {
      if (patientsByCategory[cat].length > maxCount) {
        maxCount = patientsByCategory[cat].length;
        bestCat = cat;
      }
    });
    return { category: bestCat, count: maxCount };
  }, [patientsByCategory]);

  const criticalTriageCount = useMemo(() => {
    return filteredPatients.filter((p) => p.triageLevel === 1 || p.triageLevel === 2).length;
  }, [filteredPatients]);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handleExportEpidemiologyReport = () => {
    const periodLabel = selectedYear === 'all' ? 'Histórico General' : `Año ${selectedYear}${selectedMonth !== 'all' ? ` - ${monthNames[selectedMonth - 1]}` : ''}`;
    let csv = `HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN\nREPORTE EPIDEMIOLÓGICO OFICIAL - ${periodLabel}\n`;
    csv += `TOTAL PACIENTES: ${totalPatientsCount}\nFECHA DE REPORTE: ${new Date().toLocaleDateString()}\n\n`;
    csv += `PATOLOGÍA,CANTIDAD,PORCENTAJE\n`;

    PATHOLOGY_GROUPS.forEach((g) => {
      const count = patientsByCategory[g.category]?.length || 0;
      const pct = totalPatientsCount > 0 ? ((count / totalPatientsCount) * 100).toFixed(1) : '0.0';
      csv += `"${g.title}",${count},${pct}%\n`;
    });

    csv += `\nDETALLE DE PACIENTES:\n`;
    csv += `NOMBRE,EDAD,SEXO,ÁREA/SALA,FECHA INGRESO,TRIAGE,DIAGNÓSTICO\n`;
    filteredPatients.forEach((p) => {
      const cat = classifyPatientPathology(p);
      const diag = (p.clinicalHistory?.clinicalImpression || p.chiefComplaint || 'En estudio').replace(/"/g, '""');
      csv += `"${p.fullName}",${p.age || 'N/D'},"${p.sex}","${p.cubicle}","${p.arrivalDateTime}","Nivel ${p.triageLevel}","${diag}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_Epidemiologico_${selectedYear}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Institucional de Epidemiología */}
      <div className="bg-gradient-to-r from-[#0F4C5C] to-[#1a667b] text-white rounded-2xl p-5 sm:p-6 shadow-lg border border-teal-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-teal-300 shadow-inner">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-400/20 text-teal-200 px-2.5 py-0.5 rounded-full border border-teal-300/30">
                Vigilancia Epidemiológica Hospitalaria
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded-full font-mono">
                Datos en Tiempo Real
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1">Estadísticas & Epidemiología Institucional</h2>
            <p className="text-xs sm:text-sm text-teal-100/90">
              Hospital Regional Dr. Ángel María Gatón • Distribución Anual por Patologías Clínicas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            type="button"
            onClick={handleExportEpidemiologyReport}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
            title="Exportar consolidado epidemiológico en CSV/Excel"
          >
            <Download className="w-4 h-4 text-teal-300" />
            <span>Exportar Reporte</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros Temporales & Buscador */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Año */}
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl px-3 py-1.5 border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-600">Año:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
            >
              <option value="all">Histórico Acumulado</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  Año {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Mes */}
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl px-3 py-1.5 border border-slate-200">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-600">Mes:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
            >
              <option value="all">Todos los Meses</option>
              {monthNames.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro rápido por categoría */}
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl px-3 py-1.5 border border-slate-200">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
            >
              <option value="all">Todas las Categorías</option>
              {PATHOLOGY_GROUPS.map((g) => (
                <option key={g.category} value={g.category}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buscador de Diagnósticos o Pacientes */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por diagnóstico, paciente o cubículo..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0F4C5C] focus:bg-white outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pacientes */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pacientes Evaluados</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{totalPatientsCount}</h3>
            <p className="text-[11px] text-teal-700 font-semibold mt-0.5">
              {selectedYear === 'all' ? 'Registro General' : `Acumulado ${selectedYear}`}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Patología Más Prevalente */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patología Más Frecuente</p>
            <h3 className="text-lg font-black text-slate-900 mt-1 truncate max-w-[170px]">
              {topCategory.count > 0 ? topCategory.category : 'N/D'}
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
              {topCategory.count > 0
                ? `${topCategory.count} casos (${((topCategory.count / (totalPatientsCount || 1)) * 100).toFixed(0)}%)`
                : 'Sin registros'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Triage Crítico */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Casos de Emergencia Severa</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{criticalTriageCount}</h3>
            <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
              Triage Nivel 1 y 2 ({totalPatientsCount > 0 ? ((criticalTriageCount / totalPatientsCount) * 100).toFixed(0) : 0}%)
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Hospitalización & Cobertura */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hospitalizados Activos</p>
            <h3 className="text-2xl font-black text-blue-600 mt-1">
              {filteredPatients.filter(p => p.status === 'ingresados' || p.status === 'observacion').length}
            </h3>
            <p className="text-[11px] text-blue-700 font-semibold mt-0.5">
              Salas y Cubículos de Internamiento
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid de Grupos Patológicos con Colores Diferenciados */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Distribución de Pacientes por Categoría Patológica
            </h3>
            <p className="text-xs text-slate-500">
              Haz clic sobre cualquier categoría para inspeccionar los pacientes o <strong>abrir su expediente en 1 clic</strong>.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400 font-mono">
            {PATHOLOGY_GROUPS.length} Grupos Clínicos
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PATHOLOGY_GROUPS.filter(g => selectedCategory === 'all' || selectedCategory === g.category).map((g) => {
            const list = patientsByCategory[g.category] || [];
            const count = list.length;
            const percentage = totalPatientsCount > 0 ? (count / totalPatientsCount) * 100 : 0;
            const isExpanded = expandedCategory === g.category;

            return (
              <div
                key={g.category}
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs overflow-hidden ${
                  isExpanded ? `${g.borderColor} ring-2 ring-opacity-20` : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header de la Tarjeta Patológica */}
                <div
                  onClick={() => setExpandedCategory(isExpanded ? null : g.category)}
                  className={`p-4 cursor-pointer flex items-center justify-between gap-3 ${g.bgLight} border-b border-slate-100`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
                      style={{ backgroundColor: g.color }}
                    >
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm leading-tight">{g.title}</h4>
                        <span
                          className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: g.color }}
                        >
                          {count} {count === 1 ? 'caso' : 'casos'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">{g.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-800">{percentage.toFixed(1)}%</span>
                      <p className="text-[9px] text-slate-500 uppercase font-bold">del total</p>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90 text-slate-700' : ''}`}
                    />
                  </div>
                </div>

                {/* Barra de progreso de prevalencia */}
                <div className="w-full bg-slate-100 h-1.5">
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${percentage}%`, backgroundColor: g.color }}
                  />
                </div>

                {/* Despliegue de Pacientes Pertenecientes al Grupo */}
                {isExpanded && (
                  <div className="p-3 sm:p-4 bg-slate-50/70 space-y-2.5 max-h-[380px] overflow-y-auto">
                    {count === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs font-medium">
                        No se han registrado pacientes en este grupo patológico durante el período seleccionado.
                      </div>
                    ) : (
                      list.map((patient) => {
                        const dateStr = new Date(patient.arrivalDateTime || patient.createdAt).toLocaleDateString();
                        const primaryDiag = patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint || 'Diagnóstico en estudio';

                        return (
                          <div
                            key={patient.id}
                            onClick={() => onSelectPatient(patient)}
                            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-teal-600 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group"
                            title="Haz clic para abrir el expediente completo de este paciente"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <span
                                className="w-2.5 h-10 rounded-full shrink-0"
                                style={{ backgroundColor: g.color }}
                              />
                              <div className="overflow-hidden">
                                <div className="flex items-center gap-2">
                                  <h5 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-[#0F4C5C] truncate transition-colors">
                                    {patient.fullName}
                                  </h5>
                                  <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono font-bold shrink-0">
                                    {patient.cubicle}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-700 font-medium truncate mt-0.5">
                                  {primaryDiag}
                                </p>
                                <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                                  <span>{patient.age ? `${patient.age} años` : 'Edad N/D'}</span>
                                  <span>•</span>
                                  <span>Sexo: {patient.sex}</span>
                                  <span>•</span>
                                  <span>Ingreso: {dateStr}</span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectPatient(patient);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-teal-50 group-hover:bg-[#0F4C5C] text-teal-800 group-hover:text-white text-xs font-bold flex items-center gap-1 shrink-0 transition-all shadow-2xs"
                            >
                              <span>Abrir</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EpidemiologyView;
