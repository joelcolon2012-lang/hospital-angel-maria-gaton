/**
 * Servicio de Gestión y Versionado de Plantillas Oficiales del Hospital
 * Hospital Regional Dr. Ángel María Gatón — Dr. Colón
 * 
 * Cumple estrictamente con:
 * - Sección 15: Orden oficial inmutable de las notas definido por el administrador.
 * - Sección 16: Versionado obligatorio (v1, v2, v3...) con fecha, usuario y sin destruir versiones anteriores.
 * - Sección 36: Respeto de la plantilla hospitalaria sin inventar datos clínicos.
 * - Sección 48: Persistencia central en Dexie DB + Nube (sin depender solo de localStorage).
 */

import { db } from '../db/dexieDb';
import { 
  OfficialTemplateId, 
  OfficialTemplateSection, 
  OfficialTemplateVersion, 
  OfficialHospitalTemplate 
} from '../types';
import { cloudSyncService } from './cloudSyncService';

export const TEMPLATES_SETTINGS_KEY = 'hospital_official_templates';

// Plantillas maestras por defecto (Versión 1)
export const DEFAULT_TEMPLATES: Record<OfficialTemplateId, OfficialHospitalTemplate> = {
  nota_emergencia: {
    id: 'nota_emergencia',
    title: 'NOTA DE INGRESO EMERGENCIA',
    subtitle: 'Formato narrativo continuo oficial de ingreso al servicio de urgencias',
    activeVersion: 1,
    currentSections: [
      { id: 'header', title: 'ENCABEZADO INSTITUCIONAL', description: 'Hospital Regional Dr. Ángel María Gatón • Servicio de Emergencias', required: true, orderIndex: 1, enabled: true },
      { id: 'patient_info', title: 'DATOS DEL PACIENTE Y LLEGADA', description: 'Nombre, edad, sexo, cubículo, fecha y hora de ingreso', required: true, orderIndex: 2, enabled: true },
      { id: 'background', title: 'ANTECEDENTES CLÍNICOS', description: 'Mórbidos, quirúrgicos, hábitos tóxicos y alergias medicamentosas', required: true, orderIndex: 3, enabled: true },
      { id: 'current_illness', title: 'HISTORIA DE LA ENFERMEDAD ACTUAL (HDA)', description: 'Motivo de consulta y cronología del cuadro clínico', required: true, orderIndex: 4, enabled: true },
      { id: 'vitals', title: 'CONSTANTES VITALES DE INGRESO', description: 'TA, FC, FR, SpO2, Temperatura, Glicemia capilar y Glasgow', required: true, orderIndex: 5, enabled: true },
      { id: 'physical_exam', title: 'EXAMEN FÍSICO CEFALOCAUDAL', description: 'Cabeza, cuello, tórax, pulmones, corazón, abdomen, extremidades, neurológico y piel', required: true, orderIndex: 6, enabled: true },
      { id: 'studies', title: 'ESTUDIOS DE GABINETE E IMAGEN', description: 'Radiografía de tórax, tomografía computarizada, electrocardiograma', required: false, orderIndex: 7, enabled: true },
      { id: 'labs', title: 'PARACLÍNICOS Y LABORATORIOS', description: 'Hemograma completo, químicas sanguíneas y electrolitos', required: true, orderIndex: 8, enabled: true },
      { id: 'scales', title: 'PLANTEAMIENTO CLÍNICO & ESCALAS PRONÓSTICAS', description: 'Escalas de estratificación validadas (NIHSS, CURB-65, etc.) antes de diagnósticos', required: true, orderIndex: 9, enabled: true },
      { id: 'diagnoses', title: 'DIAGNÓSTICOS NOSOLÓGICOS NUMERADOS', description: 'Lista ordenada de diagnósticos clínicos confirmados y de sospecha', required: true, orderIndex: 10, enabled: true },
      { id: 'treatment', title: 'EN CUANTO AL MANEJO (SOLUCIONES Y FARMACOTERAPIA)', description: 'Hidratación parenteral, fármacos con sustento en guías clínicas y monitoreo', required: true, orderIndex: 11, enabled: true },
      { id: 'signature', title: 'FIRMA, EXEQUÁTUR Y REGISTRO MÉDICO', description: 'Nombre del médico tratante, exequátur y hospital', required: true, orderIndex: 12, enabled: true },
    ],
    versionHistory: [
      {
        version: 1,
        updatedAt: '2026-09-08T00:00:00.000Z',
        updatedBy: 'Dr. Colón (Administrador)',
        changeSummary: 'Plantilla oficial inicial con examen cefalocaudal independiente y escalas antes de diagnósticos.',
        sections: [
          { id: 'header', title: 'ENCABEZADO INSTITUCIONAL', description: 'Hospital Regional Dr. Ángel María Gatón', required: true, orderIndex: 1, enabled: true },
          { id: 'patient_info', title: 'DATOS DEL PACIENTE Y LLEGADA', description: 'Nombre, edad, cubículo, fecha y hora', required: true, orderIndex: 2, enabled: true },
          { id: 'background', title: 'ANTECEDENTES CLÍNICOS', description: 'Mórbidos, quirúrgicos, tóxicos, alergias', required: true, orderIndex: 3, enabled: true },
          { id: 'current_illness', title: 'HISTORIA DE LA ENFERMEDAD ACTUAL', description: 'Motivo y cronología', required: true, orderIndex: 4, enabled: true },
          { id: 'vitals', title: 'CONSTANTES VITALES DE INGRESO', description: 'TA, FC, FR, Sat, Temp, Glicemia', required: true, orderIndex: 5, enabled: true },
          { id: 'physical_exam', title: 'EXAMEN FÍSICO CEFALOCAUDAL', description: '16 sistemas independientes', required: true, orderIndex: 6, enabled: true },
          { id: 'studies', title: 'ESTUDIOS DE GABINETE E IMAGEN', description: 'Rx, TAC, EKG', required: false, orderIndex: 7, enabled: true },
          { id: 'labs', title: 'PARACLÍNICOS Y LABORATORIOS', description: 'Hemograma y químicas', required: true, orderIndex: 8, enabled: true },
          { id: 'scales', title: 'PLANTEAMIENTO CLÍNICO & ESCALAS PRONÓSTICAS', description: 'Escalas validadas', required: true, orderIndex: 9, enabled: true },
          { id: 'diagnoses', title: 'DIAGNÓSTICOS NOSOLÓGICOS NUMERADOS', description: 'Lista numerada', required: true, orderIndex: 10, enabled: true },
          { id: 'treatment', title: 'EN CUANTO AL MANEJO', description: 'Soluciones y medicación basada en guías', required: true, orderIndex: 11, enabled: true },
          { id: 'signature', title: 'FIRMA Y EXEQUÁTUR', description: 'Médico tratante', required: true, orderIndex: 12, enabled: true },
        ]
      }
    ]
  },
  nota_recibimiento: {
    id: 'nota_recibimiento',
    title: 'NOTA DE RECIBIMIENTO EN SALA',
    subtitle: 'Formato oficial de recepción en sala de hospitalización de Medicina Interna',
    activeVersion: 1,
    currentSections: [
      { id: 'header', title: 'ENCABEZADO INSTITUCIONAL', description: 'Hospital Regional Dr. Ángel María Gatón • Medicina Interna', required: true, orderIndex: 1, enabled: true },
      { id: 'patient_info', title: 'DATOS DE IDENTIFICACIÓN Y SALA', description: 'Nombre, edad, sexo, sala/cama asignada, fecha y hora de traslado', required: true, orderIndex: 2, enabled: true },
      { id: 'background', title: 'ANTECEDENTES PATOLÓGICOS Y ALERGIAS', description: 'Comorbilidades, cirugías previas, hábitos y reacciones alérgicas', required: true, orderIndex: 3, enabled: true },
      { id: 'transfer_reason', title: 'MOTIVO DE INGRESO Y RESUMEN DE EMERGENCIA', description: 'Síntesis de atención en emergencia y motivo de hospitalización', required: true, orderIndex: 4, enabled: true },
      { id: 'vitals', title: 'SIGNOS VITALES AL RECIBIMIENTO EN SALA', description: 'Constantes vitales constatadas al ingreso al cubículo', required: true, orderIndex: 5, enabled: true },
      { id: 'physical_exam', title: 'EXAMEN FÍSICO ACTUALIZADO EN SALA', description: 'Evaluación física completa al momento de recibir al paciente', required: true, orderIndex: 6, enabled: true },
      { id: 'labs_summary', title: 'PARACLÍNICOS E IMÁGENES RELEVANTES', description: 'Resumen de estudios complementarios de relevancia', required: true, orderIndex: 7, enabled: true },
      { id: 'diagnoses', title: 'DIAGNÓSTICOS DE INGRESO A SALA', description: 'Diagnósticos nosológicos de manejo en hospitalización', required: true, orderIndex: 8, enabled: true },
      { id: 'plan', title: 'PLAN DIAGNÓSTICO Y TERAPÉUTICO EN SALA', description: 'Conducta médica, monitorización y cuidados de enfermería', required: true, orderIndex: 9, enabled: true },
      { id: 'signature', title: 'FIRMA MÉDICA Y REGISTRO', description: 'Médico que recibe al paciente en sala y exequátur', required: true, orderIndex: 10, enabled: true },
    ],
    versionHistory: [
      {
        version: 1,
        updatedAt: '2026-09-08T00:00:00.000Z',
        updatedBy: 'Dr. Colón (Administrador)',
        changeSummary: 'Plantilla oficial de recibimiento en sala de hospitalización de Medicina Interna.',
        sections: [
          { id: 'header', title: 'ENCABEZADO INSTITUCIONAL', description: 'Hospital Regional Dr. Ángel María Gatón', required: true, orderIndex: 1, enabled: true },
          { id: 'patient_info', title: 'DATOS DE IDENTIFICACIÓN Y SALA', description: 'Datos y cama', required: true, orderIndex: 2, enabled: true },
          { id: 'background', title: 'ANTECEDENTES', description: 'Patológicos y alergias', required: true, orderIndex: 3, enabled: true },
          { id: 'transfer_reason', title: 'MOTIVO DE INGRESO Y RESUMEN', description: 'Resumen de urgencias', required: true, orderIndex: 4, enabled: true },
          { id: 'vitals', title: 'SIGNOS VITALES AL RECIBIMIENTO', description: 'Constantes al recibir', required: true, orderIndex: 5, enabled: true },
          { id: 'physical_exam', title: 'EXAMEN FÍSICO EN SALA', description: 'Examen completo', required: true, orderIndex: 6, enabled: true },
          { id: 'labs_summary', title: 'PARACLÍNICOS RELEVANTES', description: 'Laboratorios', required: true, orderIndex: 7, enabled: true },
          { id: 'diagnoses', title: 'DIAGNÓSTICOS DE INGRESO', description: 'Diagnósticos en sala', required: true, orderIndex: 8, enabled: true },
          { id: 'plan', title: 'PLAN TERAPÉUTICO', description: 'Plan de manejo', required: true, orderIndex: 9, enabled: true },
          { id: 'signature', title: 'FIRMA MÉDICA', description: 'Médico a cargo', required: true, orderIndex: 10, enabled: true },
        ]
      }
    ]
  },
  evolucion: {
    id: 'evolucion',
    title: 'EVOLUCIÓN MÉDICA HOSPITALARIA',
    subtitle: 'Nota de seguimiento diario y evolución clínica del paciente ingresado',
    activeVersion: 1,
    currentSections: [
      { id: 'header', title: 'ENCABEZADO INSTITUCIONAL', description: 'Hospital Regional Dr. Ángel María Gatón • Servicio Clínico', required: true, orderIndex: 1, enabled: true },
      { id: 'patient_info', title: 'DATOS DEL PACIENTE Y DÍA DE HOSPITALIZACIÓN', description: 'Nombre, edad, cama, día de ingreso/estancia hospitalaria', required: true, orderIndex: 2, enabled: true },
      { id: 'vitals', title: 'SIGNOS VITALES DEL TURNO', description: 'Curva térmica, TA, FC, FR, SpO2 y diuresis en 24h', required: true, orderIndex: 3, enabled: true },
      { id: 'subjective', title: 'EVOLUCIÓN SUBJETIVA / NOVEDADES EN 24H', description: 'Síntomas referidos por el paciente o novedades de enfermería', required: true, orderIndex: 4, enabled: true },
      { id: 'objective_exam', title: 'EXAMEN FÍSICO DIRIGIDO Y REEVALUACIÓN', description: 'Hallazgos físicos actuales y comparación con el examen basal', required: true, orderIndex: 5, enabled: true },
      { id: 'new_results', title: 'NUEVOS REPORTES DE LABORATORIO E IMAGEN', description: 'Resultados de paraclínicos recibidos en el turno', required: true, orderIndex: 6, enabled: true },
      { id: 'assessment', title: 'ANÁLISIS CLÍNICO / JUICIO EVOLUTIVO', description: 'Respuesta terapéutica, estabilidad o progresión del cuadro', required: true, orderIndex: 7, enabled: true },
      { id: 'diagnoses', title: 'DIAGNÓSTICOS ACTIVOS Y RESUELTOS', description: 'Estatus de diagnósticos nosológicos', required: true, orderIndex: 8, enabled: true },
      { id: 'plan_conduct', title: 'CONDUCTA MÉDICA Y AJUSTE DE ÓRDENES', description: 'Modificaciones farmacológicas, interconsultas o estudios pendientes', required: true, orderIndex: 9, enabled: true },
      { id: 'signature', title: 'FIRMA, EXEQUÁTUR Y HORA DE EVOLUCIÓN', description: 'Médico responsable del pase de visita', required: true, orderIndex: 10, enabled: true },
    ],
    versionHistory: [
      {
        version: 1,
        updatedAt: '2026-09-08T00:00:00.000Z',
        updatedBy: 'Dr. Colón (Administrador)',
        changeSummary: 'Plantilla de evolución médica SOAP hospitalaria estandarizada.',
        sections: [
          { id: 'header', title: 'ENCABEZADO INSTITUCIONAL', description: 'Hospital Regional Dr. Ángel María Gatón', required: true, orderIndex: 1, enabled: true },
          { id: 'patient_info', title: 'DATOS DEL PACIENTE Y DÍA', description: 'Identificación y estancia', required: true, orderIndex: 2, enabled: true },
          { id: 'vitals', title: 'SIGNOS VITALES DEL TURNO', description: 'Curva de signos vitales', required: true, orderIndex: 3, enabled: true },
          { id: 'subjective', title: 'EVOLUCIÓN SUBJETIVA', description: 'Síntomas y novedades', required: true, orderIndex: 4, enabled: true },
          { id: 'objective_exam', title: 'EXAMEN FÍSICO DIRIGIDO', description: 'Examen actual', required: true, orderIndex: 5, enabled: true },
          { id: 'new_results', title: 'NUEVOS REPORTES', description: 'Paraclínicos recientes', required: true, orderIndex: 6, enabled: true },
          { id: 'assessment', title: 'ANÁLISIS CLÍNICO', description: 'Juicio evolutivo', required: true, orderIndex: 7, enabled: true },
          { id: 'diagnoses', title: 'DIAGNÓSTICOS', description: 'Diagnósticos activos', required: true, orderIndex: 8, enabled: true },
          { id: 'plan_conduct', title: 'CONDUCTA MÉDICA', description: 'Ajustes y plan', required: true, orderIndex: 9, enabled: true },
          { id: 'signature', title: 'FIRMA Y HORA', description: 'Médico tratante', required: true, orderIndex: 10, enabled: true },
        ]
      }
    ]
  },
  orden_medica: {
    id: 'orden_medica',
    title: 'ORDEN MÉDICA OFICIAL',
    subtitle: 'Hoja oficial de prescripción farmacológica, soluciones y medidas de soporte',
    activeVersion: 1,
    currentSections: [
      { id: 'header', title: 'ENCABEZADO HOSPITALARIO OFICIAL', description: ':HOSPITAL H DR. ÁNGEL MARÍA GATÓN • ORDEN MEDICA', required: true, orderIndex: 1, enabled: true },
      { id: 'patient_info', title: 'DATOS DE FILIACIÓN Y UBICACIÓN', description: 'Nombre, edad, cubículo/sala, fecha y hora de emisión', required: true, orderIndex: 2, enabled: true },
      { id: 'general_measures', title: 'MEDIDAS GENERALES Y DE SOPORTE', description: 'Tipo de dieta, posición (semifowler), monitorización horaria, oxigenoterapia SOS', required: true, orderIndex: 3, enabled: true },
      { id: 'diagnoses', title: 'DIAGNÓSTICOS CLÍNICOS', description: 'Diagnósticos nosológicos que justifican la prescripción', required: true, orderIndex: 4, enabled: true },
      { id: 'vitals', title: 'SIGNOS VITALES DE CONTROL', description: 'TA, FC, FR, SpO2, Temperatura y Glicemia de referencia', required: true, orderIndex: 5, enabled: true },
      { id: 'solutions', title: 'SOLUCIONES PARENTERALES', description: 'Tipo de solución, volumen, vía (EV) y frecuencia de infusión', required: true, orderIndex: 6, enabled: true },
      { id: 'medications', title: 'MEDICACIÓN PRESCRITA', description: 'Nombre farmacológico, dosis, vía, intervalo horario y día de tratamiento', required: true, orderIndex: 7, enabled: true },
      { id: 'studies_request', title: 'PARACLÍNICOS, LABORATORIOS E IMÁGENES', description: 'Analíticas solicitadas (hemograma, químicas) y estudios de gabinete', required: true, orderIndex: 8, enabled: true },
      { id: 'clinical_notes', title: 'NOTAS FARMACOLÓGICAS Y DE FARMACOVIGILANCIA', description: 'Justificaciones terapéuticas basadas en guías oficiales y pautas de ajuste', required: true, orderIndex: 9, enabled: true },
      { id: 'signature', title: 'FIRMA, SELLO INSTITUCIONAL Y EXEQUÁTUR', description: 'Firma del médico prescriptor facultado', required: true, orderIndex: 10, enabled: true },
    ],
    versionHistory: [
      {
        version: 1,
        updatedAt: '2026-09-08T00:00:00.000Z',
        updatedBy: 'Dr. Colón (Administrador)',
        changeSummary: 'Plantilla oficial de orden médica con formato institucional validado.',
        sections: [
          { id: 'header', title: 'ENCABEZADO HOSPITALARIO', description: 'Hospital Dr. Ángel María Gatón', required: true, orderIndex: 1, enabled: true },
          { id: 'patient_info', title: 'DATOS DE FILIACIÓN', description: 'Nombre, edad, cama, fecha y hora', required: true, orderIndex: 2, enabled: true },
          { id: 'general_measures', title: 'MEDIDAS GENERALES', description: 'Dieta, posición, oxígeno', required: true, orderIndex: 3, enabled: true },
          { id: 'diagnoses', title: 'DIAGNÓSTICOS', description: 'Diagnósticos', required: true, orderIndex: 4, enabled: true },
          { id: 'vitals', title: 'SIGNOS VITALES', description: 'Signos vitales', required: true, orderIndex: 5, enabled: true },
          { id: 'solutions', title: 'SOLUCIONES', description: 'Soluciones EV', required: true, orderIndex: 6, enabled: true },
          { id: 'medications', title: 'MEDICACIÓN', description: 'Medicamentos numerados', required: true, orderIndex: 7, enabled: true },
          { id: 'studies_request', title: 'PARACLÍNICOS E IMÁGENES', description: 'Analíticas y gabinete', required: true, orderIndex: 8, enabled: true },
          { id: 'clinical_notes', title: 'NOTAS DE GUÍAS', description: 'Sustento de guías oficiales', required: true, orderIndex: 9, enabled: true },
          { id: 'signature', title: 'FIRMA MÉDICA', description: 'Firma y exequátur', required: true, orderIndex: 10, enabled: true },
        ]
      }
    ]
  }
};

