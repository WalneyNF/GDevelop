'use strict';
/** WMK Game Keys — chaves individuais por jogo, com armazenamento somente do hash.
 * Walney Moreira Klein — walneyk@hotmail.com.
 * Credenciais de jogos são para servidores confiáveis. Nunca publicar em JS de navegador.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const validId = value => typeof value === 'string' &&
  /^[a-zA-Z0-9_-]{1,64}$/.test(value) &&
  !['__proto__', 'prototype', 'constructor'].includes(value);

function createGameKeyStore(dataPath) {
  const dir=path.resolve(dataPath,'_keys');
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const keyPath=game=>{
    if(!validId(game))throw Object.assign(new Error('Identificador do jogo inválido.'),{status:400});
    return path.join(dir,game+'.json');
  };
  const read=game=>{
    try {
      const data=JSON.parse(fs.readFileSync(keyPath(game),'utf8'));
      if(!data || !Array.isArray(data.keys)) throw new Error('Arquivo de chaves inválido.');
      return data;
    } catch(error) {
      if(error.code==='ENOENT') return {version:1,game,keys:[]};
      throw error;
    }
  };
  const save=(game,data)=>{
    const destination=keyPath(game);
    const temp=destination+'.'+crypto.randomBytes(8).toString('hex')+'.tmp';
    try {
      fs.writeFileSync(temp,JSON.stringify(data,null,2),{mode:0o600,flag:'wx'});
      fs.renameSync(temp,destination);
    } finally {try{fs.unlinkSync(temp);}catch(_){}}
  };
  const fingerprint=value=>crypto.createHash('sha256').update(value,'utf8').digest('hex');
  function issue(game,{scope='read',label='Integração externa'}={}) {
    if(!['read','write'].includes(scope))throw Object.assign(new Error('Escopo inválido.'),{status:400});
    if(typeof label!=='string'||label.length>80)throw Object.assign(new Error('Descrição inválida.'),{status:400});
    const key='wmkg_'+crypto.randomBytes(32).toString('base64url');
    const data=read(game);
    const item={id:crypto.randomUUID(),hash:fingerprint(key),scope,label,createdAt:new Date().toISOString()};
    data.keys.push(item);save(game,data);
    return {key,id:item.id,game,scope,label,createdAt:item.createdAt,
      warning:'Chave exibida apenas nesta resposta. Mantenha no servidor, nunca no JavaScript público.'};
  }
  function list(game) {
    return read(game).keys.map(({id,label,scope,createdAt})=>({id,label,scope,createdAt}));
  }
  function revoke(game,id) {
    if(!/^[0-9a-f-]{36}$/i.test(id))return false;
    const data=read(game);
    const before=data.keys.length;
    data.keys=data.keys.filter(item=>item.id!==id);
    if(before===data.keys.length)return false;
    save(game,data);return true;
  }
  function verify(game,candidate,needsWrite=false) {
    if(typeof candidate!=='string'||!candidate.startsWith('wmkg_')||
      candidate.length>100 || !validId(game))return false;
    const expected=Buffer.from(fingerprint(candidate),'hex');
    let authorized=false;
    for(const entry of read(game).keys){
      if(!entry||!['read','write'].includes(entry.scope)||typeof entry.hash!=='string'||!/^[a-f0-9]{64}$/.test(entry.hash))continue;
      const matches=crypto.timingSafeEqual(expected,Buffer.from(entry.hash,'hex'));
      if(matches && (!needsWrite || entry.scope==='write'))authorized=true;
    }
    return authorized;
  }
  return {issue,list,revoke,verify};
}
module.exports={createGameKeyStore};
