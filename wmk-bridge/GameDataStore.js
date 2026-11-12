'use strict';
// WMK Game Data Store (JSON local): Walney Moreira Klein — walneyk@hotmail.com.
// Banco de dados de prototipagem, separado do projeto GDevelop e do MCP.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function createJsonGameStore(directory) {
  const root = path.resolve(directory);
  fs.mkdirSync(root, {recursive: true});
  const validName = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value);
  const ensureName = (value, label) => {
    if (!validName(value)) {
      const error = new Error(label + ' inválido. Use letras, números, - ou _.');
      error.status = 400;
      throw error;
    }
    return value;
  };
  const file = game => path.join(root, ensureName(game, 'ID do jogo') + '.json');
  const load = game => {
    const filepath = file(game);
    try {
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      if (!data || data.version !== 1 || typeof data.collections !== 'object' || Array.isArray(data.collections))
        throw new Error('Formato de arquivo inválido.');
      return data;
    } catch(error) {
      if (error.code === 'ENOENT') return {version:1, game, collections:{}};
      throw error;
    }
  };
  const save = (game, data) => {
    const filepath = file(game);
    const temp = filepath + '.' + crypto.randomBytes(8).toString('hex') + '.tmp';
    const serialized = JSON.stringify(data, null, 2);
    if (Buffer.byteLength(serialized) > 10 * 1024 * 1024) {
      const error = new Error('O arquivo do jogo excedeu 10 MB. Migre para SQLite.');
      error.status = 413;
      throw error;
    }
    try {
      fs.writeFileSync(temp, serialized, {encoding:'utf8',flag:'wx',mode:0o600});
      fs.renameSync(temp, filepath);
    } finally {
      try {fs.unlinkSync(temp);} catch (_) {}
    }
  };
  const records = (game, collection) => {
    ensureName(collection, 'Coleção');
    const data = load(game);
    return {data, items: data.collections[collection] || []};
  };
  const listGames = () =>
    fs.readdirSync(root).filter(x=>/^[a-zA-Z0-9_-]{1,64}\.json$/.test(x))
      .map(x=>x.slice(0,-5)).sort();
  const listCollections = game => Object.keys(load(game).collections).sort();
  const listRecords = (game, collection, limit=100) => {
    const {items} = records(game,collection);
    return {total:items.length, items:items.slice(0,Math.min(500,Math.max(1,limit)))};
  };
  const getRecord = (game,collection,id) => {
    ensureName(id,'ID do registro');
    return records(game,collection).items.find(row=>row.id===id) || null;
  };
  const writeRecord = (game,collection,payload,id) => {
    ensureName(collection,'Coleção');
    if (!payload || typeof payload !== 'object' || Array.isArray(payload))
      throw Object.assign(new Error('O registro precisa ser objeto JSON.'),{status:400});
    const {data,items}=records(game,collection);
    if (items.length >= 5000 && !id)
      throw Object.assign(new Error('Limite de 5.000 registros por coleção. Use SQLite.'),{status:413});
    const recordId = id ? ensureName(id,'ID do registro') : crypto.randomUUID();
    const now = new Date().toISOString();
    const index=items.findIndex(row=>row.id===recordId);
    if(id && index===-1)throw Object.assign(new Error('Registro não encontrado.'),{status:404});
    const clean=JSON.parse(JSON.stringify(payload));
    delete clean.id; delete clean.createdAt; delete clean.updatedAt;
    const row={...clean,id:recordId,createdAt:index>=0?items[index].createdAt:now,updatedAt:now};
    if(index>=0)items[index]=row;else items.push(row);
    data.collections[collection]=items;
    save(game,data);
    return row;
  };
  const deleteRecord=(game,collection,id)=>{
    ensureName(id,'ID do registro');
    const {data,items}=records(game,collection);
    const index=items.findIndex(row=>row.id===id);
    if(index<0)return false;
    items.splice(index,1);data.collections[collection]=items;save(game,data);
    return true;
  };
  const stats=(game,collection,field)=>{
    const {items}=records(game,collection);
    if (!field)return {count:items.length};
    ensureName(field,'Campo');
    const values=items.map(row=>row[field]).filter(x=>typeof x==='number'&&Number.isFinite(x));
    return {count:items.length,numericCount:values.length,
      sum:values.reduce((a,b)=>a+b,0),min:values.length?Math.min(...values):null,
      max:values.length?Math.max(...values):null,
      average:values.length?values.reduce((a,b)=>a+b,0)/values.length:null};
  };
  return {listGames,listCollections,listRecords,getRecord,writeRecord,deleteRecord,stats};
}
module.exports={createJsonGameStore};
