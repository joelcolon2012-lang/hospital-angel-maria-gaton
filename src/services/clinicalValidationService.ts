import { z } from 'zod';
import { Vitals } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export const vitalsZodSchema = z.object({
  systolicBP: z.number().min(30, 'Presión sistólica imposible (< 30 mmHg)').max(350, 'Presión sistólica extrema (> 350 mmHg)').optional().nullable(),
  diastolicBP: z.number().min(20, 'Presión diastólica imposible (< 20 mmHg)').max(200, 'Presión diastólica extrema (> 200 mmHg)').optional().nullable(),
  heartRate: z.number().min(20, 'Frecuencia cardíaca no fisiológica (< 20 lpm)').max(300, 'Frecuencia cardíaca extrema (> 300 lpm)').optional().nullable(),
  respiratoryRate: z.number().min(4, 'Frecuencia respiratoria inviable (< 4 rpm)').max(80, 'Frecuencia respiratoria extrema (> 80 rpm)').optional().nullable(),
  temperature: z.number().min(28, 'Temperatura no compatible (< 28 °C)').max(45, 'Hiperpirexia extrema (> 45 °C)').optional().nullable(),
  oxygenSaturation: z.number().min(40, 'Saturación incompatible (< 40%)').max(100, 'La saturación O2 no puede superar 100%').optional().nullable(),
  bloodGlucose: z.number().min(10, 'Glucemia no medible (< 10 mg/dL)').max(1200, 'Glucemia extrema (> 1200 mg/dL)').optional().nullable(),
  weight: z.number().min(1, 'Peso no viable (< 1 kg)').max(400, 'Peso extremo (> 400 kg)').optional().nullable(),
  height: z.number().min(30, 'Talla no viable (< 30 cm)').max(250, 'Talla extrema (> 250 cm)').optional().nullable(),
  glasgowEye: z.number().min(1).max(4).optional().nullable(),
  glasgowVerbal: z.number().min(1).max(5).optional().nullable(),
  glasgowMotor: z.number().min(1).max(6).optional().nullable(),
  painScale: z.number().min(0).max(10).optional().nullable(),
});

export function calculateMAP(systolic?: number, diastolic?: number): number | undefined {
  if (!systolic || !diastolic || systolic <= 0 || diastolic <= 0) return undefined;
  return Math.round(((2 * diastolic) + systolic) / 3);
}

export function calculateBMI(weightKg?: number, heightCm?: number): { bmi: number; classification: string } | undefined {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return undefined;
  const heightM = heightCm / 100;
  const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));

  let classification = 'Normopeso';
  if (bmi < 18.5) classification = 'Bajo peso';
  else if (bmi >= 25 && bmi < 29.9) classification = 'Sobrepeso';
  else if (bmi >= 30 && bmi < 34.9) classification = 'Obesidad Grado I';
  else if (bmi >= 35 && bmi < 39.9) classification = 'Obesidad Grado II';
  else if (bmi >= 40) classification = 'Obesidad Grado III (Mórbida)';

  return { bmi, classification };
}

export function validateVitals(vitals: Partial<Vitals>): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  // 1. Zod Physiological Ranges Check
  const parseResult = vitalsZodSchema.safeParse(vitals);
  if (!parseResult.success) {
    parseResult.error.issues.forEach((err) => {
      const field = err.path[0] as string;
      errors[field] = err.message;
    });
  }

  // Cross-field validation: Diastolic cannot exceed Systolic
  if (vitals.systolicBP && vitals.diastolicBP && vitals.diastolicBP >= vitals.systolicBP) {
    errors.diastolicBP = 'La presión diastólica no puede ser mayor o igual a la sistólica.';
  }

  // 2. Clinical Alert Warnings (Physiologically possible but critical for emergency care)
  if (vitals.systolicBP) {
    if (vitals.systolicBP < 90) warnings.systolicBP = 'Hipotensión arterial (TAS < 90 mmHg). Vigilar shock.';
    else if (vitals.systolicBP >= 180) warnings.systolicBP = 'Crisis hipertensiva potencial (TAS ≥ 180 mmHg).';
  }

  if (vitals.diastolicBP) {
    if (vitals.diastolicBP < 60) warnings.diastolicBP = 'Presión diastólica baja (< 60 mmHg).';
    else if (vitals.diastolicBP >= 110) warnings.diastolicBP = 'Crisis hipertensiva diastólica (TAD ≥ 110 mmHg).';
  }

  if (vitals.heartRate) {
    if (vitals.heartRate < 50) warnings.heartRate = 'Bradicardia significativa (< 50 lpm).';
    else if (vitals.heartRate > 120) warnings.heartRate = 'Taquicardia significativa (> 120 lpm).';
  }

  if (vitals.respiratoryRate) {
    if (vitals.respiratoryRate < 10) warnings.respiratoryRate = 'Bradipnea severa (< 10 rpm). Riesgo de paro respiratorio.';
    else if (vitals.respiratoryRate > 28) warnings.respiratoryRate = 'Taquipnea severa (> 28 rpm). Dificultad ventilatoria.';
  }

  if (vitals.temperature) {
    if (vitals.temperature < 35.0) warnings.temperature = 'Hipotermia (< 35.0 °C).';
    else if (vitals.temperature >= 38.3) warnings.temperature = 'Fiebre clínicamente relevante (≥ 38.3 °C).';
  }

  if (vitals.oxygenSaturation) {
    if (vitals.oxygenSaturation < 90) warnings.oxygenSaturation = 'Hipoxemia marcada (SatO2 < 90%). Evaluar oxigenoterapia inmediata.';
    else if (vitals.oxygenSaturation < 94) warnings.oxygenSaturation = 'Saturación en rango límite bajo (90-93%).';
  }

  if (vitals.bloodGlucose) {
    if (vitals.bloodGlucose < 70) warnings.bloodGlucose = 'Hipoglucemia (< 70 mg/dL). Administrar dextrosa según protocolo.';
    else if (vitals.bloodGlucose >= 250) warnings.bloodGlucose = 'Hiperglucemia severa (≥ 250 mg/dL). Descartar CAD / EHH.';
  }

  const map = calculateMAP(vitals.systolicBP, vitals.diastolicBP);
  if (map && map < 65) {
    warnings.map = 'PAM < 65 mmHg: Hipoperfusión tisular potencial. Requiere resucitación con fluidos o vasoactivos.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}
