import React, { useState, useEffect } from 'react';
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
  LogIn,
  KeyRound,
  AlertCircle
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
  const [usersList, setUsersList] = useState<User[]>(DEFAULT_USERS);
  const [selectedUserForPin, setSelectedUserForPin] = useState<User | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (isOpen) {
      authService.getAllUsers().then(list => setUsersList(list));
      setCurrentUser(authService.getCurrentUser());
      setSelectedUserForPin(null);
      setEnteredPin('');
      setAuthError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectUser = (user: User) => {
    // Si el usuario tiene PIN, solicitamos confirmación
    if (user.pin) {
      setSelectedUserForPin(user);
      setEnteredPin('');
      setAuthError('');
    } else {
      finalizeLogin(user);
    }
  };

  const finalizeLogin = (user: User) => {
    authService.setCurrentUser(user);
    setCurrentUser(user);
    onUserChanged(user);
    onClose();
  };

  const handleConfirmPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPin) return;

    const res = await authService.authenticate(selectedUserForPin.id, enteredPin);
    if (res.success && res.user) {
      finalizeLogin(res.user);
    } else {
      setAuthError(res.error || 'PIN o contraseña incorrecta');
    }
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

  const getRoleBadge = (user: User) => {
    if (user.isSuperAdmin || user.id === 'usr-admin-colon') {
      return 'bg-purple-100 text-purple-900 border-purple-300 font-black';
    }
    switch (user.role) {
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-fade-in max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0F4C5C] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-teal-300">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Control de Acceso y Firmas Médicas</h2>
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

        {/* Current Active Session Banner */}
        <div className="p-4 bg-teal-50/80 border-b border-teal-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120'}
              alt={currentUser.name}
              className="w-11 h-11 rounded-full object-cover border-2 border-teal-600 shadow-xs"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-slate-500 font-medium">Médico en Turno Activo</p>
                {(currentUser.isSuperAdmin || currentUser.id === 'usr-admin-colon') && (
                  <span className="text-[10px] bg-purple-700 text-white font-bold px-1.5 py-0.2 rounded">
                    SUPERADMIN
                  </span>
                )}
              </div>
              <h4 className="text-sm font-black text-slate-900 leading-tight">{currentUser.name}</h4>
              <p className="text-[11px] text-slate-600">{currentUser.specialty}</p>
              {currentUser.exequatur && (
                <p className="text-[10px] font-mono text-teal-700 font-bold">{currentUser.exequatur}</p>
              )}
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getRoleBadge(currentUser)}`}>
            {currentUser.isSuperAdmin ? 'SUPERADMIN' : currentUser.role}
          </span>
        </div>

        {/* PIN verification overlay if user clicked a secured user */}
        {selectedUserForPin ? (
          <form onSubmit={handleConfirmPin} className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <img
                src={selectedUserForPin.avatarUrl}
                alt={selectedUserForPin.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-teal-500"
              />
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{selectedUserForPin.name}</h4>
                <p className="text-xs text-slate-500">{selectedUserForPin.specialty}</p>
                <p className="text-[11px] font-mono text-teal-700 font-semibold">{selectedUserForPin.exequatur}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Ingrese Código PIN o Contraseña:
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  autoFocus
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="PIN del médico (ej. 2026 o 1234)"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:bg-white outline-hidden"
                />
              </div>
              {authError && (
                <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {authError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedUserForPin(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-[#0F4C5C] hover:bg-[#0c3c49] text-white rounded-xl shadow-xs"
              >
                Acceder al Turno
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Seleccionar Médico de Turno / Iniciar Sesión
            </p>

            <div className="space-y-2.5">
              {usersList.map((user) => {
                const isSelected = user.id === currentUser.id;
                const isSuper = user.isSuperAdmin || user.id === 'usr-admin-colon';
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
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${getRoleBadge(user)}`}>
                            {isSuper ? 'SUPERADMIN' : user.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{user.specialty}</p>
                        {user.exequatur && (
                          <p className="text-[10px] font-mono text-slate-500 font-semibold">{user.exequatur}</p>
                        )}
                      </div>
                    </div>

                    {isSelected ? (
                      <div className="flex items-center gap-1 text-teal-700 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Sesión Activa</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="text-xs px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold shadow-2xs"
                      >
                        Cambiar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3.5 bg-purple-50/70 rounded-xl border border-purple-200 text-[11px] text-slate-700 space-y-1.5">
              <p className="font-bold text-purple-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                Seguridad & Exclusividad Institucional:
              </p>
              <p>• <strong>Dr. Joel Colón (SuperAdmin):</strong> Único facultado para modificar configuraciones del sistema, editor de plantillas, identidades y gestión de cuentas médicas.</p>
              <p>• <strong>Médicos y Residentes:</strong> Operación clínica plena. Todas las notas y órdenes generadas se firmarán automáticamente con el nombre y exequátur del médico que ingresó al sistema.</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 flex justify-between items-center">
          <p className="text-[11px] text-slate-500">
            Firma activa: <strong>{currentUser.name}</strong> ({currentUser.exequatur || 'Exeq. N/D'})
          </p>
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

