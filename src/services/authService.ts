import { User, UserRole, AuditLogEntry } from '../types';
import { db } from '../db/dexieDb';

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
    avatarUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=120&auto=format&fit=crop&q=80'
  }
];

const STORAGE_KEY = 'hr_angel_gaton_current_user';

export class AuthService {
  private currentUser: User = DEFAULT_USERS[0]; // Por defecto Dr. Colón

  constructor() {
    this.initUser();
  }

  private async initUser() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.currentUser = JSON.parse(saved);
      } else {
        this.currentUser = DEFAULT_USERS[0];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentUser));
      }

      const count = await db.users.count();
      if (count === 0) {
        await db.users.bulkPut(DEFAULT_USERS);
      }
    } catch {
      this.currentUser = DEFAULT_USERS[0];
    }
  }

  public getCurrentUser(): User {
    return this.currentUser;
  }

  public setCurrentUser(user: User) {
    this.currentUser = user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new CustomEvent('hospital_user_changed', { detail: user }));
  }

  public async getAllUsers(): Promise<User[]> {
    try {
      const users = await db.users.toArray();
      if (!users || users.length === 0) {
        await db.users.bulkPut(DEFAULT_USERS);
        return DEFAULT_USERS;
      }
      return users;
    } catch {
      return DEFAULT_USERS;
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
    const all = await this.getAllUsers();
    const found = all.find(u => u.id === id) || DEFAULT_USERS.find(u => u.id === id);
    if (found) {
      this.setCurrentUser(found);
      return found;
    }
    return this.currentUser;
  }

  public async authenticate(identifier: string, secret?: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const all = await this.getAllUsers();
    const cleanId = identifier.trim().toLowerCase();
    const user = all.find(u => 
      u.id.toLowerCase() === cleanId || 
      u.email.toLowerCase() === cleanId || 
      u.name.toLowerCase() === cleanId
    );

    if (!user) {
      return { success: false, error: 'Usuario no encontrado en el sistema hospitalario' };
    }

    if (secret && user.pin && user.pin !== secret && user.password !== secret) {
      return { success: false, error: 'Código PIN o contraseña incorrecta' };
    }

    this.setCurrentUser(user);
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
  action: 'CREAR' | 'MODIFICAR' | 'ELIMINAR_SUAVE' | 'RESTAURAR' | 'GENERAR_NOTA' | 'IMPORTAR_HISTORIA';
  patientId: string;
  fieldPath?: string;
  oldValue?: any;
  newValue?: any;
  details?: string;
}): Promise<AuditLogEntry> {
  const user = authService.getCurrentUser();
  const entry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: params.action,
    patientId: params.patientId,
    fieldPath: params.fieldPath,
    oldValue: params.oldValue,
    newValue: params.newValue,
    details: params.details
  };

  try {
    await db.auditLogs.add(entry);
  } catch (err) {
    console.error('No se pudo persistir registro de auditoría:', err);
  }

  return entry;
}
