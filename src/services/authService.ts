import { User, UserRole, AuditLogEntry, AuditAction } from '../types';
import { db } from '../db/dexieDb';
import { cloudSyncService } from './cloudSyncService';

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

const STORAGE_KEY = 'hr_angel_gaton_current_user';
const SESSION_ACTIVE_KEY = 'hr_angel_gaton_session_active';

export class AuthService {
  private currentUser: User = DEFAULT_USERS[0]; // Por defecto Dr. Colón
  private sessionActive: boolean = false;

  constructor() {
    this.initUser();
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
      const backupUsersStr = localStorage.getItem('hr_colon_users_backup');
      if (backupUsersStr) {
        try {
          const parsed = JSON.parse(backupUsersStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            await db.users.bulkPut(parsed);
          }
        } catch {}
      }

      const count = await db.users.count();
      if (count === 0) {
        await db.users.bulkPut(DEFAULT_USERS);
      }
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
  }

  public logout(): void {
    this.sessionActive = false;
    localStorage.removeItem(SESSION_ACTIVE_KEY);
    window.dispatchEvent(new CustomEvent('hospital_auth_state_changed', { detail: { isAuthenticated: false } }));
  }

  /**
   * Registro atómico y transaccionado de nuevo médico con persistencia inmediata
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
      const all = await this.getAllUsers(true); // Incluyendo inactivos para evitar duplicar exequátur
      const cleanName = data.name.trim();
      const cleanExeq = data.exequatur.trim();

      // Verificar si ya existe usuario con el mismo exequátur o nombre
      const existing = all.find(u => 
        (u.exequatur && u.exequatur.trim().toLowerCase() === cleanExeq.toLowerCase()) ||
        u.name.trim().toLowerCase() === cleanName.toLowerCase()
      );

      if (existing) {
        if (existing.isDeleted || existing.isActive === false) {
          return { 
            success: false, 
            error: `El médico ${cleanName} (${cleanExeq}) se encuentra desactivado en el sistema. Puede reactivarlo desde el panel de Administración.` 
          };
        }
        return { 
          success: false, 
          error: `Ya existe un médico registrado con el nombre o exequátur: ${cleanName} (${cleanExeq}). Por favor inicie sesión o utilice sus credenciales.` 
        };
      }

      const now = new Date().toISOString();
      const newUser: User = {
        id: 'usr-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
        name: cleanName,
        email: data.email?.trim() || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}@hospitalangelgaton.gob.do`,
        role: data.role,
        isSuperAdmin: false,
        specialty: data.specialty.trim() || 'Médico Especialista',
        exequatur: cleanExeq,
        pin: data.pin.trim(),
        password: data.pin.trim(),
        isActive: true,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
        avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=80',
      };

      // Transacción atómica: insertar usuario y registrar en tabla de auditoría
      await db.transaction('rw', db.users, db.auditLogs, async () => {
        await db.users.put(newUser);
        await db.auditLogs.add({
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: now,
          userId: this.currentUser?.id || newUser.id,
          userName: this.currentUser?.name || newUser.name,
          userRole: this.currentUser?.role || newUser.role,
          action: 'USER_CREATED',
          patientId: 'SISTEMA',
          recordId: newUser.id,
          recordType: 'USER',
          newValue: { name: newUser.name, role: newUser.role, exequatur: newUser.exequatur },
          details: `Registro de nuevo usuario: ${newUser.name} (${newUser.role})`
        });
      });

      // Guardar respaldo inmediato en localStorage para tolerar desconexión
      try {
        const currentList = await db.users.toArray();
        localStorage.setItem('hr_colon_users_backup', JSON.stringify(currentList));
      } catch {}

      this.login(newUser);

      // Sincronizar inmediatamente a disco duro (/api/sync) y a Google Drive en la Nube
      cloudSyncService.triggerPushSync().catch(() => {});

      return { success: true, user: newUser };
    } catch (err: any) {
      return { success: false, error: 'Error registrando nuevo médico: ' + err.message };
    }
  }

  /**
   * Actualiza datos de un usuario mediante transacción segura
   */
  public async updateUser(user: User): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();
      const updated: User = {
        ...user,
        updatedAt: now
      };

