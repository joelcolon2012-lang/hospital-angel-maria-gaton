import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { authService, DEFAULT_USERS } from '../../services/authService';
import { 
  X, 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  Award, 
  Stethoscope, 
  Shield, 
  Eye, 
  CheckCircle2, 
  LogIn 
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserChanged: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onUserChanged
}) => {
  const [currentUser, setCurrentUser] = useState<User>(authService.getCurrentUser());

  if (!isOpen) return null;

  const handleSelectUser = (user: User) => {
    authService.setCurrentUser(user);
    setCurrentUser(user);
    onUserChanged(user);
    onClose();
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'ADMINISTRADOR':
        return <ShieldCheck className="w-5 h-5 text-purple-600" />;
      case 'MÉDICO':
        return <Stethoscope className="w-5 h-5 text-teal-600" />;
      case 'RESIDENTE':
        return <Award className="w-5 h-5 text-blue-600" />;
      case 'LECTURA':
        return <Eye className="w-5 h-5 text-slate-600" />;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMINISTRADOR':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'MÉDICO':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'RESIDENTE':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'LECTURA':
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-fade-in">
        {/* Header */}
        <div className="bg-[#0F4C5C] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-teal-300">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Control de Acceso y Roles (RBAC)</h2>
              <p className="text-xs text-teal-100">Hospital Regional Dr. Ángel María Gatón</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-teal-100 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Session */}
        <div className="p-4 bg-teal-50/70 border-b border-teal-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120'}
              alt={currentUser.name}
              className="w-11 h-11 rounded-full object-cover border-2 border-teal-600 shadow-xs"
            />
            <div>
              <p className="text-xs text-slate-500 font-medium">Sesión Activa Actual</p>
              <h4 className="text-sm font-black text-slate-900 leading-tight">{currentUser.name}</h4>
              <p className="text-[11px] text-slate-600">{currentUser.specialty}</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getRoleBadge(currentUser.role)}`}>
            {currentUser.role}
          </span>
        </div>

        {/* User Selection List */}
        <div className="p-4 sm:p-6 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Cambiar de Profesional Médico
          </p>

          <div className="space-y-2.5">
            {DEFAULT_USERS.map((user) => {
              const isSelected = user.id === currentUser.id;
              return (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/50 shadow-xs ring-1 ring-teal-500'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-300"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-xs">
                        {getRoleIcon(user.role)}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">{user.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${getRoleBadge(user.role)}`}>
                          {user.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{user.specialty}</p>
                      {user.exequatur && (
                        <p className="text-[10px] font-mono text-slate-400">{user.exequatur}</p>
                      )}
                    </div>
                  </div>

                  {isSelected ? (
                    <div className="flex items-center gap-1 text-teal-700 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Activo</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-xs px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold"
                    >
                      Seleccionar
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <p className="font-bold text-slate-700">Políticas de Roles Hospitalarios:</p>
            <p>• <strong>ADMINISTRADOR (Dr. Colón):</strong> Control total, eliminación suave y restauración de expedientes, auditoría clínica.</p>
            <p>• <strong>MÉDICO / RESIDENTE:</strong> Registro, evolución, prescripción de órdenes, descarga de notas y documentos.</p>
            <p>• <strong>LECTURA:</strong> Consulta visual y triaje sin privilegios de edición o borrado.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
