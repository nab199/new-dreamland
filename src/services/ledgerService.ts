import { db } from '../config/DatabaseConfig';
import {
  Account,
  JournalEntry,
  JournalEntryLine,
  LedgerBalance,
  DoubleEntryResult,
  LedgerTransaction,
  AccountType,
  EntryType,
  TransactionStatus,
  validateDoubleEntry,
  generateEntryNumber,
  DEFAULT_ACCOUNTS
} from '../types/ledger';

export class LedgerService {
  async initializeAccounts(): Promise<void> {
    console.log('[LEDGER] Initializing default accounts...');

    for (const [key, account] of Object.entries(DEFAULT_ACCOUNTS)) {
      try {
        const existing = await db.get<Account>(
          'SELECT * FROM accounts WHERE code = ?',
          [account.code]
        );

        if (!existing) {
          await db.run(
            'INSERT INTO accounts (code, name, type, is_active) VALUES (?, ?, ?, 1)',
            [account.code, account.name, account.type]
          );
          console.log(`[LEDGER] Created account: ${account.code} - ${account.name}`);
        }
      } catch (error) {
        console.error(`[LEDGER] Error creating account ${account.code}:`, error);
      }
    }
  }

  async getAccountByCode(code: string): Promise<Account | undefined> {
    return db.get<Account>('SELECT * FROM accounts WHERE code = ?', [code]);
  }

  async getAccountById(id: number): Promise<Account | undefined> {
    return db.get<Account>('SELECT * FROM accounts WHERE id = ?', [id]);
  }

