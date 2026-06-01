import { chromium } from 'playwright';

const url = 'https://matwprojectde.org/de/zakat-calculator';
const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'de-DE' });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
for (const sel of ['#onetrust-accept-btn-handler', 'button:has-text("Akzeptieren")', 'button:has-text("Accept")']) {
  try { await page.locator(sel).first().click({ timeout: 1500 }); break; } catch {}
}
await page.waitForTimeout(1500);

async function dump(label) {
  const data = await page.evaluate(() => {
    // find the calculator container (the modal/section holding "Weiter" or result)
    const heads = [...document.querySelectorAll('h1,h2,h3,h4')].map(h => h.innerText.trim()).filter(Boolean);
    const labels = [...document.querySelectorAll('label')].map(l => l.innerText.trim()).filter(Boolean);
    const inputs = [...document.querySelectorAll('input')].map(i => ({ type: i.type, placeholder: i.placeholder, value: i.value }));
    const buttons = [...document.querySelectorAll('button')].map(b => b.innerText.trim()).filter(Boolean);
    const selects = [...document.querySelectorAll('select')].map(s => [...s.options].map(o => o.text));
    // any text that looks like a number/price (nisab, totals)
    const bodyText = document.body.innerText;
    return { heads, labels, inputs, buttons, selects, bodyText };
  });
  console.log(`\n========== ${label} ==========`);
  console.log('HEADS:', JSON.stringify(data.heads));
  console.log('LABELS:', JSON.stringify(data.labels));
  console.log('INPUTS:', JSON.stringify(data.inputs));
  console.log('SELECTS:', JSON.stringify(data.selects));
  console.log('BUTTONS:', JSON.stringify(data.buttons));
  // print body lines that contain € or digits relevant to nisab
  const moneyLines = data.bodyText.split('\n').map(s => s.trim()).filter(s => /€|Nisab|2,5|2\.5|Zakat|gramm|Gramm|Preis/i.test(s));
  console.log('MONEY/NISAB LINES:', JSON.stringify([...new Set(moneyLines)]));
  await page.screenshot({ path: `scrape/step-${label}.png`, fullPage: true });
}

// STEP 1: select all categories
await page.locator('h2:has-text("Was ich besitze")').waitFor({ timeout: 15000 });
await dump('1-select');
// check all checkboxes
const checks = page.locator('input[type="checkbox"]');
const n = await checks.count();
for (let i = 0; i < n; i++) {
  const c = checks.nth(i);
  if (!(await c.isChecked())) { try { await c.check({ force: true }); } catch {} }
}
await page.waitForTimeout(500);

// Walk forward up to 8 steps
for (let step = 2; step <= 9; step++) {
  const next = page.locator('button:has-text("Weiter"), button:has-text("Berechnen"), button:has-text("Ergebnis")').first();
  if (await next.count() === 0) break;
  try { await next.click({ timeout: 3000 }); } catch { break; }
  await page.waitForTimeout(1500);
  // fill any number inputs with a sample value so we can progress
  const nums = page.locator('input[type="number"], input[type="text"]:visible');
  const cnt = await nums.count();
  for (let i = 0; i < cnt; i++) {
    const el = nums.nth(i);
    try { if (await el.isVisible() && (await el.inputValue()) === '') await el.fill('1000'); } catch {}
  }
  await dump(`${step}`);
  // stop if we reached a result/zakat-due screen
  const bt = await page.evaluate(() => document.body.innerText);
  if (/Ihre Zakat beträgt|Zu zahlende Zakat|Ihre fällige Zakat|fällige Zakat|2,5 ?%/i.test(bt) && step > 2) {
    // continue one more to capture final
  }
}

await browser.close();
console.log('\nDONE');
