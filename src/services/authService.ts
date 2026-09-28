import { User, UserRole, AuditLogEntry, AuditAction } from '../types';
import { db } from '../db/dexieDb';
import { syncEngine } from './syncEngine';
import { pinVerifier } from './pinVerifier';
import { authToken, AUTH_REQUIRED_EVENT } from './authToken';
import { cloudSyncService } from './cloudSyncService';
import { centralSyncService } from './centralSyncService';

export const DEFAULT_USERS: User[] = [
  {
    id: 'usr-admin-colon',
    name: 'Dr. Joel Colón',
    email: 'dr.colon@hospitalangelgaton.gob.do',
    role: 'ADMINISTRADOR',
    isSuperAdmin: true,
    specialty: 'Especialista en Medicina de Emergencias & Medicina Interna',
    exequatur: 'EXEQ. 45892-01',
    pin: '2026',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-med-guzman',
    name: 'Dra. Guzmán',
    email: 'dra.guzman@hospitalangelgaton.gob.do',
    role: 'MÉDICO',
    isSuperAdmin: false,
    specialty: 'Médico Especialista en Emergenciología',
    exequatur: 'EXEQ. 51204-12',
    pin: '1234',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    avatarUrl: 'https://images.unsplash.com/photo-1594824813583-74b88d2d9b62?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-res-martinez',
    name: 'Dr. Martínez',
    email: 'dr.martinez@hospitalangelgaton.gob.do',
    role: 'RESIDENTE',
    isSuperAdmin: false,
    specialty: 'Médico Residente de Medicina Interna R3',
    exequatur: 'EXEQ. 67812-24',
    pin: '1234',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-lec-santana',
    name: 'Licda. Santana',
    email: 'lic.santana@hospitalangelgaton.gob.do',
    role: 'LECTURA',
    isSuperAdmin: false,
    specialty: 'Auditoría Clínica & Personal de Enfermería',
    exequatur: 'EXEQ. 38901-08',
    pin: '1234',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    avatarUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=120&auto=format&fit=crop&q=80'
  }
];

const AUTH_NOTICE_KEY = 'hr_colon_auth_notice';
const STORAGE_KEY = 'hr_angel_gaton_current_user';
const SESSION_ACTIVE_KEY = 'hr_angel_gaton_session_active';

export class AuthService {
  private currentUser: User = DEFAULT_USERS[0]; // Por defecto Dr. Colón
  private sessionActive: boolean = false;
  private tokenPending = false;

  constructor() {
    this.initUser();
    // El servidor central pidió iniciar sesión (token ausente, vencido o PIN cambiado):
    // se muestra la pantalla de acceso. Los datos del dispositivo NO se borran.
    try {
      // Si el perfil del usuario en sesión cambió en OTRO dispositivo, actualizarlo aquí también
      window.addEventListener('hospital_central_data_changed', () => {
        this.refreshCurrentUserFromDb();
      });
    } catch {}
    try {
      window.addEventListener(AUTH_REQUIRED_EVENT, () => {
        if (!this.sessionActive || this.tokenPending) return;
        try {
          localStorage.setItem(AUTH_NOTICE_KEY, 'Por seguridad, inicie sesión con su PIN para sincronizar con la base central. Sus cambios siguen guardados en este dispositivo.');
        } catch {}
        this.logout();
      });
    } catch {}
  }

  private async refreshCurrentUserFromDb() {
    try {
      const id = this.currentUser?.id;
      if (!id) return;
      const fresh = await db.users.get(id);
      if (!fresh) return;
      const keys: (keyof User)[] = ['name', 'email', 'phone', 'specialty', 'exequatur', 'avatarUrl', 'role', 'isActive', 'isSuperAdmin'];
      const changed = keys.some((k) => (fresh as any)[k] !== (this.currentUser as any)[k]);
      if (changed) this.setCurrentUser({ ...this.currentUser, ...fresh });
    } catch {}
  }

  /** Mensaje que la pantalla de acceso muestra una vez (p. ej. "inicie sesión para sincronizar"). */
  public takeAuthNotice(): string {
    try {
      const m = localStorage.getItem(AUTH_NOTICE_KEY) || '';
      localStorage.removeItem(AUTH_NOTICE_KEY);
      return m;
    } catch {
      return '';
    }
  }

