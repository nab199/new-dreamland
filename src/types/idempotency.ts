export interface IdempotencyRecord {
  id: string;
  idempotency_key: string;
  request_hash: string;
  response_status: number;
  response_body: string;
  created_at: string;
  expires_at: string;
}

export interface IdempotencyConfig {
  keyHeader: string;
  expirySeconds: number;
  keyPrefix: string;
}

export const IDEMPOTENCY_HEADER = 'X-Idempotency-Key';
export const IDEMPOTENCY_EXPIRY_HOURS = 24;

export function generateIdempotencyKey(prefix: string = 'PAY'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

export function validateIdempotencyKey(key: string | undefined): { valid: boolean; error?: string; key?: string } {
  if (!key) {
    return { valid: false, error: `Missing idempotency key. Header '${IDEMPOTENCY_HEADER}' is required.` };
  }

  if (typeof key !== 'string') {
    return { valid: false, error: 'Idempotency key must be a string' };
  }

  const trimmedKey = key.trim();

  if (trimmedKey.length < 8) {
    return { valid: false, error: 'Idempotency key must be at least 8 characters' };
  }

  if (trimmedKey.length > 128) {
    return { valid: false, error: 'Idempotency key must not exceed 128 characters' };
  }

  const validPattern = /^[A-Za-z0-9_-]+$/;
  if (!validPattern.test(trimmedKey)) {
    return { valid: false, error: 'Idempotency key contains invalid characters. Use only alphanumeric, underscore, and hyphen.' };
  }

  return { valid: true, key: trimmedKey };
}
