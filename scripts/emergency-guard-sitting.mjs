// Prints the SQL for the 0036 (emergency_status_guard) live sitting. It prints only; it runs nothing.
// Usage: node scripts/emergency-guard-sitting.mjs <pre-check|dry-run|post-check> > <scratch>/<step>.sql
//
// Order (for the human's sitting; the shape follows the 0033 sitting in docs/implementation-status.md):
//   1. pre-check   read-only. set_my_status must still be the 0023 body (md5 below); no leftover `tests` schema;
//                  no idle-in-transaction sessions. Also check list_migrations: the newest is room_ai_plus
//                  (0035, remote 20261114094947) unless 0034 face_index was applied since; nothing named
//                  emergency_status_guard. On any mismatch, stop.
//   2. dry-run     lock_timeout first, then BEGIN, migration 0036, the assertions of
//                  supabase/tests/emergency_guard_test.sql, ROLLBACK. Pass = the row 'EMERGENCY GUARD TESTS PASSED',
//                  then the leftover row reads tests_schema = 0 and body = '0023'. A 'FAIL: …' rolls everything back: stop.
//   3. apply       apply_migration, name `emergency_status_guard`, the exact contents of
//                  supabase/migrations/20261104000036_emergency_status_guard.sql. Then run
//                  supabase/tests/emergency_guard_test.sql alone once more (it ends with ROLLBACK).
//   4. post-check  the body md5 is 0036's, still security definer with search_path '', authenticated can execute,
//                  anon and public cannot, and no `tests` schema is left. Also run get_advisors (security) and
//                  compare it with the baseline.
// Revert, on a rollback decision only: supabase/rollback/20261104000036_emergency_status_guard_revert.sql.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const MIG = 'supabase/migrations/20261104000036_emergency_status_guard.sql';
const OLD = 'supabase/migrations/20261104000023_emergency_resolved_line.sql';
const TEST = 'supabase/tests/emergency_guard_test.sql';

// md5 of the set_my_status body as pg_proc.prosrc stores it (the text between the $$ quotes).
function bodyMd5(file) {
  const src = read(file);
  const start = src.indexOf('create or replace function public.set_my_status(');
  if (start < 0) throw new Error(`set_my_status not found in ${file}`);
  const open = src.indexOf('$$', start) + 2;
  const close = src.indexOf('$$', open);
  return crypto.createHash('md5').update(src.slice(open, close)).digest('hex');
}
const OLD_MD5 = bodyMd5(OLD);
const NEW_MD5 = bodyMd5(MIG);

const bodyQuery = `select p.prosecdef, p.proconfig, md5(p.prosrc) as md5,
       case md5(p.prosrc) when '${OLD_MD5}' then '0023' when '${NEW_MD5}' then '0036' else 'UNKNOWN' end as body
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'set_my_status';`;
const leftovers = `select (select count(*) from pg_namespace where nspname = 'tests') as tests_schema,
       (select case md5(p.prosrc) when '${OLD_MD5}' then '0023' when '${NEW_MD5}' then '0036' else 'UNKNOWN' end
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'set_my_status') as body;`;

const steps = {
  'pre-check': () => `-- 0036 pre-check (read-only). Expected: one row, prosecdef true, proconfig {search_path=""}, body '0023';
-- then tests_schema 0; then idle_in_tx 0.
${bodyQuery}
${leftovers}
select count(*) as idle_in_tx from pg_stat_activity where state = 'idle in transaction';
`,
  'dry-run': () => {
    const test = read(TEST);
    const anchor = 'begin;\n';
    if (test.split(anchor).length !== 2) throw new Error('begin anchor not found exactly once');
    // A replacer function, so `$$` in the SQL is not read as a replacement pattern.
    const body = test.replace(anchor, () =>
      `${anchor}\n-- ===== migration 0036 (dry run) =====\n${read(MIG)}\n-- ===== end of migration 0036 =====\n\n`);
    return `-- 0036 dry run: lock_timeout, BEGIN, migration, assertions, ROLLBACK. Nothing persists.
set lock_timeout = '3s';
${body}
reset lock_timeout;
-- Expected after the ROLLBACK: tests_schema 0, body '0023'.
${leftovers}
`;
  },
  'post-check': () => `-- 0036 post-check. Expected: prosecdef true, proconfig {search_path=""}, body '0036'; grants true/false/false;
-- tests_schema 0.
${bodyQuery}
select has_function_privilege('authenticated', 'public.set_my_status(uuid, uuid)', 'execute') as authenticated_exec,
       has_function_privilege('anon', 'public.set_my_status(uuid, uuid)', 'execute') as anon_exec,
       has_function_privilege('public', 'public.set_my_status(uuid, uuid)', 'execute') as public_exec;
${leftovers}
`,
};

const step = process.argv[2];
if (!steps[step]) {
  console.error(`usage: node scripts/emergency-guard-sitting.mjs <${Object.keys(steps).join('|')}>`);
  process.exit(2);
}
process.stdout.write(steps[step]());
