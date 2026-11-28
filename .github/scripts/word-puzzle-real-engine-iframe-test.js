'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {chromium}=require('playwright');
const root=process.cwd();
const htmlPath=path.join(root,'experiments/change-journal-prototype/word-puzzle-real-engine-iframe-test.html');
const html=fs.readFileSync(htmlPath,'utf8');
const inlineScripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
if(inlineScripts.length!==1)throw new Error('Expected exactly one outer inline script; found '+inlineScripts.length);
new vm.Script(inlineScripts[0][1],{filename:htmlPath});
console.log('PASS — outer iframe harness JavaScript parses');
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 const fallback='/experiments/change-journal-prototype/word-puzzle-real-engine-iframe-test.html';
 const file=path.resolve(root,'.'+(pathname==='/'?fallback:pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
 const ext=path.extname(file);
 const type=ext==='.html'?'text/html; charset=utf-8':ext==='.js'?'text/javascript; charset=utf-8':ext==='.css'?'text/css; charset=utf-8':'application/octet-stream';
 res.writeHead(200,{'content-type':type});fs.createReadStream(file).pipe(res);
});
(async()=>{
 let browser;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4180,'127.0.0.1',resolve);});
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const pageErrors=[];
  const consoleErrors=[];
  const failedRequests=[];
  page.on('pageerror',error=>pageErrors.push(error.stack||error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  page.on('requestfailed',request=>failedRequests.push(request.url()+' :: '+request.failure()?.errorText));
  await page.goto('http://127.0.0.1:4180/experiments/change-journal-prototype/word-puzzle-real-engine-iframe-test.html',{waitUntil:'load'});
  try{
   await page.waitForFunction(()=>!!window.__wordPuzzleRealEngineProof,{timeout:15000});
  }catch(error){
   console.error('PAGE ERRORS '+JSON.stringify(pageErrors));
   console.error('CONSOLE ERRORS '+JSON.stringify(consoleErrors));
   console.error('FAILED REQUESTS '+JSON.stringify(failedRequests));
   const frames=page.frames().map(frame=>({url:frame.url(),name:frame.name()}));
   console.error('FRAMES '+JSON.stringify(frames));
   throw new Error('Proof object was not produced; '+error.message);
  }
  const proof=await page.evaluate(()=>window.__wordPuzzleRealEngineProof);
  proof.checks.forEach(([name,pass])=>console.log((pass?'PASS — ':'FAIL — ')+name));
  console.log('DETAILS '+JSON.stringify(proof.result));
  if(pageErrors.length)console.error('PAGE ERRORS '+JSON.stringify(pageErrors));
  if(consoleErrors.length)console.error('CONSOLE ERRORS '+JSON.stringify(consoleErrors));
  if(proof.passed!==proof.total)throw new Error('Actual WordPuzzle engine iframe proof failed: '+proof.passed+'/'+proof.total);
  console.log('WORDPUZZLE REAL ENGINE IFRAME PROOF: PASS ('+proof.passed+'/'+proof.total+')');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
