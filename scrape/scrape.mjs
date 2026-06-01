import { chromium } from 'playwright';

const url = 'https://matwprojectde.org/de/zakat-calculator';
const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'de-DE' });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);

// Try to dismiss cookie consent
for (const sel of ['button:has-text("Akzeptieren")', 'button:has-text("Accept")', 'button:has-text("Alle akzeptieren")', '#onetrust-accept-btn-handler']) {
  try { await page.locator(sel).first().click({ timeout: 1500 }); break; } catch {}
}
await page.waitForTimeout(2000);

// Dump all visible text
const bodyText = await page.evaluate(() => document.body.innerText);
console.log('===== BODY TEXT =====');
console.log(bodyText);

// Dump all form-ish elements
const fields = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('input, select, button, label, [role="tab"], h1, h2, h3, h4').forEach(el => {
    const t = (el.innerText || el.value || el.placeholder || '').trim();
    out.push({
      tag: el.tagName.toLowerCase(),
      type: el.type || '',
      name: el.name || '',
      placeholder: el.placeholder || '',
      text: t.slice(0, 120),
    });
  });
  return out;
});
console.log('\n===== FIELDS =====');
console.log(JSON.stringify(fields, null, 2));

await page.screenshot({ path: 'scrape/reference-full.png', fullPage: true });
console.log('\nScreenshot saved.');

await browser.close();
