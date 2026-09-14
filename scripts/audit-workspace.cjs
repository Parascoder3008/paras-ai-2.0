#!/usr/bin/env node
'use strict';
// Reproducible structural audit. Reads text, never executes a role or integration.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const slash = p => p.replace(/\\/g, '/');
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => {
    if (e.isSymbolicLink() || ['.git','node_modules','__pycache__','.venv','venv'].includes(e.name)) return [];
    const p = path.join(dir,e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}
function metadata(raw, key) {
  const front = raw.replace(/^\uFEFF/,'').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!front) return '';
  const lines = front[1].split(/\r?\n/);
  const at = lines.findIndex(l => l.startsWith(key+':'));
  if (at < 0) return '';
  let value = lines[at].slice(key.length+1).trim();
  if (/^[>|][-+]?$/.test(value)) value = lines.slice(at+1).filter((l,i,a) => a.slice(0,i+1).every(x=>!x.trim() || /^\s/.test(x))).join(' ').trim();
  return value.replace(/^["']|["']$/g,'');
}
function audit(root=ROOT) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root,'ai-os/os-manifest.json'),'utf8'));
  const assigned = Object.entries(manifest.pillars).flatMap(([pillar,p])=>p.agents.map(id=>({id,pillar})));
  assigned.push(...[manifest.platform.conductor,...manifest.platform.executors,...manifest.platform.builders].map(id=>({id,pillar:'platform'})));
  const findings=[];
  const add = (severity,code,file,detail) => findings.push({severity,code,file,detail});
  const catalog = (file,kind) => {
    const raw=fs.readFileSync(file,'utf8'), rel=slash(path.relative(root,file));
    const id=kind==='agent'?path.basename(file,'.md'):path.basename(path.dirname(file));
    const name=metadata(raw,'name'),description=metadata(raw,'description');
    if(!name||!description) add('error','metadata',rel,'Missing frontmatter name or description');
    if(name && name!==id) add('warning','name-alias',rel,`Folder/file id ${id} differs from frontmatter ${name}`);
    if(/D:[\\/]+Claude code|d--Claude-code|D--Claude-code/i.test(raw)) add('warning','old-path',rel,'References a retired workspace or memory path');
    if(/git add -A|git pull --rebase --autostash/.test(raw)) add('warning','broad-git',rel,'Contains blanket staging or automatic autostash instructions');
    if(kind==='agent' && !/ai-os\/agent-context\.md/.test(raw)) add('warning','shared-context',rel,'Does not explicitly load the shared current policy');
    return {id,name,kind,path:rel,description:description.slice(0,400),pillar:kind==='agent'?(assigned.find(x=>x.id===id)?.pillar||'unassigned'):null,words:raw.split(/\s+/).length,sha256:crypto.createHash('sha256').update(raw).digest('hex'),headings:raw.split(/\r?\n/).filter(l=>/^#{1,3} /.test(l)).map(l=>l.replace(/^#+ /,'')),model:metadata(raw,'model')||null};
  };
  const agents=walk(path.join(root,'.claude/agents')).filter(p=>p.endsWith('.md')).map(p=>catalog(p,'agent'));
  const skills=['.claude/skills','.agents/skills'].flatMap(dir=>walk(path.join(root,dir)).filter(p=>path.basename(p)==='SKILL.md').map(p=>catalog(p,'skill')));
  for(const {id} of assigned) if(!agents.some(a=>a.id===id)) add('error','missing-agent','ai-os/os-manifest.json',id);
  for(const a of agents) if(!assigned.some(x=>x.id===a.id)) add('error','unassigned-agent',a.path,a.id);
  for(const id of new Set(assigned.map(a=>a.id))) if(assigned.filter(a=>a.id===id).length!==1) add('error','duplicate-agent','ai-os/os-manifest.json',id);
  for(const [pillar,p] of Object.entries(manifest.pillars)) for(const id of p.skills||[]) if(!skills.some(s=>s.id===id)) add('error','missing-skill','ai-os/os-manifest.json',`${pillar}: ${id}`);
  for(const dir of ['.claude/skills','.agents/skills']) for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})) if(e.isDirectory()&&!fs.existsSync(path.join(root,dir,e.name,'SKILL.md'))) add('warning','empty-skill',`${dir}/${e.name}`,'Directory has no SKILL.md entrypoint');
  const commandFiles=walk(path.join(root,'.claude/commands')).filter(p=>p.endsWith('.md'));
  for(const p of commandFiles) {
    const raw=fs.readFileSync(p,'utf8'), rel=slash(path.relative(root,p));
    if(/git add -A|git pull --rebase --autostash/.test(raw)) add('warning','broad-git',rel,'Contains blanket staging or automatic autostash instructions');
  }
  const core=['README.md','AGENTS.md','CLAUDE.md','MEMORY.md','ai-os/VISION.md','ai-os/OS-STRUCTURE.md','ai-os/CURRENT-PLAN.md','ai-os/README.md','memory/README.md'];
  for(const p of core) if(!fs.existsSync(path.join(root,p))) add('error','missing-core',p,'Required orientation document missing');
  return {schema_version:1,as_of:'2026-09-14',scope:'Every workspace agent and SKILL.md entrypoint; command git policy; manifest integrity; core memory structure. Provider plugins and paid integrations are not runtime-certified.',summary:{agents:agents.length,skills:skills.length,commands:commandFiles.length,by_pillar:Object.fromEntries(['content','business','invest','platform'].map(p=>[p,agents.filter(a=>a.pillar===p).length])),errors:findings.filter(f=>f.severity==='error').length,warnings:findings.filter(f=>f.severity==='warning').length},findings,agents,skills};
}
function markdown(r) {
  const lines=['# Capability catalog','',`Generated from all ${r.summary.agents} role files and ${r.summary.skills} skill entrypoints. This inventory proves files exist, not that vendor services or agents are running.`,'','Regenerate: `node scripts/audit-workspace.cjs --write`',''];
  for(const pillar of ['content','business','invest','platform']) {
    lines.push(`## ${pillar[0].toUpperCase()+pillar.slice(1)}`,'','| Role | Purpose |','|---|---|');
    for(const a of r.agents.filter(a=>a.pillar===pillar)) lines.push(`| [${a.id}](../${a.path}) | ${a.description.replace(/\|/g,'/').replace(/\n/g,' ')} |`);
    lines.push('');
  }
  lines.push('## Skills','','| Skill | Source | Purpose |','|---|---|---|');
  for(const s of r.skills) lines.push(`| [${s.id}](../${s.path}) | ${s.path.startsWith('.agents')?'Media pack':'Workspace'} | ${s.description.replace(/\|/g,'/').replace(/\n/g,' ')} |`);
  return lines.join('\n')+'\n';
}
if(require.main===module) {
  const report=audit();
  if(process.argv.includes('--write')) {
    fs.mkdirSync(path.join(ROOT,'ai-os/audits'),{recursive:true});
    fs.writeFileSync(path.join(ROOT,'ai-os/audits/capability-inventory.json'),JSON.stringify(report,null,2)+'\n');
    fs.writeFileSync(path.join(ROOT,'ai-os/CAPABILITIES.md'),markdown(report));
  }
  console.log(JSON.stringify({summary:report.summary,findings:report.findings},null,2));
  if(report.summary.errors) process.exitCode=1;
}
module.exports={audit,metadata,walk,markdown};
