const { chromium } = require(process.env.ECHO_PLAYWRIGHT_MODULE || 'playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');

// Verify the downloadable entry works without an HTTP server or community service.
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(__dirname, '../index.html')).href);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#start').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    assert.match(await page.title(), /辰星夜/);
    assert.equal(await page.locator('#gameHeading').isVisible(), true);
    assert.equal(await page.evaluate(() => document.fonts.check('16px "Arcana YueSong"')), true);
    assert.deepEqual(errors, []);
    console.log('file:// entry, bundled font and keyboard start passed');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
