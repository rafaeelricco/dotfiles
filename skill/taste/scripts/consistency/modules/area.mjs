// consistency/modules/area.mjs — the area check module (moved from consistency.mjs)
// ---------------------------------------------------------------- area: kept as one block
export const areaMod = (() => {
  // empty-area: a section whose content leaves a large part of its screen empty (on most test sites the last third of a
  // section showed only its ground), or holds its words on one side with nothing beside them.
  //   screens    empty-area (per section at every width, the hero included: the rows of the section with no content at all,
  //              above its first content as well as under its last, and the rows where content covers under half the
  //              container across a block of 25% of a screen or taller, counted by the width no content covers; together
  //              over 35% of the section's area inside its container lines WARN, over 50% FAIL)
  //
  // Content is what a visitor reads or sees: lines of text (each block by the extent of its own lines), pictures (img,
  // picture, video, canvas, svg, a background photograph), controls, drawn mocks, effect and diagram mounts, a mounted
  // moment's host, and a card (a box with its own fill or shadow, or framed on three sides or more, holding text or a
  // picture); every box is grown 20px each way, so the air between lines and cards is no hole. A ground or frame as large
  // as most of the section (a tinted inset panel, a column stretched to the foot with a rule beside it) is no content:
  // what it holds is measured. A column of a row of columns (grid or flex items side by side) covers its width down the
  // height of its own content, and a row ruled above or below (a question, a line of a list) its width. A row whose
  // content covers half the container or more is full (a column beside a taller picture, a heading beside its questions). The section's padding counts as air up to 12% of a screen each side.
  // A picture as large as the section, a background photograph, or a mounted moment's host fills it. The container is
  // the section's .wrap, else its padding box. A plain site footer is never judged (a footer.closing is), nor a
  // statement hero with no picture in it (type on its ground by design). Read at rest on
  // the walked tab, once a width; the crop shows the largest empty block (red) inside the section (dashed blue).
  const id = "area";
  const phase = "width";
  const checks = [
    {
      id: "empty-area",
      sev: "FAIL",
      what: "a section whose empty rows (above and under its content) and empty half beside one-sided content are over 35% of its area (WARN), over 50% (FAIL)",
    },
  ];
  const fixes = {
    "empty-area":
      "fill the section: a picture or a second column beside the words, or more of its own content; the section stays one or two screens tall (T-height)",
  };
  const summary = [
    "  screens    empty-area (per section at every width, the hero included: the empty rows above and under its content and",
    "             the empty half beside one-sided content, over 35% of the section's area WARN, over 50% FAIL; a picture, a",
    "             visual or a mounted moment holding the space fills it)",
  ].join("\n");
  const flags = [];
  const WARN_AT = 0.35,
    FAIL_AT = 0.5;

  // the in-page read (serialised: nothing from module scope)
  function areaProbe() {
    const H = innerHeight,
      W = document.documentElement.clientWidth || innerWidth,
      SY = scrollY;
    const cs = e => getComputedStyle(e);
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
    const alphaOf = c => {
      const m = String(c).match(/rgba?\(([^)]+)\)/);
      if (!m) return c === "transparent" ? 0 : 1;
      const p = m[1].split(/[\s,/]+/).filter(Boolean);
      return p.length > 3 ? parseFloat(p[3]) : 1;
    };
    const sides = s =>
      ["Top", "Right", "Bottom", "Left"].filter(
        k =>
          parseFloat(s["border" + k + "Width"]) > 0
          && s["border" + k + "Style"] !== "none"
          && alphaOf(s["border" + k + "Color"]) > 0.05,
      ).length;
    // a card: its own fill or shadow, or framed on three sides or more (a rule on one side is no card)
    const card = s => alphaOf(s.backgroundColor) > 0.03 || (s.boxShadow && s.boxShadow !== "none") || sides(s) >= 3;
    const photoBg = s => /url\(|image-set\(/.test(s.backgroundImage || "");
    const shownCss = e => {
      for (let x = e; x && x !== document.body; x = x.parentElement) {
        const s = cs(x);
        if (s.display === "none" || s.visibility === "hidden") return false;
      }
      return true;
    };
    const D = r => ({ l: r.left, t: r.top + SY, r: r.right, b: r.bottom + SY });
    const VIS =
      'img, picture, video, canvas, svg, iframe, [data-moment][data-moment-mounted], [data-fx], [data-fx-mounted], [data-ui], [data-diagram], [data-product], [data-object], [data-print], [role="img"]';
    // what fills a section when it is as large as the section (an svg drawing or a mock does not: it is measured)
    const FILLS =
      "img, picture, video, canvas, iframe, [data-moment][data-moment-mounted], [data-fx], [data-fx-mounted], [data-product], [data-print], [data-object]";
    const holds = el =>
      !!el.querySelector(VIS)
      || [...el.querySelectorAll("*")]
        .concat(el)
        .some(x => [...x.childNodes].some(n => n.nodeType === 3 && /\S/.test(n.data)));
    // the sections: main's children (one wrapper unwrapped), a footer.closing; a plain footer is never one
    const main = document.querySelector("main");
    const real = e => !/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|LINK|META)$/.test(e.tagName);
    let top =
      main ?
        [...main.children].filter(real)
      : [...document.body.children].filter(e => real(e) && /^(SECTION|ARTICLE)$/.test(e.tagName));
    for (let n = 0; n < 3 && top.length === 1 && top[0].querySelectorAll(":scope > section").length >= 2; n++)
      top = [...top[0].children].filter(real);
    for (const f of document.querySelectorAll("footer.closing"))
      if (!top.some(t => t === f || t.contains(f) || f.contains(t))) top.push(f);
    const out = [],
      G = 20,
      C = 16;
    for (const sec of top) {
      const s0 = cs(sec),
        sr = sec.getBoundingClientRect();
      if (s0.display === "none" || s0.position === "fixed" || sr.height < 160 || sr.width < 200) continue;
      if (sec.tagName === "FOOTER" && !sec.matches(".closing")) continue;
      // the statement hero (layout-deal.mjs --hero statement) is type on its ground by design: with no picture in it, its h1,
      // sub-line and button leave most of the screen ground at every width (sections.md section 4), so it is not judged
      if (
        sec === top[0]
        && sec.matches('.hero--statement, [class*="hero--statement"]')
        && !sec.querySelector("img, picture, video, canvas, iframe")
      )
        continue;
      const S = D(sr),
        area = (S.r - S.l) * (S.b - S.t);
      // filled as a whole: a mounted moment's host or a background photograph
      if (sec.matches("[data-moment][data-moment-mounted]") || photoBg(s0)) continue;
      const wrap = sec.querySelector(":scope > .wrap") || sec.querySelector(".wrap");
      const wr = wrap && shownCss(wrap) ? wrap.getBoundingClientRect() : null;
      const cl = wr ? wr.left : sr.left + (parseFloat(s0.paddingLeft) || 0),
        cr = wr ? wr.right : sr.right - (parseFloat(s0.paddingRight) || 0),
        cw = cr - cl;
      if (cw < 120) continue;
      // the rows measured: the section less its padding, at most 12% of a screen each side
      const T0 = S.t + Math.min(parseFloat(s0.paddingTop) || 0, 0.12 * H),
        T1 = S.b - Math.min(parseFloat(s0.paddingBottom) || 0, 0.12 * H);
      if (T1 - T0 < 80) continue;
      const boxes = [],
        colItems = [],
        sideBy = new Map();
      let full = false;
      const add = (r, el) => {
        const b = { l: Math.max(S.l, r.l), t: Math.max(S.t, r.t), r: Math.min(S.r, r.r), b: Math.min(S.b, r.b), el };
        if (b.r - b.l < 2 || b.b - b.t < 2) return;
        boxes.push(b);
      };
      const rg = document.createRange();
      for (const el of sec.querySelectorAll("*")) {
        if (full) break;
        if (!real(el) || (el instanceof SVGElement && el.tagName.toLowerCase() !== "svg")) continue;
        if (el.parentElement && el.parentElement.closest("svg")) continue;
        const s = cs(el);
        if (s.display === "none" || s.visibility === "hidden" || s.position === "fixed") continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        const big = r.width * r.height >= 0.6 * area;
        if (el.matches(FILLS) || photoBg(s)) {
          if (r.width * r.height >= 0.9 * area) {
            full = true;
            break;
          }
          add(D(r), el);
          if (el.matches(VIS)) continue;
        } else if (el.matches(VIS)) {
          // a drawing as large as most of the section (a pattern, a wave) is ground; a mock or an icon is content
          if (!(
            big
            && (el.matches("svg") || el.getAttribute("aria-hidden") === "true")
            && !el.matches('[data-ui], [data-diagram], [role="img"]')
          ))
            add(D(r), el);
          continue;
        } else if (el.matches("a, button, input, select, textarea, label")) add(D(r), el);
        // (a row ruled above or below, a question or a line of a list, covers its width; a rule down one side of a tall
        // column is no card)
        else if (
          (card(s)
            || (sides(s) >= 1
              && r.height <= 0.25 * H
              && (parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderBottomWidth) > 0)))
          && r.width >= 24
          && r.height >= 24
          && !big
          && holds(el)
        )
          add(D(r), el);
        // the words: each block by the extent of its own lines
        let tl = Infinity,
          tt = Infinity,
          tr = -Infinity,
          tb = -Infinity;
        for (const n of el.childNodes) {
          if (n.nodeType !== 3 || !/\S/.test(n.data)) continue;
          rg.selectNodeContents(n);
          for (const q of rg.getClientRects())
            if (q.width >= 2 && q.height >= 2) {
              tl = Math.min(tl, q.left);
              tt = Math.min(tt, q.top);
              tr = Math.max(tr, q.right);
              tb = Math.max(tb, q.bottom);
            }
        }
        if (tr > tl) add(D({ left: tl, top: tt, right: tr, bottom: tb }), el);
        // a column of a row of columns (grid or flex items side by side): its width is taken, down the height of its content
        const pa = el.parentElement;
        if (pa && pa !== sec && r.width < 0.9 * cw) {
          if (!sideBy.has(pa)) {
            const pd = cs(pa).display,
              kids =
                /grid|flex/.test(pd) ?
                  [...pa.children].filter(k => real(k) && k.getClientRects().length).map(k => k.getBoundingClientRect())
                : [];
            sideBy.set(
              pa,
              kids.some((a, i) =>
                kids.some(
                  (b, j) =>
                    j > i
                    && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) >= 0.5 * Math.min(a.height, b.height)
                    && (a.right <= b.left + 1 || b.right <= a.left + 1),
                ),
              ),
            );
          }
          if (sideBy.get(pa)) colItems.push({ el, r: D(r) });
        }
      }
      if (full) continue;
      for (const it of colItems) {
        const inner = boxes.filter(b => b.el !== it.el && it.el.contains(b.el));
        if (inner.length)
          add(
            { l: it.r.l, r: it.r.r, t: Math.min(...inner.map(b => b.t)), b: Math.max(...inner.map(b => b.b)) },
            it.el,
          );
      }
      const head = sec.querySelector("h1, h2, h3"),
        secBox = {
          left: Math.round(S.l),
          top: Math.round(S.t),
          width: Math.round(S.r - S.l),
          height: Math.round(S.b - S.t),
        };
      if (!boxes.length) {
        out.push({
          sel: sel(sec),
          text: "",
          docs: [secBox],
          sec: secBox,
          cw: Math.round(cw),
          above: 0,
          below: Math.round(S.b - S.t),
          side: 0,
          share: 1,
          last: null,
          h: Math.round(S.b - S.t),
        });
        continue;
      }
      // the grid: C px cells over the container and the measured rows, each covered by a content box grown G px
      const cols = Math.max(1, Math.ceil(cw / C)),
        rows = Math.max(1, Math.ceil((T1 - T0) / C)),
        cov = new Uint8Array(cols * rows);
      for (const b of boxes) {
        const x0 = Math.max(0, Math.floor((b.l - G - cl) / C)),
          x1 = Math.min(cols, Math.ceil((b.r + G - cl) / C)),
          y0 = Math.max(0, Math.floor((b.t - G - T0) / C)),
          y1 = Math.min(rows, Math.ceil((b.b + G - T0) / C));
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) cov[y * cols + x] = 1;
      }
      const covered = [];
      for (let y = 0; y < rows; y++) {
        let n = 0;
        for (let x = 0; x < cols; x++) n += cov[y * cols + x];
        covered.push(n / cols);
      }
      // counted: a row with no content at all, and every row of a run of rows under half covered 25% of a screen tall
      const counts = new Uint8Array(rows);
      for (let y = 0; y < rows;) {
        if (covered[y] >= 0.5) {
          y++;
          continue;
        }
        let j = y;
        while (j < rows && covered[j] < 0.5) j++;
        const tall = (j - y) * C >= 0.25 * H;
        for (let k = y; k < j; k++) if (tall || covered[k] === 0) counts[k] = 1;
        y = j;
      }
      let empty = 0,
        above = 0,
        below = 0;
      for (let y = 0; y < rows; y++) if (counts[y]) empty += (1 - covered[y]) * cols;
      for (let y = 0; y < rows && covered[y] === 0; y++) above++;
      for (let y = rows - 1; y >= 0 && covered[y] === 0; y--) below++;
      if (above === rows) below = 0;
      let between = 0;
      for (let y = above; y < rows - below; y++) if (covered[y] === 0) between++;
      const share = empty / (cols * rows),
        side = Math.max(0, empty - (above + below + between) * cols);
      // the crop: the largest block of counted empty cells (the histogram method)
      let best = null;
      const hgt = new Array(cols).fill(0);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) hgt[x] = counts[y] && !cov[y * cols + x] ? hgt[x] + 1 : 0;
        const st = [];
        for (let x = 0; x <= cols; x++) {
          const h = x < cols ? hgt[x] : 0;
          while (st.length && hgt[st[st.length - 1]] >= h) {
            const t = st.pop(),
              ht = hgt[t],
              l = st.length ? st[st.length - 1] + 1 : 0,
              w = x - l;
            if (ht && (!best || w * ht > best.w * best.h)) best = { x: l, y: y - ht + 1, w, h: ht };
          }
          st.push(x);
        }
      }
      const lastB = boxes.reduce((a, b) => (b.b > a.b ? b : a));
      out.push({
        sel: sel(sec),
        text: ((head || sec).innerText || "").replace(/\s+/g, " ").trim().slice(0, 40),
        share: Math.round(share * 1000) / 1000,
        above: Math.round(above * C),
        below: Math.round(below * C),
        between: Math.round(between * C),
        side: Math.round(side * C * C),
        h: Math.round(T1 - T0),
        cw: Math.round(cw),
        last: sel(lastB.el),
        docs:
          best ?
            [
              {
                left: Math.round(cl + best.x * C),
                top: Math.round(T0 + best.y * C),
                width: Math.round(Math.min(cw - best.x * C, best.w * C)),
                height: Math.round(Math.min(T1 - T0 - best.y * C, best.h * C)),
              },
            ]
          : [secBox],
        sec: secBox,
      });
    }
    return { H, W, list: out };
  }
  const call = (fn, arg) => `(${fn.toString()})(${JSON.stringify(arg ?? null)})`;

  async function run(ctx) {
    const tab = ctx.tab;
    const A = await ctx.safe("empty-area", () => tab.eval(call(areaProbe), 60000));
    if (!A) return [];
    const F = [];
    for (const x of A.list) {
      const sev =
        x.share > FAIL_AT ? "FAIL"
        : x.share > WARN_AT ? "WARN"
        : null;
      ctx.log(
        `${x.sel}: ${Math.round(x.share * 100)}% empty (above ${x.above}px, below ${x.below}px, beside ${x.side}px² of ${x.cw}x${x.h})`,
      );
      if (!sev) continue;
      const pct = Math.round(x.share * 100),
        parts = [
          x.above && `${x.above}px above its first content`,
          x.between && `${x.between}px of empty rows between its content`,
          x.below && `${x.below}px under its last (${x.last ? x.last.split(" > ").pop() : "content"})`,
          x.side && `${Math.round((x.side / (x.cw * x.h)) * 100)}% beside content that covers under half the container`,
        ].filter(Boolean);
      const f = {
        check: "empty-area",
        sev,
        id: 0,
        sel: x.sel,
        text: x.text,
        msg:
          x.last ?
            `${pct}% of the section is empty: ${parts.join(", ")}, in its ${x.h}px of rows (WARN over ${WARN_AT * 100}%, FAIL over ${FAIL_AT * 100}%)`
          : `the section shows no content at all: ${x.h}px of ground`,
      };
      const p = ctx.place(x.docs[0]);
      if (p.stop != null) {
        const y = ctx.stopY[p.stop],
          on = (d, ref) => {
            const t = Math.max(0, d.top - y),
              b = Math.min(ctx.vh, d.top + d.height - y);
            if (b - t >= 2)
              p.rects.push({ left: d.left, top: t, width: d.width, height: b - t, ...(ref ? { ref: true } : {}) });
          };
        on(x.sec, true);
      }
      F.push(Object.assign(f, p));
    }
    return F;
  }
  return { id, phase, checks, fixes, summary, flags, run };
})();
