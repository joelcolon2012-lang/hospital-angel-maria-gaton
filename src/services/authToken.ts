/**
 * Token de sesión entregado por el servidor central al iniciar sesión con el PIN.
 * Se envía en cada sincronización; sin él, el servidor no entrega datos clínicos.
 */
const LS_TOKEN = 'hr_colon_auth_token_v1';

interface StoredToken {
  token: string;
  userId: string;
  backend: string;
}

function read(): StoredToken | null {
  try {
    const raw = localStorage.getItem(LS_TOKEN);
    return raw ? (JSON.parse(raw) as StoredToken) : null;
  } catch {
    return null;
  }
}

export const authToken = {
  set(token: string, userId: string, backend: string) {
    try {
      localStorage.setItem(LS_TOKEN, JSON.stringify({ token, userId, backend }));
    } catch {}
  },
  clear() {
    try {
      localStorage.removeItem(LS_TOKEN);
    } catch {}
  },
  get(): string | null {
    return read()?.token || null;
  },
  userId(): string | null {
    return read()?.userId || null;
  },
  /** Encabezados para las peticiones al servidor central. */
  headers(): Record<string, string> {
    const t = read()?.token;
    return t ? { Authorization: `Bearer ${t}` } : {};
  }
};

/** Aviso global: el servidor pidió iniciar sesión de nuevo (token ausente o vencido). */
export const AUTH_REQUIRED_EVENT = 'hr-auth-required';
