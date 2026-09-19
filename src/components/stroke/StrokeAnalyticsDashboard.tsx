import React, { useState, useEffect, useMemo } from 'react';
import { 
  BrainCircuit, 
  Filter, 
  Calendar, 
  Plus, 
  Download, 
  TrendingUp, 
  Zap, 
  Activity, 
  Users, 
  Clock, 
  AlertCircle, 
  Search, 
  Edit3, 
  CheckCircle2, 
  FileSpreadsheet,
  ChevronRight,
  ArrowUpDown,
  RefreshCw
} from 'lucide-react';
import { 
  StrokeRecord, 
  StrokeFilterParams, 
  StrokeKpiMetrics, 
  StrokeType 
} from '../../types/strokeRegistry';
import { strokeRegistryService } from '../../services/strokeRegistryService';
import { StrokeRegistryModal } from './StrokeRegistryModal';
import { Patient } from '../../types';

interface StrokeAnalyticsDashboardProps {
  onBack?: () => void;
  onSelectPatientById?: (patientId: string) => void;
}

export const StrokeAnalyticsDashboard: React.FC<StrokeAnalyticsDashboardProps> = ({
  onBack,
  onSelectPatientById,
}) => {
  const [records, setRecords] = useState<StrokeRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRecord, setSelectedRecord] = useState<StrokeRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Filtros
  const [strokeTypeFilter, setStrokeTypeFilter] = useState<StrokeType | 'ALL'>('ALL');
  const [sexFilter, setSexFilter] = useState<'M' | 'F' | 'ALL'>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'TROMBOLIZADO' | 'UCI' | 'FALLECIDO' | 'VIVO'>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<number | undefined>(undefined);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const all = await strokeRegistryService.getRecords({
        strokeType: strokeTypeFilter,
        sex: sexFilter,
        outcome: outcomeFilter,
        year: yearFilter
      });
      setRecords(all);
    } catch (e) {
      console.error('Error cargando registros de EVC:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [strokeTypeFilter, sexFilter, outcomeFilter, yearFilter]);

  // Filtrar localmente por búsqueda de texto
  const filteredRecords = useMemo(() => {
    if (!searchFilter.trim()) return records;
    const q = searchFilter.toLowerCase();
    return records.filter(r => 
      r.patientName.toLowerCase().includes(q) ||
      r.patientRecordNumber?.toLowerCase().includes(q) ||
      r.attendingDoctor?.toLowerCase().includes(q)
    );
  }, [records, searchFilter]);

  // Métricas calculadas
  const kpi: StrokeKpiMetrics = useMemo(() => {
    return strokeRegistryService.computeKpiMetrics(filteredRecords);
  }, [filteredRecords]);

  // Exportar a CSV
  const handleExportCsv = () => {
    if (filteredRecords.length === 0) {
      alert('No hay registros de EVC para exportar con los filtros seleccionados.');
      return;
    }

    const headers = [
      'ID', 'Fecha', 'Paciente', 'No. Récord', 'Edad', 'Sexo', 'Tipo EVC', 
      'NIHSS Ingreso', 'Trombolizado', 'Tiempo Puerta-Aguja (min)', 
      'Territorio Vascular / Localización Sangrado', 'Rankin Egreso', 'Mortalidad'
    ];

    const rows = filteredRecords.map(r => [
      r.id,
      r.eventDate,
      `"${r.patientName}"`,
      r.patientRecordNumber || '',
      r.age,
      r.sex,
      r.strokeType,
      r.strokeType === 'ISQUEMICO' ? r.ischemicData?.nihssArrival ?? '' : '',
      r.strokeType === 'ISQUEMICO' ? (r.ischemicData?.thrombolysisPerformed ? 'SI' : 'NO') : '',
      r.strokeType === 'ISQUEMICO' ? r.ischemicData?.doorToNeedleMinutes ?? '' : '',
      r.strokeType === 'ISQUEMICO' ? (r.ischemicData?.vascularTerritory || '') : (r.hemorrhagicData?.bleedingLocation || ''),
      r.strokeType === 'ISQUEMICO' ? (r.ischemicData?.modifiedRankinDischarge ?? '') : (r.hemorrhagicData?.modifiedRankinDischarge ?? ''),
      (r.ischemicData?.disposition === 'MORTALIDAD_INTRAHOSPITALARIA' || r.hemorrhagicData?.inHospitalMortality) ? 'SI' : 'NO'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Registro_EVC_Hospital_Gaton_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Coordenadas para Donut Chart SVG
  const donutData = useMemo(() => {
    const total = kpi.totalEvents || 1;
    const isqPct = (kpi.totalIschemic / total) * 100;
    const hemPct = (kpi.totalHemorrhagic / total) * 100;
    const tiaPct = (kpi.totalTia / total) * 100;

    // Circunferencia = 2 * PI * r = 2 * 3.14159 * 40 = 251.3
    const c = 251.3;
    const isqDash = (isqPct / 100) * c;
    const hemDash = (hemPct / 100) * c;
    const tiaDash = (tiaPct / 100) * c;

    return {
      isqPct: Math.round(isqPct),
      hemPct: Math.round(hemPct),
      tiaPct: Math.round(tiaPct),
      isqOffset: 0,
      hemOffset: -isqDash,
      tiaOffset: -(isqDash + hemDash),
      isqDash,
      hemDash,
      tiaDash,
      c
    };
  }, [kpi]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header del Módulo */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-md shrink-0">
            <BrainCircuit className="w-8 h-8 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Registro de Eventos Cerebrovasculares (EVC)
              </h2>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30">
                AHA / ASA
              </span>
            </div>
            <p className="text-xs sm:text-sm text-purple-200 mt-0.5">
              Hospital Regional Dr. Ángel María Gatón • Vigilancia Nosológica y Calidad Asistencial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
            title="Exportar base de datos a Excel / CSV"
          >
            <Download className="w-4 h-4 text-teal-300" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
          <button
            onClick={() => {
              setSelectedRecord(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Caso EVC</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros Clínicos */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-purple-600" />
            <span>Filtros Clínicos de Vigilancia</span>
          </div>
          <button
            onClick={loadData}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
            title="Refrescar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Búsqueda texto */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar paciente o récord..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white"
            />
          </div>

          {/* 2. Tipo de EVC */}
          <div>
            <select
              value={strokeTypeFilter}
              onChange={(e) => setStrokeTypeFilter(e.target.value as any)}
              className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              <option value="ALL">Todos los Tipos de EVC</option>
              <option value="ISQUEMICO">1. EVC Isquémico</option>
              <option value="HEMORRAGICO">2. EVC Hemorrágico</option>
              <option value="AIT">3. Ataque Isquémico Transitorio (AIT)</option>
            </select>
          </div>

          {/* 3. Sexo */}
          <div>
            <select
              value={sexFilter}
              onChange={(e) => setSexFilter(e.target.value as any)}
              className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              <option value="ALL">Sexo: Ambos</option>
              <option value="M">Masculino (M)</option>
              <option value="F">Femenino (F)</option>
            </select>
          </div>

          {/* 4. Tratamiento / Desenlace */}
          <div>
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value as any)}
              className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              <option value="ALL">Desenlace: Todos</option>
              <option value="TROMBOLIZADO">Trombolizados IV</option>
              <option value="UCI">Ingresados a UCI</option>
              <option value="FALLECIDO">Mortalidad Intrahospitalaria</option>
              <option value="VIVO">Egresados Vivos</option>
            </select>
          </div>

          {/* 5. Año */}
          <div>
            <select
              value={yearFilter || ''}
              onChange={(e) => setYearFilter(e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              <option value="">Año: Todos los años</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI Superiores */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Total Eventos */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Eventos</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{kpi.totalEvents}</span>
            <span className="text-[11px] text-slate-500 font-semibold">casos</span>
          </div>
          <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100 text-[10px]">
            <span className="text-blue-700 font-bold">{kpi.totalIschemic} Isq</span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-rose-700 font-bold">{kpi.totalHemorrhagic} Hem</span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-amber-700 font-bold">{kpi.totalTia} AIT</span>
          </div>
        </div>

        {/* Card 2: Trombolisis IV */}
        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Tasa de Trombolisis</span>
            <Zap className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-blue-900">{kpi.thrombolysisPercentage}%</span>
            <span className="text-[11px] text-blue-700 font-semibold">({kpi.thrombolysisCount} de {kpi.totalIschemic})</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            De pacientes con EVC Isquémico
          </p>
        </div>

        {/* Card 3: Puerta - Aguja */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Puerta - Aguja</span>
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-900">{kpi.averageDoorToNeedleMinutes}</span>
            <span className="text-[11px] text-emerald-700 font-semibold">minutos prom.</span>
          </div>
          <p className="text-[10px] text-emerald-700 font-medium mt-2 pt-2 border-t border-slate-100">
            {kpi.averageDoorToNeedleMinutes <= 60 ? '✓ Meta alcanzada (≤60 min)' : 'Requiere optimización'}
          </p>
        </div>

        {/* Card 4: NIHSS Promedio */}
        <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Severidad NIHSS</span>
            <Activity className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-purple-900">{kpi.averageNihssArrival}</span>
            <span className="text-[11px] text-purple-700 font-semibold">pts al arribo</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            mRS al egreso: {kpi.averageRankinDischarge} prom.
          </p>
        </div>

        {/* Card 5: Mortalidad */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Mortalidad</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-rose-900">{kpi.mortalityRate}%</span>
            <span className="text-[11px] text-slate-500 font-semibold">({kpi.mortalityCount} fallecidos)</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            UCI: {kpi.icuPercentage}% ({kpi.icuAdmissions} ingresados)
          </p>
        </div>
      </div>

      {/* Gráficos Nativos SVG Interactivos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico 1: Dona Proporción de Tipos de EVC */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-purple-600" />
            Distribución Nosológica
          </h3>

          <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-4 py-2">
            <div className="relative w-36 h-36 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* Background Track */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="18" />
                {/* Isquémico (Azul) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#2563eb"
                  strokeWidth="18"
                  strokeDasharray={`${donutData.isqDash} ${donutData.c}`}
                  strokeDashoffset={donutData.isqOffset}
                  className="transition-all duration-500"
                />
                {/* Hemorrágico (Rojo) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#e11d48"
                  strokeWidth="18"
                  strokeDasharray={`${donutData.hemDash} ${donutData.c}`}
                  strokeDashoffset={donutData.hemOffset}
                  className="transition-all duration-500"
                />
                {/* AIT (Ámbar) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#d97706"
                  strokeWidth="18"
                  strokeDasharray={`${donutData.tiaDash} ${donutData.c}`}
                  strokeDashoffset={donutData.tiaOffset}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-black text-slate-900">{kpi.totalEvents}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase">Casos</span>
              </div>
            </div>

            {/* Leyenda con conteos */}
            <div className="space-y-2 text-xs w-full sm:w-auto">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-700">Isquémico:</span>
                </div>
                <span className="font-black text-blue-900">{kpi.totalIschemic} ({donutData.isqPct}%)</span>
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-600 shrink-0" />
                  <span className="font-semibold text-slate-700">Hemorrágico:</span>
                </div>
                <span className="font-black text-rose-900">{kpi.totalHemorrhagic} ({donutData.hemPct}%)</span>
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-600 shrink-0" />
                  <span className="font-semibold text-slate-700">AIT:</span>
                </div>
                <span className="font-black text-amber-900">{kpi.totalTia} ({donutData.tiaPct}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico 2: Severidad NIHSS al Ingreso */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-600" />
            Severidad NIHSS al Arribo
          </h3>

          <div className="flex-1 flex flex-col justify-around py-1 space-y-2.5">
            {/* Leve (<5) */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-600">Leve (0 - 4 pts):</span>
                <span className="font-bold text-emerald-700">{kpi.nihssCategories.mild}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${(kpi.nihssCategories.mild / (kpi.totalIschemic || 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Moderado (5-14) */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-600">Moderado (5 - 14 pts):</span>
                <span className="font-bold text-amber-700">{kpi.nihssCategories.moderate}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{ width: `${(kpi.nihssCategories.moderate / (kpi.totalIschemic || 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Grave (16-20) */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-600">Grave (16 - 20 pts):</span>
                <span className="font-bold text-orange-700">{kpi.nihssCategories.moderateSevere}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-orange-500 h-full rounded-full transition-all"
                  style={{ width: `${(kpi.nihssCategories.moderateSevere / (kpi.totalIschemic || 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Muy Grave (>20) */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-600">Muy Grave (&gt;20 pts):</span>
                <span className="font-bold text-rose-700">{kpi.nihssCategories.severe}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-rose-600 h-full rounded-full transition-all"
                  style={{ width: `${(kpi.nihssCategories.severe / (kpi.totalIschemic || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico 3: Demografía (Sexo y Puerta-Aguja) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600" />
            Demografía & Tiempos Críticos
          </h3>

          <div className="space-y-4">
            {/* Sexo */}
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">Distribución por Sexo:</span>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-blue-50 p-2.5 rounded-xl border border-blue-200 text-center">
                  <span className="text-[10px] font-bold text-blue-700 block">Hombres (M)</span>
                  <span className="text-lg font-black text-blue-900">{kpi.sexDistribution.male}</span>
                </div>
                <div className="flex-1 bg-pink-50 p-2.5 rounded-xl border border-pink-200 text-center">
                  <span className="text-[10px] font-bold text-pink-700 block">Mujeres (F)</span>
                  <span className="text-lg font-black text-pink-900">{kpi.sexDistribution.female}</span>
                </div>
              </div>
            </div>

            {/* Puerta Aguja Desglose */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Tiempos Puerta-Aguja en Trombolizados:
              </span>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-emerald-800 font-bold">&le;60 min: {kpi.doorToNeedleCategories.lessThan60}</span>
                <span className="text-blue-800 font-bold">60-90 min: {kpi.doorToNeedleCategories.between60And90}</span>
                <span className="text-rose-800 font-bold">&gt;90 min: {kpi.doorToNeedleCategories.greaterThan90}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Registros Clínicos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Expedientes en el Registro ({filteredRecords.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              Listado oficial para análisis retrospectivo y epidemiológico
            </p>
          </div>
        </div>

        <div className="overflow-x-auto touch-scroll-x">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Edad / Sexo</th>
                <th className="px-4 py-3">Clasificación</th>
                <th className="px-4 py-3">Severidad</th>
                <th className="px-4 py-3">Manejo / Trombolisis</th>
                <th className="px-4 py-3">Rankin Egreso</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No se encontraron registros de eventos cerebrovasculares con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                        {r.eventDate}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        <div>{r.patientName}</div>
                        {r.patientRecordNumber && (
                          <div className="text-[10px] text-slate-400 font-normal">{r.patientRecordNumber}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.age} a &bull; {r.sex}
                      </td>
                      <td className="px-4 py-3">
                        {r.strokeType === 'ISQUEMICO' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            EVC Isquémico
                          </span>
                        )}
                        {r.strokeType === 'HEMORRAGICO' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            EVC Hemorrágico
                          </span>
                        )}
                        {r.strokeType === 'AIT' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            AIT (Transitorio)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {r.strokeType === 'ISQUEMICO' && (
                          <span>NIHSS: {r.ischemicData?.nihssArrival ?? '-'} pts</span>
                        )}
                        {r.strokeType === 'HEMORRAGICO' && (
                          <span>ICH: {r.hemorrhagicData?.ichScore ?? '-'} pts (GCS: {r.hemorrhagicData?.glasgowArrival ?? '-'})</span>
                        )}
                        {r.strokeType === 'AIT' && (
                          <span>ABCD2: {r.tiaData?.abcd2Score ?? '-'} pts</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.strokeType === 'ISQUEMICO' ? (
                          r.ischemicData?.thrombolysisPerformed ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <Zap className="w-3 h-3 text-amber-500 fill-amber-400" />
                              Trombolizado ({r.ischemicData.doorToNeedleMinutes} min)
                            </span>
                          ) : (
                            <span className="text-slate-500">Manejo médico</span>
                          )
                        ) : r.strokeType === 'HEMORRAGICO' ? (
                          <span className="text-slate-700">
                            {r.hemorrhagicData?.surgicalManagement === 'MEDICO_CONSERVADOR' ? 'Conservador' : 'Quirúrgico'}
                          </span>
                        ) : (
                          <span className="text-slate-700">Doble antiagregación</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {r.strokeType === 'ISQUEMICO' && `mRS ${r.ischemicData?.modifiedRankinDischarge ?? '-'}`}
                        {r.strokeType === 'HEMORRAGICO' && `mRS ${r.hemorrhagicData?.modifiedRankinDischarge ?? '-'}`}
                        {r.strokeType === 'AIT' && '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedRecord(r);
                            setIsModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-purple-100 text-purple-800 font-bold text-[11px] transition-colors inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Crear o Editar */}
      {isModalOpen && (
        <StrokeRegistryModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRecord(null);
          }}
          existingRecord={selectedRecord}
          onSaved={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};
