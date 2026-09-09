/**
 * Servicio de Extracción y Transcripción de Paraclínicos desde Imágenes o Texto
 * Hospital Regional Ángel María Gatón — Dr. Colón
 */

export interface ExtractedLabItem {
  parameter: string;
  value: string;
  unit: string;
  flag?: 'normal' | 'alto' | 'bajo' | 'critico';
  referenceRange?: string;
  panel: 'Hemograma' | 'Química' | 'Electrolitos' | 'Función Renal' | 'Gases Arteriales' | 'Marcadores Cardiacos' | 'Otros';
}

export interface ExtractedParaclinicalReport {
  rawText: string;
  items: ExtractedLabItem[];
  summaryText: string; // Formateado listo para nota de ingreso o evolución
}

/**
 * Analiza texto extraído o digitado de un paraclínico y reconoce los valores clínicos clave
 */
export function parseParaclinicalText(rawText: string): ExtractedParaclinicalReport {
  const items: ExtractedLabItem[] = [];
  const lines = rawText.split(/\r?\n/);

  // Patrones de búsqueda regex comunes
  const patterns: {
    param: string;
    regex: RegExp;
    unit: string;
    panel: ExtractedLabItem['panel'];
    refMin?: number;
    refMax?: number;
    refStr?: string;
  }[] = [
    // Hemograma
    { param: 'Leucocitos', regex: /(?:leucocitos|wbc|globulos blancos)[\s:=]+([0-9.,]+)/i, unit: 'x10³/µL', panel: 'Hemograma', refMin: 4.5, refMax: 11.0, refStr: '4.5 - 11.0' },
    { param: 'Hemoglobina', regex: /(?:hemoglobina|hb|hgb)[\s:=]+([0-9.,]+)/i, unit: 'g/dL', panel: 'Hemograma', refMin: 12.0, refMax: 16.5, refStr: '12.0 - 16.5' },
    { param: 'Hematocrito', regex: /(?:hematocrito|hct|hto)[\s:=]+([0-9.,]+)/i, unit: '%', panel: 'Hemograma', refMin: 36.0, refMax: 48.0, refStr: '36.0 - 48.0' },
    { param: 'Plaquetas', regex: /(?:plaquetas|plt|recuento de plaquetas)[\s:=]+([0-9.,]+)/i, unit: 'x10³/µL', panel: 'Hemograma', refMin: 150, refMax: 450, refStr: '150 - 450' },
    { param: 'Neutrófilos', regex: /(?:neutrofilos|segmentados|neut)[\s:=]+([0-9.,]+)/i, unit: '%', panel: 'Hemograma', refMin: 40, refMax: 70, refStr: '40 - 70' },
    { param: 'Linfocitos', regex: /(?:linfocitos|linf)[\s:=]+([0-9.,]+)/i, unit: '%', panel: 'Hemograma', refMin: 20, refMax: 45, refStr: '20 - 45' },

    // Química y Función Renal
    { param: 'Glucosa', regex: /(?:glucosa|glicemia|glu)[\s:=]+([0-9.,]+)/i, unit: 'mg/dL', panel: 'Química', refMin: 70, refMax: 100, refStr: '70 - 100' },
    { param: 'Creatinina', regex: /(?:creatinina|cr|creat)[\s:=]+([0-9.,]+)/i, unit: 'mg/dL', panel: 'Función Renal', refMin: 0.6, refMax: 1.2, refStr: '0.6 - 1.2' },
    { param: 'Urea', regex: /(?:urea)[\s:=]+([0-9.,]+)/i, unit: 'mg/dL', panel: 'Función Renal', refMin: 15, refMax: 45, refStr: '15 - 45' },
    { param: 'BUN', regex: /(?:bun|nitrogeno ureico)[\s:=]+([0-9.,]+)/i, unit: 'mg/dL', panel: 'Función Renal', refMin: 7, refMax: 20, refStr: '7 - 20' },

    // Electrolitos
    { param: 'Sodio (Na)', regex: /(?:sodio|na\+?)[\s:=]+([0-9.,]+)/i, unit: 'mEq/L', panel: 'Electrolitos', refMin: 135, refMax: 145, refStr: '135 - 145' },
    { param: 'Potasio (K)', regex: /(?:potasio|k\+?)[\s:=]+([0-9.,]+)/i, unit: 'mEq/L', panel: 'Electrolitos', refMin: 3.5, refMax: 5.0, refStr: '3.5 - 5.0' },
    { param: 'Cloro (Cl)', regex: /(?:cloro|cl-?)[\s:=]+([0-9.,]+)/i, unit: 'mEq/L', panel: 'Electrolitos', refMin: 98, refMax: 106, refStr: '98 - 106' },
    { param: 'Calcio', regex: /(?:calcio|ca\+?)[\s:=]+([0-9.,]+)/i, unit: 'mg/dL', panel: 'Electrolitos', refMin: 8.5, refMax: 10.5, refStr: '8.5 - 10.5' },

    // Gases Arteriales
    { param: 'pH Arterial', regex: /(?:ph)[\s:=]+([0-9.,]+)/i, unit: '', panel: 'Gases Arteriales', refMin: 7.35, refMax: 7.45, refStr: '7.35 - 7.45' },
    { param: 'pCO2', regex: /(?:pco2|co2)[\s:=]+([0-9.,]+)/i, unit: 'mmHg', panel: 'Gases Arteriales', refMin: 35, refMax: 45, refStr: '35 - 45' },
    { param: 'pO2', regex: /(?:po2)[\s:=]+([0-9.,]+)/i, unit: 'mmHg', panel: 'Gases Arteriales', refMin: 80, refMax: 100, refStr: '80 - 100' },
    { param: 'HCO3', regex: /(?:hco3|bicarbonato)[\s:=]+([0-9.,]+)/i, unit: 'mEq/L', panel: 'Gases Arteriales', refMin: 22, refMax: 26, refStr: '22 - 26' },
    { param: 'Lactato', regex: /(?:lactato|acidolactico)[\s:=]+([0-9.,]+)/i, unit: 'mmol/L', panel: 'Gases Arteriales', refMin: 0.5, refMax: 2.0, refStr: '0.5 - 2.0' },

    // Cardiacos
    { param: 'Troponina I', regex: /(?:troponina|tropo|cTnI)[\s:=]+([0-9.,]+)/i, unit: 'ng/mL', panel: 'Marcadores Cardiacos', refMin: 0, refMax: 0.04, refStr: '< 0.04' },
    { param: 'Dímero D', regex: /(?:dimero d|ddimer)[\s:=]+([0-9.,]+)/i, unit: 'ng/mL', panel: 'Marcadores Cardiacos', refMin: 0, refMax: 500, refStr: '< 500' },
  ];

  for (const line of lines) {
    for (const pat of patterns) {
      const match = line.match(pat.regex);
      if (match && match[1]) {
        // Normalizar comas por puntos
        const valStr = match[1].replace(',', '.');
        const numVal = parseFloat(valStr);

        let flag: ExtractedLabItem['flag'] = 'normal';
        if (!isNaN(numVal) && pat.refMin !== undefined && pat.refMax !== undefined) {
          if (numVal < pat.refMin) flag = 'bajo';
          else if (numVal > pat.refMax) flag = 'alto';
        }

        // Evitar duplicados del mismo parámetro
        if (!items.some((i) => i.parameter === pat.param)) {
          items.push({
            parameter: pat.param,
            value: valStr,
            unit: pat.unit,
            panel: pat.panel,
            flag,
            referenceRange: pat.refStr,
          });
        }
      }
    }
  }

  // Generar resumen formateado para el reporte clínico
  let summary = '';
  if (items.length > 0) {
    summary = items
      .map((i) => `${i.parameter}: ${i.value} ${i.unit} ${i.flag !== 'normal' ? `[${i.flag?.toUpperCase()}]` : ''}`)
      .join(', ');
  } else {
    summary = rawText.trim();
  }

  return {
    rawText,
    items,
    summaryText: summary,
  };
}
