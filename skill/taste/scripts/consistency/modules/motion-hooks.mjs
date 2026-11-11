// consistency/modules/motion-hooks.mjs — the motion-hooks check module (moved from consistency.mjs)
// ---------------------------------------------------------------- motion-hooks: the motion layer's own marks (MO)
export const motionMod = (() => {
  // a page that marks <html data-motion> without motion.css (or loads motion.css without the mark) answers nothing on
  // hover; a count that is no number, or counts up a year or a price; a card loop outside the 2.5-4 s cycle ("a bit faster and repeating"). Read once, at the first width wider than a phone (a phone holds loops still).
  const id = "motion-hooks";
  const phase = "width";
  const checks = [
    {
      id: "motion-layer",
      sev: "FAIL",
      what: "<html data-motion> without motion.css (FAIL), or motion.css without data-motion (WARN)",
    },
    { id: "count-text", sev: "FAIL", what: "a [data-m-count] holding no number, or a year or a price" },
    {
      id: "loop-cycle",
      sev: "FAIL",
      what: "a card loop ([data-m-loop], a fragment loop [data-ui-loop], the pulses of a [data-diagram]) cycling over 4 s (FAIL) or under 2.5 s (WARN)",
    },
  ];
  const fixes = {
    "motion-layer": "link assets/motion/motion.css after cards.css and keep data-motion on <html> (both, or neither)",
    "count-text":
      "put data-m-count only on a plain figure (a count, a share, a time): never on a year, a price or words",
    "loop-cycle": "set the loop's cycle to 2.5-4 s (--m-cycle) with every keyframe on it, repeating",
  };
  const summary = [
    "  motion     motion-layer (<html data-motion> without motion.css FAIL, motion.css without it WARN), count-text (a",
    "             [data-m-count] holding no number, a year or a price, FAIL), loop-cycle (a [data-m-loop], [data-ui-loop] or",
    "             [data-diagram] pulse cycle over 4 s FAIL, under 2.5 s WARN: the card loops run 2.5-4 s and repeat)",
  ].join("\n");
  const flags = [];
  const quick = true;
  const when = ctx => ctx.width >= 700;
  // in the page: the mark, the stylesheet, every count and every loop with its longest repeating animation
  function probe() {
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
            s += ":nth-of-type(" + (same.indexOf(e) + 1) + ")";
        }
        parts.unshift(s);
      }
      return parts.join(" > ");
    };
    const doc = el => {
      const r = el.getBoundingClientRect();
      return {
        left: Math.round(Math.max(0, r.left)),
        top: Math.round(r.top + scrollY),
        width: Math.round(Math.max(2, r.width)),
        height: Math.round(Math.max(2, r.height)),
      };
    };
    const marked = document.documentElement.hasAttribute("data-motion");
    let css = false;
    for (const sh of document.styleSheets) {
      if (/\/motion\.css(?:[?#]|$)/.test(sh.href || "")) {
        css = true;
        break;
      }
      try {
        for (const r of sh.cssRules)
          if (/\[data-motion\]/.test(r.selectorText || r.conditionText || (r.cssText || "").slice(0, 200))) {
            css = true;
            break;
          }
      } catch (e) {
        /* another origin */
      }
      if (css) break;
    }
    const counts = [...document.querySelectorAll("[data-m-count]")].map(e => ({
      sel: sel(e),
      text: (e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40),
      doc: doc(e),
    }));
    // the motion layer's loops, a kit fragment's loop and a card diagram's pulses (house rule: they are the card's loop and keep its
    // cadence); a host inside another host is read with it. SVG <animate> pulses count by their dur; a pulse a script draws
    // on a canvas is not read
    const LOOPQ = "[data-m-loop], [data-ui-loop], [data-diagram]";
    const hostsL = [...document.querySelectorAll(LOOPQ)].filter(
      e => !(e.parentElement && e.parentElement.closest(LOOPQ)),
    );
    const dur = v => {
      const m = String(v || "")
        .trim()
        .match(/^([\d.]+)(ms|s|min)?$/);
      return m ?
          parseFloat(m[1])
            * (m[2] === "ms" ? 1
            : m[2] === "min" ? 60000
            : 1000)
        : 0;
    };
    const loops = hostsL.map(e => {
      let ms = 0;
      try {
        for (const a of e.getAnimations({ subtree: true })) {
          const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
          if (t && t.iterations === Infinity && typeof t.duration === "number") ms = Math.max(ms, t.duration);
        }
      } catch (x) {
        /* old browser */
      }
      for (const a of e.querySelectorAll("animate, animateMotion, animateTransform"))
        if (
          /indefinite/.test(a.getAttribute("repeatCount") || "")
          || /indefinite/.test(a.getAttribute("repeatDur") || "")
        )
          ms = Math.max(ms, dur(a.getAttribute("dur")));
      const v = getComputedStyle(e).getPropertyValue("--m-cycle").trim(),
        m = v.match(/^([\d.]+)(ms|s)$/);
      const varMs = m ? parseFloat(m[1]) * (m[2] === "s" ? 1000 : 1) : 0;
      const still = /^(1|true)$/.test(getComputedStyle(e).getPropertyValue("--m-still").trim());
      return {
        sel: sel(e),
        ms: Math.round(ms || varMs),
        varMs: Math.round(varMs),
        still,
        doc: doc(e),
        what:
          e.hasAttribute("data-m-loop") ? "card loop"
          : e.hasAttribute("data-ui-loop") ? "fragment loop"
          : "diagram pulse",
      };
    });
    return { marked, css, counts, loops };
  }
  async function run(ctx) {
    const P = await ctx.safe("motion-hooks", () => ctx.tab.eval("(" + probe.toString() + ")()", 30000));
    if (!P) return [];
    const F = [];
    const put = (f, d) => Object.assign(f, d ? ctx.place(d) : { stop: null, rects: [] });
    if (P.marked && !P.css)
      F.push(
        put({
          check: "motion-layer",
          sev: "FAIL",
          id: 0,
          sel: "html[data-motion]",
          text: "",
          msg: "the page marks <html data-motion> but motion.css is not loaded: buttons, links, cards and photos answer nothing on hover",
        }),
      );
    if (!P.marked && P.css)
      F.push(
        put({
          check: "motion-layer",
          sev: "WARN",
          id: 0,
          sel: "html",
          text: "",
          msg: "motion.css is loaded but <html> carries no data-motion: the hover layer stays off",
        }),
      );
    // a year (1900-2099 alone) or a price counting up reads as a slot machine; words cannot count
    const YEAR = /^\D*(?:19|20)\d\d\D*$/,
      PRICE =
        /[€$£¥₹]|\b(?:eur|usd|gbp|chf|sek|nok|dkk|isk|kr)\b|\/\s*(?:mo|month|year|yr|night|week)\b|\bper (?:month|year|night|week)\b/i;
    for (const c of P.counts) {
      const why =
        !/\d/.test(c.text) ? "holds no number"
        : PRICE.test(c.text) ? "is a price"
        : YEAR.test(c.text) ? "is a year"
        : "";
      if (why)
        F.push(
          put(
            {
              check: "count-text",
              sev: "FAIL",
              id: 0,
              sel: c.sel,
              text: c.text,
              msg: 'a count ("' + c.text.slice(0, 30) + '") ' + why + ": only a plain figure counts up",
            },
            c.doc,
          ),
        );
    }
    for (const l of P.loops) {
      if (!l.ms || l.still) continue;
      if (l.ms > 4050)
        F.push(
          put(
            {
              check: "loop-cycle",
              sev: "FAIL",
              id: 0,
              sel: l.sel,
              text: "",
              msg:
                "a "
                + (l.what || "card loop")
                + " of "
                + (l.ms / 1000).toFixed(1)
                + " s: the card loops cycle in 2.5-4 s and repeat",
            },
            l.doc,
          ),
        );
      else if (l.ms < 2450)
        F.push(
          put(
            {
              check: "loop-cycle",
              sev: "WARN",
              id: 0,
              sel: l.sel,
              text: "",
              msg:
                "a "
                + (l.what || "card loop")
                + " of "
                + (l.ms / 1000).toFixed(1)
                + " s: under the 2.5-4 s cycle, it reads as blinking",
            },
            l.doc,
          ),
        );
    }
    return F;
  }
  return { id, phase, checks, fixes, summary, flags, quick, when, run };
})();
