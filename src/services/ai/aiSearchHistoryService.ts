import { db } from '../../db/dexieDb';
import { AISearchHistoryItem } from '../../types';

export class AISearchHistoryService {
  private static instance: AISearchHistoryService;

  private constructor() {}

  public static getInstance(): AISearchHistoryService {
    if (!AISearchHistoryService.instance) {
      AISearchHistoryService.instance = new AISearchHistoryService();
    }
    return AISearchHistoryService.instance;
  }

  /**
   * Guarda una consulta clínica en el historial del usuario autenticado.
   * CERO datos de pacientes se almacenan automáticamente.
   */
  public async saveHistoryItem(item: {
    userId: string;
    query: string;
    answer: string;
    sources?: Array<{ title: string; url: string }>;
    mode: 'ia' | 'web';
    latencyMs?: number;
    modelUsed?: string;
  }): Promise<AISearchHistoryItem> {
    const historyItem: AISearchHistoryItem = {
      id: 'ai-hist-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      userId: item.userId || 'anonymous',
      query: item.query.trim(),
      answer: item.answer.trim(),
      sources: item.sources || [],
      timestamp: new Date().toISOString(),
      mode: item.mode,
      latencyMs: item.latencyMs,
      modelUsed: item.modelUsed
    };

    try {
      await db.aiSearchHistory.put(historyItem);
    } catch (e) {
      console.warn('[AISearchHistory] Error guardando historial en Dexie:', e);
    }

    return historyItem;
  }

  /**
   * Obtiene el historial del usuario autenticado ordenado de más reciente a más antiguo
   */
  public async getHistoryByUser(userId: string): Promise<AISearchHistoryItem[]> {
    if (!userId) return [];
    try {
      const items = await db.aiSearchHistory
        .where('userId')
        .equals(userId)
        .reverse()
        .sortBy('timestamp');
      return items;
    } catch (e) {
      console.warn('[AISearchHistory] Error consultando historial de usuario:', e);
      return [];
    }
  }

  /**
   * Borra todas las consultas del usuario autenticado
   */
  public async clearHistoryByUser(userId: string): Promise<void> {
    if (!userId) return;
    try {
      const items = await db.aiSearchHistory.where('userId').equals(userId).toArray();
      const ids = items.map(i => i.id);
      await db.aiSearchHistory.bulkDelete(ids);
    } catch (e) {
      console.warn('[AISearchHistory] Error borrando historial de usuario:', e);
    }
  }

  /**
   * Elimina un ítem específico del historial
   */
  public async deleteHistoryItem(id: string): Promise<void> {
    try {
      await db.aiSearchHistory.delete(id);
    } catch (e) {
      console.warn('[AISearchHistory] Error eliminando ítem de historial:', e);
    }
  }
}

export const aiSearchHistoryService = AISearchHistoryService.getInstance();
