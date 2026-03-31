import pg from 'pg';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const usePostgres = !!connectionString;

let pool: pg.Pool | null = null;
let sqliteDb: Database.Database | null = null;

if (usePostgres) {
  console.log("🚀 Using PostgreSQL/Supabase Database");
  
  // SECURITY: Configure SSL based on environment
  const isProduction = process.env.NODE_ENV === 'production';
  
  pool = new Pool({
    connectionString,
    ssl: isProduction ? {
      rejectUnauthorized: true  // STRICT: Require valid certificates in production
    } : {
      rejectUnauthorized: false  // Allow self-signed certs in development
    }
  });
} else {
  console.log("📁 Using Local SQLite Database");
  sqliteDb = new Database("college.db");
}

/**
 * Database operation result for write operations
 */
export interface DatabaseWriteResult {
  lastInsertRowid: number | bigint;
  changes: number;
}

/**
 * Error log entry for database operations
 */
interface DatabaseErrorLog {
  timestamp: string;
  operation: 'run' | 'get' | 'all' | 'exec' | 'transaction' | 'strictWrite';
  sql?: string;
  params?: unknown[];
  error: string;
  databaseType: 'postgres' | 'sqlite';
}

/**
 * SQL Parameter Converter: Converts SQLite '?' placeholders to PostgreSQL '$1', '$2', etc.
 */
