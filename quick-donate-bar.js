/* =============================================================================
 * Quick-Donate BAR — horizontal site-wide donation banner (Shadow DOM web comp).
 * MATW-style: currency · amount presets + free input · purpose dropdown ·
 * payment-method trust icons · "Schnell spenden" → prefilled Fundraisingbox form.
 *
 * Embed (HTML Embed, ideally inside the Navbar so it shows on every page):
 *   <div data-quick-donate-bar
 *        data-accent="#317FC2"
 *        data-base="/spendenformular"></div>
 *   <script src="https://zakat-rechner.vercel.app/quick-donate-bar.js" defer></script>
 *
 * Donate link: <base>?fb_item_id=<id>&amount=<X>  (amount omitted if not set).
 * No Fundraisingbox account needed — pure prefill via URL params.
 *
 * MOBILE: if the embed sits inside a position:fixed/sticky ancestor (e.g. a
 * sticky navbar), the bar lifts itself OUT into normal flow on phones so it
 * scrolls away instead of staying pinned (like matwprojectde.org). Desktop
 * keeps it where it is.
 * ========================================================================== */

(() => {
  'use strict';

  // Active Fundraisingbox purposes (confirmed item ids). interval=1 purposes
  // append &interval=1 (monthly) automatically.
  const PURPOSES = [
    { id: '88485', label: 'Wo Hilfe am dringendsten gebraucht wird' },
    { id: '88397', label: 'Nothilfe Gaza' },
    { id: '96560', label: 'Wasserbrunnen' },
    { id: '88482', label: 'Waisenpatenschaft', interval: 1 },
    { id: '88474', label: 'Malawi-Waisenhauskomplex' },
    { id: '88470', label: 'Zakat' },
    { id: '88471', label: 'Sadaqa' },
  ];
  const PRESETS = [25, 50, 100, 250];

  const num = (v) => {
    if (v == null) return 0;
    const s = String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  // Compact payment-method marks (trust signal). Lightweight inline SVG/text.
  const PAY = `
    <span class="pay" title="Visa">VISA</span>
    <span class="pay mc" title="Mastercard"><i></i><i></i></span>
    <span class="pay pp" title="PayPal">PayPal</span>
    <img class="paylogo" title="Apple Pay" alt="Apple Pay" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDIxLjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgYmFzZVByb2ZpbGU9InRpbnkiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIgoJIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNTEyIDIxMC4yIiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHBhdGggaWQ9IlhNTElEXzM0XyIgZD0iTTkzLjYsMjcuMUM4Ny42LDM0LjIsNzgsMzkuOCw2OC40LDM5Yy0xLjItOS42LDMuNS0xOS44LDktMjYuMWM2LTcuMywxNi41LTEyLjUsMjUtMTIuOQoJQzEwMy40LDEwLDk5LjUsMTkuOCw5My42LDI3LjEgTTEwMi4zLDQwLjljLTEzLjktMC44LTI1LjgsNy45LTMyLjQsNy45Yy02LjcsMC0xNi44LTcuNS0yNy44LTcuM2MtMTQuMywwLjItMjcuNiw4LjMtMzQuOSwyMS4yCgljLTE1LDI1LjgtMy45LDY0LDEwLjYsODVjNy4xLDEwLjQsMTUuNiwyMS44LDI2LjgsMjEuNGMxMC42LTAuNCwxNC44LTYuOSwyNy42LTYuOWMxMi45LDAsMTYuNiw2LjksMjcuOCw2LjcKCWMxMS42LTAuMiwxOC45LTEwLjQsMjYtMjAuOGM4LjEtMTEuOCwxMS40LTIzLjMsMTEuNi0yMy45Yy0wLjItMC4yLTIyLjQtOC43LTIyLjYtMzQuM2MtMC4yLTIxLjQsMTcuNS0zMS42LDE4LjMtMzIuMgoJQzEyMy4zLDQyLjksMTA3LjcsNDEuMywxMDIuMyw0MC45IE0xODIuNiwxMS45djE1NS45aDI0LjJ2LTUzLjNoMzMuNWMzMC42LDAsNTIuMS0yMSw1Mi4xLTUxLjRjMC0zMC40LTIxLjEtNTEuMi01MS4zLTUxLjJIMTgyLjZ6CgkgTTIwNi44LDMyLjNoMjcuOWMyMSwwLDMzLDExLjIsMzMsMzAuOWMwLDE5LjctMTIsMzEtMzMuMSwzMWgtMjcuOFYzMi4zeiBNMzM2LjYsMTY5YzE1LjIsMCwyOS4zLTcuNywzNS43LTE5LjloMC41djE4LjdoMjIuNFY5MC4yCgljMC0yMi41LTE4LTM3LTQ1LjctMzdjLTI1LjcsMC00NC43LDE0LjctNDUuNCwzNC45aDIxLjhjMS44LTkuNiwxMC43LTE1LjksMjIuOS0xNS45YzE0LjgsMCwyMy4xLDYuOSwyMy4xLDE5LjZ2OC42bC0zMC4yLDEuOAoJYy0yOC4xLDEuNy00My4zLDEzLjItNDMuMywzMy4yQzI5OC40LDE1NS42LDMxNC4xLDE2OSwzMzYuNiwxNjl6IE0zNDMuMSwxNTAuNWMtMTIuOSwwLTIxLjEtNi4yLTIxLjEtMTUuN2MwLTkuOCw3LjktMTUuNSwyMy0xNi40CglsMjYuOS0xLjd2OC44QzM3MS45LDE0MC4xLDM1OS41LDE1MC41LDM0My4xLDE1MC41eiBNNDI1LjEsMjEwLjJjMjMuNiwwLDM0LjctOSw0NC40LTM2LjNMNTEyLDU0LjdoLTI0LjZsLTI4LjUsOTIuMWgtMC41CglsLTI4LjUtOTIuMWgtMjUuM2w0MSwxMTMuNWwtMi4yLDYuOWMtMy43LDExLjctOS43LDE2LjItMjAuNCwxNi4yYy0xLjksMC01LjYtMC4yLTcuMS0wLjR2MTguN0M0MTcuMywyMTAsNDIzLjMsMjEwLjIsNDI1LjEsMjEwLjJ6CgkiLz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPC9zdmc+Cg=="/>
    <img class="paylogo" title="Google Pay" alt="Google Pay" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCA4MCAzOC4xIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA4MCAzOC4xOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+Cgkuc3Qwe2ZpbGw6IzVGNjM2ODt9Cgkuc3Qxe2ZpbGw6IzQyODVGNDt9Cgkuc3Qye2ZpbGw6IzM0QTg1Mzt9Cgkuc3Qze2ZpbGw6I0ZCQkMwNDt9Cgkuc3Q0e2ZpbGw6I0VBNDMzNTt9Cjwvc3R5bGU+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0zNy44LDE5LjdWMjloLTNWNmg3LjhjMS45LDAsMy43LDAuNyw1LjEsMmMxLjQsMS4yLDIuMSwzLDIuMSw0LjljMCwxLjktMC43LDMuNi0yLjEsNC45Yy0xLjQsMS4zLTMuMSwyLTUuMSwyCglMMzcuOCwxOS43TDM3LjgsMTkuN3ogTTM3LjgsOC44djhoNWMxLjEsMCwyLjItMC40LDIuOS0xLjJjMS42LTEuNSwxLjYtNCwwLjEtNS41YzAsMC0wLjEtMC4xLTAuMS0wLjFjLTAuOC0wLjgtMS44LTEuMy0yLjktMS4yCglMMzcuOCw4LjhMMzcuOCw4Ljh6Ii8+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik01Ni43LDEyLjhjMi4yLDAsMy45LDAuNiw1LjIsMS44czEuOSwyLjgsMS45LDQuOFYyOUg2MXYtMi4yaC0wLjFjLTEuMiwxLjgtMi45LDIuNy00LjksMi43CgljLTEuNywwLTMuMi0wLjUtNC40LTEuNWMtMS4xLTEtMS44LTIuNC0xLjgtMy45YzAtMS42LDAuNi0yLjksMS44LTMuOWMxLjItMSwyLjktMS40LDQuOS0xLjRjMS44LDAsMy4yLDAuMyw0LjMsMXYtMC43CgljMC0xLTAuNC0yLTEuMi0yLjZjLTAuOC0wLjctMS44LTEuMS0yLjktMS4xYy0xLjcsMC0zLDAuNy0zLjksMi4xbC0yLjYtMS42QzUxLjgsMTMuOCw1My45LDEyLjgsNTYuNywxMi44eiBNNTIuOSwyNC4yCgljMCwwLjgsMC40LDEuNSwxLDEuOWMwLjcsMC41LDEuNSwwLjgsMi4zLDAuOGMxLjIsMCwyLjQtMC41LDMuMy0xLjRjMS0wLjksMS41LTIsMS41LTMuMmMtMC45LTAuNy0yLjItMS4xLTMuOS0xLjEKCWMtMS4yLDAtMi4yLDAuMy0zLDAuOUM1My4zLDIyLjYsNTIuOSwyMy4zLDUyLjksMjQuMnoiLz4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTgwLDEzLjNsLTkuOSwyMi43aC0zbDMuNy03LjlsLTYuNS0xNC43aDMuMmw0LjcsMTEuM2gwLjFsNC42LTExLjNIODB6Ii8+CjxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0yNS45LDE3LjdjMC0wLjktMC4xLTEuOC0wLjItMi43SDEzLjJ2NS4xaDcuMWMtMC4zLDEuNi0xLjIsMy4xLTIuNiw0djMuM0gyMkMyNC41LDI1LjEsMjUuOSwyMS43LDI1LjksMTcuN3oiCgkvPgo8cGF0aCBjbGFzcz0ic3QyIiBkPSJNMTMuMiwzMC42YzMuNiwwLDYuNi0xLjIsOC44LTMuMmwtNC4zLTMuM2MtMS4yLDAuOC0yLjcsMS4zLTQuNSwxLjNjLTMuNCwwLTYuNC0yLjMtNy40LTUuNUgxLjR2My40CglDMy43LDI3LjgsOC4yLDMwLjYsMTMuMiwzMC42eiIvPgo8cGF0aCBjbGFzcz0ic3QzIiBkPSJNNS44LDE5LjljLTAuNi0xLjYtMC42LTMuNCwwLTUuMXYtMy40SDEuNGMtMS45LDMuNy0xLjksOC4xLDAsMTEuOUw1LjgsMTkuOXoiLz4KPHBhdGggY2xhc3M9InN0NCIgZD0iTTEzLjIsOS40YzEuOSwwLDMuNywwLjcsNS4xLDJsMCwwbDMuOC0zLjhjLTIuNC0yLjItNS42LTMuNS04LjgtMy40Yy01LDAtOS42LDIuOC0xMS44LDcuM2w0LjQsMy40CglDNi44LDExLjcsOS44LDkuNCwxMy4yLDkuNHoiLz4KPC9zdmc+Cg=="/>`;

  class QuickDonateBar extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.accent = this.getAttribute('data-accent') || '#317FC2';
      this.base = this.getAttribute('data-base') || '/spendenformular';
      this.state = { amount: 50, custom: '', purpose: '88485', interval: 0 };
    }

    connectedCallback() { this.render(); }

    activeAmount() {
      const c = num(this.state.custom);
      return c > 0 ? c : (this.state.amount || 0);
    }

    href() {
      let url = `${this.base}?fb_item_id=${this.state.purpose}&interval=${this.state.interval}`;
      const amt = this.activeAmount();
      if (amt > 0) url += `&amount=${(Math.round(amt * 100) / 100).toFixed(2)}`;
      return url;
    }

    render() {
      const s = this.state;
      this.shadowRoot.innerHTML = `
        <style>${this.css()}</style>
        <div class="bar" part="root">
          <div class="inner">
            <div class="rhythm">
              <button class="rb ${s.interval === 0 ? 'on' : ''}" data-int="0">Einmalig</button>
              <button class="rb ${s.interval === 1 ? 'on' : ''}" data-int="1">Monatlich</button>
            </div>
            <div class="cur"><span class="flag">&#127466;&#127482;</span> EUR</div>
            <div class="free">
              <input type="text" inputmode="decimal" placeholder="Betrag" value="${s.custom}" data-custom aria-label="Freier Betrag in Euro"/>
              <span class="cuk">&euro;</span>
            </div>
            <div class="amts">
              ${PRESETS.map((a) => `<button class="amt ${!num(s.custom) && s.amount === a ? 'on' : ''}" data-amt="${a}">${a}&nbsp;&euro;</button>`).join('')}
            </div>
            <div class="select">
              <select data-purpose aria-label="Verwendungszweck">
                ${PURPOSES.map((p) => `<option value="${p.id}" ${p.id === s.purpose ? 'selected' : ''}>${p.label}</option>`).join('')}
              </select>
            </div>
            <div class="pays">${PAY}</div>
            <a class="go" href="${this.href()}" target="_top" data-go>Schnell&nbsp;spenden</a>
          </div>
        </div>`;
      this.bind();
    }

    syncGo() { const a = this.shadowRoot.querySelector('[data-go]'); if (a) a.setAttribute('href', this.href()); }

    bind() {
      const r = this.shadowRoot;
      r.querySelectorAll('[data-amt]').forEach((b) =>
        b.addEventListener('click', () => { this.state.amount = parseInt(b.getAttribute('data-amt'), 10); this.state.custom = ''; this.render(); }));
      const cust = r.querySelector('[data-custom]');
      if (cust) cust.addEventListener('input', () => {
        this.state.custom = cust.value;
        r.querySelectorAll('.amt').forEach((b) => b.classList.toggle('on', !num(cust.value) && parseInt(b.getAttribute('data-amt'), 10) === this.state.amount));
        this.syncGo();
      });
      r.querySelectorAll('[data-int]').forEach((b) =>
        b.addEventListener('click', () => { this.state.interval = parseInt(b.getAttribute('data-int'), 10); this.render(); }));
      const sel = r.querySelector('[data-purpose]');
      if (sel) sel.addEventListener('change', () => {
        this.state.purpose = sel.value;
        const p = PURPOSES.find((x) => x.id === sel.value);
        if (p && p.interval) { this.state.interval = 1; this.render(); } else { this.syncGo(); }
      });
    }

    css() {
      return `
      :host { all: initial; display: block; width: 100%; }
      * { box-sizing: border-box; }
      .bar {
        --accent: ${this.accent};
        --cta: #e23744; --cta-d: #c32c38;
        --ink: #16232e; --line: #d7e3ee; --soft: #eaf3fb;
        background: var(--soft);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: var(--ink); -webkit-font-smoothing: antialiased; width: 100%;
        border-bottom: 1px solid var(--line);
      }
      .inner { max-width: 1280px; margin: 0 auto; padding: 8px 14px; display: flex; align-items: center; gap: 7px; flex-wrap: wrap; justify-content: center; }
      .rhythm { display: inline-flex; background: #fff; border: 1.5px solid var(--line); border-radius: 8px; padding: 2px; }
      .rb { border: 0; background: transparent; border-radius: 6px; padding: 5px 9px; font-size: 11.5px; font-weight: 700; color: #6b7785; cursor: pointer; white-space: nowrap; transition: .12s; }
      .rb.on { background: var(--accent); color: #fff; }
      .cur { display: inline-flex; align-items: center; gap: 5px; background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 6px 9px; font-weight: 700; font-size: 11.5px; white-space: nowrap; }
      .flag { font-size: 12px; }
      .free { display: inline-flex; align-items: center; background: #fff; border: 1.5px solid var(--line); border-radius: 8px; overflow: hidden; }
      .free:focus-within { border-color: var(--accent); }
      .free input { border: 0; outline: 0; padding: 6px 6px 6px 9px; font-size: 11.5px; width: 68px; background: transparent; color: var(--ink); }
      .free .cuk { padding: 0 8px; color: #6b7785; align-self: stretch; display: grid; place-items: center; background: var(--soft); font-size: 11.5px; }
      .amts { display: inline-flex; gap: 5px; }
      .amt { border: 1.5px solid var(--line); background: #fff; border-radius: 8px; padding: 6px 10px; font-size: 11.5px; font-weight: 700; color: var(--ink); cursor: pointer; transition: .12s; white-space: nowrap; }
      .amt:hover { border-color: color-mix(in srgb, var(--accent) 45%, var(--line)); }
      .amt.on { border-color: var(--cta); background: color-mix(in srgb, var(--cta) 8%, #fff); color: var(--cta-d); }
      .select { position: relative; }
      .select::after { content: ""; position: absolute; right: 10px; top: 50%; width: 6px; height: 6px; border-right: 2px solid #6b7785; border-bottom: 2px solid #6b7785; transform: translateY(-65%) rotate(45deg); pointer-events: none; }
      .select select { appearance: none; border: 1.5px solid var(--line); border-radius: 8px; padding: 6px 26px 6px 9px; font-size: 11.5px; background: #fff; color: var(--ink); cursor: pointer; max-width: 175px; min-width: 135px; }
      .select select:focus { outline: 0; border-color: var(--accent); }
      .pays { display: inline-flex; align-items: center; gap: 5px; background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 5px 8px; }
      .pay { font-size: 9px; font-weight: 800; letter-spacing: .02em; color: #1a3a6b; line-height: 1; }
      .paylogo { height: 13px; width: auto; display: block; }
      .pay.pp { color: #003087; font-style: italic; }
      .pay.mc { display: inline-flex; }
      .pay.mc i { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
      .pay.mc i:first-child { background: #eb001b; }
      .pay.mc i:last-child { background: #f79e1b; margin-left: -4px; mix-blend-mode: multiply; }
      .go { display: inline-flex; align-items: center; text-align: center; text-decoration: none; background: var(--cta); color: #fff; border-radius: 8px; padding: 8px 15px; font-size: 11.5px; font-weight: 800; transition: .15s; white-space: nowrap; text-transform: uppercase; letter-spacing: .02em; }
      .go:hover { background: var(--cta-d); }
      @media (max-width: 700px) {
        .inner { gap: 6px; padding: 7px 10px; }
        .select select { min-width: 130px; }
        .pays { order: 9; }
        .go { flex: 1 1 100%; justify-content: center; padding: 10px; }
      }`;
    }
  }

  if (!customElements.get('quick-donate-bar')) customElements.define('quick-donate-bar', QuickDonateBar);

  /* --- Mobile un-stick: pull the bar out of a fixed/sticky ancestor on phones,
     so it scrolls away with the page instead of staying pinned. Returns true
     once it has resolved (found a fixed ancestor and wired up, or confirmed
     there is none). --- */
  const MOBILE_MQ = '(max-width: 767px)';
  function unstick(host) {
    let fixedAnc = null, n = host.parentElement;
    while (n && n !== document.body && n !== document.documentElement) {
      const pos = getComputedStyle(n).position;
      if (pos === 'fixed' || pos === 'sticky') { fixedAnc = n; break; }
      n = n.parentElement;
    }
    if (!fixedAnc) return false; // not pinned (yet) — caller may retry

    // Relocate the direct child of the fixed ancestor that holds the bar.
    let mover = host;
    while (mover.parentElement && mover.parentElement !== fixedAnc) mover = mover.parentElement;
    const origParent = mover.parentElement;
    const origNext = mover.nextSibling;

    const mq = window.matchMedia(MOBILE_MQ);
    const apply = () => {
      if (mq.matches) {
        if (mover.dataset.qdUnstuck === '1') return;
        fixedAnc.insertAdjacentElement('afterend', mover);      // into normal flow, right after the nav
        const h = Math.round(fixedAnc.getBoundingClientRect().height); // nav height now (bar removed)
        mover.style.marginTop = h + 'px';                       // sit just below the still-fixed nav
        mover.dataset.qdUnstuck = '1';
      } else if (mover.dataset.qdUnstuck === '1') {
        origParent.insertBefore(mover, origNext);               // restore inside the nav on desktop
        mover.style.marginTop = '';
        mover.dataset.qdUnstuck = '0';
      }
    };
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else if (mq.addListener) mq.addListener(apply);
    return true;
  }

  const mount = () => {
    document.querySelectorAll('[data-quick-donate-bar]').forEach((host) => {
      if (!host.dataset.mounted) {
        host.dataset.mounted = '1';
        const el = document.createElement('quick-donate-bar');
        ['data-accent', 'data-base'].forEach((a) => { if (host.hasAttribute(a)) el.setAttribute(a, host.getAttribute(a)); });
        host.appendChild(el);
      }
      // Try to un-stick now; the sticky nav may apply position later (CSS/JS),
      // so retry a few times before giving up.
      if (host.dataset.qdResolved === '1') return;
      let tries = 0;
      const attempt = () => {
        if (host.dataset.qdResolved === '1') return;
        if (unstick(host) || tries >= 6) { host.dataset.qdResolved = '1'; return; }
        tries += 1;
        setTimeout(attempt, 250 * tries);
      };
      attempt();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  window.addEventListener('load', mount);
})();