  async createTransaction(transaction: LedgerTransaction, userId: number | null = null): Promise<DoubleEntryResult> {
    const { description, lines, reference_type, reference_id } = transaction;

    if (lines.length === 0) {
      return { success: false, error: 'No journal entry lines provided' };
    }

    const validation = validateDoubleEntry(lines);
    if (!validation.valid) {
      console.error(`[LEDGER] Double-entry validation failed: ${validation.error}`);
      return { success: false, error: validation.error };
    }

    const entryNumber = generateEntryNumber('JE');

    try {
      await db.transaction(async (client) => {
        const entryResult = await client.run(
          `INSERT INTO journal_entries (entry_number, date, description, reference_type, reference_id, status, posted_by, posted_at)
           VALUES (?, datetime('now'), ?, ?, ?, 'pending', ?, datetime('now'))`,
          [entryNumber, description, reference_type, reference_id, userId]
        );

        const entryId = entryResult.lastInsertRowid;

        for (const line of lines) {
          const account = await this.getAccountById(line.account_id);
          if (!account) {
            throw new Error(`Account ${line.account_id} not found`);
          }

          await client.run(
            `INSERT INTO journal_entry_lines (journal_entry_id, account_id, entry_type, amount, memo)
             VALUES (?, ?, ?, ?, ?)`,
            [entryId, line.account_id, line.entry_type, line.amount, line.memo || null]
          );
        }

        await client.run(
          `UPDATE journal_entries SET status = 'posted' WHERE id = ?`,
          [entryId]
        );
      });

      const entry = await db.get<JournalEntry>(
        'SELECT * FROM journal_entries WHERE entry_number = ?',
        [entryNumber]
      );

      const entryLines = await db.all<JournalEntryLine>(
        'SELECT * FROM journal_entry_lines WHERE journal_entry_id = ?',
        [entry?.id]
      );

      console.log(`[LEDGER] Created journal entry ${entryNumber} with ${lines.length} lines. Total: ${validation.debit_total}`);

      return {
        success: true,
        journal_entry_id: entry?.id,
        entry_number: entryNumber,
        lines: entryLines
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[LEDGER] Failed to create transaction: ${errorMessage}`);

      try {
        await db.run(
          `INSERT INTO journal_entries (entry_number, date, description, reference_type, reference_id, status, error_message)
           VALUES (?, datetime('now'), ?, ?, ?, 'error', ?)`,
          [entryNumber, description, reference_type, reference_id, errorMessage]
        );
      } catch (logError) {
        console.error('[LEDGER] Failed to log error entry:', logError);
      }

      return { success: false, error: errorMessage };
    }
  }

  async recordPayment(
    studentId: number,
    paymentId: number,
    amount: number,
    paymentMethod: 'cbe_receipt' | 'chapa',
    userId: number | null = null
  ): Promise<DoubleEntryResult> {
    const bankAccount = await this.getAccountByCode('1100');
    const tuitionRevenue = await this.getAccountByCode('4000');

    if (!bankAccount || !tuitionRevenue) {
      return { success: false, error: 'Required accounts not found. Please initialize ledger accounts.' };
    }

    const lines: LedgerTransaction['lines'] = [
      {
        account_id: bankAccount.id,
        entry_type: 'debit',
        amount: amount,
        memo: `Payment from student ${studentId}, ref: ${paymentId}`
      },
      {
        account_id: tuitionRevenue.id,
        entry_type: 'credit',
        amount: amount,
        memo: `Tuition payment from student ${studentId}`
      }
    ];

    return this.createTransaction({
      reference_type: 'payment',
      reference_id: paymentId,
      description: `Student payment - Student ID: ${studentId}, Amount: ${amount} ETB, Method: ${paymentMethod}`,
      lines
    }, userId);
  }

  async recordPaymentAtomically(
    paymentId: number,
    studentId: number,
    amount: number,
    transactionRef: string,
    paymentMethod: 'cbe_receipt' | 'chapa',
    userId: number | null = null
  ): Promise<{ paymentId: number; ledgerResult: DoubleEntryResult }> {
    const entryNumber = generateEntryNumber('JE');
    
    const bankAccount = await this.getAccountByCode('1100');
    const tuitionRevenue = await this.getAccountByCode('4000');

    if (!bankAccount || !tuitionRevenue) {
      throw new Error('Required accounts not found. Please initialize ledger accounts.');
    }

    const debitAmount = amount;
    const creditAmount = amount;

    await db.transaction(async (client) => {
      const entryResult = await client.run(
        `INSERT INTO journal_entries (entry_number, date, description, reference_type, reference_id, status, posted_by, posted_at)
         VALUES (?, datetime('now'), ?, ?, ?, 'pending', ?, datetime('now'))`,
        [entryNumber, `Student payment - Student ID: ${studentId}, Amount: ${amount} ETB, Method: ${paymentMethod}`, 'payment', paymentId, userId]
      );

      const entryId = entryResult.lastInsertRowid;

      await client.run(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, entry_type, amount, memo)
         VALUES (?, ?, ?, ?, ?)`,
        [entryId, bankAccount.id, 'debit', debitAmount, `Payment from student ${studentId}, ref: ${paymentId}`]
      );

      await client.run(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, entry_type, amount, memo)
         VALUES (?, ?, ?, ?, ?)`,
        [entryId, tuitionRevenue.id, 'credit', creditAmount, `Tuition payment from student ${studentId}`]
      );

      await client.run(
        `UPDATE journal_entries SET status = 'posted' WHERE id = ?`,
        [entryId]
      );
    });

    console.log(`[LEDGER] Atomic payment recorded: ${entryNumber}, Total: ${debitAmount}`);

    return {
      paymentId,
      ledgerResult: {
        success: true,
        entry_number: entryNumber
      }
    };
  }

  async recordRefund(
    paymentId: number,
    originalAmount: number,
    refundAmount: number,
    reason: string,
    userId: number | null = null
  ): Promise<DoubleEntryResult> {
    const bankAccount = await this.getAccountByCode('1100');
    const tuitionRevenue = await this.getAccountByCode('4000');

    if (!bankAccount || !tuitionRevenue) {
      return { success: false, error: 'Required accounts not found' };
    }

    const lines: LedgerTransaction['lines'] = [
      {
        account_id: tuitionRevenue.id,
        entry_type: 'debit',
        amount: refundAmount,
        memo: `Refund - ${reason}`
      },
      {
        account_id: bankAccount.id,
        entry_type: 'credit',
        amount: refundAmount,
        memo: `Refund for payment ${paymentId}`
      }
    ];

    return this.createTransaction({
      reference_type: 'refund',
      reference_id: paymentId,
      description: `Refund - Original payment: ${paymentId}, Amount: ${refundAmount} ETB, Reason: ${reason}`,
      lines
    }, userId);
  }

  async getAccountBalance(accountId: number): Promise<LedgerBalance | undefined> {
    const account = await this.getAccountById(accountId);
    if (!account) return undefined;

    const debits = await db.get<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM journal_entry_lines
       WHERE account_id = ? AND entry_type = 'debit'`,
      [accountId]
    );

    const credits = await db.get<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM journal_entry_lines
       WHERE account_id = ? AND entry_type = 'credit'`,
      [accountId]
    );

    const debitTotal = debits?.total || 0;
    const creditTotal = credits?.total || 0;
    const balance = account.type === 'asset' || account.type === 'expense'
      ? debitTotal - creditTotal
      : creditTotal - debitTotal;

    return {
      account_id: accountId,
      account_code: account.code,
      account_name: account.name,
      account_type: account.type,
      debit_total: debitTotal,
      credit_total: creditTotal,
      balance
    };
  }

  async getTrialBalance(): Promise<LedgerBalance[]> {
    const accounts = await db.all<Account>('SELECT * FROM accounts WHERE is_active = 1 ORDER BY code');

    const balances: LedgerBalance[] = [];
    for (const account of accounts) {
      const balance = await this.getAccountBalance(account.id);
      if (balance) {
        balances.push(balance);
      }
    }

    const totals = balances.reduce(
      (acc, b) => ({
        debits: acc.debits + b.debit_total,
        credits: acc.credits + b.credit_total
      }),
      { debits: 0, credits: 0 }
    );

    console.log(`[LEDGER] Trial Balance - Total Debits: ${totals.debits}, Total Credits: ${totals.credits}, Balanced: ${Math.abs(totals.debits - totals.credits) < 0.01}`);

    return balances;
  }

  async getJournalEntry(entryId: number): Promise<JournalEntry | undefined> {
    return db.get<JournalEntry>('SELECT * FROM journal_entries WHERE id = ?', [entryId]);
  }

  async getJournalEntryLines(entryId: number): Promise<JournalEntryLine[]> {
    return db.all<JournalEntryLine>(
      `SELECT jel.*, a.code as account_code, a.name as account_name
       FROM journal_entry_lines jel
       JOIN accounts a ON jel.account_id = a.id
       WHERE jel.journal_entry_id = ?`,
      [entryId]
    );
  }

  async validateLedgerIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    const unbalanced = await db.get<{ entry_id: number; entry_number: string; debit_total: number; credit_total: number }>(
      `SELECT je.id as entry_id, je.entry_number,
              SUM(CASE WHEN jel.entry_type = 'debit' THEN jel.amount ELSE 0 END) as debit_total,
              SUM(CASE WHEN jel.entry_type = 'credit' THEN jel.amount ELSE 0 END) as credit_total
       FROM journal_entries je
       JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
       WHERE je.status = 'posted'
       GROUP BY je.id
       HAVING ABS(debit_total - credit_total) > 0.01`
    );

    if (unbalanced) {
      errors.push(`Unbalanced entry ${unbalanced.entry_number}: Debits=${unbalanced.debit_total}, Credits=${unbalanced.credit_total}`);
    }

    const orphanedLines = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM journal_entry_lines jel
       LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
       WHERE je.id IS NULL`
    );

    if (orphanedLines && orphanedLines.count > 0) {
      errors.push(`Found ${orphanedLines.count} orphaned journal entry lines`);
    }

    const negativeAmounts = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM journal_entry_lines WHERE amount <= 0`
    );

    if (negativeAmounts && negativeAmounts.count > 0) {
      errors.push(`Found ${negativeAmounts.count} journal entry lines with non-positive amounts`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const ledgerService = new LedgerService();
