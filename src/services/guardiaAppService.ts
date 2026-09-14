import { Patient, MedicalOrder, LabResult, PatientEvolution, User } from '../types';

export interface GuardiaBed {
  id: string;
  code: string;
  room: string;
  bedNumber: 'C1' | 'C2';
  service: 'MEDICINA_INTERNA_I' | 'MEDICINA_INTERNA_II';
  status: 'DISPONIBLE' | 'OCUPADA' | 'CRITICO' | 'INHABILITADA';
  currentPatientId?: string;
  currentPatientName?: string;
}

export const GUARDIA_BASE_URL = 'http://localhost:3100';

// Generador de las 32 camas predeterminadas del hospital
export function generateDefaultHospitalBeds(): GuardiaBed[] {
  const beds: GuardiaBed[] = [];
  for (let room = 301; room <= 316; room++) {
    const service = room >= 309 ? 'MEDICINA_INTERNA_II' : 'MEDICINA_INTERNA_I';
    ['C1', 'C2'].forEach((bNum) => {
      const code = `${room}-${bNum}`;
      beds.push({
        id: `bed-${code}`,
        code,
        room: String(room),
        bedNumber: bNum as 'C1' | 'C2',
        service,
        status: 'DISPONIBLE',
      });
    });
  }
  return beds;
}

class GuardiaAppService {
  private baseUrl = GUARDIA_BASE_URL;

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  /**
   * Comprueba si la aplicación de guardia está activa y respondiendo en la PC
   */
  async checkGuardiaStatus(): Promise<{ online: boolean; version?: string; message?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${this.baseUrl}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return {
          online: true,
          version: data.guardiaVersion || '1.0.0',
          message: 'Guardia Clínica conectada en vivo',
        };
      }
    } catch {
      // Offline o no iniciada
    }
    return {
      online: false,
      message: 'Guardia Clínica apagada (iniciar con Iniciar Guardia Clinica.cmd)',
    };
  }

  /**
   * Obtiene el mapa en tiempo real de las camas de Medicina Interna I y II
   */
  async fetchBedMap(): Promise<{ beds: GuardiaBed[]; online: boolean }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${this.baseUrl}/api/state`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.beds) && data.beds.length > 0) {
          const patientsMap = new Map<string, string>();
          (data.patients || []).forEach((p: any) => {
            patientsMap.set(p.id, p.fullName);
            if (p.hospital_patient_id) patientsMap.set(p.hospital_patient_id, p.fullName);
          });

          const mapped: GuardiaBed[] = data.beds.map((b: any) => ({
            id: b.id || `bed-${b.code}`,
            code: b.code,
            room: b.room || b.code.split('-')[0],
            bedNumber: (b.bedNumber || b.code.split('-')[1] || 'C1') as 'C1' | 'C2',
            service: b.service || (parseInt(b.code.split('-')[0], 10) >= 309 ? 'MEDICINA_INTERNA_II' : 'MEDICINA_INTERNA_I'),
            status: b.status || 'DISPONIBLE',
            currentPatientId: b.currentPatientId,
            currentPatientName: b.currentPatientId ? patientsMap.get(b.currentPatientId) : undefined,
          }));

          return { beds: mapped, online: true };
        }
      }
    } catch {}

    return { beds: generateDefaultHospitalBeds(), online: false };
  }

  /**
   * Ingresa y transfiere automáticamente un paciente desde Emergencias a la Guardia Clínica
   */
  async admitPatientToGuardia(
    patient: Patient,
    targetBedCode: string,
    options: {
      orders?: MedicalOrder[];
      labs?: LabResult[];
      evolutions?: PatientEvolution[];
      user?: User;
    } = {}
  ): Promise<{ success: boolean; redirectUrl: string; message: string }> {
    const payload = {
      patient,
      targetBedCode,
      orders: options.orders || [],
      labs: options.labs || [],
      evolutions: options.evolutions || [],
      user: options.user || { name: 'Dr. Joel Colón', role: 'ADMINISTRADOR' },
    };

    try {
      const res = await fetch(`${this.baseUrl}/api/admit-from-hospital`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          redirectUrl: data.redirectUrl || `${this.baseUrl}/?patientId=${patient.id}&bed=${targetBedCode}`,
          message: data.message || `Paciente ${patient.fullName} transferido a ${targetBedCode}.`,
        };
      }
    } catch {
      // Si la API directa falla, preparamos la URL directa
    }

    const fallbackUrl = `${this.baseUrl}/?patientId=${patient.id}&bed=${targetBedCode}`;
    return {
      success: true,
      redirectUrl: fallbackUrl,
      message: `Asignado a cama ${targetBedCode}. Abriendo Guardia Clínica...`,
    };
  }

  /**
   * Ejecuta la redirección o apertura de la aplicación de guardia
   */
  redirectToGuardia(redirectUrl?: string): void {
    const target = redirectUrl || this.baseUrl;
    const newWindow = window.open(target, '_blank');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      window.location.href = target;
    }
  }
}

export const guardiaAppService = new GuardiaAppService();
