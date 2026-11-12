'use strict';
/**
 * WMK SQLite Game Store — banco isolado por jogo.
 * Requer Node.js >= 22.13 (recomendado 24 LTS) com node:sqlite.
 * Sem pacote nativo externo; operações SQL sempre parametrizadas.
 * Walney Moreira Klein — walneyk@hotmail.com
 */
const fs = require('node:fs');
const path = require('node:path');

const validId = id => typeof id === 'string' &&
  /^[A-Za-z0-9_-]{1,64}$/.test(id) &&
  !['__proto__','prototype','constructor'].includes(id);
const check = (id, label='Identificador') => {
  if (!validId(id)) throw Object.assign(new Error(label + ' inválido.'), {status:400});
  return id;
};
const error = (status,message) => Object.assign(new Error(message),{status});
function createSqliteGameStore(directory) {
  let DatabaseSync;
  try { ({DatabaseSync} = require('node:sqlite')); }
  catch (_) { throw error(501,'SQLite requer Node.js 22.13+; recomenda-se Node.js 24 LTS.'); }
  const base=path.resolve(directory);
  fs.mkdirSync(base,{recursive:true,mode:0o700});
  const dbs=new Map();
  const open=game=>{
    check(game,'Jogo');
    if(dbs.has(game)) return dbs.get(game);
    const db = new DatabaseSync(path.join(base,game+'.sqlite'));
    db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
    db.exec("CREATE TABLE IF NOT EXISTS records (collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (collection,id));");
    db.exec("CREATE INDEX IF NOT EXISTS idx_wmk_records_collection_date ON records(collection,created_at);");
    dbs.set(game,db);
    return db;
  };
  const decode=row=>row?{...JSON.parse(row.data),id:row.id,createdAt:row.created_at,updatedAt:row.updated_at}:null;
  const listGames=()=>fs.readdirSync(base).filter(x=>/^[A-Za-z0-9_-]{1,64}\.sqlite$/.test(x)).map(x=>x.slice(0,-7)).sort();
  const listCollections=game=>open(game).prepare('SELECT DISTINCT collection FROM records ORDER BY collection').all().map(r=>r.collection);
  const listRecords=(game,collection,limit=100)=>{
    check(collection,'Coleção');const db=open(game);
    const n=Math.max(1,Math.min(500,Number.isFinite(limit)?Math.trunc(limit):100));
    const total=db.prepare('SELECT COUNT(*) AS n FROM records WHERE collection = ?').get(collection).n;
    const items=db.prepare('SELECT * FROM records WHERE collection = ? ORDER BY created_at DESC,id LIMIT ?').all(collection,n).map(decode);
    return {total,items};
  };
  const getRecord=(game,collection,id)=>{
    check(collection,'Coleção');check(id,'Registro');
    return decode(open(game).prepare('SELECT * FROM records WHERE collection = ? AND id = ?').get(collection,id));
  };
  const validatePayload=payload=>{
    if(!payload||typeof payload!=='object'||Array.isArray(payload))throw error(400,'Registro deve ser um objeto JSON.');
    if(Object.keys(payload).some(key=>['__proto__','constructor','prototype'].includes(key)))
      throw error(400,'Campos reservados não permitidos.');
    const copy=JSON.parse(JSON.stringify(payload));
    delete copy.id;delete copy.createdAt;delete copy.updatedAt;
    const raw=JSON.stringify(copy);
    if(Buffer.byteLength(raw)>64*1024)throw error(413,'Registro excedeu 64 KB.');
    return {copy,raw};
  };
  const writeRecord=(game,collection,payload,id)=>{
    check(collection,'Coleção');const db=open(game);const {copy,raw}=validatePayload(payload);
    const now=new Date().toISOString();const key=id?check(id,'Registro'):require('node:crypto').randomUUID();
    const old=db.prepare('SELECT created_at FROM records WHERE collection = ? AND id = ?').get(collection,key);
    if(id&&!old)throw error(404,'Registro não encontrado.');
    if(old) db.prepare('UPDATE records SET data = ?, updated_at = ? WHERE collection = ? AND id = ?').run(raw,now,collection,key);
    else db.prepare('INSERT INTO records(collection,id,data,created_at,updated_at) VALUES(?,?,?,?,?)').run(collection,key,raw,now,now);
    return {...copy,id:key,createdAt:old?old.created_at:now,updatedAt:now};
  };
  const deleteRecord=(game,collection,id)=>{
    check(collection,'Coleção');check(id,'Registro');
    return open(game).prepare('DELETE FROM records WHERE collection = ? AND id = ?').run(collection,id).changes>0;
  };
  const stats=(game,collection,field)=>{
    check(collection,'Coleção');const db=open(game);
    const count=db.prepare('SELECT COUNT(*) AS n FROM records WHERE collection = ?').get(collection).n;
    if(!field)return {count};
    check(field,'Campo');
    const values=db.prepare('SELECT data FROM records WHERE collection = ?').all(collection)
      .map(r=>JSON.parse(r.data)[field]).filter(v=>typeof v==='number'&&Number.isFinite(v));
    const sum=values.reduce((a,b)=>a+b,0);
    return {count,numericCount:values.length,sum,min:values.length?Math.min(...values):null,
      max:values.length?Math.max(...values):null,average:values.length?sum/values.length:null};
  };
  return {listGames,listCollections,listRecords,getRecord,writeRecord,deleteRecord,stats,
    close:()=>{for(const db of dbs.values())db.close();dbs.clear();}};
}
module.exports={createSqliteGameStore};
