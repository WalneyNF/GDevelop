'use strict';
/** Alternância JSON/SQLite por jogo, sem migrar dados silenciosamente. */
const fs=require('node:fs');
const path=require('node:path');
const {createJsonGameStore}=require('./GameDataStore');
const {createSqliteGameStore}=require('./SqliteGameStore');

function createGameStoreManager(directory) {
  const root=path.resolve(directory);
  const configDir=path.join(root,'_settings');
  fs.mkdirSync(configDir,{recursive:true,mode:0o700});
  const jsonStore=createJsonGameStore(root);
  let sqliteStore=null;
  const validateGame=game=>{
    if(typeof game!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(game)||
      ['__proto__','prototype','constructor'].includes(game))
      throw Object.assign(new Error('Identificador do jogo inválido.'),{status:400});
  };
  const configPath=game=>{validateGame(game);return path.join(configDir,game+'.json')};
  const getConfig=game=>{
    const file=configPath(game);
    try {
      const config=JSON.parse(fs.readFileSync(file,'utf8'));
      if(!config||!['json','sqlite'].includes(config.backend))throw Error('Configuração de banco inválida.');
      return {game,backend:config.backend};
    } catch(err){
      if(err.code==='ENOENT')return {game,backend:'json'};
      throw err;
    }
  };
  const setConfig=(game,backend)=>{
    validateGame(game);
    if(!['json','sqlite'].includes(backend))throw Object.assign(new Error('Backend deve ser json ou sqlite.'),{status:400});
    if(backend==='sqlite')getSqlite();
    const previous=getConfig(game);
    if(previous.backend!==backend){
      // Não fazer migração implícita nem sobrescrever dados existentes.
      const oldRows=previous.backend==='json'
        ? jsonStore.listCollections(game).length
        : getSqlite().listCollections(game).length;
      if(oldRows)throw Object.assign(new Error('Jogo com dados existentes: migração deve ser feita por export/import explícitos e backup.'),{status:409});
    }
    const file=configPath(game),temp=file+'.tmp';
    try {
      fs.writeFileSync(temp,JSON.stringify({backend},null,2),{mode:0o600});
      fs.renameSync(temp,file);
    } finally {try{fs.unlinkSync(temp);}catch(_){}}
    return getConfig(game);
  };
  function getSqlite(){
    if(!sqliteStore)sqliteStore=createSqliteGameStore(path.join(root,'sqlite'));
    return sqliteStore;
  }
  const store=game=>{
    const config=getConfig(game);
    return config.backend==='sqlite'?getSqlite():jsonStore;
  };
  const proxy=method=>(game,...args)=>store(game)[method](game,...args);
  return {
    getConfig,setConfig,
    listGames:()=>Array.from(new Set([
      ...jsonStore.listGames(),
      ...fs.readdirSync(configDir).filter(x=>/^[A-Za-z0-9_-]{1,64}\.json$/.test(x)).map(x=>x.slice(0,-5)),
      ...(sqliteStore?sqliteStore.listGames():[]),
    ])).sort(),
    listCollections:proxy('listCollections'),
    listRecords:proxy('listRecords'),
    getRecord:proxy('getRecord'),
    writeRecord:proxy('writeRecord'),
    deleteRecord:proxy('deleteRecord'),
    stats:proxy('stats'),
    close:()=>{if(sqliteStore)sqliteStore.close()},
  };
}
module.exports={createGameStoreManager};
