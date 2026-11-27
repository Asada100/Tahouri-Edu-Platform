'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = process.cwd();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  const relative = pathname === '/' ? '/experiments/change-journal-prototype/index.html' : pathname;
  const file = path.resolve(root, '.' + relative);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  let browser;
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(4173, '127.0.0.1', resolve);
    });
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on('pageerror', error => { throw error; });
    await page.goto('http://127.0.0.1:4173/experiments/change-journal-prototype/index.html', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__testResult && window.__testResult.total === 6);
    const result = await page.evaluate(() => ({
      summary: document.querySelector('#summary').textContent,
      lines: [...document.querySelectorAll('#results li')].map(item => item.textContent),
      result: window.__testResult
    }));
    for (const line of result.lines) console.log(line);
    if (result.result.passed !== result.result.total || result.summary !== '6/6 آزمون موفق') {
      throw new Error('Browser test failed: ' + result.summary);
    }
    console.log('BROWSER RESULT: PASS (6/6)');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
