const test=require('node:test'),assert=require('node:assert/strict');
const {app}=require('./server.js');
test('dashboard exposes current metadata and blocks server files',async t=>{
  const server=app.listen(0,'127.0.0.1');
  await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  for(const endpoint of ['/server.js','/package.json','/package-lock.json','/personas.json','/.env','/node_modules/express/package.json'])assert.equal((await fetch(base+endpoint)).status,404,endpoint);
  for(const endpoint of ['/','/ultron/','/mind/','/os/'])assert.equal((await fetch(base+endpoint)).status,200,endpoint);
  const os=await (await fetch(base+'/api/os')).json();assert.equal(os.name,'Paras AI 2.0');assert.deepEqual(os.unassigned,[]);assert.ok(os.pillars.every(p=>!p.missing.length));
  const memory=await (await fetch(base+'/api/memory')).json();assert.equal(memory.name,'Paras AI 2.0');assert.ok(!('text' in memory));
  const state=await (await fetch(base+'/api/operations')).json();assert.equal(state.plan.goal.active_paid_members,200);assert.ok(state.blockers.length>0);
});
