'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = process.cwd();
const server = http.createServer((req,res)=>{
  const pathname = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const relative = pathname === '/' ? '/experiments/change-journal-prototype/activity-session-identity-test.html' : pathname;
  const file = path.resolve(root,'.'+relative);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'content-type':path.extname(file)==='.html'?'text/html; charset=utf-8':'text/javascript; charset=utf-8'});
  fs.createReadStream(file).pipe(res);
});
(async()=>{
 let browser;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4174,'127.0.0.1',resolve);});
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  page.on('pageerror',error=>{throw error;});
  await page.goto('http://127.0.0.1:4174/experiments/change-journal-prototype/activity-session-identity-test.html',{waitUntil:'load'});
  await page.waitForFunction(()=>document.querySelector('#summary')?.textContent!=='running');
  const result=await page.evaluate(()=>({summary:document.querySelector('#summary').textContent,lines:[...document.querySelectorAll('#results li')].map(x=>x.textContent),diagnostic:window.__identityDiagnostic}));
  result.lines.forEach(line=>console.log(line));
  if(result.lines.length!==5||!result.summary.startsWith('5/5')||result.diagnostic?.passed!==5||result.diagnostic?.blockers!==2) throw new Error('Identity diagnostic harness failed: '+result.summary);
  if(!result.lines.some(x=>x.includes('BLOCKER CONFIRMED')&&x.includes('timestamp collision reproduced'))) throw new Error('Expected timestamp collision was not reproduced; review harness assumptions.');
  if(!result.lines.some(x=>x.includes('BLOCKER CONFIRMED')&&x.includes('profile-independent ID collision reproduced'))) throw new Error('Expected cross-profile ID collision was not reproduced; review harness assumptions.');
  console.log('SESSION IDENTITY DIAGNOSTIC: PASS (5/5 diagnostic checks; 2 known blockers confirmed; acceptance gate remains BLOCKED)');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
