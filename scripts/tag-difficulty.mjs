/**
 * Script de tagging des difficultés pour les tracks Supabase.
 *
 * Usage : (variables lues depuis .env, voir .env.example)
 *   node --env-file=.env scripts/tag-difficulty.mjs           → mode interactif
 *   node --env-file=.env scripts/tag-difficulty.mjs --export  → exporte tracks.json
 *   node --env-file=.env scripts/tag-difficulty.mjs --apply   → applique tracks.json modifié
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';
import * as fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const EXPORT_FILE = './scripts/tracks.json';

const DIFF_LABEL = { 1: 'Facile', 2: 'Moyen', 3: 'Difficile' };
const CATEGORIES = ['anime', 'games', 'series', 'movies', 'animation', 'pubs'];

async function fetchAllTracks() {
  const { data, error } = await supabase
    .from('tracks')
    .select('id, title, category, year, difficulty, is_premium')
    .order('category')
    .order('title');
  if (error) throw error;
  return data;
}

// ─── MODE --export ────────────────────────────────────────────────────────────
async function exportTracks() {
  console.log('Récupération des tracks…');
  const tracks = await fetchAllTracks();
  fs.writeFileSync(EXPORT_FILE, JSON.stringify(tracks, null, 2));
  console.log(`\n✅ ${tracks.length} tracks exportées → ${EXPORT_FILE}`);
  console.log('\nModifie les valeurs "difficulty" (1/2/3) dans le JSON,');
  console.log('puis lance : node scripts/tag-difficulty.mjs --apply\n');
}

// ─── MODE --apply ─────────────────────────────────────────────────────────────
async function applyFromJson() {
  if (!fs.existsSync(EXPORT_FILE)) {
    console.error(`Fichier introuvable : ${EXPORT_FILE}`);
    console.error('Lance d\'abord : node scripts/tag-difficulty.mjs --export');
    process.exit(1);
  }
  const tracks = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));
  const invalid = tracks.filter(t => ![1, 2, 3].includes(t.difficulty));
  if (invalid.length > 0) {
    console.error(`❌ ${invalid.length} tracks avec difficulty invalide (hors 1/2/3) :`);
    invalid.forEach(t => console.error(`  - ${t.title} (${t.difficulty})`));
    process.exit(1);
  }

  console.log(`Application des difficultés pour ${tracks.length} tracks…`);
  let ok = 0, fail = 0;
  for (const track of tracks) {
    const { error } = await supabase
      .from('tracks')
      .update({ difficulty: track.difficulty })
      .eq('id', track.id);
    if (error) { console.error(`❌ ${track.title} : ${error.message}`); fail++; }
    else ok++;
  }
  console.log(`\n✅ ${ok} tracks mises à jour, ${fail} erreurs.`);
}

// ─── MODE interactif ─────────────────────────────────────────────────────────
async function interactiveMode() {
  const tracks = await fetchAllTracks();
  if (tracks.length === 0) {
    console.log('Aucune track en base.');
    return;
  }

  // Affiche le résumé par catégorie
  console.log('\n═══════════════════════════════════════');
  console.log('         TAGS DE DIFFICULTÉ');
  console.log('═══════════════════════════════════════');
  for (const cat of CATEGORIES) {
    const group = tracks.filter(t => t.category === cat);
    if (group.length === 0) continue;
    const byDiff = { 1: 0, 2: 0, 3: 0 };
    group.forEach(t => byDiff[t.difficulty] = (byDiff[t.difficulty] || 0) + 1);
    console.log(`\n📂 ${cat.toUpperCase()} (${group.length} tracks)`);
    group.forEach((t, i) => {
      const d = t.difficulty;
      const badge = d === 1 ? '🟢' : d === 2 ? '🟡' : '🔴';
      console.log(`  [${String(i + 1).padStart(3)}] ${badge} ${DIFF_LABEL[d].padEnd(10)} ${t.title} (${t.year ?? '?'})`);
    });
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = q => new Promise(r => rl.question(q, r));

  console.log('\n─────────────────────────────────────────');
  console.log('Commandes disponibles :');
  console.log('  bulk <catégorie> <1|2|3>   → tag toute une catégorie');
  console.log('    ex: bulk anime 1');
  console.log('  set <titre_partiel> <1|2|3> → tag par recherche de titre');
  console.log('    ex: set naruto 2');
  console.log('  list <catégorie>            → réaffiche une catégorie');
  console.log('  save                        → sauvegarde tout');
  console.log('  quit                        → quitter sans sauvegarder');
  console.log('─────────────────────────────────────────\n');

  const pending = new Map(); // id → difficulty

  while (true) {
    const input = (await ask('> ')).trim();
    if (!input) continue;

    const parts = input.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    if (cmd === 'quit' || cmd === 'q') {
      rl.close();
      console.log('Aucune modification sauvegardée.');
      break;
    }

    if (cmd === 'save') {
      if (pending.size === 0) { console.log('Rien à sauvegarder.'); continue; }
      console.log(`Sauvegarde de ${pending.size} modification(s)…`);
      let ok = 0, fail = 0;
      for (const [id, difficulty] of pending) {
        const { error } = await supabase.from('tracks').update({ difficulty }).eq('id', id);
        if (error) { console.error(`❌ ${id} : ${error.message}`); fail++; }
        else ok++;
      }
      console.log(`✅ ${ok} sauvegardées, ${fail} erreurs.`);
      pending.clear();
      rl.close();
      break;
    }

    if (cmd === 'bulk') {
      const cat = parts[1]?.toLowerCase();
      const diff = parseInt(parts[2]);
      if (!CATEGORIES.includes(cat) || ![1, 2, 3].includes(diff)) {
        console.log('Usage : bulk <catégorie> <1|2|3>');
        continue;
      }
      const group = tracks.filter(t => t.category === cat);
      group.forEach(t => { pending.set(t.id, diff); t.difficulty = diff; });
      console.log(`→ ${group.length} tracks "${cat}" marquées ${DIFF_LABEL[diff]}`);
      continue;
    }

    if (cmd === 'set') {
      const search = parts.slice(1, -1).join(' ').toLowerCase();
      const diff = parseInt(parts[parts.length - 1]);
      if (!search || ![1, 2, 3].includes(diff)) {
        console.log('Usage : set <titre_partiel> <1|2|3>');
        continue;
      }
      const found = tracks.filter(t => t.title.toLowerCase().includes(search));
      if (found.length === 0) { console.log('Aucune track trouvée.'); continue; }
      found.forEach(t => { pending.set(t.id, diff); t.difficulty = diff; });
      found.forEach(t => console.log(`  → ${t.title} → ${DIFF_LABEL[diff]}`));
      continue;
    }

    if (cmd === 'list') {
      const cat = parts[1]?.toLowerCase();
      const group = tracks.filter(t => t.category === cat);
      if (group.length === 0) { console.log('Catégorie vide ou inconnue.'); continue; }
      group.forEach((t, i) => {
        const d = t.difficulty;
        const badge = d === 1 ? '🟢' : d === 2 ? '🟡' : '🔴';
        console.log(`  [${String(i + 1).padStart(3)}] ${badge} ${DIFF_LABEL[d].padEnd(10)} ${t.title}`);
      });
      continue;
    }

    console.log('Commande inconnue. Tapez bulk, set, list, save ou quit.');
  }
}

// ─── Entrée principale ────────────────────────────────────────────────────────
const arg = process.argv[2];
if (arg === '--export') {
  exportTracks().catch(e => { console.error(e); process.exit(1); });
} else if (arg === '--apply') {
  applyFromJson().catch(e => { console.error(e); process.exit(1); });
} else {
  interactiveMode().catch(e => { console.error(e); process.exit(1); });
}
