'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd();
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 const relative=pathname==='/'?'/experiments/change-journal-prototype/session-resume-transaction-test.html':pathname;
 const file=path.resolve(root,'.'+relative);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{'content-type':path.extname(file)==='.html'?'text/html; charset=utf-8':'text/javascript; charset=utf-8'});
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 let browser;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4177,'127.0.0.1',resolve);});
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  page.on('pageerror',error=>{throw error;});
  await page.goto('http://127.0.0.1:4177/experiments/change-journal-prototype/session-resume-transaction-test.html',{waitUntil:'load'});
  await page.waitForFunction(()=>document.querySelector('#summary')?.textContent!=='running');
  const result=await page.evaluate(()=>window.__resumeTransactionDiagnostic);
  result.results.forEach(item=>console.log((item.reproduced?'BLOCKER CONFIRMED — ':'NOT REPRODUCED — ')+item.name+' — '+item.detail));
  if(result.reproduced!==5||result.total!==5)throw new Error('Expected all 5 resume transaction failure diagnostics to reproduce; got '+result.reproduced+'/'+result.total);
  console.log('SESSION RESUME TRANSACTION DIAGNOSTICS: PASS (5/5 defects reproduced; runtime acceptance remains BLOCKED)');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
