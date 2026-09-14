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
  EyeOff,
  CheckCircle2, 
  LogIn,
  KeyRound,
  AlertCircle,
  UserPlus,
  Crown,
  Building2,
  Sparkles,
  FileCheck2
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  canClose?: boolean;
  onClose: () => void;
  onUserChanged: (user: User) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1594824813583-74b88d2d9b62?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=120&auto=format&fit=crop&q=80',
];

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  canClose = true,
  onClose,
  onUserChanged
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [usersList, setUsersList] = useState<User[]>(DEFAULT_USERS);
  const [selectedUserForPin, setSelectedUserForPin] = useState<User | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulario de Registro de Nuevo Médico
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('MÉDICO');
  const [regSpecialty, setRegSpecialty] = useState('');
  const [regExequatur, setRegExequatur] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regPinConfirm, setRegPinConfirm] = useState('');
  const [regAvatar, setRegAvatar] = useState(PRESET_AVATARS[0]);
  const [regError, setRegError] = useState('');

  useEffect(() => {
    if (isOpen) {
      authService.getAllUsers().then(list => {
        setUsersList(list);
      });
      setSelectedUserForPin(null);
      setEnteredPin('');
      setAuthError('');
      setRegError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectUser = (user: User) => {
    setSelectedUserForPin(user);
    setEnteredPin('');
    setAuthError('');
  };

  const handleConfirmPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPin) return;

    if (!enteredPin.trim()) {
      setAuthError('Por favor introduzca su código PIN o contraseña.');
      return;
    }

    setIsSubmitting(true);
    setAuthError('');

    try {
      const res = await authService.authenticate(selectedUserForPin.id, enteredPin.trim());
      if (res.success && res.user) {
        onUserChanged(res.user);
        onClose();
      } else {
        setAuthError(res.error || 'Código PIN o contraseña incorrecta.');
      }
    } catch (err: any) {
      setAuthError('Error de autenticación: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName.trim()) {
      setRegError('El nombre completo es obligatorio.');
      return;
    }
    if (!regExequatur.trim()) {
      setRegError('El número de Exequátur legal dominicano es obligatorio.');
      return;
    }
    if (!regPin.trim() || regPin.length < 4) {
      setRegError('La contraseña o PIN debe tener al menos 4 caracteres.');
      return;
    }
    if (regPin !== regPinConfirm) {
      setRegError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authService.registerNewUser({
        name: regName.trim(),
        role: regRole,
        specialty: regSpecialty.trim() || 'Médico Especialista',
        exequatur: regExequatur.trim(),
        email: regEmail.trim() || undefined,
        pin: regPin.trim(),
        avatarUrl: regAvatar,
      });

      if (res.success && res.user) {
        onUserChanged(res.user);
        onClose();
      } else {
        setRegError(res.error || 'Error al registrar el usuario.');
      }
    } catch (err: any) {
      setRegError('Error inesperado: ' + err.message);
    } finally {
      setIsSubmitting(false);
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
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/85 backdrop-blur-md animate-fade-in select-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0" 
        onClick={() => {
          if (canClose) onClose();
        }} 
      />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] z-10 animate-scale-up">
        
        {/* Encabezado Institucional */}
        <div className="bg-[#0F4C5C] text-white p-5 flex items-center justify-between border-b border-teal-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-teal-200 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg tracking-tight">
                  Control de Acceso & Firmas Hospitalarias
                </h3>
                <span className="text-[10px] bg-teal-400/20 text-teal-200 px-2 py-0.5 rounded-md border border-teal-300/30 uppercase font-black tracking-wide">
                  Seguridad Médica
                </span>
              </div>
              <p className="text-xs text-teal-100/90 mt-0.5">
                Hospital Regional Dr. Ángel María Gatón • Atribución estricta de notas, órdenes y expedientes
              </p>
            </div>
          </div>

          {canClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-teal-100 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Barra de Tabs: Iniciar Sesión vs Crear Cuenta */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('login');
              setAuthError('');
            }}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-white text-[#0F4C5C] shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>1. Iniciar Sesión en Turno</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('register');
              setRegError('');
            }}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'bg-[#0F4C5C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>2. Crear Nueva Cuenta Médica</span>
          </button>
        </div>

        {/* Contenido según Tab */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* ========================================================================= */}
          {/* TAB 1: INICIAR SESIÓN                                                     */}
          {/* ========================================================================= */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              <div className="bg-teal-50/60 border border-teal-200/80 rounded-2xl p-3.5 flex items-center gap-3">
                <Lock className="w-4 h-4 text-[#0F4C5C] shrink-0" />
                <p className="text-xs text-slate-700 leading-relaxed">
                  Seleccione su perfil médico e introduzca su contraseña o código PIN. Todo dato introducido quedará legalmente estampado a su nombre.
                </p>
              </div>

              {/* Si NO se ha seleccionado un usuario, mostrar listado */}
              {!selectedUserForPin ? (
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Médicos y Personal Habilitado ({usersList.length}):
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                    {usersList.map((user) => {
                      const isColon = user.isSuperAdmin || user.id === 'usr-admin-colon';
                      return (
                        <div
                          key={user.id}
                          onClick={() => handleSelectUser(user)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 hover:scale-[1.01] ${
                            isColon
                              ? 'bg-purple-50/70 border-purple-300/80 hover:border-purple-400 shadow-2xs'
                              : 'bg-white border-slate-200 hover:border-teal-400 hover:shadow-xs'
                          }`}
                        >
                          <img
                            src={user.avatarUrl || PRESET_AVATARS[0]}
                            alt={user.name}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="font-bold text-xs text-slate-900 truncate flex items-center gap-1">
                                <span>{user.name}</span>
                                {isColon && (
                                  <Crown className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                                )}
                              </h4>
                            </div>

                            <span className={`inline-block mt-0.5 text-[9px] font-black px-1.5 py-0.2 rounded border uppercase tracking-wider ${getRoleBadge(user)}`}>
                              {isColon ? 'SUPERADMIN' : user.role}
                            </span>

                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {user.specialty}
                            </p>

                            <p className="text-[10px] font-mono font-bold text-teal-800 mt-0.5">
                              {user.exequatur || 'Sin Exequátur'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 text-center">
                    <p className="text-xs text-slate-500">
                      ¿Es su primer turno o no aparece en la lista?{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('register')}
                        className="text-[#0F4C5C] font-bold underline hover:text-teal-700 cursor-pointer"
                      >
                        Crear una cuenta médica ahora
                      </button>
                    </p>
                  </div>
                </div>
              ) : (
                /* Formulario de Confirmación de Contraseña / PIN */
                <form onSubmit={handleConfirmPin} className="space-y-4 animate-scale-up">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={selectedUserForPin.avatarUrl || PRESET_AVATARS[0]}
                        alt={selectedUserForPin.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-300 shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 truncate flex items-center gap-1.5">
                          <span>{selectedUserForPin.name}</span>
                          {(selectedUserForPin.isSuperAdmin || selectedUserForPin.id === 'usr-admin-colon') && (
                            <Crown className="w-4 h-4 text-purple-700 shrink-0" />
                          )}
                        </h4>
                        <p className="text-xs text-slate-600 truncate">{selectedUserForPin.specialty}</p>
                        <p className="text-[11px] font-mono font-bold text-teal-800">{selectedUserForPin.exequatur}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserForPin(null);
                        setEnteredPin('');
                        setAuthError('');
                      }}
                      className="text-xs font-semibold text-[#0F4C5C] hover:underline cursor-pointer"
                    >
                      Cambiar médico
                    </button>
                  </div>

                  {/* Vista previa de la firma oficial */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-[11px] space-y-1">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Firma Legal que Aparecerá en sus Documentos:</span>
                    </span>
                    <div className="pl-5 text-slate-600 font-mono">
                      <div>{selectedUserForPin.name}</div>
                      <div>{selectedUserForPin.specialty}</div>
                      <div className="font-bold text-slate-800">{selectedUserForPin.exequatur}</div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Contraseña o Código PIN de Seguridad:
                    </label>
                    <div className="relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        value={enteredPin}
                        onChange={(e) => setEnteredPin(e.target.value)}
                        placeholder="••••"
                        autoFocus
                        required
                        className="w-full px-4 py-3 rounded-2xl border border-slate-300 bg-white text-slate-900 text-sm font-mono tracking-widest focus:ring-2 focus:ring-[#0F4C5C] outline-none pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {selectedUserForPin.id === 'usr-admin-colon' && (
                      <p className="text-[11px] text-purple-800 font-medium">
                        * PIN oficial de Administrador del Dr. Joel Colón: <strong>2026</strong>
                      </p>
                    )}
                  </div>

                  {authError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-bold rounded-2xl shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Iniciar Sesión & Desbloquear Sistema</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: CREAR CUENTA MÉDICA                                                */}
          {/* ========================================================================= */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5">
                <Award className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-relaxed">
                  <strong>Registro Obligatorio de Personal:</strong> Todos los médicos tratantes, residentes e internos deben poseer su propia cuenta. Las recetas, órdenes médicas, notas de ingreso y evoluciones quedarán irreversiblemente registradas bajo su autoría legal.
                </p>
              </div>

              {regError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre Completo con Título: *
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ej: Dra. Carmen Almonte"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rol Hospitalario: *
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#0F4C5C] outline-none bg-white"
                  >
                    <option value="MÉDICO">MÉDICO ESPECIALISTA / TRATANTE</option>
                    <option value="RESIDENTE">MÉDICO RESIDENTE</option>
                    <option value="ADMINISTRADOR">ADMINISTRADOR CLÍNICO</option>
                    <option value="LECTURA">ENFERMERÍA / AUDITORÍA CLÍNICA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Especialidad Médica: *
                  </label>
                  <input
                    type="text"
                    value={regSpecialty}
                    onChange={(e) => setRegSpecialty(e.target.value)}
                    placeholder="Ej: Medicina Interna / Emergenciología"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Exequátur Oficial Dominicano: *
                  </label>
                  <input
                    type="text"
                    value={regExequatur}
                    onChange={(e) => setRegExequatur(e.target.value)}
                    placeholder="Ej: EXEQ. 78945-25"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo o Usuario Institucional:
                  </label>
                  <input
                    type="text"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="carmen.almonte@hospital.gob.do"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contraseña o Código PIN (mín. 4 caracteres): *
                  </label>
                  <input
                    type="password"
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                    placeholder="••••"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirmar Contraseña / PIN: *
                  </label>
                  <input
                    type="password"
                    value={regPinConfirm}
                    onChange={(e) => setRegPinConfirm(e.target.value)}
                    placeholder="••••"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                  />
                </div>
              </div>

              {/* Selector de Avatar */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-700">
                  Seleccionar Foto de Perfil:
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {PRESET_AVATARS.map((avatar, idx) => (
                    <img
                      key={idx}
                      src={avatar}
                      alt={`Avatar ${idx}`}
                      onClick={() => setRegAvatar(avatar)}
                      className={`w-10 h-10 rounded-xl object-cover cursor-pointer border-2 transition-all ${
                        regAvatar === avatar
                          ? 'border-[#0F4C5C] scale-105 shadow-xs ring-2 ring-teal-300'
                          : 'border-slate-200 opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-bold rounded-2xl shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>Crear Cuenta Médica & Entrar al Turno</span>
              </button>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            {activeTab === 'login' ? 'Acceso exclusivo personal autorizado' : 'Registro oficial de firmas médicas'}
          </span>
          <span className="font-semibold text-slate-700">
            Dr. Joel Colón • Director
          </span>
        </div>
      </div>
    </div>
  );
};
