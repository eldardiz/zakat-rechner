/* paten-stepper.js — Human Relief Waisenpatenschaft selector
 * Country (Ägypten 25 € / Irak 45 € / Afrika 25 €) × number of children → monthly sponsorship.
 * Opens /spendenformular?fb_item_id=<item>&amount=<children × cost>&interval=1
 * (Direct to FRB form, NOT the one-time /spendenkorb cart — sponsorship is monthly.)
 * Embed: <div data-paten-stepper data-accent="#317FC2" data-base="/spendenformular"></div>
 *        <script src="https://zakat-rechner.vercel.app/paten-stepper.js" defer></script>
 */
(function () {
  const C = [
    { id: '88482', name: 'Ägypten', cost: 25 },
    { id: '88483', name: 'Irak', cost: 45 },
    { id: '88484', name: 'Afrika', cost: 25 },
  ];
  const FONDS = '88481';

  class PatenStepper extends HTMLElement {
    connectedCallback() {
      this.base = this.getAttribute('data-base') || '/spendenformular';
      this.accent = this.getAttribute('data-accent') || '#317FC2';
      this.s = { id: '88482', n: 1 };
      this.attachShadow({ mode: 'open' });
      this.render();
    }
    cur() { return C.find((x) => x.id === this.s.id); }
    total() { return this.cur().cost * this.s.n; }
    // fb_item_id_fix LOCKS the project (country, so the backoffice always shows the
    // right Waisenpatenschaft and the donor can't switch it); amount_fix + interval_fix
    // LOCK the Betrag and the monthly rhythm (donor already chose the number of children).
    href() { return `${this.base}?fb_item_id_fix=${this.s.id}&amount_fix=${this.total()}&interval_fix=1`; }
    render() {
      const a = this.accent;
      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block;font-family:inherit;color:#15212B;-webkit-font-smoothing:antialiased}
          *{box-sizing:border-box}
          .box{background:#fff;border:1px solid #E6E8EC;border-radius:18px;padding:26px;max-width:560px;margin:0 auto;box-shadow:0 10px 34px rgba(20,33,43,.06)}
          .lbl{font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#8A929B;margin-bottom:10px}
          .pills{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap}
          .pill{flex:1;min-width:96px;border:1.5px solid #E0E4E9;background:#fff;border-radius:12px;padding:12px 8px;cursor:pointer;text-align:center;font-weight:700;font-size:15px;color:#15212B;transition:.15s}
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
          <div class="pills">${C.map((c) => `<div class="pill ${c.id === this.s.id ? 'on' : ''}" data-c="${c.id}">${c.name}<small>${c.cost} &euro; / Kind</small></div>`).join('')}</div>
          <div class="row">
            <div>
              <div class="lbl" style="margin-bottom:8px">Anzahl Patenkinder</div>
              <div class="step"><button data-d="-1" ${this.s.n <= 1 ? 'disabled' : ''} aria-label="weniger">&minus;</button><div class="v">${this.s.n}</div><button data-d="1" aria-label="mehr">+</button></div>
            </div>
            <div class="tot"><b>${this.total()} &euro;</b><span>${this.s.n} &times; ${this.cur().cost} &euro; &middot; monatlich</span></div>
          </div>
          <a class="go" href="${this.href()}" target="_top">Patenschaft starten</a>
          <div class="meta">Monatlich und jederzeit k&uuml;ndbar &middot; steuerlich absetzbar<br>Lieber flexibel? <a href="${this.base}?fb_item_id_fix=${FONDS}">Zum Waisenfonds</a></div>
        </div>`;
      this.shadowRoot.querySelectorAll('.pill').forEach((p) => (p.onclick = () => { this.s.id = p.dataset.c; this.render(); }));
      this.shadowRoot.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { this.s.n = Math.max(1, this.s.n + parseInt(b.dataset.d, 10)); this.render(); }));
    }
  }
  customElements.define('paten-stepper', PatenStepper);

  function mount() {
    document.querySelectorAll('[data-paten-stepper]').forEach((el) => {
      if (el.__pm) return; el.__pm = 1;
      const w = document.createElement('paten-stepper');
      ['data-base', 'data-accent'].forEach((a) => { if (el.hasAttribute(a)) w.setAttribute(a, el.getAttribute(a)); });
      el.appendChild(w);
    });
  }
  if (document.readyState !== 'loading') mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
