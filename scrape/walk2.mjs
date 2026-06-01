import { chromium } from 'playwright';

const url = 'https://matwprojectde.org/de/zakat-calculator';
const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'de-DE' });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
for (const sel of ['#onetrust-accept-btn-handler', 'button:has-text("Akzeptieren")']) {
  try { await page.locator(sel).first().click({ timeout: 1500 }); break; } catch {}
}
await page.waitForTimeout(1500);

async function dump(label) {
  const data = await page.evaluate(() => ({
    heads: [...document.querySelectorAll('h1,h2,h3,h4')].map(h => h.innerText.trim()).filter(Boolean),
    labels: [...document.querySelectorAll('label')].map(l => l.innerText.trim()).filter(Boolean),
    inputs: [...document.querySelectorAll('input')].filter(i=>i.type!=='hidden').map(i => ({ type: i.type, ph: i.placeholder })),
    buttons: [...document.querySelectorAll('button')].map(b => b.innerText.trim()).filter(Boolean),
    body: document.body.innerText,
  }));
  console.log(`\n===== ${label} =====`);
  console.log('HEADS:', JSON.stringify(data.heads));
  console.log('LABELS:', JSON.stringify(data.labels));
  console.log('INPUTS:', JSON.stringify(data.inputs));
  console.log('BUTTONS:', JSON.stringify(data.buttons));
  const money = data.body.split('\n').map(s=>s.trim()).filter(s=>/€|Nisab|2,5|Gramm|gramm|Karat|Preis pro|fällig|beträgt|Gesamt|Vermögen/i.test(s));
  console.log('KEY LINES:', JSON.stringify([...new Set(money)]));
  await page.screenshot({ path: `scrape/w-${label}.png`, fullPage: true });
}

await page.locator('h2:has-text("Was ich besitze")').waitFor({ timeout: 15000 });
await dump('step1');

// Click each category card by its label text
for (const cat of ['Bargeld','Gold & Silber','Krypto','Aktien','Sonstige Handelsposten']) {
  try { await page.locator(`label:has-text("${cat}")`).first().click({ timeout: 2000 }); } catch(e){ console.log('cannot click', cat); }
  await page.waitForTimeout(200);
}
await page.waitForTimeout(500);

for (let step = 2; step <= 12; step++) {
  const next = page.getByRole('button', { name: /Weiter|Berechnen|Ergebnis|Zur Spende|Ergebnisse/i }).first();
  const cnt = await next.count();
  if (cnt === 0) { console.log(`[no next button at step ${step}]`); break; }
  const disabled = await next.isDisabled().catch(()=>false);
  console.log(`\n--> clicking next for step ${step} (disabled=${disabled})`);
  try { await next.click({ timeout: 3000 }); } catch(e){ console.log('click failed:', e.message); break; }
  await page.waitForTimeout(1500);
  // fill visible number/text amount inputs
  const nums = page.locator('input[type="number"]:visible, input[inputmode="numeric"]:visible');
  const ncnt = await nums.count();
  for (let i = 0; i < ncnt; i++) {
    try { await nums.nth(i).fill(String(1000 + i*100)); } catch {}
  }
  await page.waitForTimeout(300);
  await dump(`step${step}`);
  const bt = await page.evaluate(() => document.body.innerText);
  if (/Ihre Zakat|fällige Zakat|Zakat beträgt|zu zahlen|2,5\s?%/i.test(bt) && step > 3) { console.log('[looks like result reached]'); }
}

await browser.close();
console.log('\nDONE');
