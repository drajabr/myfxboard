import fs from 'fs';
import path from 'path';
import { query } from '../src/db/connection.js';

const migrationsDir = path.resolve('db/migrations');

async function runMigrations() {
  try {
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`Running migration: ${file}`);
      await query(content);
      console.log(`✓ ${file} completed`);
    }

    console.log('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

runMigrations();
