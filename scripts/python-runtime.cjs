'use strict';
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
function resolvePython() {
  const candidates=[process.env.PYTHON,
    path.join(ROOT,'.venv-ops',process.platform==='win32'?'Scripts/python.exe':'bin/python'),
    path.join(ROOT,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python'),
    process.platform==='win32'?'python':'python3'].filter(Boolean);
  for(const candidate of [...new Set(candidates)]) {
    const r=spawnSync(candidate,['-c','import sys; print(sys.executable)'],{encoding:'utf8',timeout:5000,windowsHide:true});
    if(r.status===0 && r.stdout.trim()) return r.stdout.trim();
  }
  throw new Error('No working Python found. Create .venv-ops with an installed Python, or set PYTHON to a working executable.');
}
if(require.main===module){try{const py=resolvePython();if(process.argv.length===2)console.log(py);else{const result=spawnSync(py,process.argv.slice(2),{stdio:'inherit',windowsHide:true,env:{...process.env,PYTHONIOENCODING:'utf-8',PYTHONUTF8:'1'}});process.exitCode=result.status===null?1:result.status;}}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={resolvePython};
