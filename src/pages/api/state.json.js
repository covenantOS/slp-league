// Live computed standings, for the admin panel to render and refresh.
import { getGame } from '../../lib/store.mjs';
import { computeState } from '../../lib/engine.mjs';

export async function GET({ locals }) {
  const game = await getGame(locals?.runtime?.env);
  return new Response(JSON.stringify(computeState(game)), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
