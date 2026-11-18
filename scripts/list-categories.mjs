import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase.from('tracks').select('category');
if (error) { console.error(error); process.exit(1); }

const counts = {};
for (const t of data) counts[t.category] = (counts[t.category] ?? 0) + 1;
console.log('Catégories en base :');
for (const [cat, n] of Object.entries(counts)) console.log(`  "${cat}" — ${n} tracks`);
