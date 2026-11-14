// Basic checks without browser dependencies: node tests/v3-basic.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const code=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'c3d-syntax-'));
try{
  for(const [name,source] of [['core.mjs',code],['studio.mjs',fs.readFileSync(path.join(root,'studio-v3.js'),'utf8')],['sw.js',fs.readFileSync(path.join(root,'sw.js'),'utf8')]]){
    const file=path.join(temp,name);fs.writeFileSync(file,source);const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  }
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log('PASS syntax: core, studio module, service worker');
// Isolate the production save scheduler, not a copy of its implementation.
const scheduler=code.slice(code.indexOf('let saveT=null, saveRevision=0'),code.indexOf("$('#pnew').onclick",code.indexOf('let saveT=null, saveRevision=0')));
let timer,states=[],writes=[],revision=1,rejectWrite=false;
const ctx=vm.createContext({Promise,JSON,objs:[{userData:{p:{}},geometry:{attributes:{position:{count:1}}}}],setTimeout:f=>(timer=f,1),clearTimeout:()=>{timer=null;},studio:{setSaveState:(...s)=>states.push(s)},msg:()=>{},projectData:()=>({revision}),idbSet:async v=>{if(rejectWrite)throw Error('quota');writes.push(v);}});
vm.runInContext(scheduler,ctx);
async function flush(){timer();await vm.runInContext('saveChain',ctx);}
vm.runInContext('scheduleSave()',ctx);await flush();assert.deepEqual(JSON.parse(writes[0]),{revision:1});assert.equal(states.at(-1)[0],'saved');
rejectWrite=true;revision=2;vm.runInContext('scheduleSave()',ctx);await flush();assert.equal(states.at(-1)[0],'error');assert.equal(writes.length,1);
rejectWrite=false;vm.runInContext('scheduleSave()',ctx);await flush();assert.equal(states.at(-1)[0],'saved');assert.equal(writes.length,2);
ctx.objs[0].userData.p=null;ctx.objs[0].geometry.attributes.position.count=900001;vm.runInContext('scheduleSave()',ctx);timer();assert.equal(states.at(-1)[0],'paused');assert.equal(writes.length,2,'Heavy scenes must preserve the last snapshot');
console.log('PASS save success, quota failure, retry, and heavy-scene snapshot preservation');
// A new revision must not be marked saved by an older in-flight transaction.
ctx.objs[0].userData.p={};let complete;ctx.idbSet=()=>new Promise(resolve=>{complete=resolve;});
vm.runInContext('scheduleSave()',ctx);timer();await Promise.resolve();await Promise.resolve();await new Promise(r=>setImmediate(r));
vm.runInContext('scheduleSave()',ctx);complete();await vm.runInContext('saveChain',ctx);assert.equal(states.at(-1)[0],'pending');
console.log('PASS in-flight save does not mark newer edits as saved');
// A rejected cut must free already-created geometry and every Manifold allocation.
const cut=code.slice(code.indexOf('async function buildCutMeshes(o)'),code.indexOf('async function makeCut()'));
let disposed=0,deleted=0,calls=0;
const input={'#fitnx':{value:'2'},'#fitnz':{value:'2'},'#fitpeg':{checked:false},'#fitpd':{value:'5'},'#fitclr':{value:'.2'}};
const fake={position:{x:0,z:0},material:{emissive:{setHex(){}},dispose(){disposed++;}},geometry:{dispose(){disposed++;}},userData:{}};
const cutCtx=vm.createContext({Math,Error,parseInt,parseFloat,$:s=>input[s],M_:()=>({n:'Box',l:false}),loadManifold:async()=>{},MF:{},toManifold:()=>({delete(){deleted++;}}),cutAxis:()=>{calls++;if(calls===3)throw Error('unsafe pin');return [{},{}];},fromManifold:()=>fake.geometry,THREE:{Mesh:class{constructor(){Object.assign(this,{...fake,position:{x:0,z:0},userData:{}});}}},recenter:()=>{}});
vm.runInContext(cut,cutCtx);await assert.rejects(vm.runInContext('buildCutMeshes({material:{clone(){return {}}}})',cutCtx),/unsafe pin/);assert.equal(deleted,1);assert.equal(disposed,4);
console.log('PASS cut failure releases partial geometry without committing');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');assert.ok(sw.includes('studio-v3.js')&&sw.includes('studio-v3.css'));
assert.ok(code.includes("restore(cur); refreshBtns(); scheduleSave(); markDirty(true); msg('Deshecho.')"));
assert.ok(code.includes("restore(cur); refreshBtns(); scheduleSave(); markDirty(true); msg('Rehecho.')"));
console.log('PASS offline assets and undo/redo save hooks');
console.log('All basic v3 checks passed. Browser/geometry integration still requires the manual checklist.');
