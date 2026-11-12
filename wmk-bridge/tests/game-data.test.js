'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createGameStoreManager}=require('../GameStoreManager');
const {createGameKeyStore}=require('../GameKeyStore');

function lab(t){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'wmk-lab-'));
  const store=createGameStoreManager(directory);
  t.after(()=>{store.close();fs.rmSync(directory,{recursive:true,force:true})});
  return {store,keys:createGameKeyStore(directory)};
}
test('JSON: registra, consulta, agrega pontos, atualiza e exclui',t=>{
  const {store}=lab(t);
  assert.equal(store.getConfig('rpg').backend,'json');
  const row=store.writeRecord('rpg','pontuacoes',{jogador:'Teste',pontos:150});
  assert.equal(store.getRecord('rpg','pontuacoes',row.id).pontos,150);
  assert.equal(store.stats('rpg','pontuacoes','pontos').sum,150);
  assert.equal(store.writeRecord('rpg','pontuacoes',{jogador:'Teste',pontos:180},row.id).pontos,180);
  assert.equal(store.listRecords('rpg','pontuacoes').total,1);
  assert.equal(store.deleteRecord('rpg','pontuacoes',row.id),true);
  assert.equal(store.listRecords('rpg','pontuacoes').total,0);
});
test('SQLite: mesmas operações sem comandos SQL para o jogo',t=>{
  const {store}=lab(t);
  assert.equal(store.setConfig('jogo_sqlite','sqlite').backend,'sqlite');
  const one=store.writeRecord('jogo_sqlite','ranking',{jogador:'Ana',pontos:120});
  const two=store.writeRecord('jogo_sqlite','ranking',{jogador:'Beto',pontos:80});
  assert.equal(store.listRecords('jogo_sqlite','ranking').total,2);
  assert.equal(store.stats('jogo_sqlite','ranking','pontos').sum,200);
  assert.equal(store.stats('jogo_sqlite','ranking','pontos').average,100);
  store.writeRecord('jogo_sqlite','ranking',{jogador:'Ana',pontos:140},one.id);
  assert.equal(store.getRecord('jogo_sqlite','ranking',one.id).pontos,140);
  assert.equal(store.deleteRecord('jogo_sqlite','ranking',two.id),true);
  assert.equal(store.listRecords('jogo_sqlite','ranking').total,1);
});
test('Bancos diferentes não compartilham dados',t=>{
  const {store}=lab(t);
  store.setConfig('corrida','sqlite');
  store.writeRecord('corrida','ranking',{pontos:999});
  store.writeRecord('rpg','ranking',{pontos:10});
  assert.equal(store.stats('corrida','ranking','pontos').sum,999);
  assert.equal(store.stats('rpg','ranking','pontos').sum,10);
});
test('Não troca o backend de jogo com dados existentes',t=>{
  const {store}=lab(t);
  store.writeRecord('rpg','ranking',{pontos:2});
  assert.throws(()=>store.setConfig('rpg','sqlite'),{status:409});
});
test('Nomes especiais de coleções e jogos são rejeitados',t=>{
  const {store}=lab(t);
  assert.throws(()=>store.writeRecord('jogo','__proto__',{a:1}),{status:400});
  assert.throws(()=>store.setConfig('../escape','sqlite'),{status:400});
});
test('Chaves isoladas por jogo, revogáveis e com escopo',t=>{
  const {keys}=lab(t);
  const read=keys.issue('corrida',{scope:'read',label:'Site'});
  const write=keys.issue('rpg',{scope:'write',label:'Servidor'});
  assert.equal(keys.verify('corrida',read.key,false),true);
  assert.equal(keys.verify('corrida',read.key,true),false);
  assert.equal(keys.verify('rpg',read.key,false),false);
  assert.equal(keys.verify('rpg',write.key,true),true);
  assert.equal(keys.list('rpg')[0].key,undefined);
  assert.equal(keys.revoke('corrida',read.id),true);
  assert.equal(keys.verify('corrida',read.key,false),false);
});
