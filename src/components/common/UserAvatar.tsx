import React, { useState } from 'react';
import { initialsOf } from '../../services/imageTools';

interface Props {
  user?: { name?: string; avatarUrl?: string } | null;
  className?: string;
  textClassName?: string;
}

/**
 * Foto del médico. Si no tiene foto (o no carga, p. ej. sin señal), muestra
 * sus iniciales en vez de una imagen rota o genérica.
 */
export const UserAvatar: React.FC<Props> = ({ user, className = 'w-8 h-8 rounded-full', textClassName = 'text-[11px]' }) => {
  const [failed, setFailed] = useState<string | null>(null);
  const src = user?.avatarUrl || '';
  if (src && failed !== src) {
    return <img src={src} alt={user?.name || ''} className={`${className} object-cover`} onError={() => setFailed(src)} />;
  }
  return (
    <span
      aria-label={user?.name || ''}
      className={`${className} inline-flex items-center justify-center bg-[#0F4C5C] text-white font-black select-none ${textClassName}`}
    >
      {initialsOf(user?.name)}
    </span>
  );
};

export default UserAvatar;
