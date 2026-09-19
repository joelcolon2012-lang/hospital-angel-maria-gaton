/**
 * Servicio Especializado para el Registro y Análisis Estadístico de Eventos Cerebrovasculares
 * Hospital Regional Dr. Ángel María Gatón — Servicio de Emergencias & Medicina Interna
 * Clasificación y manejo independiente de:
 * 1. EVC Isquémico
 * 2. EVC Hemorrágico
 * 3. Ataque Isquémico Transitorio (AIT)
 */

import { db } from '../db/dexieDb';
import { 
  StrokeRecord, 
  StrokeFilterParams, 
  StrokeKpiMetrics, 
  StrokeType, 
  IschemicStrokeData, 
  HemorrhagicStrokeData, 
  TransientIschemicAttackData 
} from '../types/strokeRegistry';
import { authService, recordAuditLog } from './authService';
import { cloudSyncService } from './cloudSyncService';

export class StrokeRegistryService {
  /**
   * Obtiene todos los registros aplicando filtros clínicos
   */
  public async getRecords(filters?: StrokeFilterParams): Promise<StrokeRecord[]> {
    try {
      let list = await db.strokeRegistry.toArray();

      if (!filters) {
        return list.sort((a, b) => new Date(b.eventDate || b.createdAt).getTime() - new Date(a.eventDate || a.createdAt).getTime());
      }

      return list.filter(r => {
        // Filtro por tipo de EVC
        if (filters.strokeType && filters.strokeType !== 'ALL' && r.strokeType !== filters.strokeType) {
          return false;
        }

        // Filtro por sexo
        if (filters.sex && filters.sex !== 'ALL' && r.sex !== filters.sex) {
          return false;
        }

        // Filtro por edad
        if (filters.minAge !== undefined && r.age < filters.minAge) return false;
        if (filters.maxAge !== undefined && r.age > filters.maxAge) return false;

        // Filtro por fecha
        if (filters.startDate && r.eventDate < filters.startDate) return false;
        if (filters.endDate && r.eventDate > filters.endDate) return false;

        // Filtro por año y mes
        if (filters.year || filters.month !== undefined) {
          const date = new Date(r.eventDate);
          if (filters.year && date.getFullYear() !== filters.year) return false;
          if (filters.month !== undefined && date.getMonth() + 1 !== filters.month) return false;
        }

        // Filtro por servicio
        if (filters.service && r.service && !r.service.toLowerCase().includes(filters.service.toLowerCase())) {
          return false;
        }

        // Filtro por médico
        if (filters.attendingDoctor && r.attendingDoctor && !r.attendingDoctor.toLowerCase().includes(filters.attendingDoctor.toLowerCase())) {
          return false;
        }

        // Filtro por resultado clínico
        if (filters.outcome && filters.outcome !== 'ALL') {
          if (filters.outcome === 'FALLECIDO') {
            const isMortality = 
              (r.strokeType === 'ISQUEMICO' && r.ischemicData?.disposition === 'MORTALIDAD_INTRAHOSPITALARIA') ||
              (r.strokeType === 'HEMORRAGICO' && r.hemorrhagicData?.inHospitalMortality === true);
            if (!isMortality) return false;
          } else if (filters.outcome === 'TROMBOLIZADO') {
            if (r.strokeType !== 'ISQUEMICO' || !r.ischemicData?.thrombolysisPerformed) return false;
          } else if (filters.outcome === 'UCI') {
            const icu = (r.strokeType === 'ISQUEMICO' && r.ischemicData?.icuAdmission) ||
                        (r.strokeType === 'HEMORRAGICO' && r.hemorrhagicData?.icuAdmission);
            if (!icu) return false;
          } else if (filters.outcome === 'VIVO') {
            const isMortality = 
              (r.strokeType === 'ISQUEMICO' && r.ischemicData?.disposition === 'MORTALIDAD_INTRAHOSPITALARIA') ||
              (r.strokeType === 'HEMORRAGICO' && r.hemorrhagicData?.inHospitalMortality === true);
            if (isMortality) return false;
          }
        }

        return true;
      }).sort((a, b) => new Date(b.eventDate || b.createdAt).getTime() - new Date(a.eventDate || a.createdAt).getTime());
    } catch (err) {
      console.error('Error al obtener registros de EVC:', err);
      return [];
    }
  }

  /**
   * Obtiene un registro por su ID
   */
  public async getRecordById(id: string): Promise<StrokeRecord | null> {
    try {
      const record = await db.strokeRegistry.get(id);
      return record || null;
    } catch (err) {
      console.error('Error obteniendo EVC por ID:', err);
      return null;
    }
  }

