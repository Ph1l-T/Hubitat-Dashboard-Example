// Cloudflare Worker: Hubitat proxy with CORS + SSE pass-through
// Deploy with: wrangler publish
// Configure secrets:
//   wrangler secret put HUBITAT_TOKEN
// Configure vars (wrangler.toml):
//   HUBITAT_BASE = "https://cloud.hubitat.com/api/<instance>/apps/<appId>"

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // Only proxy /hubitat/*
    if (!url.pathname.startsWith('/hubitat/')) {
      return new Response('Not found', { status: 404, headers: corsHeaders() });
    }

    const base = (env.HUBITAT_BASE || '').replace(/\/?$/, '');
    const restPath = url.pathname.replace(/^\/hubitat\/?/, '');
    const target = new URL(base + '/' + restPath);

    // copy query params and ensure token
    for (const [k, v] of url.searchParams.entries()) target.searchParams.set(k, v);
    if (!target.searchParams.has('access_token')) {
      target.searchParams.set('access_token', env.HUBITAT_TOKEN);
    }

    // build request to Hubitat
    const init = {
      method: request.method,
      headers: new Headers(request.headers),
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
    };
    init.headers.delete('accept-encoding');
    init.headers.set('host', new URL(base).host);

    const resp = await fetch(target.toString(), init);

    // Pass through body (supports SSE) and add CORS
    const headers = new Headers(resp.headers);
    headers.delete('content-length');
    applyCorsHeaders(headers);
    return new Response(resp.body, { status: resp.status, headers });
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };
}

function applyCorsHeaders(headers) {
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

