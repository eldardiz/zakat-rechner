# Human Relief widgets — Zakat-Rechner + Schnell-Spenden

Two self-contained Web Components (Shadow DOM, no CSS conflicts) hosted from one
Vercel deploy and embedded into the Human Relief Webflow site via HTML Embed.

- `zakat-rechner.js` — multi-step Zakat calculator (German / EUR).
- `quick-donate.js` — homepage quick-donate picker (purpose + amount + once/monthly).

Both build a **Fundraisingbox** deep link via URL params, so they need no FRB
account or API key. Donation form base: `/spendenformular?fb_item_id=<id>`.

## Zakat-Rechner

4 steps: **Vermögen** (pick categories) → **Beträge** (cash, gold/silver with
karat + EUR/Gramm toggle, crypto, shares, business/real-estate) → **Abzüge**
(liabilities) → **Ergebnis** (breakdown, Silber/Gold-Nisab toggle, above/below
badge, 2,5 % → Zu entrichtende Zakat, "Zakat zahlen" CTA).

The "Zakat zahlen" button links to `data-donate-url` with the **calculated
amount appended** (`&amount=<zakat>`), so the donation form prefills. If
Fundraisingbox ignores the amount param the link still works (purpose only).

```html
<div data-zakat-rechner
     data-gold-price="95.00"
     data-silver-price="2.10"
     data-accent="#317FC2"
     data-donate-url="/spendenformular?fb_item_id=88470"></div>
<script src="https://YOUR-VERCEL-DEPLOY.vercel.app/zakat-rechner.js" defer></script>
```

| Attribute | Meaning | Default |
|---|---|---|
| `data-gold-price` | Gold €/g (24k) — gram→€ conversion **and** Gold-Nisab | `95.00` |
| `data-silver-price` | Silver €/g (fine) — gram→€ conversion **and** Silber-Nisab | `2.10` |
| `data-accent` | Brand accent (Human Relief blue) | `#0e7c66` |
| `data-donate-url` | Zakat donation deep link (FRB item 88470) | `#` |

> **Keep the prices current.** Nisab is computed live from `data-gold-price` and
> `data-silver-price`. Update those two attributes in the Webflow embed whenever
> the metal price moves materially (note the "Preise Stand <date>" on the page).

## Quick-Donate (Schnell-Spenden)

Once/monthly toggle · 10/25/50/100 € + free amount · purpose dropdown ·
"Jetzt sicher spenden". Builds `<base>?fb_item_id=<id>&interval=<1 if monthly>&amount=<X>`.

```html
<div data-quick-donate
     data-accent="#317FC2"
     data-base="/spendenformular"></div>
<script src="https://YOUR-VERCEL-DEPLOY.vercel.app/quick-donate.js" defer></script>
```

| Attribute | Meaning | Default |
|---|---|---|
| `data-accent` | Brand accent | `#317FC2` |
| `data-base` | Donation form base path | `/spendenformular` |

Active purposes (edit the `PURPOSES` array in `quick-donate.js`): 88485 Allgemeine,
88397 Gaza, 96560 Wasserbrunnen, 88482 Waisenpatenschaft (monthly), 88474 Malawi,
88470 Zakat, 88471 Sadaqa.

## Fiqh constants (`zakat-rechner.js`)
- Zakat rate **2,5 %** · Gold Nisab **87,48 g** · Silver Nisab **612,36 g**
- Gold purity 24/22/21/18/14k · silver 999/925/900 for gram entry.

## Local dev
```bash
python3 -m http.server 4178   # open http://localhost:4178 (both widgets)
node test.mjs                 # Playwright walk-through + math checks
```

## Files
- `zakat-rechner.js` — Zakat calculator widget (hosted/embedded)
- `quick-donate.js` — quick-donate widget (hosted/embedded)
- `index.html` — preview/test harness (both widgets, links to the live form)
- `vercel.json` — static host config (CORS + cache on `.js`)
- `test.mjs` — Playwright suite (20 assertions)
- `scrape/` — reference-extraction scripts (not shipped)
