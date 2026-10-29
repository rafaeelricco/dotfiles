// Nested-radius audit. Paste into the console (or evaluate) on any rendered state.
// For every rounded element, finds the nearest rounded ancestor that draws a shape,
// measures the gap at each corner the child reaches, and compares the child's radius
// to the concentric value: expected = outer radius − gap.
// Returns { findings, skipped } and logs a table. Tolerance in px.
(function radiusAudit(tolerance = 2) {
  const px = v => parseFloat(v) || 0;
  const CORNERS = [
    ["top-left", "borderTopLeftRadius", (c, p) => [c.left - p.left, c.top - p.top]],
    ["top-right", "borderTopRightRadius", (c, p) => [p.right - c.right, c.top - p.top]],
    ["bottom-right", "borderBottomRightRadius", (c, p) => [p.right - c.right, p.bottom - c.bottom]],
    ["bottom-left", "borderBottomLeftRadius", (c, p) => [c.left - p.left, p.bottom - c.bottom]],
  ];
  const visible = (el, cs, r) => r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden";
  // Effective radius: the first value of each corner, clamped to half the box.
  const radius = (cs, prop, r) => Math.min(px(cs[prop].split(" ")[0]), r.width / 2, r.height / 2);
  const draws = (el, cs) =>
    (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent")
    || cs.backgroundImage !== "none"
    || px(cs.borderTopWidth) + px(cs.borderLeftWidth) > 0
    || cs.boxShadow !== "none"
    || cs.backdropFilter !== "none"
    || ["IMG", "VIDEO", "CANVAS"].includes(el.tagName);
  const rounded = cs => CORNERS.some(([, p]) => px(cs[p]) > 0);
  const clips = cs => cs.overflow !== "visible" || cs.overflowX !== "visible";
  const label = el => {
    const cls = [...el.classList]
      .filter(c => !/^(css-|_)/.test(c))
      .slice(0, 3)
      .join(".");
    return el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (cls ? "." + cls : "");
  };
  const path = el => {
    const out = [];
    for (let n = el; n && n !== document.body && out.length < 4; n = n.parentElement) out.unshift(label(n));
    return out.join(" > ");
  };

  const findings = [];
  const skipped = { uneven: 0, pill: 0, clipped: 0 };
  for (const el of document.body.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (!visible(el, cs, r) || !rounded(cs)) continue;
    // Nearest rounded ancestor that draws a shape.
    let parent = el.parentElement,
      pcs,
      pr;
    for (; parent && parent !== document.documentElement; parent = parent.parentElement) {
      pcs = getComputedStyle(parent);
      pr = parent.getBoundingClientRect();
      if (rounded(pcs) && draws(parent, pcs) && visible(parent, pcs, pr)) break;
    }
    if (!parent || parent === document.documentElement) continue;
    const pill = Math.min(r.width, r.height) / 2;
    for (const [corner, prop, gaps] of CORNERS) {
      const outer = radius(pcs, prop, pr);
      if (outer <= 0) continue;
      const [gx, gy] = gaps(r, pr);
      if (gx < -0.5 || gy < -0.5 || gx >= outer || gy >= outer) continue; // outside the corner zone
      if (Math.abs(gx - gy) > tolerance) {
        skipped.uneven++;
        continue;
      }
      const gap = (gx + gy) / 2;
      const actual = radius(cs, prop, r);
      const expected = Math.max(0, outer - gap);
      if (gap < 0.5 && clips(pcs)) {
        skipped.clipped++;
        continue;
      } // flush child, parent clips it
      if (actual >= pill - 0.5 && expected >= pill - 0.5) continue; // pill inside a big curve: fine
      if (Math.abs(actual - expected) <= tolerance) continue;
      if (actual >= pill - 0.5) {
        skipped.pill++;
        continue;
      }
      findings.push({
        element: path(el),
        parent: label(parent),
        corner,
        outer: +outer.toFixed(1),
        gap: +gap.toFixed(1),
        actual: +actual.toFixed(1),
        expected: +expected.toFixed(1),
        delta: +(actual - expected).toFixed(1),
        latent: !draws(el, cs), // radius set but no fill yet (hover/selected state)
      });
    }
  }
  // One row per element+parent pair: keep the worst corner.
  const byKey = new Map();
  for (const f of findings) {
    const k = f.element + "|" + f.parent;
    if (!byKey.has(k) || Math.abs(f.delta) > Math.abs(byKey.get(k).delta)) byKey.set(k, f);
  }
  const rows = [...byKey.values()].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  console.table(rows);
  return { findings: rows, skipped };
})();
