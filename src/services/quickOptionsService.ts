/**
 * Servicio de Opciones Predefinidas Personalizables para Formularios Clínicos
 * Hospital Regional Dr. Ángel María Gatón — Dr. Colón
 * 
 * Cumple con Sección 40:
 * Las opciones de los menús desplegables NO deben quedar hardcodeadas para siempre.
 * El Administrador debe poder:
 * - AGREGAR nuevas opciones (ej: "Estertores velcro")
 * - EDITAR opciones existentes
 * - ORDENAR opciones
 * - DESACTIVAR opciones
 * 
 * Almacenamiento central en Dexie DB + Nube (Sección 48).
 */

import { db } from '../db/dexieDb';
import { QuickOptionItem } from '../types';
import { cloudSyncService } from './cloudSyncService';

export const QUICK_OPTIONS_KEY = 'hospital_quick_options';

export const DEFAULT_QUICK_OPTIONS: Record<string, QuickOptionItem[]> = {
  pulmones: [
    { id: 'pulm-1', category: 'pulmones', label: 'Normoventilados en ambos hemitórax, sin ruidos sobreagregados', orderIndex: 1, isActive: true },
    { id: 'pulm-2', category: 'pulmones', label: 'Murmullo vesicular conservado universalmente', orderIndex: 2, isActive: true },
    { id: 'pulm-3', category: 'pulmones', label: 'Hipoventilación en base pulmonar derecha', orderIndex: 3, isActive: true },
    { id: 'pulm-4', category: 'pulmones', label: 'Hipoventilación en base pulmonar izquierda', orderIndex: 4, isActive: true },
    { id: 'pulm-5', category: 'pulmones', label: 'Crepitantes bibasales finos tele-inspiratorios', orderIndex: 5, isActive: true },
    { id: 'pulm-6', category: 'pulmones', label: 'Crepitantes gruesos y broncofonía', orderIndex: 6, isActive: true },
    { id: 'pulm-7', category: 'pulmones', label: 'Sibilancias espiratorias difusas bilaterales', orderIndex: 7, isActive: true },
    { id: 'pulm-8', category: 'pulmones', label: 'Roncus transmitidos a campos anteriores', orderIndex: 8, isActive: true },
    { id: 'pulm-9', category: 'pulmones', label: 'Estertores velcro bilaterales', orderIndex: 9, isActive: true },
    { id: 'pulm-10', category: 'pulmones', label: 'Estridor laríngeo inspiratorio', orderIndex: 10, isActive: true },
  ],
  corazon: [
    { id: 'cor-1', category: 'corazon', label: 'Ruidos cardíacos rítmicos y regulares, R1 y R2 normofonéticos, sin soplos', orderIndex: 1, isActive: true },
    { id: 'cor-2', category: 'corazon', label: 'Taquicardia rítmica, no soplos ni galope auscultable', orderIndex: 2, isActive: true },
    { id: 'cor-3', category: 'corazon', label: 'Bradicardia sinusal rítmica, sin soplos', orderIndex: 3, isActive: true },
    { id: 'cor-4', category: 'corazon', label: 'Soplo sistólico eyectivo en foco aórtico grado II/VI', orderIndex: 4, isActive: true },
    { id: 'cor-5', category: 'corazon', label: 'Soplo holosistólico en foco mitral con irradiación a axila', orderIndex: 5, isActive: true },
    { id: 'cor-6', category: 'corazon', label: 'Ritmo de galope ventricular con tercer ruido (R3) audible', orderIndex: 6, isActive: true },
    { id: 'cor-7', category: 'corazon', label: 'Roce pericárdico mesodiastólico', orderIndex: 7, isActive: true },
  ],
  cabeza: [
    { id: 'cab-1', category: 'cabeza', label: 'Normocéfala, simétrica, sin depresiones óseas ni hematomas subgaleales', orderIndex: 1, isActive: true },
    { id: 'cab-2', category: 'cabeza', label: 'Pupilas isocóricas, normorreactivas a la luz y acomodación', orderIndex: 2, isActive: true },
    { id: 'cab-3', category: 'cabeza', label: 'Anisocoria reactiva', orderIndex: 3, isActive: true },
    { id: 'cab-4', category: 'cabeza', label: 'Hematoma subgaleal en región parietooccipital', orderIndex: 4, isActive: true },
    { id: 'cab-5', category: 'cabeza', label: 'Escleras anictéricas, conjuntivas normocoloreadas', orderIndex: 5, isActive: true },
    { id: 'cab-6', category: 'cabeza', label: 'Ictericia escleral evidente', orderIndex: 6, isActive: true },
  ],
  cuello: [
    { id: 'cue-1', category: 'cuello', label: 'Simétrico, cilíndrico, móvil, tráquea central, sin ingurgitación yugular', orderIndex: 1, isActive: true },
    { id: 'cue-2', category: 'cuello', label: 'Ingurgitación yugular grado II a 45 grados', orderIndex: 2, isActive: true },
    { id: 'cue-3', category: 'cuello', label: 'Ingurgitación yugular grado III con reflujo hepatoyugular positivo', orderIndex: 3, isActive: true },
    { id: 'cue-4', category: 'cuello', label: 'Rigidez de nuca positiva (signos meníngeos)', orderIndex: 4, isActive: true },
    { id: 'cue-5', category: 'cuello', label: 'Adenopatías laterocervicales palpables dolorosas', orderIndex: 5, isActive: true },
  ],
  abdomen: [
    { id: 'abd-1', category: 'abdomen', label: 'Plano, depresible, no doloroso a la palpación superficial ni profunda, ruidos presentes', orderIndex: 1, isActive: true },
    { id: 'abd-2', category: 'abdomen', label: 'Globoso a expensas de panículo adiposo, blando, indoloro', orderIndex: 2, isActive: true },
    { id: 'abd-3', category: 'abdomen', label: 'Distendido con timpanismo acentuado, ruidos hidroaéreos disminuidos', orderIndex: 3, isActive: true },
    { id: 'abd-4', category: 'abdomen', label: 'Dolor a la palpación en epigastrio sin irritación peritoneal', orderIndex: 4, isActive: true },
    { id: 'abd-5', category: 'abdomen', label: 'Signo de Murphy positivo en hipocondrio derecho', orderIndex: 5, isActive: true },
    { id: 'abd-6', category: 'abdomen', label: 'Signo de Blumberg (rebote) positivo en fosa ilíaca derecha', orderIndex: 6, isActive: true },
    { id: 'abd-7', category: 'abdomen', label: 'Defensa muscular involuntaria en tabla', orderIndex: 7, isActive: true },
  ],
  neurologico: [
    { id: 'neu-1', category: 'neurologico', label: 'Alerta, consciente, orientado en tiempo, espacio y persona. Glasgow 15/15', orderIndex: 1, isActive: true },
    { id: 'neu-2', category: 'neurologico', label: 'Somnoliento pero reactivo a estímulos verbales, orientado parcialmente', orderIndex: 2, isActive: true },
    { id: 'neu-3', category: 'neurologico', label: 'Estuporoso, responde a estímulos dolorosos, sin lenguaje coherente', orderIndex: 3, isActive: true },
    { id: 'neu-4', category: 'neurologico', label: 'Hemiparesia facio-braquio-crural derecha motora grado 3/5', orderIndex: 4, isActive: true },
    { id: 'neu-5', category: 'neurologico', label: 'Hemiparesia izquierda con asimetría facial central', orderIndex: 5, isActive: true },
    { id: 'neu-6', category: 'neurologico', label: 'Afasia motora (Broca) con comprensión preservada', orderIndex: 6, isActive: true },
    { id: 'neu-7', category: 'neurologico', label: 'Disartria moderada, pares craneales bajos conservados', orderIndex: 7, isActive: true },
  ],
  extremidades: [
    { id: 'ext-1', category: 'extremidades', label: 'Simétricas, móviles, tono y trofismo conservados, pulsos periféricos palpables, sin edema', orderIndex: 1, isActive: true },
    { id: 'ext-2', category: 'extremidades', label: 'Edema maleolar bilateral con fóvea grado I/IV', orderIndex: 2, isActive: true },
    { id: 'ext-3', category: 'extremidades', label: 'Edema ascendente hasta tercio medio tibial con fóvea grado II/IV', orderIndex: 3, isActive: true },
    { id: 'ext-4', category: 'extremidades', label: 'Edema marcado hasta rodillas con fóvea grado III/IV bilateral', orderIndex: 4, isActive: true },
    { id: 'ext-5', category: 'extremidades', label: 'Asimetría de pantorrilla derecha con dolor a la dorsiflexión (Signo de Homans +)', orderIndex: 5, isActive: true },
    { id: 'ext-6', category: 'extremidades', label: 'Pulsos pedios y tibiales posteriores disminuidos bilateralmente', orderIndex: 6, isActive: true },
  ],
  dietas: [
    { id: 'diet-1', category: 'dietas', label: 'Dieta corriente hospitalaria normosódica', orderIndex: 1, isActive: true },
    { id: 'diet-2', category: 'dietas', label: 'Dieta hiposódica estricta (bajo sodio para insuficiencia cardíaca/hipertensión)', orderIndex: 2, isActive: true },
    { id: 'diet-3', category: 'dietas', label: 'Dieta para paciente diabético (1,800 kcal fraccionada)', orderIndex: 3, isActive: true },
    { id: 'diet-4', category: 'dietas', label: 'Nada por vía oral (NPO) por riesgo de broncoaspiración / cirugía', orderIndex: 4, isActive: true },
    { id: 'diet-5', category: 'dietas', label: 'Dieta blanda gástrica sin irritantes', orderIndex: 5, isActive: true },
    { id: 'diet-6', category: 'dietas', label: 'Dieta líquida clara de transición', orderIndex: 6, isActive: true },
  ],
  soluciones: [
    { id: 'sol-1', category: 'soluciones', label: 'Solución Salina al 0.9% 2,000 ml c/24 horas EV a 84 gotas/min', orderIndex: 1, isActive: true },
    { id: 'sol-2', category: 'soluciones', label: 'Solución Salina al 0.9% 1,000 ml c/24 horas EV a 42 gotas/min', orderIndex: 2, isActive: true },
    { id: 'sol-3', category: 'soluciones', label: 'Solución Lactato de Ringer 1,000 ml c/12 horas EV', orderIndex: 3, isActive: true },
    { id: 'sol-4', category: 'soluciones', label: 'Dextrosa al 5% en agua 1,000 ml + 20 mEq KCl c/24 horas EV', orderIndex: 4, isActive: true },
    { id: 'sol-5', category: 'soluciones', label: 'Solución Mixta (Dextrosa 5% en Salina 0.9%) 1,000 ml c/24 horas EV', orderIndex: 5, isActive: true },
    { id: 'sol-6', category: 'soluciones', label: 'Vía venosa permeable mantenida con Salina al 0.9% a goteo mínimo', orderIndex: 6, isActive: true },
  ]
};

