// Run --check to inspect authorization, --create to create the isolated project,
// --publish to upload only the five runtime files. Never prints credentials.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const recordPath=path.join(root,'.deployment.local.json');
const owner='kanade6929',name='two-seconds-after-you';
const runtime=['index.html','style.css','core.js','render.js','app.js'];
let githubToken;
function credential(){
  if(githubToken)return githubToken;
  try{const out=execFileSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',stdio:['pipe','pipe','ignore'],env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}});
    githubToken=out.split('\n').find(s=>s.startsWith('password='))?.slice(9).trim();
  }catch{}return githubToken;
}
async function api(service,endpoint,method='GET',body){
  const token=service==='github'?credential():process.env.NETLIFY_AUTH_TOKEN;
  if(!token)throw Error(service+' credential not available');
  const url=(service==='github'?'https://api.github.com':'https://api.netlify.com/api/v1')+endpoint;
  const r=await fetch(url,{method,headers:{Authorization:`Bearer ${token}`,'User-Agent':'two-seconds-release','Content-Type':Buffer.isBuffer(body)?'application/octet-stream':'application/json',...(service==='github'?{'Accept':'application/vnd.github+json'}:{})},body:body==null?undefined:Buffer.isBuffer(body)?body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  if(!r.ok){const e=Error(service+' '+method+' '+endpoint+' HTTP '+r.status);e.status=r.status;throw e;}
  return r.status===204?{}:r.json();
}
async function main(){
  if(process.argv.includes('--check')){
    const gh=await api('github','/user');if(gh.login!==owner)throw Error('Unexpected GitHub account');
    const nf=await api('netlify','/user');console.log(JSON.stringify({github:gh.login,netlifyAuthorized:!!nf.id,files:runtime}));return;
  }
  let record=fs.existsSync(recordPath)?JSON.parse(fs.readFileSync(recordPath,'utf8')):{};
  if(process.argv.includes('--create')){
    const gh=await api('github','/user');if(gh.login!==owner)throw Error('Unexpected GitHub account');
    if(!record.repository){
      try{await api('github',`/repos/${owner}/${name}`);throw Error('Repository already exists; refusing to reuse without saved project record');}
      catch(e){if(e.status!==404)throw e;}
      const repo=await api('github','/user/repos','POST',{name,description:'两秒之后的你 — 八章夜色鼠标解谜游戏',private:false,auto_init:false});
      record.repository=repo.html_url;record.clone=repo.clone_url;fs.writeFileSync(recordPath,JSON.stringify(record,null,2));
    }
    if(!record.siteId){
      const site=await api('netlify','/sites','POST',{name:'two-seconds-kanade6929'});
      record.siteId=site.id;record.url=site.ssl_url||site.url;fs.writeFileSync(recordPath,JSON.stringify(record,null,2));
    }
    console.log(JSON.stringify(record));return;
  }
  if(!process.argv.includes('--publish'))throw Error('Use --check, --create or --publish');
  if(!record.siteId)throw Error('Create the isolated site first');
  const site=await api('netlify','/sites/'+record.siteId);
  if(site.name!=='two-seconds-kanade6929')throw Error('Site identity mismatch');
  const files={},byHash=new Map();
  for(const file of runtime){const data=fs.readFileSync(path.join(root,file)),hash=crypto.createHash('sha1').update(data).digest('hex');files['/'+file]=hash;byHash.set(hash,{file,data});}
  const deploy=await api('netlify',`/sites/${site.id}/deploys`,'POST',{files,draft:true,title:'Eight distinct puzzles and radiant interaction feedback'});
  record.deployId=deploy.id;fs.writeFileSync(recordPath,JSON.stringify(record,null,2));
  for(const hash of deploy.required||[]){const item=byHash.get(hash);if(!item)throw Error('Unknown requested file');await api('netlify',`/deploys/${deploy.id}/files/${item.file}`,'PUT',item.data);}
  let state;
  for(let n=0;n<20;n++){state=await api('netlify',`/deploys/${deploy.id}`);if(state.state==='ready')break;if(state.state==='error')throw Error('Deploy failed');await new Promise(r=>setTimeout(r,1500));}
  if(state.state!=='ready')throw Error('Deploy not ready; production unchanged');
  await api('netlify',`/sites/${site.id}/deploys/${deploy.id}/restore`,'POST');
  const final=await api('netlify',`/sites/${site.id}`);if(final.published_deploy?.id!==deploy.id)throw Error('Published deploy mismatch');
  record.url=final.ssl_url;record.state='published';fs.writeFileSync(recordPath,JSON.stringify(record,null,2));
  for(const file of runtime){const res=await fetch(record.url+'/'+file+'?verify='+deploy.id,{signal:AbortSignal.timeout(30000)});if(!res.ok)throw Error('Live file failed: '+file);
    const hash=crypto.createHash('sha1').update(Buffer.from(await res.arrayBuffer())).digest('hex');if(hash!==files['/'+file])throw Error('Live hash mismatch: '+file);}
  console.log(JSON.stringify({...record,verifiedFiles:runtime.length}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
