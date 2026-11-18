/**
 * Remplit image_url dans Supabase pour les tracks "games" via IGDB.
 *
 * Usage : (variables lues depuis .env, voir .env.example)
 *   node --env-file=.env scripts/fill-igdb-images.mjs               → dry-run
 *   node --env-file=.env scripts/fill-igdb-images.mjs --apply        → écrit sans validation
 *   node --env-file=.env scripts/fill-igdb-images.mjs --interactive  → valide une par une, applique à la fin
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';
import { exec } from 'child_process';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_KEY         = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TWITCH_CLIENT_ID     = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

const APPLY       = process.argv.includes('--apply');
const INTERACTIVE = process.argv.includes('--interactive');
const CATEGORY    = 'games';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Readline ────────────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));
function openUrl(url) { exec(`start "" "${url}"`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── IGDB ────────────────────────────────────────────────────────────────────
async function getTwitchToken() {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  );
  const json = await res.json();
  if (!json.access_token) throw new Error(`Token Twitch échoué : ${JSON.stringify(json)}`);
  return json.access_token;
}

function cleanTitle(title) {
  return title
    .replace(/\b(theme|ost|soundtrack|music|main theme|opening|ending|intro|song)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function igdbPost(token, body) {
  const res = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${token}`, 'Content-Type': 'text/plain' },
    body,
  });
  return res.json();
}

async function searchIGDBMultiple(token, title) {
  const cleaned = cleanTitle(title).replace(/"/g, '');
  const results = [];

  const exact = await igdbPost(token, `fields name, cover, total_rating_count; where name = "${cleaned}" & cover != null; limit 3;`);
  results.push(...(exact ?? []).filter(g => g.cover));

  const contains = await igdbPost(token, `fields name, cover, total_rating_count; where name ~ *"${cleaned}"* & cover != null; sort total_rating_count desc; limit 5;`);
  results.push(...(contains ?? []).filter(g => g.cover));

  const fuzzy = await igdbPost(token, `search "${cleaned}"; fields name, cover, total_rating_count; limit 10;`);
  results.push(...(fuzzy ?? []).filter(g => g.cover));

  // Dédoublonne par id
  const seen = new Set();
  return results.filter(g => { if (seen.has(g.id)) return false; seen.add(g.id); return true; });
}

async function getCoverUrl(token, coverId) {
  const res = await fetch('https://api.igdb.com/v4/covers', {
    method: 'POST',
    headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${token}`, 'Content-Type': 'text/plain' },
    body: `fields url; where id = ${coverId};`,
  });
  const covers = await res.json();
  const raw = covers?.[0]?.url;
  if (!raw) return null;
  return 'https:' + raw.replace('t_thumb', 't_cover_big');
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const mode = INTERACTIVE ? '🎮 INTERACTIF' : APPLY ? '✅ APPLY' : '🔍 DRY-RUN';
  console.log(`Mode : ${mode}\n`);

  const token = await getTwitchToken();
  console.log('Token Twitch OK\n');

  const { data: tracks, error } = await supabase
    .from('tracks').select('id, title, image_url').eq('category', CATEGORY);
  if (error) throw error;

  const toProcess = tracks.filter(t => !t.image_url);
  console.log(`${tracks.length} tracks "${CATEGORY}" — ${toProcess.length} sans image\n`);

  const approved = []; // { id, title, imageUrl }
  let notFound = 0;

  for (const track of toProcess) {
    const candidates = await searchIGDBMultiple(token, track.title);
    await sleep(300);

    if (candidates.length === 0) {
      console.log(`❌ Pas trouvé : "${track.title}"`);
      notFound++;
      continue;
    }

    if (!INTERACTIVE) {
      // Mode auto : prend le premier candidat
      const imageUrl = await getCoverUrl(token, candidates[0].cover);
      if (!imageUrl) { notFound++; continue; }
      console.log(`✅ "${track.title}" → "${candidates[0].name}"\n   ${imageUrl}`);
      if (APPLY) {
        await supabase.from('tracks').update({ image_url: imageUrl }).eq('id', track.id);
      }
      continue;
    }

    // ── Mode interactif ──────────────────────────────────────────────────
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎵 Track : "${track.title}"`);

    let chosen = null;
    for (let i = 0; i < candidates.length; i++) {
      const game = candidates[i];
      const imageUrl = await getCoverUrl(token, game.cover);
      await sleep(200);
      if (!imageUrl) continue;

      console.log(`\n  [${i + 1}/${candidates.length}] "${game.name}"`);
      console.log(`  ${imageUrl}`);
      openUrl(imageUrl); // ouvre dans le navigateur

      const rep = await ask(`  → [V]alider  [S]uivant  [I]gnorer  ? `);
      const key = rep.trim().toUpperCase();

      if (key === 'V' || key === '') {
        chosen = { id: track.id, title: track.title, imageUrl };
        break;
      } else if (key === 'I') {
        console.log(`  ⏭  Ignoré`);
        break;
      }
      // S ou autre → candidat suivant
    }

    if (chosen) {
      approved.push(chosen);
      console.log(`  ✅ Validé : "${chosen.imageUrl}"`);
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
