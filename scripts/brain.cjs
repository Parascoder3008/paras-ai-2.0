#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const LANES=['content','business','invest','personal'];
function events(root=ROOT) {
  const p=path.join(root,'memory/inbox.jsonl');
  if(!fs.existsSync(p))return [];
  return fs.readFileSync(p,'utf8').split(/\r?\n/).filter(Boolean).map((l,i)=>{
    let e;try{e=JSON.parse(l);}catch{throw new Error(`Inbox line ${i+1} is invalid JSON; preserve it for repair`);}
    if(!['capture','resolve'].includes(e.type)||!e.id)throw new Error(`Inbox line ${i+1} has an invalid event`);
    return e;
  });
}
function inbox(root=ROOT){const all=events(root);const done=new Set(all.filter(e=>e.type==='resolve').map(e=>e.id));return all.filter(e=>e.type==='capture').map(e=>({...e,reviewed:done.has(e.id)}));}
function append(e,root){const p=path.join(root,'memory/inbox.jsonl');fs.mkdirSync(path.dirname(p),{recursive:true});fs.appendFileSync(p,JSON.stringify(e)+'\n');return e;}
function capture(text,pillar='personal',root=ROOT){
  if(typeof text!=='string'||!text.trim()||text.length>8000)throw new Error('Capture needs 1–8000 characters');
  if(!LANES.includes(pillar))throw new Error('Pillar must be content, business, invest or personal');
  events(root); // Refuse to append past corruption.
  return append({type:'capture',id:crypto.randomUUID(),created_at:new Date().toISOString(),pillar,text:text.trim()},root);
}
function resolve(id,root=ROOT){
  const item=inbox(root).find(e=>e.id===id);
  if(!item)throw new Error('Unknown capture id');
  if(item.reviewed)return {id,changed:false};
  append({type:'resolve',id,reviewed_at:new Date().toISOString()},root);return {id,changed:true};
}
function status(root=ROOT){
  const projects=JSON.parse(fs.readFileSync(path.join(root,'memory/projects.json'),'utf8'));
  const items=inbox(root);
  const statePath=path.join(root,'memory/sync-state.json');
  let sync=null;if(fs.existsSync(statePath)){const s=JSON.parse(fs.readFileSync(statePath,'utf8'));sync={last_verified_at:s.last_verified_at,note_count:Object.keys(s.notes||{}).length};}
  return {name:'Paras AI 2.0',mode:'Local memory and draft operations; no background execution',projects:projects.projects,unreviewed_captures:items.filter(i=>!i.reviewed).length,obsidian_sync:sync||{status:'not_verified_on_this_machine'},start_here:['MEMORY.md','memory/last-session.md','ai-os/README.md']};
}
function main(args=process.argv.slice(2)){
  const [command,...rest]=args;
  if(command==='status')return status();
  if(command==='inbox')return inbox();
  if(command==='resolve')return resolve(rest[0]);
  if(command==='capture'){
    const at=rest.indexOf('--pillar');
    if(at>=0 && (at!==rest.length-2||!rest[at+1]))throw new Error('Use capture "text" --pillar business');
    const item=capture((at<0?rest:rest.slice(0,at)).join(' '),at<0?'personal':rest[at+1]);
    return {captured:true,id:item.id,pillar:item.pillar,storage:'Local private inbox; excluded from Git'};
  }
  return {usage:'node scripts/brain.cjs status | inbox | capture "text" [--pillar content|business|invest|personal] | resolve ID'};
}
if(require.main===module){try{console.log(JSON.stringify(main(),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={events,inbox,capture,resolve,status,main};
