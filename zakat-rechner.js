/* =============================================================================
 * Zakat-Rechner — self-contained Web Component (Shadow DOM)
 * Replica of the MATW multi-step calculator, German / EUR.
 *
 * Embed in Webflow (HTML Embed element):
 *   <div data-zakat-rechner
 *        data-gold-price="95.00"
 *        data-silver-price="2.10"
 *        data-donate-url="https://your-site.org/spenden?zweck=zakat"></div>
 *   <script src="https://your-deploy.vercel.app/zakat-rechner.js" defer></script>
 *
 * All amounts are EUR. Nisab is derived from the gram weights below times the
 * per-gram prices passed via attributes (so prices stay editable without code).
 * ========================================================================== */

(() => {
  'use strict';

  // --- Constants (fiqh) ---------------------------------------------------
  const ZAKAT_RATE = 0.025;            // 2.5 %
  const NISAB_GOLD_GRAMS = 87.48;      // 20 mithqal
  const NISAB_SILVER_GRAMS = 612.36;   // 200 dirham
  // Gold purity factors (relative to 24k) for gram entry
  const KARAT = { '24': 1, '22': 0.9167, '21': 0.875, '18': 0.75, '14': 0.5833 };
  const SILVER_PURITY = { '999': 0.999, '925': 0.925, '900': 0.9 };

  const fmtEUR = (n) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
      Number.isFinite(n) ? n : 0
    );
  const fmtEUR2 = (n) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      Number.isFinite(n) ? n : 0
    );
  const num = (v) => {
    if (v == null) return 0;
    const s = String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  const CATEGORIES = [
    { id: 'cash', label: 'Bargeld' },
    { id: 'metals', label: 'Gold & Silber' },
    { id: 'crypto', label: 'Krypto' },
    { id: 'shares', label: 'Aktien' },
    { id: 'trade', label: 'Sonstige Handelsposten (einschließlich Immobilien)' },
  ];

  class ZakatRechner extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.goldPrice = num(this.getAttribute('data-gold-price')) || 95.0;     // €/g 24k
      this.silverPrice = num(this.getAttribute('data-silver-price')) || 2.10; // €/g pure
      this.donateUrl = this.getAttribute('data-donate-url') || '#';
      this.accent = this.getAttribute('data-accent') || '#0e7c66';
      this.state = this.initialState();
    }

    initialState() {
      return {
        step: 1,
        selected: { cash: true, metals: false, crypto: false, shares: false, trade: false },
        cash: { hand: '', bank: '', business: '', dividends: '', owed: '' },
        gold: [{ karat: '24', value: '', unit: 'EUR' }],
        silver: [{ purity: '999', value: '', unit: 'EUR' }],
        crypto: { value: '' },
        shares: { resale: '', other: '' },
        biz: { goods: '', stock: '' },
        realestate: { sells: false, value: '' },
        liabilities: { debts: '', expenses: '' },
        nisabBasis: 'silver',
      };
    }

    reset() { this.state = this.initialState(); this.render(); this.scrollTop(); }

    connectedCallback() { this.render(); }

    // --- Calculations -----------------------------------------------------
    goldValue() {
      return this.state.gold.reduce((sum, r) => {
        if (r.unit === 'EUR') return sum + num(r.value);
        return sum + num(r.value) * (KARAT[r.karat] ?? 1) * this.goldPrice;
      }, 0);
    }
    silverValue() {
      return this.state.silver.reduce((sum, r) => {
        if (r.unit === 'EUR') return sum + num(r.value);
        return sum + num(r.value) * (SILVER_PURITY[r.purity] ?? 1) * this.silverPrice;
      }, 0);
    }
    assetBreakdown() {
      const s = this.state;
      const cash = s.selected.cash
        ? num(s.cash.hand) + num(s.cash.bank) + num(s.cash.business) + num(s.cash.dividends) + num(s.cash.owed)
        : 0;
      const metals = s.selected.metals ? this.goldValue() + this.silverValue() : 0;
      const crypto = s.selected.crypto ? num(s.crypto.value) : 0;
      const shares = s.selected.shares ? num(s.shares.resale) + num(s.shares.other) : 0;
      const trade = s.selected.trade
        ? num(s.biz.goods) + num(s.biz.stock) + (s.realestate.sells ? num(s.realestate.value) : 0)
        : 0;
      return { cash, metals, crypto, shares, trade };
    }
    totals() {
      const b = this.assetBreakdown();
      const totalAssets = b.cash + b.metals + b.crypto + b.shares + b.trade;
      const liabilities = num(this.state.liabilities.debts) + num(this.state.liabilities.expenses);
      const net = Math.max(0, totalAssets - liabilities);
      const nisab =
        this.state.nisabBasis === 'silver'
          ? NISAB_SILVER_GRAMS * this.silverPrice
          : NISAB_GOLD_GRAMS * this.goldPrice;
      const above = net >= nisab;
      const zakat = above ? net * ZAKAT_RATE : 0;
      return { ...b, totalAssets, liabilities, net, nisab, above, zakat };
    }

    // --- Navigation -------------------------------------------------------
    canProceedStep2() {
      const b = this.assetBreakdown();
      return b.cash + b.metals + b.crypto + b.shares + b.trade > 0;
    }
    go(step) { this.state.step = step; this.render(); this.scrollTop(); }
    scrollTop() {
      const card = this.shadowRoot.querySelector('.card');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // --- Render -----------------------------------------------------------
    render() {
      const st = this.state.step;
      this.shadowRoot.innerHTML = `
        <style>${this.css()}</style>
        <div class="zk" part="root">
          <div class="card">
            ${this.stepHeader()}
            <div class="body">
              ${st === 1 ? this.viewSelect() : ''}
              ${st === 2 ? this.viewAmounts() : ''}
              ${st === 3 ? this.viewLiabilities() : ''}
              ${st === 4 ? this.viewResult() : ''}
            </div>
          </div>
        </div>`;
      this.bind();
    }

    stepHeader() {
      const labels = ['Vermögen', 'Beträge', 'Abzüge', 'Ergebnis'];
      return `
        <div class="head">
          <h2 class="title">Berechnen Sie Ihre Zakat</h2>
          <div class="steps">
            ${labels
              .map(
                (l, i) =>
                  `<div class="pip ${this.state.step === i + 1 ? 'active' : ''} ${
                    this.state.step > i + 1 ? 'done' : ''
                  }"><span>${i + 1}</span><em>${l}</em></div>`
              )
              .join('')}
          </div>
        </div>`;
    }

    // STEP 1
    viewSelect() {
      return `
        <h3 class="sub">Was ich besitze</h3>
        <p class="muted">Wählen Sie aus, welche Vermögenswerte auf Sie zutreffen.</p>
        <div class="cats">
          ${CATEGORIES.map(
            (c) => `
            <label class="cat ${this.state.selected[c.id] ? 'on' : ''}">
              <input type="checkbox" data-cat="${c.id}" ${this.state.selected[c.id] ? 'checked' : ''}/>
              <span class="box"></span>
              <span class="lbl">${c.label}</span>
            </label>`
          ).join('')}
        </div>
        <div class="nav">
          <button class="btn primary" data-next="2">Weiter</button>
        </div>`;
    }

    field(label, path, hint = '') {
      const v = this.getPath(path);
      return `
        <div class="f">
          <label>${label}${hint ? `<span class="i" title="${hint}">i</span>` : ''}</label>
          <div class="in"><span class="cur">€</span><input type="text" inputmode="decimal" placeholder="0,00" value="${v}" data-path="${path}"/></div>
        </div>`;
    }

    // STEP 2
    viewAmounts() {
      const s = this.state.selected;
      let html = `<p class="muted">Geben Sie die Werte ein, die auf Sie zutreffen. Felder, die nicht zutreffen, lassen Sie leer.</p>`;

      if (s.cash) {
        html += `<section class="grp"><h4>Mein Bargeld</h4>
          ${this.field('Kassenbestand', 'cash.hand')}
          ${this.field('Bankguthaben', 'cash.bank')}
          ${this.field('In Unternehmen gebundenes Kapital', 'cash.business')}
          ${this.field('Dividenden / Erträge aus Kapitalanlagen', 'cash.dividends')}
          ${this.field('Geld, das mir zusteht (Forderungen)', 'cash.owed')}
        </section>`;
      }

      if (s.metals) {
        html += `<section class="grp"><h4>Mein Gold & Silber</h4>
          <div class="rows" data-metal="gold">
            <div class="rowlbl">Gold ${this.metalLivePrice('gold')}</div>
            ${this.state.gold.map((r, i) => this.metalRow('gold', r, i)).join('')}
            <button class="link" data-add="gold">+ Mehr Gold hinzufügen</button>
          </div>
          <div class="rows" data-metal="silver">
            <div class="rowlbl">Silber ${this.metalLivePrice('silver')}</div>
            ${this.state.silver.map((r, i) => this.metalRow('silver', r, i)).join('')}
            <button class="link" data-add="silver">+ Mehr Silber hinzufügen</button>
          </div>
        </section>`;
      }

      if (s.crypto) {
        html += `<section class="grp"><h4>Krypto</h4>
          ${this.field('Wert der Kryptowährung', 'crypto.value')}
        </section>`;
      }

      if (s.shares) {
        html += `<section class="grp"><h4>Aktien</h4>
          ${this.field('Aktien zum Wiederverkauf (Kapitalsteigerung)', 'shares.resale')}
          ${this.field('Aktien aus anderen Gründen erworben', 'shares.other', 'Bei langfristig gehaltenen Aktien ist nur der zakatpflichtige Anteil anzusetzen.')}
        </section>`;
      }

      if (s.trade) {
        html += `<section class="grp"><h4>Betriebsvermögen</h4>
          ${this.field('Handelswaren', 'biz.goods')}
          ${this.field('Lagerbestand', 'biz.stock')}
        </section>
        <section class="grp"><h4>Immobilien, die mir gehören</h4>
          <div class="note">Auf die Wohnung, in der Sie wohnen, fällt keine Zakat an. Geben Sie nur Immobilien an, die Sie verkaufen möchten; die Zakat beträgt 2,5 % ihres Marktwerts nach Ablauf eines Mondjahres.</div>
          <div class="seg small">
            <button class="seg-btn ${this.state.realestate.sells ? 'active' : ''}" data-re="1">Ich kaufe und verkaufe Immobilien</button>
            <button class="seg-btn ${!this.state.realestate.sells ? 'active' : ''}" data-re="0">Nein</button>
          </div>
          ${this.state.realestate.sells ? this.field('Gesamtmarktwert dieser Immobilien', 'realestate.value') : ''}
        </section>`;
      }

      const ok = this.canProceedStep2();
      html += `
        ${!ok ? `<div class="warn">Bitte geben Sie mindestens einen Vermögenswert ein, um fortzufahren.</div>` : ''}
        <div class="running">Gesamtvermögen: <strong>${fmtEUR(this.totals().totalAssets)}</strong></div>
        <div class="nav">
          <button class="btn ghost" data-next="1">Zurück</button>
          <button class="btn primary" data-next="3" ${ok ? '' : 'disabled'}>Weiter</button>
        </div>`;
      return html;
    }

    metalLivePrice(metal) {
      const p = metal === 'gold' ? this.goldPrice : this.silverPrice;
      const k = metal === 'gold' ? '24 Karat' : 'fein';
      return `<span class="price">(${fmtEUR2(p)}/g · ${k})</span>`;
    }

    metalRow(metal, r, i) {
      const purities = metal === 'gold' ? Object.keys(KARAT) : Object.keys(SILVER_PURITY);
      const sel = metal === 'gold' ? r.karat : r.purity;
      const unitField = metal === 'gold' ? 'karat' : 'purity';
      return `
        <div class="metalrow" data-metal="${metal}" data-i="${i}">
          <select class="pur" data-mfield="${unitField}">
            ${purities.map((p) => `<option value="${p}" ${p === sel ? 'selected' : ''}>${p}${metal === 'gold' ? 'k' : ''}</option>`).join('')}
          </select>
          <div class="in grow"><span class="cur">${r.unit === 'EUR' ? '€' : 'g'}</span><input type="text" inputmode="decimal" placeholder="0,00" value="${r.value}" data-mfield="value"/></div>
          <div class="seg unit">
            <button class="seg-btn ${r.unit === 'EUR' ? 'active' : ''}" data-unit="EUR">EUR</button>
            <button class="seg-btn ${r.unit === 'Gramm' ? 'active' : ''}" data-unit="Gramm">Gramm</button>
          </div>
          ${i > 0 ? `<button class="rm" data-rm title="Entfernen">×</button>` : ''}
        </div>`;
    }

    // STEP 3
    viewLiabilities() {
      return `
        <h3 class="sub">Verbindlichkeiten</h3>
        <p class="muted">Geben Sie Ihre Verbindlichkeiten und sonstigen fälligen Ausgaben an. Diese werden von Ihrem Vermögen abgezogen.</p>
        <section class="grp">
          ${this.field('Schulden / fällige Zahlungen', 'liabilities.debts')}
          ${this.field('Sonstige fällige Ausgaben', 'liabilities.expenses')}
        </section>
        <div class="running">Gesamtvermögen: <strong>${fmtEUR(this.totals().totalAssets)}</strong></div>
        <div class="nav">
          <button class="btn ghost" data-next="2">Zurück</button>
          <button class="btn primary" data-next="4">Berechnen</button>
        </div>`;
    }

    // STEP 4
    viewResult() {
      const t = this.totals();
      const rows = [
        ['Bargeld', t.cash, this.state.selected.cash],
        ['Gold & Silber', t.metals, this.state.selected.metals],
        ['Krypto', t.crypto, this.state.selected.crypto],
        ['Aktien', t.shares, this.state.selected.shares],
        ['Betriebsvermögen / Immobilien', t.trade, this.state.selected.trade],
      ].filter((r) => r[2]);

      return `
        <h3 class="sub accent">Zusammenfassung</h3>
        <div class="summary">
          <div class="sgroup">
            <div class="slabel">Vermögenswerte</div>
            ${rows.map(([l, v]) => `<div class="srow"><span>${l}</span><b>${fmtEUR(v)}</b></div>`).join('')}
            <div class="srow total"><span>Gesamtvermögen</span><b>${fmtEUR(t.totalAssets)}</b></div>
          </div>

          <div class="sgroup">
            <div class="slabel">Verbindlichkeiten</div>
            <div class="srow"><span>Abzüge</span><b>${fmtEUR(t.liabilities)}</b></div>
          </div>

          <div class="seg nisab">
            <button class="seg-btn ${this.state.nisabBasis === 'silver' ? 'active' : ''}" data-nisab="silver">Silber-Nisab</button>
            <button class="seg-btn ${this.state.nisabBasis === 'gold' ? 'active' : ''}" data-nisab="gold">Gold-Nisab</button>
          </div>
          <div class="nisabline">
            ${this.state.nisabBasis === 'silver'
              ? `Silber (${NISAB_SILVER_GRAMS.toLocaleString('de-DE')} Gramm) ≅ ${fmtEUR2(t.nisab)}`
              : `Gold (${NISAB_GOLD_GRAMS.toLocaleString('de-DE')} Gramm) ≅ ${fmtEUR2(t.nisab)}`}
          </div>

          <div class="sgroup">
            <div class="slabel">Nettovermögen</div>
            <div class="srow"><span>Vermögenswerte − Verbindlichkeiten</span><b>${fmtEUR(t.net)}</b></div>
          </div>

          <div class="badge ${t.above ? 'ok' : 'below'}">
            ${t.above ? '✓ Über dem Nisab · Zakat fällig.' : 'Unter dem Nisab · keine Zakat fällig.'}
          </div>

          ${t.above
            ? `<div class="calc"><span>2,5 %</span><span class="x">×</span><span>${fmtEUR(t.net)}</span></div>
               <div class="due"><span>Zu entrichtende Zakat</span><b>${fmtEUR(t.zakat)}</b></div>
               <a class="btn primary big" href="${this.donateUrl}" ${this.donateUrl !== '#' ? 'target="_top"' : ''}>Zakat zahlen</a>`
            : `<div class="due muted2"><span>Zu entrichtende Zakat</span><b>${fmtEUR(0)}</b></div>`}
        </div>
        <div class="nav">
          <button class="btn ghost" data-next="3">Zurück</button>
          <button class="btn ghost" data-restart>Neu berechnen</button>
        </div>
        <p class="disclaimer">Diese Berechnung dient als Orientierung. Nisab-Werte beruhen auf den hinterlegten Edelmetallpreisen. Im Zweifel wenden Sie sich an einen Gelehrten.</p>`;
    }

    // --- Helpers ----------------------------------------------------------
    getPath(path) {
      return path.split('.').reduce((o, k) => (o ? o[k] : ''), this.state);
    }
    setPath(path, val) {
      const keys = path.split('.');
      const last = keys.pop();
      const obj = keys.reduce((o, k) => o[k], this.state);
      obj[last] = val;
    }

    // --- Events -----------------------------------------------------------
    bind() {
      const r = this.shadowRoot;

      r.querySelectorAll('[data-next]').forEach((b) =>
        b.addEventListener('click', () => {
          const target = parseInt(b.getAttribute('data-next'), 10);
          if (target === 3 && !this.canProceedStep2()) return;
          this.go(target);
        })
      );
      const restart = r.querySelector('[data-restart]');
      if (restart) restart.addEventListener('click', () => this.reset());

      r.querySelectorAll('input[data-cat]').forEach((c) =>
        c.addEventListener('change', () => {
          this.state.selected[c.getAttribute('data-cat')] = c.checked;
          c.closest('.cat').classList.toggle('on', c.checked);
        })
      );

      // generic amount fields (debounced re-render only for running totals)
      r.querySelectorAll('input[data-path]').forEach((inp) =>
        inp.addEventListener('input', () => {
          this.setPath(inp.getAttribute('data-path'), inp.value);
          this.updateRunning();
        })
      );

      // metal rows
      r.querySelectorAll('.metalrow').forEach((row) => {
        const metal = row.getAttribute('data-metal');
        const i = parseInt(row.getAttribute('data-i'), 10);
        const arr = metal === 'gold' ? this.state.gold : this.state.silver;
        row.querySelectorAll('[data-mfield]').forEach((el) => {
          const f = el.getAttribute('data-mfield');
          const ev = el.tagName === 'SELECT' ? 'change' : 'input';
          el.addEventListener(ev, () => {
            arr[i][f] = el.value;
            this.updateRunning();
          });
        });
        row.querySelectorAll('[data-unit]').forEach((u) =>
          u.addEventListener('click', () => {
            arr[i].unit = u.getAttribute('data-unit');
            this.render();
          })
        );
        const rm = row.querySelector('[data-rm]');
        if (rm) rm.addEventListener('click', () => { arr.splice(i, 1); this.render(); });
      });
      r.querySelectorAll('[data-add]').forEach((b) =>
        b.addEventListener('click', () => {
          const m = b.getAttribute('data-add');
          if (m === 'gold') this.state.gold.push({ karat: '24', value: '', unit: 'EUR' });
          else this.state.silver.push({ purity: '999', value: '', unit: 'EUR' });
          this.render();
        })
      );

      r.querySelectorAll('[data-re]').forEach((b) =>
        b.addEventListener('click', () => { this.state.realestate.sells = b.getAttribute('data-re') === '1'; this.render(); })
      );
      r.querySelectorAll('[data-nisab]').forEach((b) =>
        b.addEventListener('click', () => { this.state.nisabBasis = b.getAttribute('data-nisab'); this.render(); })
      );
    }

    updateRunning() {
      const t = this.totals();
      this.shadowRoot.querySelectorAll('.running strong').forEach((el) => (el.textContent = fmtEUR(t.totalAssets)));
      const warn = this.shadowRoot.querySelector('.warn');
      const nextBtn = this.shadowRoot.querySelector('[data-next="3"]');
      if (nextBtn) {
        const ok = this.canProceedStep2();
        nextBtn.disabled = !ok;
        if (warn) warn.style.display = ok ? 'none' : '';
      }
    }

    // --- Styles -----------------------------------------------------------
    css() {
      return `
      :host { all: initial; }
      * { box-sizing: border-box; }
      .zk {
        --accent: ${this.accent};
        --accent-d: color-mix(in srgb, var(--accent) 82%, black);
        --ink: #16241f; --muted: #6b7b75; --line: #e6ece9; --bg: #ffffff; --soft: #f4f8f6;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: var(--ink); line-height: 1.45; -webkit-font-smoothing: antialiased;
        display: block; width: 100%;
      }
      .card { background: var(--bg); border: 1px solid var(--line); border-radius: 16px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 10px 40px rgba(16,40,32,.06); }
      .head { padding: 22px 24px 16px; border-bottom: 1px solid var(--line); }
      .title { font-size: 20px; font-weight: 700; margin: 0 0 14px; text-align: center; letter-spacing: -.2px; }
      .steps { display: flex; gap: 6px; }
      .pip { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; color: var(--muted); font-size: 11px; }
      .pip span { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: var(--soft); color: var(--muted); font-weight: 600; font-size: 12px; border: 1px solid var(--line); }
      .pip em { font-style: normal; }
      .pip.active span { background: var(--accent); color: #fff; border-color: var(--accent); }
      .pip.active em { color: var(--ink); font-weight: 600; }
      .pip.done span { background: color-mix(in srgb, var(--accent) 18%, #fff); color: var(--accent-d); border-color: transparent; }
      .body { padding: 22px 24px 24px; }
      .sub { font-size: 16px; font-weight: 700; margin: 0 0 4px; }
      .sub.accent { color: var(--accent-d); }
      .muted { color: var(--muted); font-size: 13.5px; margin: 0 0 16px; }
      h4 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--accent-d); margin: 0 0 12px; }

      .cats { display: flex; flex-direction: column; gap: 10px; }
      .cat { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 1.5px solid var(--line); border-radius: 12px; cursor: pointer; transition: .15s; }
      .cat:hover { border-color: color-mix(in srgb, var(--accent) 40%, var(--line)); }
      .cat.on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 5%, #fff); }
      .cat input { position: absolute; opacity: 0; pointer-events: none; }
      .cat .box { width: 22px; height: 22px; border: 2px solid var(--line); border-radius: 6px; flex: 0 0 auto; display: grid; place-items: center; transition: .15s; }
      .cat.on .box { background: var(--accent); border-color: var(--accent); }
      .cat.on .box::after { content: "✓"; color: #fff; font-size: 13px; font-weight: 700; }
      .cat .lbl { font-size: 14.5px; font-weight: 500; }

      .grp { padding: 16px 0; border-top: 1px solid var(--line); }
      .grp:first-of-type { border-top: 0; padding-top: 0; }
      .f { margin-bottom: 12px; }
      .f > label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--ink); margin-bottom: 6px; }
      .i { width: 15px; height: 15px; border-radius: 50%; background: var(--soft); color: var(--muted); font-size: 10px; display: inline-grid; place-items: center; font-style: italic; cursor: help; }
      .in { display: flex; align-items: center; border: 1.5px solid var(--line); border-radius: 10px; overflow: hidden; transition: .15s; }
      .in:focus-within { border-color: var(--accent); }
      .in .cur { padding: 0 12px; color: var(--muted); font-size: 14px; background: var(--soft); align-self: stretch; display: grid; place-items: center; min-width: 40px; }
      .in input { border: 0; outline: 0; padding: 12px 14px; font-size: 15px; width: 100%; text-align: right; color: var(--ink); background: transparent; }
      .in.grow { flex: 1; }

      .rows { padding: 12px 0; }
      .rowlbl { font-size: 14px; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
      .price { color: var(--muted); font-weight: 400; font-size: 12px; }
      .metalrow { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
      .pur { border: 1.5px solid var(--line); border-radius: 10px; padding: 11px 8px; font-size: 14px; background: #fff; color: var(--ink); }
      .seg { display: inline-flex; background: var(--soft); border-radius: 10px; padding: 3px; gap: 2px; }
      .seg.unit { flex: 0 0 auto; }
      .seg-btn { border: 0; background: transparent; padding: 8px 12px; border-radius: 8px; font-size: 13px; cursor: pointer; color: var(--muted); font-weight: 500; transition: .12s; white-space: nowrap; }
      .seg-btn.active { background: #fff; color: var(--accent-d); font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
      .seg.small, .seg.nisab { display: flex; margin: 8px 0; }
      .seg.small .seg-btn, .seg.nisab .seg-btn { flex: 1; }
      .rm { border: 0; background: var(--soft); color: var(--muted); width: 34px; height: 34px; border-radius: 8px; cursor: pointer; font-size: 18px; flex: 0 0 auto; }
      .rm:hover { background: #fdeaea; color: #c0392b; }
      .link { border: 0; background: transparent; color: var(--accent-d); font-size: 13px; font-weight: 600; cursor: pointer; padding: 4px 0; }
      .note { background: color-mix(in srgb, var(--accent) 7%, #fff); border: 1px solid color-mix(in srgb, var(--accent) 18%, #fff); color: var(--accent-d); font-size: 12.5px; padding: 11px 13px; border-radius: 10px; margin-bottom: 12px; line-height: 1.5; }

      .warn { background: #fff6e9; border: 1px solid #f3d9a8; color: #9a6700; font-size: 13px; padding: 11px 13px; border-radius: 10px; margin: 12px 0; }
      .running { font-size: 14px; color: var(--muted); margin-top: 16px; padding-top: 14px; border-top: 1px dashed var(--line); }
      .running strong { color: var(--ink); font-size: 16px; }

      .nav { display: flex; gap: 10px; margin-top: 20px; }
      .btn { border: 0; border-radius: 10px; padding: 13px 20px; font-size: 15px; font-weight: 600; cursor: pointer; transition: .15s; flex: 1; text-align: center; text-decoration: none; display: inline-block; }
      .btn.primary { background: var(--accent); color: #fff; }
      .btn.primary:hover { background: var(--accent-d); }
      .btn.primary:disabled { opacity: .45; cursor: not-allowed; }
      .btn.ghost { background: var(--soft); color: var(--ink); }
      .btn.ghost:hover { background: var(--line); }
      .btn.big { flex: 1; padding: 15px; font-size: 16px; margin-top: 6px; }

      .summary { display: flex; flex-direction: column; gap: 14px; }
      .sgroup { border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; }
      .slabel { color: var(--accent-d); font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 8px; }
      .srow { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; font-size: 14px; }
      .srow b { font-variant-numeric: tabular-nums; }
      .srow.total { border-top: 1px solid var(--line); margin-top: 6px; padding-top: 10px; font-weight: 700; }
      .nisabline { text-align: center; font-size: 14px; color: var(--ink); font-weight: 600; }
      .badge { text-align: center; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 600; }
      .badge.ok { background: color-mix(in srgb, var(--accent) 12%, #fff); color: var(--accent-d); }
      .badge.below { background: var(--soft); color: var(--muted); }
      .calc { display: flex; align-items: center; justify-content: center; gap: 14px; font-size: 15px; color: var(--muted); font-variant-numeric: tabular-nums; }
      .calc .x { color: var(--accent); }
      .due { display: flex; justify-content: space-between; align-items: center; background: color-mix(in srgb, var(--accent) 8%, #fff); border-radius: 12px; padding: 16px 18px; }
      .due span { font-weight: 600; font-size: 15px; }
      .due b { font-size: 26px; color: var(--accent-d); font-variant-numeric: tabular-nums; }
      .due.muted2 b { color: var(--muted); }
      .disclaimer { font-size: 11.5px; color: var(--muted); margin-top: 16px; line-height: 1.5; text-align: center; }

      @media (max-width: 480px) {
        .head, .body { padding-left: 16px; padding-right: 16px; }
        .pip em { display: none; }
        .metalrow { flex-wrap: wrap; }
        .seg.unit { order: 3; }
      }`;
    }
  }

  if (!customElements.get('zakat-rechner')) customElements.define('zakat-rechner', ZakatRechner);

  // Auto-mount: replace any [data-zakat-rechner] placeholder with the element,
  // copying through config attributes. Lets Webflow embed a simple <div>.
  const mount = () => {
    document.querySelectorAll('[data-zakat-rechner]').forEach((host) => {
      if (host.dataset.mounted) return;
      host.dataset.mounted = '1';
      const el = document.createElement('zakat-rechner');
      ['data-gold-price', 'data-silver-price', 'data-donate-url', 'data-accent'].forEach((a) => {
        if (host.hasAttribute(a)) el.setAttribute(a, host.getAttribute(a));
      });
      host.appendChild(el);
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
