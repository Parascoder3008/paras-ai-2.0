#!/usr/bin/env node
'use strict';
// Export reviewed source into an independent new project, without old Git history.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {walk}=require('./audit-workspace.cjs');
const ROOT=path.resolve(__dirname,'..');
const ROOT_FILES=['README.md','AGENTS.md','CLAUDE.md','MEMORY.md','AI-OS-BIBLE.md','connections.md','package.json','requirements.txt','skills-lock.json','.env.example','.mcp.json.example','Start-Paras-AI.bat','Start-Workday.bat'];
const DIRS=['.claude/agents','.claude/skills','.claude/commands','.claude/hooks','.agents/skills','scripts','dashboard','jarvis','memory','context','ledger','ai-os/tools','ai-os/automation','ai-os/content/sprint-2026-09','ai-os/metrics','ai-os/audits','docs/archive/pre-paras-ai-2.0'];
const FILES=['Other Worlds/README.md','Other Worlds/projects.json','.claude/settings.json','ai-os/CURRENT-PLAN.md','ai-os/VISION.md','ai-os/README.md','ai-os/OS-STRUCTURE.md','ai-os/CAPABILITIES.md','ai-os/os-manifest.json','ai-os/operating-plan.json','ai-os/agent-context.md','ai-os/course-and-mentorship-offer.md','ai-os/brand-guidelines.md','ai-os/content/production-board.json','docs/SETUP.md','docs/PORTABILITY.md','docs/_index.md','reference/writing-style.md','reference/getting-keys.md'];
const DENY=/(?:^|\/)(?:\.git|node_modules|__pycache__|\.venv|\.venv-ops|private|context\/import|outputs|credentials|\.fastembed-cache)(?:\/|$)|(?:^|\/)(?:\.env(?:\..*)?|\.mcp\.json|settings\.local\.json|inbox\.jsonl|sync-state\.json|mind-manifest\.json|mind-embeddings\.npz|grant_course_access\.py|prepare-sprint\.py|update-offer\.py)$|\.(?:log|pyc|npz|db|zip|mp4|mov|key|pem)$/i;
const TEXT=/\.(?:md|json|jsonl|js|cjs|mjs|ts|html|css|py|yml|yaml|txt|toml|ini|sh|bat|example)$|(?:^|\/)(?:LICENSE|Dockerfile|\.gitignore)$/i;
const PATTERNS=[
 ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
 ['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
 ['api-secret',/\b(?:sk-(?:ant-api\d+-)?[A-Za-z0-9_-]{28,}|AKIA[A-Z0-9]{16})\b/],
 ['jwt',/\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{12,}\b/],
 ['credential-url',/https?:\/\/[^\s/:]+:[^\s/@]+@/],
 ['literal-secret',/(?:api[_-]?key|api[_-]?secret|access[_-]?token|auth[_-]?token|password)\s*["']?\s*[:=]\s*["'][A-Za-z0-9_+\-/=]{24,}["']/i]
];
function secrets(text,file){const hits=[];text.split(/\r?\n/).forEach((line,i)=>{for(const [kind,pattern]of PATTERNS){const match=line.match(pattern);if(match && !(kind==='literal-secret' && /(?:YOUR_|PLACEHOLDER|EXAMPLE_|PASTE_|REPLACE_)/.test(match[0])))hits.push({file,line:i+1,kind});}});return hits;}
function candidates(root=ROOT){return [...new Set([...ROOT_FILES,...FILES,...DIRS.flatMap(d=>walk(path.join(root,d)).map(p=>path.relative(root,p).replace(/\\/g,'/')))])].filter(p=>fs.existsSync(path.join(root,p))&&fs.statSync(path.join(root,p)).isFile()&&(!DENY.test(p)||['.env.example','.mcp.json.example'].includes(p))).sort();}
function scan(root=ROOT){const files=candidates(root),findings=[];let bytes=0;const inventory=[];for(const p of files){const data=fs.readFileSync(path.join(root,p));bytes+=data.length;if(data.length>5*1024*1024)findings.push({file:p,kind:'oversized-review'});if(TEXT.test(p))findings.push(...secrets(data.toString('utf8'),p));inventory.push({path:p,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});}return {files:inventory,file_count:files.length,bytes,findings};}
const RELEASE_IGNORE=`# Secrets and local state\n.env\n.env.*\n!.env.example\n.mcp.json\n.claude/settings.local.json\ncredentials/\nprivate/\n*.key\n*.pem\n**/tokens.json\n**/*oauth-token.json\n**/credentials.json\n**/service-account*.json\ncontext/import/\n**/*contacts*.csv\n**/*leads*.csv\n*.db*\n*.log\nnode_modules/\n.venv/\n.venv-ops/\n__pycache__/\n*.pyc\noutputs/\nmemory/inbox.jsonl\nmemory/sync-state.json\nai-os/agent-runs*.jsonl\nai-os/tools/mind-embeddings.npz\nai-os/tools/mind-manifest.json\nai-os/tools/.fastembed-cache/\nvideo-engine/\nvideo-use/\npaper-trader/\nparas-ai-2.0/\n`;
function build(destination,root=ROOT){
  const dest=path.resolve(destination),base=path.resolve(root);
  if(dest!==path.join(base,'paras-ai-2.0'))throw new Error('Release destination must be the dedicated paras-ai-2.0 folder inside this workspace');
  if(fs.existsSync(dest)&&fs.readdirSync(dest).length)throw new Error('Release folder is not empty; preserve and review it before updating');
  const r=scan(root);if(r.findings.length)throw new Error('Release scan found '+r.findings.length+' items requiring review');
  fs.mkdirSync(dest,{recursive:true});
  for(const f of r.files){const p=path.join(dest,f.path);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(path.join(root,f.path),p);}
  fs.writeFileSync(path.join(dest,'.gitignore'),RELEASE_IGNORE);
  fs.mkdirSync(path.join(dest,'docs'),{recursive:true});
  fs.writeFileSync(path.join(dest,'docs/release-inventory.json'),JSON.stringify({created:'2026-09-14',source:'Curated export of the original AIOS workspace; no previous Git history',excluded:['credentials and local settings','customer records','private captures and raw vault notes','run logs and caches','raw historical campaigns; selected prior core documents retained as archives','paper-trader, video-engine and video-use projects'],...r},null,2)+'\n');
  return {destination:dest,file_count:r.file_count,bytes:r.bytes,findings:r.findings};
}
if(require.main===module){try{if(process.argv[2]==='build')console.log(JSON.stringify(build(path.join(ROOT,'paras-ai-2.0')),null,2));else{const r=scan();console.log(JSON.stringify({file_count:r.file_count,bytes:r.bytes,findings:r.findings},null,2));if(r.findings.length)process.exitCode=1;}}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={scan,secrets,candidates,build};
