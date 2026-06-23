// Sanity checks for the scoring engine. Run: npm run test:engine
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { computeState, activityFeed, biggestMover } from '../src/lib/engine.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (f) => JSON.parse(readFileSync(join(root, 'src/data', f), 'utf8'));
const data = { season: load('season.json'), players: load('players.json'), events: load('events.json').events, config: load('config.json') };

// Pin "today" so the test is deterministic regardless of the real clock.
data.season = { ...data.season, asOf: '2026-06-23' };

const state = computeState(data);
let failures = 0;
const check = (label, cond, got) => {
  if (cond) {
    console.log(`  ok   ${label}`);
  } else {
    failures++;
    console.log(`  FAIL ${label}` + (got !== undefined ? ` (got ${JSON.stringify(got)})` : ''));
  }
};

console.log('\nStandings:');
for (const p of state.players) {
  console.log(
    `  ${p.rank}. ${p.nickname.padEnd(9)} ${String(p.points).padStart(4)} pts  $${p.dollars}` +
      `  tier=${p.tier.name}  streak=${p.streak}  7d=${p.last7 >= 0 ? '+' : ''}${p.last7}` +
      `  badges=[${p.badges.join(', ')}]`,
  );
}
console.log(`  BANK: $${state.bank}   claimed: $${state.claimed}   daysLeft: ${state.daysLeft}`);

console.log('\nInvariants:');
const held = state.players.reduce((s, p) => s + p.points, 0);
check('held + bank === pot ($2,500)', held + state.bank === state.pot, held + state.bank);
check('bank is non-negative', state.bank >= 0, state.bank);
check('no player below the 0 floor', state.players.every((p) => p.points >= 0));
check('no player exceeds the pot', state.players.every((p) => p.points <= state.pot));
check('ranks are 1..N unique', JSON.stringify(state.players.map((p) => p.rank)) === JSON.stringify([1, 2, 3]));

console.log('\nExpected seed outcomes:');
const byId = Object.fromEntries(state.players.map((p) => [p.id, p]));
check('Miggy leads', state.players[0].id === 'miggy', state.players[0].id);
check('Miggy = 175 pts', byId.miggy.points === 175, byId.miggy.points);
check('Daniboy = 144 pts', byId.daniboy.points === 144, byId.daniboy.points);
check('Kdawg = 71 pts (after red card + missed deadline)', byId.kdawg.points === 71, byId.kdawg.points);
check('bank = $2,110', state.bank === 2110, state.bank);
check('Miggy holds the Golden Boot', byId.miggy.badges.includes('golden_boot'));
check('Miggy streak = 5', byId.miggy.streak === 5, byId.miggy.streak);
check('Kdawg has no clean sheet', !byId.kdawg.badges.includes('clean_sheet'));

// Overflow guard: a huge award cannot mint money beyond the bank.
const flooded = computeState({
  ...data,
  events: [...data.events, { id: 'z999', date: '2026-06-23', playerId: 'miggy', points: 99999, category: 'client_win', reason: 'test', by: 'test' }],
});
const heldF = flooded.players.reduce((s, p) => s + p.points, 0);
check('overflow award clamps to bank (invariant holds)', heldF + flooded.bank === flooded.pot && flooded.bank === 0, { heldF, bank: flooded.bank });

console.log('\nFeed + mover:');
check('activity feed newest-first', activityFeed(data, 1)[0].id === 'e018', activityFeed(data, 1)[0].id);
const mover = biggestMover(state, 7);
check('biggest 7d mover is Miggy (+40)', mover.player.id === 'miggy' && mover.move === 40, { id: mover.player.id, move: mover.move });

console.log('\nFuture + stray guards:');
const withFuture = computeState({ ...data, events: [...data.events, { id: 'fut1', date: '2026-09-01', playerId: 'daniboy', points: 50, category: 'client_win', reason: 'future', by: 'test' }] });
const dF = withFuture.players.find((p) => p.id === 'daniboy');
check('future-dated event does not change current balance', dF.points === byId.daniboy.points, dF.points);
check('future-dated event excluded from last7', dF.last7 === byId.daniboy.last7, dF.last7);
const withStray = { ...data, events: [...data.events, { id: 'x1', date: '2026-06-23', playerId: 'ghost', points: 5, category: 'checkin', reason: 'stray', by: 'test' }] };
check('unknown-player event dropped from feed (no crash)', activityFeed(withStray).every((e) => e.player));
const sStray = computeState(withStray);
check('invariant holds with a stray (unknown-player) event', sStray.players.reduce((a, p) => a + p.points, 0) + sStray.bank === sStray.pot);

console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}\n`);
process.exit(failures === 0 ? 0 : 1);
