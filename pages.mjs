// GitHub Pages administration. Credentials stay in the system credential manager.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const repo='/repos/kanade6929/two-seconds-after-you';
const url='https://kanade6929.github.io/two-seconds-after-you/';
const runtime=['index.html','style.css','rules.js','core.js','symbols.js','render.js','community-config.js','community.js','app.js','assets/FZfont140.TTF'];
async function main(){
  if(process.argv.includes('--verify')){
    for(const file of runtime){
      const response=await fetch(url+file+'?v='+Date.now(),{signal:AbortSignal.timeout(30000)});
      if(!response.ok)throw Error(`${file}: HTTP ${response.status}`);
      // Checkout on GitHub normalizes source to LF; compare normalized text.
      const normalize=s=>typeof s==='string'?s.replace(/\r\n/g,'\n'):s;
      const digest=s=>crypto.createHash('sha256').update(normalize(s)).digest('hex');
      const binary=/\.(woff2|ttf)$/i.test(file);
      if(digest(binary?Buffer.from(await response.arrayBuffer()):await response.text())!==digest(fs.readFileSync(path.join(root,file),binary?undefined:'utf8')))throw Error(file+': online content differs');
      console.log(file+': verified');
    }
    console.log(url);return;
  }
  let secret;
  try{
    const result=execFileSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',stdio:['pipe','pipe','ignore'],env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}});
    secret=result.split('\n').find(v=>v.startsWith('password='))?.slice(9).trim();
  }catch{}
  if(!secret)throw Error('GitHub credential unavailable');
  async function api(endpoint,method='GET',body){
    const r=await fetch('https://api.github.com'+endpoint,{method,headers:{Authorization:`Bearer ${secret}`,'User-Agent':'two-seconds-pages','Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
    if(!r.ok){const e=Error(`${method} ${endpoint}: HTTP ${r.status}`);e.status=r.status;throw e;}
    return r.status===204?{}:r.json();
  }
  let pages;
  try{pages=await api(repo+'/pages');}catch(e){if(e.status!==404)throw e;}
  if(process.argv.includes('--enable')){
    const account=await api('/user');if(account.login!=='kanade6929')throw Error('Unexpected GitHub account');
    if(!pages)pages=await api(repo+'/pages','POST',{build_type:'workflow'});
    else if(pages.build_type!=='workflow')pages=await api(repo+'/pages','PUT',{build_type:'workflow'});
  }
  const runs=await api(repo+'/actions/runs?per_page=3');
  console.log(JSON.stringify({pages:pages?{url:pages.html_url,status:pages.status,buildType:pages.build_type}:null,runs:runs.workflow_runs.map(r=>({id:r.id,sha:r.head_sha,status:r.status,conclusion:r.conclusion,url:r.html_url}))},null,2));
  if(process.argv.includes('--jobs')&&runs.workflow_runs[0]){
    const jobs=await api(repo+`/actions/runs/${runs.workflow_runs[0].id}/jobs`);
    console.log(JSON.stringify(jobs.jobs.map(j=>({name:j.name,conclusion:j.conclusion,steps:j.steps.map(s=>({name:s.name,conclusion:s.conclusion}))})),null,2));
  }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
