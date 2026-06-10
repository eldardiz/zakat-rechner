/* =============================================================================
 * Quick-Donate — self-contained Web Component (Shadow DOM)
 * Homepage donation picker for Human Relief. Builds a prefilled Fundraisingbox
 * link (purpose + interval + amount) via URL params. No FRB account needed.
 *
 * Embed in Webflow (HTML Embed element):
 *   <div data-quick-donate
 *        data-accent="#317FC2"
 *        data-base="/spendenformular"></div>
 *   <script src="https://your-deploy.vercel.app/quick-donate.js" defer></script>
 *
 * Donate link built: <base>?fb_item_id=<id>&interval=<1 if monthly>&amount=<X>
 * (interval + amount omitted when not applicable; if FRB ignores amount the
 *  link still works with the purpose preselected.)
 * ========================================================================== */

(() => {
  'use strict';

  // Active Fundraisingbox purposes (confirmed item ids). monthly:true => the
  // interval toggle defaults to monthly when this purpose is chosen.
  const PURPOSES = [
    { id: '88485', label: 'Wo Hilfe am dringendsten gebraucht wird' },
    { id: '88397', label: 'Nothilfe Gaza' },
    { id: '96560', label: 'Wasserbrunnen' },
    { id: '88482', label: 'Waisenpatenschaft', monthly: true },
    { id: '88474', label: 'Malawi-Waisenhauskomplex' },
    { id: '88470', label: 'Zakat' },
    { id: '88471', label: 'Sadaqa' },
  ];
  const PRESETS = [10, 25, 50, 100];

  const num = (v) => {
    if (v == null) return 0;
    const s = String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  class QuickDonate extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.accent = this.getAttribute('data-accent') || '#317FC2';
      this.base = this.getAttribute('data-base') || '/spendenformular';
      this.state = { interval: 0, amount: 50, custom: '', purpose: '88485' };
    }

    connectedCallback() { this.render(); }

    activeAmount() {
      const c = num(this.state.custom);
      return c > 0 ? c : (this.state.amount || 0);
    }

    href() {
      let url = `${this.base}?fb_item_id=${this.state.purpose}`;
      if (this.state.interval === 1) url += '&interval=1';
      const amt = this.activeAmount();
      if (amt > 0) url += `&amount=${(Math.round(amt * 100) / 100).toFixed(2)}`;
      return url;
    }

    render() {
      const s = this.state;
      this.shadowRoot.innerHTML = `
        <style>${this.css()}</style>
        <div class="qd" part="root">
          <div class="card">
            <div class="row seg-row">
              <div class="seg interval">
                <button class="seg-btn ${s.interval === 0 ? 'active' : ''}" data-int="0">Einmalig</button>
                <button class="seg-btn ${s.interval === 1 ? 'active' : ''}" data-int="1">Monatlich</button>
              </div>
            </div>

            <div class="amts">
              ${PRESETS.map(
                (a) => `<button class="amt ${!num(s.custom) && s.amount === a ? 'active' : ''}" data-amt="${a}">${a} &euro;</button>`
              ).join('')}
              <div class="free ${num(s.custom) ? 'active' : ''}">
                <input type="text" inputmode="decimal" placeholder="Freier Betrag" value="${s.custom}" data-custom aria-label="Freier Betrag in Euro"/>
                <span class="cur">&euro;</span>
              </div>
            </div>

            <label class="plabel" for="qd-purpose">Verwendungszweck</label>
            <div class="select">
              <select id="qd-purpose" data-purpose>
                ${PURPOSES.map(
                  (p) => `<option value="${p.id}" ${p.id === s.purpose ? 'selected' : ''}>${p.label}</option>`
                ).join('')}
              </select>
            </div>

            <a class="go" href="${this.href()}" target="_top" data-go>Jetzt sicher spenden</a>
            <p class="reassure">Sichere Zahlung &uuml;ber Fundraisingbox. Sie werden direkt zum Spendenformular weitergeleitet.</p>
          </div>
        </div>`;
      this.bind();
    }

    syncGo() {
      const a = this.shadowRoot.querySelector('[data-go]');
      if (a) a.setAttribute('href', this.href());
    }

    bind() {
      const r = this.shadowRoot;
      r.querySelectorAll('[data-int]').forEach((b) =>
        b.addEventListener('click', () => { this.state.interval = parseInt(b.getAttribute('data-int'), 10); this.render(); })
      );
      r.querySelectorAll('[data-amt]').forEach((b) =>
        b.addEventListener('click', () => { this.state.amount = parseInt(b.getAttribute('data-amt'), 10); this.state.custom = ''; this.render(); })
      );
      const cust = r.querySelector('[data-custom]');
      if (cust) cust.addEventListener('input', () => {
        this.state.custom = cust.value;
        r.querySelectorAll('.amt').forEach((b) => b.classList.toggle('active', !num(cust.value) && parseInt(b.getAttribute('data-amt'), 10) === this.state.amount));
        r.querySelector('.free').classList.toggle('active', !!num(cust.value));
        this.syncGo();
      });
      const sel = r.querySelector('[data-purpose]');
      if (sel) sel.addEventListener('change', () => {
        this.state.purpose = sel.value;
        const p = PURPOSES.find((x) => x.id === sel.value);
        if (p && p.monthly) this.state.interval = 1;
        this.render();
      });
    }

    css() {
      return `
      :host { all: initial; }
      * { box-sizing: border-box; }
      .qd {
        --accent: ${this.accent};
        --accent-d: color-mix(in srgb, var(--accent) 82%, black);
        --ink: #16232e; --muted: #6b7785; --line: #e5eaef; --soft: #f3f7fb; --bg: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: var(--ink); line-height: 1.45; -webkit-font-smoothing: antialiased; display: block; width: 100%;
      }
      .card { background: var(--bg); border: 1px solid var(--line); border-radius: 16px; max-width: 560px; margin: 0 auto; padding: 20px; box-shadow: 0 10px 40px rgba(16,40,60,.07); }
      .seg-row { display: flex; justify-content: center; margin-bottom: 16px; }
      .seg { display: inline-flex; background: var(--soft); border-radius: 12px; padding: 4px; gap: 3px; }
      .seg-btn { border: 0; background: transparent; padding: 10px 22px; border-radius: 9px; font-size: 14px; cursor: pointer; color: var(--muted); font-weight: 600; transition: .12s; }
      .seg-btn.active { background: #fff; color: var(--accent-d); box-shadow: 0 1px 3px rgba(0,0,0,.1); }
      .amts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px; }
      .amt { border: 1.5px solid var(--line); background: #fff; border-radius: 12px; padding: 14px; font-size: 16px; font-weight: 700; color: var(--ink); cursor: pointer; transition: .12s; }
      .amt:hover { border-color: color-mix(in srgb, var(--accent) 45%, var(--line)); }
      .amt.active { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 7%, #fff); color: var(--accent-d); }
      .free { grid-column: span 2; display: flex; align-items: center; border: 1.5px solid var(--line); border-radius: 12px; overflow: hidden; transition: .12s; }
      .free.active, .free:focus-within { border-color: var(--accent); }
      .free input { border: 0; outline: 0; padding: 14px; font-size: 15px; width: 100%; background: transparent; color: var(--ink); }
      .free .cur { padding: 0 16px; color: var(--muted); align-self: stretch; display: grid; place-items: center; background: var(--soft); }
      .plabel { display: block; font-size: 12.5px; color: var(--muted); margin: 0 0 6px 2px; font-weight: 600; }
      .select { position: relative; margin-bottom: 18px; }
      .select::after { content: ""; position: absolute; right: 16px; top: 50%; width: 8px; height: 8px; border-right: 2px solid var(--muted); border-bottom: 2px solid var(--muted); transform: translateY(-65%) rotate(45deg); pointer-events: none; }
      .select select { width: 100%; appearance: none; border: 1.5px solid var(--line); border-radius: 12px; padding: 14px 40px 14px 14px; font-size: 15px; background: #fff; color: var(--ink); cursor: pointer; }
      .select select:focus { outline: 0; border-color: var(--accent); }
      .go { display: block; text-align: center; text-decoration: none; background: var(--accent); color: #fff; border-radius: 12px; padding: 16px; font-size: 16.5px; font-weight: 700; transition: .15s; }
      .go:hover { background: var(--accent-d); }
      .reassure { font-size: 12px; color: var(--muted); text-align: center; margin: 12px 0 0; line-height: 1.5; }
      @media (max-width: 420px) { .seg-btn { padding: 10px 16px; } }`;
    }
  }

  if (!customElements.get('quick-donate')) customElements.define('quick-donate', QuickDonate);

  const mount = () => {
    document.querySelectorAll('[data-quick-donate]').forEach((host) => {
      if (host.dataset.mounted) return;
      host.dataset.mounted = '1';
      const el = document.createElement('quick-donate');
      ['data-accent', 'data-base'].forEach((a) => {
        if (host.hasAttribute(a)) el.setAttribute(a, host.getAttribute(a));
      });
      host.appendChild(el);
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
