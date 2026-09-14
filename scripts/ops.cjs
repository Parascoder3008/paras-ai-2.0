#!/usr/bin/env node
// Local, deterministic operating console. No network calls and no sends.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const read = (file, root = ROOT) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, ''));
function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function today() { return new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Dubai', year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
function isPublicURL(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && !/[{}<>]/.test(value) && !/example\.(com|org)|localhost|127\.0\.0\.1|placeholder|pending/i.test(u.hostname + u.pathname);
  } catch { return false; }
}
function publicationBlockers(item) {
  const errors = [];
  if (!Array.isArray(item.evidence) || !item.evidence.length) errors.push('evidence missing');
  if (item.claims_reviewed !== true) errors.push('claims not reviewed');
  if (item.rights_cleared !== true) errors.push('media rights not cleared');
  if (!item.approval || item.approval.by !== 'Paras' || !validDate(item.approval.date)) errors.push('Paras approval missing');
  if (!item.cta || !isPublicURL(item.cta.url) || !validDate(item.cta.tested_on) || !item.cta.tested_by || item.cta.delivery_verified !== true) errors.push('resource delivery not verified');
  if (!item.final_asset || /pending|placeholder|\{/.test(item.final_asset)) errors.push('final asset missing');
  if (item.status === 'published' && !isPublicURL(item.published_url)) errors.push('published URL missing');
  return errors;
}
function validate(plan, board, root = ROOT) {
  const errors = [];
  // A board row pointing at a file nobody wrote is a missing package, not a prepared one.
  const missing = ref => typeof ref === 'string' && ref.includes('/') && !fs.existsSync(path.join(root, ref));
  if (plan.goal.active_paid_members !== 200) errors.push('Unexpected primary member target');
  if (!validDate(plan.window.start) || !validDate(plan.window.end) || (Date.parse(plan.window.end)-Date.parse(plan.window.start))/86400000 !== 89) errors.push('Window must contain 90 inclusive days');
  if (plan.cadence.youtube_per_week !== 2) errors.push('Long-form cadence must follow current user direction');
  if (!Array.isArray(board.items)) return [...errors, 'Board items missing'];
  const ids = new Set();
  for (const item of board.items) {
    if (!/^[a-z0-9-]+$/.test(item.id) || ids.has(item.id)) errors.push('Invalid or duplicate content id: '+item.id);
    ids.add(item.id);
    if (!validDate(item.publish_date)) errors.push(item.id+': invalid publish date');
    if (!['briefed','recorded','edited','approved','scheduled','published'].includes(item.status)) errors.push(item.id+': invalid status');
    if (!plan.team.some(p=>p.name===item.owner)) errors.push(item.id+': unknown owner');
    if (item.kind === 'youtube' && !item.package) errors.push(item.id+': package missing');
    if (missing(item.package)) errors.push(item.id+': package file not on disk: '+item.package);
    for (const e of (Array.isArray(item.evidence)?item.evidence:[])) if (missing(e)) errors.push(item.id+': evidence file not on disk: '+e);
    if (['approved','scheduled','published'].includes(item.status)) errors.push(...publicationBlockers(item).map(e=>item.id+': '+e));
  }
  return errors;
}
function economics(plan) {
  const p = plan.offer.annual_price_inr;
  const budget = plan.budget.monthly_inr;
  return {annual_price_inr:p, price_status:plan.offer.price_status, monthly_budget_inr:budget,
    monthly_base_price_inr:plan.offer.monthly_price_inr,
    monthly_billing_if_all_monthly:plan.offer.monthly_price_inr*plan.goal.active_paid_members,
    annual_sales_value_at_target:p*plan.goal.active_paid_members,
    monthly_value_equivalent_at_target:Math.round(p*plan.goal.active_paid_members/12*100)/100,
    annual_value_cost_coverage_members:Math.ceil(budget*12/p),
    ninety_day_budget_inr:budget*3,
    note:'Annual and monthly totals are alternative scenarios, not additive or verified revenue. Annual value divided by 12 is not monthly subscription MRR. Excludes tax/fees/refunds. Renewal and cancellation terms still need review.'};
}
function snapshot(root=ROOT, date=today()) {
  if (!validDate(date)) throw new Error('Use a real date in YYYY-MM-DD format');
  const plan=read('ai-os/operating-plan.json', root), board=read('ai-os/content/production-board.json', root);
  const metrics=read('ai-os/metrics/baseline.json',root);
  const ready=board.items.filter(i=>!publicationBlockers(i).length);
  return {as_of:date, execution_mode:'local reports and drafts only', plan, metrics,
    economics:economics(plan), validation_errors:validate(plan,board,root),
    due:board.items.filter(i=>i.publish_date===date),
    overdue:board.items.filter(i=>i.publish_date<date && i.status!=='published'),
    blockers:plan.blockers.filter(b=>b.status!=='resolved'),
    publish_ready_ids:ready.map(i=>i.id),
    remaining_prepared_items:board.items.filter(i=>i.publish_date>=date && i.status!=='published').length};
}
function brief(s) {
  const line=i=>`- ${i.id}: ${i.title} | ${i.kind} | ${i.owner} | ${i.status}${i.package?' | '+i.package:''}`;
  return `# Daily operating brief: ${s.as_of}\n\nGenerated from the local plan and board. Not a live CRM or payment sync.\n\n## Primary objective\n200 active paid course-plus-mentorship members by ${s.plan.window.end}. Current paid baseline: ${s.metrics.active_paid_members.value===null?'UNKNOWN':s.metrics.active_paid_members.value}.\n\n## Paras: morning, 2 hours\n15 min: choose a real business problem and inspect the evidence. 60 min: record a working demonstration or batch segment. 25 min: record standalone shorts. 20 min: approve handoff and document what failed.\n\n## Due today\n${s.due.map(line).join('\n')||'- No scheduled publication today. Record ahead and clear blockers.'}\n\n## Overdue work\n${s.overdue.map(line).join('\n')||'- None on the local board.'}\n\n## Team handoff\n- Redima: own the board, titles, platform drafts, live-link verification, and publication receipts.\n- Abhav: long-form edit; show the result early; preserve useful mistakes.\n- Devan: one short/day baseline; second only from the approved buffer.\n- Sanchit: onboarding, community moderation, requests and first-result tracking.\n- Sudam: attribution and read-only reporting; no paid campaigns in this sprint.\n\n## Blockers\n${s.blockers.map(b=>`- ${b.id} (${b.owner}): ${b.description}`).join('\n')||'- None recorded.'}\n\n## Publication gate\n${s.publish_ready_ids.length} items pass recorded local prerequisites. Passing is not authorization to publish. Never claim a task was sent or scheduled from this report.\n\n## Evening, 2 hours\nUse the session calendar in CURRENT-PLAN.md. Teaching, project feedback, Sanchit's escalations, then a brief ledger entry.\n\n## Money\nAt ₹${s.economics.annual_price_inr}/year, 200 annual members represent ₹${s.economics.annual_sales_value_at_target} in annual sales value, or ₹${s.economics.monthly_value_equivalent_at_target} as a monthly value equivalent. This is not monthly subscription MRR or cash collected. Budget: ₹${s.economics.monthly_budget_inr}/month. Payment-plan terms remain unresolved.\n`;
}
function writeBrief(s, root=ROOT) {
  const directory=path.join(root,'outputs','daily'); fs.mkdirSync(directory,{recursive:true});
  const destination=path.join(directory,`${s.as_of}-operating-brief.md`);
  const content=brief(s);
  if (fs.existsSync(destination) && fs.readFileSync(destination,'utf8')===content) return {path:destination,changed:false};
  if (fs.existsSync(destination)) throw new Error('Brief already exists with different content. Preserve it; review changes before replacing.');
  fs.writeFileSync(destination,content,{flag:'wx'}); return {path:destination,changed:true};
}
function main(args=process.argv.slice(2)) {
  const command=args[0]||'help';
  if (command==='help') return console.log('node scripts/ops.cjs check | status | readiness | brief [--date YYYY-MM-DD] [--write]');
  const index=args.indexOf('--date');
  if (index!==-1 && !args[index+1]) throw new Error('--date needs YYYY-MM-DD');
  const s=snapshot(ROOT,index===-1?today():args[index+1]);
  if(command==='check') { console.log(JSON.stringify({configuration_valid:!s.validation_errors.length,errors:s.validation_errors,production_ready:s.blockers.length===0},null,2)); if(s.validation_errors.length) process.exitCode=1; }
  else if(command==='status') console.log(JSON.stringify(s,null,2));
  else if(command==='readiness') { console.log(JSON.stringify({ready:s.blockers.length===0,blockers:s.blockers,publish_ready:s.publish_ready_ids},null,2)); if(s.blockers.length)process.exitCode=2; }
  else if(command==='brief') console.log(args.includes('--write')?JSON.stringify(writeBrief(s)):brief(s));
  else throw new Error('Unknown command: '+command);
}
if(require.main===module) {try{main();}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={snapshot,validate,publicationBlockers,economics,brief,writeBrief,validDate,isPublicURL};
