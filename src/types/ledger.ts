export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type EntryType = 'debit' | 'credit';
export type TransactionStatus = 'pending' | 'posted' | 'reversed' | 'error';

export interface Account {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  parent_id: number | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: number;
  entry_number: string;
  date: string;
  description: string;
  reference_type: string | null;
  reference_id: number | null;
  status: TransactionStatus;
  posted_by: number | null;
  created_at: string;
  posted_at: string | null;
}

export interface JournalEntryLine {
  id: number;
  journal_entry_id: number;
  account_id: number;
  entry_type: EntryType;
  amount: number;
  memo: string | null;
  created_at: string;
}

export interface LedgerBalance {
  account_id: number;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  debit_total: number;
  credit_total: number;
  balance: number;
}

export interface DoubleEntryResult {
  success: boolean;
  journal_entry_id?: number;
  entry_number?: string;
  error?: string;
  lines?: JournalEntryLine[];
}

export interface LedgerTransaction {
  id?: number;
  reference_type: 'payment' | 'refund' | 'fee' | 'adjustment';
  reference_id: number | null;
  description: string;
  lines: {
    account_id: number;
    entry_type: EntryType;
    amount: number;
    memo?: string;
  }[];
}

const DEBIT_ACCOUNTS: AccountType[] = ['asset', 'expense'];
const CREDIT_ACCOUNTS: AccountType[] = ['liability', 'equity', 'revenue'];

export function isDebitNormal(accountType: AccountType): boolean {
  return DEBIT_ACCOUNTS.includes(accountType);
}

export function isCreditNormal(accountType: AccountType): boolean {
  return CREDIT_ACCOUNTS.includes(accountType);
}

export function validateDoubleEntry(
  lines: { account_id: number; entry_type: EntryType; amount: number; memo?: string }[]
): { valid: boolean; error?: string; debit_total: number; credit_total: number } {
  if (!lines || lines.length < 2) {
    return { valid: false, error: 'At least two entries are required for double-entry bookkeeping', debit_total: 0, credit_total: 0 };
  }

  let debitTotal = 0;
  let creditTotal = 0;

  for (const line of lines) {
    if (typeof line.amount !== 'number' || line.amount <= 0) {
      return { valid: false, error: `Invalid amount for account ${line.account_id}: must be a positive number`, debit_total: 0, credit_total: 0 };
    }

    if (line.entry_type === 'debit') {
      debitTotal += line.amount;
    } else if (line.entry_type === 'credit') {
      creditTotal += line.amount;
    } else {
      return { valid: false, error: `Invalid entry type for account ${line.account_id}: must be 'debit' or 'credit'`, debit_total: 0, credit_total: 0 };
    }
  }

  const tolerance = 0.001;
  if (Math.abs(debitTotal - creditTotal) > tolerance) {
    return {
      valid: false,
      error: `DOUBLE-ENTRY VIOLATION: Debit total (${debitTotal}) does not equal Credit total (${creditTotal}). Difference: ${Math.abs(debitTotal - creditTotal)}`,
      debit_total: debitTotal,
      credit_total: creditTotal
    };
  }

  return { valid: true, debit_total: debitTotal, credit_total: creditTotal };
}

export function generateEntryNumber(prefix: string = 'JE'): string {
  const timestamp = new Date();
  const year = timestamp.getFullYear();
  const month = String(timestamp.getMonth() + 1).padStart(2, '0');
  const day = String(timestamp.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${year}${month}${day}-${random}`;
}

export const DEFAULT_ACCOUNTS = {
  CASH: { code: '1000', name: 'Cash', type: 'asset' as AccountType },
  BANK: { code: '1100', name: 'Bank Account', type: 'asset' as AccountType },
  ACCOUNTS_RECEIVABLE: { code: '1200', name: 'Accounts Receivable', type: 'asset' as AccountType },
  TUITION_RECEIVABLE: { code: '1210', name: 'Tuition Receivable', type: 'asset' as AccountType },
  STUDENT_RECEIVABLE: { code: '1220', name: 'Student Receivable', type: 'asset' as AccountType },
  ACCOUNTS_PAYABLE: { code: '2000', name: 'Accounts Payable', type: 'liability' as AccountType },
  TUITION_REVENUE: { code: '4000', name: 'Tuition Revenue', type: 'revenue' as AccountType },
  FEE_REVENUE: { code: '4100', name: 'Fee Revenue', type: 'revenue' as AccountType },
  OTHER_REVENUE: { code: '4200', name: 'Other Revenue', type: 'revenue' as AccountType },
  PAYMENT_PROCESSING_FEE: { code: '5000', name: 'Payment Processing Fee', type: 'expense' as AccountType },
  BAD_DEBT_EXPENSE: { code: '5100', name: 'Bad Debt Expense', type: 'expense' as AccountType },
};
