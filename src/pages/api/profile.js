// Player-facing: claim a profile with a personal code, then edit avatar + tagline.
// The first code submitted for a player claims it; after that the code is required.
import { getGame, setGame } from '../../lib/store.mjs';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
const isCode = (s) => typeof s === 'string' && /^\d{4,8}$/.test(s);

export async function POST({ request, locals }) {
  let b;
  try {
    b = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }
  const env = locals?.runtime?.env;
  const game = await getGame(env);
  const p = game.players.find((x) => x.id === b.playerId);
  if (!p) return json({ error: 'unknown player' }, 400);
  if (!isCode(b.code)) return json({ error: 'code must be 4 to 8 digits' }, 400);

  if (!p.passcode) {
    p.passcode = b.code; // first code claims this profile
  } else if (b.code !== p.passcode) {
    return json({ error: 'wrong code' }, 401);
  }

  // Authenticated for this player - apply the edits.
  if (typeof b.tagline === 'string') p.tagline = b.tagline.slice(0, 80);
  if (b.avatar === null) {
    p.avatar = null;
  } else if (typeof b.avatar === 'string') {
    if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(b.avatar) || b.avatar.length > 400000) {
      return json({ error: 'image must be a small PNG/JPEG/WebP' }, 400);
    }
    p.avatar = b.avatar;
  }
  if (b.newCode !== undefined) {
    if (!isCode(b.newCode)) return json({ error: 'new code must be 4 to 8 digits' }, 400);
    p.passcode = b.newCode;
  }

  await setGame(env, game);
  const { passcode, ...pub } = p;
  return json({ ok: true, player: { ...pub, hasCode: true } });
}
