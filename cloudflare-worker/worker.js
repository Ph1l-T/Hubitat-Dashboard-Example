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
    if (!base) {
      return json({ error: 'misconfigured', detail: 'HUBITAT_BASE not set' }, 500);
    }

    const restPath = url.pathname.replace(/^\/hubitat\/?/, '');
    const target = new URL(base + '/' + restPath);

    // copy query params and ensure token
    for (const [k, v] of url.searchParams.entries()) target.searchParams.set(k, v);
    if (!target.searchParams.has('access_token')) {
      if (!env.HUBITAT_TOKEN) return json({ error: 'missing_token' }, 401);
      target.searchParams.set('access_token', env.HUBITAT_TOKEN);
    }

    // Prepare upstream request
    const upstreamHeaders = new Headers(request.headers);
    // Let CF set host; avoid compression issues for streaming
    upstreamHeaders.delete('accept-encoding');
    upstreamHeaders.delete('origin');
    upstreamHeaders.delete('referer');

    // Force no-store on upstream
    upstreamHeaders.set('cache-control', 'no-store');

    const init = {
      method: request.method,
      headers: upstreamHeaders,
      body: ['GET', 'HEAD', 'OPTIONS'].includes(request.method) ? undefined : await request.arrayBuffer(),
      cf: { cacheTtl: 0, cacheEverything: false },
    };

    let resp;
    try {
      resp = await fetch(target.toString(), init);
    } catch (e) {
      return json({ error: 'upstream_fetch_failed', detail: String(e) }, 502);
    }

    // Build response headers with CORS and no-store
    const headers = new Headers(resp.headers);
    headers.delete('content-length');
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    applyCorsHeaders(headers);

    // If upstream times out or errors, surface JSON body to aid debugging
    if (resp.status >= 500) {
      return new Response(JSON.stringify({ error: 'upstream_error', status: resp.status }), {
        status: resp.status,
        headers: new Headers({ 'Content-Type': 'application/json', ...Object.fromEntries(headers) }),
      });
    }

    // Pass-through body (supports SSE)
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

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