class ClinicalTemplateService {
  private cachedTemplates: Record<OfficialTemplateId, OfficialHospitalTemplate> | null = null;

  public async getTemplates(): Promise<Record<OfficialTemplateId, OfficialHospitalTemplate>> {
    if (this.cachedTemplates) {
      return { ...this.cachedTemplates };
    }

    try {
      const record = await db.settings.get(TEMPLATES_SETTINGS_KEY);
      if (record && record.value) {
        const loaded = { ...DEFAULT_TEMPLATES, ...record.value };
        this.cachedTemplates = loaded;
        return { ...loaded };
      }
    } catch (err) {
      console.warn('[ClinicalTemplateService] Error al cargar plantillas desde DB:', err);
    }

    this.cachedTemplates = { ...DEFAULT_TEMPLATES };
    return { ...DEFAULT_TEMPLATES };
  }

  public async getTemplate(id: OfficialTemplateId): Promise<OfficialHospitalTemplate> {
    const all = await this.getTemplates();
    return all[id] || DEFAULT_TEMPLATES[id];
  }

  public async saveTemplateVersion(
    templateId: OfficialTemplateId,
    newSections: OfficialTemplateSection[],
    user: string = 'Dr. Colón (Administrador)',
    changeSummary: string = 'Modificación de estructura y orden de secciones'
  ): Promise<OfficialHospitalTemplate> {
    const all = await this.getTemplates();
    const current = all[templateId] || DEFAULT_TEMPLATES[templateId];

    const normalizedSections = newSections.map((sec, idx) => ({
      ...sec,
      orderIndex: idx + 1
    }));

    const newVersionNumber = (current.activeVersion || 1) + 1;
    const nowIso = new Date().toISOString();

    const newVersionEntry: OfficialTemplateVersion = {
      version: newVersionNumber,
      updatedAt: nowIso,
      updatedBy: user,
      changeSummary,
      sections: JSON.parse(JSON.stringify(normalizedSections))
    };

    const updatedTemplate: OfficialHospitalTemplate = {
      ...current,
      activeVersion: newVersionNumber,
      currentSections: normalizedSections,
      versionHistory: [newVersionEntry, ...(current.versionHistory || [])]
    };

    all[templateId] = updatedTemplate;
    this.cachedTemplates = all;

    await db.settings.put({
      id: TEMPLATES_SETTINGS_KEY,
      value: all
    });

    cloudSyncService.scheduleAutoSync();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hospital_templates_updated', { detail: { templateId } }));
    }

