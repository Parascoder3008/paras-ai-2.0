const test=require('node:test'),assert=require('node:assert/strict');
const {audit,metadata}=require('./audit-workspace.cjs');
test('every installed role and manifest skill resolves with current context',()=>{const r=audit();assert.equal(r.summary.agents,53);assert.equal(r.summary.skills,73);assert.deepEqual(r.findings,[]);});
test('metadata supports folded descriptions without reading later fields',()=>{assert.equal(metadata('---\nname: test\ndescription: >\n  first line\n  second line\nmodel: opus\n---\nbody','description'),'first line   second line');});
