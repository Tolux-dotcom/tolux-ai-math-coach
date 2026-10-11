// Outputs a reviewed schema-only SQL bundle. Makes no network/database calls.
import fs from 'node:fs/promises';
export async function stagingSchemaParts() {
  const baseline = await fs.readFile(new URL('./staging/baseline.sql', import.meta.url),'utf8');
  const lessons = await fs.readFile(new URL('../supabase/migrations/202608290001_create_lesson_completions.sql', import.meta.url),'utf8');
  const history = JSON.parse(await fs.readFile(new URL('./staging/schema-history-20261010.json', import.meta.url),'utf8'));
  const billing = await fs.readFile(new URL('../supabase/migrations/202610070001_create_stripe_billing_ownership.sql', import.meta.url),'utf8');
  return [{name:'missing_baseline',sql:baseline},{name:'lesson_completions',sql:lessons},
    ...history.map(row=>({name:row.name,sql:row.statements.join('\n')})),
    {name:'stripe_billing_ownership',sql:billing}];
}
if (process.argv[1] && import.meta.url === new URL(process.argv[1],'file:').href) {
  const parts = await stagingSchemaParts();
  console.log('-- STAGING ONLY: apply once to a disposable branch with no Auth users.\n' +
    parts.map(part=>`-- ${part.name}\n${part.sql}`).join('\n'));
}
