/**
 * Remplit image_url dans Supabase pour movies/series/anime/animation via TMDB.
 *
 * Usage : (variables lues depuis .env, voir .env.example)
 *   node --env-file=.env scripts/fill-tmdb-images.mjs               → dry-run
 *   node --env-file=.env scripts/fill-tmdb-images.mjs --apply        → écrit sans validation
 *   node --env-file=.env scripts/fill-tmdb-images.mjs --interactive  → valide une par une, applique à la fin
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';
import { exec } from 'child_process';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TMDB_TOKEN   = process.env.TMDB_TOKEN;
const IMAGE_BASE   = 'https://image.tmdb.org/t/p/w342';

const CATEGORY_MAP = {
  movies:    'movie',
  series:    'tv',
  anime:     'tv',
  animation: 'movie',
};

const APPLY       = process.argv.includes('--apply');
const INTERACTIVE = process.argv.includes('--interactive');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Readline ────────────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));
function openUrl(url) { exec(`start "" "${url}"`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── TMDB ────────────────────────────────────────────────────────────────────
function cleanTitle(title) {
  return title
    .replace(/\b(theme|ost|soundtrack|music|main theme|opening|ending|intro|song|générique)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function searchTMDBMultiple(title, type) {
  const cleaned = cleanTitle(title);
  const url = `https://api.themoviedb.org/3/search/${type}?query=${encodeURIComponent(cleaned)}&language=fr-FR&page=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}`, 'Content-Type': 'application/json' },
  });
  const json = await res.json();
  return (json.results ?? []).filter(r => r.poster_path).slice(0, 8);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const mode = INTERACTIVE ? '🎮 INTERACTIF' : APPLY ? '✅ APPLY' : '🔍 DRY-RUN';
  console.log(`Mode : ${mode}\n`);

  const categories = Object.keys(CATEGORY_MAP);
  const { data: tracks, error } = await supabase
    .from('tracks').select('id, title, category, image_url').in('category', categories);
  if (error) throw error;

  const toProcess = tracks.filter(t => !t.image_url);
  console.log(`${tracks.length} tracks (${categories.join(', ')}) — ${toProcess.length} sans image\n`);

  const approved = [];
  let notFound = 0;

  for (const track of toProcess) {
    const type = CATEGORY_MAP[track.category];
    const candidates = await searchTMDBMultiple(track.title, type);
    await sleep(250);

    if (candidates.length === 0) {
      console.log(`❌ Pas trouvé : "${track.title}" [${track.category}]`);
      notFound++;
      continue;
    }

    if (!INTERACTIVE) {
      const imageUrl = IMAGE_BASE + candidates[0].poster_path;
      const name = candidates[0].title ?? candidates[0].name;
      console.log(`✅ "${track.title}" → "${name}"\n   ${imageUrl}`);
      if (APPLY) {
        await supabase.from('tracks').update({ image_url: imageUrl }).eq('id', track.id);
      }
      continue;
    }

    // ── Mode interactif ──────────────────────────────────────────────────
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎵 Track : "${track.title}" [${track.category}]`);

    let chosen = null;
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const imageUrl = IMAGE_BASE + c.poster_path;
      const name = c.title ?? c.name;
      const year = (c.release_date ?? c.first_air_date ?? '').slice(0, 4);

      console.log(`\n  [${i + 1}/${candidates.length}] "${name}" ${year ? `(${year})` : ''}`);
      console.log(`  ${imageUrl}`);
      openUrl(imageUrl);

      const rep = await ask(`  → [V]alider  [S]uivant  [I]gnorer  ? `);
      const key = rep.trim().toUpperCase();

      if (key === 'V' || key === '') {
        chosen = { id: track.id, title: track.title, imageUrl };
        break;
      } else if (key === 'I') {
        console.log(`  ⏭  Ignoré`);
        break;
      }
    }

    if (chosen) {
      approved.push(chosen);
      console.log(`  ✅ Validé`);
    } else if (!chosen) {
      notFound++;
    }
  }

  // ── Résumé & application ─────────────────────────────────────────────────
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  if (INTERACTIVE) {
    console.log(`\n📋 Résumé : ${approved.length} validées, ${notFound} non trouvées\n`);
    approved.forEach(a => console.log(`  ✅ "${a.title}"`));

    if (approved.length > 0) {
      const rep = await ask(`\nAppliquer les ${approved.length} images validées dans Supabase ? [O/n] `);
      if (rep.trim().toUpperCase() !== 'N') {
        for (const a of approved) {
          const { error: upErr } = await supabase.from('tracks').update({ image_url: a.imageUrl }).eq('id', a.id);
          if (upErr) console.error(`Erreur ${a.title} :`, upErr.message);
          else console.log(`  💾 Sauvegardé : "${a.title}"`);
        }
        console.log('\n✅ Terminé !');
      } else {
        console.log('Annulé, rien n\'a été écrit.');
      }
    }
  } else {
    console.log(`Trouvés : ${toProcess.length - notFound} / ${toProcess.length}`);
    console.log(`Non trouvés : ${notFound}`);
    if (!APPLY) console.log(`\nRelance avec --apply pour écrire dans Supabase.`);
  }

  rl.close();
}

main().catch(e => { console.error(e); rl.close(); process.exit(1); });
