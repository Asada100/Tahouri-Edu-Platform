const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:4173/test');
    await page.locator('#run').click();
    await page.waitForFunction(() => document.querySelectorAll('#results li').length >= 7, { timeout: 15000 });
    const rows = await page.locator('#results li').allTextContents();
    console.log(rows.join('\n'));
    if (rows.some(x => x.startsWith('FAIL:')) || rows.length !== 7 || rows.some(x => !x.startsWith('PASS:'))) throw new Error('Browser identity test failures');
    console.log('ALL DEVICE IDENTITY CHECKS PASSED');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });