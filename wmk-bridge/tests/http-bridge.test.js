'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const {spawn}=require('node:child_process');

async function portFree(){
  return new Promise((resolve,reject)=>{
    const srv=net.createServer();
    srv.once('error',reject);
    srv.listen(0,'127.0.0.1',()=>{
      const port=srv.address().port;
      srv.close(()=>resolve(port));
    });
  });
}
async function startBridge(t){
  const port=await portFree();
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'wmk-http-'));
  const token='wmk-test-'+('a'.repeat(48));
  const child=spawn(process.execPath,[path.join(__dirname,'..','server.js')],{
    env:{...process.env,WMK_BRIDGE_PORT:String(port),WMK_GAME_DATA_DIR:data,
      WMK_BRIDGE_TOKEN:token,WMK_ALLOW_WRITE:'true',WMK_MCP_TOKEN:''},
    stdio:['ignore','pipe','pipe']
  });
  let stderr='';
  child.stderr.on('data',b=>stderr+=b.toString());
  t.after(()=>{child.kill();fs.rmSync(data,{recursive:true,force:true})});
  const base='http://127.0.0.1:'+port;
  for(let i=0;i<50;i++){
    if(child.exitCode!==null)throw Error('Servidor encerrou: '+stderr);
    try{const r=await fetch(base+'/game-lab');if(r.ok)return {base,token,child};}
    catch(_){}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw Error('Servidor HTTP não inicializou: '+stderr);
}
test('API externa protege projeto e dados por chave individual do jogo',async t=>{
  const {base,token}=await startBridge(t);
  async function call(route,method='GET',key=token,body){
    const r=await fetch(base+route,{method,headers:{
      Host:new URL(base).host,Authorization:'Bearer '+key,
      ...(body?{'Content-Type':'application/json'}:{})
    },body:body?JSON.stringify(body):undefined});
    return {status:r.status,data:await r.json()};
  }
  const html=await fetch(base+'/game-lab');
  assert.equal(html.status,200);
  assert.match(await html.text(),/WMK Game Lab/);
  assert.equal((await call('/api/v1/health','GET','senha-errada')).status,401);
  const issued=await call('/api/v1/games/rpg/keys','POST',token,{scope:'read',label:'Leitor'});
  assert.equal(issued.status,201);
  assert.match(issued.data.key,/^wmkg_/);
  const issuedWriter=await call('/api/v1/games/rpg/keys','POST',token,{scope:'write',label:'Gravador'});
  assert.equal(issuedWriter.status,201);
  const reader=issued.data.key,writer=issuedWriter.data.key;
  assert.equal((await call('/api/v1/games/rpg','GET',reader)).status,200);
  assert.equal((await call('/api/v1/games/outro','GET',reader)).status,401);
  assert.equal((await call('/api/v1/endpoints','GET',reader)).status,401);
  assert.equal((await call('/api/v1/games/rpg/storage','GET',reader)).status,401);
  assert.equal((await call('/api/v1/games/rpg/pontos','POST',reader,{pontos:10})).status,401);
  const record=await call('/api/v1/games/rpg/pontos','POST',writer,{jogador:'Ana',pontos:123});
  assert.equal(record.status,201);
  assert.equal((await call('/api/v1/games/rpg/pontos','GET',reader)).data.total,1);
  assert.equal((await call('/api/v1/games/rpg/pontos?stats&field=pontos','GET',reader)).data.sum,123);
  assert.equal((await call('/api/v1/games/rpg/keys','GET',token)).data.keys[0].key,undefined);
  assert.equal((await call('/api/v1/games/rpg/keys/'+issued.data.id,'DELETE',token)).status,200);
  assert.equal((await call('/api/v1/games/rpg','GET',reader)).status,401);
  assert.equal((await call('/api/v1/games/outro/storage','PUT',token,{backend:'sqlite'})).status,200);
  assert.equal((await call('/api/v1/games/outro/pontos','POST',token,{pontos:250})).status,201);
  assert.equal((await call('/api/v1/games/outro/pontos?stats&field=pontos','GET',token)).data.sum,250);
});
