// Posts the daily "Matchday" standings drop to Slack.
// Run by the GitHub Action on a cron, or locally: npm run matchday
// Needs SLACK_WEBHOOK_URL in the environment. With no webhook it prints a dry run.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { computeState, biggestMover } from '../src/lib/engine.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (f) => JSON.parse(readFileSync(join(root, 'src/data', f), 'utf8'));
const data = {
  season: load('season.json'),
  players: load('players.json'),
  events: load('events.json').events,
  config: load('config.json'),
};
const state = computeState(data);
const SITE = process.env.SITE_URL || 'https://slp-league.pages.dev';

const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const signed = (n) => (n > 0 ? '+' : '') + n;
const medal = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
// Escape Slack mrkdwn control chars so a nickname or challenge string can't inject
// a channel ping (<!channel>) or a disguised link (<url|label>).
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const table = state.players
  .map((p, i) => {
    const place = medal[i] || `${i + 1}.`;
    const trend = p.last7 > 0 ? `\u{1F4C8} +${p.last7}` : p.last7 < 0 ? `\u{1F4C9} ${p.last7}` : '▪ 0';
    const streak = p.streak >= 3 ? ` · \u{1F525}${p.streak}d` : '';
    return `${place} *${esc(p.nickname)}* — ${money(p.dollars)} · ${esc(p.tier.name)} · ${trend} (7d)${streak}`;
  })
  .join('\n');

const mover = biggestMover(state, 1);
const moverLine =
  mover && mover.move !== 0
    ? `${mover.move > 0 ? '\u{1F4C8}' : '\u{1F4C9}'} *${esc(mover.player.nickname)}* ${signed(mover.move)} in the last day`
    : 'Quiet day, no movement on the board.';

const ch = data.config.challenge;

const blocks = [
  { type: 'header', text: { type: 'plain_text', text: '⚽ SLP League — Matchday', emoji: true } },
  { type: 'section', text: { type: 'mrkdwn', text: table } },
  {
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `\u{1F3E6} *${money(state.bank)}* still unclaimed in the bank · ${state.daysLeft} days left in ${esc(data.season.name)}` }],
  },
  { type: 'section', text: { type: 'mrkdwn', text: `*Biggest mover:* ${moverLine}` } },
  { type: 'section', text: { type: 'mrkdwn', text: `\u{1F3AF} *${esc(ch.title)}:* ${esc(ch.desc)}` } },
  { type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: 'Open the table', emoji: true }, url: SITE }] },
];

const payload = {
  text: `SLP League — ${state.players.map((p) => `${p.nickname} ${money(p.dollars)}`).join(', ')}`,
  blocks,
};

const url = process.env.SLACK_WEBHOOK_URL;
if (!url) {
  console.log('[dry run] No SLACK_WEBHOOK_URL set. Payload would be:\n');
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
if (!res.ok) {
  console.error('Slack post failed:', res.status, await res.text());
  process.exit(1);
}
console.log('Posted matchday update to Slack.');
