// Password-gated mutations for the admin panel. Reads/writes the KV-backed game.
import { getGame, setGame, getArchive, setArchive } from '../../lib/store.mjs';
import { computeState } from '../../lib/engine.mjs';

const PW = '4221';
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const today = () => new Date().toISOString().slice(0, 10);
const addMonths = (dateStr, m) => {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + m);
  if (d.getUTCDate() < day) d.setUTCDate(0); // clamp month-end overflow (e.g. Aug 31 + 6mo)
  return d.toISOString().slice(0, 10);
};
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

  if (body.action === 'endSeason') {
    if (game.events.length === 0) return json({ error: 'Nothing to end yet - no points have been awarded.' }, 400);
    const final = computeState(game);
    const top = final.players[0];
    const runnerUp = final.players[1];
    const tied = !top || (runnerUp && runnerUp.points === top.points); // no champion on a tie
    const snapshot = {
      id: game.season.id,
      name: game.season.name,
      startDate: game.season.startDate,
      endDate: game.season.endDate,
      endedOn: today(),
      potUSD: game.season.potUSD,
      champion: tied ? null : { playerId: top.id, nickname: top.nickname, dollars: top.dollars },
      standings: final.players.map((p) => ({
        playerId: p.id, nickname: p.nickname, color: p.color, initials: p.initials,
        points: p.points, dollars: p.dollars, rank: p.rank, tier: p.tier.name,
      })),
      events: game.events,
    };
    const archive = await getArchive(env);
    const used = new Set(archive.map((a) => a.id));
    archive.push(snapshot);
    await setArchive(env, archive);

    let n = archive.length + 1; // derive next id from the archive, guarantee uniqueness
    while (used.has('T' + n)) n++;
    game.events = [];
    game.season = {
      ...game.season,
      id: 'T' + n,
      name: 'Season ' + n,
      startDate: isDate(body.startDate) ? body.startDate : today(),
      endDate: isDate(body.endDate) ? body.endDate : addMonths(today(), 6),
    };
    await setGame(env, game);
    return json({ ok: true, state: computeState(game) });
  }

  const err = apply(game, body);
  if (err) return json({ error: err }, 400);
  await setGame(env, game);
  return json({ ok: true, state: computeState(game) });
}
