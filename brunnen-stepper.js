/* brunnen-stepper.js — Human Relief Brunnenprojekte selector
 * Country (each = price for a whole well) × number of wells → one-time donation.
 * Opens /spendenformular?fb_item_id=<item>&amount_fix=<wells × price>&interval=0
 * (Whole well = fixed amount locked. A "share" goes to the general Brunnenfonds, free amount.)
 *
 * ── HOW TO UPDATE (for Human Relief) ──────────────────────────────────────
 * To change a price, add or remove a country: edit the C array below.
 *   { name: 'Tschad', price: 1000, id: '96560' }
 *   - name  = country label shown on the pill
 *   - price = cost of one whole well in that country (euros, plain number)
 *   - id    = the Fundraisingbox item id for that country's well
 *             (until per-country items exist, all use the Brunnenfonds 96560;
 *              replace each id with the real "Brunnen <Country>" item id later
 *              so the backoffice shows the exact country).
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Embed: <div data-brunnen-stepper data-accent="#317FC2" data-base="/spendenformular"></div>
 *        <script src="https://zakat-rechner.vercel.app/brunnen-stepper.js" defer></script>
 */
(function () {
  const C = [
    { name: 'Tschad', price: 1000, id: '97072' },
    { name: 'Kamerun', price: 1000, id: '97073' },
    { name: 'Burkina Faso', price: 1400, id: '97074' },
    { name: 'Malawi', price: 1100, id: '97075' },
    { name: 'Ghana', price: 1600, id: '97076' },
    { name: 'Togo', price: 1600, id: '97077' },
    // Each id = its own "Brunnen <Country>" FRB item, so the backoffice shows the
    // exact country. amount_fix (see href below) locks the amount. To add a well:
    // copy a line and set name / price / id.
  ];
  const FONDS = '96560'; // Brunnenfonds — partial / free amount

  const fmt = (n) => n.toLocaleString('de-DE');

  class BrunnenStepper extends HTMLElement {
    connectedCallback() {
      this.base = this.getAttribute('data-base') || '/spendenformular';
      this.accent = this.getAttribute('data-accent') || '#317FC2';
      this.s = { id: C[0].id, name: C[0].name, n: 1 };
      this.attachShadow({ mode: 'open' });
      this.render();
    }
    cur() { return C.find((x) => x.name === this.s.name); }
    total() { return this.cur().price * this.s.n; }
    // fb_item_id_fix LOCKS the project (donor can't switch the well on the form);
    // amount_fix LOCKS the amount; interval=0 = one-time (a well is not monthly).
    href() { return `${this.base}?fb_item_id_fix=${this.cur().id}&amount_fix=${this.total()}&interval=0`; }
    render() {
      const a = this.accent;
      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block;font-family:inherit;color:#15212B;-webkit-font-smoothing:antialiased}
          *{box-sizing:border-box}
          .box{background:#fff;border:1px solid #E6E8EC;border-radius:18px;padding:26px;max-width:560px;margin:0 auto;box-shadow:0 10px 34px rgba(20,33,43,.06)}
          .lbl{font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#8A929B;margin-bottom:10px}
          .pills{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap}
          .pill{flex:1;min-width:120px;border:1.5px solid #E0E4E9;background:#fff;border-radius:12px;padding:12px 8px;cursor:pointer;text-align:center;font-weight:700;font-size:15px;color:#15212B;transition:.15s}
          .pill small{display:block;font-weight:600;font-size:12px;color:#8A929B;margin-top:3px}
          .pill.on{border-color:${a};background:${a}0f;color:${a}}
          .pill.on small{color:${a}}
          .row{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:22px;gap:16px}
          .step{display:flex;align-items:center;border:1.5px solid #E0E4E9;border-radius:12px;overflow:hidden}
          .step button{width:44px;height:46px;border:0;background:#F4F6F8;font-size:24px;font-weight:700;color:#1F3B57;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center}
          .step button:disabled{color:#C9CFD5;cursor:not-allowed}
          .step .v{width:54px;text-align:center;font-size:20px;font-weight:800}
          .tot{text-align:right;white-space:nowrap}
          .tot b{font-size:32px;font-weight:800;color:${a};line-height:1}
          .tot span{display:block;font-size:13px;color:#8A929B;margin-top:4px}
          .go{display:block;width:100%;text-align:center;background:#1F3B57;color:#fff;font-weight:700;font-size:16px;text-decoration:none;padding:16px;border-radius:12px}
          .go:hover{background:#16304a}
          .meta{text-align:center;font-size:12.5px;line-height:1.7;color:#8A929B;margin-top:16px}
          .meta a{color:${a};font-weight:600;text-decoration:none}
        </style>
        <div class="box">
          <div class="lbl">Land w&auml;hlen</div>
          <div class="pills">${C.map((c) => `<div class="pill ${c.name === this.s.name ? 'on' : ''}" data-c="${c.name}">${c.name}<small>${fmt(c.price)} &euro; pro Brunnen</small></div>`).join('')}</div>
          <div class="row">
            <div>
              <div class="lbl" style="margin-bottom:8px">Anzahl Brunnen</div>
              <div class="step"><button data-d="-1" ${this.s.n <= 1 ? 'disabled' : ''} aria-label="weniger">&minus;</button><div class="v">${this.s.n}</div><button data-d="1" aria-label="mehr">+</button></div>
            </div>
            <div class="tot"><b>${fmt(this.total())} &euro;</b><span>${this.s.n} &times; ${fmt(this.cur().price)} &euro; &middot; einmalig</span></div>
          </div>
          <a class="go" href="${this.href()}" target="_top">Brunnen finanzieren</a>
          <div class="meta">Einmalige Spende &middot; steuerlich absetzbar<br>Lieber einen Anteil geben? <a href="${this.base}?fb_item_id_fix=${FONDS}">Zum Brunnenfonds</a></div>
        </div>`;
      this.shadowRoot.querySelectorAll('.pill').forEach((p) => (p.onclick = () => { this.s.name = p.dataset.c; this.render(); }));
      this.shadowRoot.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { this.s.n = Math.max(1, this.s.n + parseInt(b.dataset.d, 10)); this.render(); }));
    }
  }
  customElements.define('brunnen-stepper', BrunnenStepper);

  function mount() {
    document.querySelectorAll('[data-brunnen-stepper]').forEach((el) => {
      if (el.__bm) return; el.__bm = 1;
      const w = document.createElement('brunnen-stepper');
      ['data-base', 'data-accent'].forEach((a) => { if (el.hasAttribute(a)) w.setAttribute(a, el.getAttribute(a)); });
      el.appendChild(w);
    });
  }
  if (document.readyState !== 'loading') mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
