// consistency/modules/rhythm.mjs — the rhythm check module (moved from consistency.mjs)
// ---------------------------------------------------------------- rhythm: kept as one block
export const rhythmMod = (() => {
  // rhythm.mjs: one section per screen and the same left and right edges all the way down (house rule), as the
  // section-rhythm rules SR-1 to SR-8 read them (references/layout-v4.md and SKILL.md, house rules CK-15 to CK-33): every rule,
  // threshold and exemption of the original rhythm check is kept, with the departures listed at the end of this comment.
  //   screens    hero-screen (SR-1: the hero ends at the fold, 1px either way, its content between the nav and 24px above
  //              the fold, nothing of the next section on the first screen, FAIL), section-height (SR-2: every other
  //              section one screen or two, 2px, 3-8px WARN; tops on the screen grid; content above the bottom padding,
  //              again with every answer and tab open; a place page 3 to 6 screens, FAIL), section-air (SR-3: 128-480px
  //              between the content of two sections, 112-420 on a phone, 64-600 and 56-560 WARN; fill 55%, 40% WARN; no
  //              divider rules, FAIL), one-section (SR-4: at every stride and section top another section peeks 8px at
  //              most, 24px WARN, no whole heading of it; only sections in <main>, no bands, FAIL), one-heading (SR-5:
  //              one h2 per section, none in the hero; two sections' headings whole on one screen at 3% of positions,
  //              5% on a phone, FAIL); at 1440x900, 768x1024 and 390x844 (--rhythm-widths), --no-rhythm-expand
  //   layout     container-edges (SR-6: one container, equal margins 64-120px, 16-24px on a phone, the page's own --gut up to 120px on a tablet under 1024px; the page shell;
  //              nothing past its lines; text on its left line or one split line; no sideways scroll; wide pictures edge
  //              to edge; a page with no viewport meta tag, FAIL), row-lines (SR-7: card rows on the container lines at
  //              one height; no sideways scroller or cut carousel; no cut row item, FAIL), split-pair (SR-8: splits
  //              top-aligned, text left, one right column line k 5, 6 or 7, 6 on a place page, edge to edge, FAIL)
  //
  // Phase 'pass': at each width it runs at (--rhythm-widths, default 1440,768,390: the rules are written for 1440x900 and
  // 390x844; up to 640px the phone rule set, 700px and up the desktop one; 641-699px is not checked, since the host emulates
  // a touch phone there and the desktop rules would judge it) it opens its own tab with the scrollbars hidden and
  // scroll-behavior and scroll snapping off, waits for fonts, goes down the page once a screen at a time (lazy parts load),
  // waits up to 3 s for pictures, returns to the top, lets running finite animations end (3 s at most: an addition,
  // rhythm-check.mjs does not wait), waits for the fonts once more (the read is of the settled font), then measures from
  // boxes and computed styles only: no pointer, wheel or focus events.
  // Row and card status is decided at the widest desktop width and kept by DOM node on the phone. That needs the desktop
  // width before the phone in the same run (1440 before 390, as the default runs them); a phone read with no desktop read
  // before it decides the status at its own width and says so as a probe error.
  // Then, when the page has something to open, the expansion pass: SR-2 read again at the top as the baseline, every details
  // opened and every [aria-expanded=false] and [role=tab] in main clicked once (element.click(), links and submits held),
  // SR-2's fit and grid read again, and every height a click changed against that baseline told (CK-06). Each finding is
  // cropped from a screen the module shoots itself (red: the element; dashed blue: the line or box it is measured against).
  // What is told: a test's offenders worst first (furthest outside the band), three a test with the others named; a check's
  // 8 places a width go round its failing tests (FAIL tests first, one each, then a second each), and a test left out is
  // named with its count. A part that moves as it is measured (a running finite animation, a [data-scene], a sticky held
  // stage) is told as a WARN only where the test reads a position (SR-1 T2 and T4, SR-4's screens, SR-5 T2, SR-6 T2, T3, T4
  // and T6, SR-7's rows and right line, SR-8); a section's height, its grid top, the page shell, sideways scroll and a
  // place page's length stay FAIL. A finding carries rule (its SR test, as 'SR-2 T-fit'); its msg ends in the SR number.
  // Not measured: a width that cannot be read (the page did not load, the read failed or ran out of time, a rule broke)
  // gives one WARN a check it could not read, on body: 'not measured at <w>px: <why>', and calls ctx.notChecked(ids, why)
  // when the host gives one (the hook the pass block adds: each id pushed onto report.notChecked with its why). A page
  // with no viewport meta tag lays out 980px wide on a 390px phone: a FAIL on container-edges, the rest not measured. When
  // when() matches no width of the run (--widths 1280,768), the host adds the not-checked entries itself.
  // Under --quick: the first width of --rhythm-widths only, no animation wait, no expansion pass, one crop a check.
  // CC_TIMING=1 logs the time of each phase (load, measure, crops, expansion).
  //
  // Flags: --rhythm-widths 1440,768,390 (the widths it runs at: 1440-like, 768-like or 390-like; 768 is a tablet held upright, 768x1024), --no-rhythm-expand (no expansion pass;
  // --quick skips it too), --no-rhythm (skip the module).
  // Departures from rhythm-check.mjs, deliberate (from the first runs): near-full-bleed boxes are skipped
  // under 12px on a phone (40px on a desktop, as the original); the rows and columns of a drawn mock ([data-ui], .ui,
  // [data-ui-loop], [data-m-loop], [data-diagram]) are no card rows or splits, and its words keep their own lines; two
  // columns repeated in three or more sibling rows of one class are a table's rows, not splits; a text block on a card laid
  // over a picture (a boxed, absolute ancestor) and a list item whose words follow its icon are not held to the left lines.
  // Not checked (as in rhythm-check.mjs): SR-9 and SR-10's units; the --lang flags of CK-04; clip-path, mask and
  // transforms in clip-aware boxes, and box-shadow in the SR-4 peek; an li ::marker (only an svg or img icon first);
  // the SR-4 intro paragraph is the section's first p outside a row item or split column; stacked phone columns are no
  // split, and the CK-30 600px closing-button exemption; SR-1's three-line h1, notice line and place positions; a flex
  // or grid box half the container wide with 2+ items each 15% of it is read as a row (an approximation).

  const id = "rhythm";
  const phase = "pass";
  const checks = [
    {
      id: "hero-screen",
      sev: "FAIL",
      what: "SR-1: the hero ends at the fold (1px either way), its content between the nav and 24px above the fold, nothing below it on the first screen",
    },
    {
      id: "section-height",
      sev: "FAIL",
      what: "SR-2: every other section one screen or two (2px; 3-8px WARN), tops on the screen grid, content above the bottom padding, also with every answer and tab open",
    },
    {
      id: "section-air",
      sev: "FAIL",
      what: "SR-3: 128-480px between the content of two sections (112-420 on a phone; WARN 64-600, 56-560), content filling 55% (40% WARN), no divider rules",
    },
    {
      id: "one-section",
      sev: "FAIL",
      what: "SR-4: a screen shows one section: another peeks 8px at most (24px WARN) and shows no whole heading; only sections in <main>, no bands",
    },
    {
      id: "one-heading",
      sev: "FAIL",
      what: "SR-5: one h2 per section, none in the hero; two sections' headings whole on one screen at 3% of scroll positions at most (5% on a phone)",
    },
    {
      id: "container-edges",
      sev: "FAIL",
      what: "SR-6: one container, equal margins (64-120px, 16-24px on a phone), the page shell, nothing past its lines, one or two left lines, no sideways scroll, wide pictures edge to edge; a viewport meta tag",
    },
    {
      id: "row-lines",
      sev: "FAIL",
      what: "SR-7: card rows on the container lines at one height, no sideways scroller or cut carousel, no cut row item, nothing past the right line",
    },
    {
      id: "split-pair",
      sev: "FAIL",
      what: "SR-8: splits top-aligned, text left, every right column on one line (k 5, 6 or 7; 6 on a place page), edge to edge",
    },
  ];
  const fixes = {
    "hero-screen":
      "make the hero exactly one screen (height: 100svh) with its content between the nav and 24px above the fold",
    "section-height":
      "set every section after the hero to one screen or two (height: calc(var(--h,1) * 100vh)) and fit its content above --padb",
    "section-air":
      "keep 128-480px of air between sections (--padt, --padb), fill each section to 55% or merge it into the one above, and drop divider rules",
    "one-section":
      "make each section exactly one or two screens so a screen shows one section; every block of <main> a <section>, no bands inside one",
    "one-heading":
      "give each section one h2, first in its .wrap, and the hero only its h1, so headings sit a screen apart",
    "container-edges":
      "put everything on one .wrap: the same margin left and right (64-120px, 16-24px on a phone), text on its left line or the one split line",
    "row-lines":
      "start a row's first item on the container's left line and end its last on the right line, all one height, nothing scrolling sideways",
    "split-pair":
      "top-align every split, text left and visual right, the right column on one shared line, edge to edge on the container",
  };
  const summary = [
    "  screens    hero-screen (SR-1: the hero ends at the fold, 1px either way, its content between the nav and 24px above",
    "             the fold, nothing of the next section on the first screen, FAIL), section-height (SR-2: every other",
    "             section one screen or two, 2px, 3-8px WARN; tops on the screen grid; content above the bottom padding,",
    "             again with every answer and tab open; a place page 3 to 6 screens, FAIL), section-air (SR-3: 128-480px",
    "             between the content of two sections, 112-420 on a phone, 64-600 and 56-560 WARN; fill 55%, 40% WARN; no",
    "             divider rules, FAIL), one-section (SR-4: at every stride and section top another section peeks 8px at",
    "             most, 24px WARN, no whole heading of it; only sections in <main>, no bands, FAIL), one-heading (SR-5:",
    "             one h2 per section, none in the hero; two sections' headings whole on one screen at 3% of positions,",
    "             5% on a phone, FAIL); at 1440x900, 768x1024 and 390x844 (--rhythm-widths), --no-rhythm-expand",
    "  layout     container-edges (SR-6: one container, equal margins 64-120px, 16-24px on a phone, the own --gut up to 120px under 1024px; the page shell;",
    "             nothing past its lines; text on its left line or one split line; no sideways scroll; wide pictures edge",
    "             to edge; a page with no viewport meta tag, FAIL), row-lines (SR-7: card rows on the container lines at",
    "             one height; no sideways scroller or cut carousel; no cut row item, FAIL), split-pair (SR-8: splits",
    "             top-aligned, text left, one right column line k 5, 6 or 7, 6 on a place page, edge to edge, FAIL)",
  ].join("\n");
  const flags = [
    {
      name: "rhythm-widths",
      kind: "value",
      default: "1440,768,390",
      help: "the widths the section-rhythm rules run at (written for 1440x900 and 390x844; 768x1024 is the tablet width, run by default)",
    },
    {
      name: "no-rhythm-expand",
      kind: "bool",
      default: false,
      help: "skip the expansion pass (every answer and tab opened, SR-2 read again)",
    },
  ];
  const quick = true;

  // the rules are written for 1440x900 and 390x844; another width runs only when --rhythm-widths names it, and under
  // --quick only the first width it names
  const widthsOf = ctx =>
    String((ctx.flags && ctx.flags["rhythm-widths"]) || "1440,768,390")
      .split(",")
      .map(v => parseInt(v, 10))
      .filter(v => v > 0);
  function when(ctx) {
    const ws = widthsOf(ctx);
    return (ctx.quick ? ws.slice(0, 1) : ws).includes(ctx.width);
  }

  // ---------------------------------------------------------------- the in-page probe (serialised: nothing from module scope)
  // one read of the page at rest, at scroll 0: sections, the container, rows and splits, then every SR test, each
  // offender with its element (sel), its words, its box in page coordinates (doc) and the boxes it is measured against
  function measure(opt) {
    const de = document.documentElement,
      body = document.body;
    const W = de.clientWidth,
      H = window.innerHeight,
      SX = window.scrollX,
      SY = window.scrollY;
    const phone = W <= 640;
    const notes = [];
    // the harness (CK-04): no verdict when the page is not W wide (a page with no viewport meta tag lays out 980px wide
    // on a phone and is shrunk to fit: the module tells that on its own)
    const noViewport = !document.querySelector('meta[name="viewport"]');
    if (W !== opt.width)
      return {
        abort:
          "the page lays out "
          + W
          + "px wide, not "
          + opt.width
          + "px"
          + (noViewport ? " (it has no viewport meta tag)" : "")
          + (de.scrollWidth > W ? " (and scrolls sideways: " + de.scrollWidth + "px)" : ""),
        noViewport,
        W,
      };
    // one screen is exactly 900px at 1440x900 and 844px at 390x844 (the unit of SR-1 to SR-8, and the height of every
    // judge tile shoot.mjs cuts at k x H): a tab that reports another height is no measure of one screen
    if (opt.height && H !== opt.height)
      return {
        abort:
          "window.innerHeight is "
          + H
          + ", one screen is exactly "
          + opt.height
          + "px at "
          + opt.width
          + "x"
          + opt.height
          + " (900 at 1440x900, 844 at 390x844)",
      };
    if (Math.abs(SY) > 0.5)
      notes.push("scrollY was " + SY + " at measure time; boxes are converted to page coordinates");
    const SKIPTAG = /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|LINK|META|BASE|TITLE)$/;
    const TU = el => el.tagName.toUpperCase();
    const csMap = new Map();
    const cs = el => {
      let s = csMap.get(el);
      if (!s) {
        s = getComputedStyle(el);
        csMap.set(el, s);
      }
      return s;
    };
    const R = r => ({ l: r.left + SX, t: r.top + SY, r: r.right + SX, b: r.bottom + SY });
    const rectMap = new Map();
    const rectOf = el => {
      let r = rectMap.get(el);
      if (!r) {
        r = R(el.getBoundingClientRect());
        rectMap.set(el, r);
      }
      return r;
    };
    const INF = { l: -1e9, t: -1e9, r: 1e9, b: 1e9 };
    const inter = (a, b) => ({
      l: Math.max(a.l, b.l),
      t: Math.max(a.t, b.t),
      r: Math.min(a.r, b.r),
      b: Math.min(a.b, b.b),
    });
    const wd = a => Math.max(0, a.r - a.l),
      ht = a => Math.max(0, a.b - a.t);
    const rnd = n =>
      n == null ? n
      : !isFinite(n) ? null
      : Math.round(n * 10) / 10;
    const px = n => (n == null || !isFinite(n) ? "?" : String(Math.round(n)));
    // a share as a percent with one decimal, rounded down: 0.546 reads 54.6%, never a 55% that passes
    const pct = f => String(Math.floor(f * 1000) / 10);
    const alpha = c => {
      if (!c || c === "transparent") return 0;
      let m = c.match(/^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/);
      if (m) return parseFloat(m[1]);
      m = c.match(/\/\s*([\d.]+)(%?)\s*\)$/);
      if (m) return parseFloat(m[1]) / (m[2] ? 100 : 1);
      return 1;
    };
    const visMemo = new Map();
    const visible = el => {
      if (visMemo.has(el)) return visMemo.get(el);
      let v = true;
      try {
        v = el.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
          opacityProperty: true,
          visibilityProperty: true,
        });
      } catch {
        v = true;
      }
      if (v) {
        const s = cs(el);
        if (s.display === "none" || s.visibility === "hidden" || s.visibility === "collapse") v = false;
      }
      visMemo.set(el, v);
      return v;
    };
    const srMemo = new Map();
    const srOnly = el => {
      if (!el || el === body || el === de) return false;
      if (srMemo.has(el)) return srMemo.get(el);
      const s = cs(el),
        r = el.getBoundingClientRect();
      let v =
        /inset\(\s*50%/.test(s.clipPath || "")
        || /^rect\(0(px)?,?\s*0(px)?,?\s*0(px)?,?\s*0(px)?\)$/.test(s.clip || "")
        || (s.position === "absolute" && r.width <= 2 && r.height <= 2);
      if (!v) v = srOnly(el.parentElement);
      srMemo.set(el, v);
      return v;
    };
    const boxedMemo = new Map();
    const boxed = el => {
      if (boxedMemo.has(el)) return boxedMemo.get(el);
      const s = cs(el);
      let v =
        alpha(s.backgroundColor) > 0.01
        || (s.backgroundImage && s.backgroundImage !== "none")
        || (s.boxShadow && s.boxShadow !== "none");
      if (!v)
        for (const side of ["Top", "Right", "Bottom", "Left"]) {
          const st = s["border" + side + "Style"];
          if (
            parseFloat(s["border" + side + "Width"]) > 0
            && st !== "none"
            && st !== "hidden"
            && alpha(s["border" + side + "Color"]) > 0.01
          ) {
            v = true;
            break;
          }
        }
      boxedMemo.set(el, !!v);
      return !!v;
    };
    const hasDirectText = el => {
      for (const n of el.childNodes) if (n.nodeType === 3 && /\S/.test(n.data)) return true;
      return false;
    };
    const sameKind = (a, b) =>
      a.tagName === b.tagName && [...a.classList].sort().join(" ") === [...b.classList].sort().join(" ");
    const pathOf = el => {
      const p = [];
      while (el && el !== body) {
        const par = el.parentElement;
        if (!par) break;
        p.push([...par.children].indexOf(el));
        el = par;
      }
      return p.reverse().join("/");
    };
    const byPath = p => {
      let el = body;
      if (p === "") return null;
      for (const k of p.split("/")) {
        el = el && el.children[+k];
        if (!el) return null;
      }
      return el;
    };
    const cssVar = (n, d) => {
      const v = parseFloat(getComputedStyle(de).getPropertyValue(n));
      return isFinite(v) ? v : d;
    };
    // the element as the checker names it (lib's sel(): up to 4 parts, tag#id ends it, nth-of-type among like siblings)
    const selOf = el => {
      const parts = [];
      for (
        let e = el;
        e && e.nodeType === 1 && e !== document.body && e !== document.documentElement && parts.length < 4;
        e = e.parentElement
      ) {
        const tag = e.tagName.toLowerCase();
        if (e.id && /^[A-Za-z][\w-]*$/.test(e.id)) {
          parts.unshift(tag + "#" + e.id);
          break;
        }
        const cls = [...e.classList].filter(c => /^[A-Za-z_][\w-]*$/.test(c) && !/^(is|js|has)-/.test(c)).slice(0, 2);
        let s = tag + cls.map(c => "." + c).join("");
        const p = e.parentElement;
        if (p) {
          const same = [...p.children].filter(x => x.tagName === e.tagName);
          if (same.length > 1 && (!cls.length || same.filter(x => cls.every(c => x.classList.contains(c))).length > 1))
            s += `:nth-of-type(${same.indexOf(e) + 1})`;
        }
        parts.unshift(s);
      }
      return parts.join(" > ") || (el && el.tagName ? el.tagName.toLowerCase() : "body");
    };
    const words = el => {
      if (!el || el.nodeType !== 1) return "";
      const t = (el.textContent || "").trim().replace(/\s+/g, " ");
      return (t || el.getAttribute("alt") || el.getAttribute("aria-label") || "").slice(0, 40);
    };
    const q = el => {
      const t = words(el);
      return t ? `"${t.slice(0, 32)}"` : `the <${el.tagName.toLowerCase()}>`;
    };
    // boxes for the crop: page coordinates, x as on the screen
    const box = r => ({
      left: Math.round(r.l - SX),
      top: Math.round(r.t),
      width: Math.max(2, Math.round(r.r - r.l)),
      height: Math.max(2, Math.round(r.b - r.t)),
    });
    const lineX = (x, t, b) => box({ l: x - 1, r: x + 1, t, b });
    const lineY = y => box({ l: SX, r: SX + W, t: y - 1, b: y + 1 });
    const cbox = (c, t, b) => box({ l: c.l, r: c.r, t, b });
    // clip-aware rects: overflow (per axis) and contain:paint along the containing-block chain; fixed boxes escape
    const ownClip = el => {
      const s = cs(el);
      if (s.display === "inline" || s.display === "contents") return null;
      const cx = s.overflowX !== "visible",
        cy = s.overflowY !== "visible",
        cp = /paint|strict|content/.test(s.contain || "");
      if (!cx && !cy && !cp) return null;
      const r = el.getBoundingClientRect();
      const l = r.left + SX + el.clientLeft,
        t = r.top + SY + el.clientTop;
      return {
        l: cx || cp ? l : -1e9,
        r: cx || cp ? l + el.clientWidth : 1e9,
        t: cy || cp ? t : -1e9,
        b: cy || cp ? t + el.clientHeight : 1e9,
      };
    };
    const cbOf = el => {
      const pos = cs(el).position;
      if (pos === "fixed") return null;
      let p = el.parentElement;
      if (pos === "absolute")
        while (p && p !== body && cs(p).position === "static" && cs(p).transform === "none") p = p.parentElement;
      return p;
    };
    const clipMemo = new Map();
    const clipFor = el => {
      if (clipMemo.has(el)) return clipMemo.get(el);
      let res = INF;
      const p = cbOf(el);
      if (p && p !== body && p !== de) {
        res = clipFor(p);
        const oc = ownClip(p);
        if (oc) res = inter(res, oc);
      }
      clipMemo.set(el, res);
      return res;
    };
    const merge = iv => {
      const a = iv.filter(x => x[1] > x[0]).sort((x, y) => x[0] - y[0]);
      const out = [];
      for (const x of a) {
        const l = out[out.length - 1];
        if (l && x[0] <= l[1]) l[1] = Math.max(l[1], x[1]);
        else out.push([x[0], x[1]]);
      }
      return out;
    };
    const lenIn = (m, a, b) => {
      let s = 0;
      for (const [p, q2] of m) {
        const lo = Math.max(p, a),
          hi = Math.min(q2, b);
        if (hi > lo) s += hi - lo;
      }
      return s;
    };
    const clusterBy = (items, key, tol) => {
      const a = [...items].sort((p, q2) => key(p) - key(q2));
      const out = [];
      for (const x of a) {
        const c = out[out.length - 1];
        if (c && key(x) - c.max <= tol) {
          c.items.push(x);
          c.max = key(x);
        } else out.push({ min: key(x), max: key(x), items: [x] });
      }
      for (const c of out) {
        const v = c.items.map(key).sort((p, q2) => p - q2);
        c.center = v[Math.floor(v.length / 2)];
        c.n = v.length;
      }
      return out;
    };
    const modeOf = (vals, tol, pick) => {
      if (!vals.length) return null;
      const cl = clusterBy(vals, v => v, tol);
      cl.sort((a, b) => b.n - a.n || (pick === "max" ? b.center - a.center : a.center - b.center));
      return cl[0].center;
    };
    const RANK = { PASS: 0, WARN: 1, FAIL: 2, ERROR: 3 };
    const worst = vs => vs.reduce((a, v) => (RANK[v] > RANK[a] ? v : a), "PASS");
    // offenders told once per element and wording (numbers aside), at most 25 a test
    const test = (tid, verdict, offenders) => {
      const seen = new Set(),
        o = (offenders || []).filter(x => {
          const k = x.sel + "|" + x.msg.replace(/\d+(\.\d+)?/g, "#");
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      return { id: tid, verdict, offenders: o.slice(0, 25), more: Math.max(0, o.length - 25) };
    };

    const allEls = [...body.querySelectorAll("*")].filter(e => !SKIPTAG.test(TU(e)));

    // ---- header, action bar, navH, barH
    let header = document.querySelector("header.nav");
    if (!header || !visible(header)) {
      header = null;
      for (const e of document.querySelectorAll("header, [role=banner]")) {
        if (!visible(e) || e.closest("main, footer, article")) continue;
        const r = e.getBoundingClientRect();
        if (r.width >= 0.5 * W && r.top < H / 3 && r.height > 0 && r.height < H / 2) {
          header = e;
          break;
        }
      }
    }
    const fixedEls = allEls.filter(e => {
      const p = cs(e).position;
      return (p === "fixed" || p === "sticky") && visible(e);
    });
    let navH = 0;
    for (const e of fixedEls) {
      if (e.closest("main") && e !== header && !(header && header.contains(e))) continue;
      const r = e.getBoundingClientRect();
      if (r.top <= 1 && r.bottom > 0 && r.height >= 20 && r.height < H / 3 && r.width >= 0.8 * W)
        navH = Math.max(navH, r.bottom);
    }
    let actionbar = document.querySelector("nav.actionbar");
    if (actionbar && (!visible(actionbar) || cs(actionbar).position !== "fixed")) actionbar = null;
    if (!actionbar)
      for (const e of fixedEls) {
        if (cs(e).position !== "fixed") continue;
        const r = e.getBoundingClientRect();
        if (r.bottom >= H - 1 && r.top > H / 2 && r.width >= 0.8 * W && r.height >= 20 && r.height <= H / 4) {
          actionbar = e;
          break;
        }
      }
    const barH = actionbar ? Math.max(0, H - actionbar.getBoundingClientRect().top) : 0;
    // the visible region V of a screen: under the nav, above the action bar
    const V = [navH, H - barH];

    // ---- sections: the children of <main> (or of the body, one wrapper unwrapped), then the footers
    const main = document.querySelector("main");
    const okChild = e => !SKIPTAG.test(TU(e)) && visible(e) && e.getBoundingClientRect().height > 0;
    const notChrome = e =>
      e !== header
      && e !== actionbar
      && !(header && e.contains(header) && e.children.length < 2)
      && cs(e).position !== "fixed"
      && !srOnly(e);
    let list;
    if (main) list = [...main.children].filter(e => okChild(e) && notChrome(e));
    else {
      notes.push("no <main>: top-level body children are used as sections");
      list = [...body.children].filter(e => okChild(e) && notChrome(e));
    }
    // no <main>: one wrapper (div#root and the like) is unwrapped, up to 4 levels; a lone <section> or footer never is
    for (
      let k = 0;
      k < 4 && !main && list.length === 1 && !/^(SECTION|ARTICLE|FOOTER|HEADER|NAV)$/.test(TU(list[0]));
      k++
    ) {
      const kids = [...list[0].children].filter(
        e => okChild(e) && notChrome(e) && e.getBoundingClientRect().height > 40,
      );
      if (kids.length >= 2) {
        notes.push("a single wrapper <" + list[0].tagName.toLowerCase() + "> was unwrapped to find sections");
        list = kids;
      } else break;
    }
    for (const f of document.querySelectorAll("footer")) {
      if (!visible(f) || f.parentElement.closest("footer") || (header && header.contains(f))) continue;
      if (list.some(s => s === f || s.contains(f) || f.contains(s))) continue;
      if (main && f.contains(main)) continue;
      if (f.getBoundingClientRect().height > 0) list.push(f);
    }
    list = list.filter((e, _, a) => !a.some(o => o !== e && o.contains(e)));
    list.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    const wrapOf = root => {
      const w = root.querySelector(":scope > .wrap") || root.querySelector(".wrap");
      return w && visible(w) ? w : null;
    };
    const closingEl =
      list.find(e => e.matches("footer.closing"))
      || (list.length && TU(list[list.length - 1]) === "FOOTER" ? list[list.length - 1] : null);
    const S = list.map((el, i) => {
      const r = rectOf(el);
      return {
        el,
        i,
        top: r.t,
        bottom: r.b,
        h: r.b - r.t,
        l: r.l,
        r: r.r,
        isHero: i === 0,
        isClosing: el === closingEl,
        wrap: wrapOf(el),
      };
    });
    const secR = s => ({ l: s.l, t: s.top, r: s.r, b: s.bottom });
    const secMemo = new Map();
    const secIdx = el => {
      if (!el || el === body || el === de) return -1;
      if (secMemo.has(el)) return secMemo.get(el);
      const k = list.indexOf(el);
      const v = k !== -1 ? k : secIdx(el.parentElement);
      secMemo.set(el, v);
      return v;
    };
    // a part that moves as it is measured is told as a WARN: a running finite animation on it or round it, a scroll
    // scene, or a sticky stage held on screen (an endless loop is no reason: it never comes to rest)
    const moveMemo = new Map();
    // a big scene ([data-big-scene]; [data-scene] is the objects kit's photo scene, no big scene) or a dealt scroll moment ([data-scroll-moment], [data-moment])
    const SCENEQ = "[data-big-scene], [data-scroll-moment], [data-moment][data-moment-mounted]";
    const sceneSec = s => s.el.matches(SCENEQ) || !!s.el.querySelector(SCENEQ);
    const movingOf = el => {
      if (!el || el.nodeType !== 1 || el === body || el === de) return null;
      if (moveMemo.has(el)) return moveMemo.get(el);
      let v = el.closest(SCENEQ) ? "scene" : null;
      if (!v && list.indexOf(el) !== -1 && el.querySelector(SCENEQ)) v = "scene"; // a section holding a big scene or a scroll moment
      for (let e = el; !v && e && e !== body && e !== de; e = e.parentElement) {
        if (e === header || e === actionbar) break;
        if (cs(e).position === "sticky" && secIdx(e) >= 0) v = "held";
        else {
          try {
            if (
              e
                .getAnimations()
                .some(
                  a => a.playState === "running" && a.effect && a.effect.getComputedTiming().iterations !== Infinity,
                )
            )
              v = "moving";
          } catch {}
        }
      }
      moveMemo.set(el, v);
      return v;
    };
    // one offender: the element, its words, its box (or r), what is wrong; x adds sev, ref boxes, at (a scroll top)
    const off = (el, r, msg, x) =>
      Object.assign(
        {
          sel: el ? selOf(el) : "body",
          text: el ? words(el) : "",
          doc:
            r ? box(r)
            : el ? box(rectOf(el))
            : null,
          moving: el ? movingOf(el) : null,
          msg,
        },
        x || {},
      );
    const sh = document.scrollingElement.scrollHeight,
      maxY = Math.max(0, sh - H);
    const pageKind = (document.querySelector('meta[name="page-kind"]') || {}).content || "";
    const harness = {
      W,
      H,
      navH: rnd(navH),
      barH: rnd(barH),
      scrollHeight: sh,
      screens: rnd(sh / H),
      pageKind: pageKind || null,
      sections: S.map(s => ({
        n: s.i + 1,
        sel: selOf(s.el),
        text: words(s.el),
        top: rnd(s.top),
        h: rnd(s.h),
        doc: box(secR(s)),
        wrap: !!s.wrap,
      })),
      notes,
      container: null,
    };
    harness.expandables = (main || body).querySelectorAll(
      'details:not([open]), [aria-expanded="false"], [role="tab"]',
    ).length;
    const RULES = ["SR-1", "SR-2", "SR-3", "SR-4", "SR-5", "SR-6", "SR-7", "SR-8"];
    if (!S.length)
      return {
        harness,
        status: { rowItems: {}, splitCols: {} },
        tests: RULES.filter(r => !opt.only || opt.only.includes(r)).map(rule => ({
          rule,
          id: "T0",
          verdict: "FAIL",
          more: 0,
          offenders: [
            {
              sel: "body",
              text: "",
              doc: null,
              moving: null,
              msg: "no sections found: nothing in <main>, or at the top of the page, to measure",
            },
          ],
        })),
      };

    // ---- one pass: rendered boxes, content boxes, decorated boxes
    // a layer is an img, picture (with its img), video or canvas that is a DIRECT child of a section (beside .wrap), with
    // class layer or position:absolute spanning 0 to W; the same picture inside .wrap is content, so SR-6 T2 tests it
    const layerMemo = new Map(),
      secSet = new Set(list);
    // a <picture> (the hero photos.mjs fetch prints: a phone <source> and one <img>) is one image: when the picture
    // stays in the flow and its img is the positioned one, the img's box and position stand for the picture
    const picImg = p => {
      if (TU(p) !== "PICTURE" || /absolute|fixed/.test(cs(p).position)) return null;
      const i = p.querySelector(":scope > img");
      return i && /absolute|fixed/.test(cs(i).position) ? i : null;
    };
    const layerOf = el => {
      if (layerMemo.has(el)) return layerMemo.get(el);
      let v = false,
        m = el;
      if (TU(m) === "IMG" && m.parentElement && TU(m.parentElement) === "PICTURE") m = m.parentElement;
      if (/^(IMG|PICTURE|VIDEO|CANVAS)$/.test(TU(m)) && m.parentElement && secSet.has(m.parentElement)) {
        const pm = picImg(m) || m;
        if (m.classList.contains("layer") || el.classList.contains("layer")) v = true;
        else {
          const s = cs(pm);
          if (s.position === "absolute") {
            const r = rectOf(pm);
            v = r.l <= SX + 1 && r.r >= SX + W - 1;
          }
        }
      }
      layerMemo.set(el, v);
      return v;
    };
    // a photograph in the hero that runs from one edge of the screen to the other (heroes.json product: "a photograph: the full
    // screen width, down to the fold"): symmetric bleed, read like a layer, never as content past the container's lines
    const bleedPic = (el, r) =>
      secIdx(el) === 0 && /^(IMG|PICTURE|VIDEO|CANVAS)$/.test(TU(el)) && r.l <= SX + 1 && r.r >= SX + W - 1;
    // SR-6 T1: what is wrong with a layer child of section s (also decides SR-3's fill 1.0)
    const layerProblems = (k0, s) => {
      const k = picImg(k0) || k0,
        r = rectOf(k),
        probs = [];
      if (!/^(IMG|PICTURE|VIDEO|CANVAS)$/.test(TU(k0))) probs.push("not img, picture, video or canvas");
      if (cs(k).position !== "absolute") probs.push("position " + cs(k).position + ", not absolute");
      if (Math.abs(r.l - SX) > 1 || Math.abs(r.r - SX - W) > 1)
        probs.push("does not span the screen from 0 to " + W + "px");
      if (r.t < s.top - 1 || r.b > s.bottom + 1) probs.push("runs outside the section box");
      if (cs(k).zIndex !== "0") probs.push("z-index " + cs(k).zIndex + ", not 0");
      const ah = k.getAttribute("aria-hidden") === "true";
      if (s.isHero) {
        const img = TU(k) === "IMG" ? k : k.querySelector && k.querySelector("img");
        if (!ah && !(img && img.hasAttribute("alt")))
          probs.push('a hero layer with neither alt nor aria-hidden="true"');
      } else {
        if (ht(r) < 0.9 * s.h)
          probs.push("covers " + Math.round((ht(r) / s.h) * 100) + "% of the section height, needs 90%");
        if (!ah) probs.push('not aria-hidden="true"');
      }
      return probs;
    };
    const fixMemo = new Map();
    const inFixed = (el, stop) => {
      if (!el || el === stop || el === body) return false;
      if (fixMemo.has(el)) return fixMemo.get(el);
      const v = cs(el).position === "fixed" || inFixed(el.parentElement, stop);
      fixMemo.set(el, v);
      return v;
    };
    const zoneOf = el => {
      const z = secIdx(el);
      if (z >= 0) return z;
      if (header && header.contains(el)) return "H";
      if (actionbar && actionbar.contains(el)) return "B";
      return null;
    };
    const rendered = [],
      boxes = [],
      decorated = [];
    const rg = document.createRange();
    for (const el of allEls) {
      const tag = TU(el);
      if (el instanceof SVGElement && tag !== "SVG") continue;
      const z = zoneOf(el);
      if (z === null) continue;
      if (typeof z === "number" && (el === S[z].el || inFixed(el, S[z].el))) continue;
      if (!visible(el) || srOnly(el)) continue;
      const s = cs(el);
      const raw = rectOf(el),
        clip = clipFor(el),
        r = inter(raw, clip);
      const big = wd(r) >= 2 && ht(r) >= 2;
      const layer = typeof z === "number" && layerOf(el);
      if (big) rendered.push({ el, z, r, raw, layer });
      let own = null;
      for (const n of el.childNodes) {
        if (n.nodeType !== 3 || !/\S/.test(n.data)) continue;
        if (!own) {
          const oc = ownClip(el);
          own = oc ? inter(clip, oc) : clip;
        }
        rg.selectNodeContents(n);
        for (const cr of rg.getClientRects()) {
          if (cr.width < 1 || cr.height < 1) continue;
          const lr = inter(R(cr), own);
          if (wd(lr) >= 2 && ht(lr) >= 2) boxes.push({ el, z, kind: "text", r: lr });
        }
      }
      if (!big || layer) continue;
      const ariaHidden = !!el.closest('[aria-hidden="true"]');
      // a product render ([data-product]) is one picture: its frame is the box (its still is aria-hidden, its canvas is
      // freed), so split-pair, T6 and the rest measure the frame, never the parts inside it
      const prod = el.closest("[data-product]");
      if (prod === el) {
        if (wd(raw) >= 48 && ht(raw) >= 48) boxes.push({ el, z, kind: "media", r });
      } else if (prod && /^(IMG|VIDEO|SVG|CANVAS|PICTURE)$/.test(tag)) {
        /* a part of the frame above */
      } else if (/^(IMG|VIDEO|SVG|CANVAS)$/.test(tag)) {
        if (!ariaHidden && wd(raw) >= 48 && ht(raw) >= 48) boxes.push({ el, z, kind: "media", r });
      } else if (
        /url\(|image-set\(/.test(s.backgroundImage || "")
        && wd(raw) >= 48
        && ht(raw) >= 48
        && el !== header
        && el !== actionbar
      )
        boxes.push({ el, z, kind: "bg", r });
      if (/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(tag)) boxes.push({ el, z, kind: "control", r });
      if (boxed(el)) decorated.push({ el, z, r });
    }
    const boxesBySec = S.map(() => []),
      decoBySec = S.map(() => []);
    for (const b of boxes) if (typeof b.z === "number") boxesBySec[b.z].push(b);
    for (const d of decorated) if (typeof d.z === "number") decoBySec[d.z].push(d);
    const contentAnc = new Set(),
      textUnion = new Map();
    for (const b of boxes) {
      for (let e = b.el; e && e !== body && !contentAnc.has(e); e = e.parentElement) contentAnc.add(e);
      if (b.kind === "text") {
        const u = textUnion.get(b.el);
        textUnion.set(
          b.el,
          u ?
            { l: Math.min(u.l, b.r.l), t: Math.min(u.t, b.r.t), r: Math.max(u.r, b.r.r), b: Math.max(u.b, b.r.b) }
          : { ...b.r },
        );
      }
    }

    // ---- container: .wrap where it exists, else the outermost block edges
    const BLOCKISH = /^(block|flex|grid|list-item|table|flow-root)$/;
    const inferEdges = pred => {
      const ls = [],
        rs = [];
      for (const it of rendered) {
        if (!pred(it) || it.layer || !contentAnc.has(it.el) || !BLOCKISH.test(cs(it.el).display)) continue;
        // full-bleed and near-full-bleed boxes are skipped (both margins under 40px: inset bands and rounded frames at 16px;
        // on a phone under 12px, since its own container sits 16-24px in and every text block spans it)
        const bleed = phone ? 12 : 40;
        if (wd(it.r) < 48 || (it.r.l - SX < bleed && SX + W - it.r.r < bleed)) continue;
        if (it.r.l < SX + W / 2) ls.push(it.r.l);
        if (it.r.r > SX + W / 2) rs.push(it.r.r);
      }
      if (!ls.length || !rs.length) return null;
      // the outermost block content edges, not the most common ones: a section of indented items (an FAQ list, a centred
      // closing block inside a full-width frame) otherwise gets their edge as its container, and its own h2 and frame then
      // read as outside it (seen on a test page); a box that really overhangs is still caught by SR-6 T2
      return { l: Math.min(...ls), r: Math.max(...rs) };
    };
    const ctns = S.map((s, i) => {
      if (s.wrap) {
        const r = rectOf(s.wrap);
        return { l: r.l, r: r.r, src: "wrap" };
      }
      const e = inferEdges(it => it.z === i);
      return e ? { l: e.l, r: e.r, src: "inferred" } : null;
    });
    const headerWrap = header ? wrapOf(header) : null;
    const hBoxes = boxes.filter(b => b.z === "H" && !(b.r.l <= SX + 1 && b.r.r >= SX + W - 1));
    const headerEdges =
      hBoxes.length ? { l: Math.min(...hBoxes.map(b => b.r.l)), r: Math.max(...hBoxes.map(b => b.r.r)) } : null;
    const headerCtn =
      headerWrap ? { ...rectOf(headerWrap), src: "wrap" }
      : headerEdges ? { ...headerEdges, src: "inferred (first and last box)" }
      : null;
    const abWrap = actionbar ? wrapOf(actionbar) : null;
    const anyWrap = S.some(s => s.wrap) || !!headerWrap;
    const pool = ctns.filter(Boolean).concat(headerWrap ? [headerCtn] : []);
    const pageCtn =
      pool.length ?
        {
          l: modeOf(
            pool.map(c => c.l),
            2,
            "min",
          ),
          r: modeOf(
            pool.map(c => c.r),
            2,
            "max",
          ),
          src: anyWrap ? "most common .wrap edges" : "inferred: most common block content edges (no .wrap)",
        }
      : { l: SX, r: SX + W, src: "viewport (nothing to infer)" };
    // an inferred container that matches the page on one side and stops short on the other only means the content stops
    // early (a hero with its text on the left over a photo layer), not a narrower container: that side snaps to the page's
    for (const c of ctns)
      if (c && c.src === "inferred") {
        if (Math.abs(c.l - pageCtn.l) <= 4 && c.r < pageCtn.r - 8) c.r = pageCtn.r;
        if (Math.abs(c.r - pageCtn.r) <= 4 && c.l > pageCtn.l + 8) c.l = pageCtn.l;
      }
    const C = z =>
      z === "H" ?
        headerWrap ? headerCtn
        : pageCtn
      : z === "B" ?
        abWrap ? rectOf(abWrap)
        : pageCtn
      : ctns[z] || pageCtn;
    harness.container = {
      left: rnd(pageCtn.l),
      right: rnd(pageCtn.r),
      leftMargin: rnd(pageCtn.l - SX),
      rightMargin: rnd(SX + W - pageCtn.r),
      src: pageCtn.src,
    };

    // ---- grids, SR-7 rows and SR-8 splits
    const innerBox = el => {
      const r = rectOf(el),
        s = cs(el);
      return {
        l: r.l + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft),
        r: r.r - parseFloat(s.borderRightWidth) - parseFloat(s.paddingRight),
        t: r.t,
        b: r.b,
      };
    };
    const inFlowKids = el =>
      [...el.children].filter(
        c =>
          !SKIPTAG.test(TU(c))
          && visible(c)
          && !srOnly(c)
          && !/absolute|fixed/.test(cs(c).position)
          && wd(rectOf(c)) >= 2
          && ht(rectOf(c)) >= 2,
      );
    const trackCount = v =>
      !v || v === "none" ?
        1
      : v
          .replace(/\[[^\]]*\]/g, " ")
          .trim()
          .split(/\s+/)
          .filter(Boolean).length;
    const isCtl = k =>
      /^(INPUT|SELECT|TEXTAREA|LABEL|BUTTON)$/.test(TU(k))
      || k.matches("[role=button], .btn, .button")
      || (TU(k) === "A" && ht(rectOf(k)) <= 64);
    const gridLikes = [];
    for (const it of rendered) {
      const g = it.el;
      if (typeof it.z !== "number" || it.layer || g.closest("header, nav.actionbar")) continue;
      const s = cs(g),
        isFlex = /flex/.test(s.display),
        isGrid = /grid/.test(s.display),
        hasCls = g.classList.contains("grid");
      if (!isFlex && !isGrid && !hasCls) continue;
      const kids = inFlowKids(g);
      if (kids.length < 2) continue;
      const Cz = C(it.z),
        cw = Cz.r - Cz.l,
        gw = wd(it.raw);
      let ok = hasCls;
      if (!ok && isGrid) ok = trackCount(s.gridTemplateColumns) >= 2 && gw >= 0.5 * cw;
      if (!ok && isFlex)
        ok =
          !/column/.test(s.flexDirection)
          && gw >= 0.5 * cw
          && ht(it.raw) >= 48
          && kids.every(k => wd(rectOf(k)) >= 0.15 * cw);
      if (ok) gridLikes.push({ el: g, z: it.z, kids, cls: hasCls });
    }
    const rows = [],
      splits = [],
      rowStat = new Map(),
      splitStat = new Map();
    const MEDIA = "img, picture, video, canvas";
    const picItem = e =>
      (/^(IMG|PICTURE|VIDEO|CANVAS)$/.test(TU(e)) || !!e.querySelector(MEDIA)) && !(e.textContent || "").trim();
    const textItem = e => !e.querySelector(MEDIA) && !!(e.textContent || "").trim() && !boxed(e);
    const nestAnc = (el, z) => {
      for (let e = el.parentElement; e && e !== S[z].el && e !== body; e = e.parentElement)
        if (rowStat.has(e) || splitStat.has(e)) return e;
      return null;
    };
    for (const G of gridLikes) {
      // the rows and columns inside a drawn mock (a file list, a window's rows) are the mock's own layout, not the page's
      // card rows or splits: its frame is judged, not them (seen on a test page)
      if (G.el.closest("[data-ui], .ui, [data-ui-loop], [data-m-loop], [data-diagram]")) continue;
      const items = G.kids.filter(k => !isCtl(k)).map(k => ({ el: k, r: rectOf(k) }));
      const nest = nestAnc(G.el, G.z);
      const Cz = C(G.z),
        cw = Cz.r - Cz.l;
      if (G.kids.length === 2 && items.length === 2) {
        // two columns repeated in three or more sibling rows of one class are a table's rows (a comparison, a spec list),
        // not splits (seen on a test page at 390)
        const twins =
          G.el.parentElement ?
            [...G.el.parentElement.children].filter(
              x => x !== G.el && x.tagName === G.el.tagName && x.className && x.className === G.el.className,
            ).length
          : 0;
        if (twins >= 2) continue;
        const [a, b] = items[0].r.l <= items[1].r.l ? items : [items[1], items[0]];
        const side = a.r.r <= b.r.l + 2 && Math.min(a.r.b, b.r.b) - Math.max(a.r.t, b.r.t) > 0;
        const rowLike = sameKind(a.el, b.el) || (boxed(a.el) && boxed(b.el));
        // a lead beside its buttons (the editorial hero's foot) is an action row, not a split: a column whose words are all
        // inside links or buttons, with no picture, is the pair's controls
        const ctlCol = e => {
          if (e.querySelector(MEDIA)) return false;
          const t = [...e.querySelectorAll("*")].filter(hasDirectText);
          return t.length > 0 && t.every(x => x.closest("a, button, [role=button], .btn"));
        };
        if (side && !rowLike && (ctlCol(a.el) || ctlCol(b.el))) continue;
        if (side && !rowLike) {
          if (G.cls || (wd(a.r) >= 0.25 * cw && wd(b.r) >= 0.25 * cw && ht(rectOf(G.el)) >= 120)) {
            splits.push({ G, z: G.z, left: a, right: b, nested: !!nest });
            splitStat.set(a.el, { card: boxed(a.el) });
            splitStat.set(b.el, { card: boxed(b.el) });
          }
          continue;
        }
      }
      const groups = [];
      for (const itm of [...items].sort((p, q2) => p.r.t - q2.r.t || p.r.l - q2.r.l)) {
        const g = groups.find(gg => Math.abs(gg[0].r.t - itm.r.t) <= 2);
        if (g) g.push(itm);
        else groups.push([itm]);
      }
      for (const g of groups) {
        g.sort((p, q2) => p.r.l - q2.r.l);
        const isRow =
          g.length >= 3 || (g.length === 2 && (sameKind(g[0].el, g[1].el) || (boxed(g[0].el) && boxed(g[1].el))));
        if (!isRow) continue;
        // a photograph beside text groups (the offer's pair or tall-small: two menu groups on span-3, the photograph on
        // span-6) is a composition, not a row of cards: the groups keep one height among themselves, the photographs
        // theirs, and the row still runs line to line; a 4:3 photograph is never stretched to the groups' height
        const kinds = g
          .map(x =>
            picItem(x.el) ? "p"
            : textItem(x.el) ? "t"
            : "?",
          )
          .join("");
        const mixed = /^(t+p+|p+t+)$/.test(kinds);
        rows.push({
          G,
          z: G.z,
          items: g,
          nested: !!nest,
          ref: nest ? innerBox(nest) : Cz,
          footer: !!G.el.closest("footer"),
          kinds: mixed ? kinds : null,
        });
        g.forEach((itm, k) => rowStat.set(itm.el, { card: boxed(itm.el), first: k === 0 }));
      }
    }
    const status = { rowItems: {}, splitCols: {} };
    for (const [e, v] of rowStat) status.rowItems[pathOf(e)] = v;
    for (const [e, v] of splitStat) status.splitCols[pathOf(e)] = v;
    // row and card status is decided at the desktop width and kept by DOM node on the phone
    let tRow = rowStat,
      tSplit = splitStat;
    if (opt.desktop) {
      tRow = new Map();
      tSplit = new Map();
      for (const [p, v] of Object.entries(opt.desktop.rowItems || {})) {
        const e = byPath(p);
        if (e) tRow.set(e, v);
      }
      for (const [p, v] of Object.entries(opt.desktop.splitCols || {})) {
        const e = byPath(p);
        if (e) tSplit.set(e, v);
      }
    }
    const stopAt = z => (typeof z === "number" ? S[z].el : body);
    const rowExempt = (el, z) => {
      for (let e = el; e && e !== stopAt(z) && e !== body; e = e.parentElement) {
        const v = tRow.get(e);
        if (v && (v.card || !v.first)) return v.card ? "card" : "row item, not first";
      }
      return null;
    };
    const anyRowItem = (el, z) => {
      for (let e = el; e && e !== stopAt(z) && e !== body; e = e.parentElement) if (tRow.has(e)) return true;
      return false;
    };
    const splitCard = (el, z) => {
      for (let e = el; e && e !== stopAt(z) && e !== body; e = e.parentElement) {
        const v = tSplit.get(e);
        if (v && v.card) return true;
      }
      return false;
    };
    const inRowOrSplit = (el, z) => {
      for (let e = el; e && e !== stopAt(z) && e !== body; e = e.parentElement)
        if (rowStat.has(e) || splitStat.has(e) || tRow.has(e) || tSplit.has(e)) return true;
      return false;
    };
    const inFooterLinks = (el, z) => {
      const f = el.closest("footer");
      if (!f) return false;
      if (el.closest("footer nav, footer ul, footer ol, footer dl")) return true;
      for (let e = el; e && e !== f; e = e.parentElement) if (tRow.has(e) || rowStat.has(e)) return true;
      return false;
    };
    const scopeOf = (el, z) => {
      for (let e = el.parentElement; e && e !== S[z].el && e !== body; e = e.parentElement)
        if (splitStat.has(e)) return e;
      return S[z].el;
    };
    const kLines = c => {
      const w = c.r - c.l;
      return [5, 6, 7].map(k => ({ k, x: c.l + (k * (w + 24)) / 12 }));
    };

    // ---- section headings: h1 and h2, and text of 40px or more (28px on a phone) outside rows, cards and footer links
    const headTh = phone ? 28 : 40;
    const heads = [];
    for (const it of rendered) {
      if (typeof it.z !== "number") continue;
      const el = it.el,
        tag = TU(el);
      if (tag === "H1" || tag === "H2") {
        heads.push({ z: it.z, el, r: it.r, tag: tag.toLowerCase() });
        continue;
      }
      if (/^H[3-6]$/.test(tag) || el.closest("h1,h2,h3,h4,h5,h6,nav.actionbar") || (header && header.contains(el)))
        continue;
      // a statement's sentence is set large on purpose and sits at its section's foot (system.css, 2.5.2): a sentence, not
      // a section heading beside the next one
      if (el.closest("main > section.statement")) continue;
      if (!hasDirectText(el) || parseFloat(cs(el).fontSize) < headTh) continue;
      if (anyRowItem(el, it.z) || rowExempt(el, it.z) || splitCard(el, it.z) || inFooterLinks(el, it.z)) continue;
      const tr = textUnion.get(el);
      if (!tr) continue;
      heads.push({ z: it.z, el, r: tr, tag: "text " + Math.round(parseFloat(cs(el).fontSize)) + "px" });
    }

    const tests = [];
    const run = (rid, fn) => {
      if (opt.only && !opt.only.includes(rid)) return;
      try {
        for (const t of fn()) tests.push(Object.assign({ rule: rid }, t));
      } catch (e) {
        tests.push({
          rule: rid,
          id: "error",
          verdict: "ERROR",
          msg: "checker error: " + (e && e.message),
          offenders: [],
          more: 0,
        });
      }
    };
    const outside = i => rendered.filter(it => it.z === i && (it.r.t < S[i].top - 1 || it.r.b > S[i].bottom + 1));
    const padbTok = cssVar("--padb", phone ? 48 : 72);
    const isG2 = s => (s.el.classList.contains("g2") || (phone && s.el.classList.contains("g2m"))) && s.h > 1.5 * H;
    const firstLeft = el => {
      if (TU(el) === "LI") {
        const ic = el.querySelector(":scope > svg, :scope > img, :scope > span > svg, :scope > i");
        if (ic && visible(ic) && wd(rectOf(ic)) >= 2) return rectOf(ic).l;
      }
      const r2 = document.createRange();
      r2.selectNodeContents(el);
      const rs = [...r2.getClientRects()].filter(r => r.width >= 1 && r.height >= 1);
      return rs.length ? rs[0].left + SX : rectOf(el).l;
    };
    const andBar = barH ? ` and the ${px(barH)}px action bar` : "";

    // ---- SR-1 the hero is exactly one screen and nothing below it shows
    run("SR-1", () => {
      const hero = S[0],
        T = [],
        heroR = secR(hero);
      const b = hero.bottom - SY;
      // T1: the hero's bottom at scroll 0 within H +/- 1 (the crop sits between the fold and the hero's bottom)
      T.push(
        test(
          "T1",
          Math.abs(b - H) <= 1 ? "PASS" : "FAIL",
          Math.abs(b - H) <= 1 ?
            []
          : [
              off(
                hero.el,
                heroR,
                `the hero ends at ${px(b)}px on a ${H}px screen, ${px(Math.abs(b - H))}px ${b > H ? "below" : "above"} the fold: it ends at the fold, 1px either way`,
                { d: Math.abs(b - H), ref: [lineY(SY + H)], at: b > H ? Math.round(SY + b / 2) : 0 },
              ),
            ],
        ),
      );
      // T2: nothing of the second section (its own box or any part of it) on the first screen, 1px allowed
      let peek = 0;
      const off2 = [];
      if (S[1]) {
        let top = S[1].top;
        for (const it of rendered) if (it.z === 1) top = Math.min(top, it.r.t);
        peek = Math.max(0, H - (top - SY));
        if (peek > 1)
          off2.push(
            off(
              S[1].el,
              { l: S[1].l, r: S[1].r, t: top, b: Math.max(top + 2, Math.min(S[1].bottom, SY + H)) },
              `${px(peek)}px of the next section shows on the first screen (from ${px(top - SY)}px on a ${H}px screen): nothing below the hero shows at load`,
              { d: peek, ref: [box(heroR)], at: 0 },
            ),
          );
      }
      T.push(test("T2", peek <= 1 ? "PASS" : "FAIL", off2));
      // T3: the hero holds its content: no inner scroll, no clip-aware part beyond its box
      // (a hero set to overflow: clip neither scrolls nor spills: what overhangs it is its ground's own drawing, cut at its
      // foot (the dome of .bg-horizon); a real part outside it is still read by outside() here)
      const sc = cs(hero.el).overflowY === "clip" ? hero.el.clientHeight : hero.el.scrollHeight,
        ch = hero.el.clientHeight,
        out = outside(0),
        off3 = [];
      if (sc > ch + 1)
        off3.push(
          off(
            hero.el,
            heroR,
            `the hero's content is ${sc - ch}px taller than the hero (scrollHeight ${sc}, clientHeight ${ch}): it spills out or scrolls inside it`,
            { at: 0 },
          ),
        );
      for (const it of out)
        off3.push(
          off(
            it.el,
            it.r,
            `${q(it.el)} lies outside the hero's box (${px(it.r.t - SY)}-${px(it.r.b - SY)}px, the hero ${px(hero.top - SY)}-${px(b)}px)`,
            { ref: [box(heroR)] },
          ),
        );
      T.push(test("T3", sc <= ch + 1 && !out.length ? "PASS" : "FAIL", off3));
      // T4: hero content boxes (layers aside, CSS background photos count) between navH and H - 24 - barH; a docked
      // strip at most 96px on a desktop
      const hb = boxesBySec[0],
        limit = H - 24 - barH,
        off4 = [];
      for (const x of hb) {
        if (bleedPic(x.el, x.r)) continue; // the product stage's photograph runs edge to edge down to the fold (heroes.json)
        if (x.r.b - SY > limit + 0.5)
          off4.push(
            off(
              x.el,
              x.r,
              `${q(x.el)} ends at ${px(x.r.b - SY)}px, below the hero's content line at ${px(limit)}px (the ${H}px screen less 24px${andBar})`,
              { d: x.r.b - SY - limit, ref: [lineY(SY + limit)] },
            ),
          );
        else if (x.r.t - SY < navH - 0.5)
          off4.push(
            off(x.el, x.r, `${q(x.el)} starts at ${px(x.r.t - SY)}px, under the ${px(navH)}px nav`, {
              d: navH - (x.r.t - SY),
              ref: [lineY(SY + navH)],
              at: 0,
            }),
          );
      }
      const strips = [];
      if (hero.wrap) {
        const kids = [...hero.wrap.children].filter(
          k => visible(k) && !/absolute|fixed/.test(cs(k).position) && ht(rectOf(k)) >= 2,
        );
        if (kids.some(k => k.classList.contains("hero-text")))
          for (const k of kids) if (!k.classList.contains("hero-text")) strips.push(k);
      }
      for (const k of phone ? [] : strips.filter(k => ht(rectOf(k)) > 96))
        off4.push(
          off(k, null, `a strip docked in the hero is ${px(ht(rectOf(k)))}px tall: at most 96px on a desktop`, {
            d: ht(rectOf(k)) - 96,
            at: 0,
          }),
        );
      T.push(test("T4", off4.length ? "FAIL" : "PASS", off4));
      // T5: every layer inside the hero's box
      const off5 = rendered
        .filter(
          it =>
            it.z === 0
            && it.layer
            && (it.raw.t < hero.top - 1
              || it.raw.b > hero.bottom + 1
              || it.raw.l < hero.l - 1
              || it.raw.r > hero.r + 1),
        )
        .map(it =>
          off(
            it.el,
            it.raw,
            `the hero's background layer runs outside the hero's box (${px(it.raw.l - SX)}-${px(it.raw.r - SX)} x ${px(it.raw.t - SY)}-${px(it.raw.b - SY)}px)`,
            { ref: [box(heroR)] },
          ),
        );
      T.push(test("T5", off5.length ? "FAIL" : "PASS", off5));
      return T;
    });

    // ---- SR-2 every other section is exactly 1H or 2H, on the H grid, its content fits
    run("SR-2", () => {
      const T = [],
        hOff = [],
        gOff = [],
        fOff = [];
      let hv = "PASS",
        gv = "PASS";
      // T-height: within 2px of H or 2H PASS, 3-8px WARN, else FAIL (the hero aside, the closing counted)
      for (const s of S) {
        if (s.isHero) continue;
        // photo-chapters is (hold + 1) screens live: three for three chapters, four for four or five (moments.md)
        const ks =
          (
            s.el.matches('[data-moment="photo-chapters"][data-moment-mounted]')
            || s.el.querySelector('[data-moment="photo-chapters"][data-moment-mounted]')
          ) ?
            [1, 2, 3, 4]
          : [1, 2];
        const k0 = ks.reduce((a, k) => (Math.abs(s.h - k * H) < Math.abs(s.h - a * H) ? k : a), ks[0]);
        const d = Math.abs(s.h - k0 * H);
        const v =
          d <= 2 ? "PASS"
          : d <= 8 ? "WARN"
          : "FAIL";
        const target = k0 * H,
          end = s.top + target;
        // a scene's section is held to 1H or 2H too (ST-02, MO-10): its height is the fault, so it stays a FAIL with the
        // scene's own fix, never softened as a moving part
        const sc = sceneSec(s);
        if (v !== "PASS")
          hOff.push(
            off(
              s.el,
              { l: SX, r: SX + W, t: Math.min(s.bottom, end), b: Math.max(s.bottom, end) },
              `the ${sc ? "scene's " : ""}section is ${px(s.h)}px tall (${rnd(s.h / H)} screens), ${px(d)}px ${s.h > target ? "over" : "short of"} ${["one screen", "two screens", "three screens", "four screens"][k0 - 1]} (${target}px): every section after the hero is one screen or two, 2px either way${sc ? "; a pinned scene is (hold + 1) screens tall, so write data-big-scene-opts='{\"hold\": 1}' (two screens) and keep --h on the section" : ""}`,
              {
                sev: v,
                d,
                ref: [lineY(end)],
                at: Math.round((s.bottom + end) / 2 - H / 2),
                ...(sc ? { moving: null } : {}),
              },
            ),
          );
        hv = worst([hv, v]);
      }
      T.push(test("T-height", hv, hOff));
      // T-grid: each section's page top within 2px of k*H PASS, 3-8px WARN, else FAIL
      for (const s of S) {
        const g = Math.round(s.top / H) * H,
          dt = s.top - g;
        const v =
          Math.abs(dt) <= 2 ? "PASS"
          : Math.abs(dt) <= 8 ? "WARN"
          : "FAIL";
        if (v !== "PASS")
          gOff.push(
            off(
              s.el,
              { l: SX, r: SX + W, t: Math.min(s.top, g), b: Math.max(s.top, g) },
              `the section starts at ${px(s.top)}px, ${px(Math.abs(dt))}px ${dt > 0 ? "below" : "above"} the screen grid (${Math.round(s.top / H)} x ${H}px): sections start on whole screens`,
              { sev: v, d: Math.abs(dt), ref: [lineY(g)], at: Math.round(s.top - H / 2) },
            ),
          );
        gv = worst([gv, v]);
      }
      T.push(test("T-grid", gv, gOff));
      // T-fit: no inner scroll, the lowest content box at or above bottom - padb - barH, nothing outside the box; a .g2
      // section's first screen group ends by H - padb - barH
      for (const s of S) {
        if (s.isHero) continue;
        const sc = cs(s.el).overflowY === "clip" ? s.el.clientHeight : s.el.scrollHeight,
          ch = s.el.clientHeight; // (overflow: clip as in SR-1 T3)
        const bx = boxesBySec[s.i];
        const low = bx.length ? Math.max(...bx.map(x => x.r.b)) : null;
        const limit = s.bottom - padbTok - barH;
        const probs = [];
        if (sc > ch + 1)
          probs.push(`its content is ${sc - ch}px taller than the section (scrollHeight ${sc}, clientHeight ${ch})`);
        const lowOver = low != null && low > limit + 0.5;
        if (lowOver)
          probs.push(
            `its lowest content ends ${px(low - s.top)}px below its top, past ${px(limit - s.top)}px (the section less ${px(padbTok)}px of bottom padding${andBar})`,
          );
        // (a dealt moment's parts at their start state, letters waiting to fly into the line, are the moment's own)
        const out = outside(s.i).filter(it => !it.el.closest("[data-moment][data-moment-mounted]"));
        if (out.length) probs.push(`${out.length} part${out.length > 1 ? "s lie" : " lies"} outside the section's box`);
        if (isG2(s)) {
          const g1 = bx.filter(x => x.r.t < s.top + H);
          const g1b = g1.length ? Math.max(...g1.map(x => x.r.b)) : null;
          if (g1b != null && g1b > s.top + H - padbTok - barH + 0.5)
            probs.push(
              `its first screen group ends ${px(g1b - s.top)}px below its top, past ${px(H - padbTok - barH)}px`,
            );
        }
        if (!probs.length) continue;
        const c = C(s.i);
        fOff.push(
          off(
            s.el,
            lowOver ? { l: c.l, r: c.r, t: limit, b: low } : secR(s),
            `the section's content does not fit it: ${probs.join("; ")}`,
            lowOver ? { d: low - limit, ref: [lineY(limit)], at: Math.round(Math.max(low, limit) - H + 80) } : {},
          ),
        );
        for (const it of out.slice(0, 3))
          fOff.push(
            off(
              it.el,
              it.r,
              `${q(it.el)} lies outside section ${s.i + 1} (${px(it.r.t - s.top)} to ${px(it.r.b - s.top)}px from its top; the section is ${px(s.h)}px tall)`,
              { ref: [box(secR(s))] },
            ),
          );
      }
      T.push(test("T-fit", fOff.length ? "FAIL" : "PASS", fOff));
      // T-total, place pages (merged CK-18): 3.0-6.05 screens PASS, 6.05-7 WARN, under 3 WARN unless
      // data-page-mode="short" (CK-56), over 7 FAIL
      if (pageKind === "place") {
        const ratio = sh / H,
          short = !!document.querySelector('[data-page-mode="short"]');
        const tv =
          ratio > 7 ? "FAIL"
          : ratio > 6.05 ? "WARN"
          : ratio < 3 && !short ? "WARN"
          : "PASS";
        T.push(
          test(
            "T-total",
            tv,
            tv === "PASS" ?
              []
            : [
                off(
                  main || body,
                  null,
                  `the page is ${rnd(ratio)} screens long (${sh}px on a ${H}px screen): a place page runs 3 to 6 screens (over 7 FAIL)`,
                  { sev: tv, doc: null, text: "" },
                ),
              ],
          ),
        );
      }
      // T-snap (ST-02, SR-9 T1): the one-section look comes from heights and padding only, never from scroll-snap
      {
        const sn = [de, body, ...allEls].filter(e => {
          const v = cs(e).scrollSnapType;
          return v && v !== "none";
        });
        T.push(
          test(
            "T-snap",
            sn.length ? "FAIL" : "PASS",
            sn.slice(0, 3).map(e =>
              off(
                e === de || e === body ? null : e,
                null,
                `scroll-snap-type: ${cs(e).scrollSnapType} on ${
                  e === de ? "the html element"
                  : e === body ? "the body"
                  : q(e)
                }: sections are one or two screens by their height and padding, the scroll is the browser's own`,
                { moving: null, doc: null },
              ),
            ),
          ),
        );
      }
      return T;
    });

    // ---- SR-3 air between sections, sections not mostly empty, no dividers
    run("SR-3", () => {
      const T = [];
      const block = s => {
        let bx = boxesBySec[s.i];
        if (s.wrap) bx = bx.filter(x => s.wrap.contains(x.el));
        if (!bx.length) return null;
        return { t: Math.min(...bx.map(x => x.r.t)), b: Math.max(...bx.map(x => x.r.b)), bx };
      };
      const band = phone ? { p: [112, 420], w: [56, 560] } : { p: [128, 480], w: [64, 600] };
      const gOff = [];
      let gv = "PASS";
      // T-gap: the next section's content top less this one's content bottom, the hero and the closing aside
      for (let i = 0; i + 1 < S.length; i++) {
        const a = S[i],
          b = S[i + 1];
        // a scene's stage is held on screen while its section scrolls by: its content's page position is not where it shows
        if (a.isHero || a.isClosing || b.isHero || b.isClosing || sceneSec(a) || sceneSec(b)) continue;
        const A = block(a),
          B = block(b);
        if (!A || !B) continue;
        const g = B.t - A.b;
        const v =
          g >= band.p[0] && g <= band.p[1] ? "PASS"
          : g > 0 && g >= band.w[0] && g <= band.w[1] ? "WARN"
          : "FAIL";
        if (v !== "PASS")
          gOff.push({
            sel: `${selOf(a.el)} / ${selOf(b.el)}`,
            text: "",
            moving: movingOf(b.el),
            sev: v,
            d: g < band.p[0] ? band.p[0] - g : g - band.p[1],
            name: `${px(g)}px after "${words(a.el).slice(0, 20)}"`,
            doc: box({ l: SX, r: SX + W, t: Math.min(A.b, B.t), b: Math.max(A.b, B.t) }),
            msg:
              g <= 0 ?
                `the content of these two sections overlaps by ${px(-g)}px: ${band.p[0]}-${band.p[1]}px of air between them`
              : `${px(g)}px of air between the content of these two sections: ${band.p[0]}-${band.p[1]}px (${band.w[0]}-${band.w[1]}px WARN)`,
          });
        gv = worst([gv, v]);
      }
      T.push(test("T-gap", gv, gOff));
      // T-fill: content height over section height, PASS 0.55, WARN 0.40-0.55; a .g2 section per group over H, PASS
      // 0.40, WARN 0.25-0.40; a section whose layer passes SR-6 T1 fills 1.0
      const fOff = [];
      let fv = "PASS";
      for (const s of S) {
        if (s.isHero || s.isClosing || sceneSec(s)) continue; // (a big scene or a scroll moment fills its held screen itself)
        const lay = [...s.el.children].some(
          k =>
            !SKIPTAG.test(TU(k))
            && visible(k)
            && !srOnly(k)
            && layerOf(TU(k) === "PICTURE" && k.querySelector("img") ? k.querySelector("img") : k)
            && !layerProblems(k, s).length,
        );
        const A = block(s),
          c = C(s.i);
        if (isG2(s) && A) {
          for (const [gi, pick] of [
            [1, x => x.r.t < s.top + H],
            [2, x => x.r.t >= s.top + H],
          ]) {
            const g = A.bx.filter(pick);
            const gt = g.length ? Math.min(...g.map(x => x.r.t)) : null,
              gb = g.length ? Math.max(...g.map(x => x.r.b)) : null;
            const f = g.length ? (gb - gt) / H : 0;
            const v =
              lay ? "PASS"
              : f >= 0.4 ? "PASS"
              : f >= 0.25 ? "WARN"
              : "FAIL";
            if (v !== "PASS")
              fOff.push(
                off(
                  s.el,
                  { l: s.l, r: s.r, t: s.top + (gi - 1) * H, b: s.top + gi * H },
                  `screen group ${gi} of this two-screen section fills ${pct(f)}% of a screen: 40% or more (25% WARN)`,
                  { sev: v, d: (0.4 - f) * 100, ref: g.length ? [cbox(c, gt, gb)] : [] },
                ),
              );
            fv = worst([fv, v]);
          }
          continue;
        }
        // a frame with its own fill round content (a tinted panel holding a card or a mock) shows to its edges, as
        // empty-area reads it: it stretches the content's extent; a frame with nothing inside, a border alone, or one over
        // 60% of the section's area (a stretched ground) does not
        const E = A ? { t: A.t, b: A.b } : null;
        if (E)
          for (const d of decoBySec[s.i]) {
            if (d.el === s.el || d.el === s.wrap || (s.wrap && !s.wrap.contains(d.el))) continue;
            const ds = cs(d.el);
            if (!(
              alpha(ds.backgroundColor) > 0.03
              || (ds.backgroundImage && ds.backgroundImage !== "none")
              || (ds.boxShadow && ds.boxShadow !== "none")
            ))
              continue;
            if ((d.r.b - d.r.t) * (d.r.r - d.r.l) > 0.6 * s.h * (s.r - s.l) || !A.bx.some(x => d.el.contains(x.el)))
              continue;
            E.t = Math.min(E.t, d.r.t);
            E.b = Math.max(E.b, d.r.b);
          }
        const f =
          lay ? 1
          : E ? (E.b - E.t) / s.h
          : 0;
        const v =
          f >= 0.55 ? "PASS"
          : f >= 0.4 ? "WARN"
          : "FAIL";
        if (v !== "PASS")
          fOff.push(
            off(
              s.el,
              secR(s),
              E ?
                `the content fills ${pct(f)}% of the section's height (${px(E.b - E.t)} of ${px(s.h)}px): 55% or more (40% WARN)`
              : `the section shows no content: its content fills 0% of its ${px(s.h)}px (55% or more)`,
              { sev: v, d: (0.55 - f) * 100, ref: E ? [cbox(c, E.t, E.b)] : [] },
            ),
          );
        fv = worst([fv, v]);
      }
      T.push(test("T-fill", fv, fOff));
      // T-dividers, over every element (a 1px rule is under 2x2 and never reaches the rendered list): no <hr>, and no
      // border-top or border-bottom of 1px or more on an element 90% of the container wide with content boxes above and
      // below it in its section; repeated same-tag-and-class siblings are exempt, and so is the one rule above
      // footer.closing's legal row (the lowest such rule inside the closing)
      const dOff = [],
        closeCand = [];
      for (const el of allEls) {
        if (el instanceof SVGElement) continue;
        const z = secIdx(el);
        if (z < 0 || el === S[z].el || inFixed(el, S[z].el) || !visible(el) || srOnly(el)) continue;
        const r = inter(rectOf(el), clipFor(el));
        if (wd(r) < 1 || ht(r) < 0.5) continue;
        if (TU(el) === "HR") {
          dOff.push(
            off(
              el,
              r,
              "a rule (<hr>) between the section's content: sections and their parts are told apart by air and ground, not lines",
            ),
          );
          continue;
        }
        if (el === S[z].wrap) continue;
        const st = cs(el);
        const line = side =>
          parseFloat(st["border" + side + "Width"]) >= 1
          && !/none|hidden/.test(st["border" + side + "Style"])
          && alpha(st["border" + side + "Color"]) > 0.01;
        const bt = line("Top"),
          bb = line("Bottom");
        if (!bt && !bb) continue;
        // a divider is a bare line: a box with a side border (left or right, however thin), a rounded corner, a ground of its
        // own, a shadow, or that is a card, frame, panel, figure or form box itself, is a box, never a rule (the kit's .card and
        // .frame carry a 1px border all round, and a bordered card stacked full width on a phone is still a card)
        if (
          line("Left")
          || line("Right")
          || ["TopLeft", "TopRight", "BottomLeft", "BottomRight"].some(c => parseFloat(st["border" + c + "Radius"]) > 0)
          || alpha(st.backgroundColor) > 0.01
          || (st.backgroundImage && st.backgroundImage !== "none")
          || st.boxShadow !== "none"
        )
          continue;
        // a line drawn inside (or on) a picture, a UI mock, a frame or a card (a toolbar's edge, a table row in a mock) is part
        // of that drawing, not a rule between the section's parts
        if (
          el.closest(
            ".frame, .card, .panel, figure, fieldset, [data-ui], .ui, [data-ui-loop], [data-m-loop], [data-visual], [data-diagram], [data-big-scene]",
          )
        )
          continue;
        // the hairline over the hero's docked foot or facts (heroes.json: editorial, statement, photo, word) is the hero's own
        if (S[z].isHero) continue;
        const cw = C(z).r - C(z).l;
        if (wd(r) < 0.9 * cw) continue;
        const bx = boxesBySec[z];
        const divides = (y, ownAbove) =>
          bx.some(x => (ownAbove || !el.contains(x.el)) && x.r.b <= y + 1)
          && bx.some(x => (!ownAbove || !el.contains(x.el)) && x.r.t >= y - 1);
        const dt = bt && divides(r.t, false),
          db = bb && divides(r.b, true);
        if (!dt && !db) continue;
        if (el.parentElement && [...el.parentElement.children].some(c => c !== el && sameKind(c, el))) continue;
        const o = off(
          el,
          { l: r.l, r: r.r, t: dt ? r.t - 1 : r.b - 1, b: dt ? r.t + 1 : r.b + 1 },
          `a ${dt ? "top" : "bottom"} border across ${Math.round((wd(r) / cw) * 100)}% of the container, between the section's content: sections and their parts are told apart by air and ground, not lines`,
        );
        if (S[z].isClosing) closeCand.push({ o, t: r.t });
        else dOff.push(o);
      }
      closeCand.sort((a, b) => a.t - b.t);
      for (const c of closeCand.slice(0, -1)) dOff.push(c.o);
      T.push(test("T-dividers", dOff.length ? "FAIL" : "PASS", dOff));
      return T;
    });

    // ---- SR-4 the views test: a screen shows one section
    run("SR-4", () => {
      const T = [];
      const peekIv = S.map(s => [[s.top, s.bottom]]),
        contIv = S.map(() => []);
      for (const b of boxes)
        if (typeof b.z === "number") {
          peekIv[b.z].push([b.r.t, b.r.b]);
          contIv[b.z].push([b.r.t, b.r.b]);
        }
      for (const d of decorated) if (typeof d.z === "number") peekIv[d.z].push([d.r.t, d.r.b]);
      for (const it of rendered) if (typeof it.z === "number" && it.layer) peekIv[it.z].push([it.r.t, it.r.b]);
      const peekM = peekIv.map(merge),
        contM = contIv.map(merge);
      // the part of section i's peek intervals inside [a, b], as a full-width band
      const bandIn = (i, a, b) => {
        const iv = peekM[i].filter(([p, q2]) => q2 > a && p < b);
        if (!iv.length) return null;
        return {
          l: SX,
          r: SX + W,
          t: Math.max(a, Math.min(...iv.map(x => x[0]))),
          b: Math.min(b, Math.max(...iv.map(x => x[1]))),
        };
      };
      const views = new Map();
      const addView = (y, kind) => {
        y = Math.round(Math.min(maxY, Math.max(0, y)));
        const v = views.get(y);
        if (v) v.kinds.push(kind);
        else views.set(y, { y, kinds: [kind] });
      };
      for (let k = 0; k <= Math.max(0, Math.floor((sh - H) / H)); k++) addView(k * H, "stride " + k);
      S.forEach((s, i) => {
        addView(s.top, "the top of section " + (i + 1));
        if (s.h > H + 8) addView(s.bottom - H + barH, "the bottom of section " + (i + 1));
      });
      const vOff = [];
      let nWarn = 0,
        nFail = 0,
        nViews = 0;
      for (const v of [...views.values()].sort((a, b) => a.y - b.y)) {
        nViews++;
        const a = v.y + V[0],
          b = v.y + V[1];
        const peeks = peekM.map(m => lenIn(m, a, b));
        let owner = 0;
        peeks.forEach((p, i) => {
          if (p > peeks[owner]) owner = i;
        });
        let maxOther = 0,
          maxSec = -1;
        peeks.forEach((p, i) => {
          if (i !== owner && p > maxOther) {
            maxOther = p;
            maxSec = i;
          }
        });
        const headIn = heads.filter(h => h.z !== owner && h.r.t >= a - 0.5 && h.r.b <= b + 0.5);
        const contShow = contM.map((m, i) => ({ i, px: lenIn(m, a, b) })).filter(x => x.px > 24);
        // other sections peek 8px at most PASS, 9-24 WARN, over 24 FAIL; another section's heading whole inside V, or
        // the content of two sections over 24px each, FAIL
        let verdict =
          maxOther <= 8 ? "PASS"
          : maxOther <= 24 ? "WARN"
          : "FAIL";
        const why = [];
        if (maxOther > 8) why.push(`${px(maxOther)}px of section ${maxSec + 1}`);
        if (headIn.length) {
          verdict = "FAIL";
          why.push(`the heading of section ${headIn[0].z + 1} whole`);
        }
        if (contShow.length >= 2) {
          verdict = "FAIL";
          why.push(`the content of ${contShow.length} sections, over 24px each`);
        }
        if (verdict === "WARN") nWarn++;
        if (verdict === "FAIL") nFail++;
        if (verdict === "PASS") continue;
        const who =
          headIn.length ? headIn[0].z
          : maxSec >= 0 ? maxSec
          : (contShow.find(x => x.i !== owner)?.i ?? owner);
        const red = headIn.length ? headIn[0].r : bandIn(who, a, b) || { l: SX, r: SX + W, t: a, b };
        const mine = bandIn(owner, a, b);
        vOff.push(
          off(
            headIn.length ? headIn[0].el : S[who].el,
            red,
            `the screen at scroll ${v.y}px (${v.kinds[0]}) shows ${why.join(" and ")} beside section ${owner + 1}: a screen shows one section (another may peek 8px, 24px WARN)`,
            { sev: verdict, d: maxOther, at: v.y, ref: mine ? [box(mine)] : [], name: `scroll ${v.y}px` },
          ),
        );
      }
      // a page of 8 sections or fewer counts its WARN screens: two or more FAIL; a longer page FAILs over 10% of them
      let pv = "PASS";
      if (nFail) pv = "FAIL";
      else if (nWarn)
        pv =
          S.length <= 8 ?
            nWarn >= 2 ?
              "FAIL"
            : "WARN"
          : nWarn / nViews <= 0.1 ? "WARN"
          : "FAIL";
      if (pv === "FAIL")
        for (const o of vOff)
          if (o.sev === "WARN") {
            o.sev = "FAIL";
            o.msg += ` (${nWarn} of ${nViews} screens show a peek: ${S.length <= 8 ? "two or more on a page of 8 sections or fewer" : "over 10% of them"} FAIL)`;
          }
      T.push(test("T-views", pv, vOff));
      // T-dom: no non-section in <main>; no band (80% of the section wide or more, 48px tall, a ground of its own,
      // holding the h2 or intro, or at a desktop width only text and controls); pre, .frame and [data-visual] never are
      const dOff = [];
      if (main)
        for (const c of main.children)
          if (okChild(c) && TU(c) !== "SECTION")
            dOff.push(
              off(
                c,
                null,
                `a <${c.tagName.toLowerCase()}> sits directly in <main>: every part of <main> is a <section>`,
              ),
            );
      const effBg = el => {
        for (let e = el; e; e = e.parentElement) {
          const c = cs(e).backgroundColor;
          if (alpha(c) > 0.01) return c;
        }
        return "rgb(255, 255, 255)";
      };
      for (const s of S) {
        const secBg = effBg(s.el),
          sw = s.r - s.l;
        const h2 = [...s.el.querySelectorAll("h2")].find(e => visible(e));
        const intro = [...s.el.querySelectorAll("p")].find(
          p => visible(p) && !anyRowItem(p, s.i) && !inRowOrSplit(p, s.i),
        );
        for (const it of rendered) {
          if (it.z !== s.i || it.layer) continue;
          const el = it.el;
          if (TU(el) === "PRE" || el.closest(".frame, [data-visual]")) continue;
          if (wd(it.raw) < 0.8 * sw || ht(it.raw) < 48) continue;
          // a frame filled by its photograph or film (the film hero's cinema frame, its words in a box on it) is a picture
          if (
            [...el.querySelectorAll("img, video, picture, canvas")].some(m => {
              const mr = rectOf(m);
              return wd(mr) * ht(mr) >= 0.6 * wd(it.raw) * ht(it.raw);
            })
          )
            continue;
          const st = cs(el),
            bgc = st.backgroundColor;
          const ground = (alpha(bgc) > 0.01 && bgc !== secBg) || /gradient/.test(st.backgroundImage || "");
          if (!ground) continue;
          let why = null;
          if ((h2 && el.contains(h2)) || (intro && el.contains(intro))) why = "holds the heading or the intro";
          else if (
            !phone
            && !inRowOrSplit(el, s.i)
            && !el.querySelector("img, video, svg, canvas, picture")
            && !boxesBySec[s.i].some(b => b.kind === "bg" && el.contains(b.el))
            && textUnion.size
            && [...el.querySelectorAll("*")].concat([el]).some(e => textUnion.has(e))
          )
            why = "holds only text";
          if (why)
            dOff.push(
              off(
                el,
                it.raw,
                `a band: a box ${Math.round((wd(it.raw) / sw) * 100)}% of the section wide on a ground of its own that ${why}: the section's own ground is the band`,
                { ref: [box(secR(s))] },
              ),
            );
        }
      }
      T.push(test("T-dom", dOff.length ? "FAIL" : "PASS", dOff));
      return T;
    });

    // ---- SR-5 one heading per screen
    run("SR-5", () => {
      const T = [],
        off1 = [];
      // T1: at most one h2 a section, none in the hero
      for (const s of S) {
        const h2s = [...s.el.querySelectorAll("h2")].filter(e => visible(e) && !srOnly(e));
        if ((s.isHero && h2s.length) || h2s.length > 1)
          off1.push(
            off(
              s.isHero ? h2s[0] : h2s[1],
              null,
              s.isHero ?
                `the hero holds an h2 (${h2s.length}): its heading is the h1, and an h2 opens the next section`
              : `the section holds ${h2s.length} h2 headings: one per section, first in its .wrap`,
              { ref: s.isHero ? [] : [box(rectOf(h2s[0]))] },
            ),
          );
      }
      T.push(test("T1", off1.length ? "FAIL" : "PASS", off1));
      // T2: the share of 50px scroll positions with section headings of two sections whole inside V; the hero's h1 aside
      const counted = heads.filter(h => !(h.z === 0 && h.tag === "h1"));
      let n = 0,
        hits = 0,
        first = null;
      const at = [];
      for (let y = 0; y <= maxY + 0.01; y += 50) {
        n++;
        const a = y + V[0],
          b = y + V[1];
        const inV = counted.filter(h => h.r.t >= a - 0.5 && h.r.b <= b + 0.5);
        const secs = [...new Set(inV.map(h => h.z))];
        if (secs.length >= 2) {
          hits++;
          if (at.length < 4) at.push(y);
          if (!first) {
            const h1 = inV[0],
              h2 = inV.find(h => h.z !== h1.z);
            first = { y, h1, h2 };
          }
        }
      }
      const share = n ? hits / n : 0,
        lim = phone ? 0.05 : 0.03;
      T.push(
        test(
          "T2",
          share <= lim + 1e-9 ? "PASS" : "FAIL",
          share <= lim + 1e-9 || !first ?
            []
          : [
              off(
                first.h2.el,
                first.h2.r,
                `headings of two sections show whole on one screen at ${hits} of ${n} scroll positions (${rnd(share * 100)}%; at scroll ${at.join(", ")}px), here with ${q(first.h1.el)}: at most ${lim * 100}% on a ${phone ? "phone" : "desktop"}`,
                { ref: [box(first.h1.r)], at: first.y },
              ),
            ],
        ),
      );
      return T;
    });

    // ---- SR-6 one container, equal margins, one or two left lines, nothing outside the container lines
    run("SR-6", () => {
      const T = [];
      // a tablet (above the phone rules, under 1024px) keeps the system's own gutter, read from the page (--gut: 48px from 640 to
      // 1023 in system.css), not a constant: the margin is that gutter up to 120px; a page that declares none keeps 64-120px
      const gutTok = (() => {
        try {
          const g = parseFloat(getComputedStyle(de).getPropertyValue("--gut"));
          return g >= 32 && g < 64 ? g : 0;
        } catch (e) {
          return 0;
        }
      })();
      const lim =
        phone ? [16, 24]
        : W < 1024 && gutTok ? [gutTok, 120]
        : [64, 120];
      const ref = pageCtn;
      // T1-margins: the container's left equal on every section and the header (2px), right = W - left (2px), the
      // left margin 64-120px (16-24px on a phone)
      const mOff = [];
      const checkEdge = (what, c, el, t, b) => {
        if (!c) return;
        const lm = c.l - SX,
          rm = SX + W - c.r,
          probs = [];
        if (Math.abs(c.l - ref.l) > 2) probs.push(`the page's container starts at ${px(ref.l - SX)}px`);
        if (Math.abs(lm - rm) > 2) probs.push(`${px(lm)} and ${px(rm)}px are not one margin`);
        if (lm < lim[0] - 0.5 || lm > lim[1] + 0.5) probs.push(`the margin is ${lim[0]}-${lim[1]}px at ${W}px`);
        if (probs.length)
          mOff.push(
            off(
              el,
              { l: c.l, r: c.r, t, b: Math.min(b, t + 0.6 * H) },
              `${what} runs ${px(lm)}px from the left and ${px(rm)}px from the right${c.src === "wrap" ? "" : " (read from its outermost blocks: no .wrap)"}: ${probs.join("; ")} (one container, equal margins, 2px either way)`,
              {
                d: Math.max(Math.abs(c.l - ref.l), Math.abs(lm - rm), lim[0] - lm, lm - lim[1]),
                ref: [cbox(ref, t, Math.min(b, t + 0.6 * H))],
              },
            ),
          );
      };
      if (header) {
        const hr = rectOf(header);
        checkEdge("the nav's content", headerCtn, header, hr.t, hr.b);
        if (headerEdges && headerWrap) {
          const hw = rectOf(headerWrap);
          if (Math.abs(headerEdges.l - hw.l) > 2 || Math.abs(headerEdges.r - hw.r) > 2)
            mOff.push(
              off(
                header,
                { l: headerEdges.l, r: headerEdges.r, t: hr.t, b: hr.b },
                `the nav's first box starts at ${px(headerEdges.l - SX)}px and its last ends at ${px(headerEdges.r - SX)}px, not on its .wrap at ${px(hw.l - SX)}-${px(hw.r - SX)}px`,
                { ref: [cbox(hw, hr.t, hr.b)], at: 0 },
              ),
            );
        }
      }
      S.forEach((s, i) => checkEdge(`the content of section ${i + 1}`, ctns[i], s.el, s.top, s.bottom));
      T.push(test("T1-margins", mOff.length ? "FAIL" : "PASS", mOff));
      // T1-structure: the page shell, one in-flow .wrap a section, every other child a valid layer, the hero's and the
      // closing's .wrap children
      const sOff = [];
      for (const c of body.children) {
        if (SKIPTAG.test(TU(c)) || !visible(c)) continue;
        const r = c.getBoundingClientRect();
        if (r.width * r.height === 0) continue;
        if (!c.matches("header.nav, main, footer.closing, nav.actionbar"))
          sOff.push(
            off(
              c,
              null,
              `a <${c.tagName.toLowerCase()}> at the top of the page, outside header.nav, main, footer.closing and nav.actionbar`,
            ),
          );
      }
      for (const s of S) {
        const kids = [...s.el.children].filter(k => !SKIPTAG.test(TU(k)) && visible(k) && !srOnly(k));
        // (2.5.2: the place hero's photograph is in the flow in its band, split and name forms: layout.css 0b)
        const inflow = kids.filter(
          k =>
            !/absolute|fixed/.test(cs(k).position)
            && !picImg(k)
            && !(k.matches(".hero__bg") && s.el.matches(".hero--place")),
        );
        const wraps = inflow.filter(k => k.classList.contains("wrap"));
        if (wraps.length !== 1 || inflow.length !== 1)
          sOff.push(
            off(
              s.el,
              { l: s.l, r: s.r, t: s.top, b: Math.min(s.bottom, s.top + 0.6 * H) },
              `the section needs exactly one in-flow child .wrap (it has ${inflow.length} in-flow child${inflow.length === 1 ? "" : "ren"}, ${wraps.length} .wrap)`,
            ),
          );
        let heroLayers = 0;
        for (const k of kids) {
          if (inflow.includes(k)) continue;
          if (s.isHero) heroLayers++;
          if (k.matches(".hero__bg") && s.el.matches(".hero--place") && cs(k).position === "relative") continue; // its photograph in the flow (layout.css 0b)
          const probs = layerProblems(k, s);
          if (probs.length)
            sOff.push(
              off(
                k,
                null,
                `a child of section ${s.i + 1} beside its .wrap is no valid background layer: ${probs.join("; ")}`,
                { ref: [box(secR(s))] },
              ),
            );
        }
        if (heroLayers > 1)
          sOff.push(off(s.el, null, `the hero holds ${heroLayers} background layers: one at most`, { at: 0 }));
        if (s.wrap && kids.length > wraps.length) {
          const z = parseInt(cs(s.wrap).zIndex, 10);
          if (!(z >= 1))
            sOff.push(off(s.wrap, null, `the .wrap has z-index ${cs(s.wrap).zIndex} beside a layer: 1 or more`));
        }
        if (s.isHero && s.wrap) {
          const wk = [...s.wrap.children].filter(k => !SKIPTAG.test(TU(k)) && visible(k));
          const ht2 = wk.filter(k => k.classList.contains("hero-text"));
          if (ht2.length !== 1 || wk.length - ht2.length > 1)
            sOff.push(
              off(
                s.wrap,
                null,
                `the hero's .wrap holds ${wk.length} children, ${ht2.length} of them .hero-text: one .hero-text and at most one strip`,
                { at: 0 },
              ),
            );
        }
        if (s.el.matches("footer.closing") && s.wrap) {
          const wk = [...s.wrap.children].filter(k => !SKIPTAG.test(TU(k)) && visible(k));
          if (wk.length !== 2)
            sOff.push(
              off(
                s.wrap,
                null,
                `footer.closing > .wrap holds ${wk.length} children: exactly two (the call, then the legal row)`,
              ),
            );
        }
      }
      T.push(test("T1-structure", sOff.length ? "FAIL" : "PASS", sOff));
      // T2-containment: content boxes and boxed elements within the container, 2px (clip-aware); layers, sections, the
      // header and the action bar boxes exempt
      const cOff = [];
      const t2 = (el, z, r, kind) => {
        if (typeof z === "number" && layerOf(el)) return;
        if (el === header || el === actionbar || bleedPic(el, r)) return;
        const c = C(z);
        const zone =
          typeof z === "number" ? `section ${z + 1}`
          : z === "H" ? "the nav"
          : "the action bar";
        if (r.l < c.l - 2 || r.r > c.r + 2)
          cOff.push(
            off(
              el,
              r,
              `${kind === "boxed" ? "a box" : q(el)} runs ${px(r.l - SX)}-${px(r.r - SX)}px, outside the container lines of ${zone} at ${px(c.l - SX)}-${px(c.r - SX)}px: full width is for background layers and grounds only`,
              { d: Math.max(c.l - r.l, r.r - c.r), ref: [cbox(c, r.t, r.b)] },
            ),
          );
      };
      for (const b of boxes) t2(b.el, b.z, b.r, b.kind);
      for (const d of decorated) t2(d.el, d.z, d.r, "boxed");
      T.push(test("T2-containment", cOff.length ? "FAIL" : "PASS", cOff));
      // T3 left lines and T4 alignment: the leftmost block text on its visual row (inside each split column), exempting
      // controls, table cells, button-like links, row items past the first, cards, footer links and small boxes
      const TEXTTAG = /^(P|H1|H2|H3|H4|H5|H6|LI|BLOCKQUOTE|FIGCAPTION|DT|DD|LABEL)$/;
      const tested = [],
        aOff = [],
        lOff = [];
      // the hero's own text frame (layout-v4.md section 4, heroes.json): the centred hero sets its words on the page axis,
      // and a box hero (film, photo) sets them in a solid box of its own, padded; that text is measured against the axis or
      // the box's padding, never the container's left line
      const c0 = C(0);
      const centredOn = (el, r) =>
        /center/.test(cs(el).textAlign) && Math.abs((r.l + r.r) / 2 - (c0.l + c0.r) / 2) <= 2;
      const heroH1 = rendered.find(it => it.z === 0 && TU(it.el) === "H1");
      const heroCentred = !!heroH1 && centredOn(heroH1.el, heroH1.r);
      // (the box is the one that holds the h1: the words' box, never a drawn window or a card in the hero's picture)
      // only a box over a picture is a box hero (film, photo: a photograph, poster or video under the box, or the section's
      // own background image); a box on a plain ground is measured like any other text
      const picUnder = b => {
        const r = rectOf(b);
        if (/url\(/.test(cs(S[0].el).backgroundImage)) return rectOf(S[0].el);
        for (const m of S[0].el.querySelectorAll("img, picture, video, canvas")) {
          if (b.contains(m)) continue;
          const p = rectOf(m);
          if (p.l <= r.l + 2 && p.r >= r.r - 2 && p.t <= r.t + 2 && p.b >= r.b - 2) return p;
        }
        return null;
      };
      const heroBoxMemo = new Map();
      const heroBox = el => {
        if (
          secIdx(el) !== 0
          || !heroH1
          || el.closest(
            '[data-ui], .ui, [data-ui-loop], [data-m-loop], [data-diagram], [role="img"], [aria-hidden="true"]',
          )
        )
          return null;
        for (let e = el.parentElement; e && e !== S[0].el && e !== S[0].wrap && e !== body; e = e.parentElement)
          if (boxed(e) && !layerOf(e) && innerBox(e).l > c0.l + 2) {
            if (!e.contains(heroH1.el)) return null;
            if (!heroBoxMemo.has(e)) heroBoxMemo.set(e, picUnder(e));
            return heroBoxMemo.get(e) ? e : null;
          }
        return null;
      };
      // the box itself stands on the grid: its left edge on the container's left or a split line, its right edge on the
      // container's right, or centred on the page axis, 2px either way; or set into the picture it stands on by 48px at
      // most when that picture runs on the container's lines or bleeds (the film's words box inside its poster frame)
      {
        const hb = heroH1 && heroBox(heroH1.el);
        if (hb) {
          const br = rectOf(hb),
            kx = kLines(c0).map(k => k.x),
            pic = heroBoxMemo.get(hb);
          const inL =
            !!pic
            && (Math.abs(pic.l - c0.l) <= 2 || pic.l <= SX + 1)
            && br.l - Math.max(pic.l, c0.l) >= -2
            && br.l - Math.max(pic.l, c0.l) <= 48;
          const inR =
            !!pic
            && (Math.abs(pic.r - c0.r) <= 2 || pic.r >= SX + W - 1)
            && Math.min(pic.r, c0.r) - br.r >= -2
            && Math.min(pic.r, c0.r) - br.r <= 48;
          const onGrid =
            inL
            || inR
            || Math.abs(br.l - c0.l) <= 2
            || Math.abs(br.r - c0.r) <= 2
            || kx.some(x => Math.abs(br.l - x) <= 2)
            || Math.abs((br.l + br.r) / 2 - (c0.l + c0.r) / 2) <= 2;
          if (!onGrid)
            lOff.push(
              off(
                hb,
                br,
                `the hero's box starts ${px(Math.abs(br.l - c0.l))}px ${br.l > c0.l ? "right" : "left"} of the container's left, on no column line: the box starts on the container's left or a split line (x ${kx.map(x => px(x - SX)).join(", ")}), ends on its right, or is centred`,
                { d: Math.abs(br.l - c0.l), ref: [lineX(c0.l, br.t, br.b)] },
              ),
            );
        }
      }
      for (const it of rendered) {
        if (typeof it.z !== "number") continue;
        const el = it.el,
          tag = TU(el),
          z = it.z,
          c = C(z),
          cw = c.r - c.l;
        if (!(TEXTTAG.test(tag) || (cs(el).display === "block" && hasDirectText(el)))) continue;
        if (!contentAnc.has(el)) continue;
        let ex = null;
        if (z === 0 && heroCentred && centredOn(el, it.r)) ex = "the centred hero";
        if (!ex && z === 0 && !el.closest("button, a, select, textarea, input")) {
          const hb = heroBox(el);
          if (hb) {
            ex = "the hero's box";
            const dx = firstLeft(el) - innerBox(hb).l;
            if (Math.abs(dx) > 2 && !/center|right|end/.test(cs(el).textAlign))
              lOff.push(
                off(
                  el,
                  it.r,
                  `${q(el)} starts ${px(Math.abs(dx))}px ${dx > 0 ? "right" : "left"} of the hero box's padding: the words in a box start on its inner left line, 2px either way`,
                  { d: Math.abs(dx), ref: [lineX(innerBox(hb).l, it.r.t, it.r.b)] },
                ),
              );
          }
        }
        if (el.closest("button, select, textarea, input, td, th, caption")) ex = "control or table cell";
        // "buttons, inline-block or flex links": a block link counts only when it is button-like (class or role, or its own fill or border)
        if (!ex) {
          const a = el.closest("a");
          if (
            a
            && S[z].el.contains(a)
            && (/inline-block|flex|grid/.test(cs(a).display) || a.matches(".btn, .button, [role=button]") || boxed(a))
          )
            ex = "button or inline-block / flex link";
        }
        if (!ex) ex = rowExempt(el, z);
        if (!ex && splitCard(el, z)) ex = "card (split column)";
        if (!ex && inFooterLinks(el, z)) ex = "footer links";
        if (!ex)
          for (let e = el; e && e !== S[z].el; e = e.parentElement) {
            if (e !== el && boxed(e) && wd(rectOf(e)) <= 0.5 * cw) {
              ex = "small boxed element";
              break;
            }
          }
        // a drawn mock's words and a card laid over a picture (a map's address card) set their own lines; a list item
        // whose words follow its icon starts at the icon (seen on a test page)
        if (!ex && el.closest("[data-ui], .ui, [data-ui-loop], [data-m-loop], [data-diagram]")) ex = "drawn mock";
        if (!ex)
          for (let e = el.parentElement; e && e !== S[z].el; e = e.parentElement) {
            if (boxed(e) && cs(e).position === "absolute") {
              ex = "card over a picture";
              break;
            }
          }
        if (
          !ex
          && tag === "LI"
          && el.querySelector(
            ':scope > svg, :scope > img, :scope > i, :scope > [class*="icon"], :scope > [class*="check"]',
          )
        )
          ex = "list item with an icon";
        // (the kit's .checks list draws its tick as the item's ::before, a grid column of its own)
        if (!ex && tag === "LI") {
          const p = getComputedStyle(el, "::before");
          if (p.content !== "none" && p.content !== "normal" && parseFloat(p.width) > 0) ex = "list item with an icon";
        }
        if (ex) continue;
        const er = it.r;
        const scope = scopeOf(el, z);
        const leftmost = !boxesBySec[z].some(
          b =>
            b.el !== el
            && !el.contains(b.el)
            && !b.el.contains(el)
            && (scope === S[z].el || scope.contains(b.el))
            && Math.min(b.r.b, er.b) - Math.max(b.r.t, er.t) >= 4
            && b.r.r <= er.l + 2
            && b.r.l < er.l - 2,
        );
        if (!leftmost) continue;
        // T4 is about the tested containers (leftmost on their row), not every text box
        const ta = cs(el).textAlign;
        if (wd(er) > 0.5 * cw && /center|right|end/.test(ta))
          aOff.push(
            off(
              el,
              er,
              `${q(el)} is set ${ta === "center" ? "centred" : "to the right"} across ${px(wd(er))}px, over half the ${px(cw)}px container: text that wide is set left`,
              { d: wd(er) - 0.5 * cw, ref: [cbox(c, er.t, er.b)] },
            ),
          );
        const fl = firstLeft(el);
        tested.push({ el, z, x: fl, dx: fl - c.l, r: er });
      }
      const kl = kLines(ref).map(k => ({ k: k.k, dx: k.x - ref.l }));
      const lineRows = clusterBy(tested, t => t.dx, 4).map(c => {
        const k = kl.find(q2 => Math.abs(c.center - q2.dx) <= 2);
        return {
          x: ref.l + c.center,
          dx: c.center,
          n: c.n,
          line:
            Math.abs(c.center) <= 2 ? "wrap.left"
            : k ? "split line k=" + k.k
            : "extra",
          items: c.items,
        };
      });
      const kRows = lineRows.filter(r => r.line.startsWith("split"));
      const allowed = kl.map(k => px(ref.l + k.dx - SX)).join(", ");
      const lineOff = (r, msg, d) => {
        const t0 = r.items[0];
        const more = r.items
          .slice(1, 4)
          .map(t => q(t.el))
          .join(", ");
        return off(t0.el, t0.r, msg + (more ? ` (also ${more})` : ""), {
          d,
          ref: [lineX(ref.l, t0.r.t, t0.r.b)],
          name: `x ${px(r.x - SX)}`,
        });
      };
      for (const r of lineRows)
        if (r.line === "extra")
          lOff.push(
            lineOff(
              r,
              `${r.n} text block${r.n > 1 ? "s start" : " starts"} on a left line at x ${px(r.x - SX)}, ${px(r.dx)}px from the container's left: text starts on the container's left, or on one split line (x ${allowed})`,
              Math.abs(r.dx),
            ),
          );
      if (kRows.length > 1)
        for (const r of kRows.slice(1))
          lOff.push(
            lineOff(
              r,
              `${r.n} text block${r.n > 1 ? "s start" : " starts"} on a second split line at x ${px(r.x - SX)}, the first at x ${px(kRows[0].x - SX)}: one split line on the page`,
              Math.abs(r.x - kRows[0].x),
            ),
          );
      for (const it of rendered) {
        if (typeof it.z !== "number" || !/^H[12]$/.test(TU(it.el))) continue;
        // the centred hero's h1 stands on the page axis; a box hero's on its box's padding (told above)
        if (it.z === 0 && ((heroCentred && centredOn(it.el, it.r)) || heroBox(it.el))) continue;
        const dx = firstLeft(it.el) - C(it.z).l;
        if (Math.abs(dx) > 2)
          lOff.push(
            off(
              it.el,
              it.r,
              `the ${TU(it.el).toLowerCase()} starts ${px(Math.abs(dx))}px ${dx > 0 ? "right" : "left"} of the container's left: every h1 and h2 starts on it, 2px either way`,
              { d: Math.abs(dx), ref: [lineX(C(it.z).l, it.r.t, it.r.b)] },
            ),
          );
      }
      T.push(test("T3-left-lines", lOff.length ? "FAIL" : "PASS", lOff));
      T.push(test("T4-alignment", aOff.length ? "FAIL" : "PASS", aOff));
      // T5-overflow: no sideways page scroll
      const sw = de.scrollWidth,
        cwd = de.clientWidth,
        bsw = document.scrollingElement.scrollWidth;
      const ov = Math.max(sw, bsw) - cwd;
      const ovOff =
        ov <= 0 ?
          []
        : rendered
            .filter(it => !it.layer && it.raw.r > SX + cwd + 0.5)
            .sort((a, b) => b.raw.r - a.raw.r)
            .slice(0, 6)
            .map(it =>
              off(
                it.el,
                it.raw,
                `the page scrolls sideways (${Math.max(sw, bsw)}px wide on a ${cwd}px screen): ${q(it.el)} ends at ${px(it.raw.r - SX)}px`,
                { d: it.raw.r - SX - cwd },
              ),
            );
      if (ov > 0 && !ovOff.length)
        ovOff.push(
          off(body, null, `the page scrolls sideways: ${Math.max(sw, bsw)}px wide on a ${cwd}px screen`, {
            doc: null,
            text: "",
          }),
        );
      T.push(test("T5-overflow", ov <= 0 ? "PASS" : "FAIL", ovOff));
      // T6-right-edges: an img, video, canvas, svg or boxed block over half the container wide (the outermost, not in a
      // row or split) runs from the container's left line to its right line, 2px either way
      const eOff = [],
        t6seen = [];
      for (const it of rendered) {
        if (typeof it.z !== "number" || it.layer || bleedPic(it.el, it.r)) continue;
        const el = it.el,
          z = it.z,
          c = C(z),
          cw = c.r - c.l;
        if (el === S[z].wrap) continue;
        // a product render is measured by its frame, as the boxes are (its still and canvas are parts of it)
        const prod = el.closest("[data-product]");
        if (prod && prod !== el) continue;
        if (!(/^(IMG|VIDEO|CANVAS|SVG)$/.test(TU(el)) || boxed(el) || prod === el)) continue;
        if (wd(it.r) <= 0.5 * cw || inRowOrSplit(el, z)) continue;
        if (t6seen.some(p => p.contains(el))) continue;
        t6seen.push(el);
        if (Math.abs(it.r.l - c.l) > 2 || Math.abs(it.r.r - c.r) > 2)
          eOff.push(
            off(
              el,
              it.r,
              `${/^(IMG|VIDEO|CANVAS|SVG)$/.test(TU(el)) ? `a <${el.tagName.toLowerCase()}>` : "a box"} over half the container wide runs ${px(it.r.l - SX)}-${px(it.r.r - SX)}px, not on the container's lines at ${px(c.l - SX)}-${px(c.r - SX)}px`,
              { d: Math.max(Math.abs(it.r.l - c.l), Math.abs(it.r.r - c.r)), ref: [cbox(c, it.r.t, it.r.b)] },
            ),
          );
      }
      T.push(test("T6-right-edges", eOff.length ? "FAIL" : "PASS", eOff));
      return T;
    });

    // ---- SR-7 card rows on the container lines
    run("SR-7", () => {
      const T = [],
        rOff = [];
      // T-rows: first.left and last.right within 2px of the container lines (a nested row: its column), heights within
      // 2px (footer link columns: edges only)
      for (const row of rows) {
        const f = row.items[0],
          l = row.items[row.items.length - 1];
        const line = row.nested ? "its column's" : "the container's";
        const probs = [];
        if (Math.abs(f.r.l - row.ref.l) > 2)
          probs.push(`its first item starts at ${px(f.r.l - SX)}px, ${line} left line at ${px(row.ref.l - SX)}px`);
        if (Math.abs(l.r.r - row.ref.r) > 2)
          probs.push(`its last item ends at ${px(l.r.r - SX)}px, ${line} right line at ${px(row.ref.r - SX)}px`);
        const hs = row.items.map(x => ht(x.r));
        if (row.kinds) {
          for (const [k, what] of [
            ["t", "text groups"],
            ["p", "photographs"],
          ]) {
            const kh = hs.filter((h, i) => row.kinds[i] === k);
            if (kh.length > 1 && Math.max(...kh) - Math.min(...kh) > 2)
              probs.push(`its ${what} beside each other are ${kh.map(px).join("/")}px tall, not one height`);
          }
        } else if (!row.footer && Math.max(...hs) - Math.min(...hs) > 2)
          probs.push(`its items are ${hs.map(px).join("/")}px tall, not one height`);
        if (!probs.length) continue;
        const t = Math.min(...row.items.map(x => x.r.t)),
          b = Math.max(...row.items.map(x => x.r.b));
        rOff.push(
          off(
            row.G.el,
            { l: f.r.l, r: l.r.r, t, b },
            `a row of ${row.items.length} items: ${probs.join("; ")} (2px either way)`,
            {
              d: Math.max(
                Math.abs(f.r.l - row.ref.l),
                Math.abs(l.r.r - row.ref.r),
                row.footer || row.kinds ? 0 : Math.max(...hs) - Math.min(...hs),
              ),
              ref: [cbox(row.ref, t, b)],
            },
          ),
        );
      }
      T.push(test("T-rows", rOff.length ? "FAIL" : "PASS", rOff));
      // T-overflow: no overflow-x auto or scroll scroller (pre and code in .wrap exempt); a clipped carousel matches the
      // container and shows whole cards only
      const oOff = [];
      for (const el of allEls) {
        if (!visible(el)) continue;
        const s = cs(el),
          extra = el.scrollWidth - el.clientWidth;
        if (extra <= 2) continue;
        if (/auto|scroll/.test(s.overflowX)) {
          if (/^(PRE|CODE)$/.test(TU(el)) && el.closest(".wrap")) continue;
          oOff.push(
            off(el, null, `a sideways scroller: ${extra}px of it hidden behind overflow-x: ${s.overflowX}`, {
              d: extra,
            }),
          );
        } else if (/hidden|clip/.test(s.overflowX) && s.display !== "inline") {
          // a dealt moment's running line (marquee-row's rail, data-edge-free) clips its track by design: never a carousel
          if (el.matches("[data-edge-free]")) continue;
          let items = inFlowKids(el);
          if (items.length === 1) items = inFlowKids(items[0]);
          if (items.length < 2) continue;
          const bx = inter(rectOf(el), ownClip(el) || INF);
          if (!items.some(k => rectOf(k).r > bx.r + 1 || rectOf(k).l < bx.l - 1)) continue;
          const z = secIdx(el),
            c = C(z >= 0 ? z : "H");
          const probs = [];
          if (Math.abs(bx.l - c.l) > 2 || Math.abs(bx.r - c.r) > 2)
            probs.push(
              `its window runs ${px(bx.l - SX)}-${px(bx.r - SX)}px, not on the container at ${px(c.l - SX)}-${px(c.r - SX)}px`,
            );
          const partly = items.filter(k => {
            const r = rectOf(k),
              v = inter(r, bx);
            return wd(v) > 0 && wd(r) - wd(v) > 2;
          });
          if (partly.length) probs.push(`${partly.length} item${partly.length > 1 ? "s" : ""} cut at rest`);
          if (probs.length)
            oOff.push(off(el, bx, `a clipped carousel: ${probs.join("; ")}`, { ref: [cbox(c, bx.t, bx.b)] }));
        }
      }
      T.push(test("T-overflow", oOff.length ? "FAIL" : "PASS", oOff));
      // T-clipped-cards: no row item partly clipped by an ancestor
      const pOff = [];
      for (const el of [...new Set(rows.flatMap(r => r.items.map(x => x.el)))]) {
        const raw = rectOf(el),
          v = inter(raw, clipFor(el));
        if (wd(v) > 0 && ht(v) > 0 && (wd(raw) - wd(v) > 2 || ht(raw) - ht(v) > 2))
          pOff.push(
            off(
              el,
              raw,
              `a row item is cut by a frame round it: ${px(wd(v))} x ${px(ht(v))}px of its ${px(wd(raw))} x ${px(ht(raw))}px shows`,
              { d: Math.max(wd(raw) - wd(v), ht(raw) - ht(v)), ref: [box(v)] },
            ),
          );
      }
      T.push(test("T-clipped-cards", pOff.length ? "FAIL" : "PASS", pOff));
      // T-right: no content box's right past wrap.right + 2px (layers exempt)
      const xOff = [];
      for (const b of boxes) {
        if (typeof b.z !== "number" || bleedPic(b.el, b.r)) continue;
        const c = C(b.z);
        if (b.r.r > c.r + 2)
          xOff.push(
            off(
              b.el,
              b.r,
              `${q(b.el)} ends at ${px(b.r.r - SX)}px, past the container's right line at ${px(c.r - SX)}px`,
              { d: b.r.r - c.r, ref: [lineX(c.r, b.r.t, b.r.b)] },
            ),
          );
      }
      T.push(test("T-right", xOff.length ? "FAIL" : "PASS", xOff));
      return T;
    });

    // ---- SR-8 splits: one pair, text left, top-aligned (nested splits aside)
    run("SR-8", () => {
      const T = [];
      const top = splits.filter(s => !s.nested);
      const place = pageKind === "place";
      const mOff = [],
        oOff = [],
        pOff = [],
        eOff = [];
      // a line of text starts at its block's top when the block trims its leading (text-box: trim-start cap: the h1's
      // capitals on the picture's top line, heroes.json) or sets it under 1: the glyph box above that is no content
      const blockOf = el => {
        let e = el;
        while (e && e !== body && /^inline/.test(cs(e).display)) e = e.parentElement;
        return e;
      };
      const topOf = b => {
        if (b.kind !== "text") return b.r.t;
        const bt = rectOf(blockOf(b.el)).t;
        return bt > b.r.t && bt < b.r.b ? bt : b.r.t;
      };
      // a column that holds no measured box (a picture column of aria-hidden stills) is measured by its own box
      const ownBox = col => {
        const r = rectOf(col);
        return wd(r) >= 48 && ht(r) >= 48 ? r : null;
      };
      const firstBox = col => {
        const cand = [];
        for (const b of boxes)
          if (col.contains(b.el)) cand.push({ el: b.el, r: { ...b.r, t: topOf(b) }, kind: b.kind });
        for (const d of decorated)
          if (d.el === col || col.contains(d.el)) cand.push({ el: d.el, r: d.r, kind: "boxed" });
        if (!cand.length) {
          const r = ownBox(col);
          return r ? { t: r.t, at: [{ el: col, r, kind: "column" }] } : null;
        }
        const t = Math.min(...cand.map(c => c.r.t));
        return { t, at: cand.filter(c => c.r.t <= t + 2) };
      };
      const span = col => {
        const bx = boxes.filter(b => col.contains(b.el));
        if (!bx.length) {
          const r = ownBox(col);
          return r ? { t: r.t, b: r.b } : null;
        }
        return { t: Math.min(...bx.map(topOf)), b: Math.max(...bx.map(b => b.r.b)) };
      };
      let pairX = null;
      for (const sp of top) {
        const c = C(sp.z),
          cw = c.r - c.l;
        const L = sp.left.el,
          Rt = sp.right.el,
          lr = sp.left.r,
          rr = sp.right.r;
        const fL = firstBox(L),
          fR = firstBox(Rt);
        const tops = fL && fR ? Math.abs(fL.t - fR.t) : null;
        const sL = span(L),
          sR = span(Rt);
        const cen = sL && sR ? Math.abs((sL.t + sL.b) / 2 - (sR.t + sR.b) / 2) : null;
        const isTop = tops != null && tops <= 8,
          isCen = cen != null && cen <= 8;
        const mode =
          isTop && isCen ? "both"
          : isTop ? "top"
          : isCen ? "centre"
          : "none";
        const lFirst = boxes.filter(b => L.contains(b.el));
        const lt = lFirst.length ? Math.min(...lFirst.map(b => b.r.t)) : null;
        const orient =
          lt != null && lFirst.some(b => b.kind === "text" && b.r.t <= lt + 2) ? "text-left" : "text-right";
        const ks = (place ? [6] : [5, 6, 7]).map(k => ({ k, x: c.l + (k * (cw + 24)) / 12 }));
        const kHit = ks.find(k => Math.abs(rr.l - k.x) <= 2);
        const gr = rectOf(sp.G.el),
          cols = [box(lr), box(rr)];
        // the kit's offset pair (assets/system.css, .comp-offset: <figure class="media span-7"> then <figure class="media
        // span-4 start-9">, the second 22% lower from 1024px; sections-library.md, Compositions: "two photographs of one
        // subject, the second smaller and lower") is two pictures, not words beside a visual: its drop, its picture on the
        // left and its start-9 line are the composition, so T-mode, T-orientation and T-pair leave it out (and it sets no
        // pair line for the page's real splits). It stays a split for everything else, T-edges included. Only that exact
        // shape: a .comp-offset grid whose two columns are figures
        const offsetPair = sp.G.el.matches(".comp-offset") && TU(L) === "FIGURE" && TU(Rt) === "FIGURE";
        // T-mode: the tops of the two columns' first boxes agree within 8px (merged CK-33: a centred split FAILs)
        if (!offsetPair && !(mode === "top" || mode === "both"))
          mOff.push(
            off(
              sp.G.el,
              gr,
              `the two columns of the split start ${px(tops)}px apart at the top${mode === "centre" ? " (centred on each other)" : ""}: a split's columns are top-aligned, 8px either way`,
              { d: tops ?? 0, ref: cols },
            ),
          );
        // T-orientation: text left on every split
        if (!offsetPair && orient !== "text-left")
          oOff.push(
            off(
              sp.G.el,
              gr,
              "the split's left column starts with a picture or a box, not text: text left, the visual right, on every split",
              { ref: cols },
            ),
          );
        // T-pair: one pair: the right column's x the same on every split (2px), on wrap.left + k*(w+24)/12 (k 5, 6 or 7;
        // a place page 6), the left column ending at x - 24
        const probs = [];
        if (!offsetPair) {
          if (pairX == null) pairX = rr.l;
          else if (Math.abs(rr.l - pairX) > 2)
            probs.push(`its right column starts at x ${px(rr.l - SX)}, the first split's at ${px(pairX - SX)}`);
          if (!kHit)
            probs.push(
              `its right column starts at x ${px(rr.l - SX)}, on none of the split lines ${ks.map(k => `${px(k.x - SX)} (k=${k.k})`).join(", ")}`,
            );
          // the left column ends 24px before the right one, or one column earlier on that column's end: the kit's splits
          // set their words on span-5 beside a visual on span-6 start-7 (heroes.json split and collage, the layout demos'
          // sections)
          else if (Math.abs(lr.r - (kHit.x - 24)) > 2 && Math.abs(lr.r - (kHit.x - 24 - (cw + 24) / 12)) > 2)
            probs.push(
              `its left column ends at ${px(lr.r - SX)}px, not 24px before the right one (${px(kHit.x - 24 - SX)}px) or a column before it (${px(kHit.x - 24 - (cw + 24) / 12 - SX)}px)`,
            );
        }
        if (probs.length)
          pOff.push(
            off(sp.G.el, gr, `the split's columns are off the page's one pair of lines: ${probs.join("; ")}`, {
              d: Math.min(...ks.map(k => Math.abs(rr.l - k.x))),
              ref: [lineX(kHit ? kHit.x : (pairX ?? rr.l), gr.t, gr.b)],
            }),
          );
        // T-edges: the left item on wrap.left, the right item on wrap.right, 2px either way
        const ep = [];
        if (Math.abs(lr.l - c.l) > 2)
          ep.push(`its left column starts at ${px(lr.l - SX)}px, the container's left at ${px(c.l - SX)}px`);
        if (Math.abs(rr.r - c.r) > 2)
          ep.push(`its right column ends at ${px(rr.r - SX)}px, the container's right at ${px(c.r - SX)}px`);
        if (ep.length)
          eOff.push(
            off(sp.G.el, gr, `the split does not run edge to edge on the container: ${ep.join("; ")}`, {
              d: Math.max(Math.abs(lr.l - c.l), Math.abs(rr.r - c.r)),
              ref: [cbox(c, gr.t, gr.b)],
            }),
          );
      }
      T.push(test("T-mode", mOff.length ? "FAIL" : "PASS", mOff));
      T.push(test("T-orientation", oOff.length ? "FAIL" : "PASS", oOff));
      T.push(test("T-pair", pOff.length ? "FAIL" : "PASS", pOff));
      T.push(test("T-edges", eOff.length ? "FAIL" : "PASS", eOff));
      return T;
    });

    harness.rows = rows.length;
    harness.splits = splits.length;
    harness.headings = heads.length;
    // Only screen-grid aesthetics change under flow. Fit, overflow, collisions and
    // expanded-content containment remain measured and reported.
    const layout =
      opt.contract !== undefined ?
        opt.contract.layout || {}
      : {
          rhythm: document.documentElement.dataset.rhythm,
          headingAlign: document.documentElement.dataset.headingAlign,
        };
    const flow = layout.rhythm === "flow";
    const centered = layout.headingAlign === "center";
    const omitted = new Set(
      flow ?
        ["SR-1 T1", "SR-1 T2", "SR-2 T-height", "SR-2 T-grid", "SR-2 T-total", "SR-2 T-grid-expanded", "SR-5 T2"]
      : [],
    );
    if (centered) {
      omitted.add("SR-6 T3-left-lines");
      omitted.add("SR-6 T4-alignment");
    }
    return {
      harness,
      tests: tests.filter(t => !(flow && t.rule === "SR-4") && !omitted.has(`${t.rule} ${t.id}`)),
      status,
    };
  }

  // ---------------------------------------------------------------- the expansion pass, in the page (serialised)
  // every details opened and every [aria-expanded=false] and [role=tab] in main clicked once with element.click() (no
  // pointer, wheel or focus events; a link that leaves the page and a submit are held), and every moment a child of main
  // or the page's height changed recorded with the control that did it
  async function expandAll() {
    const root = document.querySelector("main") || document.body;
    const selOf = el => {
      const parts = [];
      for (
        let e = el;
        e && e.nodeType === 1 && e !== document.body && e !== document.documentElement && parts.length < 4;
        e = e.parentElement
      ) {
        const tag = e.tagName.toLowerCase();
        if (e.id && /^[A-Za-z][\w-]*$/.test(e.id)) {
          parts.unshift(tag + "#" + e.id);
          break;
        }
        const cls = [...e.classList].filter(c => /^[A-Za-z_][\w-]*$/.test(c) && !/^(is|js|has)-/.test(c)).slice(0, 2);
        let s = tag + cls.map(c => "." + c).join("");
        const p = e.parentElement;
        if (p) {
          const same = [...p.children].filter(x => x.tagName === e.tagName);
          if (same.length > 1 && (!cls.length || same.filter(x => cls.every(c => x.classList.contains(c))).length > 1))
            s += `:nth-of-type(${same.indexOf(e) + 1})`;
        }
        parts.unshift(s);
      }
      return parts.join(" > ") || (el && el.tagName ? el.tagName.toLowerCase() : "main");
    };
    const kids = () => [...root.children].filter(e => !/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|LINK|META)$/i.test(e.tagName));
    const heights = () => kids().map(e => Math.round(e.getBoundingClientRect().height * 10) / 10);
    const box = e => {
      const r = e.getBoundingClientRect();
      return {
        left: Math.round(r.left),
        top: Math.round(r.top + scrollY),
        width: Math.max(2, Math.round(r.width)),
        height: Math.max(2, Math.round(r.height)),
      };
    };
    let prev = { h: heights(), sh: document.scrollingElement.scrollHeight };
    const changes = [];
    let count = 0;
    const check = c => {
      const now = { h: heights(), sh: document.scrollingElement.scrollHeight };
      if (
        now.h.length !== prev.h.length
        || now.h.some((x, i) => Math.abs(x - prev.h[i]) > 1)
        || Math.abs(now.sh - prev.sh) > 1
      ) {
        count++;
        const els = kids();
        const parts =
          now.h.length !== prev.h.length ?
            []
          : now.h
              .map((x, i) => (Math.abs(x - prev.h[i]) > 1 ? { sel: selOf(els[i]), from: prev.h[i], to: x } : null))
              .filter(Boolean);
        if (changes.length < 25)
          changes.push({
            sel:
              c ? selOf(c)
              : parts[0] ? parts[0].sel
              : selOf(root),
            text: c ? (c.textContent || "").trim().replace(/\s+/g, " ").slice(0, 30) : "",
            settled: !c,
            doc: c && c.getBoundingClientRect().height > 0 ? box(c) : null,
            parts,
            sh: [prev.sh, now.sh],
          });
      }
      prev = now;
    };
    document.addEventListener(
      "click",
      e => {
        const a = e.target && e.target.closest && e.target.closest("a[href]");
        if (a && !/^#/.test(a.getAttribute("href"))) e.preventDefault();
      },
      true,
    );
    document.addEventListener("submit", e => e.preventDefault(), true);
    let opened = 0,
      clicked = 0;
    for (const d of [...root.querySelectorAll("details")])
      if (!d.open) {
        d.open = true;
        opened++;
        check(d.querySelector("summary") || d);
      }
    for (const c of [...root.querySelectorAll('[aria-expanded="false"], [role="tab"]')]) {
      if (c.disabled || c.getAttribute("aria-disabled") === "true") continue;
      c.click();
      clicked++;
      await new Promise(r => setTimeout(r, 120));
      check(c);
    }
    await new Promise(r => setTimeout(r, 400));
    check(null);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    await new Promise(r => setTimeout(r, 300));
    return { opened, clicked, changes, changeCount: count };
  }

  // ---------------------------------------------------------------- findings: rules to checks, fixes, grouping, crops
  const CHECK_OF = {
    "SR-1": "hero-screen",
    "SR-2": "section-height",
    "SR-3": "section-air",
    "SR-4": "one-section",
    "SR-5": "one-heading",
    "SR-6": "container-edges",
    "SR-7": "row-lines",
    "SR-8": "split-pair",
  };
  // one line of fix per SR test (the check's own fix stands for a test without one)
  const TEST_FIX = {
    "SR-1 T1": "make the hero exactly one screen (height: 100svh, its content fitted inside), never taller or shorter",
    "SR-1 T2": "end the hero at the fold so nothing of the next section shows at load (hero height: 100svh)",
    "SR-1 T3": "fit the hero's content inside the hero's box: shorten the text or the picture, never let it spill",
    "SR-1 T4":
      "keep the hero's content between the nav and 24px above the fold (and the action bar): shorten the picture or the text; a docked strip 96px at most",
    "SR-1 T5": "keep the hero's background layer inside the hero (position: absolute; inset: 0 in the section)",
    "SR-2 T-height":
      "set the section to one screen or two (height: calc(var(--h,1) * 100vh), --h 1 or 2) and cut or split its content to fit",
    "SR-2 T-grid": "make every section above it exactly one or two screens tall, so this one starts on a whole screen",
    "SR-2 T-fit":
      "fit the content above the section's bottom padding (--padb), or make it two screens (.g2) in two groups",
    "SR-2 T-total": "keep a place page at 3 to 6 screens: merge a short block into the section above, or cut a section",
    "SR-2 T-fit-expanded":
      "show answers and panels open and size the section for its open content, or make it two screens (.g2)",
    "SR-2 T-grid-expanded":
      "size each section for its content with every answer and tab open, so the tops below stay on whole screens",
    "SR-2 T-snap":
      "take scroll-snap-type off (html, body and every scroller): sections are one or two screens by height and padding, never snapped",
    "SR-2 T-height-change":
      "show every answer and panel open from the start (no accordion, no tabs that resize), so nothing changes a section's height after load",
    "SR-3 T-gap":
      "keep 128-480px of air between the content of neighbouring sections (112-420px on a phone): the sections' padding (--padt, --padb)",
    "SR-3 T-fill":
      "fill the section to 55%: more content, a picture or a background layer, or merge it into the section above as its last block",
    "SR-3 T-dividers":
      "take the rule out: sections and their parts are parted by their ground and the air between them",
    "SR-4 T-views": "make each section exactly one screen or two, so a screen shows one section and no neighbour peeks",
    "SR-4 T-dom":
      "put every block of <main> in a <section>, and give a band its own section instead of a ground inside one",
    "SR-5 T1": "give each section one h2, first in its .wrap, and the hero only its h1",
    "SR-5 T2": "make the sections one screen tall so their headings sit a screen apart and two never share one",
    "SR-6 T1-margins":
      "use one container on every section and the nav (.wrap): one margin left and right, 64-120px on a desktop, 16-24px on a phone",
    "SR-6 T1-structure":
      "build the page as header.nav, a main of sections (each one in-flow .wrap plus background layers) and footer.closing",
    "SR-6 T2-containment":
      "keep it inside the container lines (.wrap): full width is for background layers and grounds only",
    "SR-6 T3-left-lines": "start the text on the container's left, or on the one split line every split shares",
    "SR-6 T4-alignment": "set the text left (text-align: start)",
    "SR-6 T5-overflow":
      "take the sideways scroll away: nothing wider than the screen (overflow-x: clip on the part that spills)",
    "SR-6 T6-right-edges":
      "run the picture or box from the container's left line to its right line, or put it in a row or a split",
    "SR-7 T-rows":
      "start the row's first item on the container's left line and end its last on the right line, every item one height",
    "SR-7 T-overflow":
      "show every item inside the container, or stack them: no sideways scroller, no half-cut carousel",
    "SR-7 T-clipped-cards": "show the row item whole: no frame cutting it",
    "SR-7 T-right": "end it at the container's right line",
    "SR-8 T-mode": "top-align both columns of the split (align-items: start)",
    "SR-8 T-orientation": "put the text in the left column and the visual in the right, on every split",
    "SR-8 T-pair":
      "start every split's right column on one shared line (wrap.left + k x (width + 24) / 12, k 5, 6 or 7; 6 on a place page) and end the left one 24px before it",
    "SR-8 T-edges": "run the split from the container's left line to its right line",
  };
  // a short name for each SR test, for the note that names a test left without a place among a check's 8
  const TEST_NAME = {
    "SR-1 T1": "the hero off the fold",
    "SR-1 T2": "the next section on the first screen",
    "SR-1 T3": "content outside the hero's box",
    "SR-1 T4": "hero content past its content line",
    "SR-1 T5": "the hero's layer outside the hero",
    "SR-2 T-height": "sections not one screen or two",
    "SR-2 T-grid": "section tops off the screen grid",
    "SR-2 T-fit": "content past the bottom padding",
    "SR-2 T-total": "the place page's length",
    "SR-2 T-snap": "scroll snapping",
    "SR-2 T-fit-expanded": "open answers and tabs past the bottom padding",
    "SR-2 T-grid-expanded": "tops off the grid with every answer open",
    "SR-2 T-height-change": "heights that change on a click",
    "SR-3 T-gap": "air between sections",
    "SR-3 T-fill": "sections mostly empty",
    "SR-3 T-dividers": "divider rules",
    "SR-4 T-views": "screens showing two sections",
    "SR-4 T-dom": "blocks of <main> that are no section, and bands",
    "SR-5 T1": "extra h2 headings",
    "SR-5 T2": "two headings on one screen",
    "SR-6 T1-margins": "unequal or wrong margins",
    "SR-6 T1-structure": "the page shell",
    "SR-6 T2-containment": "parts past the container lines",
    "SR-6 T3-left-lines": "text off the left lines",
    "SR-6 T4-alignment": "wide text centred",
    "SR-6 T5-overflow": "sideways scroll",
    "SR-6 T6-right-edges": "wide pictures and boxes off the container lines",
    "SR-7 T-rows": "rows off the container lines",
    "SR-7 T-overflow": "sideways scrollers and cut carousels",
    "SR-7 T-clipped-cards": "cut row items",
    "SR-7 T-right": "content past the right line",
    "SR-8 T-mode": "splits not top-aligned",
    "SR-8 T-orientation": "splits with the visual on the left",
    "SR-8 T-pair": "splits off the page's one pair of lines",
    "SR-8 T-edges": "splits not edge to edge",
  };
  // the tests that read where a part sits on the screen: a part moving as it is read is told there as a WARN. A section's
  // height, its grid top, the page shell, sideways scroll and a place page's length are facts of the layout and stay FAIL
  // (as rhythm-check.mjs tells them)
  const MOVABLE = new Set([
    "SR-1 T2",
    "SR-1 T4",
    "SR-4 T-views",
    "SR-5 T2",
    "SR-6 T2-containment",
    "SR-6 T3-left-lines",
    "SR-6 T4-alignment",
    "SR-6 T6-right-edges",
    "SR-7 T-rows",
    "SR-7 T-right",
    "SR-8 T-mode",
    "SR-8 T-orientation",
    "SR-8 T-pair",
    "SR-8 T-edges",
  ]);
  const MOVES = {
    moving: " (it was moving as it was read: told as a WARN, look at it at rest)",
    held: " (it sits in a part held on screen as the page scrolls: told as a WARN)",
    scene: " (it is in a scroll scene: told as a WARN)",
  };
  const SEV = (a, b) =>
    a.sev === b.sev ? 0
    : a.sev === "FAIL" ? -1
    : 1;
  // worst first: FAIL before WARN, then the furthest outside its band (an offender with no distance keeps its page place)
  const worstFirst = (a, b) => SEV(a, b) || (b.d || 0) - (a.d || 0);
  const nameOf = f => f.name || (f.text ? `"${f.text.slice(0, 24)}"` : f.sel);

  // the probe's tests become findings. A test tells its offenders worst first, three at most, the others named in the
  // third; a check's 8 places a width go round its tests (one from every FAIL test, then every WARN test, then a second
  // round, then a third), so no failing test goes untold, and a test left without a place is named with its count
  function findingsOf(tests, width) {
    const per = new Map();
    for (const t of tests) {
      if (t.verdict === "PASS" || t.verdict === "ERROR") continue;
      const check = CHECK_OF[t.rule];
      if (!check) continue;
      const key = `${t.rule} ${t.id}`,
        movable = MOVABLE.has(key);
      const offs =
        t.offenders && t.offenders.length ?
          t.offenders
        : [{ sel: "body", text: "", doc: null, msg: `${TEST_NAME[key] || key} at ${width}px` }];
      const rows = offs.map(o => {
        let sev = o.sev || t.verdict,
          msg = o.msg;
        if (sev === "FAIL" && o.moving && movable) {
          sev = "WARN";
          msg += MOVES[o.moving] || "";
        }
        return {
          check,
          sev,
          id: 0,
          sel: o.sel,
          text: o.text || "",
          msg,
          fix: TEST_FIX[key] || fixes[check],
          rule: key,
          doc: o.doc || null,
          ref: o.ref || [],
          at: o.at,
          name: o.name,
          d: o.d,
        };
      });
      // the air between sections: every gap out of the band in one message, top to bottom (the numbers are short, and
      // the one nearest the band would otherwise be the one left out)
      const gaps = t.id === "T-gap" && rows.length > 1 ? rows.map(nameOf) : null;
      rows.sort(worstFirst);
      if (gaps) rows[0].msg += ` (every gap out of the band at ${width}px, top to bottom: ${gaps.join(", ")})`;
      if (!per.has(check)) per.set(check, []);
      per.get(check).push({ key, rows, more: t.more || 0, sev: rows[0].sev, gaps: !!gaps });
    }
    const out = [];
    for (const list of per.values()) {
      list.sort(SEV);
      const kept = new Map(list.map(e => [e, []]));
      let n = 0;
      for (let round = 0; round < 3 && n < 8; round++)
        for (const e of list) {
          if (n >= 8) break;
          if (e.rows[round]) {
            kept.get(e).push(e.rows[round]);
            n++;
          }
        }
      const left = [];
      let leftN = 0;
      for (const e of list) {
        const k = kept.get(e),
          rest = e.rows.length - k.length + e.more;
        if (!k.length) {
          left.push(`${TEST_NAME[e.key] || e.key} ${rest}`);
          leftN += rest;
          continue;
        }
        if (rest && !e.gaps) {
          const names = e.rows.slice(k.length, k.length + 3).map(nameOf);
          k[k.length - 1].more = ` (and ${rest} more like it${names.length ? ": " + names.join(", ") : ""})`;
        }
      }
      const flat = list.flatMap(e => kept.get(e));
      if (left.length)
        flat[flat.length - 1].more =
          (flat[flat.length - 1].more || "") + ` (and ${leftN} more of this check at ${width}px: ${left.join(", ")})`;
      for (const f of flat) {
        f.msg = `${f.msg}${f.more || ""} (${f.rule.split(" ")[0]})`;
        delete f.more;
        out.push(f);
      }
    }
    return out;
  }

  // a width the module could not read: one WARN a check on body, since the check would otherwise read PASS, and the
  // host's not-checked list when it gives the hook (ctx.notChecked(ids, why))
  const NOT_MEASURED_FIX =
    "make the page load and lay out at this width (the probe error says what stopped it), then run the check again";
  function notMeasured(ctx, why, ids = checks.map(c => c.id)) {
    const msg = `not measured at ${ctx.width}px: ${why}`;
    if (typeof ctx.notChecked === "function") {
      try {
        ctx.notChecked(ids, msg);
      } catch (e) {
        ctx.errors.push(`rhythm notChecked: ${e.message}`);
      }
    }
    return ids.map(check => ({ check, sev: "WARN", id: 0, sel: "body", text: "", msg, fix: NOT_MEASURED_FIX }));
  }

  // scroll the probe's tab (Lenis-aware through window.__cc when it is there) and give back where it landed
  const scrollExpr = y =>
    `Promise.resolve(window.__cc && window.__cc.scrollTo ? window.__cc.scrollTo(${Math.round(y)}) : window.scrollTo({ top: ${Math.round(y)}, left: 0, behavior: 'instant' })).then(() => Math.round(window.scrollY))`;
  // a page box on a screen shot at scroll sy, clamped to the screen; a box off the screen is no box (null)
  function vrect(b, sy, vw, vh, ref) {
    const l = Math.max(0, Math.min(vw - 2, b.left)),
      r = Math.max(l + 2, Math.min(vw, b.left + b.width));
    let t = b.top - sy,
      bt = t + b.height;
    if (bt < 0 || t > vh) return null;
    t = Math.max(0, t);
    bt = Math.min(vh, bt);
    if (bt - t < 2) {
      t = Math.min(t, vh - 2);
      bt = t + 2;
    }
    return Object.assign(
      { left: Math.round(l), top: Math.round(t), width: Math.round(r - l), height: Math.round(bt - t) },
      ref ? { ref: true } : {},
    );
  }
  // each finding with a box gets a crop from a screen this module shoots: the screen its 'at' names, else one centred on
  // the element and what it is measured against (a tall element: its top under the nav); one shot serves every finding
  // it shows whole; at most 16 shots and 40 crops a width, and under --quick one crop a check
  async function cropAll(ctx, tab, rows, harness, cnt) {
    const vw = ctx.width,
      vh = ctx.height,
      navH = harness.navH || 0,
      maxY = Math.max(0, (harness.scrollHeight || vh) - vh);
    const shots = [],
      done = new Set();
    for (const f of [...rows].sort(SEV)) {
      if (!f.doc || cnt.n >= 40 || (ctx.quick && done.has(f.check))) continue;
      const all = [f.doc, ...f.ref];
      const top = Math.min(...all.map(b => b.top)),
        bottom = Math.max(...all.map(b => b.top + b.height)),
        tall = bottom - top;
      let y =
        f.at != null ? f.at
        : tall <= vh - navH - 32 ? top - navH - (vh - navH - tall) / 2
        : f.doc.top - navH - 24;
      y = Math.round(Math.max(0, Math.min(maxY, y)));
      let s = shots.find(
        x =>
          Math.abs(x.y - y) <= 2 || (f.at == null && f.doc.top >= x.sy + navH && f.doc.top + f.doc.height <= x.sy + vh),
      );
      if (!s) {
        if (shots.length >= 16) continue;
        await ctx.safe("rhythm scroll", () => tab.eval(scrollExpr(y)));
        await ctx.sleep(300);
        // where the page came to rest, read just before the shot (a snapping page or a late scroll library moves after
        // the call returns)
        const sy = await ctx.safe("rhythm scroll", () => tab.eval("Math.round(window.scrollY)"));
        const b64 = await ctx.safe("rhythm shot", () => tab.shot());
        if (!b64) continue;
        s = { y, sy: Number.isFinite(sy) ? sy : y, b64 };
        shots.push(s);
      }
      const red = vrect(f.doc, s.sy, vw, vh, false);
      if (!red) continue;
      f.rects = [red, ...f.ref.map(b => vrect(b, s.sy, vw, vh, true)).filter(Boolean)];
      await ctx.safe("rhythm crop", () =>
        ctx.crop(s.b64, f, `${ctx.width}-rhythm-${String(++cnt.n).padStart(2, "0")}-${f.check}.jpg`),
      );
      done.add(f.check);
    }
  }
  // the module's own fields come off before the host sees a finding (rule stays: the SR test, for the host's filters)
  const strip = ({ doc, ref, at, name, d, more, ...f }) => f;

  // the page loaded as rhythm-check.mjs loads it: scroll-behavior:auto (and no snapping), one pass down a screen at a time
  // so lazy parts arrive, up to 3 s for pictures, back to the top; then running finite animations given 3 s to end (an
  // addition: the original does not wait; skipped under --quick) and the fonts awaited once more, so the read is of the
  // settled font (a web font swapped in late moves every line under it)
  async function prepare(tab, ctx) {
    await tab.eval(
      "(() => { const s = document.createElement('style'); s.textContent = 'html,body{scroll-behavior:auto !important;scroll-snap-type:none !important}'; (document.head || document.documentElement).appendChild(s); return 1; })()",
    );
    let y = 0;
    for (let i = 0; i < 80; i++) {
      const sh = await tab.eval("document.scrollingElement.scrollHeight");
      if (y >= sh) break;
      await tab.eval(scrollExpr(y));
      await ctx.sleep(250);
      y += ctx.height;
    }
    await tab.eval(scrollExpr(await tab.eval("document.scrollingElement.scrollHeight")));
    await ctx.sleep(300);
    await tab.eval(
      "(() => { const pending = [...document.images].filter((i) => !i.complete); return Promise.race([Promise.all(pending.map((i) => new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); }))), new Promise((r) => setTimeout(r, 3000))]).then(() => pending.length); })()",
      15000,
    );
    await tab.eval(scrollExpr(0));
    await ctx.sleep(700);
    if (!ctx.quick)
      await tab
        .eval(
          "new Promise((res) => { const t0 = performance.now(); const tick = () => { const n = document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations !== Infinity).length; if (!n || performance.now() - t0 > 3000) res(n); else setTimeout(tick, 150); }; tick(); })",
          10000,
        )
        .catch(() => 0);
    const fonts = await tab
      .eval(
        "document.fonts ? Promise.race([document.fonts.ready.then(() => document.fonts.status), new Promise((r) => setTimeout(() => r(document.fonts.status), 5000))]) : 'loaded'",
        15000,
      )
      .catch(() => "unknown");
    if (fonts !== "loaded")
      ctx.errors.push(
        `rhythm: the web fonts were still ${fonts} at ${ctx.width}px after 5 s: lines may move once they arrive`,
      );
  }

  const readExpr = (ctx, desktop, only) =>
    `(${measure.toString()})(${JSON.stringify({ width: ctx.width, height: ctx.height, desktop, only, contract: ctx.buildPlan?.contract })})`;

  // the expansion pass on the same tab, after the first read was cropped: SR-2 read again at the top as the baseline (so
  // a height the crops' scrolling changed, a reveal, a counter or a lazy block, is not taken for one a click changed),
  // then everything opened, SR-2's fit and grid read again, and every height a click changed (CK-06: FAIL any section
  // height change)
  async function expansion(ctx, tab) {
    await tab.eval(scrollExpr(0));
    await ctx.sleep(300);
    const base = await tab.eval(readExpr(ctx, null, ["SR-2"]), 90000);
    if (!base || base.abort)
      throw new Error(`the read before opening failed${base && base.abort ? ": " + base.abort : ""}`);
    const info = await tab.eval(`(${expandAll.toString()})()`, 60000);
    const r2 = await tab.eval(readExpr(ctx, null, ["SR-2"]), 90000);
    if (!r2 || r2.abort) throw new Error(`the read after opening failed${r2 && r2.abort ? ": " + r2.abort : ""}`);
    const tests = [];
    for (const tid of ["T-fit", "T-grid"]) {
      const t = r2.tests.find(x => x.rule === "SR-2" && x.id === tid);
      if (!t || t.verdict === "ERROR") {
        ctx.errors.push(`rhythm SR-2 ${tid}: not read after the answers and tabs were opened${t ? ` (${t.msg})` : ""}`);
        continue;
      }
      tests.push({
        ...t,
        id: tid + "-expanded",
        offenders: t.offenders.map(o => ({ ...o, msg: `with every answer and tab open, ${o.msg}` })),
      });
    }
    const a = base.harness.sections,
      b = r2.harness.sections,
      diffs = [];
    const still = ": nothing in a section may change its height after load";
    if (a.length !== b.length)
      diffs.push({
        sel: "main",
        text: "",
        doc: null,
        msg: `opening every answer and tab changes the number of sections from ${a.length} to ${b.length}${still}`,
      });
    else
      a.forEach((s, i) => {
        if (Math.abs(s.h - b[i].h) > 1 || Math.abs(s.top - b[i].top) > 1)
          diffs.push({
            sel: b[i].sel,
            text: b[i].text,
            doc: b[i].doc,
            d: Math.abs(s.h - b[i].h),
            msg: `with every answer and tab open the section is ${Math.round(b[i].h)}px tall, not ${Math.round(s.h)}px${Math.abs(s.top - b[i].top) > 1 ? `, and starts at ${Math.round(b[i].top)}px, not ${Math.round(s.top)}px` : ""}${still}`,
          });
      });
    for (const c of info.changes) {
      const what =
        c.parts.length ?
          c.parts
            .slice(0, 3)
            .map(p => `${p.sel} from ${Math.round(p.from)} to ${Math.round(p.to)}px`)
            .join(", ")
        : `the page's height from ${c.sh[0]} to ${c.sh[1]}px`;
      diffs.push({
        sel: c.sel,
        text: c.text,
        doc: c.doc,
        name: c.text ? `"${c.text.slice(0, 24)}"` : c.sel,
        msg:
          c.settled ?
            `after every answer and tab was opened the page kept changing: ${what}${still}`
          : `opening ${c.text ? `"${c.text}"` : "it"} changes ${what}${still}`,
      });
    }
    tests.push({
      rule: "SR-2",
      id: "T-height-change",
      verdict: diffs.length ? "FAIL" : "PASS",
      offenders: diffs,
      more: Math.max(0, info.changeCount - info.changes.length),
    });
    ctx.log(
      `expansion: ${info.opened} details opened, ${info.clicked} controls clicked, ${info.changeCount} height changes`,
    );
    return { rows: findingsOf(tests, ctx.width), harness: r2.harness };
  }

  // row and card status read at the widest desktop width, kept by DOM node on the phone (per page, for this process: the
  // desktop width has to run before the phone in the same run)
  const DESK = new Map();

  async function run(ctx) {
    // between the two rule sets: the host emulates a touch phone below 700px, and the phone rules stop at 640px
    if (ctx.width > 640 && ctx.width < 700) {
      const why = `not checked at ${ctx.width}px: the phone rules run to 640px and the desktop rules from 700px (--rhythm-widths takes 1440-like or 390-like widths)`;
      ctx.errors.push(`rhythm: ${why}`);
      if (typeof ctx.notChecked === "function") {
        try {
          ctx.notChecked(
            checks.map(c => c.id),
            why,
          );
        } catch {}
      }
      return [];
    }
    const phone = ctx.width <= 640;
    const F = [],
      cnt = { n: 0 };
    let lap = Date.now();
    const time = what => {
      const now = Date.now();
      ctx.log(`${what} ${((now - lap) / 1000).toFixed(1)} s`);
      lap = now;
    };
    const cut = e =>
      String((e && e.message) || e)
        .replace(/^page: (Error: )?/, "")
        .slice(0, 140);
    const tab = await ctx.safe("rhythm tab", () => ctx.openTab());
    if (!tab) return notMeasured(ctx, "no tab could be opened (see the probe error)");
    try {
      try {
        await tab.send("Emulation.setScrollbarsHidden", { hidden: true }).catch(() => {});
        await tab.send("Page.bringToFront").catch(() => {});
        await tab.goto(ctx.url);
        await tab
          .eval(
            "document.fonts ? Promise.race([document.fonts.ready.then(() => 1), new Promise((r) => setTimeout(r, 5000))]) : 1",
            15000,
          )
          .catch(() => {});
        await ctx.waitReady(tab);
        await ctx.sleep(1500);
        await ctx.safe("rhythm lib", () => ctx.loadLib(tab));
        // one screen is exactly ctx.height (900 at 1440x900, 844 at 390x844, as shoot.mjs cuts its tiles): put the tab back on it
        // when the browser reports another height (a phone's emulated toolbar), before anything is measured
        if ((await ctx.safe("rhythm height", () => tab.eval("window.innerHeight"))) !== ctx.height) {
          await ctx.safe("rhythm height", () =>
            tab.send("Emulation.setDeviceMetricsOverride", {
              width: ctx.width,
              height: ctx.height,
              deviceScaleFactor: 1,
              mobile: ctx.mobile !== undefined ? ctx.mobile : ctx.width < 700,
            }),
          );
          await ctx.sleep(400);
        }
        await prepare(tab, ctx);
      } catch (e) {
        ctx.errors.push(`rhythm load: ${cut(e)}`);
        return notMeasured(ctx, `the page did not load (${cut(e)})`);
      }
      time("load");
      // (a tablet keeps them too: the wider layout decides what a row, a split and a card are)
      const desk =
        phone || ctx.width < 1024 ?
          (DESK.get(ctx.url) || {}).width > ctx.width ?
            DESK.get(ctx.url).status
          : null
        : null;
      if (phone && !desk)
        ctx.errors.push(
          `rhythm: row and card status read at ${ctx.width}px: no desktop read earlier in this run (run 1440 before ${ctx.width} in one run to judge rows and cards as at the desktop)`,
        );
      let res;
      try {
        res = await tab.eval(readExpr(ctx, desk, null), 90000);
      } catch (e) {
        ctx.errors.push(`rhythm: ${cut(e)}`);
        return notMeasured(ctx, `the read failed (${cut(e)})`);
      }
      time("measure");
      if (res && res.abort) {
        ctx.errors.push(`rhythm: ${res.abort}`);
        // a page with no viewport meta tag is drawn 980px wide and shrunk on a phone: that is the fault, the rest unread
        if (res.noViewport)
          return [
            {
              check: "container-edges",
              sev: "FAIL",
              id: 0,
              sel: "head",
              text: "",
              rule: "SR-6 viewport",
              msg: `the page has no viewport meta tag: on a ${ctx.width}px screen it lays out ${res.W}px wide and is drawn shrunk to ${Math.round((ctx.width / res.W) * 100)}%, every margin, line and letter with it (SR-6)`,
              fix: 'add <meta name="viewport" content="width=device-width, initial-scale=1"> to the head',
            },
            ...notMeasured(
              ctx,
              res.abort,
              checks.map(c => c.id).filter(c => c !== "container-edges"),
            ),
          ];
        return notMeasured(ctx, res.abort);
      }
      if (!res || !res.harness || !Array.isArray(res.tests)) return notMeasured(ctx, "the read gave nothing back");
      if (!phone && !(DESK.get(ctx.url)?.width > ctx.width))
        DESK.set(ctx.url, { width: ctx.width, status: res.status });
      const broken = [];
      for (const t of res.tests)
        if (t.verdict === "ERROR") {
          ctx.errors.push(`rhythm ${t.rule}: ${t.msg}`);
          broken.push(CHECK_OF[t.rule]);
        }
      const h = res.harness;
      ctx.log(
        `${h.W}x${h.H}: nav ${h.navH}px, bar ${h.barH}px, ${h.sections.length} sections, ${h.screens} screens, container ${h.container ? `${h.container.left}-${h.container.right} (${h.container.src})` : "none"}, ${h.rows || 0} rows, ${h.splits || 0} splits${h.notes.length ? "; " + h.notes.join("; ") : ""}`,
      );
      const rows = findingsOf(res.tests, ctx.width);
      await cropAll(ctx, tab, rows, h, cnt);
      time("crops");
      F.push(...rows);
      // a rule that broke as it was read is not measured at this width
      if (broken.length)
        F.push(
          ...notMeasured(ctx, "its rule broke as it was read (see the probe error)", [
            ...new Set(broken.filter(Boolean)),
          ]),
        );
      // the expansion pass: only when the page has something to open, never under --quick or --no-rhythm-expand
      if (
        !ctx.quick
        && !ctx.flags["no-rhythm-expand"]
        && h.expandables
        && h.sections.length
        && res.tests.some(t => t.rule === "SR-2" && t.verdict !== "ERROR")
      ) {
        let ex = null;
        try {
          ex = await expansion(ctx, tab);
        } catch (e) {
          ctx.errors.push(`rhythm expansion: ${cut(e)}`);
          F.push(...notMeasured(ctx, `with every answer and tab open (${cut(e)})`, ["section-height"]));
        }
        if (ex) {
          await cropAll(ctx, tab, ex.rows, ex.harness, cnt);
          F.push(...ex.rows);
        }
        time("expansion");
      }
    } finally {
      await tab.close();
    }
    return F.map(strip);
  }
  return { id, phase, checks, fixes, summary, flags, quick, when, run };
})();
