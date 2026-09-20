import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, User, ShieldCheck, Camera, Key, Save, CheckCircle2, 
  AlertCircle, Lock, Crown, Stethoscope, Sparkles 
} from 'lucide-react';
import { User as UserType } from '../../types';
import { authService } from '../../services/authService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  onUserUpdated?: (updated: UserType) => void;
}

export const UserProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(currentUser.name || '');
  const [specialty, setSpecialty] = useState(currentUser.specialty || '');
  const [exequatur, setExequatur] = useState(currentUser.exequatur || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isSuperAdmin = authService.isSuperAdmin();

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('La imagen no debe superar los 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        setErrorMsg('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSaving(true);

    try {
      // 1. Validar contraseñas si el usuario ingresó algo
      if (newPassword || confirmPassword) {
        if (newPassword.length < 4) {
          throw new Error('La nueva contraseña/PIN debe tener al menos 4 caracteres.');
        }
        if (newPassword !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden. Verifique e intente nuevamente.');
        }

        const pwdResult = await authService.resetPassword(currentUser.id, newPassword, confirmPassword);
        if (!pwdResult.success) {
          throw new Error(pwdResult.error || 'Error al actualizar contraseña.');
        }
      }

      // 2. Actualizar datos personales y foto
      const updatedUser: UserType = {
        ...currentUser,
        name: name.trim() || currentUser.name,
        specialty: specialty.trim() || currentUser.specialty,
        exequatur: exequatur.trim() || currentUser.exequatur,
        avatarUrl: avatarUrl.trim() || currentUser.avatarUrl,
        updatedAt: new Date().toISOString()
      };

      const updateResult = await authService.updateUser(updatedUser);
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Error al guardar los datos del perfil.');
      }

      setSuccessMsg('¡Perfil médico actualizado exitosamente en todos los dispositivos!');
      setNewPassword('');
      setConfirmPassword('');
      if (onUserUpdated) onUserUpdated(updatedUser);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99995] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col my-auto animate-scale-up">
        {/* Header */}
        <div className="bg-[#0F4C5C] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <User className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-1.5">
                <span>Mi Perfil Médico</span>
                {isSuperAdmin && (
                  <span title="SuperAdmin Institucional">
                    <Crown className="w-4 h-4 text-amber-300" />
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-teal-100/80">
                Hospital Regional Dr. Ángel María Gatón
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-teal-100 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveProfile} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Mensajes de Feedback */}
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-900 flex items-center gap-2.5 animate-slide-down">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-xs font-bold text-rose-900 flex items-center gap-2.5 animate-slide-down">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Sección Foto de Perfil */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="relative group">
              <img
                src={avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120'}
                alt={currentUser.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Cambiar Foto"
              >
                <Camera className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-1.5 text-center sm:text-left flex-1">
              <div className="text-xs font-bold text-slate-800">Foto de Identificación Médica</div>
              <p className="text-[11px] text-slate-500">
                Se sincroniza en la nube y aparece en sus firmas oficiales en todos los dispositivos.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-teal-700" />
                <span>Subir Nueva Foto</span>
              </button>
            </div>
          </div>

          {/* Datos Personales */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-[#0F4C5C]">
              <Stethoscope className="w-4 h-4" />
              <span>Información Profesional & Firma</span>
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] font-semibold text-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Especialidad / Cargo:</label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="Ej: Médico Emergenciólogo"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Exequátur Oficial:</label>
                  <input
                    type="text"
                    value={exequatur}
                    onChange={(e) => setExequatur(e.target.value)}
                    placeholder="EXEQ. 00000-00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] font-mono text-slate-800 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seguridad y Cambio de Contraseña */}
          <div className="space-y-3.5 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-[#0F4C5C]">
              <Lock className="w-4 h-4" />
              <span>Seguridad & Cambio de PIN / Contraseña</span>
            </h4>

            <p className="text-[11px] text-slate-500">
              Deje estos campos en blanco si no desea modificar su contraseña actual.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Nueva Contraseña / PIN:</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••"
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] font-mono text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Confirmar Nueva Contraseña:</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••"
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] font-mono text-slate-800 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4 text-emerald-300" />
              <span>{isSaving ? 'Guardando en la Nube...' : 'Guardar Cambios de Perfil'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
