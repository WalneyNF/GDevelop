'use strict';
/**
 * WMK External Bridge v0.1 — HTTP JSON -> GDevelop Live MCP
 * Walney Moreira Klein — walneyk@hotmail.com
 * Requer Node.js 20+. Não usa dependências externas.
 */
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.WMK_BRIDGE_PORT || '8767');
const MCP_URL = process.env.WMK_MCP_URL || 'http://127.0.0.1:52520/mcp';
const MCP_TOKEN = process.env.WMK_MCP_TOKEN || '';
const BRIDGE_TOKEN = process.env.WMK_BRIDGE_TOKEN || crypto.randomBytes(32).toString('hex');
const ALLOWED_ORIGINS = new Set([
  'http://127.0.0.1:' + PORT,
  'http://localhost:' + PORT,
  ...(process.env.WMK_ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean),
]);
const WRITE_ENABLED = process.env.WMK_ALLOW_WRITE === 'true';
const MAX_BODY = 128 * 1024;
const REQUEST_TIMEOUT_MS = 90000;
let sessionId = null;
let requestId = 0;
let toolsCache = null;

const json = (res, code, value) => {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(value));
};
const fail = (code, message) => Object.assign(new Error(message), {status: code});
function validToken(header) {
  const a = Buffer.from(String(header || '').replace(/^Bearer\s+/i, ''));
  const b = Buffer.from(BRIDGE_TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function bodyAsJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0; let exceeded = false;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) { exceeded = true; return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (exceeded) return reject(fail(413, 'Requisição muito grande.'));
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (_) { reject(fail(400, 'JSON inválido.')); }
    });
    req.on('error', reject);
  });
}
async function mcp(method, params) {
  if (!MCP_TOKEN) throw fail(503, 'WMK_MCP_TOKEN não configurado.');
  const url = new URL(MCP_URL);
  if (url.protocol !== 'http:' || !['127.0.0.1','localhost','[::1]'].includes(url.hostname))
    throw fail(400, 'MCP deve estar em localhost.');
  const call = async (name, args, sid) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + MCP_TOKEN,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...(sid ? {'Mcp-Session-Id': sid} : {}),
      },
      body: JSON.stringify({jsonrpc:'2.0',id:++requestId,method:name,params:args}),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      redirect:'error',
    });
    if (!res.ok) throw fail(502, 'Servidor MCP respondeu HTTP ' + res.status);
    if (!(res.headers.get('content-type') || '').includes('application/json'))
      throw fail(502, 'Servidor MCP não retornou JSON.');
    const data = await res.json();
    if (data.error) throw fail(502, 'MCP: ' + String(data.error.message).slice(0,300));
    return {data: data.result, sid: res.headers.get('mcp-session-id')};
  };
  if (!sessionId) {
    const init = await call('initialize', {
      protocolVersion:'2025-03-26', capabilities:{},
      clientInfo:{name:'wmk-external-bridge',version:'0.1.0'}
    }, null);
    if (!init.sid) throw fail(502, 'MCP não enviou identificação de sessão.');
    sessionId = init.sid;
  }
  try { return (await call(method, params, sessionId)).data; }
  catch (error) {
    if (error.message.includes('404') || error.message.includes('Session'))
      sessionId = null;
    throw error;
  }
}
async function tools() {
  if (!toolsCache) {
    const result = await mcp('tools/list', {});
    toolsCache = Array.isArray(result.tools) ? result.tools : [];
  }
  return toolsCache;
}
async function api(req, res) {
  const host = req.headers.host || '';
  if (host !== '127.0.0.1:' + PORT && host !== 'localhost:' + PORT)
    return json(res, 403, {error:'Host não permitido.'});
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin))
    return json(res, 403, {error:'Origem não autorizada. Configure WMK_ALLOWED_ORIGINS.'});
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary','Origin');
    res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  }
  if (req.method === 'OPTIONS') {res.writeHead(204);res.end();return;}
  const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname;
  if (req.method === 'GET' && pathname === '/') {
    const page = fs.readFileSync(path.join(__dirname,'painel.html'));
    res.writeHead(200, {
      'Content-Type':'text/html; charset=utf-8',
      'X-Content-Type-Options':'nosniff',
      'Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
      'Cache-Control':'no-store',
    });
    res.end(page); return;
  }
  if (!validToken(req.headers.authorization))
    return json(res, 401, {error:'Token Bearer inválido.'});
  if (pathname === '/api/v1/health' && req.method === 'GET')
    return json(res, 200, {ok:true, bridge:'WMK External Bridge', version:'0.1.0',
      mcpConfigured:!!MCP_TOKEN, writeEnabled:WRITE_ENABLED});
  if (pathname === '/api/v1/tools' && req.method === 'GET')
    return json(res, 200, {tools:await tools()});
  if (pathname === '/api/v1/call' && req.method === 'POST') {
    const payload = await bodyAsJson(req);
    if (!payload || typeof payload.name !== 'string' || !payload.name || typeof payload.arguments !== 'object' ||
      payload.arguments === null || Array.isArray(payload.arguments))
      throw fail(400, 'Informe name e arguments (objeto JSON).');
    const available = (await tools()).find(x => x.name === payload.name);
    if (!available) throw fail(404, 'Ferramenta não oferecida pelo editor.');
    // Conservador: somente ferramentas declaradas como readOnly são livres
    // em modo leitura. Não confiar em prefixos de nomes para classificar escrita.
    if (!WRITE_ENABLED && available.annotations?.readOnlyHint !== true)
      throw fail(403, 'Ferramenta não comprovadamente de leitura; habilite WMK_ALLOW_WRITE=true conscientemente.');
    const result = await mcp('tools/call', {name:payload.name,arguments:payload.arguments});
    return json(res, 200, {result});
  }
  return json(res,404,{error:'Rota desconhecida.'});
}
function createServer() {
  return http.createServer((req,res) => {
    api(req,res).catch(e => {
      console.error('[WMK Bridge]', e.message);
      if (!res.headersSent) json(res,e.status || 500,{error:e.message});
    });
  });
}
if (require.main === module) {
  if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) throw new Error('WMK_BRIDGE_PORT inválida.');
  createServer().listen(PORT,'127.0.0.1',() => {
    console.log('WMK External Bridge: http://127.0.0.1:' + PORT);
    console.log('Token desta execução (guarde em local seguro): ' + BRIDGE_TOKEN);
    console.log('Escrita: ' + (WRITE_ENABLED ? 'HABILITADA' : 'BLOQUEADA'));
  });
}
module.exports = {createServer};
