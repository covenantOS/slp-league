// Password-gated mutations for the admin panel. Reads/writes the KV-backed game.
import { getGame, setGame } from '../../lib/store.mjs';
import { computeState } from '../../lib/engine.mjs';

const PW = '4221';
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const today = () => new Date().toISOString().slice(0, 10);
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

function apply(game, b) {
  switch (b.action) {
    case 'award': {
      if (!game.players.some((p) => p.id === b.playerId)) return 'unknown player';
      const points = Math.round(Number(b.points));
      if (!Number.isFinite(points) || points === 0) return 'points must be a non-zero number';
      game.events.push({
        id: 'e' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
        date: isDate(b.date) ? b.date : today(),
        playerId: b.playerId,
        points,
        category: b.category || 'manual',
        reason: String(b.reason || '').slice(0, 200) || 'Manual adjustment',
        by: 'William',
      });
      return null;
    }
    case 'delete': {
      const before = game.events.length;
      game.events = game.events.filter((e) => e.id !== b.id);
      return game.events.length === before ? 'event not found' : null;
    }
    case 'reset': {
      game.events = [];
      if (isDate(b.startDate)) game.season.startDate = b.startDate;
      if (isDate(b.endDate)) game.season.endDate = b.endDate;
      if (b.name) game.season.name = String(b.name).slice(0, 40);
      return null;
    }
    case 'setPot': {
      const v = Math.round(Number(b.potUSD));
      const min = game.season.seedPoints * game.players.length;
      if (!Number.isFinite(v) || v < min) return `pot must be at least ${min}`;
      game.season.potUSD = v;
      return null;
    }
    default:
      return 'unknown action';
  }
}

export async function POST({ request, locals }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }
  if (body.pw !== PW) return json({ error: 'wrong password' }, 401);
  const env = locals?.runtime?.env;
  const game = await getGame(env);
  const err = apply(game, body);
  if (err) return json({ error: err }, 400);
  await setGame(env, game);
  return json({ ok: true, state: computeState(game) });
}
