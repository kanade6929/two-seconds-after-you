// Explicit opt-in: posts two clearly marked QA comments to the REAL configured service.
// No admin key. Does not delete comments; prints their exact IDs for owner cleanup.
const assert=require('node:assert/strict'),{chromium}=require(process.env.ECHO_PLAYWRIGHT_MODULE||'playwright');
if(process.env.ECHO_LIVE_COMMUNITY!=='1')throw Error('Set ECHO_LIVE_COMMUNITY=1 to authorize real QA posts.');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const tag='上线验收 '+new Date().toISOString(),errors=[],rows=[];
 try{
  const contexts=await Promise.all([browser.newContext(),browser.newContext()]);
  const pages=await Promise.all(contexts.map(c=>c.newPage()));
  for(const p of pages){p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>{if(r.url().includes('supabase.co'))console.log('NETWORK',new URL(r.url()).pathname,r.failure()?.errorText);});p.on('response',async r=>{if(r.url().includes('supabase.co')&&r.status()>=400)console.log('SERVICE',r.status(),new URL(r.url()).pathname,await r.text().catch(()=>''));});await p.goto(process.env.ECHO_TEST_URL||'http://127.0.0.1:4173');await p.waitForFunction(()=>localStorage.getItem('echo.community.session:'+ECHO_COMMUNITY_CONFIG.url)&&/\d/.test(document.getElementById('likeLabel').textContent));}
  const [a,b]=pages;
  const api=async(p,path,options={})=>p.evaluate(async({path,options})=>{const c=window.ECHO_COMMUNITY_CONFIG,s=JSON.parse(localStorage.getItem('echo.community.session:'+c.url));const r=await fetch(c.url+path,{method:options.method||'GET',headers:{apikey:c.publishableKey,'Content-Type':'application/json',...(!options.unauth?{Authorization:'Bearer '+s.access_token}:{}),Prefer:'return=representation'},...(options.body?{body:JSON.stringify(options.body)}:{})});return{status:r.status,body:await r.json().catch(()=>null)};},{path,options});
  const identity=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('echo.community.session:'+ECHO_COMMUNITY_CONFIG.url)).user.id);
  const aid=await identity(a),bid=await identity(b);assert.notEqual(aid,bid);
  const likes=async p=>(await api(p,'/rest/v1/rpc/community_likes',{method:'POST',body:{}})).body;
  const initial=await likes(a);assert.equal(initial.liked,false);
  await a.locator('#likeButton').click();await a.waitForFunction(()=>document.getElementById('likeButton').getAttribute('aria-pressed')==='true');
  assert.equal((await likes(b)).count,initial.count+1);assert.equal((await likes(b)).liked,false);
  await b.locator('#likeButton').click();await b.waitForFunction(()=>document.getElementById('likeButton').getAttribute('aria-pressed')==='true');assert.equal((await likes(a)).count,initial.count+2);
  const foreignDelete=await api(b,'/rest/v1/likes?user_id=eq.'+aid,{method:'DELETE'});assert.ok(foreignDelete.status<300);assert.deepEqual(foreignDelete.body,[]);assert.equal((await likes(a)).liked,true);
  assert.ok((await api(b,'/rest/v1/likes',{method:'POST',body:{user_id:aid}})).status>=400);
  for(const p of pages){await p.locator('#likeButton').click();await p.waitForFunction(()=>document.getElementById('likeButton').getAttribute('aria-pressed')==='false');}
  assert.equal((await likes(a)).count,initial.count);
  for(let i=0;i<2;i++){
   const p=pages[i];await p.locator('#commentsButton').click();await p.waitForFunction(()=>!document.getElementById('communityStatus').textContent.includes('正在读取'));
   await p.locator('#nickname').fill('测试·待清理');await p.locator('#commentBody').fill(tag+' / '+(i+1)+(i===0?' <img src=x onerror=alert(1)>':''));
   const result=p.waitForResponse(r=>r.url().includes('/rest/v1/comments')&&r.request().method()==='POST');await p.locator('#submitComment').click();const response=await result;assert.equal(response.status(),201);rows.push(...await response.json());
   await p.waitForFunction(()=>document.getElementById('commentBody').value==='');
  }
  for(const p of pages){await p.locator('#closeCommunity').click();await p.locator('#commentsButton').click();await p.waitForFunction(tag=>document.getElementById('commentList').textContent.includes(tag+' / 2'),tag);assert.ok((await p.locator('#commentList').innerText()).includes(tag+' / 1'));assert.equal(await p.locator('#commentList img').count(),0);}
  for(const opts of [{unauth:true,body:{body:'blocked'}},{body:{user_id:aid,nickname:'',body:'spoof'}}])assert.ok((await api(b,'/rest/v1/comments',{method:'POST',...opts})).status>=400);
  assert.ok((await api(b,'/rest/v1/comments?id=eq.'+rows[0].id,{method:'PATCH',body:{body:'tamper'}})).status>=400);
  assert.ok((await api(b,'/rest/v1/comments?id=eq.'+rows[0].id,{method:'DELETE'})).status>=400);
  assert.ok((await api(a,'/rest/v1/rpc/community_likes',{method:'POST',unauth:true,body:{}})).status>=400);
  // Actual browser offline path: no fake success, input survives, network recovery reloads.
  await a.locator('#commentBody').fill('离线验收：不应公开');await contexts[0].setOffline(true);await a.locator('#submitComment').click();await a.waitForFunction(()=>document.getElementById('communityStatus').textContent.includes('未能送出'));assert.equal(await a.locator('#commentBody').inputValue(),'离线验收：不应公开');await contexts[0].setOffline(false);
  await a.locator('#closeCommunity').click();await a.locator('#commentsButton').click();await a.waitForFunction(()=>document.getElementById('communityStatus').textContent.includes('公开可见'));
  assert.deepEqual(errors,[]);console.log('PASS: two isolated browser identities, shared plaintext comments, likes/undo, RLS denials, offline input retention and recovery.');
 }finally{console.log('QA_COMMENT_ROWS '+JSON.stringify(rows.map(({id,nickname,body})=>({id,nickname,body}))));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
