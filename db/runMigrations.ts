import { ensureDatabaseSchema } from '../src/db/bootstrap.js';

async function runMigrations() {
  try {
    await ensureDatabaseSchema(1);
    console.log('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

runMigrations();
