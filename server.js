// Simple static server + Hubitat Cloud proxy to bypass CORS
// Usage:
//   HUBITAT_BASE=https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/77 \
//   HUBITAT_TOKEN=759c4ea4-f9c5-4250-bd11-131221eaad76 \
//   node server.js
// Then open: http://localhost:3000

const http = require('http');
const https = require('https');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
// Base like: https://cloud.hubitat.com/api/<instance-id>/apps/<app-id>
const HUBITAT_BASE = process.env.HUBITAT_BASE || 'https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/77';
const HUBITAT_TOKEN = process.env.HUBITAT_TOKEN || '759c4ea4-f9c5-4250-bd11-131221eaad76';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

function send404(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain', ...CORS_HEADERS });
  res.end('Not found');
}

function serveStatic(req, res) {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  let filePath = parsed.pathname;
  if (filePath === '/') filePath = '/index.html';
  // prevent path traversal
  const safePath = path.normalize(filePath).replace(/^([/\\])+/, '');
  const abs = path.join(__dirname, safePath);
  if (!abs.startsWith(__dirname)) return send404(res);
  fs.stat(abs, (err, st) => {
    if (err || !st.isFile()) return send404(res);
    const ext = path.extname(abs).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.ico': 'image/x-icon',
      '.json': 'application/json; charset=utf-8',
    };
    const type = types[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, ...CORS_HEADERS });
    fs.createReadStream(abs).pipe(res);
  });
}

function proxyToHubitat(req, res) {
  const incoming = new URL(req.url, `http://${req.headers.host}`);
  // expect paths like /hubitat/devices/... or /hubitat/eventsocket
  const restPath = incoming.pathname.replace(/^\/hubitat\/?/, '');
  const targetBase = HUBITAT_BASE.replace(/\/?$/, '');

  // Build target URL
  const target = new URL(`${targetBase}/${restPath}`);
  // Copy original query params
  for (const [k, v] of incoming.searchParams.entries()) target.searchParams.set(k, v);
  // Ensure access_token
  if (!target.searchParams.has('access_token')) target.searchParams.set('access_token', HUBITAT_TOKEN);

  const isSSE = /\bwatch$|eventsocket$/i.test(restPath);

  const headers = {
    ...req.headers,
    host: new URL(target).host,
  };
  delete headers['accept-encoding'];

  const options = {
    method: req.method,
    headers,
  };

  const proxyReq = https.request(target, options, (proxyRes) => {
    const respHeaders = { ...proxyRes.headers, ...CORS_HEADERS };
    // Avoid duplicating content-length when we might modify headers
    delete respHeaders['content-length'];
    res.writeHead(proxyRes.statusCode || 502, respHeaders);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({ error: 'Bad gateway', detail: err.message }));
  });

  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }

  if (req.url.startsWith('/hubitat/')) {
    return proxyToHubitat(req, res);
  }

  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Proxying Hubitat via /hubitat/* -> ${HUBITAT_BASE}`);
});

