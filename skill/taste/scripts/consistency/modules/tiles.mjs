// consistency/modules/tiles.mjs — the tiles check module (moved from consistency.mjs)
// ---------------------------------------------------------------- tiles: kept as one block
export const tilesMod = (() => {
  // tiles.mjs: a section tile that shows two sections (the judges' "two sections in one tile").
  //   screens    section-tile (a section tile showing two sections: at 1440x900 a section not one or two screens tall,
  //              24px either way, whose tile or the screen a whole screen on from its top shows another section's
  //              heading, text or picture, FAIL; only its ground, 24px or more, WARN; at 390x844 only a section
  //              shorter than the screen)
  //
  // The tiles themselves are shot by shoot.mjs (its own copy of section-tiles.mjs's shooter, with the CK-16 tops): one
  // screen from each top-level section's top, the fixed header over its top padding as a visitor sees it, and one with its
  // bottom on the screen's bottom for a section taller than one screen. The judges read those tiles and the k x 900 screens
  // of the page (the judge rule: "each judge tile at scrollY = k x 900 (844 phone) shows one section"; CK-16: every
  // section after the hero, footer.closing too, one screen or two). This file holds only the check on them.
  //
  // Rules (H is the screen: 900 at 1440x900, 844 at 390x844):
  //   - the sections are the children of main (or of main's one wrapper when it holds two or more sections), a body >
  //     section, a footer.closing and the footer, as section-tiles.mjs reads them; a plain site footer is no section: it is
  //     never judged and never counts as the other section (a closing section and the footer under it may share a screen)
  //   - one screen is H and two screens 2H, each within --tiles-tol px (24); the first section is counted from the page's
  //     top, so the header rows above it belong to it
  //   - a section shorter than one screen is judged on its tile, the screen from its top (the first section on the first
  //     screen); at the page's end that screen is held at the bottom, so it shows the section above instead
  //   - at 1440x900 a section between the screens (1.31, 2.4) is judged on the screen a whole screen on from its top where
  //     its end comes into view, as the k x 900 screens read a page on the grid; shoot.mjs's bottom tile never shows it
  //   - the verdict is what that screen shows of the other sections, under the header: one's heading, text or picture
  //     (h1-h3, p, img, picture, video, canvas, svg, [data-ui], .frame) 8px or more on screen is two sections, FAIL; only
  //     its ground, 24px or more, WARN (a sliver of the next band's padding: six false FAILs on five test pages had 36-85px)
  //   - at 390x844 only a section shorter than the screen is judged; heights on the grid are left to rhythm there
  //   - passed over: a section holding a held stage (a sticky panel 60% of the screen each way, a GSAP pin) or a
  //     [data-scene], and a section whose top or height moves 8px or more in 0.9s (a reveal growing it, a scene)
  // The crop is that screen: red is what shows of the section, dashed blue what shows of the other one and its heading or
  // picture. At most 8 findings a width, the rest named in the eighth. Told once: rhythm's section-height, hero-screen and
  // one-section tell most of these from the heights, so dupOf(f, list) is true when the report already holds one of those
  // on the same section (or one-section's on the section the tile shows), for consistency's sameFault to drop this one.
  //
  // Flags: --tiles-tol <px> (24, how far a section may sit off one or two screens), --no-tiles.

  const id = "tiles";
  const phase = "width";
  const checks = [
    {
      id: "section-tile",
      sev: "FAIL",
      what: "a section not one or two screens tall at 1440x900 (shorter than the screen at 390x844) whose tile, or the screen a whole screen on from its top, shows another section's heading, text or picture (only its ground: WARN)",
    },
  ];
  const fixes = {
    "section-tile":
      "set every section after the hero to one screen or two (height: calc(var(--h,1) * 100vh)) and fit its content above --padb",
  };
  const summary = [
    "  screens    section-tile (a section tile showing two sections: at 1440x900 a section not one or two screens tall,",
    "             24px either way, whose tile or the screen a whole screen on from its top shows another section's",
    "             heading, text or picture, FAIL; only its ground, 24px or more, WARN; at 390x844 only a section",
    "             shorter than the screen)",
  ].join("\n");
  const flags = [
    { name: "tiles-tol", kind: "value", default: "24", help: "px a section may sit off one or two screens" },
  ];

  // ---------------------------------------------------------------- in the page (serialised: nothing from this module's scope)
  // the page's top-level sections, as section-tiles.mjs reads them, and the fixed or sticky header over them; a main whose
  // one child holds two or more sections gives that child's children; the elements are kept on window.__tilesSecs for
  // viewOf() and removed by the caller
  function sectionsProbe(o) {
    const H = innerHeight,
      vw = document.documentElement.clientWidth || innerWidth;
    const sel = el => {
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
      return parts.join(" > ");
    };
    let navH = 0;
    for (const el of document.querySelectorAll("body > header, header.nav, body > nav, [role=banner]")) {
      const cs = getComputedStyle(el),
        r = el.getBoundingClientRect();
      if ((cs.position === "fixed" || cs.position === "sticky") && r.top <= 1 && r.height < H / 3)
        navH = Math.max(navH, Math.round(r.bottom));
    }
    const main = document.querySelector("main");
    const real = e => !/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|LINK|META)$/.test(e.tagName);
    let top = main ? [...main.children].filter(real) : [];
    // main > div.page > section...: the wrapper is no section, its sections are
    for (let n = 0; n < 3 && top.length === 1 && top[0].querySelectorAll(":scope > section").length >= 2; n++)
      top = [...top[0].children].filter(real);
    const cands = [
      ...top,
      ...document.querySelectorAll("body > section, footer.closing, body > footer, main ~ footer"),
    ];
    const seen = new Set();
    const secs = cands
      .filter(e => {
        if (seen.has(e) || !real(e)) return false;
        seen.add(e);
        const r = e.getBoundingClientRect();
        return r.height > 40 && getComputedStyle(e).display !== "none";
      })
      .filter((e, _, a) => !a.some(x => x !== e && x.contains(e)));
    secs.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    window.__tilesSecs = secs;
    // a held stage: a sticky panel 60% of the screen each way, a GSAP pin, or a scroll scene (its height is its runway)
    // a held stage: the photo scene ([data-scene]), a big scene ([data-big-scene]) or a dealt scroll moment ([data-scroll-moment], [data-moment]), as rhythm's SCENEQ reads them
    const held = e =>
      e.matches("[data-scene], [data-big-scene], [data-scroll-moment], [data-moment][data-moment-mounted], .pin-spacer")
      || !!e.closest("[data-scene], [data-big-scene], [data-scroll-moment], [data-moment][data-moment-mounted]")
      || !!e.querySelector(
        ".pin-spacer, [data-scene], [data-big-scene], [data-scroll-moment], [data-moment][data-moment-mounted]",
      )
      || [...e.querySelectorAll("*")].some(x => {
        if (getComputedStyle(x).position !== "sticky") return false;
        const q = x.getBoundingClientRect();
        return q.width >= vw * 0.6 && q.height >= H * 0.6;
      });
    const label = e => (e ? e.innerText || e.textContent || "" : "").replace(/\s+/g, " ").trim().slice(0, 40);
    const sections = secs.map(e => {
      const r = e.getBoundingClientRect();
      const row = {
        tag: e.tagName.toLowerCase(),
        id: e.id || "",
        cls: typeof e.className === "string" ? e.className.slice(0, 60) : "",
        top: Math.round(r.top + scrollY),
        h: Math.round(r.height),
      };
      if (o && o.full) {
        const foot = e.tagName === "FOOTER" || e.getAttribute("role") === "contentinfo";
        // a plain site footer (links and the small print) is no section; footer.closing is one (CK-16)
        Object.assign(row, {
          sel: sel(e),
          text: label(e.querySelector("h1, h2, h3") || e),
          foot,
          plain: foot && !e.matches(".closing"),
          held: held(e),
        });
      }
      return row;
    });
    return {
      H,
      vw,
      navH,
      scrollY: Math.round(scrollY),
      scrollHeight: document.scrollingElement.scrollHeight,
      sections,
    };
  }
  // what this screen shows, under the header as it stands at this scroll (a header that hides going down is gone): the
  // judged section, and of every other section (the plain footer left out) its part on screen and its first heading,
  // text or picture 8px or more on screen (viewport boxes)
  function viewOf(o) {
    const secs = window.__tilesSecs || [],
      H = innerHeight,
      vw = document.documentElement.clientWidth || innerWidth;
    let navH = 0;
    for (const el of document.querySelectorAll("body > header, header.nav, body > nav, [role=banner]")) {
      const cs = getComputedStyle(el),
        r = el.getBoundingClientRect();
      if ((cs.position === "fixed" || cs.position === "sticky") && r.top <= 1 && r.height < H / 3)
        navH = Math.max(navH, Math.round(r.bottom));
    }
    const box = r => {
      const top = Math.max(navH, r.top),
        bottom = Math.min(H, r.bottom),
        left = Math.max(0, r.left),
        right = Math.min(vw, r.right);
      return bottom - top >= 2 && right - left >= 2 ?
          {
            left: Math.round(left),
            top: Math.round(top),
            width: Math.round(right - left),
            height: Math.round(bottom - top),
          }
        : null;
    };
    const shown = e => {
      for (let p = e; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.visibility === "hidden" || Number(cs.opacity) < 0.05) return false;
      }
      return true;
    };
    const words = e =>
      (e.innerText || e.getAttribute("alt") || e.getAttribute("aria-label") || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 40);
    const others = [];
    secs.forEach((e, j) => {
      if (j === o.i || (o.skip || []).includes(j)) return;
      const r = e.getBoundingClientRect(),
        b = box(r);
      if (!b) return;
      let el = null;
      for (const c of e.querySelectorAll("h1, h2, h3, p, img, picture, video, canvas, svg, [data-ui], .frame")) {
        const q = c.getBoundingClientRect();
        if (q.width < 2 || q.height < 2 || q.right <= 0 || q.left >= vw) continue;
        const t = Math.max(q.top, navH, r.top),
          btm = Math.min(q.bottom, H, r.bottom);
        if (btm - t < 8 || !shown(c)) continue;
        const kind =
          /^H[1-3]$/.test(c.tagName) ? "heading"
          : c.tagName === "P" ? "text"
          : "picture";
        // a heading names the section best, then text, then a picture
        const rank = { heading: 0, text: 1, picture: 2 }[kind];
        if (!el || rank < el.rank) el = { rank, kind, text: kind === "picture" ? "" : words(c), box: box(q) };
        if (rank === 0) break;
      }
      others.push({
        j,
        above: r.top < (secs[o.i] ? secs[o.i].getBoundingClientRect().top : 0),
        px: b.height,
        box: b,
        el,
      });
    });
    return { y: Math.round(scrollY), navH, a: secs[o.i] ? box(secs[o.i].getBoundingClientRect()) : null, others };
  }
  // a jump, not a glide: a smooth-scroll library is told to jump too, or it eases the page back
  function jumpTo(y) {
    const L = window.lenis || window.__lenis;
    try {
      if (L && L.scrollTo) L.scrollTo(y, { immediate: true, force: true });
    } catch (e) {
      /* not ours */
    }
    scrollTo({ top: y, left: 0, behavior: "instant" });
    return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(Math.round(scrollY)))));
  }
  // the screen settled: fonts ready, no picture on the page loading, and the boxes on screen and the stylesheets the same
  // over three reads 300ms apart (at most o.max), then o.tail more for canvases and shaders (section-tiles.mjs's settle)
  function settleProbe(o) {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    return (async () => {
      try {
        if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, wait(3000)]);
      } catch (e) {
        /* no fonts api */
      }
      const t0 = performance.now();
      let last = "",
        same = 0;
      while (performance.now() - t0 < o.max) {
        let n = 0,
          a = 0;
        for (const e of document.querySelectorAll("body *")) {
          const r = e.getBoundingClientRect();
          if (r.width && r.height && r.bottom > 0 && r.top < innerHeight) {
            n++;
            a += Math.round((r.width * r.height) / 100);
          }
        }
        const sig = `${n}:${a}:${document.styleSheets.length}:${[...document.images].filter(i => !i.complete).length}`;
        if (sig === last) {
          if (++same >= 3) break;
        } else {
          same = 0;
          last = sig;
        }
        await wait(300);
      }
      await wait(o.tail);
      return 1;
    })();
  }
  // every screen lands where it is asked to: no smooth scrolling and no snapping while the screens are read (as shoot.mjs)
  function noSnap(on) {
    const old = document.getElementById("__tiles-scroll");
    if (!on) {
      if (old) old.remove();
      return 0;
    }
    if (!old) {
      const s = document.createElement("style");
      s.id = "__tiles-scroll";
      s.textContent = "html, body, html * { scroll-behavior: auto !important; scroll-snap-type: none !important; }";
      document.head.appendChild(s);
    }
    return 1;
  }
  const call = (fn, arg) => `(${fn.toString()})(${JSON.stringify(arg ?? null)})`;

  // ---------------------------------------------------------------- section-tile: which sections a screen is read for
  // len is the section's height, or for the first section the rows from the page's top to its end. A section shorter than
  // the screen is read on its tile (k 0); at a desktop width one between the screens is read k whole screens on from its
  // top, on the screen where its end comes into view (k 1 for 1.31 screens, 2 for 2.4)
  function candidates(S, H, tol, phone) {
    const out = [];
    for (const [i, s] of S.entries()) {
      if (s.plain || s.held || s.moved) continue;
      const first = i === 0 && s.top < H / 3,
        len = first ? s.top + s.h : s.h;
      if (len < H - tol) {
        out.push({ i, len, first, k: 0 });
        continue;
      }
      // a hero taller than the screen is hero-screen's; on a phone the strides are one-section's
      if (first || phone) continue;
      if (Math.abs(s.h - H) <= tol || Math.abs(s.h - 2 * H) <= tol) continue;
      const k = Math.max(1, Math.floor((s.h - 1) / H));
      // 8px of it on that screen or less: that screen is the next section's own tile, and the height is section-height's
      if (s.h - k * H > 8) out.push({ i, len, first, k });
    }
    return out;
  }

  // told once: rhythm's section-height, hero-screen or one-section on the same section (or one-section's on the section the
  // tile shows) already tells this; consistency's sameFault, where the widths and the passes are joined, drops it then
  function dupOf(f, L) {
    if (!f || f.check !== "section-tile") return false;
    return L.some(
      g =>
        g !== f
        && (g.check === "section-height" || g.check === "hero-screen" || g.check === "one-section")
        && (g.sel === f.sel || (g.check === "one-section" && f.shows && g.sel === f.shows))
        && (g.sev === "FAIL" || f.sev === "WARN"),
    );
  }

  // the screens the tiles are judged at: shoot.mjs's desktop (1440) and its phone (under 600, 844 tall)
  function when(ctx) {
    return (ctx.width === 1440 && ctx.height === 900) || (ctx.width < 600 && ctx.height === 844);
  }

  async function run(ctx) {
    const tolIn = Number(ctx.flags && ctx.flags["tiles-tol"]),
      tol = Number.isFinite(tolIn) && tolIn >= 0 ? tolIn : 24;
    const tab = ctx.tab,
      phone = ctx.width < 600,
      at = `${ctx.width}x${ctx.height}`;
    const go = y =>
      tab.eval(
        `window.__cc && window.__cc.scrollTo ? window.__cc.scrollTo(${Math.round(y)}) : ${call(jumpTo, Math.round(y))}`,
      );
    const y0 = await ctx.safe("section-tile", () => tab.eval("Math.round(scrollY)"));
    if (y0 == null) return [];
    const F = [],
      extra = [];
    try {
      await tab.eval(call(noSnap, true)).catch(() => {});
      // read at the page's top (a header that hides as the page scrolls is there) once it has settled, twice 0.9s apart:
      // a section whose top or height moves (a reveal growing it, a scene) is not judged on a number it will not keep
      await go(0);
      await tab.eval(call(settleProbe, { max: 3000, tail: 300 }), 20000).catch(() => {});
      const A = await ctx.safe("section-tile", () => tab.eval(call(sectionsProbe, { full: true }), 60000));
      await ctx.sleep(900);
      const B = await ctx.safe("section-tile", () => tab.eval(call(sectionsProbe, { full: true }), 60000));
      if (!A || !B) return [];
      if (!B.sections.length) {
        ctx.errors.push("section-tile: no top-level sections (no main > *, no body > section)");
        return [];
      }
      if (A.sections.length !== B.sections.length) {
        ctx.errors.push(
          `section-tile: the page's sections changed while they were read (${A.sections.length}, then ${B.sections.length})`,
        );
        return [];
      }
      const { H, scrollHeight } = B,
        maxY = Math.max(0, scrollHeight - H);
      // the two reads paired by the section's sel (by place when a sel repeats or is missing)
      const bySel = new Map(),
        dup = new Set();
      for (const s of A.sections) {
        if (bySel.has(s.sel)) dup.add(s.sel);
        bySel.set(s.sel, s);
      }
      const S = B.sections.map((s, i) => {
        const a = (!dup.has(s.sel) && bySel.get(s.sel)) || A.sections[i];
        return { ...s, moved: Math.abs(s.top - a.top) >= 8 || Math.abs(s.h - a.h) >= 8 };
      });
      const skip = S.flatMap((s, j) => (s.plain ? [j] : []));
      const C = candidates(S, H, tol, phone);
      for (const [i, s] of S.entries())
        ctx.log(
          `#${i + 1} ${s.sel} top ${s.top} h ${s.h}${s.held ? " held" : ""}${s.moved ? " moved" : ""}${s.plain ? " footer" : ""}${C.some(c => c.i === i) ? " read" : ""}`,
        );
      ctx.log(`${S.length} sections, header ${B.navH}px, ${C.length} off one or two screens`);
      for (const c of C.slice(0, 16)) {
        const s = S[c.i];
        try {
          const target = c.first ? 0 : s.top + c.k * H,
            y = Math.round(Math.min(maxY, Math.max(0, target))),
            end = target > maxY + 1;
          await go(y);
          await tab.eval(call(settleProbe, { max: 1500, tail: 300 }), 20000).catch(() => {});
          const v = await tab.eval(call(viewOf, { i: c.i, skip }), 30000);
          // the other section nearest it (then the most of it) with a heading, text or picture on screen; else the most of
          // another's ground
          const near = (a, b) => Math.abs(a.j - c.i) - Math.abs(b.j - c.i) || b.px - a.px;
          const withEl = v.others.filter(o => o.el).sort(near),
            bare = [...v.others].sort((a, b) => b.px - a.px);
          const o = withEl[0] || bare[0];
          if (!o || (!o.el && o.px < tol)) {
            ctx.log(`${s.sel}: screen at ${v.y} shows ${o ? `${o.px}px of ground` : "nothing else"}, passed`);
            continue;
          }
          const sev = o.el ? "FAIL" : "WARN";
          if (F.length >= 8) {
            extra.push(s);
            continue;
          }
          const shot = await ctx.safe("section-tile", () => tab.shot());
          const lenTxt =
            c.first ?
              s.top > 0 ?
                `the header and the first section fill ${c.len}px (${(c.len / H).toFixed(2)} screens at ${at}; the section is ${s.h}px)`
              : `the first section is ${s.h}px tall (${(s.h / H).toFixed(2)} screens at ${at})`
            : `the section is ${s.h}px tall (${(s.h / H).toFixed(2)} screens at ${at})`;
          const whereTxt =
            c.first ? "the first screen"
            : c.k === 0 ?
              end ? `its tile, held at the page's end (scroll ${v.y}px)`
              : "its tile (the screen from its top)"
            : `the screen ${c.k === 1 ? "one screen" : c.k + " screens"} on from its top (scroll ${v.y}px${end ? ", held at the page's end" : ""})`;
          const nx = S[o.j],
            who =
              o.above ? "the section above"
              : o.j === c.i + 1 ? "the next section"
              : "a section further down";
          const name = nx.text ? ` ("${nx.text.slice(0, 30)}")` : "";
          const otherTxt =
            o.el ?
              o.el.kind === "heading" && o.el.text ?
                `${o.px}px of ${who}, its heading "${o.el.text.slice(0, 30)}" on screen`
              : `${o.px}px of ${who}${name}, its ${o.el.kind}${o.el.text ? ` "${o.el.text.slice(0, 30)}"` : ""} on screen`
            : `only ${o.px}px of ${who}'s ground${name}, none of its content`;
          const off = Math.abs(v.y - y) > 2 ? ` (the page stopped at ${v.y}px, not ${y}px)` : "";
          const f = {
            check: "section-tile",
            sev,
            id: 0,
            sel: s.sel,
            text: s.text,
            shows: nx.sel,
            msg: `${lenTxt}, ${c.k === 0 ? "shorter than the screen" : "not one screen or two"}: ${whereTxt} shows ${v.a ? `${v.a.height}px of it` : "none of it"} and ${otherTxt}${off}`,
          };
          if (c.first)
            f.fix =
              "make the hero exactly one screen (height: 100svh) with its content between the nav and 24px above the fold";
          if (shot && v.a)
            Object.assign(f, {
              stop: ctx.addShot(shot),
              rects: [v.a, { ...o.box, ref: true }, ...(o.el && o.el.box ? [{ ...o.el.box, ref: true }] : [])],
            });
          else Object.assign(f, ctx.place({ left: 0, top: s.top, width: B.vw, height: s.h }));
          F.push(f);
        } catch (e) {
          ctx.errors.push(`section-tile: ${s.sel}: ${e.message}`);
        }
      }
      if (C.length > 16)
        ctx.errors.push(
          `section-tile: ${C.length - 16} more sections off one or two screens were not read (16 at most a width)`,
        );
      if (extra.length && F.length)
        F[F.length - 1].msg += ` (and ${extra.length} more like it: ${extra
          .slice(0, 4)
          .map(x => `"${(x.text || x.sel).slice(0, 20)}"`)
          .join(", ")})`;
    } finally {
      // the page as the walk left it
      await tab.eval("delete window.__tilesSecs").catch(() => {});
      await tab.eval(call(noSnap, false)).catch(() => {});
      await go(y0).catch(() => {});
    }
    return F;
  }
  return { id, phase, checks, fixes, summary, flags, when, run, dupOf };
})();
