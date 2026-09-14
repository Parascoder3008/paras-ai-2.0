#!/usr/bin/env node
'use strict';
// Only curated project notes are synchronized. No plugin configuration or raw vault import.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const START='<!-- paras-ai-2.0:managed:start -->',END='<!-- paras-ai-2.0:managed:end -->';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const PROJECT='projects/Paras AI 2.0';
function safePath(base,rel){
  if(path.isAbsolute(rel)||rel.split(/[\\/]/).includes('..'))throw new Error('Path must stay within its base');
  const root=path.resolve(base),p=path.resolve(root,rel);
  if(!p.startsWith(root+path.sep))throw new Error('Path escaped its base');
  let cursor=root;
  for(const part of path.relative(root,p).split(path.sep)){cursor=path.join(cursor,part);if(fs.existsSync(cursor)&&fs.lstatSync(cursor).isSymbolicLink())throw new Error('Refusing a symlink in sync destination');}
  return p;
}
function merge(existing,generated,expectedHash){
  const managed=START+'\n'+generated.trim()+'\n'+END;
  const a=existing.indexOf(START),b=existing.indexOf(END);
  if(a<0&&b<0){
    const fm=existing.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
    return fm?fm[0]+'\n'+managed+'\n\n'+existing.slice(fm[0].length):managed+'\n\n'+existing;
  }
  if(a<0||b<a||existing.indexOf(START,a+START.length)>=0||existing.indexOf(END,b+END.length)>=0)throw new Error('Malformed or duplicate managed markers');
  const old=existing.slice(a,b+END.length);
  if(old!==managed && (!expectedHash||hash(old)!==expectedHash))throw new Error('Managed content was edited outside sync; review before replacing');
  return existing.slice(0,a)+managed+existing.slice(b+END.length);
}
function blockHash(text){const a=text.indexOf(START),b=text.indexOf(END);return hash(text.slice(a,b+END.length));}
function bundle(root=ROOT){
  const read=p=>fs.readFileSync(path.join(root,p),'utf8').trim();
  const link=name=>`[[${PROJECT}/${name}]]`;
  const note=(title,content,type='component')=>({frontmatter:`---\ntags: [paras-ai-2, ${type}]\ntype: ${type}\nproject: "[[${PROJECT}/Paras AI 2.0]]"\ncreated: 2026-09-14\n---\n`,body:`# ${title}\n\n${content}`});
  const notes={};
  notes[`${PROJECT}/Paras AI 2.0.md`]=note('Paras AI 2.0',`Paras Arora's personal second brain and operating system. Source: direct user direction on 2026-09-14.\n\nContent → useful distribution → trust → community → businesses around verified needs. Invest OS is a separate research project.\n\n${read('ai-os/VISION.md')}\n\n## Project map\n- ${link('Current Focus')}\n- ${link('components/Content OS')}\n- ${link('components/Business OS')}\n- ${link('components/Invest OS')}\n- ${link('components/Shared Memory')}\n- ${link('components/Local Runtime')}\n- ${link('Capability Catalog')}\n- ${link('Audit')}\n- ${link('architecture/ADR-0001 Three Pillars')}\n\nRepository name: paras-ai-2.0. See the source workspace README and final session receipt for verified publishing status.`,'project');
  notes[`${PROJECT}/Current Focus.md`]=note('Current Focus',read('ai-os/CURRENT-PLAN.md'),'project');
  notes[`${PROJECT}/Other Worlds.md`]=note('Other Worlds',read('Other Worlds/README.md')+`\n\nBack to ${link('Paras AI 2.0')}.`,'project');
  notes[`${PROJECT}/Paras AI 2.0.md`].body+=`\n\n## Other Worlds\n${link('Other Worlds')} holds astrology, trading bots, listing software, apps and other secondary projects. Main business work remains the default priority.`;
  const pillars={
    'Content OS':'Capture authentic learning, demonstrate useful systems, prepare long videos and shorts, review claims and rights, deliver the promised resource and measure actual audience response. Two long videos/week and 1–2 shorts/day, primarily Hinglish. Entry role: content-creator. Production truth: ai-os/content/production-board.json.',
    'Business OS':'Organize opt-in, customer needs, offers, billing/access, onboarding, community delivery, support and retention. Current business: course plus mentorship, 200 active paid members in 90 days. Entry role: funnel-architect. GHL owns consent/contact records; billing provider owns payment; learning access is separately verified.',
    'Invest OS':'Also called Money OS. Separate research, education and simulation project. Entry role: portfolio-analyst. AI-assisted investing/trading is a long-term interest, not guaranteed passive income. No funded execution, broker connection or bot activation is authorized by this cleanup. Preserve historical trading notes as history; verify any later account state independently.'};
  for(const [name,body]of Object.entries(pillars))notes[`${PROJECT}/components/${name}.md`]=note(name,body+`\n\nRelated: ${link('Paras AI 2.0')}, ${link('components/Shared Memory')}, ${link('Capability Catalog')}.`);
  notes[`${PROJECT}/components/Shared Memory.md`]=note('Shared Memory',read('memory/README.md'));
  notes[`${PROJECT}/components/Local Runtime.md`]=note('Local Runtime',read('docs/SETUP.md'));
  notes[`${PROJECT}/architecture/ADR-0001 Three Pillars.md`]=note('ADR-0001 Three Pillars',read('memory/decisions.md'),'adr');
  notes[`${PROJECT}/Capability Catalog.md`]=note('Capability Catalog',read('ai-os/CAPABILITIES.md').replace(/\[([^\]]+)\]\((\.\.\/[^)]+)\)/g,(_,label,target)=>label+' (source: '+target.slice(3)+')'));
  notes[`${PROJECT}/Audit.md`]=note('Audit',read('ai-os/audits/2026-09-14-paras-ai-2.0.md'));
  const pointer=`# Current Paras AI 2.0 map\n\nUpdated 2026-09-14. ${link('Paras AI 2.0')} is the current project. ${link('Current Focus')} supersedes July/August campaign priorities and prices. Earlier notes below are historical and don't authorize sends, purchases, trading or community activation.\n\n${link('Capability Catalog')} · ${link('Audit')} · ${link('architecture/ADR-0001 Three Pillars')}`;
  notes['MOCS/Paras AI 2.0.md']=note('Paras AI 2.0 Map',pointer,'project');
  notes['MOCS/AI OS - Master Map.md']=note('Current map',pointer,'project');
  notes['Decision/2026-09-14 Paras AI 2.0.md']=note('2026-09-14 Paras AI 2.0',read('memory/decisions.md'),'adr');
  notes['Daily/2026-09-14.md']=note('Paras AI 2.0 session',read('memory/last-session.md')+`\n\nProject: ${link('Paras AI 2.0')}.`,'session');
  notes['projects/Projects.md']=note('Project index',`- ${link('Paras AI 2.0')} — personal second brain, Content OS, Business OS, separate Invest OS research.`,'project');
  return notes;
}
function prepare(vault,root=ROOT){
  if(!vault||!fs.existsSync(vault)||!fs.statSync(vault).isDirectory())throw new Error('Set OBSIDIAN_VAULT_PATH or --vault to an existing Obsidian vault');
  if(!fs.existsSync(path.join(vault,'.obsidian')))throw new Error('Target lacks .obsidian; refusing an unverified vault directory');
  const stateFile=path.join(root,'memory/sync-state.json');
  const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{notes:{}};
  if(state.vault && path.resolve(state.vault)!==path.resolve(vault))throw new Error('Vault differs from the recorded sync; review the local sync state');
  return Object.entries(bundle(root)).map(([rel,n])=>{
    const dest=safePath(vault,rel),exists=fs.existsSync(dest),old=exists?fs.readFileSync(dest,'utf8'):n.frontmatter;
    const next=merge(old,n.body,state.notes[rel]);
    return {rel,dest,old,oldHash:exists?hash(old):null,next,changed:!exists||old!==next};
  });
}
function sync(vault,apply=false,root=ROOT){
  const entries=prepare(vault,root),out=path.join(root,'outputs/obsidian-sync');
  fs.mkdirSync(out,{recursive:true});
  for(const e of entries){const p=safePath(out,e.rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,e.next);}
  const receipt={mode:apply?'applied':'prepared',at:new Date().toISOString(),note_count:entries.length,changed:entries.filter(e=>e.changed).map(e=>e.rel),notes:entries.map(e=>({path:e.rel,sha256:hash(e.next)}))};
  if(apply){
    // Validate every destination before starting any write.
    for(const e of entries){const now=fs.existsSync(e.dest)?hash(fs.readFileSync(e.dest,'utf8')):null;if(now!==e.oldHash)throw new Error('Vault changed after preparation: '+e.rel);}
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    for(const e of entries.filter(e=>e.changed)){
      if(e.oldHash!==null){const b=safePath(path.join(root,'outputs/obsidian-backups',stamp),e.rel);fs.mkdirSync(path.dirname(b),{recursive:true});fs.writeFileSync(b,e.old);}
      fs.mkdirSync(path.dirname(e.dest),{recursive:true});
      // Re-check each file immediately before its mutation.
      const now=fs.existsSync(e.dest)?hash(fs.readFileSync(e.dest,'utf8')):null;
      if(now!==e.oldHash)throw new Error('Concurrent vault edit: '+e.rel);
      fs.writeFileSync(e.dest,e.next);
      if(hash(fs.readFileSync(e.dest,'utf8'))!==hash(e.next))throw new Error('Read-back verification failed: '+e.rel);
    }
    fs.writeFileSync(path.join(root,'memory/sync-state.json'),JSON.stringify({vault:path.resolve(vault),last_verified_at:receipt.at,notes:Object.fromEntries(entries.map(e=>[e.rel,blockHash(e.next)]))},null,2)+'\n');
    fs.writeFileSync(path.join(root,'outputs/obsidian-sync-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  }
  return receipt;
}
if(require.main===module){try{const args=process.argv.slice(2),at=args.indexOf('--vault');if(!['plan','apply'].includes(args[0]))throw new Error('Use plan or apply [--vault PATH]');const vault=at<0?process.env.OBSIDIAN_VAULT_PATH:args[at+1];console.log(JSON.stringify(sync(vault,args[0]==='apply'),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={merge,safePath,hash,blockHash,prepare,sync,bundle};
