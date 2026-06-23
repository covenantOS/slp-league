// Serves player photos out of R2 (binding BUCKET). Avatars are referenced as
// /img/<key>?v=<version> on each player record; the version busts the cache.
export async function GET({ params, locals }) {
  const env = locals?.runtime?.env;
  const key = params.path;
  const bucket = env && env.BUCKET;
  if (!bucket || !key) return new Response('Not found', { status: 404 });
  const obj = await bucket.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers });
}
