// Persistence. The live game ({ season, players, events }) and the season archive
// are stored as JSON documents in D1 (binding DB, table `state`). Photos live in
// R2 (binding BUCKET) and are referenced by key on each player. The rules (config)
// always come from src/data/config.json in code. In local `astro dev` without
// bindings, the store falls back to an in-memory copy seeded from src/data.
import season from '../data/season.json';
import players from '../data/players.json';
import eventsFile from '../data/events.json';
import config from '../data/config.json';

const GAME = 'game';
const ARCHIVE = 'archive';

const seedState = () => ({
  season: structuredClone(season),
  players: structuredClone(players),
  events: structuredClone(eventsFile.events),
});
const withRules = (g) => ({ ...g, config: structuredClone(config) });

let memGame = null; // dev fallback (no D1 binding)
let memArchive = null;

async function readDoc(db, key) {
  const row = await db.prepare('SELECT v FROM state WHERE k = ?').bind(key).first();
  return row && row.v ? JSON.parse(row.v) : null;
}
async function writeDoc(db, key, value) {
  await db.prepare('INSERT OR REPLACE INTO state (k, v) VALUES (?, ?)').bind(key, JSON.stringify(value)).run();
}

export async function getGame(env) {
  const db = env && env.DB;
  if (db) {
    const stored = await readDoc(db, GAME);
    if (stored) return withRules(stored);
    const seed = seedState();
    await writeDoc(db, GAME, seed);
    return withRules(seed);
  }
  if (!memGame) memGame = seedState();
  return withRules(memGame);
}

export async function setGame(env, game) {
  const persist = { season: game.season, players: game.players, events: game.events };
  const db = env && env.DB;
  if (db) {
    await writeDoc(db, GAME, persist);
    return;
  }
  memGame = persist;
}

export async function getArchive(env) {
  const db = env && env.DB;
  if (db) return (await readDoc(db, ARCHIVE)) || [];
  if (!memArchive) memArchive = [];
  return memArchive;
}

export async function setArchive(env, archive) {
  const db = env && env.DB;
  if (db) {
    await writeDoc(db, ARCHIVE, archive);
    return;
  }
  memArchive = archive;
}
