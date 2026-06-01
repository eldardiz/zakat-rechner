# Zakat-Rechner

Self-contained, multi-step Zakat calculator (German / EUR), built as a Web
Component with Shadow DOM so it can be dropped into any site — including Webflow
— without CSS conflicts. 1:1 replica of the MATW calculator flow.

## Flow (4 steps)
1. **Vermögen** – select asset categories (Bargeld, Gold & Silber, Krypto, Aktien, Sonstige/Immobilien)
2. **Beträge** – per-category amounts (cash sub-fields, gold/silver with karat + EUR/Gramm toggle + add-more rows, crypto, shares, business assets, real estate with residence-exemption note)
3. **Abzüge** – liabilities, subtracted from assets
4. **Ergebnis** – asset breakdown, Gesamtvermögen, Silber/Gold-Nisab toggle, Nettovermögen, above/below-Nisab badge, **2,5 % → Zu entrichtende Zakat**, "Zakat zahlen" CTA

## Embed in Webflow
Add an **HTML Embed** element where the calculator should appear:

```html
<div data-zakat-rechner
     data-gold-price="95.00"
     data-silver-price="2.10"
     data-accent="#0e7c66"
     data-donate-url="https://your-site.org/spenden?zweck=zakat"></div>
<script src="https://YOUR-VERCEL-DEPLOY.vercel.app/zakat-rechner.js" defer></script>
```

### Config attributes
| Attribute | Meaning | Default |
|---|---|---|
| `data-gold-price` | Gold price €/g (24k) — used for gram→€ conversion **and** the Gold-Nisab | `95.00` |
| `data-silver-price` | Silver price €/g (fine) — used for gram→€ conversion **and** the Silber-Nisab | `2.10` |
| `data-accent` | Brand accent color (match the client's site) | `#0e7c66` |
| `data-donate-url` | Where "Zakat zahlen" links (deep-link to the donation form / Zakat purpose) | `#` |

> **Keep the prices current.** Nisab is computed live from `data-gold-price`
> and `data-silver-price`. Update those two attributes in Webflow whenever the
> metal price moves materially. (A live price feed is a possible v2.)

## Fiqh constants (in `src/zakat-rechner.js`)
- Zakat rate: **2,5 %**
- Gold Nisab: **87,48 g** · Silver Nisab: **612,36 g**
- Gold purity factors (24/22/21/18/14k) and silver purity (999/925/900) for gram entry

## Local dev
```bash
python3 -m http.server 4178   # then open http://localhost:4178
node test.mjs                 # Playwright walk-through of every step + math checks
```

## Files
- `src/zakat-rechner.js` – the widget (this is what gets hosted/embedded)
- `index.html` – preview/test harness (mirrors the Webflow embed snippet)
- `test.mjs` – Playwright test suite (20 assertions)
- `scrape/` – reference-extraction scripts used to replicate MATW (not shipped)
