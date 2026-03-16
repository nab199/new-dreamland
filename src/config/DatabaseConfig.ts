import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is missing. Database features will be disabled.');
}

/**
 * PostgreSQL Connection Pool for Supabase.
 * This class handles the connection to your Supabase PostgreSQL database.
 */
export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Supabase in many hosting environments
  }
});

/**
 * Migration Helper: Since the original app used SQLite (better-sqlite3),
 * this helper provides a familiar interface while using the 'pg' driver.
 */
export const db = {
  /**
   * Run a query that returns multiple rows.
   */
  async all(sql: string, params: any[] = []): Promise<any[]> {
    const result = await pool.query(sql, params);
    return result.rows;
  },

  /**
   * Run a query that returns a single row.
   */
  async get(sql: string, params: any[] = []): Promise<any> {
    const result = await pool.query(sql, params);
    return result.rows[0];
  },

  /**
   * Run a query that doesn't return data (INSERT, UPDATE, DELETE).
   */
  async run(sql: string, params: any[] = []): Promise<any> {
    // Note: Postgres doesn't have 'lastInsertRowid' like SQLite.
    // To get the ID, you should add 'RETURNING id' to your INSERT query.
    return await pool.query(sql, params);
  },

  /**
   * For schema execution.
   */
  async exec(sql: string): Promise<void> {
    await pool.query(sql);
  }
};
