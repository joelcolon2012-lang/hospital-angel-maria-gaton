import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, User, Camera, Save, CheckCircle2, AlertCircle, Lock, Crown, Stethoscope, Trash2, Mail, Phone, BadgeCheck, Loader2
} from 'lucide-react';
import { User as UserType } from '../../types';
import { authService } from '../../services/authService';
import { compressAvatar } from '../../services/imageTools';
import { UserAvatar } from '../common/UserAvatar';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  onUserUpdated?: (updated: UserType) => void;
}

const ROLE_LABEL: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  'MÉDICO': 'Médico',
  RESIDENTE: 'Residente',
  LECTURA: 'Solo lectura'
};

const inputCls =
  'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] text-slate-800 outline-none text-sm';

/**
 * Perfil del médico en sesión: foto, datos profesionales y PIN.
 * Los cambios se guardan en el dispositivo y se sincronizan a todos los demás
 * (también sin señal: se envían al reconectar). El PIN sí requiere conexión.
 */
export const UserProfileModal: React.FC<Props> = ({ isOpen, onClose, currentUser, onUserUpdated }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [exequatur, setExequatur] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Cargar SIEMPRE los datos actuales al abrir (antes quedaban los de la primera apertura)
  useEffect(() => {
    if (!isOpen) return;
    const u = authService.getCurrentUser() || currentUser;
    setName(u.name || '');
    setEmail(u.email || '');
    setPhone(u.phone || '');
    setSpecialty(u.specialty || '');
    setExequatur(u.exequatur || '');
    setAvatarUrl(u.avatarUrl || '');
    setCurrentPin('');
    setNewPassword('');
    setConfirmPassword('');
    setSuccessMsg('');
    setErrorMsg('');
  }, [isOpen, currentUser?.id]);

  if (!isOpen) return null;

  const isSuperAdmin = authService.isSuperAdmin();

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMsg('');
    setIsProcessingPhoto(true);
    try {
      setAvatarUrl(await compressAvatar(file));
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo usar esa imagen.');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const wantsPin = Boolean(currentPin || newPassword || confirmPassword);
    if (wantsPin) {
      if (!currentPin) return setErrorMsg('Escriba su PIN actual para poder cambiarlo.');
      if (newPassword.trim().length < 4) return setErrorMsg('El PIN nuevo debe tener al menos 4 caracteres.');
      if (newPassword !== confirmPassword) return setErrorMsg('El PIN nuevo y su confirmación no coinciden.');
    }
    if (!name.trim()) return setErrorMsg('El nombre no puede quedar vacío.');

    setIsSaving(true);
    try {
      const result = await authService.updateProfile(currentUser.id, {
        name,
        email,
        phone,
        specialty,
        exequatur,
        avatarUrl
      });
      if (!result.success) throw new Error(result.error || 'Error al guardar el perfil.');

      let pinMsg = '';
      if (wantsPin) {
        const pwd = await authService.resetPassword(currentUser.id, newPassword, confirmPassword, currentPin);
        if (!pwd.success) {
          // El perfil sí se guardó; sólo falló el PIN
          setErrorMsg(`Perfil guardado, pero el PIN no se cambió: ${pwd.error}`);
          if (result.user && onUserUpdated) onUserUpdated(result.user);
          return;
        }
        pinMsg = ' PIN actualizado: en los demás dispositivos se pedirá el PIN nuevo.';
      }

      setSuccessMsg(
        (result.offline
          ? 'Perfil guardado en este dispositivo. Se enviará a los demás en cuanto vuelva la conexión.'
          : 'Perfil guardado. Se actualiza en todos los dispositivos.') + pinMsg
      );
      setCurrentPin('');
      setNewPassword('');
      setConfirmPassword('');
      if (result.user && onUserUpdated) onUserUpdated(result.user);
      setTimeout(onClose, 1600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99995] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col my-auto animate-scale-up">
        {/* Encabezado */}
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
              <p className="text-[11px] text-teal-100/80">Hospital Regional Dr. Ángel María Gatón</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-xl hover:bg-white/10 text-teal-100 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveProfile} className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {successMsg && (
            <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-900 flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div role="alert" className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-xs font-bold text-rose-900 flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Foto */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-md shrink-0 cursor-pointer bg-[#0F4C5C]"
              title="Cambiar foto"
              aria-label="Cambiar foto de perfil"
            >
              <UserAvatar user={{ name, avatarUrl }} className="w-full h-full" textClassName="text-2xl" />
              <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                {isProcessingPhoto ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
              </span>
            </button>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <div className="text-xs font-bold text-slate-800">Foto de perfil</div>
              <p className="text-[11px] text-slate-500">
                Desde el celular puede tomarla con la cámara o elegirla de la galería. Se ajusta sola y se ve en todos los dispositivos.
              </p>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingPhoto}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-3.5 h-3.5 text-teal-700" />
                  <span>{avatarUrl ? 'Cambiar foto' : 'Subir foto'}</span>
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-300 rounded-xl text-xs font-bold text-rose-700 transition-all active:scale-95 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Quitar foto</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Datos profesionales */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#0F4C5C]">
              <Stethoscope className="w-4 h-4" />
              <span>Información profesional y firma</span>
            </h4>

            <div className="space-y-3">
              <div>
                <label htmlFor="pf-name" className="block text-[11px] font-bold text-slate-600 mb-1">Nombre completo</label>
                <input id="pf-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" className={`${inputCls} font-semibold`} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pf-specialty" className="block text-[11px] font-bold text-slate-600 mb-1">Especialidad / cargo</label>
                  <input id="pf-specialty" type="text" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Ej: Medicina Interna" className={inputCls} />
                </div>
                <div>
                  <label htmlFor="pf-exeq" className="block text-[11px] font-bold text-slate-600 mb-1">Exequátur</label>
                  <input id="pf-exeq" type="text" value={exequatur} onChange={(e) => setExequatur(e.target.value)} placeholder="EXEQ. 00000-00" className={`${inputCls} font-mono`} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pf-email" className="block text-[11px] font-bold text-slate-600 mb-1">
                    <Mail className="inline w-3 h-3 mr-1" />Correo
                  </label>
                  <input id="pf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="nombre@correo.com" className={inputCls} />
                </div>
                <div>
                  <label htmlFor="pf-phone" className="block text-[11px] font-bold text-slate-600 mb-1">
                    <Phone className="inline w-3 h-3 mr-1" />Teléfono
                  </label>
                  <input id="pf-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="809-000-0000" className={inputCls} />
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <BadgeCheck className="w-3.5 h-3.5 text-teal-700" />
                <span>
                  Rol: <b className="text-slate-700">{isSuperAdmin ? 'Administrador principal' : ROLE_LABEL[currentUser.role] || currentUser.role}</b>
                  {!isSuperAdmin && ' (solo el administrador puede cambiarlo)'}
                </span>
              </div>
            </div>
          </div>

          {/* PIN */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#0F4C5C]">
              <Lock className="w-4 h-4" />
              <span>Cambiar PIN (opcional)</span>
            </h4>
            <p className="text-[11px] text-slate-500">Déjelo en blanco si no desea cambiarlo. Para cambiarlo se necesita conexión.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="pf-cur" className="block text-[11px] font-bold text-slate-600 mb-1">PIN actual</label>
                <input id="pf-cur" type="password" inputMode="numeric" value={currentPin} onChange={(e) => setCurrentPin(e.target.value)} autoComplete="current-password" className={`${inputCls} font-mono`} />
              </div>
              <div>
                <label htmlFor="pf-new" className="block text-[11px] font-bold text-slate-600 mb-1">PIN nuevo</label>
                <input id="pf-new" type="password" inputMode="numeric" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" className={`${inputCls} font-mono`} />
              </div>
              <div>
                <label htmlFor="pf-conf" className="block text-[11px] font-bold text-slate-600 mb-1">Confirmar PIN nuevo</label>
                <input id="pf-conf" type="password" inputMode="numeric" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" className={`${inputCls} font-mono`} />
              </div>
            </div>
          </div>

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
              disabled={isSaving || isProcessingPhoto}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-emerald-300" />}
              <span>{isSaving ? 'Guardando…' : 'Guardar cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
