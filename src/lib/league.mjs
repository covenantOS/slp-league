// Single source of truth for pages: load the JSON data and expose computed state.
// (The Slack script loads data via fs instead, since plain Node needs import
// attributes for JSON — see scripts/slack-matchday.mjs.)
// Pages load the live game from the store (KV in prod, in-memory in dev) and
// compute standings at request time. `env` comes from Astro.locals.runtime.env.
import { computeState, activityFeed } from './engine.mjs';
import { getGame, setGame, getArchive, setArchive } from './store.mjs';

export { computeState, activityFeed, getGame, setGame, getArchive, setArchive };

/** Convenience: load the game and compute state in one call. */
export async function getState(env) {
  const game = await getGame(env);
  return { game, state: computeState(game) };
}