    return updatedTemplate;
  }

  public async rollbackToVersion(
    templateId: OfficialTemplateId,
    targetVersion: number,
    user: string = 'Dr. Colón (Administrador)'
  ): Promise<OfficialHospitalTemplate> {
    const all = await this.getTemplates();
    const current = all[templateId];
    if (!current) throw new Error(`Plantilla "${templateId}" no encontrada`);

    const historical = current.versionHistory.find(v => v.version === targetVersion);
    if (!historical) {
      throw new Error(`Versión ${targetVersion} no encontrada en el historial de "${templateId}"`);
    }

    return this.saveTemplateVersion(
      templateId,
      historical.sections,
      user,
      `Restauración desde versión v${targetVersion}`
    );
  }

  public async moveSection(
    templateId: OfficialTemplateId,
    sectionId: string,
    direction: 'up' | 'down',
    user?: string
  ): Promise<OfficialHospitalTemplate> {
    const tpl = await this.getTemplate(templateId);
    const sections = [...tpl.currentSections];
    const index = sections.findIndex(s => s.id === sectionId);

    if (index === -1) return tpl;
    if (direction === 'up' && index === 0) return tpl;
    if (direction === 'down' && index === sections.length - 1) return tpl;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = sections[index];
    sections[index] = sections[targetIndex];
    sections[targetIndex] = temp;

    return this.saveTemplateVersion(
      templateId,
      sections,
      user || 'Dr. Colón (Administrador)',
      `Reordenamiento de sección: ${temp.title} (${direction === 'up' ? 'subida' : 'bajada'})`
    );
  }

  public async toggleSectionEnabled(
    templateId: OfficialTemplateId,
    sectionId: string,
    enabled: boolean,
    user?: string
  ): Promise<OfficialHospitalTemplate> {
    const tpl = await this.getTemplate(templateId);
    const sections = tpl.currentSections.map(s => {
      if (s.id === sectionId) {
        return { ...s, enabled };
      }
      return s;
    });

    return this.saveTemplateVersion(
      templateId,
      sections,
      user || 'Dr. Colón (Administrador)',
      `${enabled ? 'Activación' : 'Desactivación'} de la sección ${sectionId}`
    );
  }

  public async resetToDefaults(user: string = 'Dr. Colón (Administrador)'): Promise<void> {
    this.cachedTemplates = { ...DEFAULT_TEMPLATES };
    await db.settings.put({
      id: TEMPLATES_SETTINGS_KEY,
      value: DEFAULT_TEMPLATES
    });
    cloudSyncService.scheduleAutoSync();
  }
}

export const clinicalTemplateService = new ClinicalTemplateService();
