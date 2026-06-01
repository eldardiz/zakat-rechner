import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'de-DE' });
await page.goto('https://matwprojectde.org/de/zakat-calculator', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
try { await page.locator('#onetrust-accept-btn-handler').click({ timeout: 1500 }); } catch {}
await page.waitForTimeout(1000);

await page.locator('h2:has-text("Was ich besitze")').waitFor({ timeout: 15000 });
for (const cat of ['Bargeld','Gold & Silber','Krypto','Aktien','Sonstige Handelsposten']) {
  try { await page.locator(`label:has-text("${cat}")`).first().click({ timeout: 2000 }); } catch {}
}
await page.locator('button:has-text("Weiter")').first().click();
await page.waitForTimeout(1500);

// Fill all visible text inputs that look like amount fields (placeholder 0.00)
const amount = page.locator('input[placeholder="0.00"]:visible');
const c = await amount.count();
console.log('amount fields:', c);
for (let i = 0; i < c; i++) { try { await amount.nth(i).fill('1000'); } catch {} }
// answer any Ja/Nein real-estate radio with "Ich kaufe und verkaufe"
try { await page.locator('text=Ich kaufe und verkaufe Immobilien').first().click({ timeout: 1500 });
      const re = page.locator('input[placeholder="0.00"]:visible'); const rc = await re.count();
      for (let i=0;i<rc;i++){ try{ await re.nth(i).fill('1000'); }catch{} } } catch {}
await page.waitForTimeout(500);

// capture gold price hint on this page
const goldHint = await page.evaluate(()=>document.body.innerText.split('\n').map(s=>s.trim()).filter(s=>/Gramm|Preis|€\s?\d|Karat/i.test(s)));
console.log('GOLD/PRICE HINTS:', JSON.stringify([...new Set(goldHint)].slice(0,40)));

await page.locator('button:has-text("Weiter")').first().click().catch(()=>{});
await page.waitForTimeout(2000);

async function dump(label){
  const d = await page.evaluate(()=>({
    heads:[...document.querySelectorAll('h1,h2,h3,h4')].map(h=>h.innerText.trim()).filter(Boolean),
    buttons:[...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(Boolean),
    body: document.body.innerText,
  }));
  console.log(`\n===== ${label} =====`);
  console.log('HEADS:', JSON.stringify(d.heads));
  console.log('BUTTONS:', JSON.stringify(d.buttons));
  const key = d.body.split('\n').map(s=>s.trim()).filter(s=>/€|Nisab|2,5|Gesamt|fällig|beträgt|Vermögen|zakatpflichtig|Zakat/i.test(s));
  console.log('KEY:', JSON.stringify([...new Set(key)]));
  await page.screenshot({ path:`scrape/result-${label}.png`, fullPage:true });
}
await dump('result');

// If there's another Weiter/Berechnen, click to reach final
for (const lbl of ['Berechnen','Weiter','Ergebnis']) {
  const b = page.locator(`button:has-text("${lbl}")`).first();
  if (await b.count() && await b.isEnabled().catch(()=>false)) { await b.click().catch(()=>{}); await page.waitForTimeout(1500); await dump('final'); break; }
}

await browser.close();
console.log('\nDONE');