  /** Lista de médicos del servidor central (para dispositivos nuevos que aún no la tienen). */
  public async fetchRemoteUsers(): Promise<User[]> {
    try {
      const res = await fetch(`${syncEngine.getBackendUrl()}/api/users`, { cache: 'no-store', signal: AbortSignal.timeout?.(8000) });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json.users) ? json.users : [];
    } catch {
      return [];
    }
  }

  private async initUser() {
    try {
      const isSessionStored = localStorage.getItem(SESSION_ACTIVE_KEY) === 'true';
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && isSessionStored) {
        this.currentUser = JSON.parse(saved);
        this.sessionActive = true;
      } else {
        this.sessionActive = false;
        if (saved) {
          try {
            this.currentUser = JSON.parse(saved);
          } catch {
            this.currentUser = DEFAULT_USERS[0];
          }
        } else {
          this.currentUser = DEFAULT_USERS[0];
        }
      }

      // 1. Respaldo de seguridad local (LocalStorage fallback para proteger contra reseteos de caché de navegadores móviles)
      // Sólo restaura usuarios que FALTEN; nunca sobrescribe versiones más nuevas
      // (antes se reescribían en cada inicio y revertían cambios hechos en otros dispositivos).
      await syncEngine.withoutTracking(async () => {
        const backupUsersStr = localStorage.getItem('hr_colon_users_backup');
        if (backupUsersStr) {
          try {
            const parsed = JSON.parse(backupUsersStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const existing = await db.users.bulkGet(parsed.map((u: User) => u.id));
              const missing = parsed.filter((_: User, i: number) => !existing[i]);
              if (missing.length) await db.users.bulkPut(missing);
            }
          } catch {}
        }

        const count = await db.users.count();
        if (count === 0) {
          await db.users.bulkPut(DEFAULT_USERS);
        }
      });
    } catch {
      this.currentUser = DEFAULT_USERS[0];
      this.sessionActive = false;
    }
  }

  public isAuthenticated(): boolean {
    return this.sessionActive;
  }

  public hasActiveSession(): boolean {
    return this.sessionActive;
  }

  public getCurrentUser(): User {
    return this.currentUser;
  }

  public setCurrentUser(user: User) {
    this.currentUser = user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new CustomEvent('hospital_user_changed', { detail: user }));
  }

  public login(user: User): void {
    this.currentUser = user;
    this.sessionActive = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(SESSION_ACTIVE_KEY, 'true');
    window.dispatchEvent(new CustomEvent('hospital_user_changed', { detail: user }));
    window.dispatchEvent(new CustomEvent('hospital_auth_state_changed', { detail: { isAuthenticated: true, user } }));
    try {
      syncEngine.syncNow();
    } catch {}
  }

  /** Inicio sin respuesta del servidor (p. ej. se estaba despertando): pedir la sesión en segundo plano. */
  private acquireTokenInBackground(userId: string, pin: string) {
    let tries = 0;
    this.tokenPending = true;
    const attempt = async () => {
      tries++;
      if ((authToken.get() && authToken.userId() === userId) || this.currentUser?.id !== userId || !this.sessionActive) {
        this.tokenPending = false;
        return;
      }
      const r = await this.loginOnServer(userId, pin);
      if (r.user) {
        this.tokenPending = false;
        try {
          syncEngine.syncNow();
        } catch {}
        return;
      }
      // PIN rechazado por el servidor (p. ej. cambiado en otro dispositivo): pedir acceso de nuevo
      if (r.error && !/conexi[oó]n/i.test(r.error)) {
        this.tokenPending = false;
        window.dispatchEvent(new CustomEvent(AUTH_REQUIRED_EVENT));
        return;
      }
      if (tries < 6) setTimeout(attempt, 20000);
      else this.tokenPending = false;
    };
    setTimeout(attempt, 1000);
  }

  public logout(): void {
    this.sessionActive = false;
    authToken.clear();
    localStorage.removeItem(SESSION_ACTIVE_KEY);
    window.dispatchEvent(new CustomEvent('hospital_auth_state_changed', { detail: { isAuthenticated: false } }));
  }

  /**
   * Registro atómico de nuevo médico con persistencia en Backend Central y Realtime
   */
  public async registerNewUser(data: {
    name: string;
    role: UserRole;
    specialty: string;
    exequatur: string;
    email?: string;
    pin: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const cleanName = data.name.trim();
      const cleanExeq = data.exequatur.trim();
      const creator = this.currentUser?.name || 'Dr. Joel Colón';

      const payload = {
        name: cleanName,
        role: data.role,
        specialty: data.specialty.trim() || 'Médico Especialista',
        exequatur: cleanExeq,
        email: data.email?.trim() || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}@hospitalangelgaton.gob.do`,
        pin: data.pin.trim(),
        avatarUrl: data.avatarUrl || '',
        isActive: true,
        isDeleted: false
      };

      const newUser = await centralSyncService.createUser(payload, creator);

      // La cuenta nueva llega a los demás dispositivos por la sincronización.
      // El administrador que la crea SIGUE en su propia sesión.
      await syncEngine.withoutTracking(() => db.users.put(newUser));
      if (!this.sessionActive) {
        pinVerifier.remember(newUser.id, data.pin.trim());
        this.login(newUser);
      }

      return { success: true, user: newUser };
    } catch (err: any) {
      console.error('[registerNewUser Error]', err);
      const msg = String(err?.message || '');
      if (/sesi[oó]n requerida|administrador/i.test(msg)) {
        return { success: false, error: 'Solo el administrador puede crear cuentas nuevas. Inicie sesión como administrador y cree la cuenta desde allí.' };
      }
      return { success: false, error: 'Error registrando nuevo médico: ' + (msg || 'Error desconocido') };
    }
  }

  /**
   * Edición del perfil (propio, o de cualquier cuenta si es administrador).
   * Se guarda primero en este dispositivo y el motor de sincronización lo envía
   * a la base central campo por campo: funciona sin señal y el cambio aparece
   * en todos los dispositivos. Un campo vacío ("") también se sincroniza.
   */
  public async updateProfile(userId: string, changes: Partial<User>): Promise<{ success: boolean; user?: User; error?: string; offline?: boolean }> {
    try {
      const isAdmin = this.isSuperAdmin() || this.currentUser?.role === 'ADMINISTRADOR';
      if (userId !== this.currentUser?.id && !isAdmin) {
        return { success: false, error: 'Solo puede editar su propio perfil.' };
      }
      const allowed: (keyof User)[] = ['name', 'email', 'phone', 'specialty', 'exequatur', 'avatarUrl'];
      if (isAdmin) allowed.push('role');
      const clean: Partial<User> = {};
      for (const k of allowed) {
        if (changes[k] === undefined) continue;
        const v: any = changes[k];
        (clean as any)[k] = typeof v === 'string' ? (k === 'avatarUrl' ? v : v.trim()) : v;
      }
      if ('name' in clean && !clean.name) return { success: false, error: 'El nombre no puede quedar vacío.' };
      if (clean.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) {
        return { success: false, error: 'El correo electrónico no es válido.' };
      }
      if (clean.avatarUrl && clean.avatarUrl.length > 1_000_000) {
        return { success: false, error: 'La foto es demasiado grande. Elija otra imagen.' };
      }

      const existing = (await db.users.get(userId)) || (userId === this.currentUser?.id ? this.currentUser : null);
      if (!existing) return { success: false, error: 'Usuario no encontrado.' };
      const changedKeys = Object.keys(clean).filter((k) => (existing as any)[k] !== (clean as any)[k]);
      const now = new Date().toISOString();
      if (changedKeys.length) {
        const patch = { ...clean, updatedAt: now };
        const had = await db.users.get(userId);
        if (had) await db.users.update(userId, patch);
        else await db.users.put({ ...(existing as User), ...patch });
      }
      const saved = ((await db.users.get(userId)) || { ...existing, ...clean }) as User;
      if (userId === this.currentUser?.id) this.setCurrentUser({ ...this.currentUser, ...saved });
      if (changedKeys.length) {
        this.recordAudit({
          action: 'USER_UPDATED',
          recordId: userId,
          recordType: 'user',
          details: `Perfil actualizado (${changedKeys.map((k) => (k === 'avatarUrl' ? 'foto' : k)).join(', ')}) por ${this.currentUser?.name || ''}`
        }).catch(() => {});
        try {
          syncEngine.syncNow();
        } catch {}
      }
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      return { success: true, user: saved, offline };
    } catch (err: any) {
      return { success: false, error: err?.message || 'No se pudo guardar el perfil.' };
    }
  }

  /** Compatibilidad: edición desde Configuración (administrador). */
  public async updateUser(user: User): Promise<{ success: boolean; error?: string }> {
    const { name, email, phone, specialty, exequatur, avatarUrl, role } = user;
    return this.updateProfile(user.id, { name, email, phone, specialty, exequatur, avatarUrl, role });
  }

  /**
   * Cambio de PIN. Requiere conexión (el PIN se valida y guarda en el servidor).
   * Si es el propio PIN se exige el PIN actual y se recibe una sesión nueva,
   * así este dispositivo sigue conectado y los demás piden el PIN nuevo.
   */
  public async resetPassword(
    userId: string,
    newPassword: string,
    confirmPassword: string,
    currentPassword?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const editor = this.currentUser?.name || 'Dr. Joel Colón';
      const res = await centralSyncService.resetUserPassword(userId, newPassword, confirmPassword, editor, currentPassword);
      if (userId === this.currentUser?.id) {
        if (res.token) authToken.set(res.token, userId, syncEngine.getBackendUrl());
        pinVerifier.remember(userId, newPassword.trim());
      } else {
        // La huella local anterior de esa cuenta deja de ser válida en este dispositivo
        pinVerifier.forget(userId);
      }
      return { success: true };
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (/failed to fetch|network|load failed/i.test(msg)) {
        return { success: false, error: 'Para cambiar el PIN se necesita conexión a internet.' };
      }
      return { success: false, error: msg || 'Error restableciendo contraseña' };
    }
  }

  /** Foto de perfil (misma vía que el resto del perfil). */
  public async updateUserPhoto(userId: string, avatarUrl: string): Promise<{ success: boolean; user?: User; error?: string }> {
    return this.updateProfile(userId, { avatarUrl });
  }

  /**
   * Borrado Lógico (Soft Delete) de usuarios: PROHIBIDO DELETE FÍSICO
   */
  public async disableUser(userId: string): Promise<{ success: boolean; error?: string }> {
    if (userId === 'usr-admin-colon' || userId === this.currentUser.id) {
      return { success: false, error: 'No es posible desactivar al SuperAdmin institucional ni al usuario actualmente en sesión.' };
    }

    try {
      const editor = this.currentUser?.name || 'Dr. Joel Colón';
      await centralSyncService.toggleUserStatus(userId, false, editor);

      const target = await db.users.get(userId);
      if (target) {
        target.isActive = false;
        target.isDeleted = true;
        target.deletedAt = new Date().toISOString();
        await db.users.put(target);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Restaura un usuario previamente desactivado (Soft Delete Recovery)
   */
  public async restoreUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const editor = this.currentUser?.name || 'Dr. Joel Colón';
      await centralSyncService.toggleUserStatus(userId, true, editor);

      const target = await db.users.get(userId);
      if (target) {
        target.isActive = true;
        target.isDeleted = false;
        target.deletedAt = undefined;
        await db.users.put(target);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Obtiene todos los usuarios. Por defecto solo retorna usuarios activos.
   */
  public async getAllUsers(includeInactive: boolean = false): Promise<User[]> {
    try {
      const users = await db.users.toArray();
      if (!users || users.length === 0) {
        await syncEngine.withoutTracking(() => db.users.bulkPut(DEFAULT_USERS));
        return DEFAULT_USERS;
      }
      if (includeInactive) return users;
      return users.filter(u => u.isActive !== false && !u.isDeleted);
    } catch {
      return DEFAULT_USERS;
    }
  }

  /**
   * Registra un evento en la tabla de auditoría
   */
  public async recordAudit(entry: {
    action: AuditLogEntry['action'];
    patientId?: string;
    recordId?: string;
    recordType?: string;
    oldValue?: any;
    newValue?: any;
    details: string;
  }): Promise<void> {
    try {
      const now = new Date().toISOString();
      await db.auditLogs.add({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: now,
        userId: this.currentUser?.id || 'sys',
        userName: this.currentUser?.name || 'Sistema',
        userRole: this.currentUser?.role || 'Sistema',
        patientId: entry.patientId || 'SISTEMA',
        ...entry
      });
    } catch (e) {
      console.warn('Error registrando log de auditoría:', e);
    }
  }

  public async saveUser(user: User): Promise<void> {
    try {
      await db.users.put(user);
      if (this.currentUser.id === user.id) {
        this.setCurrentUser(user);
      }
    } catch (e) {
      console.warn('Error guardando usuario en Dexie:', e);
    }
  }

  public async switchUserById(id: string): Promise<User> {
    const all = await this.getAllUsers(false);
    const found = all.find(u => u.id === id) || DEFAULT_USERS.find(u => u.id === id);
    if (found) {
      this.login(found);
      return found;
    }
    return this.currentUser;
  }

  /**
   * Inicio de sesión seguro:
   *  1. El PIN se valida SIEMPRE contra el servidor central (fuente de verdad).
   *  2. Si el servidor responde, su decisión es definitiva.
   *  3. Sin conexión: se compara con la huella guardada en ESTE dispositivo tras
   *     el último inicio correcto (o con el PIN local de las cuentas creadas aquí).
   * Antes, las cuentas sincronizadas desde el servidor aceptaban cualquier PIN.
   */
  private async loginOnServer(identifier: string, pin: string): Promise<{ user?: User; error?: string }> {
    if (!identifier || !pin) return {};
    try {
      const res = await fetch(`${syncEngine.getBackendUrl()}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, pin }),
        cache: 'no-store',
        signal: AbortSignal.timeout?.(15000)
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && json.user) {
        if (json.token) authToken.set(json.token, json.user.id, syncEngine.getBackendUrl());
        return { user: json.user as User };
      }
      return { error: json.error };
    } catch {
      return { error: 'Sin conexión con el servidor central.' };
    }
  }

  public async authenticate(identifier: string, secret?: string): Promise<{ success: boolean; user?: User; error?: string; offline?: boolean }> {
    const all = await this.getAllUsers(true);
    const cleanId = identifier.trim().toLowerCase();
    const user = all.find(u =>
      u.id.toLowerCase() === cleanId ||
      (u.email || '').toLowerCase() === cleanId ||
      (u.name || '').toLowerCase() === cleanId
    );

    if (!user) {
      // Dispositivo nuevo: la cuenta existe en la base central pero aún no se ha descargado
      const remote = await this.loginOnServer(identifier.trim(), (secret || '').trim());
      if (remote.user) {
        await syncEngine.withoutTracking(() => db.users.put(remote.user as User));
        pinVerifier.remember(remote.user.id, (secret || '').trim());
        this.login(remote.user);
        return { success: true, user: remote.user };
      }
      return { success: false, error: remote.error || 'Usuario o médico no encontrado en el sistema hospitalario' };
    }
    if (user.isActive === false || user.isDeleted) {
      return { success: false, error: 'Esta cuenta médica se encuentra inactiva. Contacte al Administrador.' };
    }
    const pin = (secret || '').trim();
    if (!pin) {
      return { success: false, error: 'Introduzca su código PIN o contraseña.' };
    }

    // 1. Validación en el servidor central
    let serverReachable = false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000); // el servidor gratuito puede tardar en despertar
      const res = await fetch(`${syncEngine.getBackendUrl()}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: user.id, pin }),
        signal: controller.signal,
        cache: 'no-store'
      }).finally(() => clearTimeout(timer));
      const isJson = (res.headers.get('content-type') || '').includes('json');
      if (isJson && (res.ok || res.status === 401 || res.status === 400)) {
        serverReachable = true;
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success) {
          pinVerifier.remember(user.id, pin);
          if (json.token) authToken.set(json.token, user.id, syncEngine.getBackendUrl());
          const merged = { ...user, ...(json.user || {}) } as User;
          this.login(merged);
          return { success: true, user: merged };
        }
        // Si el usuario existe sólo en este dispositivo (aún no sincronizado), validar localmente
        const notOnServer = /no encontrado/i.test(json.error || '');
        if (!notOnServer) {
          pinVerifier.forget(user.id);
          return { success: false, error: json.error || 'Código PIN o contraseña incorrecta' };
        }
      }
    } catch {
      // sin conexión: continuar con la verificación local
    }

    // 2. Verificación local (sin señal, o cuenta creada en este dispositivo)
    // El PIN guardado en texto sólo vale en un dispositivo que NUNCA se ha conectado al
    // servidor (modo independiente). En los demás, sin señal sólo vale la huella del último
    // inicio confirmado por el servidor (así un cambio de PIN no se puede esquivar).
    const standaloneDevice = localStorage.getItem('hr_colon_has_synced') !== '1';
    const localOk =
      pinVerifier.check(user.id, pin) ||
      (standaloneDevice && Boolean((user as any).pin) && (user as any).pin === pin) ||
      (standaloneDevice && Boolean((user as any).password) && (user as any).password === pin);
    if (localOk) {
      pinVerifier.remember(user.id, pin);
      this.login(user);
      if (!(authToken.get() && authToken.userId() === user.id)) this.acquireTokenInBackground(user.id, pin);
      return { success: true, user, offline: !serverReachable };
    }

    if (!serverReachable && !pinVerifier.has(user.id)) {
      return {
        success: false,
        error: 'Sin conexión con el servidor. Inicie sesión una vez con conexión en este dispositivo para poder usarlo luego sin señal.'
      };
    }
    return { success: false, error: 'Código PIN o contraseña incorrecta' };
  }

  // Permisos según Rol Hospitalario (RBAC)
  public isSuperAdmin(): boolean {
    return Boolean(this.currentUser.isSuperAdmin || this.currentUser.id === 'usr-admin-colon');
  }

  // Dr. Joel Colón es el ÚNICO usuario con permiso para editar el programa y sus configuraciones
  public canEditSystemSettings(): boolean {
    return this.isSuperAdmin();
  }

  public canEditPatient(role?: UserRole): boolean {
    const r = role || this.currentUser.role;
    return r === 'ADMINISTRADOR' || r === 'MÉDICO' || r === 'RESIDENTE';
  }

  public canDeletePatient(role?: UserRole): boolean {
    return this.isSuperAdmin();
  }

  public canRestorePatient(role?: UserRole): boolean {
    return this.isSuperAdmin();
  }

  public canGenerateOfficialDocs(role?: UserRole): boolean {
    const r = role || this.currentUser.role;
    return r === 'ADMINISTRADOR' || r === 'MÉDICO' || r === 'RESIDENTE';
  }

  public canAccessAuditLogs(role?: UserRole): boolean {
    return this.isSuperAdmin();
  }

  /**
   * Obtiene la firma institucional activa para notas, órdenes, DOCX y PDFs.
   * Si hay un médico en sesión, se utiliza su nombre y exequátur.
   */
  public getActiveDoctorSignature(patientDoctorFallback?: string): {
    name: string;
    exequatur: string;
    specialty: string;
    role: string;
  } {
    const u = this.currentUser;
    const name = u.name || patientDoctorFallback || 'Dr. Joel Colón';
    const exequatur = u.exequatur || 'EXEQ. 45892-01';
    const specialty = u.specialty || 'Especialista en Medicina de Emergencias & Medicina Interna';
    const role = u.role || 'MÉDICO TRATANTE';

    return {
      name,
      exequatur,
      specialty,
      role
    };
  }
}

export const authService = new AuthService();

/**
 * Registra un evento en la pista de auditoría hospitalaria
 */
export async function recordAuditLog(params: {
  action: AuditAction;
  patientId: string;
  recordId?: string;
  recordType?: string;
  fieldPath?: string;
  oldValue?: any;
  newValue?: any;
  details?: string;
  device?: string;
  ip?: string;
}): Promise<AuditLogEntry> {
  const user = authService.getCurrentUser();
  const entry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema',
    userRole: user?.role || 'ADMINISTRADOR',
    action: params.action,
    patientId: params.patientId,
    recordId: params.recordId,
    recordType: params.recordType,
    fieldPath: params.fieldPath,
    oldValue: params.oldValue,
    newValue: params.newValue,
    details: params.details,
    device: params.device || (navigator.userAgent.includes('Mobile') ? 'Móvil' : 'Escritorio PC'),
    ip: params.ip
  };

  try {
    await db.auditLogs.add(entry);
  } catch (err) {
    console.error('No se pudo persistir registro de auditoría:', err);
  }

  return entry;
}