function convertSql(sql: string): string {
  if (!usePostgres) return sql;
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

/**
 * Log database errors with full context for debugging
 */
function logDatabaseError(log: DatabaseErrorLog): void {
  console.error('[DATABASE ERROR]', JSON.stringify({
    ...log,
    params: log.params ? '[REDACTED]' : undefined // Don't log sensitive data
  }, null, 2));
}

  /**
   * Transaction client interface
   */
export interface TransactionClient {
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<DatabaseWriteResult>;
  strictWrite(
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    tableName: string,
    sql: string,
    params?: unknown[]
  ): Promise<DatabaseWriteResult>;
}

/**
 * Unified Database Interface with Strict Type Checking
 */
export interface DatabaseInterface {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<DatabaseWriteResult>;
  exec(sql: string): Promise<void>;
  transaction(callback: (client: TransactionClient) => Promise<void>): Promise<void>;
  strictWrite(operation: 'INSERT' | 'UPDATE' | 'DELETE', tableName: string, sql: string, params?: unknown[]): Promise<DatabaseWriteResult>;
  prepare(sql: string): {
    all<T>(...params: unknown[]): Promise<T[]>;
    get<T>(...params: unknown[]): Promise<T | undefined>;
    run(...params: unknown[]): Promise<DatabaseWriteResult>;
  };
}

export const db: DatabaseInterface = {
  /**
   * Run a query that returns multiple rows.
   * Generic type T ensures type safety for returned data.
   */
  async all<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    try {
      if (usePostgres) {
        if (!pool) throw new Error('PostgreSQL pool not initialized');
        const pgSql = convertSql(sql);
        const result = await pool.query(pgSql, params);
        return result.rows as T[];
      } else {
        if (!sqliteDb) throw new Error('SQLite database not initialized');
        return sqliteDb.prepare(sql).all(...params) as T[];
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      logDatabaseError({
        timestamp: new Date().toISOString(),
        operation: 'all',
        sql,
        error: errorMessage,
        databaseType: usePostgres ? 'postgres' : 'sqlite'
      });
      throw error;
    }
  },

  /**
   * Run a query that returns a single row.
   * Returns undefined if no row found.
   */
  async get<T = unknown>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    try {
      if (usePostgres) {
        if (!pool) throw new Error('PostgreSQL pool not initialized');
        const pgSql = convertSql(sql);
        const result = await pool.query(pgSql, params);
        return result.rows[0] as T | undefined;
      } else {
        if (!sqliteDb) throw new Error('SQLite database not initialized');
        return sqliteDb.prepare(sql).get(...params) as T | undefined;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      logDatabaseError({
        timestamp: new Date().toISOString(),
        operation: 'get',
        sql,
        error: errorMessage,
        databaseType: usePostgres ? 'postgres' : 'sqlite'
      });
      throw error;
    }
  },

  /**
   * Run a query that doesn't return data (INSERT, UPDATE, DELETE).
   * Logs all write operations for audit purposes.
   */
  async run(sql: string, params: unknown[] = []): Promise<DatabaseWriteResult> {
    try {
      if (usePostgres) {
        if (!pool) throw new Error('PostgreSQL pool not initialized');
        const pgSql = convertSql(sql);
        // Try to append RETURNING id to INSERT statements in Postgres if not present
        let finalSql = pgSql;
        if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
            finalSql += ' RETURNING id';
        }
        const result = await pool.query(finalSql, params);
        return {
          lastInsertRowid: result.rows[0]?.id || result.rowCount || 0,
          changes: result.rowCount || 0
        };
      } else {
        if (!sqliteDb) throw new Error('SQLite database not initialized');
        const result = sqliteDb.prepare(sql).run(...params);
        return {
          lastInsertRowid: result.lastInsertRowid,
          changes: result.changes
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      logDatabaseError({
        timestamp: new Date().toISOString(),
        operation: 'run',
        sql,
        error: errorMessage,
        databaseType: usePostgres ? 'postgres' : 'sqlite'
      });
      throw error;
    }
  },

  /**
   * For schema execution.
   * Logs errors for schema operations.
   */
  async exec(sql: string): Promise<void> {
    try {
      if (usePostgres) {
        if (!pool) throw new Error('PostgreSQL pool not initialized');
        await pool.query(sql);
      } else {
        if (!sqliteDb) throw new Error('SQLite database not initialized');
        sqliteDb.exec(sql);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      logDatabaseError({
        timestamp: new Date().toISOString(),
        operation: 'exec',
        sql,
        error: errorMessage,
        databaseType: usePostgres ? 'postgres' : 'sqlite'
      });
      throw error;
    }
  },

  /**
   * Transaction helper with strict typing
   * Ensures atomic operations with proper error handling
   */
  async transaction(callback: (client: TransactionClient) => Promise<void>): Promise<void> {
    if (usePostgres) {
      if (!pool) throw new Error('PostgreSQL pool not initialized');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Transaction client with same interface
        const txDb: TransactionClient = {
            all: async <T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> => {
                const result = await client.query(convertSql(sql), params);
                return result.rows as T[];
            },
            get: async <T = unknown>(sql: string, params: unknown[] = []): Promise<T | undefined> => {
                const result = await client.query(convertSql(sql), params);
                return result.rows[0] as T | undefined;
            },
            run: async (sql: string, params: unknown[] = []): Promise<DatabaseWriteResult> => {
                let s = convertSql(sql);
                if (s.trim().toUpperCase().startsWith('INSERT') && !s.toUpperCase().includes('RETURNING')) {
                    s += ' RETURNING id';
                }
                const r = await client.query(s, params);
                return { lastInsertRowid: r.rows[0]?.id || r.rowCount || 0, changes: r.rowCount || 0 };
            },
            strictWrite: async (operation: 'INSERT' | 'UPDATE' | 'DELETE', tableName: string, sql: string, params: unknown[] = []): Promise<DatabaseWriteResult> => {
                const logId = `TX-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
                console.log(`[${logId}] TRANSACTION ${operation} on ${tableName}`);
                return this.run(sql, params);
            }
        };
        await callback(txDb);
        await client.query('COMMIT');
      } catch (e: unknown) {
        await client.query('ROLLBACK');
        const errorMessage = e instanceof Error ? e.message : 'Transaction failed';
        logDatabaseError({
          timestamp: new Date().toISOString(),
          operation: 'transaction',
          error: errorMessage,
          databaseType: 'postgres'
        });
        throw e;
      } finally {
        client.release();
      }
    } else {
      if (!sqliteDb) throw new Error('SQLite database not initialized');
      try {
        const transaction = sqliteDb.transaction((cb: (db: TransactionClient) => Promise<void>) => {
          // Wrap synchronous SQLite operations
          const txDb: TransactionClient = {
            all: async <T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> => {
                if (!sqliteDb) throw new Error('SQLite not initialized');
                return sqliteDb.prepare(sql).all(...params) as T[];
            },
            get: async <T = unknown>(sql: string, params: unknown[] = []): Promise<T | undefined> => {
                if (!sqliteDb) throw new Error('SQLite not initialized');
                return sqliteDb.prepare(sql).get(...params) as T | undefined;
            },
            run: async (sql: string, params: unknown[] = []): Promise<DatabaseWriteResult> => {
                if (!sqliteDb) throw new Error('SQLite not initialized');
                const result = sqliteDb.prepare(sql).run(...params);
                return { lastInsertRowid: result.lastInsertRowid, changes: result.changes };
            },
            strictWrite: async (operation: 'INSERT' | 'UPDATE' | 'DELETE', tableName: string, sql: string, params: unknown[] = []): Promise<DatabaseWriteResult> => {
                const logId = `TX-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
                console.log(`[${logId}] TRANSACTION ${operation} on ${tableName}`);
                return this.run(sql, params);
            }
          };
          return cb(txDb);
        });
        await transaction(async (txDb) => {
          await callback(txDb);
        });
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Transaction failed';
        logDatabaseError({
          timestamp: new Date().toISOString(),
          operation: 'transaction',
          error: errorMessage,
          databaseType: 'sqlite'
        });
        throw e;
      }
    }
  },

  /**
   * Strict write wrapper with comprehensive error logging
   * All database writes MUST go through this method for audit trail
   */
  async strictWrite(
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    tableName: string,
    sql: string,
    params: unknown[] = []
  ): Promise<DatabaseWriteResult> {
    const logId = `DB-WRITE-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const startTime = Date.now();

    console.log(`[${logId}] ${operation} on ${tableName} - SQL: ${sql.substring(0, 100)}...`);

    try {
      const result = await this.run(sql, params);
      const duration = Date.now() - startTime;

      console.log(`[${logId}] SUCCESS - ${operation} affected ${result.changes} rows in ${duration}ms`);

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      const duration = Date.now() - startTime;

      logDatabaseError({
        timestamp: new Date().toISOString(),
        operation: 'strictWrite',
        sql,
        params,
        error: `[${logId}] ${errorMessage} (duration: ${duration}ms)`,
        databaseType: usePostgres ? 'postgres' : 'sqlite'
      });

      throw error;
    }
  },

  prepare(sql: string) {
    return {
      all: <T>(...params: unknown[]) => (this as DatabaseInterface).all<T>(sql, params),
      get: <T>(...params: unknown[]) => (this as DatabaseInterface).get<T>(sql, params),
      run: (...params: unknown[]) => (this as DatabaseInterface).run(sql, params)
    };
  }
};

export const usePostgresMode = usePostgres;
