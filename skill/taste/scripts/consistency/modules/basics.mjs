// consistency/modules/basics.mjs — the basics check module (moved from consistency.mjs)
export const basicsMod = (() => {
  // the professional basics every finished site has, whatever its look (2.5.1: what the 44-site test found missing):
  // it can be used by keyboard and screen reader, its forms say what went wrong, its head names it
  // when it is shared, and its words claim nothing the brief did not give.
  //   access     a11y-name (a link, button, tab or toggle with no accessible name), img-alt (a content picture with no alt,
  //              a role="img" with no label), field-label (a field without a label you can see: a placeholder or an
  //              aria-label alone is none), heading-order (a heading level skipped: FAIL in main, WARN in the header and
  //              footer), tabindex (a tabindex above 0), focus-ring (a stylesheet rule that removes the outline on focus and
  //              puts nothing in its place), menu-toggle (the phone menu button without aria-expanded, or one that never
  //              changes it), each FAIL; skip-link (no skip link as the first Tab stop, WARN)
  //   keyboard   at the first width the page is walked with the Tab key from its top through the first screen and past the
  //              main action: focus-visible (a focused control that shows no change, or one under 3:1 against its ground,
  //              or that cannot be seen at all, FAIL; a ring that fades in, WARN), focus-hidden (a focused control under
  //              the fixed header or bar: wholly FAIL, partly WARN)
  //   head       lang (no <html lang>, or not a language tag, FAIL; the words in another language than it names, WARN),
  //              page-meta (no <title>, or a title and description with the same words, FAIL; no description, WARN),
  //              share-meta (og:title, og:description, og:image, twitter:card, an icon or theme-color missing, WARN)
  //   claims     action-repeat (one action on three controls or more on one screen FAIL; twice on a desktop's first
  //              screen, the nav's and the hero's, WARN), map-link (a directions link or map search with no street in it, or
  //              a search for a town alone, FAIL), open-now (an open-now line beside hours marked data-assumed FAIL; beside
  //              hours nothing marks as given or assumed, WARN), assumed (every [data-assumed] fact, listed for the report,
  //              WARN), run-on (a heading whose grey second sentence follows the first with no stop: "Rooms and prices
  //              Breakfast included", FAIL)
  //   forms      form-fields (paste blocked FAIL; an email, name, phone or count field without its type, autocomplete or
  //              inputmode, a submit button disabled before anything is typed, or no status line, WARN), form-send (a thank-you
  //              line ready to show with nothing to send it to FAIL; a mailto: on .example, the stand-in the report lists,
  //              WARN)
  // Read on the walked tab: the page-wide reads and the Tab walk at the first width, action-repeat at every width,
  // menu-toggle at the first width under 1024 that shows the menu button. Drawn mocks (a UI fragment, a role="img" picture,
  // an aria-hidden part) are pictures and are left out, but a pause button on one is a control.
  const id = "basics";
  const phase = "width";
  const checks = [
    { id: "a11y-name", sev: "FAIL", what: "a link, button, tab, switch or other control with no accessible name" },
    {
      id: "img-alt",
      sev: "FAIL",
      what: 'a content picture with no alt (a decorative one takes alt=""), or a role="img" with no label',
    },
    {
      id: "field-label",
      sev: "FAIL",
      what: "a form field without a label you can see (a placeholder or an aria-label alone)",
    },
    {
      id: "heading-order",
      sev: "FAIL",
      what: "a heading level skipped (h2 to h4): FAIL in main, WARN in the header or footer",
    },
    { id: "tabindex", sev: "FAIL", what: "a tabindex above 0, which takes the element out of the reading order" },
    {
      id: "focus-ring",
      sev: "FAIL",
      what: "a stylesheet rule that removes the outline on focus and puts no change in its place",
    },
    {
      id: "focus-visible",
      sev: "FAIL",
      what: "a control reached with Tab that shows no change, under 3:1 against its ground, or cannot be seen (a ring that fades in WARNs)",
    },
    {
      id: "focus-hidden",
      sev: "FAIL",
      what: "a control reached with Tab hidden under the fixed header or bar (wholly FAIL, partly WARN)",
    },
    { id: "skip-link", sev: "WARN", what: "no skip link to the content as the first Tab stop" },
    {
      id: "menu-toggle",
      sev: "FAIL",
      what: "the phone menu button without aria-expanded, or one that never changes it when the menu opens",
    },
    {
      id: "lang",
      sev: "FAIL",
      what: "<html lang> missing or no language tag (FAIL); the page written in another language than it names (WARN)",
    },
    {
      id: "page-meta",
      sev: "FAIL",
      what: "no <title>, or a title and description with the same words (FAIL); no meta description (WARN)",
    },
    {
      id: "share-meta",
      sev: "WARN",
      what: "og:title, og:description, og:image, twitter:card, an icon or theme-color missing",
    },
    {
      id: "action-repeat",
      sev: "FAIL",
      what: "one action on three controls or more on one screen (FAIL); on two on a desktop first screen (WARN)",
    },
    {
      id: "map-link",
      sev: "FAIL",
      what: "a directions link or map search with no street in it, or a search for a whole town",
    },
    {
      id: "open-now",
      sev: "FAIL",
      what: "an open-now line read from hours marked data-assumed (FAIL), or from hours nothing marks as given (WARN)",
    },
    {
      id: "assumed",
      sev: "WARN",
      what: "the prices, hours, dates and places marked data-assumed: listed for the report",
    },
    {
      id: "run-on",
      sev: "FAIL",
      what: "a heading whose second sentence (its grey run-on) follows the first with no full stop",
    },
    {
      id: "form-fields",
      sev: "FAIL",
      what: "paste blocked in a field (FAIL); a field without its type, autocomplete or inputmode, a submit disabled at rest, no status line (WARN)",
    },
    {
      id: "form-send",
      sev: "FAIL",
      what: "a thank-you line ready with nothing to send the form to (FAIL); a mailto: stand-in on .example (WARN)",
    },
  ];
  const fixes = {
    "a11y-name": "give the control words: its text, or an aria-label in the page's language for an icon-only button",
    "img-alt":
      'write alt saying what the photograph shows (alt="" for a decorative one); a drawn picture with role="img" takes an aria-label',
    "field-label":
      "put a <label for> with the field's name above it (references/system.md, Forms); a placeholder is no label",
    "heading-order":
      "step down one level at a time (h1, h2, h3): change the tag, not the look; a footer's column heads are h3",
    tabindex: "remove the positive tabindex: the order of the markup is the order of the Tab key",
    "focus-ring":
      "keep the kit's :focus-visible ring, or put a change of the same strength (a 2px line in --action) in the rule that removes it",
    "focus-visible":
      "keep the kit's ring (system.css :focus-visible, 2px in --action, there at once); a control that hides itself shows on focus",
    "focus-hidden":
      "a focused control must stay in view: nothing fixed may cover it (the header is opaque and --nav tall; leave room under it)",
    "skip-link":
      'add the starter\'s skip link as the header\'s first child: <a class="skip-link" href="#top">Skip to content</a>',
    "menu-toggle":
      'use the starter\'s button: <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu">; system.js flips it',
    lang: 'set <html lang> to the language the page is written in, from the brief ("de" for a German page)',
    "page-meta":
      'write a <title> "Name: what it is for whom or where" and a one-sentence description in other words (starter.html)',
    "share-meta":
      "copy the head block of starter.html: og tags, twitter:card, the icon and theme-color (references/system.md, Head)",
    "action-repeat":
      "show the action once a screen besides the nav's button: the hero's, the close's or the phone bar's, never all at once",
    "map-link":
      'with a street from the brief, "Get directions" to its search; a district only: "See the area"; a town only: no map link',
    "open-now": "take the hours from the brief; assumed hours carry data-assumed and no open-now line (copy.md)",
    assumed: "list each assumed fact in the report for the client to confirm, or take it from the brief",
    "run-on":
      'end the heading\'s first sentence with a full stop before its grey second one ("Rooms and prices. Breakfast included.")',
    "form-fields":
      "give each field its type, autocomplete and inputmode, never block paste or disable the button before a submit, and add the status line (references/system.md, Forms)",
    "form-send":
      "send the form to the client's address (data-endpoint) and show the confirmation only after it answers; list a mailto stand-in in the report",
  };
  const summary = [
    "  access     a11y-name, img-alt, field-label, heading-order (FAIL in main, WARN in header and footer), tabindex, focus-ring,",
    "             menu-toggle (aria-expanded on the phone menu button, changed on a click), each FAIL; skip-link (WARN)",
    "  keyboard   focus-visible (a control reached with Tab that shows no change, under 3:1, or nothing you can see, FAIL; a",
    "             ring that fades in WARN), focus-hidden (under the fixed header or bar: wholly FAIL, partly WARN); first width",
    "  head       lang (missing or no tag FAIL, the text in another language WARN), page-meta (no title, or title = description",
    "             FAIL; no description WARN), share-meta (og:*, twitter:card, icon, theme-color, WARN)",
    "  claims     action-repeat (one action 3+ times on a screen FAIL, nav + hero on a desktop WARN), map-link (no street, or a",
    "             whole town, FAIL), open-now (from data-assumed hours FAIL), assumed (each data-assumed fact listed, WARN),",
    "             run-on (a heading's grey sentence with no stop before it, FAIL)",
    "  forms      form-fields (paste blocked FAIL; type, autocomplete, inputmode, a pre-disabled button, no status line WARN),",
    "             form-send (a thank-you with nothing to send to FAIL; a mailto: on .example, the stand-in, WARN)",
  ].join("\n");
  const flags = [];
  const quick = true;
  // the menu button is read once a run, at the first width that shows it
  let toggleDone = false;

  // ---------------------------------------------------------------- in the page: shared helpers, sent with every probe
  const LIB = String.raw`
  const DRAWN = '[data-ui], .ui[class*=ui-], [role="img"], [aria-hidden="true"], [inert], [data-diagram], .d-win, .d-chat, .ly-piece, .dw, .app-frame, .device, [data-ly-steps]';
  const PAUSE = '.loop-pause, .ui-pause, [data-pause]';
  const drawn = (el) => !!(el && el.closest && el.closest(DRAWN)) && !(el.matches && el.matches(PAUSE));
  const sel = (el) => {
    const parts = [];
    for (let e = el; e && e.nodeType === 1 && e !== document.body && e !== document.documentElement && parts.length < 4; e = e.parentElement) {
      const tag = e.tagName.toLowerCase();
      if (e.id && /^[A-Za-z][\w-]*$/.test(e.id)) { parts.unshift(tag + '#' + e.id); break; }
      const cls = [...e.classList].filter((c) => /^[A-Za-z_][\w-]*$/.test(c) && !/^(is|js|has)-/.test(c)).slice(0, 2);
      let s = tag + cls.map((c) => '.' + c).join('');
      const p = e.parentElement;
      if (p) { const same = [...p.children].filter((x) => x.tagName === e.tagName); if (same.length > 1) s += ':nth-of-type(' + (same.indexOf(e) + 1) + ')'; }
      parts.unshift(s);
    }
    return parts.join(' > ');
  };
  const doc = (el) => { const r = el.getBoundingClientRect(); return { left: Math.round(Math.max(0, r.left)), top: Math.round(r.top + scrollY), width: Math.round(Math.max(2, r.width)), height: Math.round(Math.max(2, r.height)) }; };
  const view = (el) => { const r = el.getBoundingClientRect(); return { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }; };
  const shown = (el) => { if (!el.getClientRects().length) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden'; };
  const squash = (t) => String(t || '').replace(/\s+/g, ' ').trim();
  // the accessible name, as a screen reader builds it for the common cases
  const nameOf = (el) => {
    const by = el.getAttribute('aria-labelledby');
    if (by) { const t = squash(by.split(/\s+/).map((i) => (document.getElementById(i) || {}).textContent || '').join(' ')); if (t) return t; }
    const al = squash(el.getAttribute('aria-label')); if (al) return al;
    if (el.matches('input[type=submit], input[type=button], input[type=reset]')) return squash(el.value) || (el.type === 'submit' ? 'Submit' : el.type === 'reset' ? 'Reset' : '');
    if (el.matches('input[type=image]')) return squash(el.alt);
    let t = '';
    // a control in a closed panel (visibility hidden until it opens) is named by its words all the same
    const shut = getComputedStyle(el).visibility === 'hidden';
    const walk = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) { t += c.textContent; continue; }
        if (c.nodeType !== 1 || c.getAttribute('aria-hidden') === 'true') continue;
        const cs = getComputedStyle(c); if (cs.display === 'none' || (!shut && cs.visibility === 'hidden')) continue;
        if (c.tagName === 'IMG') { t += ' ' + (c.getAttribute('alt') || ''); continue; }
        if (c.tagName.toLowerCase() === 'svg') { const tt = c.querySelector('title'); t += ' ' + (c.getAttribute('aria-label') || (tt && tt.textContent) || ''); continue; }
        const cl = c.getAttribute('aria-label'); if (cl) { t += ' ' + cl; continue; }
        walk(c); t += ' ';
      }
    };
    walk(el);
    return squash(t) || squash(el.getAttribute('title'));
  };
  // a colour as [r, g, b, a] (0-255, a 0-1), whatever the browser writes (rgb, oklab, color-mix results)
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => {
    if (!c || c === 'transparent') return [0, 0, 0, 0];
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255];
  };
  const over = (top, under) => { const a = top[3]; return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // the plain ground behind an element (null under a photograph or a gradient: not judged)
  const groundOf = (el) => {
    const layers = [];
    for (let e = el.parentElement; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const c = rgba(cs.backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= 0.99) break; }
    }
    let g = [255, 255, 255, 1]; for (const c of layers.reverse()) g = over(c, g); return g;
  };
`;

  // the page-wide reads, once at the first width
  function pageProbe() {
    /* LIB */
    const out = {
      names: [],
      alts: [],
      labels: [],
      heads: [],
      tabidx: [],
      rings: [],
      lang: null,
      meta: {},
      maps: [],
      openNow: [],
      assumed: [],
      runOn: [],
      forms: [],
    };
    // a11y-name
    const CTL =
      'a[href], button, [role=button], [role=link], [role=tab], [role=switch], [role=checkbox], [role=radio], [role=menuitem], [role=option], summary, [tabindex]:not([tabindex^="-"])';
    for (const el of document.querySelectorAll(CTL)) {
      if (el.matches("input, select, textarea, main, section, body") || drawn(el) || !el.getClientRects().length)
        continue;
      if (nameOf(el)) continue;
      out.names.push({
        sel: sel(el),
        what:
          el.tagName.toLowerCase()
          + (el.getAttribute("role") ? "[role=" + el.getAttribute("role") + "]" : "")
          + (el.getAttribute("href") ? " to " + el.getAttribute("href").slice(0, 40) : ""),
        doc: doc(el),
      });
    }
    // img-alt
    for (const el of document.querySelectorAll('img, [role="img"]')) {
      const ph = el.closest('[aria-hidden="true"], [inert]');
      if (ph) continue;
      const up = el.parentElement && el.parentElement.closest('[role="img"]');
      if (up) continue;
      if (el.tagName === "IMG") {
        if (el.closest("[data-ui], .ui[class*=ui-]")) continue;
        const r = el.getBoundingClientRect();
        if (r.width && r.width < 4 && r.height < 4) continue;
        if (!el.hasAttribute("alt"))
          out.alts.push({
            sev: "FAIL",
            sel: sel(el),
            src:
              /^data:/.test(el.getAttribute("src") || "") ? "a data: picture" : (
                (el.currentSrc || el.getAttribute("src") || "").split("/").pop().slice(0, 50)
              ),
            why: "has no alt",
            doc: doc(el),
          });
        else if (
          /\.(jpe?g|png|webp|avif|gif|svg)$/i.test(el.alt.trim())
          || /^(image|photo|picture|img|bild|foto)\s*\d*$/i.test(el.alt.trim())
        )
          out.alts.push({
            sev: "WARN",
            sel: sel(el),
            src: (el.getAttribute("src") || "").split("/").pop().slice(0, 50),
            why: 'has alt "' + el.alt.trim().slice(0, 40) + '", a file name or a bare word, not what it shows',
            doc: doc(el),
          });
      } else if (
        !squash(el.getAttribute("aria-label"))
        && !squash(el.getAttribute("aria-labelledby") && nameOf(el))
        && !el.querySelector(":scope > title")
        && el.getClientRects().length
      ) {
        out.alts.push({
          sev: "FAIL",
          sel: sel(el),
          src: "",
          why: 'is a role="img" picture with no aria-label',
          doc: doc(el),
        });
      }
    }
    // field-label
    for (const el of document.querySelectorAll("input, select, textarea")) {
      if (/^(hidden|submit|button|reset|image)$/.test(el.type) || drawn(el) || !el.getClientRects().length) continue;
      const vis = l => {
        const r = l.getBoundingClientRect();
        const cs = getComputedStyle(l);
        return (
          r.width > 2
          && r.height > 2
          && cs.visibility !== "hidden"
          && cs.clipPath !== "inset(50%)"
          && !/rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)/.test(cs.clip)
          && squash(l.textContent)
        );
      };
      const labs = [...(el.labels || [])];
      const by = (el.getAttribute("aria-labelledby") || "")
        .split(/\s+/)
        .filter(Boolean)
        .map(i => document.getElementById(i))
        .filter(Boolean);
      if (labs.some(vis) || by.some(vis)) continue;
      const why =
        labs.length ? "its <label> is hidden"
        : el.getAttribute("placeholder") ?
          'only a placeholder ("' + squash(el.getAttribute("placeholder")).slice(0, 30) + '") names it'
        : el.getAttribute("aria-label") ? "only an aria-label names it"
        : "nothing names it";
      out.labels.push({
        sel: sel(el),
        what: el.tagName.toLowerCase() + (el.type ? "[type=" + el.type + "]" : ""),
        why,
        doc: doc(el),
      });
    }
    // heading-order
    let prev = 0;
    for (const el of document.querySelectorAll("h1, h2, h3, h4, h5, h6, [role=heading][aria-level]")) {
      if (drawn(el) || !el.getClientRects().length) continue;
      const lv = el.matches("[role=heading]") ? +el.getAttribute("aria-level") : +el.tagName[1];
      if (prev && lv > prev + 1)
        out.heads.push({
          sev: el.closest("header, footer, [role=contentinfo], [role=banner]") && !el.closest("main") ? "WARN" : "FAIL",
          sel: sel(el),
          text: squash(el.textContent).slice(0, 50),
          from: prev,
          to: lv,
          doc: doc(el),
        });
      prev = lv;
    }
    // tabindex
    for (const el of document.querySelectorAll("[tabindex]")) {
      const n = parseInt(el.getAttribute("tabindex"), 10);
      if (n > 0 && !drawn(el)) out.tabidx.push({ sel: sel(el), n, doc: doc(el) });
    }
    // focus-ring: a rule on :focus or :focus-visible that removes the outline and sets nothing else that shows
    const seenR = new Set();
    const scan = (rules, href) => {
      for (const r of rules) {
        if (r.cssRules && !r.selectorText) {
          try {
            scan(r.cssRules, href);
          } catch (e) {
            /* none */
          }
          continue;
        }
        if (!r.selectorText || !/:focus/.test(r.selectorText) || !r.style) continue;
        const s = r.style,
          ow = s.getPropertyValue("outline-width"),
          os = s.getPropertyValue("outline-style"),
          o = s.getPropertyValue("outline");
        const off = /^(none|0|0px)$/.test(String(o).trim()) || os === "none" || /^0(px)?$/.test(ow);
        if (!off) continue;
        const rep = [
          "box-shadow",
          "border-color",
          "border-top-color",
          "border-bottom-color",
          "border-left-color",
          "border-width",
          "border-bottom-width",
          "background",
          "background-color",
          "text-decoration",
          "text-decoration-line",
          "color",
          "transform",
        ].some(p => s.getPropertyValue(p));
        if (rep || seenR.has(r.selectorText)) continue;
        seenR.add(r.selectorText);
        out.rings.push({ sel: r.selectorText.slice(0, 90), file: (href || "the page").split("/").pop() });
      }
    };
    for (const sh of document.styleSheets) {
      try {
        scan(sh.cssRules, sh.href);
      } catch (e) {
        /* another origin */
      }
    }
    // lang, and the language the words are in (stop words over the main text)
    const lang = document.documentElement.getAttribute("lang");
    const textOf = root => {
      let t = "";
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n && t.length < 20000; n = w.nextNode()) {
        const p = n.parentElement;
        if (!p || drawn(p) || p.closest("script, style, noscript, template, code, pre")) continue;
        t += " " + n.textContent;
      }
      return t;
    };
    const words =
      textOf(document.querySelector("main") || document.body)
        .toLowerCase()
        .match(/\p{L}+/gu) || [];
    const STOP = {
      en: "the and of to in for with is our your we you on at from are this that it by or",
      de: "der die das und mit für ist wir sie nicht auf zu im ein eine den dem von bei oder ihr uns auch",
      fr: "le la les et des du pour avec est nous vous une un dans sur au aux pas ce qui",
      es: "el la los las y de del para con es una un en por que su al nuestro",
      it: "il lo gli le e di del per con è una un nel che della dei sono",
      nl: "de het een en van voor met is wij op bij niet ons ook zijn naar",
      sv: "och att det som en ett för med är vi på av till inte har",
      da: "og at det som en et for med er vi på af til ikke har",
      pt: "o os as e de do da para com é uma um em por que no na",
    };
    const score = {};
    for (const [k, v] of Object.entries(STOP)) {
      const set = new Set(v.split(" "));
      score[k] = words.filter(w => set.has(w)).length;
    }
    out.lang = { lang, words: words.length, score };
    // page-meta and share-meta
    const m = q => {
      const e = document.querySelector(q);
      return e ? squash(e.getAttribute("content") || e.getAttribute("href") || "") : null;
    };
    out.meta = {
      title: squash(document.title),
      desc: m('meta[name="description"]'),
      ogTitle: m('meta[property="og:title"]'),
      ogDesc: m('meta[property="og:description"]'),
      ogImage: m('meta[property="og:image"]'),
      card: m('meta[name="twitter:card"]'),
      icon: m('link[rel~="icon"]'),
      theme: m('meta[name="theme-color"]'),
    };
    // map-link: a map search or directions link and what its query holds
    const MAPS =
      /(openstreetmap\.org|google\.[a-z.]+\/maps|maps\.google\.|goo\.gl\/maps|maps\.apple\.com|bing\.com\/maps|here\.com|waze\.com)/i;
    for (const a of document.querySelectorAll("a[href]")) {
      const href = a.getAttribute("href");
      if (!MAPS.test(href) || drawn(a)) continue;
      let q = "";
      try {
        const u = new URL(href, location.href);
        q =
          u.searchParams.get("query")
          || u.searchParams.get("q")
          || u.searchParams.get("daddr")
          || u.searchParams.get("destination")
          || u.searchParams.get("address")
          || "";
        if (!q) {
          const mm = u.pathname.match(/\/maps\/(?:search|place|dir)\/([^/@]+)/);
          if (mm) q = decodeURIComponent(mm[1]);
        }
      } catch (e) {
        /* bad url */
      }
      out.maps.push({
        sel: sel(a),
        href: href.slice(0, 120),
        q: squash(q.replace(/\+/g, " ")),
        label: nameOf(a),
        doc: doc(a),
        shown: shown(a),
      });
    }
    // open-now and assumed facts
    const hours = [...document.querySelectorAll("dl.hours")];
    const hoursAssumed = hours.some(d => d.matches("[data-assumed]") || d.querySelector("[data-assumed]"));
    for (const el of document.querySelectorAll("[data-open-now]")) {
      const t = squash(el.textContent);
      if (t && shown(el)) out.openNow.push({ sel: sel(el), text: t.slice(0, 60), assumed: hoursAssumed, doc: doc(el) });
    }
    for (const el of document.querySelectorAll("body *")) {
      if (el.closest("[data-open-now]") || drawn(el) || el.closest("script, style, template")) continue;
      if (
        [...el.childNodes].some(
          n =>
            n.nodeType === 3
            && /\b(open now|now open|jetzt geöffnet|jetzt offen|ouvert maintenant|abierto ahora|aperto ora|nu open|öppet nu|åben nu)\b/i.test(
              n.textContent,
            ),
        )
        && shown(el)
      )
        out.openNow.push({
          sel: sel(el),
          text: squash(el.textContent).slice(0, 60),
          assumed: hoursAssumed,
          written: true,
          doc: doc(el),
        });
    }
    out.anyAssumed = !!document.querySelector("[data-assumed]");
    out.hours = hours.length;
    for (const el of document.querySelectorAll("[data-assumed]")) {
      if (el.parentElement && el.parentElement.closest("[data-assumed]")) continue;
      out.assumed.push({
        sel: sel(el),
        text: squash(el.innerText || el.textContent || el.getAttribute("content") || "").slice(0, 60),
        doc: el.getClientRects().length ? doc(el) : null,
      });
    }
    // run-on: a heading whose later part (a span in another colour or .muted) starts a new sentence with no stop before it
    for (const h of document.querySelectorAll("h1, h2, h3")) {
      if (drawn(h) || !shown(h)) continue;
      const hc = getComputedStyle(h).color;
      for (const c of h.children) {
        if (!/^(SPAN|EM|SMALL|I|B|STRONG)$/.test(c.tagName) || c.closest(".ly-word, .ly-pic, .ly-mark")) continue;
        const other = c.classList.contains("muted") || getComputedStyle(c).color !== hc;
        if (!other) continue;
        let before = "";
        for (let n = c.previousSibling; n; n = n.previousSibling) {
          if (n.nodeType === 1 && n.tagName === "BR") {
            before = ".";
            break;
          }
          before = (n.textContent || "") + before;
          if (squash(before)) break;
        }
        const b = squash(before),
          t = squash(c.textContent);
        if (!b || !t || /[.!?:;,…–—)»"”’]$/.test(b) || !/^[\p{Lu}\d]/u.test(t)) continue;
        out.runOn.push({
          sel: sel(h),
          text: squash(h.textContent).slice(0, 70),
          at: b.slice(-24) + " | " + t.slice(0, 24),
          doc: doc(h),
        });
        break;
      }
    }
    // forms
    for (const f of document.querySelectorAll("form")) {
      if (drawn(f) || !shown(f)) continue;
      const info = {
        sel: sel(f),
        doc: doc(f),
        action: (f.getAttribute("action") || "").trim(),
        endpoint: (f.dataset.endpoint || "").trim(),
        status: !!f.querySelector("[role=status], [aria-live], output, [data-form-status]"),
        fields: [],
        disabled: false,
        paste: [],
        thanks: "",
      };
      const sub = f.querySelector("button:not([type=button]):not([type=reset]), input[type=submit]");
      info.disabled = !!(sub && (sub.disabled || sub.getAttribute("aria-disabled") === "true"));
      for (const el of f.querySelectorAll("input, select, textarea")) {
        if (/^(hidden|submit|button|reset|image|checkbox|radio|file)$/.test(el.type) || !el.getClientRects().length)
          continue;
        const lab = squash(
          [...(el.labels || [])].map(l => l.textContent).join(" ")
            + " "
            + (el.name || "")
            + " "
            + (el.id || "")
            + " "
            + (el.getAttribute("aria-label") || ""),
        ).toLowerCase();
        const ev = new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: new DataTransfer() });
        const blocked = el.hasAttribute("onpaste") || !el.dispatchEvent(ev);
        if (blocked) info.paste.push(sel(el));
        const kind =
          /e-?mail/.test(lab) ? "email"
          : /\b(phone|tel|telefon|telephone|mobile|handy)\b/.test(lab) ? "tel"
          : /\b(guests?|people|persons?|gäste|personen|quantity|qty|anzahl|number of|count)\b/.test(lab) ? "count"
          : /\b(name|vorname|nachname|full name)\b/.test(lab) && !/\b(company|firma|business|event)\b/.test(lab) ?
            "name"
          : "";
        if (!kind) continue;
        const ac = (el.getAttribute("autocomplete") || "").toLowerCase(),
          im = (el.getAttribute("inputmode") || "").toLowerCase();
        const miss =
          kind === "email" ?
            [
              el.type !== "email" && im !== "email" ? 'type="email"' : "",
              !/email/.test(ac) ? 'autocomplete="email"' : "",
            ]
          : kind === "tel" ? [el.type !== "tel" ? 'type="tel"' : "", !/tel/.test(ac) ? 'autocomplete="tel"' : ""]
          : kind === "count" ?
            [
              el.type !== "number" && !/numeric|decimal/.test(im) && el.tagName !== "SELECT" ?
                'inputmode="numeric"'
              : "",
            ]
          : [!/name/.test(ac) && ac !== "off" ? 'autocomplete="name"' : ""];
        const m2 = miss.filter(Boolean);
        if (m2.length) info.fields.push({ sel: sel(el), kind, miss: m2 });
      }
      // a thank-you line ready in the form or right after it (shown or hidden), with nowhere to send to
      const THANKS =
        /\b(thank you|thanks|we('| ha)ve (got|received)|(request|message|booking|order|enquiry|inquiry) (is )?(sent|received|on its way)|danke|vielen dank|gesendet|merci|gracias|grazie|tack|tak for)\b/i;
      const near = [f, f.nextElementSibling].filter(Boolean);
      for (const n of near) {
        const t = squash(n.textContent);
        const mm = t.match(THANKS);
        if (mm) {
          info.thanks = mm[0];
          break;
        }
      }
      if (!info.thanks && THANKS.test(f.dataset.sent || "") && !info.endpoint) info.thanksAttr = true;
      out.forms.push(info);
    }
    return out;
  }

  // every control the Tab key can reach, read at rest (nothing focused), so a focus can be told from the rest look
  function restProbe() {
    /* LIB */
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    const look = el => {
      const cs = getComputedStyle(el),
        b = getComputedStyle(el, "::before"),
        a = getComputedStyle(el, "::after");
      const pseudo = p =>
        [p.content, p.opacity, p.transform, p.backgroundColor, p.borderBottomColor, p.width, p.boxShadow].join("|");
      return {
        outline: cs.outlineStyle + " " + cs.outlineWidth + " " + cs.outlineColor,
        shadow: cs.boxShadow,
        border: [cs.borderTopColor, cs.borderBottomColor, cs.borderTopWidth, cs.borderBottomWidth].join(" "),
        bg: cs.backgroundColor,
        color: cs.color,
        deco: cs.textDecorationLine + " " + cs.textDecorationColor,
        pseudo: pseudo(b) + "#" + pseudo(a),
        opacity: cs.opacity,
      };
    };
    window.__bx = { look, rest: new Map() };
    const Q = 'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"]';
    for (const el of document.querySelectorAll(Q)) {
      if (!el.disabled) window.__bx.rest.set(el, look(el));
    }
    // a start point before the first element: Tab then lands on the page's first stop
    const s = document.createElement("span");
    s.tabIndex = -1;
    s.setAttribute("data-bx-start", "");
    s.style.cssText = "position:absolute;left:0;top:0;width:1px;height:1px;outline:none";
    document.body.prepend(s);
    scrollTo(0, 0);
    s.focus({ preventScroll: true });
    const hero = document.querySelector("main section, main > *, .hero");
    const main =
      (hero && (hero.querySelector(".btn--primary") || hero.querySelector("a.btn, button.btn")))
      || document.querySelector("main .btn--primary");
    window.__bx.main = main || null;
    return { vh: innerHeight, main: main ? sel(main) : null };
  }

  // the control the last Tab reached: how it shows its focus, and whether anything fixed covers it
  function focusProbe(late) {
    /* LIB */
    const bx = window.__bx;
    const el = document.activeElement;
    const st = document.querySelector("[data-bx-start]");
    if (st && el !== st) st.remove();
    if (!el || el === document.body || el === document.documentElement || el.matches("[data-bx-start]"))
      return { none: true };
    const r = el.getBoundingClientRect(),
      cs = getComputedStyle(el);
    const info = {
      sel: sel(el),
      tag: el.tagName.toLowerCase(),
      text: nameOf(el).slice(0, 50),
      view: view(el),
      doc: doc(el),
      main: el === bx.main,
      inHeader: !!el.closest("header, .nav"),
      skip:
        el.matches('a[href^="#"]')
        && /skip|zum inhalt|springen|contenu|contenido|contenuto|inhoud|innehåll|indhold/i.test(nameOf(el)),
      href: el.getAttribute("href") || "",
    };
    // nothing to see: no box, see-through, clipped to a pixel
    const area = r.width * r.height;
    let opa = 1;
    for (let e = el; e && e !== document.documentElement; e = e.parentElement)
      opa *= parseFloat(getComputedStyle(e).opacity) || 0;
    info.invisible =
      area < 16
      || opa < 0.1
      || cs.visibility === "hidden"
      || /inset\(50%\)/.test(cs.clipPath)
      || r.bottom < 0
      || r.top > innerHeight
      || r.right < 0
      || r.left > innerWidth;
    // the change from rest, and its contrast against the ground
    const rest = bx.rest.get(el);
    const now = bx.look(el);
    // the ground round the box, where a ring draws: a photograph, canvas or video there (a pause disc on a moving picture)
    // has no one colour, so the ring is not measured against it
    const onPicture = [
      [r.left - 3, r.top + r.height / 2],
      [r.right + 3, r.top + r.height / 2],
      [r.left + r.width / 2, r.top - 3],
      [r.left + r.width / 2, r.bottom + 3],
    ].some(([x, y]) => {
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false;
      // the first layer that paints there: a see-through wrapper over a canvas is passed through
      for (const h of document.elementsFromPoint(x, y)) {
        if (el.contains(h) || h.contains(el)) continue;
        if (/^(IMG|CANVAS|VIDEO|PICTURE)$/.test(h.tagName) || getComputedStyle(h).backgroundImage !== "none")
          return true;
        if (rgba(getComputedStyle(h).backgroundColor)[3] > 0.5) return false;
      }
      return false;
    });
    // a picture larger than the control lying under its box (a canvas the pointer passes through is never hit above)
    const underPic = [...document.querySelectorAll("img, canvas, video")].some(p => {
      if (el.contains(p) || !p.getClientRects().length) return false;
      const q = p.getBoundingClientRect();
      return (
        q.width * q.height > r.width * r.height
        && q.left < r.left - 2
        && q.right > r.right + 2
        && q.top < r.top - 2
        && q.bottom > r.bottom + 2
      );
    });
    const g = onPicture || underPic ? null : groundOf(el) || null;
    info.ground = !!g;
    let best = 0,
      changed = false,
      unmeasured = false;
    const vs = c => {
      const k = rgba(c);
      if (k[3] === 0) return 0;
      return g ? ratio(over(k, g), g) : 99;
    };
    if (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 1) {
      changed = true;
      best = Math.max(best, vs(cs.outlineColor));
    }
    if (!rest || now.shadow !== rest.shadow) {
      if (cs.boxShadow && cs.boxShadow !== "none") {
        changed = true;
        for (const m of cs.boxShadow.matchAll(
          /(rgba?\([^)]*\)|oklab\([^)]*\)|oklch\([^)]*\)|color\([^)]*\)|#[0-9a-f]{3,8})/gi,
        ))
          best = Math.max(best, vs(m[1]));
      }
    }
    if (rest && now.border !== rest.border && parseFloat(cs.borderBottomWidth) >= 1) {
      changed = true;
      best = Math.max(best, vs(cs.borderBottomColor), vs(cs.borderTopColor));
    }
    if (rest && now.bg !== rest.bg) {
      changed = true;
      const a = rgba(rest.bg),
        b = rgba(now.bg);
      const base = g || [255, 255, 255, 1];
      best = Math.max(best, ratio(over(a, base), over(b, base)));
    }
    if (rest && now.deco !== rest.deco && /underline/.test(now.deco)) {
      changed = true;
      best = Math.max(best, vs(cs.textDecorationColor === "currentcolor" ? cs.color : cs.textDecorationColor));
    }
    if (rest && (now.pseudo !== rest.pseudo || now.color !== rest.color)) {
      changed = true;
      unmeasured = true;
    }
    info.changed = changed;
    info.best = Math.round(best * 100) / 100;
    info.unmeasured = unmeasured;
    // covered: the sample points of its box that land on a fixed or sticky part it is not inside
    const fixedOf = e => {
      for (let x = e; x && x !== document.body; x = x.parentElement) {
        const p = getComputedStyle(x).position;
        if (p === "fixed" || p === "sticky") return x;
      }
      return null;
    };
    const pts = [
      [0.5, 0.5],
      [0.12, 0.2],
      [0.88, 0.2],
      [0.12, 0.8],
      [0.88, 0.8],
    ]
      .map(([a, b]) => [r.left + r.width * a, r.top + r.height * b])
      .filter(([x, y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight);
    let covered = 0,
      coverBy = "";
    for (const [x, y] of pts) {
      const hit = document.elementFromPoint(x, y);
      if (!hit || el.contains(hit) || hit.contains(el)) continue;
      const fx = fixedOf(hit);
      if (fx && !fx.contains(el)) {
        covered++;
        coverBy = sel(fx);
      }
    }
    info.covered = pts.length ? covered / pts.length : 0;
    info.coverBy = coverBy;
    info.inView = pts.length > 0;
    return info;
  }

  // the phone menu button: its state attribute before and after a click
  function toggleProbe(step) {
    /* LIB */
    const cands = [
      ...document.querySelectorAll("header button, .nav button, [aria-controls][aria-expanded], .nav__toggle"),
    ].filter(b => shown(b) && !drawn(b) && b.getBoundingClientRect().width > 8);
    const t = cands.find(
      b =>
        b.matches(".nav__toggle, [class*=toggle], [class*=burger], [class*=menu-btn], [class*=hamburger]")
        || /\b(menu|menü|navigation|nav)\b/i.test(nameOf(b)),
    );
    if (!t) return null;
    if (step === "click") {
      t.click();
      return { clicked: true };
    }
    return {
      sel: sel(t),
      text: nameOf(t),
      has: t.hasAttribute("aria-expanded"),
      value: t.getAttribute("aria-expanded"),
      doc: doc(t),
      view: view(t),
    };
  }

  // the controls on the first screen, grouped by what they say
  function screenProbe() {
    /* LIB */
    const vh = innerHeight,
      vw = innerWidth,
      list = [];
    for (const el of document.querySelectorAll("a[href], button, [role=button]")) {
      if (drawn(el) || !shown(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 16 || r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) continue;
      let opa = 1;
      for (let e = el; e && e !== document.documentElement; e = e.parentElement)
        opa *= parseFloat(getComputedStyle(e).opacity) || 0;
      if (opa < 0.2 || el.matches(".skip-link")) continue;
      const label = nameOf(el)
        .toLowerCase()
        .replace(/[→↗›»>←‹«<]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (label.length < 3) continue;
      const where =
        el.closest("header, .nav") ? "nav"
        : (
          el.closest(".actionbar, [class*=actionbar], [class*=sticky]")
          || (() => {
            for (let x = el; x && x !== document.body; x = x.parentElement) {
              const p = getComputedStyle(x).position;
              if (p === "fixed" || p === "sticky") return true;
            }
            return false;
          })()
        ) ?
          "bar"
        : el.closest(".hero, main > section:first-of-type, main > :first-child") ? "hero"
        : "page";
      list.push({ label, sel: sel(el), where, view: view(el), btn: el.matches(".btn, button, [role=button]") });
    }
    return { list };
  }

  const call = (fn, arg) =>
    "(" + fn.toString().replace("/* LIB */", () => LIB) + ")(" + JSON.stringify(arg ?? null) + ")";

  async function run(ctx) {
    const { tab } = ctx,
      F = [];
    if (ctx.first) toggleDone = false;
    const put = (f, d) => Object.assign(f, d ? ctx.place(d) : { stop: null, rects: [] });
    const mobile = ctx.width < 700;

    // ---------------------------------------------------------------- action-repeat, at every width (the first screen)
    await tab.eval("scrollTo(0, 0)").catch(() => {});
    await ctx.sleep(250);
    const S = await ctx.safe("action-repeat", () => tab.eval(call(screenProbe), 20000));
    if (S) {
      const groups = new Map();
      for (const x of S.list) {
        if (!groups.has(x.label)) groups.set(x.label, []);
        groups.get(x.label).push(x);
      }
      let shot = null;
      for (const [label, xs] of groups) {
        if (xs.length < 2 || !xs.some(x => x.btn)) continue;
        const where = xs.map(x => x.where);
        const sev =
          xs.length >= 3 ? "FAIL"
          : !mobile && ctx.width >= 1000 && where.includes("nav") && where.includes("hero") ? "WARN"
          : null;
        if (!sev) continue;
        if (shot == null) shot = ctx.addShot(await tab.shot());
        F.push({
          check: "action-repeat",
          sev,
          id: 0,
          sel: xs[0].sel,
          text: label,
          stop: shot,
          rects: xs.map(x => x.view),
          msg: `"${label}" shows ${xs.length} times on the first screen at ${ctx.width}px (${where.join(", ")}): ${sev === "FAIL" ? "three copies of one action on a screen read as clutter" : "the nav's button and the hero's; nothing else on the screen may repeat it"}`,
        });
      }
    }

    // ---------------------------------------------------------------- menu-toggle, at the first width that shows the menu button
    if (!toggleDone && ctx.width < 1024) {
      const t0 = await ctx.safe("menu-toggle", () => tab.eval(call(toggleProbe, "read")));
      if (t0) {
        toggleDone = true;
        if (!t0.has)
          F.push(
            put(
              {
                check: "menu-toggle",
                sev: "FAIL",
                id: 0,
                sel: t0.sel,
                text: t0.text,
                msg: `the menu button ("${t0.text || "no name"}") has no aria-expanded: a screen reader cannot tell the menu is open or shut`,
              },
              t0.doc,
            ),
          );
        else {
          await ctx.safe("menu-toggle", () => tab.eval(call(toggleProbe, "click")));
          await ctx.sleep(450);
          const t1 = await ctx.safe("menu-toggle", () => tab.eval(call(toggleProbe, "read")));
          if (t1 && t1.value === t0.value)
            F.push(
              put(
                {
                  check: "menu-toggle",
                  sev: "FAIL",
                  id: 0,
                  sel: t0.sel,
                  text: t0.text,
                  msg: `the menu button keeps aria-expanded="${t0.value}" after a click: its state never changes (system.js flips it on .nav__toggle)`,
                },
                t0.doc,
              ),
            );
          if (t1 && t1.value !== t0.value) {
            await ctx.safe("menu-toggle", () => tab.eval(call(toggleProbe, "click")));
            await ctx.sleep(350);
          }
          await tab.eval("document.activeElement && document.activeElement.blur(); scrollTo(0, 0)").catch(() => {});
        }
      }
    }

    if (!ctx.first) return F;

    // ---------------------------------------------------------------- the page-wide reads
    const P = await ctx.safe("basics", () => tab.eval(call(pageProbe), 60000));
    if (P) {
      for (const x of P.names.slice(0, 6))
        F.push(
          put(
            {
              check: "a11y-name",
              sev: "FAIL",
              id: 0,
              sel: x.sel,
              text: "",
              msg: `a ${x.what} with no accessible name: a screen reader says only "link" or "button"${P.names.length > 6 ? ` (${P.names.length} like it)` : ""}`,
            },
            x.doc,
          ),
        );
      for (const x of P.alts.slice(0, 6))
        F.push(
          put(
            {
              check: "img-alt",
              sev: x.sev,
              id: 0,
              sel: x.sel,
              text: x.src,
              msg: `a picture${x.src ? " (" + x.src + ")" : ""} ${x.why}`,
            },
            x.doc,
          ),
        );
      for (const x of P.labels.slice(0, 6))
        F.push(
          put(
            {
              check: "field-label",
              sev: "FAIL",
              id: 0,
              sel: x.sel,
              text: "",
              msg: `a ${x.what} without a label you can see: ${x.why}`,
            },
            x.doc,
          ),
        );
      for (const x of P.heads.slice(0, 4))
        F.push(
          put(
            {
              check: "heading-order",
              sev: x.sev,
              id: 0,
              sel: x.sel,
              text: x.text,
              msg: `"${x.text}" is an h${x.to} after an h${x.from}: a level is skipped${x.sev === "WARN" ? " (in the header or footer)" : ""}`,
            },
            x.doc,
          ),
        );
      for (const x of P.tabidx.slice(0, 4))
        F.push(
          put(
            {
              check: "tabindex",
              sev: "FAIL",
              id: 0,
              sel: x.sel,
              text: "",
              msg: `tabindex="${x.n}" puts this first in the Tab order, ahead of the page's reading order`,
            },
            x.doc,
          ),
        );
      for (const x of P.rings.slice(0, 4))
        F.push(
          put({
            check: "focus-ring",
            sev: "FAIL",
            id: 0,
            sel: x.sel,
            text: "",
            msg: `"${x.sel}" in ${x.file} removes the focus outline and sets nothing in its place`,
          }),
        );
      // lang
      const L = P.lang,
        tag = L.lang;
      if (!tag || !/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/i.test(tag.trim()))
        F.push(
          put({
            check: "lang",
            sev: "FAIL",
            id: 0,
            sel: "html",
            text: tag || "",
            msg:
              tag ?
                `<html lang="${tag}"> is no language tag ("en", "de", "fr-CH")`
              : "<html> has no lang: a screen reader guesses the language and hyphenation is off",
          }),
        );
      else if (L.words >= 80) {
        const ranked = Object.entries(L.score).sort((a, b) => b[1] - a[1]),
          [top, n1] = ranked[0],
          n2 = ranked[1][1];
        const want = tag.trim().slice(0, 2).toLowerCase(),
          near = {
            da: ["no", "nb", "nn", "sv"],
            sv: ["no", "nb", "nn", "da"],
            no: ["da", "sv", "nb", "nn"],
            nb: ["da", "sv", "no"],
            nn: ["da", "sv", "no"],
          };
        if (top !== want && !(near[top] || []).includes(want) && n1 >= Math.max(8, L.words * 0.06) && n1 >= 2 * n2)
          F.push(
            put({
              check: "lang",
              sev: "WARN",
              id: 0,
              sel: "html",
              text: tag,
              msg: `<html lang="${tag}">, but the words read as ${top} (${n1} common ${top} words against ${L.score[want] ?? 0} ${want} ones in ${L.words})`,
            }),
          );
      }
      // page-meta, share-meta
      const M = P.meta,
        norm = s =>
          String(s || "")
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, " ")
            .trim();
      if (!M.title)
        F.push(
          put({
            check: "page-meta",
            sev: "FAIL",
            id: 0,
            sel: "head > title",
            text: "",
            msg: "the page has no <title>: the tab, the bookmark and the search result show its address",
          }),
        );
      if (!M.desc)
        F.push(
          put({
            check: "page-meta",
            sev: "WARN",
            id: 0,
            sel: "head",
            text: M.title || "",
            msg: 'no <meta name="description">: a search result and a shared link show a scrap of the page instead',
          }),
        );
      else if (M.title && norm(M.title) === norm(M.desc))
        F.push(
          put({
            check: "page-meta",
            sev: "FAIL",
            id: 0,
            sel: "head",
            text: M.title,
            msg: `the title and the description say the same words ("${M.title.slice(0, 60)}"): the description is one sentence of its own`,
          }),
        );
      const missing = [
        ["og:title", M.ogTitle],
        ["og:description", M.ogDesc],
        ["og:image", M.ogImage],
        ["twitter:card", M.card],
        ["an icon", M.icon],
        ["theme-color", M.theme],
      ]
        .filter(([, v]) => !v)
        .map(([k]) => k);
      if (missing.length)
        F.push(
          put({
            check: "share-meta",
            sev: "WARN",
            id: 0,
            sel: "head",
            text: "",
            msg: `the head lacks ${missing.join(", ")}: a shared link shows no picture or title of its own`,
          }),
        );
      // map-link
      const STREET_END =
        /(stra(ss|ß)e|str\.?|gasse|weg|allee|platz|ufer|damm|ring|chaussee|steig|markt|gatan|gata|gate|vägen|vej|vegur|stræti|straat|gracht|kade|laan|plein|katu|tie|utca|ulica|street|road|lane|avenue|boulevard|terrace|quay|wharf|row|square|close|drive|crescent)$/i;
      const STREET_WORD =
        /^(st|rd|ave|blvd|way|place|pl|walk|hill|rue|via|viale|piazza|calle|carrer|rua|avenida|plaza|camino|corso|largo|travessa|chemin|quai|place)\.?$/i;
      const COUNTRY =
        /^(germany|deutschland|uk|england|scotland|wales|france|spain|españa|italy|italia|portugal|netherlands|nederland|sweden|sverige|norway|norge|denmark|danmark|iceland|ísland|austria|österreich|switzerland|schweiz|suisse|ireland|usa|us|belgium|belgië|finland|suomi|poland|polska|czechia|hungary|greece)$/i;
      const DIRECTIONS =
        /\b(directions?|route|get here|how to get|find us|anfahrt|wegbeschreibung|route planen|so finden sie uns|vägbeskrivning|vejvisning|itinéraire|cómo llegar|indicazioni|routebeschrijving)\b/i;
      const toldMap = new Set();
      for (const m of P.maps) {
        const toks = m.q.split(/[\s,]+/).filter(t => t && !COUNTRY.test(t) && !/^\d+$/.test(t));
        const street = toks.some(t => STREET_END.test(t) || STREET_WORD.test(t));
        if (street) continue;
        const why =
          !toks.length ? "searches for nothing"
          : toks.length === 1 ? `searches the whole of "${m.q}"`
          : DIRECTIONS.test(m.label) ? `promises directions but its search ("${m.q}") holds no street`
          : "";
        if (!why) continue;
        // one finding per search: the other links with the same search are counted in it, not told again
        if (toldMap.has(m.q)) continue;
        toldMap.add(m.q);
        const more = P.maps.filter(x => x.q === m.q).length - 1;
        F.push(
          put(
            {
              check: "map-link",
              sev: "FAIL",
              id: 0,
              sel: m.sel,
              text: m.label,
              msg: `"${m.label || "a map link"}" ${why}: a map of a district or a town shows nobody the door${more ? ` (and ${more} more link${more > 1 ? "s" : ""} with the same search)` : ""}`,
            },
            m.shown ? m.doc : null,
          ),
        );
        if (toldMap.size >= 3) break;
      }
      // open-now, assumed
      for (const o of P.openNow.slice(0, 2)) {
        if (o.assumed)
          F.push(
            put(
              {
                check: "open-now",
                sev: "FAIL",
                id: 0,
                sel: o.sel,
                text: o.text,
                msg: `"${o.text}" is read from hours marked data-assumed: a visitor may walk to a shut door`,
              },
              o.doc,
            ),
          );
        else if (!P.anyAssumed && P.hours)
          F.push(
            put(
              {
                check: "open-now",
                sev: "WARN",
                id: 0,
                sel: o.sel,
                text: o.text,
                msg: `"${o.text}" is read from the hours on the page: they must be the brief's; hours you assumed carry data-assumed and drop this line`,
              },
              o.doc,
            ),
          );
      }
      if (P.assumed.length)
        F.push(
          put(
            {
              check: "assumed",
              sev: "WARN",
              id: 0,
              sel: P.assumed[0].sel,
              text: P.assumed[0].text,
              msg: `${P.assumed.length} fact${P.assumed.length > 1 ? "s" : ""} marked as assumed, for the report: ${P.assumed
                .slice(0, 10)
                .map(a => '"' + a.text + '"')
                .join(", ")}${P.assumed.length > 10 ? " and more" : ""}`,
            },
            P.assumed[0].doc,
          ),
        );
      // run-on
      for (const x of P.runOn.slice(0, 4))
        F.push(
          put(
            {
              check: "run-on",
              sev: "FAIL",
              id: 0,
              sel: x.sel,
              text: x.text,
              msg: `"${x.at}": the heading runs its first sentence into the grey second one with no stop`,
            },
            x.doc,
          ),
        );
      // forms
      for (const f of P.forms.slice(0, 4)) {
        if (f.paste.length)
          F.push(
            put(
              {
                check: "form-fields",
                sev: "FAIL",
                id: 0,
                sel: f.paste[0],
                text: "",
                msg: `paste is blocked in ${f.paste.length} field${f.paste.length > 1 ? "s" : ""}: people paste addresses and codes`,
              },
              f.doc,
            ),
          );
        for (const x of f.fields.slice(0, 3))
          F.push(
            put(
              {
                check: "form-fields",
                sev: "WARN",
                id: 0,
                sel: x.sel,
                text: "",
                msg: `the ${x.kind} field lacks ${x.miss.join(" and ")}: the phone shows the wrong keyboard and nothing fills it in`,
              },
              f.doc,
            ),
          );
        if (f.disabled)
          F.push(
            put(
              {
                check: "form-fields",
                sev: "WARN",
                id: 0,
                sel: f.sel,
                text: "",
                msg: "the submit button is disabled before anything is typed: it says nothing about what is missing",
              },
              f.doc,
            ),
          );
        if (!f.status)
          F.push(
            put(
              {
                check: "form-fields",
                sev: "WARN",
                id: 0,
                sel: f.sel,
                text: "",
                msg: 'the form has no status line (role="status"): sending, sent and errors are never read out',
              },
              f.doc,
            ),
          );
        const sends =
          /^https?:\/\//.test(f.endpoint)
          || f.endpoint.startsWith("/")
          || /^(https?:)?\/\//.test(f.action)
          || (f.action && !/^(#|mailto:|javascript:)/i.test(f.action));
        const mail = /^mailto:/i.test(f.action);
        if ((f.thanks || f.thanksAttr) && !sends && !mail)
          F.push(
            put(
              {
                check: "form-send",
                sev: "FAIL",
                id: 0,
                sel: f.sel,
                text: f.thanks || "",
                msg: `the form holds a confirmation ("${f.thanks || "data-sent"}") but nothing to send it to: a visitor is told it went when it did not`,
              },
              f.doc,
            ),
          );
        else if (mail && /\.example\b/i.test(f.action) && !sends)
          F.push(
            put(
              {
                check: "form-send",
                sev: "WARN",
                id: 0,
                sel: f.sel,
                text: f.action.slice(0, 50),
                msg: `the form opens a mail to ${f.action.replace(/^mailto:/i, "").split("?")[0]}: a stand-in until the client gives its form address; list it in the report`,
              },
              f.doc,
            ),
          );
      }
    }

    // ---------------------------------------------------------------- the Tab walk: the first screen and the main action
    const R = await ctx.safe("focus-visible", () => tab.eval(call(restProbe), 20000));
    if (R) {
      const key = async () => {
        await tab.send("Input.dispatchKeyEvent", {
          type: "rawKeyDown",
          key: "Tab",
          code: "Tab",
          windowsVirtualKeyCode: 9,
          nativeVirtualKeyCode: 9,
        });
        await tab.send("Input.dispatchKeyEvent", {
          type: "keyUp",
          key: "Tab",
          code: "Tab",
          windowsVirtualKeyCode: 9,
          nativeVirtualKeyCode: 9,
        });
      };
      const seen = new Set();
      let firstStop = null,
        mainAt = -1,
        n = 0,
        bad = 0,
        hid = 0;
      for (let i = 0; i < 40; i++) {
        await ctx.safe("focus-visible", key);
        await ctx.sleep(60);
        let f = await ctx.safe("focus-visible", () => tab.eval(call(focusProbe, false)));
        if (!f || f.none) {
          if (i > 2) break;
          continue;
        }
        if (seen.has(f.sel)) break;
        seen.add(f.sel);
        n++;
        if (!firstStop) firstStop = f;
        if (f.main) mainAt = i;
        // a focus that shows nothing (or too little) at once: read again 350 ms on (a ring that fades in)
        let late = null;
        if (!f.invisible && (!f.changed || (!f.unmeasured && f.best < 3))) {
          await ctx.sleep(350);
          late = await ctx.safe("focus-visible", () => tab.eval(call(focusProbe, true)));
        }
        const okLate = late && late.changed && (late.unmeasured || late.best >= 3);
        const sev =
          f.invisible ? "FAIL"
          : f.changed && (f.unmeasured || f.best >= 3) ? null
          : okLate ? "WARN"
          : "FAIL";
        if (sev && bad < 4) {
          bad++;
          const shot = ctx.addShot(await tab.shot());
          const what =
            f.invisible ? "the focus lands on something you cannot see"
            : okLate ? "its focus ring fades in instead of showing at once"
            : !f.changed ? "it shows no change when focused"
            : `its focus change is faint: ${f.best}:1 against the ground, 3:1 needed`;
          F.push({
            check: "focus-visible",
            sev,
            id: 0,
            sel: f.sel,
            text: f.text,
            stop: shot,
            rects: [f.view],
            msg: `Tab stop ${n}, ${f.tag} "${f.text || f.href}": ${what}`,
          });
        }
        if (!f.inHeader && f.inView && f.covered > 0 && hid < 3) {
          hid++;
          const shot = ctx.addShot(await tab.shot());
          F.push({
            check: "focus-hidden",
            sev: f.covered >= 0.99 ? "FAIL" : "WARN",
            id: 0,
            sel: f.sel,
            text: f.text,
            stop: shot,
            rects: [f.view],
            msg: `Tab stop ${n}, "${f.text || f.href}" is ${f.covered >= 0.99 ? "wholly" : "partly"} under ${f.coverBy}: a keyboard user cannot see where they are`,
          });
        }
        if (mainAt >= 0 && i >= mainAt + 2 && f.doc.top > R.vh) break;
      }
      if (n && !(firstStop && firstStop.skip))
        F.push(
          put({
            check: "skip-link",
            sev: "WARN",
            id: 0,
            sel: firstStop ? firstStop.sel : "header",
            text: firstStop ? firstStop.text : "",
            msg: `the first Tab stop is ${firstStop ? `"${firstStop.text || firstStop.sel}"` : "nothing"}, not a skip link: a keyboard user tabs through the whole nav on every visit`,
          }),
        );
      await tab
        .eval(
          'document.querySelector("[data-bx-start]")?.remove(); document.activeElement && document.activeElement.blur(); delete window.__bx; scrollTo(0, 0)',
        )
        .catch(() => {});
      await ctx.sleep(200);
    }
    return F;
  }
  return { id, phase, checks, fixes, summary, flags, quick, run };
})();
