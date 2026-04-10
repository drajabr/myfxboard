import pg from 'pg';
import { config } from 'dotenv';

config();

const { Pool } = pg;
const LOG_SQL_QUERIES = process.env.LOG_SQL_QUERIES === 'true';
const TRANSACTION_STATEMENT_TIMEOUT_MS = 15000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://dashboard:dashboard_pass@localhost:5432/myfxboard',
  max: 60,
  idleTimeoutMillis: 15000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Keep the process alive; transient DB issues should not hard-crash the server.
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (LOG_SQL_QUERIES) {
      console.log('Executed query', { text, duration, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('Database query error', { text, error });
    throw error;
  }
};

export const transaction = async <T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL statement_timeout = '${TRANSACTION_STATEMENT_TIMEOUT_MS}ms'`);
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const isDatabaseReady = async (): Promise<boolean> => {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database readiness check failed', error);
    return false;
  } finally {
    client.release();
  }
};

export default pool;
