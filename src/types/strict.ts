export interface StrictVerificationSignal {
  readonly verified: true;
  readonly amount: number;
  readonly reference: string;
  readonly verificationSource: 'api';
}

export interface StrictChapaVerificationSignal {
  readonly status: 'success';
  readonly data: {
    readonly amount: number;
    readonly tx_ref: string;
    readonly status: 'success';
  };
}

export interface StrictPaymentInsert {
  student_id: number;
  amount: number;
  status: 'verified';
  transaction_ref: string;
  payment_method: 'cbe_receipt' | 'chapa';
}

export interface StrictStudentUpdate {
  studentId: string;
  fields: {
    birth_year?: number;
    birth_place_region?: string;
    birth_place_zone?: string;
    birth_place_woreda?: string;
    birth_place_kebele?: string;
    contact_phone?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    student_type?: string;
    program_id?: number | null;
    program_degree?: string;
    academic_status?: string;
  };
  full_name?: string;
}

export interface StrictDBWriteResult {
  success: boolean;
  lastInsertRowid?: number | bigint;
  changes?: number;
  error?: string;
}

export type PaymentMethod = 'cbe_receipt' | 'chapa';
export type PaymentStatus = 'pending' | 'verified' | 'failed';

export function isStrictVerificationSignal(obj: unknown): obj is StrictVerificationSignal {
  if (typeof obj !== 'object' || obj === null) return false;
  const signal = obj as Record<string, unknown>;
  return (
    signal.verified === true &&
    typeof signal.amount === 'number' &&
    signal.amount > 0 &&
    typeof signal.reference === 'string' &&
    signal.reference.length > 0 &&
    signal.verificationSource === 'api'
  );
}

export function isStrictChapaVerificationSignal(obj: unknown): obj is StrictChapaVerificationSignal {
  if (typeof obj !== 'object' || obj === null) return false;
  const signal = obj as Record<string, unknown>;
  return (
    signal.status === 'success' &&
    typeof signal.data === 'object' &&
    signal.data !== null &&
    (signal.data as Record<string, unknown>).status === 'success' &&
    typeof (signal.data as Record<string, unknown>).amount === 'number' &&
    Number((signal.data as Record<string, unknown>).amount) > 0
  );
}

export function validatePaymentInsert(data: Partial<StrictPaymentInsert>): { valid: boolean; error?: string } {
  if (typeof data.student_id !== 'number' || data.student_id <= 0) {
    return { valid: false, error: 'Invalid student_id: must be a positive number' };
  }
  if (typeof data.amount !== 'number' || data.amount <= 0) {
    return { valid: false, error: 'Invalid amount: must be a positive number' };
  }
  if (data.status !== 'verified') {
    return { valid: false, error: 'Invalid status: only "verified" is allowed for payment records' };
  }
  if (typeof data.transaction_ref !== 'string' || data.transaction_ref.length === 0) {
    return { valid: false, error: 'Invalid transaction_ref: must be a non-empty string' };
  }
  if (!['cbe_receipt', 'chapa'].includes(data.payment_method as string)) {
    return { valid: false, error: 'Invalid payment_method' };
  }
  return { valid: true };
}

export function validateStudentUpdate(data: unknown): { valid: boolean; error?: string; sanitized?: StrictStudentUpdate } {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, error: 'Request body must be an object' };
  }

  const input = data as Record<string, unknown>;
  const sanitized: StrictStudentUpdate = {
    studentId: input.studentId as string,
    fields: {}
  };

  if (input.birth_year !== undefined && typeof input.birth_year !== 'number') {
    return { valid: false, error: 'birth_year must be a number' };
  }
  if (input.birth_year !== undefined) {
    sanitized.fields.birth_year = input.birth_year as number;
  }

  const stringFields = ['birth_place_region', 'birth_place_zone', 'birth_place_woreda', 'birth_place_kebele', 'contact_phone', 'emergency_contact_name', 'emergency_contact_phone', 'student_type', 'academic_status'] as const;
  for (const field of stringFields) {
    if (input[field] !== undefined && typeof input[field] !== 'string') {
      return { valid: false, error: `${field} must be a string` };
    }
    if (input[field] !== undefined) {
      (sanitized.fields as Record<string, unknown>)[field] = input[field];
    }
  }

  if (input.program_id !== undefined && typeof input.program_id !== 'number' && input.program_id !== null) {
    return { valid: false, error: 'program_id must be a number or null' };
  }
  if (input.program_id !== undefined) {
    sanitized.fields.program_id = input.program_id as number | null;
  }

  if (input.program_degree !== undefined && typeof input.program_degree !== 'string') {
    return { valid: false, error: 'program_degree must be a string' };
  }
  if (input.program_degree !== undefined) {
    sanitized.fields.program_degree = input.program_degree as string;
  }

  if (input.full_name !== undefined) {
    if (typeof input.full_name !== 'string') {
      return { valid: false, error: 'full_name must be a string' };
    }
    sanitized.full_name = input.full_name as string;
  }

  return { valid: true, sanitized };
}