class QuickOptionsService {
  private cache: Record<string, QuickOptionItem[]> | null = null;

  public async getAllOptions(): Promise<Record<string, QuickOptionItem[]>> {
    if (this.cache) return { ...this.cache };

    try {
      const record = await db.settings.get(QUICK_OPTIONS_KEY);
      if (record && record.value) {
        this.cache = { ...DEFAULT_QUICK_OPTIONS, ...record.value };
        return { ...this.cache };
      }
    } catch (err) {
      console.warn('[QuickOptionsService] Error cargando opciones:', err);
    }

    this.cache = { ...DEFAULT_QUICK_OPTIONS };
    return { ...DEFAULT_QUICK_OPTIONS };
  }

  public async getOptionsByCategory(category: string, onlyActive: boolean = true): Promise<QuickOptionItem[]> {
    const all = await this.getAllOptions();
    const list = all[category] || [];
    const filtered = onlyActive ? list.filter(i => i.isActive) : list;
    return filtered.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public async addOption(category: string, label: string): Promise<QuickOptionItem> {
    const all = await this.getAllOptions();
    const list = all[category] || [];
    const maxIndex = list.reduce((max, i) => Math.max(max, i.orderIndex), 0);

    const newItem: QuickOptionItem = {
      id: `opt-${category}-${Date.now()}`,
      category,
      label: label.trim(),
      orderIndex: maxIndex + 1,
      isActive: true
    };

    all[category] = [...list, newItem];
    this.cache = all;

    await db.settings.put({
      id: QUICK_OPTIONS_KEY,
      value: all
    });

    cloudSyncService.scheduleAutoSync();
    return newItem;
  }

  public async updateOption(category: string, id: string, updates: Partial<QuickOptionItem>): Promise<void> {
    const all = await this.getAllOptions();
    const list = all[category] || [];

    all[category] = list.map(item => {
      if (item.id === id) {
        return { ...item, ...updates };
      }
      return item;
    });

    this.cache = all;
    await db.settings.put({
      id: QUICK_OPTIONS_KEY,
      value: all
    });

    cloudSyncService.scheduleAutoSync();
  }

  public async toggleOptionActive(category: string, id: string, isActive: boolean): Promise<void> {
    await this.updateOption(category, id, { isActive });
  }

  public async deleteOption(category: string, id: string): Promise<void> {
    const all = await this.getAllOptions();
    const list = all[category] || [];

    all[category] = list.filter(item => item.id !== id);
    this.cache = all;

    await db.settings.put({
      id: QUICK_OPTIONS_KEY,
      value: all
    });

    cloudSyncService.scheduleAutoSync();
  }

  public async reorderOptions(category: string, orderedIds: string[]): Promise<void> {
    const all = await this.getAllOptions();
    const list = all[category] || [];
    const map = new Map(list.map(item => [item.id, item]));

    const reordered: QuickOptionItem[] = [];
    orderedIds.forEach((id, idx) => {
      const item = map.get(id);
      if (item) {
        reordered.push({ ...item, orderIndex: idx + 1 });
        map.delete(id);
      }
    });

    // Añadir los que no estaban en la lista
    map.forEach(remaining => {
      reordered.push({ ...remaining, orderIndex: reordered.length + 1 });
    });

    all[category] = reordered;
    this.cache = all;

    await db.settings.put({
      id: QUICK_OPTIONS_KEY,
      value: all
    });

    cloudSyncService.scheduleAutoSync();
  }

  public async resetCategoryToDefault(category: string): Promise<void> {
    const all = await this.getAllOptions();
    if (DEFAULT_QUICK_OPTIONS[category]) {
      all[category] = JSON.parse(JSON.stringify(DEFAULT_QUICK_OPTIONS[category]));
      this.cache = all;
      await db.settings.put({
        id: QUICK_OPTIONS_KEY,
        value: all
      });
      cloudSyncService.scheduleAutoSync();
    }
  }
}

export const quickOptionsService = new QuickOptionsService();