      await db.transaction('rw', db.users, db.auditLogs, async () => {
        const oldUser = await db.users.get(user.id);
        await db.users.put(updated);
        await db.auditLogs.add({
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: now,
          userId: this.currentUser.id,
          userName: this.currentUser.name,
          userRole: this.currentUser.role,
          action: 'USER_UPDATED',
          patientId: 'SISTEMA',
          recordId: user.id,
          recordType: 'USER',
          oldValue: oldUser ? { name: oldUser.name, role: oldUser.role } : undefined,
          newValue: { name: updated.name, role: updated.role },
          details: `Actualización de usuario: ${updated.name}`
        });
      });

      if (this.currentUser.id === user.id) {
        this.setCurrentUser(updated);
      }

      // Actualizar respaldo y sincronización
      try {
        const currentList = await db.users.toArray();
        localStorage.setItem('hr_colon_users_backup', JSON.stringify(currentList));
      } catch {}

      cloudSyncService.triggerPushSync().catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Borrado Lógico (Soft Delete) de usuarios: PROHIBIDO DELETE FÍSICO
   */
  public async disableUser(userId: string): Promise<{ success: boolean; error?: string }> {
    if (userId === 'usr-admin-colon' || userId === this.currentUser.id) {
      return { success: false, error: 'No es posible desactivar al SuperAdmin institucional ni al usuario actualmente en sesión.' };
    }

    try {
      const targetUser = await db.users.get(userId);
      if (!targetUser) return { success: false, error: 'Usuario no encontrado.' };

      const now = new Date().toISOString();
      const disabled: User = {
        ...targetUser,
        isActive: false,
        isDeleted: true,
        deletedAt: now,
        updatedAt: now
      };

      await db.transaction('rw', db.users, db.auditLogs, async () => {
        await db.users.put(disabled);
        await db.auditLogs.add({
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: now,
          userId: this.currentUser.id,
          userName: this.currentUser.name,
          userRole: this.currentUser.role,
          action: 'USER_DISABLED',
          patientId: 'SISTEMA',
          recordId: userId,
          recordType: 'USER',
          oldValue: { isActive: true },
          newValue: { isActive: false, deletedAt: now },
          details: `Desactivación lógica (Soft Delete) del usuario: ${targetUser.name}`
        });
      });

      try {
        const currentList = await db.users.toArray();
        localStorage.setItem('hr_colon_users_backup', JSON.stringify(currentList));
      } catch {}

      cloudSyncService.triggerPushSync().catch(() => {});
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
      const targetUser = await db.users.get(userId);
      if (!targetUser) return { success: false, error: 'Usuario no encontrado.' };

      const now = new Date().toISOString();
      const restored: User = {
        ...targetUser,
        isActive: true,
        isDeleted: false,
        deletedAt: undefined,
        updatedAt: now
      };

      await db.transaction('rw', db.users, db.auditLogs, async () => {
        await db.users.put(restored);
        await db.auditLogs.add({
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: now,
          userId: this.currentUser.id,
          userName: this.currentUser.name,
          userRole: this.currentUser.role,
          action: 'USER_RESTORED',
          patientId: 'SISTEMA',
          recordId: userId,
          recordType: 'USER',
          oldValue: { isActive: false },
          newValue: { isActive: true },
          details: `Restauración de usuario médico: ${targetUser.name}`
        });
      });

      try {
        const currentList = await db.users.toArray();
        localStorage.setItem('hr_colon_users_backup', JSON.stringify(currentList));
      } catch {}

      cloudSyncService.triggerPushSync().catch(() => {});
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
        await db.users.bulkPut(DEFAULT_USERS);
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

  public async authenticate(identifier: string, secret?: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const all = await this.getAllUsers(true);
    const cleanId = identifier.trim().toLowerCase();
    const user = all.find(u => 
      u.id.toLowerCase() === cleanId || 
      u.email.toLowerCase() === cleanId || 
      u.name.toLowerCase() === cleanId
    );

    if (!user) {
      return { success: false, error: 'Usuario o médico no encontrado en el sistema hospitalario' };
    }

    if (user.isActive === false || user.isDeleted) {
      return { success: false, error: 'Esta cuenta médica se encuentra inactiva. Contacte al Administrador.' };
    }

    if (secret && user.pin && user.pin !== secret && user.password !== secret) {
      return { success: false, error: 'Código PIN o contraseña incorrecta' };
    }

    this.login(user);
    return { success: true, user };
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
