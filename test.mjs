import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

mkdirSync('screenshots', { recursive: true });
const BASE = 'http://localhost:4178/';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`); } else { fail++; console.log(`  ✗ FAIL: ${m}`); } };

const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'de-DE', viewport: { width: 700, height: 1100 } });
// surface page errors
page.on('pageerror', (e) => { fail++; console.log('  ✗ PAGE ERROR:', e.message); });

const root = () => page.locator('zakat-rechner');
const sr = (sel) => root().locator(sel); // pierces shadow DOM automatically in Playwright

async function shot(name) { await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true }); }

await page.goto(BASE, { waitUntil: 'networkidle' });
await sr('.title').waitFor({ timeout: 10000 });

console.log('\n— Step 1: Kategorieauswahl —');
ok(await sr('.title').textContent() === 'Berechnen Sie Ihre Zakat', 'Titel sichtbar');
ok((await sr('.cat').count()) === 5, '5 Kategorie-Karten');
// select cash + metals + crypto + shares + trade
for (const label of ['Bargeld', 'Gold & Silber', 'Krypto', 'Aktien', 'Sonstige']) {
  const card = sr('.cat').filter({ hasText: label }).first();
  if (!(await card.locator('input').isChecked())) await card.click();
}
ok((await sr('.cat.on').count()) === 5, 'Alle 5 Kategorien aktiviert');
await shot('01-select');
await sr('button[data-next="2"]').click();

console.log('\n— Step 2: Beträge —');
await sr('h4', { hasText: 'Mein Bargeld' }).first().waitFor();
ok((await sr('.warn').count()) > 0, 'Warnung sichtbar, solange kein Betrag eingegeben');
ok(await sr('button[data-next="3"]').isDisabled(), 'Weiter ist deaktiviert ohne Beträge');

// Cash on hand 10.000
await sr('input[data-path="cash.hand"]').fill('10000');
// Gold: default row, EUR 10.000
const goldVal = sr('.metalrow[data-metal="gold"]').first().locator('input[data-mfield="value"]');
await goldVal.fill('10000');
ok(!(await sr('button[data-next="3"]').isDisabled()), 'Weiter aktiviert sobald Vermögen vorhanden');
let running = await sr('.running strong').first().textContent();
ok(running.includes('20.000'), `Laufende Summe = 20.000 € (ist: ${running})`);

// Gram conversion: switch gold row to Gramm, enter 100 g @ 24k => +9.500
await sr('.metalrow[data-metal="gold"]').first().locator('button[data-unit="Gramm"]').click();
await sr('.metalrow[data-metal="gold"]').first().locator('input[data-mfield="value"]').fill('100');
running = await sr('.running strong').first().textContent();
ok(running.includes('19.500'), `Gramm-Umrechnung 100g×95€ = 9.500 → Summe 19.500 € (ist: ${running})`);
// back to EUR 10.000 for a clean headline number
await sr('.metalrow[data-metal="gold"]').first().locator('button[data-unit="EUR"]').click();
await sr('.metalrow[data-metal="gold"]').first().locator('input[data-mfield="value"]').fill('10000');

// add-more gold row then remove it
await sr('button[data-add="gold"]').click();
ok((await sr('.metalrow[data-metal="gold"]').count()) === 2, '„Mehr Gold" fügt Zeile hinzu');
await sr('.metalrow[data-metal="gold"]').nth(1).locator('button[data-rm]').click();
ok((await sr('.metalrow[data-metal="gold"]').count()) === 1, 'Zeile entfernen funktioniert');

// real estate toggle reveals a field
await sr('button[data-re="1"]').click();
ok((await sr('input[data-path="realestate.value"]').count()) === 1, 'Immobilien-Feld erscheint bei „kaufe und verkaufe"');
await sr('button[data-re="0"]').click();
ok((await sr('input[data-path="realestate.value"]').count()) === 0, 'Immobilien-Feld verschwindet bei „Nein"');

await shot('02-amounts');
await sr('button[data-next="3"]').click();

console.log('\n— Step 3: Verbindlichkeiten —');
await sr('.sub', { hasText: 'Verbindlichkeiten' }).waitFor();
await sr('input[data-path="liabilities.debts"]').fill('0');
await shot('03-liabilities');
await sr('button[data-next="4"]').click();

console.log('\n— Step 4: Ergebnis —');
await sr('.sub', { hasText: 'Zusammenfassung' }).waitFor();
let totalText = await sr('.srow.total b').textContent();
ok(totalText.includes('20.000'), `Gesamtvermögen 20.000 € (ist: ${totalText})`);
let due = await sr('.due b').textContent();
ok(due.includes('500'), `Zu entrichtende Zakat = 500 € (2,5% von 20.000) (ist: ${due})`);
ok((await sr('.badge.ok').count()) === 1, 'Badge „Über dem Nisab" sichtbar');

// Nisab toggle: silver -> gold changes the nisab line value
const silverLine = await sr('.nisabline').textContent();
ok(/612,36 Gramm/.test(silverLine), `Silber-Nisab-Zeile zeigt 612,36 Gramm (ist: ${silverLine})`);
await sr('button[data-nisab="gold"]').click();
const goldLine = await sr('.nisabline').textContent();
ok(/87,48 Gramm/.test(goldLine), `Gold-Nisab-Zeile zeigt 87,48 Gramm (ist: ${goldLine})`);
await sr('button[data-nisab="silver"]').click();

// donate CTA present
ok((await sr('a.btn.primary.big').count()) === 1, '„Zakat zahlen"-Button vorhanden');
await shot('04-result-above');

console.log('\n— Below-Nisab Szenario —');
// restart, only tiny cash
await sr('button[data-restart]').click();
await sr('.cat').filter({ hasText: 'Bargeld' }).first().click(); // ensure cash on (was default on -> toggling? default cash true)
// make sure cash selected
const cashInput = sr('.cat').filter({ hasText: 'Bargeld' }).first().locator('input');
if (!(await cashInput.isChecked())) await sr('.cat').filter({ hasText: 'Bargeld' }).first().click();
await sr('button[data-next="2"]').click();
await sr('input[data-path="cash.hand"]').fill('100'); // 100 € < nisab
await sr('button[data-next="3"]').click();
await sr('button[data-next="4"]').click();
ok((await sr('.badge.below').count()) === 1, 'Badge „Unter dem Nisab" bei 100 €');
const dueLow = await sr('.due b').textContent();
ok(/0/.test(dueLow), `Keine Zakat fällig unter Nisab (ist: ${dueLow})`);
await shot('05-result-below');

console.log(`\n===== ${pass} passed, ${fail} failed =====`);
await browser.close();
process.exit(fail ? 1 : 0);
