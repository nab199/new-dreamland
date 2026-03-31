import { db } from '../config/DatabaseConfig';
import { IDEMPOTENCY_EXPIRY_HOURS, validateIdempotencyKey, IdempotencyRecord } from '../types/idempotency';
import crypto from 'crypto';

export class IdempotencyService {
  async checkAndLock(key: string, requestBody: unknown): Promise<{ exists: boolean; record?: IdempotencyRecord; processing?: boolean }> {
    const validation = validateIdempotencyKey(key);
    if (!validation.valid || !validation.key) {
      return { exists: false };
    }

    const normalizedKey = validation.key;
    const requestHash = this.hashRequest(requestBody);

    try {
      const existing = await db.get<IdempotencyRecord>(
        'SELECT * FROM idempotency_keys WHERE idempotency_key = ?',
        [normalizedKey]
      );

      if (existing) {
        if (existing.request_hash !== requestHash) {
          console.error(`[IDEMPOTENCY] Key collision: ${normalizedKey} - same key with different request body`);
          return { exists: false };
        }

        if (existing.response_status === -1) {
          return { exists: true, record: existing, processing: true };
        }

        return { exists: true, record: existing };
      }

      await db.run(
        'INSERT INTO idempotency_keys (idempotency_key, request_hash, response_status, response_body, expires_at) VALUES (?, ?, ?, ?, ?)',
        [normalizedKey, requestHash, -1, '', this.getExpiryDate()]
      );

      return { exists: false };
    } catch (error) {
      console.error('[IDEMPOTENCY] Error checking key:', error);
      return { exists: false };
    }
  }

  async saveResponse(key: string, statusCode: number, responseBody: unknown): Promise<void> {
    try {
      await db.run(
        'UPDATE idempotency_keys SET response_status = ?, response_body = ? WHERE idempotency_key = ?',
        [statusCode, JSON.stringify(responseBody), key]
      );
    } catch (error) {
      console.error('[IDEMPOTENCY] Error saving response:', error);
    }
  }

  async getResponse(key: string): Promise<IdempotencyRecord | undefined> {
    return db.get<IdempotencyRecord>(
      'SELECT * FROM idempotency_keys WHERE idempotency_key = ?',
      [key]
    );
  }

  async cleanup(): Promise<number> {
    try {
      const result = await db.run(
        'DELETE FROM idempotency_keys WHERE expires_at < datetime("now")'
      );
      return result.changes;
    } catch (error) {
      console.error('[IDEMPOTENCY] Cleanup error:', error);
      return 0;
    }
  }

  private hashRequest(body: unknown): string {
    const normalized = JSON.stringify(body, Object.keys(body as object).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 64);
  }

  private getExpiryDate(): string {
    const date = new Date();
    date.setHours(date.getHours() + IDEMPOTENCY_EXPIRY_HOURS);
    return date.toISOString();
  }
}

export const idempotencyService = new IdempotencyService();
