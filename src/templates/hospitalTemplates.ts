/**
 * Plantillas Hospitalarias Oficiales Versionadas
 * Hospital Regional Dr. Ángel María Gatón — Dr. Joel Colón
 * 
 * FASE 8:
 * Templates independientes con templateVersion para actualización modular.
 */

export const CURRENT_TEMPLATE_VERSION = '2026.1-GATON';

export interface HospitalTemplateMetadata {
  id: string;
  version: string;
  hospitalName: string;
  hospitalSubtitle: string;
  documentType: 'ingreso_emergencia' | 'ingreso_sala' | 'orden_medica' | 'historia_clinica' | 'evolucion' | 'combinada';
  typography: {
    primaryFont: string;
    bodyFontSizePt: number;
    titleFontSizePt: number;
    headerColorHex: string;
  };
}

export const OFFICIAL_HOSPITAL_TEMPLATES: Record<string, HospitalTemplateMetadata> = {
  nota_ingreso_emergencia: {
    id: 'nota_ingreso_emergencia',
    version: CURRENT_TEMPLATE_VERSION,
    hospitalName: 'HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN',
    hospitalSubtitle: 'SERVICIO DE EMERGENCIAS MÉDICAS',
    documentType: 'ingreso_emergencia',
    typography: {
      primaryFont: 'Calibri',
      bodyFontSizePt: 10,
      titleFontSizePt: 12,
      headerColorHex: '0284C7'
    }
  },
  nota_ingreso_sala: {
    id: 'nota_ingreso_sala',
    version: CURRENT_TEMPLATE_VERSION,
    hospitalName: 'HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN',
    hospitalSubtitle: 'SERVICIO DE MEDICINA INTERNA / PLANTA',
    documentType: 'ingreso_sala',
    typography: {
      primaryFont: 'Calibri',
      bodyFontSizePt: 10,
      titleFontSizePt: 12,
      headerColorHex: '0284C7'
    }
  },
  orden_medica: {
    id: 'orden_medica',
    version: CURRENT_TEMPLATE_VERSION,
    hospitalName: 'HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN',
    hospitalSubtitle: 'HOJA OFICIAL DE ÓRDENES MÉDICAS',
    documentType: 'orden_medica',
    typography: {
      primaryFont: 'Calibri',
      bodyFontSizePt: 9.5,
      titleFontSizePt: 12,
      headerColorHex: '0284C7'
    }
  },
  historia_clinica_planta: {
    id: 'historia_clinica_planta',
    version: CURRENT_TEMPLATE_VERSION,
    hospitalName: 'HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN',
    hospitalSubtitle: 'HISTORIA CLÍNICA DE PLANTA',
    documentType: 'historia_clinica',
    typography: {
      primaryFont: 'Calibri',
      bodyFontSizePt: 10,
      titleFontSizePt: 13,
      headerColorHex: '1B365D'
    }
  },
  evolucion_medica: {
    id: 'evolucion_medica',
    version: CURRENT_TEMPLATE_VERSION,
    hospitalName: 'HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN',
    hospitalSubtitle: 'EVOLUCIÓN CLÍNICA MÉDICA',
    documentType: 'evolucion',
    typography: {
      primaryFont: 'Calibri',
      bodyFontSizePt: 10,
      titleFontSizePt: 12,
      headerColorHex: '0284C7'
    }
  }
};
