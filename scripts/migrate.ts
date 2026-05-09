// Run with: node --loader ts-node/esm scripts/migrate.ts
// Or compile first: tsc scripts/migrate.ts && node scripts/migrate.js

import { migrate } from '../src/lib/db.js';

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
