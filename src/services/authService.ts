import { User, UserRole, AuditLogEntry } from '../types';
import { db } from '../db/dexieDb';

export const DEFAULT_USERS: User[] = [
  {
    id: 'usr-admin-colon',
    name: 'Dr. Colón',
    email: 'dr.colon@hospitalangelgaton.gob.do',
    role: 'ADMINISTRADOR',
    specialty: 'Especialista en Medicina de Emergencias & Medicina Interna',
    exequatur: 'EXEQ. 45892-01',
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-med-guzman',
    name: 'Dra. Guzmán',
    email: 'dra.guzman@hospitalangelgaton.gob.do',
    role: 'MÉDICO',
    specialty: 'Médico Especialista en Emergenciología',
    exequatur: 'EXEQ. 51204-12',
    avatarUrl: 'https://images.unsplash.com/photo-1594824813583-74b88d2d9b62?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-res-martinez',
    name: 'Dr. Martínez',
    email: 'dr.martinez@hospitalangelgaton.gob.do',
    role: 'RESIDENTE',
    specialty: 'Médico Residente de Medicina Interna R3',
    exequatur: 'EXEQ. 67812-24',
    avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-lec-santana',
    name: 'Licda. Santana',
    email: 'lic.santana@hospitalangelgaton.gob.do',
    role: 'LECTURA',
    specialty: 'Auditoría Clínica & Personal de Enfermería',
    exequatur: 'EXEQ. 38901-08',
    avatarUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=120&auto=format&fit=crop&q=80'
  }
];

const STORAGE_KEY = 'hr_angel_gaton_current_user';

export class AuthService {
  private currentUser: User = DEFAULT_USERS[0]; // Por defecto Dr. Colón

  constructor() {
    this.initUser();
  }

  private initUser() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.currentUser = JSON.parse(saved);
      } else {
        this.currentUser = DEFAULT_USERS[0];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentUser));
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
  }

  public switchUserById(id: string): User {
    const found = DEFAULT_USERS.find(u => u.id === id);
    if (found) {
      this.setCurrentUser(found);
      return found;
    }
    return this.currentUser;
  }

  // Permisos según Rol Hospitalario (RBAC)
  public canEditPatient(role?: UserRole): boolean {
    const r = role || this.currentUser.role;
    return r === 'ADMINISTRADOR' || r === 'MÉDICO' || r === 'RESIDENTE';
  }

  public canDeletePatient(role?: UserRole): boolean {
    const r = role || this.currentUser.role;
    return r === 'ADMINISTRADOR';
  }

  public canRestorePatient(role?: UserRole): boolean {
    const r = role || this.currentUser.role;
    return r === 'ADMINISTRADOR';
  }

  public canGenerateOfficialDocs(role?: UserRole): boolean {
    const r = role || this.currentUser.role;
    return r === 'ADMINISTRADOR' || r === 'MÉDICO' || r === 'RESIDENTE';
  }

  public canAccessAuditLogs(role?: UserRole): boolean {
    const r = role || this.currentUser.role;
    return r === 'ADMINISTRADOR';
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
