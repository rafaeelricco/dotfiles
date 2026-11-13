(() => {
  // Read-only page probe: measures computed styles, never writes to the DOM. Returns one JSON-safe object.
  const problems = [];
  const safe = (fn, fallback, label = "block") => {
    try {
      return fn();
    } catch (e) {
      problems.push(`${label}: ${e && e.message ? e.message : e}`);
      return fallback;
    }
  };
  const round = (n, d = 0) => Math.round(n * 10 ** d) / 10 ** d;
  const root = document.documentElement;
  const body = document.body || root;
  const vw = root.clientWidth || innerWidth;
  const sy = scrollY;
  const sx = scrollX;
  const cs = el => getComputedStyle(el);
  const top = (map, n) => [...map].sort((a, b) => b[1] - a[1]).slice(0, n);
  const bump = (map, key, n = 1) => map.set(key, (map.get(key) || 0) + n);

  // Colour: computed value -> [r, g, b, a]; modern syntaxes go through a detached 1x1 canvas (never inserted).
  const pad2 = n =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = safe(() => canvas.getContext("2d", { willReadFrequently: true }), null, "canvas");
  const parse = value => {
    const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/i.exec(value || "");
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
  const hex = c => "#" + pad2(c[0]) + pad2(c[1]) + pad2(c[2]) + (c[3] < 0.995 ? pad2(c[3] * 255) : "");
  const colorOf = v => safe(() => parse(v), null, "colour");
  // A gradient paints roughly the average of its stop colours.
  const gradientFill = s => {
    if (!/gradient\(/i.test(s.backgroundImage) || /url\(/i.test(s.backgroundImage)) return null;
    const stops = (s.backgroundImage.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/gi) || [])
      .map(colorOf)
      .filter(c => c && c[3] > 0);
    if (!stops.length) return null;
    return [0, 1, 2, 3].map(i => stops.reduce((sum, c) => sum + c[i], 0) / stops.length);
  };
  const fillOf = s => {
    const flat = colorOf(s.backgroundColor);
    return flat && flat[3] > 0 ? flat : gradientFill(s);
  };

  // Shared readers: unquoted first font family, radius (9999 = pill), unit-less ms, and a short CSS-ish path.
  const family = s => (s.fontFamily.split(",")[0] || "").trim().replace(/^["']|["']$/g, "");
  const radiusOf = (s, r) => {
    const v = s.borderTopLeftRadius;
    const px = v.includes("%") ? (parseFloat(v) / 100) * Math.min(r.width, r.height) : parseFloat(v) || 0;
    return (
      px <= 0 ? 0
      : px >= 999 || px * 2 >= Math.min(r.width, r.height) ? 9999
      : round(px, 1)
    );
  };
  const ms = d => parseFloat(d) * (/ms\s*$/.test(d) ? 1 : 1000);
  const CONSENT = /cookie|consent|gdpr|onetrust|didomi/i;
  const inConsent = el => {
    for (let p = el; p && p !== body; p = p.parentElement)
      if (CONSENT.test(`${p.id} ${p.getAttribute("class") || ""} ${p.getAttribute("aria-label") || ""}`)) return true;
    return false;
  };
  const pathOf = el => {
    const parts = [];
    for (let p = el; p && p !== body && p !== root && parts.length < 4; p = p.parentElement)
      parts.unshift(
        p.tagName.toLowerCase()
          + [...p.classList]
            .filter(c => /^[\w-]{1,30}$/.test(c))
            .slice(0, 2)
            .map(c => "." + c)
            .join(""),
      );
    return parts.join(" > ");
  };
  // An exact selector (nth-child chain from body), so a caller can re-measure an element after scrolling.
  const selOf = el => {
    const parts = [];
    for (let p = el; p && p !== body && p.parentElement; p = p.parentElement)
      parts.unshift(`${p.tagName.toLowerCase()}:nth-child(${[...p.parentElement.children].indexOf(p) + 1})`);
    return ["body", ...parts].join(" > ");
  };
  let secEls = [];
  const secOf = el => {
    const i = secEls.findIndex(s => s.contains(el));
    return i < 0 ? null : i;
  };

  // A visible element: displayed, painted, at least 1x1 and not wholly off the sides of the viewport.
  const view = el => {
    const s = cs(el);
    if (s.display === "none" || s.visibility !== "visible" || +s.opacity === 0) return null;
    const r = el.getBoundingClientRect();
    return r.width < 1 || r.height < 1 || r.right <= 0 || r.left >= vw ? null : { el, s, r };
  };
  // Up to 4000 elements of the body, strided, that are visible: the sample every statistic below reads.
  const entries = safe(
    () => {
      const list = body.querySelectorAll("*");
      const step = Math.max(1, Math.ceil(list.length / 4000));
      const out = [];
      for (let i = 0; i < list.length && out.length < 4000; i += step) {
        const el = list[i];
        if (el.ownerSVGElement || /^(script|style|link|meta|noscript|template|br|source|track)$/i.test(el.tagName))
          continue;
        const v = safe(() => view(el), null, "view");
        if (v) out.push(v);
      }
      return out;
    },
    [],
    "entries",
  );
  const find = (selector, test = () => true) => {
    let n = 0;
    for (const el of document.querySelectorAll(selector)) {
      if (++n > 300) break;
      const v = view(el);
      if (v && test(v)) return v;
    }
    return null;
  };
  const range = document.createRange();
  const ownText = el => [...el.childNodes].filter(n => n.nodeType === 3 && n.nodeValue.trim());
  const textArea = el =>
    ownText(el).reduce((a, n) => {
      range.selectNodeContents(n);
      const b = range.getBoundingClientRect();
      return a + b.width * b.height;
    }, 0);
  const label = el =>
    ((el.value && el.tagName === "INPUT" ? el.value : el.textContent) || "").replace(/\s+/g, " ").trim().slice(0, 40);

  // Sections: descend from <main> (else body) while it has one wrapper child, then take its tall visible children.
  const kidsOf = el => [...el.children].map(c => safe(() => view(c), null, "kid")).filter(Boolean);
  const ROLE = [
    ["heading", /^h[1-6]$/],
    ["media", /^(img|picture|svg|video|canvas|iframe)$/],
    ["link", /^a$/],
    ["input", /^(input|select|textarea)$/],
  ];
  const roleOf = (el, kidsAll) => {
    const t = el.tagName.toLowerCase();
    if (t === "button" || el.getAttribute("role") === "button") return "button";
    const hit = ROLE.find(([, re]) => re.test(t));
    if (hit) return hit[0];
    return ownText(el).length && kidsAll.every(k => k.s.display.startsWith("inline")) ? "text" : "group";
  };
  const near = (a, b) => ["left", "top", "right", "bottom"].every(k => Math.abs(a[k] - b[k]) <= 4);
  let budget = 3000;
  // One box node (percentages of the section rect); wrappers around one same-sized child collapse into the child.
  const boxOf = (v, depth, sr) => {
    if (budget-- <= 0 || v.r.width < 24 || v.r.height < 24) return null;
    const all = kidsOf(v.el);
    const kids = all.filter(k => k.r.width >= 24 && k.r.height >= 24).slice(0, 12);
    const role = roleOf(v.el, all);
    const fill = fillOf(v.s);
    const bg = fill ? hex(fill) : undefined;
    const radius = radiusOf(v.s, v.r) || undefined;
    if (role === "group" && kids.length === 1 && near(v.r, kids[0].r)) {
      const inner = boxOf(kids[0], depth, sr);
      return inner && { ...inner, bg: inner.bg || bg, radius: inner.radius || radius };
    }
    const grid = v.s.display.includes("grid") && v.s.gridTemplateColumns !== "none";
    const cols =
      grid ?
        v.s.gridTemplateColumns
          .replace(/\[[^\]]*\]/g, "")
          .trim()
          .split(/\s+/).length
      : /flex/.test(v.s.display) && v.s.flexDirection.startsWith("row") ? kids.length
      : 1;
    const pad = ["Top", "Right", "Bottom", "Left"].map(k => round(parseFloat(v.s["padding" + k]) || 0, 1));
    const node = {
      role,
      x: round(((v.r.left - sr.left) / sr.width) * 100, 1),
      y: round(((v.r.top - sr.top) / sr.height) * 100, 1),
      w: round((v.r.width / sr.width) * 100, 1),
      h: round((v.r.height / sr.height) * 100, 1),
      display: v.s.display,
      cols: cols > 1 ? cols : undefined,
      gap: round(parseFloat(v.s.columnGap) || parseFloat(v.s.rowGap) || 0, 1),
      pad: pad.some(Boolean) ? pad : undefined,
      radius,
      bg,
      label: /^(heading|button|link)$/.test(role) && label(v.el) ? label(v.el) : undefined,
    };
    if (/^(group|link)$/.test(role) && depth < 3) {
      const children = kids.map(k => boxOf(k, depth + 1, sr)).filter(Boolean);
      if (children.length) node.children = children;
    }
    return node;
  };
  const sections = safe(
    () => {
      const main = find("main");
      let host = main ? main.el : body;
      for (let i = 0; i < 4; i++) {
        const k = kidsOf(host);
        if (k.length === 1 && !/^(section|header|footer|article)$/i.test(k[0].el.tagName)) host = k[0].el;
        else break;
      }
      // The site bar and footer usually sit beside <main>, not in it: add main's visible siblings.
      const outside = main ? kidsOf(main.el.parentElement).filter(v => v.el !== main.el) : [];
      const list = [...outside, ...kidsOf(host)]
        .filter(v => v.r.height >= 40)
        .sort((a, b) => a.r.top - b.r.top)
        .slice(0, 40);
      secEls = list.map(v => v.el);
      return list.map((v, i) => {
        const h = v.el.querySelector("h1, h2, h3");
        const heading = h ? h.textContent.replace(/\s+/g, " ").trim().slice(0, 80) : "";
        const boxes = safe(
          () =>
            kidsOf(v.el)
              .slice(0, 12)
              .map(k => boxOf(k, 1, v.r))
              .filter(Boolean),
          [],
          "boxes",
        );
        return {
          i,
          sel: selOf(v.el),
          x: round(v.r.left + sx),
          y: round(v.r.top + sy),
          w: round(v.r.width),
          h: round(v.r.height),
          tag: v.el.tagName.toLowerCase(),
          id: v.el.id || "",
          heading: heading || null,
          boxes,
        };
      });
    },
    [],
    "sections",
  );

  // Colours: top 8 backgrounds by painted area (alpha >= 0.5) and top 8 text colours by text area.
  // `page` is the canvas: html's background, else body's (CSS moves it to the canvas when html has
  // none), counted over the page so it ranks even when every section is transparent.
  const colors = safe(
    () => {
      const fills = new Map();
      const texts = new Map();
      for (const { el, s, r } of entries) {
        const f = fillOf(s);
        if (f && f[3] >= 0.5) bump(fills, hex(f), Math.min(r.width, vw) * r.height);
        const t = textArea(el);
        const c = t > 0 && colorOf(s.color);
        if (c) bump(texts, hex(c), t);
      }
      const page = [root, body].map(e => fillOf(cs(e))).find(f => f && f[3] >= 0.5);
      if (page) bump(fills, hex(page), vw * root.scrollHeight);
      const out = m => top(m, 8).map(([h, a]) => ({ hex: h, area: round(a) }));
      return { page: page ? hex(page) : null, fills: out(fills), text: out(texts) };
    },
    { page: null, fills: [], text: [] },
    "colors",
  );

  // Type: per role, the most common visible sample grouped by family|size|weight.
  const BUTTONS =
    'button, [role="button"], input[type="submit"], input[type="button"], a[class*="btn" i], a[class*="button" i]';
  const typeRow = v => {
    const size = parseFloat(v.s.fontSize);
    const lh = parseFloat(v.s.lineHeight);
    const ls = parseFloat(v.s.letterSpacing);
    return {
      family: family(v.s),
      size: round(size, 1),
      line: round(Number.isNaN(lh) ? size * 1.2 : lh, 1),
      weight: parseInt(v.s.fontWeight, 10) || 400,
      tracking: round(Number.isNaN(ls) ? 0 : ls / size, 3),
      transform: v.s.textTransform,
    };
  };
  const sample = selector => {
    const groups = new Map();
    for (const el of [...document.querySelectorAll(selector)].slice(0, 200)) {
      const v = view(el);
      if (!v || !el.textContent.trim() || inConsent(el)) continue;
      const key = [family(v.s), Math.round(parseFloat(v.s.fontSize)), v.s.fontWeight].join("|");
      const g = groups.get(key) || { n: 0, v };
      g.n++;
      groups.set(key, g);
    }
    const best = [...groups.values()].sort((a, b) => b.n - a.n)[0];
    return best ? typeRow(best.v) : null;
  };
  const type = {};
  for (const [role, selector] of [
    ["h1", "h1"],
    ["h2", "h2"],
    ["h3", "h3"],
    ["p", "p"],
    ["small", "small, figcaption, label"],
    ["button", BUTTONS],
    ["nav", "nav a, header a"],
  ])
    type[role] = safe(() => sample(selector), null, "type." + role);

  // Stylesheets: walk readable rules (grouping rules and @import included) for custom properties and @font-face.
  const names = new Set();
  const faces = [];
  let visited = 0;
  // A face's url() is relative to its own stylesheet: resolve it to an absolute address.
  const absolute = (src, base) =>
    src.replace(
      /url\(\s*["']?([^"')]+)["']?\s*\)/g,
      (_, u) => `url("${safe(() => new URL(u, base).href, u, "font-url")}")`,
    );
  const walk = (rules, base) => {
    for (const r of rules) {
      if (++visited > 20000) return;
      if (r.type === 5 && faces.length < 60)
        faces.push({
          family: r.style.getPropertyValue("font-family").replace(/^["']|["']$/g, ""),
          weight: r.style.getPropertyValue("font-weight") || "normal",
          src: absolute(r.style.getPropertyValue("src").replace(/\s+/g, " "), base).slice(0, 300),
        });
      else if (r.style) for (const p of r.style) if (p.startsWith("--")) names.add(p);
      if (r.cssRules) walk(r.cssRules, base);
      if (r.styleSheet) walk(r.styleSheet.cssRules, r.styleSheet.href || base);
    }
  };
  for (const sheet of [...document.styleSheets].slice(0, 100))
    safe(() => walk(sheet.cssRules, sheet.href || location.href), null, "stylesheet");
  const fonts = safe(
    () => {
      const seen = new Map();
      document.fonts.forEach(f => {
        if (f.status === "loaded")
          seen.set([f.family, f.weight, f.style].join("|"), {
            family: f.family.replace(/^["']|["']$/g, ""),
            weight: f.weight,
            style: f.style,
          });
      });
      return { loaded: [...seen.values()], faces };
    },
    { loaded: [], faces: [] },
    "fonts",
  );
  const tokens = safe(
    () => {
      const rootStyle = cs(root);
      const out = [];
      for (const name of [...names].sort()) {
        const value = rootStyle.getPropertyValue(name).trim();
        if (value && value.length <= 200 && !/url\(/i.test(value)) out.push({ name, value });
        if (out.length >= 300) break;
      }
      return out;
    },
    [],
    "tokens",
  );

  // Radii and shadows: most common non-zero corner radii and box-shadow strings in the sample.
  const radiusCount = new Map();
  const shadowCount = new Map();
  safe(
    () => {
      for (const { s, r } of entries) {
        const px = radiusOf(s, r);
        if (px) bump(radiusCount, px);
        if (s.boxShadow !== "none" && s.boxShadow.length <= 200) bump(shadowCount, s.boxShadow);
      }
    },
    null,
    "radii",
  );
  const radii = top(radiusCount, 6).map(([px, count]) => ({ px, count }));
  const shadows = top(shadowCount, 6).map(([css, count]) => ({ css, count }));

  // Layout: widest horizontally centred element (container), its gutter, and the top header bar's height.
  const layout = safe(
    () => {
      let box = null;
      for (const e of entries) {
        if (
          e.r.width < 320
          || e.r.width >= vw - 16
          || e.s.display === "inline"
          || Math.abs(e.r.left - (vw - e.r.right)) > 2
        )
          continue;
        if (!box || e.r.width > box.r.width) box = e;
      }
      const edge = box ? Math.round((vw - box.r.width) / 2) : 0;
      const padL = box ? parseFloat(box.s.paddingLeft) || 0 : 0;
      const gutter =
        padL > 0 ? round(padL)
        : edge <= 64 ? edge
        : 0;
      const bar =
        find("header, [role='banner'], nav", v => v.r.top + sy < 300)
        || entries
          .filter(e => /^(fixed|sticky)$/.test(e.s.position) && e.r.top <= 40 && e.r.width >= vw * 0.5)
          .sort((a, b) => a.r.top - b.r.top)[0];
      return { container: box ? round(box.r.width) : vw, gutter, header: bar ? round(bar.r.height) : null };
    },
    { container: vw, gutter: 0, header: null },
    "layout",
  );

  // Buttons: the 4 most common distinct looks among button-like controls, outside cookie and consent bars.
  const buttons = safe(
    () => {
      const counts = new Map();
      let n = 0;
      for (const el of document.querySelectorAll(BUTTONS)) {
        if (++n > 300) break;
        const v = view(el);
        if (!v || v.r.height < 20 || v.r.width < 28 || inConsent(el)) continue;
        const fill = fillOf(v.s);
        const bc = colorOf(v.s.borderTopColor);
        const bw = parseFloat(v.s.borderTopWidth) || 0;
        const color = colorOf(v.s.color);
        bump(
          counts,
          JSON.stringify({
            h: round(v.r.height),
            padX: round(parseFloat(v.s.paddingLeft) || 0),
            radius: radiusOf(v.s, v.r),
            bg: fill ? hex(fill) : "none",
            color: color ? hex(color) : "none",
            border:
              bw > 0 && v.s.borderTopStyle !== "none" && bc && bc[3] > 0 ?
                `${round(bw, 1)}px ${v.s.borderTopStyle} ${hex(bc)}`
              : "none",
            font: { size: round(parseFloat(v.s.fontSize), 1), weight: parseInt(v.s.fontWeight, 10) || 400 },
          }),
        );
      }
      return top(counts, 4).map(([k]) => JSON.parse(k));
    },
    [],
    "buttons",
  );

  // Motion: running animations, common transitions, fixed/sticky bars, and paint effects (filters, masks, canvas).
  const framesOf = fx =>
    fx
      .getKeyframes()
      .slice(0, 6)
      .map(k => {
        const props = {};
        for (const key of Object.keys(k)
          .filter(x => !/^(offset|computedOffset|easing|composite)$/.test(x))
          .slice(0, 8))
          props[key] = String(k[key]).slice(0, 120);
        // A CSS animation's timing function lives on its keyframes, not on the effect.
        const frame = { offset: round(k.computedOffset ?? k.offset ?? 0, 3), props };
        if (k.easing && k.easing !== "linear") frame.easing = k.easing;
        return frame;
      });
  const animations = safe(
    () => {
      const out = [];
      for (const a of document.getAnimations().slice(0, 300)) {
        if (out.length >= 60) break;
        if (typeof CSSTransition !== "undefined" && a instanceof CSSTransition) continue;
        const row = safe(
          () => {
            const fx = a.effect;
            if (!fx || !fx.target || !fx.target.tagName) return null;
            const t = fx.getComputedTiming();
            const keyframes = framesOf(fx);
            return {
              target: pathOf(fx.target),
              section: secOf(fx.target),
              name: a.animationName || a.id || "",
              duration: typeof t.duration === "number" ? round(t.duration) : null,
              delay: round(Number(t.delay) || 0),
              easing: t.easing !== "linear" ? t.easing : (keyframes[0] && keyframes[0].easing) || "linear",
              iterations: t.iterations === Infinity ? "infinite" : t.iterations,
              keyframes,
              scroll: !!a.timeline && a.timeline !== document.timeline,
            };
          },
          null,
          "animation",
        );
        if (row) out.push(row);
      }
      return out;
    },
    [],
    "animations",
  );
  const transitions = safe(
    () => {
      const counts = new Map();
      for (const { s } of entries) {
        const durations = s.transitionDuration.split(",");
        const props = s.transitionProperty.split(",");
        const eases = s.transitionTimingFunction.split(/,(?![^(]*\))/);
        durations.forEach((d, i) => {
          if (ms(d) > 0)
            bump(counts, [props[i % props.length].trim(), round(ms(d)), eases[i % eases.length].trim()].join("|"));
        });
      }
      return top(counts, 6).map(([k, count]) => {
        const [property, duration, easing] = k.split("|");
        return { property, duration: +duration, easing, count };
      });
    },
    [],
    "transitions",
  );
  const sticky = safe(
    () =>
      entries
        .filter(e => /^(fixed|sticky)$/.test(e.s.position))
        .slice(0, 20)
        .map(e => ({
          target: pathOf(e.el),
          sel: selOf(e.el),
          section: secOf(e.el),
          position: e.s.position,
          y: round(e.r.top + sy),
          h: round(e.r.height),
        })),
    [],
    "sticky",
  );
  const effects = safe(
    () => {
      const out = [];
      for (const { el, s, r } of entries) {
        const tag = el.tagName.toLowerCase();
        const kinds = [
          (s.backdropFilter || s.webkitBackdropFilter || "none") !== "none" && "backdrop-filter",
          s.filter !== "none" && "filter",
          (s.maskImage || s.webkitMaskImage || "none") !== "none" && "mask",
          s.mixBlendMode !== "normal" && "blend",
          tag === "canvas" && "canvas",
          tag === "video" && "video",
        ].filter(Boolean);
        for (const kind of kinds)
          if (out.length < 40)
            out.push({
              target: pathOf(el),
              section: secOf(el),
              kind,
              x: round(r.left + sx),
              y: round(r.top + sy),
              w: round(r.width),
              h: round(r.height),
            });
      }
      return out;
    },
    [],
    "effects",
  );

  // Hover targets: up to 2 buttons, 2 links in the site bar, 2 linked cards; none inside another pick.
  const hover = safe(
    () => {
      const out = [];
      const take = (kind, list, n) => {
        for (const el of list) {
          if (n <= 0) break;
          const v = view(el);
          if (
            !v
            || v.r.width < 24
            || v.r.height < 16
            || inConsent(el)
            || out.some(o => o.el.contains(el) || el.contains(o.el))
          )
            continue;
          out.push({
            el,
            kind,
            sel: selOf(el),
            section: secOf(el),
            x: round(v.r.left + sx),
            y: round(v.r.top + sy),
            w: round(v.r.width),
            h: round(v.r.height),
            label: label(el),
          });
          n--;
        }
      };
      const fixedBar = entries.find(
        e => /^(fixed|sticky)$/.test(e.s.position) && e.r.top <= 40 && e.r.width >= vw * 0.5,
      );
      const bar = fixedBar ? fixedBar.el : document.querySelector("header, nav");
      take(
        "button",
        [...document.querySelectorAll(BUTTONS)].slice(0, 100).filter(el => !(bar && bar.contains(el))),
        2,
      );
      take("nav-link", bar ? [...bar.querySelectorAll("a")].filter(a => !a.matches(BUTTONS)) : [], 2);
      take(
        "card",
        [...document.querySelectorAll("a")].slice(0, 300).filter(a => {
          const r = a.getBoundingClientRect();
          return r.width >= 200 && r.height >= 120;
        }),
        2,
      );
      return out.map(({ el, ...rest }) => rest);
    },
    [],
    "hover",
  );

  return {
    v: 1,
    url: location.href,
    viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
    pageHeight: root.scrollHeight,
    sections,
    colors,
    type,
    fonts,
    tokens,
    radii,
    shadows,
    layout,
    buttons,
    motion: { animations, transitions, sticky, effects, hover },
    problems,
  };
})();
