'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd();
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 const file=path.resolve(root,'.'+(pathname==='/'?'/experiments/change-journal-prototype/word-puzzle-screen-isolation-test.html':pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
 const type=path.extname(file)==='.html'?'text/html; charset=utf-8':path.extname(file)==='.js'?'text/javascript; charset=utf-8':'text/css; charset=utf-8';
 res.writeHead(200,{'content-type':type});fs.createReadStream(file).pipe(res);
});
(async()=>{
 let browser;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4179,'127.0.0.1',resolve);});
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  page.on('pageerror',error=>{throw error;});
  await page.goto('http://127.0.0.1:4179/experiments/change-journal-prototype/word-puzzle-screen-isolation-test.html',{waitUntil:'load'});
  await page.waitForFunction(()=>!!window.__wordPuzzleIsolationProof,{timeout:12000});
  const result=await page.evaluate(()=>window.__wordPuzzleIsolationProof);
  result.results.forEach(x=>console.log((x.pass?'PASS — ':'FAIL — ')+x.name+' — '+x.detail));
  if(result.passed!==result.total)throw new Error('WordPuzzle isolated browsing context proof failed: '+result.passed+'/'+result.total);
  console.log('WORDPUZZLE ISOLATED BROWSING CONTEXT PROOF: PASS ('+result.passed+'/'+result.total+')');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
