import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve(process.cwd(),'../..');
const routes={'/test':'engine/core/tahouriDeviceIdentity-test.html','/tahouriDeviceIdentity.js':'engine/core/tahouriDeviceIdentity.js'};
http.createServer(async (req,res)=>{const file=routes[req.url];if(!file){res.writeHead(404);res.end('Not found');return;}try{const body=await readFile(resolve(root,file));res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');res.end(body);}catch(e){res.writeHead(500);res.end(e.message);}}).listen(4173,'127.0.0.1');