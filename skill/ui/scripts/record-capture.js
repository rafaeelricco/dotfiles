(() => {
  // One expression: record.mjs passes it to Runtime.evaluate; an agent can paste it into any page's console.
  // It measures computed styles only. It never returns page text, picture or link addresses, or attribute values;
  // it reads a control's label only to learn that one exists, and class names only to tell a footer or a consent bar.
  const CAP = 4000;
  const safe = (fn, fallback) => {
    try {
      return fn();
    } catch {
      return fallback;
    }
  };
  const round = (n, d = 0) => {
    const k = 10 ** d;
    return Math.round(n * k) / k;
  };
  const root = document.documentElement;
  const body = document.body || root;
  const vw = root.clientWidth || innerWidth;

  /* ---------------------------------------------------------------- colour */
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = safe(() => canvas.getContext("2d", { willReadFrequently: true }), null);
  const clamp = n => Math.max(0, Math.min(255, Math.round(n)));
  const parse = value => {
    const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/i.exec(value);
    if (m)
      return [
        +m[1],
        +m[2],
        +m[3],
        m[4] === undefined ? 1
        : m[5] ? m[4] / 100
        : +m[4],
      ];
    if (!ctx || !CSS.supports("color", value)) return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const pair = n => clamp(n).toString(16).padStart(2, "0");
  const hex = c => "#" + pair(c[0]) + pair(c[1]) + pair(c[2]) + (c[3] < 0.995 ? pair(c[3] * 255) : "");
  const hex6 = c => "#" + pair(c[0]) + pair(c[1]) + pair(c[2]);
  const paint = value => {
    const c = safe(() => parse(value), null);
    return c && c[3] > 0 ? c : null;
  };
  const over = (c, ground) => [0, 1, 2].map(i => c[i] * c[3] + ground[i] * (1 - c[3])).concat(1);
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const dist = (a, b) => {
    const x = rgb(a);
    const y = rgb(b);
    return Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2]);
  };
  const chroma = h => {
    const x = rgb(h);
    return (Math.max(...x) - Math.min(...x)) / 255;
  };
  const lum = h => {
    const [r, g, b] = rgb(h).map(v => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  // the opaque colour stops of a gradient background, averaged: a gradient button or band paints this colour
  const gradientFill = cs => {
    const img = cs.backgroundImage;
    if (!img || !/gradient\(/i.test(img) || /url\(/i.test(img)) return null;
    const stops = (img.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/gi) || [])
      .map(v => safe(() => parse(v), null))
      .filter(c => c && c[3] >= 0.9);
    if (!stops.length) return null;
    return [0, 1, 2].map(i => stops.reduce((s, c) => s + c[i], 0) / stops.length).concat(1);
  };
  const fillOf = cs => {
    const flat = paint(cs.backgroundColor);
    return flat && flat[3] >= 0.5 ? flat : gradientFill(cs) || flat;
  };
  // decoration, not paint: a blurred glow or a layer seen through low opacity
  const opacityMemo = new Map();
  const opacityOf = el => {
    if (!el || el === root) return 1;
    if (opacityMemo.has(el)) return opacityMemo.get(el);
    const o = (+getComputedStyle(el).opacity || 0) * opacityOf(el.parentElement);
    opacityMemo.set(el, o);
    return o;
  };
  const faint = (el, cs) => {
    const blur = /blur\(\s*([\d.]+)px/.exec(cs.filter || "");
    return (blur && +blur[1] >= 4) || opacityOf(el) < 0.5;
  };
  const rank = map => [...map].sort((a, b) => b[1] - a[1]).map(e => e[0]);
  const bump = (map, key, n) => map.set(key, (map.get(key) || 0) + n);

  /* ---------------------------------------------------------------- custom properties */
  const names = new Set();
  const skipped = [];
  const walk = rules => {
    for (const r of rules) {
      if (r.style) for (const p of r.style) if (p.startsWith("--")) names.add(p);
      if (r.cssRules) walk(r.cssRules);
      if (r.styleSheet) walk(r.styleSheet.cssRules);
    }
  };
  for (const s of document.styleSheets) {
    try {
      walk(s.cssRules);
    } catch {
      skipped.push(safe(() => (s.href ? new URL(s.href).pathname : "inline"), "inline"));
    }
  }

  const COLOR = /^(#[0-9a-f]{3,8}|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(.*\))$/i;
  const tokenValue = (raw, name) => {
    const s = raw.replace(/\s+/g, " ").trim();
    if (!s || s.length > 300 || /url\(/i.test(s)) return "";
    if (/^(".*"|'.*')$/.test(s) && !/font|family|stack/i.test(name)) return "";
    const c = COLOR.test(s) ? safe(() => parse(s), null) : null;
    return c ? hex(c) : s;
  };

  // dark by probe: an element carrying the common dark switches
  const probe = document.createElement("div");
  probe.className = "dark";
  probe.hidden = true;
  probe.dataset.theme = "dark";
  const tokens = safe(() => {
    root.append(probe);
    const light = getComputedStyle(root);
    const dark = getComputedStyle(probe);
    const out = [];
    for (const name of [...names].sort()) {
      const l = tokenValue(light.getPropertyValue(name), name);
      const d = tokenValue(dark.getPropertyValue(name), name);
      if (!l) continue;
      out.push(d && d !== l ? { name, light: l, dark: d } : { name, light: l });
      if (out.length >= 800) break;
    }
    return out;
  }, []);
  safe(() => probe.remove(), null);

  /* ---------------------------------------------------------------- visible elements (sampled) */
  const view = el => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility !== "visible" || +cs.opacity === 0) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.right <= 0 || r.left >= vw) return null;
    return { el, cs, r };
  };
  const entries = safe(() => {
    const list = body.querySelectorAll("*");
    const step = Math.max(1, Math.ceil(list.length / CAP));
    const out = [];
    for (let i = 0; i < list.length && out.length < CAP; i += step) {
      const el = list[i];
      if (el.ownerSVGElement) continue;
      const v = safe(() => view(el), null);
      if (v) out.push(v);
    }
    return out;
  }, []);
  const find = (selector, test = () => true) => {
    let n = 0;
    for (const el of document.querySelectorAll(selector)) {
      if (++n > 300) break;
      const v = safe(() => view(el), null);
      if (v && test(v)) return v;
    }
    return null;
  };

  const range = document.createRange();
  const textArea = el => {
    let a = 0;
    for (const n of el.childNodes) {
      if (n.nodeType !== 3) continue;
      range.selectNodeContents(n);
      const b = range.getBoundingClientRect();
      a += b.width * b.height;
    }
    return a;
  };

  /* ---------------------------------------------------------------- shared readers */
  // 9999 stands for a pill: a radius of 999px or more, or at least half the element's height
  const radiusOf = (cs, r) => {
    const v = cs.borderTopLeftRadius;
    const n = parseFloat(v) || 0;
    const px =
      v.includes("%") ?
        r ? (n / 100) * Math.min(r.width, r.height)
        : n >= 50 ? 9999
        : 0
      : n;
    return px >= 999 || (r && px > 0 && px * 2 >= r.height) ? 9999 : round(px, 1);
  };
  const colourOrNone = v => {
    const c = paint(v);
    return c ? hex(c) : "none";
  };
  const borderOf = cs => {
    const w = parseFloat(cs.borderTopWidth) || 0;
    const c = paint(cs.borderTopColor);
    return w > 0 && cs.borderTopStyle !== "none" && c ? `${round(w, 1)}px ${hex(c)}` : "none";
  };
  const shadowOf = cs => {
    const s = cs.boxShadow;
    if (!s || s === "none") return "none";
    const t = s
      .replace(/rgba?\([^)]*\)/g, m => {
        const c = paint(m);
        return c ? hex(c) : m;
      })
      .replace(/\s+/g, " ")
      .trim();
    return t.length > 200 ? "none" : t;
  };
  const variants = (list, cap) => {
    const counts = new Map();
    for (const o of list) bump(counts, JSON.stringify(o), 1);
    return rank(counts)
      .slice(0, cap)
      .map(k => JSON.parse(k));
  };
  const groundOf = el => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const c = paint(getComputedStyle(p).backgroundColor);
      if (c && c[3] >= 0.9) return hex6(c);
    }
    return null;
  };

  /* ---------------------------------------------------------------- roles */
  const page = safe(() => {
    const c = [body, root].map(e => paint(getComputedStyle(e).backgroundColor)).find(x => x && x[3] >= 0.5);
    return c ? [c[0], c[1], c[2], 1] : [255, 255, 255, 1];
  }, [255, 255, 255, 1]);
  const INTERACTIVE = 'a, button, [role="button"], input[type="submit"], input[type="button"], summary';
  const CONTROLS = 'a, button, input, select, textarea, [role="button"]';
  const roles = safe(
    () => {
      const painted = new Map();
      const pageRec = { c: hex6(page), a: vw * Math.max(root.scrollHeight, innerHeight) };
      painted.set(body, pageRec);
      const texts = [];
      const accents = new Map();
      for (const { el, cs, r } of entries) {
        const area = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)) * r.height;
        const decor = faint(el, cs);
        const fill = decor ? null : fillOf(cs);
        // a control's paint often sits on a span inside the link or button
        const interactive = !!el.closest(INTERACTIVE);
        if (fill && fill[3] >= 0.5) {
          const rec = { c: hex6(fill), a: area, el, big: r.width >= 160 && r.height >= 80 };
          painted.set(el, rec);
          if (fill[3] >= 0.9) {
            let p = el.parentElement;
            while (p && !painted.has(p)) p = p.parentElement;
            const up = p && painted.get(p);
            if (up) up.a = Math.max(0, up.a - area);
          }
          if (interactive && chroma(rec.c) >= 0.2) bump(accents, rec.c, area + 4000);
        }
        const ta = textArea(el);
        // text painted by a clipped gradient reads transparent: its colour is the gradient's
        const clipFill = () => {
          for (let p = el, i = 0; p && i < 4; p = p.parentElement, i++) {
            const s = p === el ? cs : getComputedStyle(p);
            if (/text/.test(s.backgroundClip || s.webkitBackgroundClip || "")) return gradientFill(s);
          }
          return null;
        };
        const ink = ta > 0 ? paint(cs.color) || clipFill() : null;
        if (ink && !decor) {
          const h = hex6(ink[3] < 1 ? over(ink, page) : ink);
          texts.push({ h, ta, el });
          if (el.matches("a") && chroma(h) >= 0.2) bump(accents, h, ta + 4000);
        }
      }
      const grounds = new Map();
      for (const rec of painted.values()) bump(grounds, rec.c, rec.a);
      const order = rank(grounds);
      const bg = order[0] || hex6(page);
      // surface: a ground, not a control; big enough to hold content; on the same side of the lightness scale as bg
      const light = h => {
        const x = rgb(h);
        return (Math.max(...x) + Math.min(...x)) / 510;
      };
      const surfaces = new Map();
      for (const rec of painted.values()) {
        if (rec.el === undefined || !rec.big || rec.c === bg || Math.abs(light(rec.c) - light(bg)) > 0.25) continue;
        if (!rec.el.closest(CONTROLS)) bump(surfaces, rec.c, rec.a);
      }
      const surface = rank(surfaces)[0] || null;
      // ink and muted are text read on the page ground: white type over a photograph or inside a dark
      // mock-up does not count, however much of it there is
      const inks = new Map();
      const all = new Map();
      for (const t of texts) {
        bump(all, t.h, t.ta);
        if (contrast(t.h, bg) >= 3) bump(inks, t.h, t.ta);
      }
      const inkOrder = inks.size ? rank(inks) : rank(all);
      const ink =
        inkOrder.find(h => contrast(h, bg) >= 4.5)
        || inkOrder[0]
        || (dist(bg, "#000000") > 380 ? "#000000" : "#ffffff");
      const between = h => (lum(h) - lum(ink)) * (lum(h) - lum(bg)) < 0;
      const muted = inkOrder.find(h => chroma(h) < 0.2 && dist(h, ink) > 30 && dist(h, bg) > 60 && between(h)) || null;
      const accent =
        rank(accents)[0] || [...order, ...inkOrder].find(h => chroma(h) >= 0.25 && dist(h, bg) > 30) || ink;
      return { bg, surface, ink, muted, accent };
    },
    { bg: "#ffffff", surface: null, ink: "#000000", muted: null, accent: "#000000" },
  );

  /* ---------------------------------------------------------------- type */
  const family = s => {
    const m = /^\s*(?:"([^"]*)"|'([^']*)'|([^,]*))/.exec(s);
    return (m[1] ?? m[2] ?? m[3] ?? "").trim();
  };
  const typeRow = (role, v) => {
    const cs = v.cs;
    const size = parseFloat(cs.fontSize) || 16;
    const lh = parseFloat(cs.lineHeight);
    const ls = parseFloat(cs.letterSpacing);
    const em = ls ? round(ls / size, 3) : 0;
    return {
      role,
      family: family(cs.fontFamily),
      size: round(size, 1),
      line: Number.isNaN(lh) ? round(size * 1.2, 1) : round(lh, 1),
      weight: parseInt(cs.fontWeight, 10) || 400,
      tracking: em ? `${em}em` : "0",
    };
  };
  const biggestText = selector => {
    let best = null;
    let n = 0;
    for (const el of document.querySelectorAll(selector)) {
      if (++n > 80) break;
      const v = safe(() => view(el), null);
      const a = v ? textArea(el) : 0;
      if (a > 0 && (!best || a > best.a)) best = { v, a };
    }
    return best && best.v;
  };
  const largest = selector => {
    let best = null;
    let n = 0;
    for (const el of document.querySelectorAll(selector)) {
      if (++n > 80) break;
      const v = safe(() => view(el), null);
      if (
        v
        && textArea(el) + el.textContent.length > 0
        && (!best || parseFloat(v.cs.fontSize) > parseFloat(best.cs.fontSize))
      )
        best = v;
    }
    return best;
  };
  const BUTTONS =
    'button,[role="button"], input[type="button"], input[type="submit"], a[class*="btn" i], a[class*="button" i]';
  const buttons = safe(() => {
    const out = [];
    for (const el of document.querySelectorAll(BUTTONS)) {
      if (out.length >= 80) break;
      const v = safe(() => view(el), null);
      if (v && v.r.height >= 20 && v.r.width >= 28) out.push(v);
    }
    return out;
  }, []);
  const type = safe(() => {
    const rows = [];
    const pick = [
      ["h1", find("h1")],
      // the section title is the largest h2, not the first (a hero lead or a small label can be an h2)
      ["h2", largest("h2")],
      ["h3", largest("h3")],
      ["body", biggestText("p") || biggestText("li") || (entries.length ? view(body) : null)],
      ["small", find("small, figcaption, footer a, footer p, label")],
      ["button", buttons[0] || null],
      ["nav", find("nav a, header a")],
    ];
    for (const [role, v] of pick) if (v) rows.push(typeRow(role, v));
    return rows;
  }, []);

  /* ---------------------------------------------------------------- layout and sections */
  const layout = safe(
    () => {
      let container = null;
      for (const { el, cs, r } of entries) {
        if (r.width < 320 || r.width >= vw - 16 || r.height < 40 || Math.abs(r.left - (vw - r.right)) > 2) continue;
        if (cs.display === "inline" || (container && r.width <= container.r.width)) continue;
        container = { el, cs, r };
      }
      let width = vw;
      let gutter = 0;
      if (container) {
        width = round(container.r.width);
        const pad = parseFloat(container.cs.paddingLeft) || 0;
        const edge = Math.round((vw - container.r.width) / 2);
        gutter =
          pad > 0 ? round(pad)
          : edge <= 64 ? edge
          : 0;
      } else {
        const lefts = entries.filter(e => textArea(e.el) > 0 && e.r.left > 0).map(e => e.r.left);
        if (lefts.length) gutter = Math.min(round(Math.min(...lefts)), 64);
      }
      const near = v => v.r.top < 300;
      const head =
        find("header", near)
        || find("[role='banner']", near)
        || find("nav", near)
        || entries
          .filter(
            e =>
              /^(fixed|sticky)$/.test(e.cs.position) && e.r.top <= 40 && e.r.top > -e.r.height && e.r.width >= vw * 0.5,
          )
          .sort((a, b) => a.r.top - b.r.top)[0];
      return { container: width, gutter, header: head ? round(head.r.height) : null, sectionGap: 0 };
    },
    { container: vw, gutter: 0, header: null, sectionGap: 0 },
  );

  const kids = el => [...el.children].map(c => safe(() => view(c), null)).filter(Boolean);
  const sectionList = safe(() => {
    let host = find("main") ? find("main").el : body;
    for (let i = 0; i < 4; i++) {
      const k = kids(host);
      if (k.length === 1 && !/^(section|header|footer|article)$/i.test(k[0].el.tagName)) host = k[0].el;
      else break;
    }
    return kids(host)
      .filter(v => v.r.height >= 40)
      .slice(0, 40);
  }, []);
  const colsOf = sec => {
    let best = 1;
    let n = 0;
    for (const d of [sec.el, ...sec.el.querySelectorAll("*")]) {
      if (++n > 200) break;
      const cs = getComputedStyle(d);
      const grid = cs.display.includes("grid");
      const flex = cs.display.includes("flex") && cs.flexDirection.startsWith("row");
      if (!grid && !flex) continue;
      const cells = kids(d).filter(k => k.cs.position !== "absolute" && k.r.width >= 120 && k.r.height >= 80);
      const tracks = grid ? cs.gridTemplateColumns.split(" ").filter(t => /\d/.test(t)).length : cells.length;
      const count = Math.min(tracks || cells.length, cells.length);
      if (count > best && count <= 12) best = count;
    }
    return best;
  };
  const leadsMedia = sec => {
    const area = sec.r.width * sec.r.height;
    let n = 0;
    for (const d of [sec.el, ...sec.el.querySelectorAll("*")]) {
      if (++n > 150) break;
      const cs = getComputedStyle(d);
      const tag = d.tagName.toLowerCase();
      const isMedia = /^(img|video|picture|canvas)$/.test(tag) || (tag === "svg" && d.clientWidth >= 200);
      if (!isMedia && !cs.backgroundImage.includes("url(") && !cs.backgroundImage.includes("gradient(")) continue;
      const r = d.getBoundingClientRect();
      if (r.width * r.height >= area * 0.2) return true;
    }
    return false;
  };
  const sections = safe(
    () =>
      sectionList.map(s => ({
        h: round(s.r.height),
        cols: safe(() => colsOf(s), 1),
        media: safe(() => leadsMedia(s), false),
      })),
    [],
  );
  safe(() => {
    const gaps = [];
    for (let i = 1; i < sectionList.length; i++) {
      const a = sectionList[i - 1];
      const b = sectionList[i];
      gaps.push(
        Math.max(0, b.r.top - a.r.bottom) + (parseFloat(a.cs.paddingBottom) || 0) + (parseFloat(b.cs.paddingTop) || 0),
      );
    }
    gaps.sort((x, y) => x - y);
    if (gaps.length) layout.sectionGap = round(gaps[Math.floor(gaps.length / 2)]);
  }, null);

  /* ---------------------------------------------------------------- radii, shadows, motion */
  const radiusCounts = new Map();
  const shadowCounts = new Map();
  const motionCounts = new Map();
  safe(() => {
    for (const { cs, r } of entries) {
      const px = radiusOf(cs, r);
      if (px > 0) bump(radiusCounts, px, 1);
      const sh = shadowOf(cs);
      if (sh !== "none") bump(shadowCounts, sh, 1);
      const durations = cs.transitionDuration.split(",").map(s => s.trim());
      const easings = cs.transitionTimingFunction.split(/,(?![^(]*\))/).map(s => s.replace(/\s+/g, " ").trim());
      const seen = new Set();
      durations.forEach((d, i) => {
        const ms = parseFloat(d) * (d.endsWith("ms") ? 1 : 1000);
        if (!ms) return;
        seen.add(`${round(ms)}ms|${easings[i % easings.length] || "ease"}`);
      });
      for (const k of seen) bump(motionCounts, k, 1);
    }
  }, null);
  const radii = rank(radiusCounts)
    .slice(0, 8)
    .map(px => ({ px, count: radiusCounts.get(px) }));
  const shadows = rank(shadowCounts)
    .slice(0, 6)
    .map(value => ({ value, count: shadowCounts.get(value) }));
  const motion = rank(motionCounts)
    .slice(0, 6)
    .map(k => {
      const i = k.indexOf("|");
      return { duration: k.slice(0, i), easing: k.slice(i + 1), count: motionCounts.get(k) };
    });

  /* ---------------------------------------------------------------- components */
  // a control painted by a layer inside it (a gradient span under the label) takes that layer's fill; an opaque
  // layer first, else the control's own tint, else a full-size tint layer (a frosted key's background span)
  const paintOf = (el, cs, r) => {
    const own = fillOf(cs);
    if (own && own[3] >= 0.5) return own;
    if (!el) return own;
    let n = 0;
    let tint = null;
    for (const d of el.querySelectorAll("*")) {
      if (++n > 40) break;
      const dcs = getComputedStyle(d);
      const dr = d.getBoundingClientRect();
      if (dr.width * dr.height < r.width * r.height * 0.8 || faint(d, dcs)) continue;
      const f = fillOf(dcs);
      if (f && f[3] >= 0.5) return f;
      if (f && !tint) tint = f;
    }
    return own || tint;
  };
  const frame = ({ el, cs, r }) => ({
    h: round(r.height),
    radius: radiusOf(cs, r),
    padX: round(parseFloat(cs.paddingLeft) || 0),
    bg: (c => (c ? hex(c) : "none"))(paintOf(el, cs, r)),
    color: colourOrNone(cs.color),
    border: borderOf(cs),
  });
  const components = {
    button: safe(() => variants(buttons.map(frame), 6), []),
    input: safe(() => {
      const out = [];
      const selector = [
        "input:not([type])",
        ...["text", "email", "search", "url", "tel", "password", "number"].map(t => `input[type="${t}"]`),
        "textarea",
        "select",
      ].join(", ");
      for (const el of document.querySelectorAll(selector)) {
        if (out.length >= 40) break;
        const v = safe(() => view(el), null);
        if (v && v.r.height >= 20) out.push(frame(v));
      }
      return variants(out, 4);
    }, []),
    card: safe(() => {
      const out = [];
      for (const { el, cs, r } of entries) {
        if (r.width < 120 || r.width >= vw - 2 || r.height < 80 || r.height > 900) continue;
        if (
          /^(html|body|main|header|footer|nav|button|input|select|textarea|img|video|svg|canvas|picture)$/i.test(
            el.tagName,
          )
        )
          continue;
        const radius = radiusOf(cs, r);
        const shadow = shadowOf(cs);
        const border = borderOf(cs);
        if (!radius && shadow === "none" && border === "none") continue;
        const fill = paint(cs.backgroundColor);
        const bg = fill && fill[3] >= 0.9 ? hex6(fill) : "none";
        const differs = bg !== "none" && bg !== (groundOf(el) || hex6(page));
        if (!differs && border === "none" && shadow === "none") continue;
        out.push({ radius, pad: round(parseFloat(cs.paddingLeft) || 0), bg, border, shadow });
      }
      return variants(out, 4);
    }, []),
  };

  // the primary action: a filled control at least 32px tall that stands off the page ground (a white key on
  // a white page is a secondary or a mock-up's key). Candidates come in tiers, the first non-empty one wins:
  //   1. opaque keys in the page's body;
  //   2. translucent keys with a text label (a tint over the ground, often frosted with a backdrop blur): a site
  //      whose call to action is a glass key has no opaque one, while a ghost "Log in" or a soft tint beside a
  //      solid key never outranks it;
  //   3. the rest: a footer's keys and a form submit below the first screen (a lone newsletter button).
  // A consent banner's keys never count. Within a tier, a saturated fill first, then the style the page
  // repeats most, a key in the first screen counting double
  const CONSENT = /\b(?:cookie|consent|gdpr|onetrust|didomi|truste|trustarc|usercentrics)/i;
  const consentOf = el => {
    for (let p = el; p && p !== body; p = p.parentElement)
      if (CONSENT.test(`${p.id || ""} ${p.getAttribute("class") || ""} ${p.getAttribute("aria-label") || ""}`))
        return true;
    return false;
  };
  // the site footer, not a card's or a modal's footer row
  const FOOTER_CLASS = /^(?:site-|page-|main-|global-)?footer(?:$|[_-])/i;
  const footerOf = el => {
    if (el.closest('footer, [role="contentinfo"]')) return true;
    for (let p = el; p && p !== body; p = p.parentElement)
      if ([...p.classList].some(c => FOOTER_CLASS.test(c))) return true;
    return false;
  };
  const blurOf = cs => {
    const b = cs.backdropFilter || cs.webkitBackdropFilter || "none";
    return /blur\(/.test(b) ? b : "none";
  };
  const primary = safe(() => {
    const cands = [];
    for (const v of buttons) {
      if (v.r.height < 32 || v.r.width < 40 || faint(v.el, v.cs) || consentOf(v.el)) continue;
      const f = paintOf(v.el, v.cs, v.r);
      if (!f || f[3] < 0.05) continue;
      const blur = blurOf(v.cs);
      const opaque = f[3] >= 0.9;
      let c;
      if (opaque) {
        c = hex6(f);
        if (dist(c, roles.bg) <= 60) continue;
      } else {
        if ((v.el.innerText || v.el.value || "").trim().length < 2) continue;
        const g = paint(groundOf(v.el) || hex6(page)) || page;
        c = hex6(over(f, g));
        if (dist(c, hex6(g)) < 12 && blur === "none") continue;
      }
      const top = v.r.top < innerHeight;
      const aside = footerOf(v.el) || (!top && !!v.el.closest("form"));
      cands.push({
        v,
        c,
        tier:
          aside ? 3
          : opaque ? 1
          : 2,
        key: `${hex(f)}|${blur !== "none"}`,
        weight: top ? 2 : 1,
        blur,
      });
    }
    const tier = Math.min(...cands.map(x => x.tier));
    const level = cands.filter(x => x.tier === tier);
    const sat = level.filter(x => chroma(x.c) >= 0.2);
    const pool = sat.length ? sat : level;
    const score = new Map();
    for (const x of pool) bump(score, x.key, x.weight);
    pool.sort(
      (a, b) =>
        score.get(b.key) - score.get(a.key)
        || b.weight - a.weight
        || b.v.r.width * b.v.r.height - a.v.r.width * a.v.r.height,
    );
    const x = pool[0];
    return x ? { ...frame(x.v), shadow: shadowOf(x.v.cs), ...(x.blur !== "none" ? { blur: x.blur } : {}) } : null;
  }, null);
  if (primary && chroma(hex6(paint(primary.bg) || [0, 0, 0, 1])) >= 0.2) roles.accent = hex6(paint(primary.bg));
  components.primary = primary;

  return {
    v: 1,
    captured: new Date().toISOString().slice(0, 10),
    path: location.pathname,
    viewport: [innerWidth, innerHeight],
    tokens,
    skipped,
    roles,
    type,
    layout,
    sections,
    radii,
    shadows,
    motion,
    components,
  };
})();
