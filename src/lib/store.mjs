// The game's single source of truth: { season, players, events, config }.
// On Cloudflare it lives in a KV namespace (binding LEAGUE). In local `astro dev`
// (no binding) it falls back to an in-memory copy seeded from src/data, so the
// site and admin still work for testing. KV is created/seeded on first read.
import season from '../data/season.json';
import players from '../data/players.json';
import eventsFile from '../data/events.json';
import config from '../data/config.json';

const KEY = 'game';

// Only season/players/events are persisted. The rules (config) always come from
// src/data/config.json in code, so editing the rubric/tiers/badges and redeploying
// updates the live league without touching stored state.
const seedState = () => ({
  season: structuredClone(season),
  players: structuredClone(players),
  events: structuredClone(eventsFile.events),
});
const withRules = (g) => ({ ...g, config: structuredClone(config) });

let memory = null; // dev fallback; persists for the life of the dev process

export async function getGame(env) {
  const kv = env && env.LEAGUE;
  if (kv) {
    const raw = await kv.get(KEY);
    if (raw) return withRules(JSON.parse(raw));
    const seed = seedState();
    await kv.put(KEY, JSON.stringify(seed));
    return withRules(seed);
  }
  if (!memory) memory = seedState();
  return withRules(memory);
}

export async function setGame(env, game) {
  const persist = { season: game.season, players: game.players, events: game.events };
  const kv = env && env.LEAGUE;
  if (kv) {
    await kv.put(KEY, JSON.stringify(persist));
    return;
  }
  memory = persist;
}

// Completed seasons, oldest first. Each entry is a frozen snapshot of the final
// standings + events for that season.
const ARCHIVE_KEY = 'archive';
let memArchive = null;

export async function getArchive(env) {
  const kv = env && env.LEAGUE;
  if (kv) {
    const raw = await kv.get(ARCHIVE_KEY);
    return raw ? JSON.parse(raw) : [];
  }
  if (!memArchive) memArchive = [];
  return memArchive;
}

export async function setArchive(env, archive) {
  const kv = env && env.LEAGUE;
  if (kv) {
    await kv.put(ARCHIVE_KEY, JSON.stringify(archive));
    return;
  }
  memArchive = archive;
}