  /**
   * Obtiene el registro de EVC asociado a un paciente
   */
  public async getRecordByPatientId(patientId: string): Promise<StrokeRecord | null> {
    try {
      const record = await db.strokeRegistry.where('patientId').equals(patientId).first();
      return record || null;
    } catch (err) {
      console.error('Error buscando EVC por paciente:', err);
      return null;
    }
  }

  /**
   * Guarda o actualiza un registro en la base de datos de manera transaccionada
   */
  public async saveRecord(recordData: Omit<StrokeRecord, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'> & { id?: string }): Promise<StrokeRecord> {
    const user = authService.getCurrentUser();
    const now = new Date().toISOString();
    const isNew = !recordData.id;
    const id = recordData.id || `evc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const fullRecord: StrokeRecord = {
      ...recordData,
      id,
      createdAt: isNew ? now : ((recordData as any).createdAt || now),
      createdBy: isNew ? user.name : ((recordData as any).createdBy || user.name),
      updatedAt: now,
      updatedBy: user.name,
    };

    await db.transaction('rw', db.strokeRegistry, db.auditLogs, async () => {
      await db.strokeRegistry.put(fullRecord);
      await recordAuditLog({
        action: isNew ? 'STROKE_REGISTERED' : 'STROKE_UPDATED',
        patientId: fullRecord.patientId,
        recordId: id,
        recordType: 'STROKE_RECORD',
        newValue: { type: fullRecord.strokeType, patientName: fullRecord.patientName, eventDate: fullRecord.eventDate },
        details: `${isNew ? 'Registro inicial' : 'Actualización'} de Evento Cerebrovascular (${fullRecord.strokeType})`
      });
    });

    // Sincronizar cambios en tiempo real
    cloudSyncService.triggerPushSync().catch(() => {});

    return fullRecord;
  }

  /**
   * Elimina un registro del censo
   */
  public async deleteRecord(id: string): Promise<boolean> {
    try {
      const existing = await db.strokeRegistry.get(id);
      if (!existing) return false;

      await db.transaction('rw', db.strokeRegistry, db.auditLogs, async () => {
        await db.strokeRegistry.delete(id);
        await recordAuditLog({
          action: 'ELIMINAR_SUAVE',
          patientId: existing.patientId,
          recordId: id,
          recordType: 'STROKE_RECORD',
          details: `Eliminación de registro de EVC (${existing.strokeType})`
        });
      });

      cloudSyncService.triggerPushSync().catch(() => {});
      return true;
    } catch (err) {
      console.error('Error eliminando registro de EVC:', err);
      return false;
    }
  }

  /**
   * Calcula el conjunto completo de métricas e indicadores de calidad (KPIs)
   */
  public computeKpiMetrics(records: StrokeRecord[]): StrokeKpiMetrics {
    const totalEvents = records.length;
    let totalIschemic = 0;
    let totalHemorrhagic = 0;
    let totalTia = 0;

    let thrombolysisCount = 0;
    let thrombectomyCount = 0;
    let icuAdmissions = 0;
    let mortalityCount = 0;

    let ageSum = 0;
    let nihssSum = 0;
    let nihssCount = 0;
    let rankinSum = 0;
    let rankinCount = 0;
    let doorToNeedleSum = 0;
    let doorToNeedleCount = 0;

    let maleCount = 0;
    let femaleCount = 0;

    const doorToNeedleCategories = {
      lessThan60: 0,
      between60And90: 0,
      greaterThan90: 0,
    };

    const nihssCategories = {
      mild: 0,
      moderate: 0,
      moderateSevere: 0,
      severe: 0,
    };

    const rankinDistribution: Record<number, number> = {
      0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0
    };

    const monthMap: Record<string, { total: number; ischemic: number; hemorrhagic: number; tia: number }> = {};
    const yearMap: Record<number, number> = {};

    for (const r of records) {
      ageSum += r.age || 0;
      if (r.sex === 'M') maleCount++;
      else if (r.sex === 'F') femaleCount++;

      // Agrupación temporal
      const d = new Date(r.eventDate || r.createdAt);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        yearMap[y] = (yearMap[y] || 0) + 1;
        const mKey = `${y}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[mKey]) {
          monthMap[mKey] = { total: 0, ischemic: 0, hemorrhagic: 0, tia: 0 };
        }
        monthMap[mKey].total++;
        if (r.strokeType === 'ISQUEMICO') monthMap[mKey].ischemic++;
        else if (r.strokeType === 'HEMORRAGICO') monthMap[mKey].hemorrhagic++;
        else if (r.strokeType === 'AIT') monthMap[mKey].tia++;
      }

      // Procesamiento por subtipo
      if (r.strokeType === 'ISQUEMICO') {
        totalIschemic++;
        const isc = r.ischemicData;
        if (isc) {
          if (isc.thrombolysisPerformed) {
            thrombolysisCount++;
            if (isc.doorToNeedleMinutes && isc.doorToNeedleMinutes > 0) {
              doorToNeedleSum += isc.doorToNeedleMinutes;
              doorToNeedleCount++;
              if (isc.doorToNeedleMinutes < 60) doorToNeedleCategories.lessThan60++;
              else if (isc.doorToNeedleMinutes <= 90) doorToNeedleCategories.between60And90++;
              else doorToNeedleCategories.greaterThan90++;
            }
          }
          if (isc.thrombectomyPerformed) thrombectomyCount++;
          if (isc.icuAdmission) icuAdmissions++;
          if (isc.disposition === 'MORTALIDAD_INTRAHOSPITALARIA') mortalityCount++;

          if (isc.nihssArrival !== undefined && isc.nihssArrival >= 0) {
            nihssSum += isc.nihssArrival;
            nihssCount++;
            if (isc.nihssArrival <= 4) nihssCategories.mild++;
            else if (isc.nihssArrival <= 15) nihssCategories.moderate++;
            else if (isc.nihssArrival <= 20) nihssCategories.moderateSevere++;
            else nihssCategories.severe++;
          }

          if (isc.modifiedRankinDischarge !== undefined && isc.modifiedRankinDischarge >= 0 && isc.modifiedRankinDischarge <= 6) {
            rankinSum += isc.modifiedRankinDischarge;
            rankinCount++;
            rankinDistribution[isc.modifiedRankinDischarge] = (rankinDistribution[isc.modifiedRankinDischarge] || 0) + 1;
          }
        }
      } else if (r.strokeType === 'HEMORRAGICO') {
        totalHemorrhagic++;
        const hem = r.hemorrhagicData;
        if (hem) {
          if (hem.icuAdmission) icuAdmissions++;
          if (hem.inHospitalMortality) mortalityCount++;

          if (hem.modifiedRankinDischarge !== undefined && hem.modifiedRankinDischarge >= 0 && hem.modifiedRankinDischarge <= 6) {
            rankinSum += hem.modifiedRankinDischarge;
            rankinCount++;
            rankinDistribution[hem.modifiedRankinDischarge] = (rankinDistribution[hem.modifiedRankinDischarge] || 0) + 1;
          }
        }
      } else if (r.strokeType === 'AIT') {
        totalTia++;
      }
    }

    const eventsByMonth = Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({ month, ...data }));

    const eventsByYear = Object.entries(yearMap)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([year, total]) => ({ year: Number(year), total }));

    return {
      totalEvents,
      totalIschemic,
      totalHemorrhagic,
      totalTia,
      thrombolysisCount,
      thrombolysisPercentage: totalIschemic > 0 ? Math.round((thrombolysisCount / totalIschemic) * 100) : 0,
      thrombectomyCount,
      thrombectomyPercentage: totalIschemic > 0 ? Math.round((thrombectomyCount / totalIschemic) * 100) : 0,
      icuAdmissions,
      icuPercentage: totalEvents > 0 ? Math.round((icuAdmissions / totalEvents) * 100) : 0,
      mortalityCount,
      mortalityRate: totalEvents > 0 ? Number(((mortalityCount / totalEvents) * 100).toFixed(1)) : 0,
      averageAge: totalEvents > 0 ? Math.round(ageSum / totalEvents) : 0,
      averageNihssArrival: nihssCount > 0 ? Number((nihssSum / nihssCount).toFixed(1)) : 0,
      averageRankinDischarge: rankinCount > 0 ? Number((rankinSum / rankinCount).toFixed(1)) : 0,
      averageDoorToNeedleMinutes: doorToNeedleCount > 0 ? Math.round(doorToNeedleSum / doorToNeedleCount) : 0,
      sexDistribution: {
        male: maleCount,
        female: femaleCount
      },
      eventsByMonth,
      eventsByYear,
      doorToNeedleCategories,
      rankinDistribution,
      nihssCategories
    };
  }

  /**
   * Detecta si un texto clínico contiene términos sugerentes de EVC para activar propuesta asistida
   */
  public detectStrokeKeywords(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    const regex = /\b(?:ACV|EVC|STROKE|ICTUS|INFARTO\s+CEREBRAL|ISQUEMIA\s+CEREBRAL|(?:HEMORRAGIA|HEMATOMA)\s+(?:INTRACEREBRAL|SUBARACNOIDEA|PARENQUIMATOS[AO]|INTRAPARENQUIMATOS[AO])|ACCIDENTE\s+CEREBROVASCULAR|EVENTO\s+CEREBROVASCULAR|ATAQUE\s+ISQU[ÉE]MICO\s+TRANSITORIO|AIT|HEMIPARESIA|HEMIPLEJ[ÍI]A|S[ÍI]NDROME\s+PIRAMIDAL)\b/i;
    return regex.test(text);
  }
}

export const strokeRegistryService = new StrokeRegistryService();
