import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../../../db/migrations');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function ensureDatabaseSchema(maxAttempts: number = 10) {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    throw new Error(`No migration files found in: ${migrationsDir}`);
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      for (const file of files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        console.log(`Applying startup migration: ${file}`);
        await query(sql);
      }

      console.log('Database schema is ready');
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      console.warn(`Database schema bootstrap attempt ${attempt} failed; retrying...`, error);
      await sleep(2000);
    }
  }
}