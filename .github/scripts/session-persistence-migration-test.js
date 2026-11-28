'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = process.cwd();
const server = http.createServer((req,res)=>{
  const pathname = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const relative = pathname === '/' ? '/experiments/change-journal-prototype/session-persistence-migration-test.html' : pathname;
  const file = path.resolve(root,'.'+relative);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'content-type':path.extname(file)==='.html'?'text/html; charset=utf-8':'text/javascript; charset=utf-8'});
  fs.createReadStream(file).pipe(res);
});
(async()=>{
 let browser;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4176,'127.0.0.1',resolve);});
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  page.on('pageerror',error=>{throw error;});
  await page.goto('http://127.0.0.1:4176/experiments/change-journal-prototype/session-persistence-migration-test.html',{waitUntil:'load'});
  await page.waitForFunction(()=>document.querySelector('#summary')?.textContent!=='running');
  const result=await page.evaluate(()=>window.__persistenceMigrationDiagnostic);
  result.results.forEach(item=>console.log((item.passed?'PASS — ':'FAIL — ')+item.name+' — '+item.detail));
  if(result.passed!==5||result.total!==5) throw new Error('Expected 5 durable session creation acceptance checks; got '+result.passed+'/'+result.total);
  console.log('SESSION CREATION DURABILITY ACCEPTANCE: PASS (5/5 checks)');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
