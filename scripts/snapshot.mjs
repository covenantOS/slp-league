// Appends today's standings to src/data/snapshots.json so day-over-day trends
// work and the site rebuilds daily (keeping streaks and "days left" fresh).
// Run by the GitHub Action, or locally: npm run snapshot
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { computeState } from '../src/lib/engine.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (f) => JSON.parse(readFileSync(join(root, 'src/data', f), 'utf8'));
const data = {
  season: load('season.json'),
  players: load('players.json'),
  events: load('events.json').events,
  config: load('config.json'),
};
const state = computeState(data);

const path = join(root, 'src/data', 'snapshots.json');
const snaps = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
const rec = {
  date: state.today,
  bank: state.bank,
  balances: Object.fromEntries(state.players.map((p) => [p.id, p.points])),
};
const idx = snaps.findIndex((s) => s.date === state.today);
if (idx >= 0) snaps[idx] = rec;
else snaps.push(rec);
snaps.sort((a, b) => (a.date < b.date ? -1 : 1));
writeFileSync(path, JSON.stringify(snaps, null, 2) + '\n');
console.log('Snapshot saved for', state.today);
