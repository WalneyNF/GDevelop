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
const {createGameStoreManager} = require('./GameStoreManager');
const {createGameKeyStore} = require('./GameKeyStore');
const DATA_DIR = process.env.WMK_GAME_DATA_DIR || path.join(__dirname, 'data');
const gameStore = createGameStoreManager(DATA_DIR);
const gameKeys = createGameKeyStore(DATA_DIR);

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
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
  }
  if (req.method === 'OPTIONS') {res.writeHead(204);res.end();return;}
  const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname;
  if (pathname === '/game-lab' && req.method === 'GET') {
    const page = fs.readFileSync(path.join(__dirname,'game-lab.html'));
    res.writeHead(200,{
      'Content-Type':'text/html; charset=utf-8',
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff',
      'Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    });
    res.end(page); return;
  }
  if (pathname === '/demo-game-data' && req.method === 'GET') {
    const page = fs.readFileSync(path.join(__dirname,'demo-game-data.html'));
    res.writeHead(200,{
      'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
      'Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options':'nosniff',
    });
    res.end(page); return;
  }
  if (pathname === '/manual-game-data' && req.method === 'GET') {
    const page = fs.readFileSync(path.join(__dirname,'manual-game-data.html'));
    res.writeHead(200,{
      'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
      'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options':'nosniff',
    });
    res.end(page); return;
  }
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
  // Tokens de jogos só podem acessar seu próprio banco, jamais MCP/editor ou outros jogos.
  const admin = validToken(req.headers.authorization);
  const gameIdMatch = /^\/api\/v1\/games\/([A-Za-z0-9_-]{1,64})(?:\/|$)/.exec(pathname);
  const keyToken = /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization || ''));
  const needsWrite = ['POST','PUT','PATCH','DELETE'].includes(req.method);
  const adminKeyRoute = !!/^\/api\/v1\/games\/[A-Za-z0-9_-]{1,64}\/(?:keys|storage)(?:\/|$)/.test(pathname);
  const gameAuthorized = !admin && !!gameIdMatch && !adminKeyRoute &&
    gameKeys.verify(gameIdMatch[1],keyToken ? keyToken[1].trim() : '',needsWrite);
  if (!admin && !gameAuthorized)
    return json(res,401,{error:'Chave inválida, revogada ou sem permissão para este jogo.'});
  if (pathname === '/api/v1/health' && req.method === 'GET')
    return json(res, 200, {ok:true, bridge:'WMK External Bridge', version:'0.1.0',
      mcpConfigured:!!MCP_TOKEN, writeEnabled:WRITE_ENABLED});
  // Game runtime data is independent from MCP editor operations.
  // All routes use the same localhost-only Bearer authentication.
  const gameDataMatch = /^\/api\/v1\/games\/([A-Za-z0-9_-]{1,64})(?:\/([A-Za-z0-9_-]{1,64}))?(?:\/([A-Za-z0-9_-]{1,64}))?$/.exec(pathname);
  if (pathname === '/api/v1/games' && req.method === 'GET')
    return json(res,200,{games:gameStore.listGames()});
  // Configuração administrativa do banco de cada jogo. Nunca exposta a chaves de jogo.
  const storageRoute = /^\/api\/v1\/games\/([A-Za-z0-9_-]{1,64})\/storage$/.exec(pathname);
  if (storageRoute) {
    if (!admin) throw fail(403,'Somente administrador configura armazenamento.');
    const game=storageRoute[1];
    if(req.method==='GET')return json(res,200,gameStore.getConfig(game));
    if(req.method==='PUT'){
      if(!WRITE_ENABLED)throw fail(403,'Escrita administrativa desabilitada.');
      const body=await bodyAsJson(req);
      return json(res,200,gameStore.setConfig(game,body.backend));
    }
    throw fail(405,'Método não permitido.');
  }
  // Gestão de chaves: SOMENTE administrador; retorno da chave apenas no momento da criação.
  const keysRoute = /^\/api\/v1\/games\/([A-Za-z0-9_-]{1,64})\/keys(?:\/([0-9a-fA-F-]{36}))?$/.exec(pathname);
  if (keysRoute) {
    if (!admin) throw fail(403,'Somente administrador pode gerenciar chaves.');
    const [,game,keyId]=keysRoute;
    if (!keyId && req.method==='GET') return json(res,200,{game,keys:gameKeys.list(game)});
    if (!keyId && req.method==='POST') {
      if (!WRITE_ENABLED) throw fail(403,'Habilite WMK_ALLOW_WRITE para emitir chaves.');
      const body=await bodyAsJson(req);
      return json(res,201,gameKeys.issue(game,body));
    }
    if (keyId && req.method==='DELETE') {
      if (!WRITE_ENABLED) throw fail(403,'Habilite WMK_ALLOW_WRITE para revogar chaves.');
      return json(res,200,{revoked:gameKeys.revoke(game,keyId)});
    }
    throw fail(405,'Método não permitido.');
  }
  if (gameDataMatch) {
    const [, game, collection, id] = gameDataMatch;
    if (!collection && req.method === 'GET')
      return json(res,200,{game,collections:gameStore.listCollections(game)});
    if (collection && !id && req.method === 'GET') {
      if(new URL(req.url,'http://127.0.0.1').searchParams.has('stats')){
        const field = new URL(req.url,'http://127.0.0.1').searchParams.get('field');
        return json(res,200,gameStore.stats(game,collection,field));
      }
      const limit = Number(new URL(req.url,'http://127.0.0.1').searchParams.get('limit') || '100');
      return json(res,200,gameStore.listRecords(game,collection,Number.isFinite(limit)?limit:100));
    }
    if (collection && id && req.method === 'GET') {
      const row=gameStore.getRecord(game,collection,id);
      if(!row)throw fail(404,'Registro não encontrado.');
      return json(res,200,row);
    }
    if (!WRITE_ENABLED && ['POST','PUT','DELETE'].includes(req.method))
      throw fail(403,'Gravação desabilitada: defina WMK_ALLOW_WRITE=true.');
    if (collection && !id && req.method === 'POST')
      return json(res,201,gameStore.writeRecord(game,collection,await bodyAsJson(req)));
    if (collection && id && req.method === 'PUT')
      return json(res,200,gameStore.writeRecord(game,collection,await bodyAsJson(req),id));
    if (collection && id && req.method === 'DELETE')
      return json(res,200,{deleted:gameStore.deleteRecord(game,collection,id)});
  }
  if (pathname === '/api/v1/tools' && req.method === 'GET')
    return json(res, 200, {tools:await tools()});
  if (pathname === '/api/v1/endpoints' && req.method === 'GET') {
    const list = await tools();
    return json(res,200,{
      count:list.length,
      note:'Cada ferramenta anunciada pelo GDevelop MCP pode ser chamada por HTTP. A quantidade depende da versão instalada.',
      endpoints:list.map(tool=>({
        method:'POST',
        path:'/api/v1/endpoints/'+encodeURIComponent(tool.name),
        name:tool.name,
        description:tool.description || '',
        readOnly:tool.annotations?.readOnlyHint===true,
        inputSchema:tool.inputSchema || null,
      })),
    });
  }
  if(pathname.startsWith('/api/v1/endpoints/')){
    const name = decodeURIComponent(pathname.slice('/api/v1/endpoints/'.length));
    const tool = (await tools()).find(item=>item.name===name);
    if(!tool)throw fail(404,'Ferramenta MCP não encontrada.');
    if(req.method==='GET')return json(res,200,{
      name:tool.name,description:tool.description||'',inputSchema:tool.inputSchema||null,
      readOnly:tool.annotations?.readOnlyHint===true,
      method:'POST',path:'/api/v1/endpoints/'+encodeURIComponent(tool.name),
    });
    if(req.method==='POST'){
      if(!WRITE_ENABLED && tool.annotations?.readOnlyHint!==true)
        throw fail(403,'Escrita desabilitada ou ferramenta não declarada readOnly.');
      const argumentsJson=await bodyAsJson(req);
      if(!argumentsJson || typeof argumentsJson!=='object' || Array.isArray(argumentsJson))
        throw fail(400,'O corpo deve ser objeto JSON de parâmetros.');
      return json(res,200,{name:tool.name,result:await mcp('tools/call',{name:tool.name,arguments:argumentsJson})});
    }
  }
  if(pathname==='/api/v1/batch' && req.method==='POST'){
    const payload=await bodyAsJson(req);
    if(!payload || !Array.isArray(payload.calls) || payload.calls.length===0 || payload.calls.length>30)
      throw fail(400,'Envie calls com 1 a 30 operações.');
    const available=await tools();
    const prepared=payload.calls.map((entry,i)=>{
      if(!entry || typeof entry.name!=='string' || !entry.arguments ||
        typeof entry.arguments!=='object' || Array.isArray(entry.arguments))
        throw fail(400,'Operação '+i+' inválida.');
      const tool=available.find(t=>t.name===entry.name);
      if(!tool)throw fail(404,'Operação '+entry.name+' indisponível.');
      if(!WRITE_ENABLED && tool.annotations?.readOnlyHint!==true)
        throw fail(403,'Escrita desabilitada: '+entry.name);
      return entry;
    });
    // Sequencial para preservar dependências; não há rollback transacional.
    const results=[];
    for(const entry of prepared){
      try{
        const result=await mcp('tools/call',{name:entry.name,arguments:entry.arguments});
        results.push({name:entry.name,ok:!result?.isError,result});
        if(result?.isError && payload.stopOnError!==false)break;
      }catch(error){
        results.push({name:entry.name,ok:false,error:error.message});
        if(payload.stopOnError!==false)break;
      }
    }
    return json(res,200,{executed:results.length,total:prepared.length,results,transactional:false});
  }
  if(pathname==='/api/v1/openapi.json' && req.method==='GET'){
    const available=await tools();
    const paths={
      '/api/v1/health':{get:{summary:'Estado da ponte',responses:{'200':{description:'Estado'}}}},
      '/api/v1/endpoints':{get:{summary:'Catálogo de operações disponíveis',responses:{'200':{description:'Ferramentas disponíveis'}}}},
      '/api/v1/games':{get:{summary:'Lista bancos de dados de jogos locais',responses:{'200':{description:'IDs de jogos'}}}},
      '/api/v1/games/{game}/storage':{
        get:{summary:'Consulta backend JSON/SQLite (administrador)',responses:{'200':{description:'Backend atual'}}},
        put:{summary:'Configura backend para jogo sem registros existentes (administrador)',responses:{'200':{description:'Configuração'}}}
      },
      '/api/v1/games/{game}/keys':{
        get:{summary:'Lista chaves sem exibir segredos (administrador)',responses:{'200':{description:'Chaves'}}},
        post:{summary:'Cria chave por jogo, com escopo read/write (administrador)',responses:{'201':{description:'Segredo exibido uma única vez'}}}
      },
      '/api/v1/games/{game}/keys/{keyId}':{delete:{summary:'Revoga chave (administrador)',responses:{'200':{description:'Revogação'}}}},
      '/api/v1/games/{game}':{get:{summary:'Lista coleções do jogo',parameters:[{in:'path',name:'game',required:true,schema:{type:'string'}}],responses:{'200':{description:'Coleções'}}}},
      '/api/v1/games/{game}/{collection}':{
        get:{summary:'Lista registros ou estatísticas (?stats&field=campo)',responses:{'200':{description:'Registros'}}},
        post:{summary:'Cria registro JSON',responses:{'201':{description:'Registro criado'}}}
      },
      '/api/v1/games/{game}/{collection}/{id}':{
        get:{summary:'Obtém registro por ID',responses:{'200':{description:'Registro'}}},
        put:{summary:'Atualiza registro JSON',responses:{'200':{description:'Registro atualizado'}}},
        delete:{summary:'Exclui registro',responses:{'200':{description:'Exclusão'}}}
      },
      '/api/v1/batch':{post:{summary:'Executa até 30 operações sequencialmente; sem rollback',responses:{'200':{description:'Resultados'}}}},
    };
    for(const tool of available){
      paths['/api/v1/endpoints/'+encodeURIComponent(tool.name)]={
        get:{summary:tool.description||tool.name,responses:{'200':{description:'Definição'}}},
        post:{
          summary:tool.description||tool.name,
          operationId:tool.name,
          requestBody:{required:true,content:{'application/json':{schema:tool.inputSchema||{type:'object'}}}},
          responses:{'200':{description:'Resultado da execução'}}
        }
      };
    }
    return json(res,200,{openapi:'3.0.3',info:{title:'WMK Game Studio API',version:'0.1.0',
      description:'Operações MCP exigem token administrativo. Dados /games/{game} aceitam token do jogo, limitado ao próprio jogo e ao escopo read/write. Chaves são gerenciadas exclusivamente por administrador.'},
      servers:[{url:'http://127.0.0.1:'+PORT}],security:[{bearerAuth:[]}],
      components:{securitySchemes:{bearerAuth:{type:'http',scheme:'bearer'}}},paths});
  }
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
