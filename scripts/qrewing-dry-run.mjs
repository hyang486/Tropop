// Prints the 0027 dry-run SQL: supabase/tests/qrewing_ai_test.sql with migration 0027 pasted right after
// `set local lock_timeout`, so the DDL rolls back together with the test data.
// Usage: node scripts/qrewing-dry-run.mjs > <scratch>/qrewing_dry_run.sql
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const test = fs.readFileSync(path.join(root, 'supabase/tests/qrewing_ai_test.sql'), 'utf8');
const mig = fs.readFileSync(path.join(root, 'supabase/migrations/20261104000027_qrewing_ai.sql'), 'utf8');
const anchor = "set local lock_timeout = '3s';\n";
if (test.split(anchor).length !== 2) throw new Error('lock_timeout anchor not found exactly once');
// `notify` inside the dry run is harmless (it is delivered only on COMMIT, and the run ends with ROLLBACK).
// A replacer function, so `$$` in the SQL is not read as a replacement pattern.
process.stdout.write(test.replace(anchor, () => `${anchor}\n-- ===== migration 0027 (dry run) =====\n${mig}\n-- ===== end of migration 0027 =====\n\n`));
