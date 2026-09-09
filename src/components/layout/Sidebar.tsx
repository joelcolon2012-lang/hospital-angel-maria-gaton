import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Flame,
  Building2,
  FlaskConical,
  Images,
  FileText,
  Pill,
  FolderArchive,
  Settings,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
} from 'lucide-react';

export type SidebarNavId =
  | 'dashboard'
  | 'patients'
  | 'emergencies'
  | 'ward'
  | 'labs'
  | 'studies'
  | 'notes'
  | 'orders'
  | 'files'
  | 'settings';

interface Props {
  activeNav: SidebarNavId;
  onSelectNav: (id: SidebarNavId) => void;
  onOpenNewPatient: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  patientCounts?: {
    active: number;
    emergency: number;
    ward: number;
  };
}

export const Sidebar: React.FC<Props> = ({
  activeNav,
  onSelectNav,
  onOpenNewPatient,
  isCollapsed,
  onToggleCollapse,
  patientCounts,
}) => {
  const menuItems = [
    {
      id: 'dashboard' as SidebarNavId,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'patients' as SidebarNavId,
      label: 'Pacientes',
      icon: Users,
      badge: patientCounts?.active,
    },
    {
      id: 'emergencies' as SidebarNavId,
      label: 'Emergencias',
      icon: Flame,
      badge: patientCounts?.emergency,
    },
    {
      id: 'ward' as SidebarNavId,
      label: 'Sala / Internamiento',
      icon: Building2,
      badge: patientCounts?.ward,
    },
    {
      id: 'labs' as SidebarNavId,
      label: 'Laboratorios',
      icon: FlaskConical,
    },
    {
      id: 'studies' as SidebarNavId,
      label: 'Estudios de Imagen',
      icon: Images,
    },
    {
      id: 'notes' as SidebarNavId,
      label: 'Notas Clínicas',
      icon: FileText,
    },
    {
      id: 'orders' as SidebarNavId,
      label: 'Órdenes Médicas',
      icon: Pill,
    },
    {
      id: 'files' as SidebarNavId,
      label: 'Archivos & Drive',
      icon: FolderArchive,
    },
    {
      id: 'settings' as SidebarNavId,
      label: 'Configuración & Nube',
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col bg-white border-r border-slate-200/80 transition-all duration-200 select-none z-30 shrink-0 ${
        isCollapsed ? 'w-[70px]' : 'w-[240px]'
      }`}
    >
      {/* Hospital Identity Mini-Brand */}
      <div className="h-[56px] px-3.5 flex items-center justify-between border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-[#0F4C5C] flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs">
            <Stethoscope className="w-4 h-4 text-emerald-300" />
          </div>
          {!isCollapsed && (
            <div className="leading-tight truncate">
              <h1 className="text-xs font-black text-slate-900 tracking-tight uppercase truncate">
                HR ÁNGEL M. GATÓN
              </h1>
              <p className="text-[10px] text-slate-400 font-medium truncate">
                Emergencias & Medicina
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          title={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Action Button: Nuevo Paciente */}
      <div className="p-2.5">
        <button
          onClick={onOpenNewPatient}
          className={`w-full flex items-center justify-center gap-2 bg-[#0F4C5C] hover:bg-[#134E5E] text-white rounded-[12px] font-semibold text-xs transition-all active:scale-[0.98] shadow-xs ${
            isCollapsed ? 'h-10 px-0' : 'h-10 px-3'
          }`}
          title="Registrar nuevo paciente"
        >
          <UserPlus className="w-4 h-4 text-emerald-300 shrink-0" />
          {!isCollapsed && <span className="truncate">Nuevo Paciente</span>}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-1 no-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-xs font-semibold transition-all select-none cursor-pointer ${
                isActive
                  ? 'bg-[#0F4C5C]/10 text-[#0F4C5C] font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-[#0F4C5C] stroke-[2.2]' : 'text-slate-400'
                }`}
              />
              {!isCollapsed && (
                <>
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                        isActive
                          ? 'bg-[#0F4C5C] text-white'
                          : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Mini Badge at Bottom */}
      <div className="p-2 border-t border-slate-100 shrink-0">
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded-xl bg-slate-50/80 border border-slate-100 ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
          {!isCollapsed && (
            <div className="text-[10px] text-slate-500 font-medium truncate">
              <span>Modo Clínico Activo</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
