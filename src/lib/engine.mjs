// SLP League scoring engine. Pure ESM, zero dependencies, so the same code runs
// inside Astro pages at request time and inside the engine test.
//
// THE MODEL: one shared bank of `season.potUSD` dollars for the whole season.
// Every player starts seeded with `season.seedPoints`. Every point a player
// EARNS is pulled out of the bank into their balance. Every point a player
// LOSES to a penalty is pushed back into the bank, where teammates can reclaim
// it. The invariant `sum(player balances) + bank === potUSD` holds at all times,
// which is what enforces the shared pot cap. 1 point = $1.

const DAY = 86400000;
const toUTC = (d) => new Date(d + 'T00:00:00Z');
const isoDay = (d) => d.toISOString().slice(0, 10);
const shiftDays = (dayStr, n) => isoDay(new Date(toUTC(dayStr).getTime() + n * DAY));
const daysBetween = (a, b) => Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / DAY);

/** Pick the highest tier whose `min` the player has reached. */
export function tierFor(points, tiers) {
  let match = tiers[0];
  for (const t of tiers) if (points >= t.min) match = t;
  return match;
}

/** Consecutive days with a check-in, ending today (or yesterday as grace). */
function checkinStreak(history, todayStr) {
  const days = new Set(history.filter((h) => h.category === 'checkin' && h.applied > 0).map((h) => h.date));
  if (days.size === 0) return 0;
  let anchor = days.has(todayStr) ? todayStr : days.has(shiftDays(todayStr, -1)) ? shiftDays(todayStr, -1) : null;
  if (!anchor) return 0;
  let streak = 0;
  let cur = anchor;
  while (days.has(cur)) {
    streak++;
    cur = shiftDays(cur, -1);
  }
  return streak;
}

/** Net applied points within the trailing `days`-day window ending today. */
function netInWindow(history, todayStr, days) {
  const cutoff = shiftDays(todayStr, -(days - 1));
  return history.filter((h) => h.date >= cutoff && h.date <= todayStr).reduce((s, h) => s + h.applied, 0);
}

function hasPenaltyWithin(history, todayStr, days) {
  const cutoff = shiftDays(todayStr, -(days - 1));
  return history.some((h) => h.applied < 0 && h.date >= cutoff && h.date <= todayStr);
}

function badgesFor(p, ctx) {
  const out = [];
  if (p.id === ctx.bootId && p.earned > 0) out.push('golden_boot');
  if (p.history.some((h) => h.category === 'client_win' && h.applied > 0)) out.push('rainmaker');
  if (p.earned > 0 && !hasPenaltyWithin(p.history, ctx.today, 30)) out.push('clean_sheet');
  if (p.points >= 300) out.push('top_flight');
  if (p.lost > 0 && p.last7 > 0) out.push('comeback');
  return out;
}

/**
 * Reduce raw events into full league state.
 * @param {{season:any, players:any[], events:any[], config:any}} data
 */
export function computeState(data) {
  const { season, players, events, config } = data;
  const seed = season.seedPoints;
  const today = season.asOf || isoDay(new Date());

  const state = new Map();
  for (const p of players) {
    const { passcode, ...pub } = p; // never expose a player's passcode in computed state
    state.set(p.id, { ...pub, hasCode: !!passcode, points: seed, earned: 0, lost: 0, history: [] });
  }

  if (seed * players.length > season.potUSD) {
    throw new Error(`Invalid config: seed (${seed}) x ${players.length} players exceeds the pot ($${season.potUSD}).`);
  }
  let bank = season.potUSD - seed * players.length;

  // Process chronologically so the bank constraint is causal: you can only claim
  // points that are actually in the bank at that moment. Future-dated events are
  // held out until their day arrives. Ties break by id, then by original array
  // order, so CMS-added rows without an id still sort stably.
  const sorted = events
    .filter((e) => !e.date || e.date <= today)
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      if (a.e.date !== b.e.date) return a.e.date < b.e.date ? -1 : 1;
      const ai = a.e.id || '';
      const bi = b.e.id || '';
      if (ai !== bi) return ai < bi ? -1 : 1;
      return a.i - b.i;
    })
    .map((x) => x.e);
  for (const ev of sorted) {
    const pl = state.get(ev.playerId);
    if (!pl) continue;
    let applied;
    let capped = false;
    if (ev.points >= 0) {
      applied = Math.max(0, Math.min(ev.points, bank)); // cannot claim an empty (or misconfigured negative) bank
      if (applied < ev.points) capped = true;
      pl.points += applied;
      pl.earned += applied;
      bank -= applied;
    } else {
      const take = Math.min(-ev.points, pl.points); // cannot drop below the 0 floor
      applied = -take;
      pl.points -= take;
      pl.lost += take;
      bank += take;
    }
    pl.history.push({ ...ev, applied, capped, balanceAfter: pl.points });
  }

  const ranking = [...state.values()].sort((a, b) => b.points - a.points || a.nickname.localeCompare(b.nickname));

  // Golden Boot: most points earned gross (not net), must be positive.
  let topEarned = -1;
  let bootId = null;
  for (const p of ranking) if (p.earned > topEarned) ((topEarned = p.earned), (bootId = p.id));

  for (let i = 0; i < ranking.length; i++) {
    const p = ranking[i];
    p.rank = i + 1;
    p.tier = tierFor(p.points, config.tiers);
    p.dollars = p.points * season.pointValueUSD;
    p.streak = checkinStreak(p.history, today);
    p.last7 = netInWindow(p.history, today, 7);
    p.shareOfPot = season.potUSD ? p.points / season.potUSD : 0;
    p.badges = badgesFor(p, { bootId, today });
  }

  const claimed = season.potUSD - bank;
  const totalDays = Math.max(1, daysBetween(season.startDate, season.endDate));
  const elapsed = Math.min(totalDays, Math.max(0, daysBetween(season.startDate, today)));
  return {
    season,
    config,
    today,
    players: ranking,
    bank,
    pot: season.potUSD,
    claimed,
    bankShare: season.potUSD ? bank / season.potUSD : 0,
    daysLeft: Math.max(0, daysBetween(today, season.endDate)),
    seasonProgress: elapsed / totalDays,
  };
}

/** Flat newest-first activity feed with the player object attached. */
export function activityFeed(data, limit) {
  const byId = new Map(
    data.players.map((p) => {
      const { passcode, ...pub } = p; // never let a passcode ride along on a feed item
      return [p.id, { ...pub, hasCode: !!passcode }];
    }),
  );
  const feed = data.events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      if (a.e.date !== b.e.date) return a.e.date < b.e.date ? 1 : -1;
      const ai = a.e.id || '';
      const bi = b.e.id || '';
      if (ai !== bi) return ai < bi ? 1 : -1;
      return b.i - a.i;
    })
    .map((x) => ({ ...x.e, player: byId.get(x.e.playerId) }))
    .filter((x) => x.player); // drop events whose playerId is not in players.json
  return typeof limit === 'number' ? feed.slice(0, limit) : feed;
}

/** Biggest net mover over the trailing window. */
export function biggestMover(state, days = 1) {
  let best = null;
  for (const p of state.players) {
    const move = netInWindow(p.history, state.today, days);
    if (best === null || Math.abs(move) > Math.abs(best.move)) best = { player: p, move };
  }
  return best;
}

export const internals = { isoDay, shiftDays, daysBetween, checkinStreak, netInWindow };
