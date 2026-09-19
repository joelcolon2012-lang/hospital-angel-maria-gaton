import React, { useState } from 'react';
import { 
  X, 
  Home, 
  Users, 
  UserPlus, 
  FileText, 
  Activity, 
  BarChart3, 
  Settings, 
  ShieldCheck, 
  LogOut, 
  ChevronDown, 
  ChevronRight, 
  BrainCircuit, 
  Clock, 
  Pill, 
  FileCheck, 
  Stethoscope, 
  ShieldAlert,
  Search
} from 'lucide-react';
import { User } from '../../types';

interface MobileDrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onNavigate: (sectionId: string) => void;
  onOpenNewPatient: () => void;
  onOpenSettings: () => void;
  onOpenUsersManagement: () => void;
  onOpenStrokeRegistry: () => void;
  onLogout: () => void;
  patientCounts?: {
    active: number;
    emergency: number;
    ward: number;
  };
}

export const MobileDrawerMenu: React.FC<MobileDrawerMenuProps> = ({
  isOpen,
  onClose,
  currentUser,
  onNavigate,
  onOpenNewPatient,
  onOpenSettings,
  onOpenUsersManagement,
  onOpenStrokeRegistry,
  onLogout,
  patientCounts,
}) => {
  const [isHistoriesSubmenuOpen, setIsHistoriesSubmenuOpen] = useState(true);
  const [isStatsSubmenuOpen, setIsStatsSubmenuOpen] = useState(true);

  if (!isOpen) return null;

  const isAdmin = currentUser.role === 'ADMINISTRADOR' || currentUser.isSuperAdmin;

  const handleNavClick = (sectionId: string) => {
    onNavigate(sectionId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 left-0 w-[300px] max-w-[85vw] bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-300">
        {/* Header con Perfil Médico */}
        <div className="p-4 bg-gradient-to-br from-[#0F4C5C] to-[#0A323D] text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120'}
              alt={currentUser.name}
              className="w-10 h-10 rounded-xl object-cover border-2 border-teal-400 shrink-0"
            />
            <div className="min-w-0">
              <h3 className="font-bold text-sm truncate">{currentUser.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase bg-teal-800/90 text-teal-200 border border-teal-600/50">
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button: Nuevo Paciente */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => {
              onClose();
              onOpenNewPatient();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm active:scale-98 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Registrar Nuevo Paciente</span>
          </button>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 text-slate-700 text-xs font-semibold">
          {/* 1. Inicio / Triage */}
          <button
            onClick={() => handleNavClick('dashboard')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <Home className="w-4 h-4 text-slate-500" />
              <span>Inicio / Triage</span>
            </div>
            {patientCounts?.active ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                {patientCounts.active}
              </span>
            ) : null}
          </button>

          {/* 2. Pacientes */}
          <button
            onClick={() => handleNavClick('patients')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-slate-500" />
              <span>Directorio de Pacientes</span>
            </div>
            <Search className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* 3. Guardia Médica */}
          <button
            onClick={() => handleNavClick('ward')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Guardia Médica (Piso)</span>
            </div>
            {patientCounts?.ward ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {patientCounts.ward}
              </span>
            ) : null}
          </button>

          {/* 4. Historias Clínicas (Acordeón) */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setIsHistoriesSubmenuOpen(!isHistoriesSubmenuOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-400 hover:text-slate-700 text-left"
            >
              <span className="text-[10px] font-black uppercase tracking-wider">Historias Clínicas</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isHistoriesSubmenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isHistoriesSubmenuOpen && (
              <div className="pl-4 space-y-0.5 mt-1">
                <button
                  onClick={() => handleNavClick('history-planta')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-indigo-50 text-indigo-900 text-left"
                >
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Historia de Planta</span>
                </button>
                <button
                  onClick={() => handleNavClick('nota-ingreso')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 text-left"
                >
                  <FileCheck className="w-4 h-4 text-teal-600" />
                  <span>Nota de Ingreso</span>
                </button>
                <button
                  onClick={() => handleNavClick('evolutions')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 text-left"
                >
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Evoluciones Diarias</span>
                </button>
                <button
                  onClick={() => handleNavClick('orders')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 text-left"
                >
                  <Pill className="w-4 h-4 text-slate-500" />
                  <span>Órdenes Médicas</span>
                </button>
              </div>
            )}
          </div>

          {/* 5. Estadísticas & Módulo EVC (Acordeón) */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setIsStatsSubmenuOpen(!isStatsSubmenuOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-400 hover:text-slate-700 text-left"
            >
              <span className="text-[10px] font-black uppercase tracking-wider">Estadísticas & Reportes</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isStatsSubmenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isStatsSubmenuOpen && (
              <div className="pl-4 space-y-0.5 mt-1">
                <button
                  onClick={() => {
                    onClose();
                    onOpenStrokeRegistry();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-950 font-bold text-left border border-purple-200/60"
                >
                  <BrainCircuit className="w-4 h-4 text-purple-600" />
                  <span>Registro de EVC (Vascular)</span>
                </button>
                <button
                  onClick={() => handleNavClick('stats')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 text-left"
                >
                  <BarChart3 className="w-4 h-4 text-slate-500" />
                  <span>Estadísticas de Emergencia</span>
                </button>
                <button
                  onClick={() => handleNavClick('epidemiology')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 text-left"
                >
                  <Stethoscope className="w-4 h-4 text-slate-500" />
                  <span>Vigilancia Epidemiológica</span>
                </button>
              </div>
            )}
          </div>

          {/* 6. Administración & Ajustes */}
          <div className="pt-2 border-t border-slate-100 space-y-1">
            {isAdmin && (
              <button
                onClick={() => {
                  onClose();
                  onOpenUsersManagement();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-left text-slate-800"
              >
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Gestión de Usuarios & Médicos</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-left text-slate-800"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Configuración del Hospital</span>
            </button>
          </div>
        </div>

        {/* Footer: Cerrar Sesión */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-[10px] text-slate-400">
            v2.6 &bull; Dr. Joel Colón
          </div>
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
