(async () => {
  // record-motion.js - what moves and how. One async expression: record.mjs passes it to Runtime.evaluate with
  // awaitPromise, after record-capture.js, on the 1440 light view only. Like record-capture.js it never returns page
  // text, picture or link addresses (url(...) in a value becomes url()). It scrolls the page and puts it back at 0.
  // Returns
  // {
  //   animations: [{ target, section, name, keyframes, duration, delay, easing, iterations, direction, fill }],
  //               // document.getAnimations(): effect.getKeyframes() and effect.getComputedTiming();
  //               // iterations is "infinite" for a loop; a scroll-driven animation also carries timeline: "scroll"
  //   keyframes:  [{ name, cssText }],                 // every @keyframes rule of the readable sheets
  //   scroll:     [{ target, section, props: { transform|opacity|clipPath|filter: [{ y, value }] }, sticky: [from, to] | null }],
  //               // the page scrolled in 24 steps; kept only where a value changed with y, or the element stays put
  //   effects:    [{ target, section, rect, canvas: "2d" | "webgl" | "unknown" | null, filter, backdropFilter, mask, blend, background }],
  //   sections:   [{ top, left, width, height }],      // the page's sections, in the capture's `sections` order
  // }
  // target: a structural path (tag, nth-of-type chain from the section root, class list).
  // section: index into the capture's `sections` (the same rule as record-capture.js), or null.
  const LIMIT = { animations: 200, keyframes: 200, cssText: 4000, sample: 400, steps: 24, scroll: 80, effects: 60 };
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
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const clean = s => String(s).replace(/url\([^)]*\)/gi, "url()");
  const root = document.documentElement;
  const body = document.body || root;
  const vw = root.clientWidth || innerWidth;
  window.scrollTo({ top: 0, behavior: "instant" });
  await wait(100);

  /* ---------------------------------------------------------------- sections (the rule of record-capture.js) */
  const view = el => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility !== "visible" || +cs.opacity === 0) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.right <= 0 || r.left >= vw) return null;
    return { el, cs, r };
  };
  const kids = el => [...el.children].map(c => safe(() => view(c), null)).filter(Boolean);
  const sectionEls = safe(() => {
    let main = null;
    let n = 0;
    for (const el of document.querySelectorAll("main")) {
      if (++n > 300) break;
      if (safe(() => view(el), null)) {
        main = el;
        break;
      }
    }
    let host = main || body;
    for (let i = 0; i < 4; i++) {
      const k = kids(host);
      if (k.length === 1 && !/^(section|header|footer|article)$/i.test(k[0].el.tagName)) host = k[0].el;
      else break;
    }
    return kids(host)
      .filter(v => v.r.height >= 40)
      .slice(0, 40)
      .map(v => v.el);
  }, []);
  const sections = sectionEls.map(el => {
    const r = el.getBoundingClientRect();
    return { top: round(r.top + scrollY), left: round(r.left), width: round(r.width), height: round(r.height) };
  });
  const secOf = el => {
    const i = sectionEls.findIndex(s => s.contains(el));
    return i < 0 ? null : i;
  };

  /* ---------------------------------------------------------------- targets */
  const seg = el => {
    let i = 1;
    for (let p = el.previousElementSibling; p; p = p.previousElementSibling) if (p.tagName === el.tagName) i++;
    return `${el.tagName.toLowerCase()}:nth-of-type(${i})`;
  };
  const pathOf = el =>
    safe(() => {
      const stop = sectionEls[secOf(el)] || null;
      const chain = [];
      for (let p = el; p && p !== body && p !== root; p = p.parentElement) {
        chain.unshift(seg(p));
        if (p === stop) break;
      }
      const classes = [...el.classList].filter(c => /^[\w-]{1,40}$/.test(c)).slice(0, 6);
      return chain.slice(-8).join(" > ") + classes.map(c => `.${c}`).join("");
    }, "");

  // the elements the scroll and effects passes look at, spread evenly when the page has more than 6000
  const SKIP = /^(script|style|link|meta|noscript|template|head|title|br|source|track|defs|clippath)$/i;
  const all = safe(() => {
    const list = [...body.querySelectorAll("*")];
    const step = Math.max(1, Math.ceil(list.length / 6000));
    return list.filter((el, i) => i % step === 0 && !el.ownerSVGElement && !SKIP.test(el.tagName));
  }, []);

  /* ---------------------------------------------------------------- animations */
  const framesOf = fx =>
    safe(
      () =>
        fx
          .getKeyframes()
          .slice(0, 8)
          .map(k => {
            const props = {};
            let n = 0;
            for (const key of Object.keys(k)) {
              if (/^(offset|computedOffset|easing|composite)$/.test(key) || n >= 12) continue;
              props[key] = clean(k[key]).slice(0, 120);
              n++;
            }
            const out = { offset: round(k.computedOffset ?? k.offset ?? 0, 3), props };
            if (k.easing && k.easing !== "linear") out.easing = k.easing;
            return out;
          }),
      [],
    );
  const animations = safe(() => {
    const out = [];
    for (const a of document.getAnimations()) {
      if (out.length >= LIMIT.animations) break;
      if (typeof CSSTransition !== "undefined" && a instanceof CSSTransition) continue;
      const row = safe(() => {
        const fx = a.effect;
        const el = fx && fx.target;
        if (!el || !el.tagName) return null;
        const t = fx.getComputedTiming();
        return {
          target: pathOf(el),
          section: secOf(el),
          name: a.animationName || a.id || "",
          keyframes: framesOf(fx),
          duration: typeof t.duration === "number" ? round(t.duration) : null,
          delay: round(Number(t.delay) || 0),
          easing: t.easing,
          iterations: t.iterations === Infinity ? "infinite" : t.iterations,
          direction: t.direction,
          fill: t.fill,
          ...(a.timeline && a.timeline !== document.timeline ? { timeline: "scroll" } : {}),
        };
      }, null);
      if (row) out.push(row);
    }
    return out;
  }, []);

  /* ---------------------------------------------------------------- @keyframes rules */
  const keyframes = [];
  const walkRules = rules => {
    for (const r of rules) {
      if (keyframes.length >= LIMIT.keyframes) return;
      if (typeof CSSKeyframesRule !== "undefined" && r instanceof CSSKeyframesRule)
        keyframes.push({ name: r.name, cssText: clean(r.cssText).slice(0, LIMIT.cssText) });
      else if (r.cssRules) walkRules(r.cssRules);
      else if (r.styleSheet) safe(() => walkRules(r.styleSheet.cssRules), null);
    }
  };
  for (const s of document.styleSheets) safe(() => walkRules(s.cssRules), null);

  /* ---------------------------------------------------------------- effects */
  const ctxOf = c => {
    for (const t of ["webgl2", "webgl", "2d"]) {
      try {
        if (c.getContext(t)) return t === "2d" ? "2d" : "webgl";
      } catch {
        /* a canvas handed to a worker */
      }
    }
    return "unknown";
  };
  const effects = safe(() => {
    const found = [];
    for (const el of all) {
      const hit = safe(() => {
        const cs = getComputedStyle(el);
        if (cs.display === "none") return null;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return null;
        const canvas = el.tagName === "CANVAS" ? ctxOf(el) : null;
        const filter = cs.filter || "none";
        const backdrop = cs.backdropFilter || cs.webkitBackdropFilter || "none";
        const mask = clean(cs.maskImage || cs.webkitMaskImage || "none");
        const blend = cs.mixBlendMode || "normal";
        const image = cs.backgroundImage || "none";
        const gradient = /gradient\(/i.test(image) && r.width * r.height >= 40000;
        if (!canvas && filter === "none" && backdrop === "none" && mask === "none" && blend === "normal" && !gradient)
          return null;
        const score =
          (canvas ? 4 : 0)
          + (backdrop !== "none" ? 3 : 0)
          + (filter !== "none" ? 3 : 0)
          + (mask !== "none" ? 2 : 0)
          + (blend !== "normal" ? 2 : 0)
          + (gradient ? 1 : 0);
        return {
          score,
          area: r.width * r.height,
          item: {
            target: pathOf(el),
            section: secOf(el),
            rect: { x: round(r.left), y: round(r.top + scrollY), w: round(r.width), h: round(r.height) },
            canvas,
            filter: clean(filter).slice(0, 160),
            backdropFilter: clean(backdrop).slice(0, 160),
            mask: mask.slice(0, 160),
            blend,
            background: gradient ? clean(image).slice(0, 300) : "none",
          },
        };
      }, null);
      if (hit) found.push(hit);
    }
    return found
      .sort((a, b) => b.score - a.score || b.area - a.area)
      .slice(0, LIMIT.effects)
      .map(h => h.item);
  }, []);

  /* ---------------------------------------------------------------- scroll */
  const measureScroll = async () => {
    const maxY = Math.max(0, root.scrollHeight - innerHeight);
    if (maxY < 2) return [];
    // elements already set up to move (fixed, sticky, transformed, faded, clipped, filtered) first, then an even spread
    const hot = [];
    const rest = [];
    for (const el of all) {
      const cs = safe(() => getComputedStyle(el), null);
      if (!cs || cs.display === "none") continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const moving =
        /^(fixed|sticky)$/.test(cs.position)
        || cs.transform !== "none"
        || +cs.opacity < 1
        || cs.clipPath !== "none"
        || cs.filter !== "none"
        || /transform|opacity|clip-path|filter/.test(cs.willChange);
      (moving ? hot : rest).push(el);
    }
    const pick = hot.slice(0, LIMIT.sample);
    const room = LIMIT.sample - pick.length;
    if (room > 0 && rest.length) {
      const step = Math.max(1, Math.floor(rest.length / room));
      for (let i = 0; i < rest.length && pick.length < LIMIT.sample; i += step) pick.push(rest[i]);
    }
    const stuck = el => {
      const stop = sectionEls[secOf(el)] || null;
      for (let p = el; p && p !== body && p !== root; p = p.parentElement) {
        if (/^(fixed|sticky)$/.test(getComputedStyle(p).position)) return true;
        if (p === stop) break;
      }
      return false;
    };
    const rec = pick.map(el => ({
      el,
      cs: getComputedStyle(el),
      series: { transform: [], opacity: [], clipPath: [], filter: [] },
      tops: [],
      held: safe(() => stuck(el), false),
      range: null,
    }));
    const ys = [];
    try {
      for (let i = 0; i < LIMIT.steps; i++) {
        window.scrollTo({ top: Math.round((maxY * i) / (LIMIT.steps - 1)), behavior: "instant" });
        await wait(120);
        ys.push(round(scrollY));
        for (const r of rec) {
          for (const k of Object.keys(r.series)) r.series[k].push(r.cs[k]);
          r.tops.push(round(r.el.getBoundingClientRect().top));
        }
      }
    } finally {
      window.scrollTo({ top: 0, behavior: "instant" });
      await wait(100);
    }
    // the longest run of steps where the element did not move in the viewport while the page did
    for (const r of rec) {
      let best = null;
      let from = 0;
      for (let i = 1; i <= r.tops.length; i++) {
        if (i < r.tops.length && Math.abs(r.tops[i] - r.tops[i - 1]) <= 1 && ys[i] !== ys[i - 1]) continue;
        if (i - from >= (r.held ? 2 : 3) && (!best || i - from > best[1] - best[0])) best = [from, i];
        from = i;
      }
      r.range = best ? [ys[best[0]], ys[best[1] - 1]] : null;
    }
    const byEl = new Map(rec.map(r => [r.el, r]));
    const out = [];
    for (const r of rec) {
      const props = {};
      for (const [k, vals] of Object.entries(r.series)) {
        if (new Set(vals).size < 2) continue;
        props[k] = vals
          .map((v, i) => ({ y: ys[i], value: clean(v).slice(0, 160), same: i > 0 && v === vals[i - 1] }))
          .filter(p => !p.same)
          .map(({ y, value }) => ({ y, value }));
      }
      // a child of a sticky box that sticks over the same range is the box's own entry, not a new one
      let sticky = r.range;
      for (let p = r.el.parentElement; p && sticky; p = p.parentElement) {
        const up = byEl.get(p);
        if (up && up.range && up.range[0] === sticky[0] && up.range[1] === sticky[1]) sticky = null;
      }
      if (!Object.keys(props).length && !sticky) continue;
      out.push({ target: pathOf(r.el), section: secOf(r.el), props, sticky });
      if (out.length >= LIMIT.scroll) break;
    }
    return out;
  };
  let scroll = [];
  try {
    scroll = await measureScroll();
  } catch {
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  return { animations, keyframes, scroll, effects, sections };
})();
