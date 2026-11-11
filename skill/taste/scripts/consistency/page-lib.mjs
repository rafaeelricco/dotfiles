// consistency/page-lib.mjs — the in-page probe and helper, serialised into the page with toString(): each stays one self-contained function (moved from consistency.mjs)
// ---------------------------------------------------------------- the in-page probe (serialised into the page)
export function lib() {
  if (window.__cc) return true;
  const MEDIA = new Set(["IMG", "VIDEO", "CANVAS", "IFRAME", "OBJECT", "EMBED"]);
  const SKIP = new Set([
    "SCRIPT",
    "STYLE",
    "LINK",
    "META",
    "NOSCRIPT",
    "TEMPLATE",
    "BR",
    "WBR",
    "SOURCE",
    "TRACK",
    "HEAD",
    "TITLE",
    "PARAM",
    "AREA",
    "MAP",
    "DATALIST",
    "OPTION",
    "OPTGROUP",
  ]);
  const INTER =
    'a[href], button, [role="button"], input[type="submit"], input[type="button"], input[type="reset"], summary';
  const LOOK_TAGS = new Set(["SPAN", "DIV", "P", "B", "STRONG", "EM", "SMALL", "LABEL", "I", "MARK"]);
  let nextId = 1;
  const ids = new WeakMap();
  const els = new Map();
  const idOf = el => {
    let i = ids.get(el);
    if (!i) {
      i = nextId++;
      ids.set(el, i);
      els.set(i, el);
    }
    return i;
  };
  const seen = {
    tilt: new WeakSet(),
    spill: new WeakSet(),
    cut: new WeakSet(),
    grid: new WeakSet(),
    stagger: new WeakSet(),
    contrast: new WeakSet(),
    rows: new WeakSet(),
  };
  const moving = new WeakSet(); // elements found changing with the scroll (and everything inside them)
  let edgeless = new WeakSet(); // boxes already reported for text outside their visible part
  let spilled = []; // boxes reported as running off their panel (text left floating past them is told with them)
  const linkedDone = new WeakSet();
  const loopers = new Set(); // ids still changing 3s after the scroll stopped: they move by themselves
  let held = [],
    heldInfo = []; // sections held on screen while the page scrolls (sticky stages, pin-spacers)
  let pre = null;
  const V = new Map(),
    K = new Map(); // the page before any scroll; what animated in when scrolled to
  const snaps = {};
  let csC,
    eoC,
    sfC,
    qkC,
    fxC,
    tlC,
    secEls = null;
  const fresh = () => {
    csC = new Map();
    eoC = new Map();
    sfC = new Map();
    qkC = new Map();
    fxC = new Map();
    tlC = new Map();
  };
  fresh();
  const CS = el => {
    let c = csC.get(el);
    if (!c) {
      c = getComputedStyle(el);
      csC.set(el, c);
    }
    return c;
  };
  const isSvgPart = el => el instanceof SVGElement && el.tagName.toLowerCase() !== "svg";
  const R = r => ({
    left: Math.round(r.left),
    top: Math.round(r.top),
    width: Math.round(r.width),
    height: Math.round(r.height),
  });
  // the part of a box on the screen
  const onScreen = (r, vw, vh) => {
    const l = Math.max(0, r.left),
      t = Math.max(0, r.top);
    return {
      left: l,
      top: t,
      width: Math.max(0, Math.min(vw, r.right ?? r.left + r.width) - l),
      height: Math.max(0, Math.min(vh, r.bottom ?? r.top + r.height) - t),
    };
  };
  const vwNow = () => document.documentElement.clientWidth || innerWidth;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // colours, read through a 1px canvas so any CSS colour syntax works
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const colC = new Map();
  function rgba(s) {
    if (!s || s === "transparent" || s === "none") return { r: 0, g: 0, b: 0, a: 0 };
    let c = colC.get(s);
    if (c) return c;
    const m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/);
    if (m)
      c = {
        r: +m[1],
        g: +m[2],
        b: +m[3],
        a:
          m[4] === undefined ? 1
          : m[5] ? +m[4] / 100
          : +m[4],
      };
    else {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = "rgba(0,0,0,0)";
      cx.fillStyle = s;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      c = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
    }
    colC.set(s, c);
    return c;
  }
  const cdist = (a, b) => Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b));
  const hex = c => "#" + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("");

  function sel(el) {
    if (!el || el.nodeType !== 1) return "";
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
  }
  const label = el => {
    if (!el) return "";
    if (el.tagName === "IMG")
      return "img: " + (el.getAttribute("alt") || (el.currentSrc || "").split("/").pop() || "").slice(0, 44);
    return String(el.innerText || el.textContent || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 48);
  };

  function effOpacity(el) {
    if (!el || el === document.documentElement) return 1;
    let v = eoC.get(el);
    if (v !== undefined) return v;
    v = parseFloat(CS(el).opacity);
    if (isNaN(v)) v = 1;
    v *= effOpacity(el.parentElement);
    eoC.set(el, v);
    return v;
  }
  function shown(el, r) {
    const c = CS(el);
    if (c.visibility === "hidden" || c.visibility === "collapse") return false;
    if (effOpacity(el) < 0.05) return false;
    r = r || el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    // inside a closed <details>, or a content-visibility: hidden box, it keeps a box but is not drawn
    if (el.checkVisibility && !el.checkVisibility()) return false;
    if (srOnly(el)) return false;
    return true;
  }
  // text for screen readers only (a 1px box clipped to nothing: .sr-only, .visually-hidden) is never drawn
  const srC = new WeakMap();
  function srOnly(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    let v = srC.get(el);
    if (v !== undefined) return v;
    const c = CS(el);
    v =
      /absolute|fixed/.test(c.position)
      && (/^rect\(0(px)?,?\s*0(px)?,?\s*0(px)?,?\s*0(px)?\)$/.test(c.clip)
        || /inset\(50%\)/.test(c.clipPath)
        || ((parseFloat(c.width) || 0) <= 1 && (parseFloat(c.height) || 0) <= 1 && c.overflow === "hidden"));
    if (!v) v = srOnly(el.parentElement);
    srC.set(el, v);
    return v;
  }
  // fixed, or a sticky bar (a nav) under a third of the screen, and everything inside it: it slides over the page as
  // it scrolls, so it sits on no panel and makes no part of a section. A taller sticky box is a held stage: it is the
  // section's content (its parts are judged against each other, see stageOf)
  function inFixed(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    let v = fxC.get(el);
    if (v !== undefined) return v;
    const p = CS(el).position;
    v =
      p === "fixed"
      || (p === "sticky" && el.getBoundingClientRect().height < innerHeight * 0.35)
      || inFixed(el.parentElement);
    fxC.set(el, v);
    return v;
  }
  // the sticky stage an element is held in (null when none): it moves against everything outside it
  function stageOf(el) {
    for (let a = el; a && a !== document.body && a !== document.documentElement; a = a.parentElement)
      if (CS(a).position === "sticky") return a;
    return null;
  }
  // a bar that stays on screen (a nav, a cookie line, a progress bar): fixed or sticky and under a third of the screen
  const isBar = (c, r) => (c.position === "fixed" || c.position === "sticky") && r.height < innerHeight * 0.35;
  // the held section an element is in (a sticky stage, or a pinned box in a pin-spacer)
  const holdOf = el => {
    for (const h of held) if (h === el || h.contains(el)) return h;
    return null;
  };
  // a block laid out from the centre (a centred heading's button row): its parts are not on the left grid
  function inCentred(el, vw) {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const c = CS(a);
      const centres =
        /center/.test(c.textAlign)
        || (/flex/.test(c.display) && /center/.test(c.justifyContent) && !/column/.test(c.flexDirection))
        || (/grid/.test(c.display) && /center/.test(c.justifyItems));
      if (!centres) continue;
      const r = a.getBoundingClientRect();
      if (Math.abs((r.left + r.right) / 2 - vw / 2) <= 3) return true;
    }
    return false;
  }
  // pushed to the right end of a flex row (a price beside its name, the links at the right of a footer line): where it
  // starts follows its own width, not a grid
  function pinnedRight(el) {
    for (let a = el; a && a.parentElement && a !== document.body; a = a.parentElement) {
      const p = a.parentElement,
        pc = CS(p);
      if (!/flex/.test(pc.display) || /column/.test(pc.flexDirection)) continue;
      const r = a.getBoundingClientRect(),
        pr = p.getBoundingClientRect();
      const cl = pr.left + (parseFloat(pc.paddingLeft) || 0) + (parseFloat(pc.borderLeftWidth) || 0);
      const cr = pr.right - (parseFloat(pc.paddingRight) || 0) - (parseFloat(pc.borderRightWidth) || 0);
      if (
        Math.abs(r.right - cr) > 2
        || r.left <= cl + 2
        || r.width > 0.4 * (cr - cl)
        || (parseFloat(CS(a).flexGrow) || 0) > 0
      )
        continue;
      for (const s of p.children) {
        if (s === a || !(a.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_PRECEDING)) continue;
        const q = s.getBoundingClientRect();
        if (q.width > 0 && q.right <= r.left + 1 && Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top) > 0)
          return true;
      }
    }
    return false;
  }
  function inScroller(el) {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const c = CS(a);
      if (/auto|scroll/.test(c.overflowX) && a.scrollWidth > a.clientWidth + 2) return true;
    }
    return false;
  }
  function ownText(el) {
    for (const n of el.childNodes) if (n.nodeType === 3 && /\S/.test(n.nodeValue)) return true;
    return false;
  }
  function nodeRects(n, out) {
    const t = n.nodeValue;
    const a = t.search(/\S/);
    if (a < 0) return out;
    let b = t.length;
    while (b > a && /\s/.test(t[b - 1])) b--;
    const rg = document.createRange();
    rg.setStart(n, a);
    rg.setEnd(n, b);
    for (const r of rg.getClientRects())
      if (r.width >= 1 && r.height >= 1)
        out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
    return out;
  }
  function lines(el) {
    const out = [];
    for (const n of el.childNodes) if (n.nodeType === 3) nodeRects(n, out);
    return out;
  }
  function deepLines(el) {
    const out = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const p = n.parentElement;
      if (p && shown(p)) nodeRects(n, out);
    }
    return out;
  }

  // what the element looks like: a box (fill, border, shadow, picture, effect) or media
  function backdrop(el) {
    for (let a = el.parentElement; a; a = a.parentElement) {
      const c = CS(a);
      if (c.backgroundImage && c.backgroundImage !== "none") return null;
      const bg = rgba(c.backgroundColor);
      if (bg.a >= 0.5) return bg;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }
  function bordered(c) {
    let n = 0;
    for (const s of ["Top", "Right", "Bottom", "Left"])
      if (
        parseFloat(c["border" + s + "Width"]) >= 1
        && !/none|hidden/.test(c["border" + s + "Style"])
        && rgba(c["border" + s + "Color"]).a >= 0.25
      )
        n++;
    return n >= 3;
  }
  // an outline too faint to count as a box's look (a hairline in 8% ink) still draws the box's edge
  function faintBox(c) {
    let n = 0;
    for (const s of ["Top", "Right", "Bottom", "Left"])
      if (
        parseFloat(c["border" + s + "Width"]) >= 1
        && !/none|hidden/.test(c["border" + s + "Style"])
        && rgba(c["border" + s + "Color"]).a >= 0.05
      )
        n++;
    return n >= 3;
  }
  // a background drawn as a line (an underline that draws on hover: gradients sized 0% or a few px tall): no fill, no
  // ground. lineShows: a layer of it is visible at rest
  function lineImage(c) {
    const bi = c.backgroundImage;
    if (!bi || bi === "none" || /url\(/.test(bi)) return false;
    const sizes = String(c.backgroundSize || "")
      .split(",")
      .map(s => s.trim().split(/\s+/));
    return (
      sizes.length > 0
      && sizes.every(
        s =>
          s.length >= 2
          && (/^0(%|px)?$/.test(s[0])
            || /^0(%|px)?$/.test(s[1])
            || (/px$/.test(s[1]) && parseFloat(s[1]) <= 3)
            || (/px$/.test(s[0]) && parseFloat(s[0]) <= 3)),
      )
    );
  }
  const lineShows = c =>
    String(c.backgroundSize || "")
      .split(",")
      .some(s => {
        const p = s.trim().split(/\s+/);
        return p.length >= 2 && !/^0(%|px)?$/.test(p[0]) && !/^0(%|px)?$/.test(p[1]);
      });
  function shadowed(c) {
    const s = c.boxShadow;
    if (!s || s === "none") return false;
    return s.split(/,(?![^(]*\))/).some(p => {
      const m = p.match(/(rgba?|oklch|oklab|lab|lch|hsla?|color)\([^)]*\)|#[0-9a-f]{3,8}/i);
      const a = m ? rgba(m[0]).a : 1;
      const nums = (p.replace(/\([^)]*\)/g, "").match(/-?[\d.]+px/g) || []).map(parseFloat);
      return a > 0.04 && nums.some(v => Math.abs(v) >= 1);
    });
  }
  function quickKind(el) {
    if (qkC.has(el)) return qkC.get(el);
    let k = null;
    const tag = el.tagName;
    if (MEDIA.has(tag)) k = "media";
    else if (tag.toLowerCase() === "svg") {
      const r = el.getBoundingClientRect();
      k = r.width >= 40 && r.height >= 40 ? "media" : null;
    } else {
      const c = CS(el);
      if (c.backgroundImage && c.backgroundImage !== "none" && !lineImage(c))
        k = /url\(/.test(c.backgroundImage) ? "picture" : "effect";
      else {
        const bg = rgba(c.backgroundColor);
        if (bg.a >= 0.3) {
          const bd = backdrop(el);
          if (!bd || cdist(bg, bd) >= 10) k = "fill";
        }
        if (!k && bordered(c)) k = "border";
        if (!k && shadowed(c)) k = "shadow";
      }
    }
    qkC.set(el, k);
    return k;
  }
  // a box whose fill matches its DOM parent can still sit on something else (a panel placed behind it)
  const pageBg = () => {
    const b = rgba(CS(document.body).backgroundColor),
      h = rgba(CS(document.documentElement).backgroundColor);
    return (
      b.a >= 0.5 ? b
      : h.a >= 0.5 ? h
      : { r: 255, g: 255, b: 255, a: 1 }
    );
  };
  // can the fill of el be told from what lies behind it at (x, y)? null when el is not hit there
  function visibleAt(el, bg, x, y) {
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return null;
    const list = document.elementsFromPoint(x, y);
    const i = list.indexOf(el);
    if (i < 0) return null;
    for (const e of list.slice(i + 1)) {
      const c = CS(e);
      if (MEDIA.has(e.tagName) || (c.backgroundImage && c.backgroundImage !== "none")) return true;
      const b = rgba(c.backgroundColor);
      if (b.a >= 0.5 && cdist(b, bg) >= 10) return true; // a layer of the same colour draws no edge: look further down
    }
    return cdist(pageBg(), bg) >= 10;
  }
  function paintDiffers(el, bg) {
    const r = el.getBoundingClientRect();
    const pts = [
      [(r.left + r.right) / 2, (r.top + r.bottom) / 2],
      [r.left + 6, r.top + 6],
      [r.right - 6, r.top + 6],
      [r.left + 6, r.bottom - 6],
      [r.right - 6, r.bottom - 6],
    ];
    return pts.some(([x, y]) => visibleAt(el, bg, x, y) === true);
  }
  function surface(el) {
    if (sfC.has(el)) return sfC.get(el);
    let k = quickKind(el);
    if (!k && !MEDIA.has(el.tagName)) {
      const c = CS(el);
      const bg = rgba(c.backgroundColor);
      if (bg.a >= 0.3 && paintDiffers(el, bg)) k = "fill";
      if (!k) {
        const r = el.getBoundingClientRect();
        for (const ps of ["::before", "::after"]) {
          const p = getComputedStyle(el, ps);
          if (p.content === "none" || p.content === "normal" || p.position !== "absolute") continue;
          const pb = rgba(p.backgroundColor);
          const bd = backdrop(el);
          const vis =
            (p.backgroundImage && p.backgroundImage !== "none") || (pb.a >= 0.3 && (!bd || cdist(pb, bd) >= 10));
          if (vis && parseFloat(p.width) * parseFloat(p.height) >= 0.6 * r.width * r.height) {
            k = p.backgroundImage !== "none" ? "effect" : "fill";
            break;
          }
        }
      }
    }
    sfC.set(el, k);
    return k;
  }

  // the ancestors that clip the element (an absolutely placed box skips to its containing block)
  function clips(el) {
    const out = [];
    let cur = el,
      a = el.parentElement;
    // the element's own box clips its words too (overflow: hidden on a heading too narrow for them), unless it says so
    // with an ellipsis or a line clamp (told as a WARN of their own)
    {
      const c = CS(el);
      if (
        (c.overflowX === "hidden" || c.overflowX === "clip" || c.overflowY === "hidden" || c.overflowY === "clip")
        && c.textOverflow !== "ellipsis"
        && !(c.webkitLineClamp && c.webkitLineClamp !== "none")
        && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2)
      ) {
        const r = el.getBoundingClientRect();
        out.push({
          a: el,
          left: r.left + (parseFloat(c.borderLeftWidth) || 0),
          right: r.right - (parseFloat(c.borderRightWidth) || 0),
          top: r.top + (parseFloat(c.borderTopWidth) || 0),
          bottom: r.bottom - (parseFloat(c.borderBottomWidth) || 0),
          x: c.overflowX !== "visible",
          y: c.overflowY !== "visible",
          sx: false,
          sy: false,
        });
      }
    }
    while (a && a !== document.body && a !== document.documentElement) {
      const pc = CS(cur).position;
      if (pc === "fixed") break;
      if (pc === "absolute") {
        const op = cur.offsetParent;
        if (op && op !== a && op.contains(a)) a = op;
      }
      if (!a || a === document.body || a === document.documentElement) break;
      const c = CS(a);
      if (c.overflowX !== "visible" || c.overflowY !== "visible") {
        const r = a.getBoundingClientRect();
        out.push({
          a,
          left: r.left + (parseFloat(c.borderLeftWidth) || 0),
          right: r.right - (parseFloat(c.borderRightWidth) || 0),
          top: r.top + (parseFloat(c.borderTopWidth) || 0),
          bottom: r.bottom - (parseFloat(c.borderBottomWidth) || 0),
          x: c.overflowX !== "visible",
          y: c.overflowY !== "visible",
          sx: /auto|scroll/.test(c.overflowX) && a.scrollWidth > a.clientWidth + 2,
          sy: /auto|scroll/.test(c.overflowY) && a.scrollHeight > a.clientHeight + 2,
        });
      }
      cur = a;
      a = a.parentElement;
    }
    return out;
  }
  function clipRect(el, r) {
    let l = r.left,
      t = r.top,
      rr = r.right ?? r.left + r.width,
      b = r.bottom ?? r.top + r.height;
    for (const k of clips(el)) {
      if (k.x) {
        l = Math.max(l, k.left);
        rr = Math.min(rr, k.right);
      }
      if (k.y) {
        t = Math.max(t, k.top);
        b = Math.min(b, k.bottom);
      }
    }
    return { left: l, top: t, right: rr, bottom: b, width: Math.max(0, rr - l), height: Math.max(0, b - t) };
  }

  function tiltOf(c) {
    let ang = 0,
      skew = 0,
      d3 = false;
    const t = c.transform;
    if (t && t !== "none") {
      try {
        const m = new DOMMatrixReadOnly(t);
        if (
          !m.is2D
          && (Math.abs(m.m13) > 0.02 || Math.abs(m.m23) > 0.02 || Math.abs(m.m31) > 0.02 || Math.abs(m.m32) > 0.02)
        )
          d3 = true;
        let a = m.m11,
          b = m.m12;
        if (m.m11 * m.m22 - m.m12 * m.m21 < 0) {
          a = -a;
          b = -b;
        } // a mirror is not a tilt
        ang = (Math.atan2(b, a) * 180) / Math.PI;
        const n1 = Math.hypot(m.m11, m.m12),
          n2 = Math.hypot(m.m21, m.m22);
        if (n1 > 1e-6 && n2 > 1e-6)
          skew = (Math.asin(Math.max(-1, Math.min(1, (m.m11 * m.m21 + m.m12 * m.m22) / (n1 * n2)))) * 180) / Math.PI;
      } catch {}
    }
    if (c.rotate && c.rotate !== "none") {
      const mm = c.rotate.match(/(-?[\d.]+)(deg|rad|turn|grad)/);
      if (mm) {
        let v = parseFloat(mm[1]);
        v =
          mm[2] === "rad" ? (v * 180) / Math.PI
          : mm[2] === "turn" ? v * 360
          : mm[2] === "grad" ? v * 0.9
          : v;
        if (/^\s*[xy]\b/.test(c.rotate) || /^\s*-?[\d.]+\s+-?[\d.]+\s+-?[\d.]+\s+/.test(c.rotate))
          d3 = Math.abs(v) > 0.5;
        else ang += v;
      }
    }
    ang = (((ang % 360) + 540) % 360) - 180;
    return { ang, skew, d3 };
  }
  const tiltC = el => {
    let t = tlC.get(el);
    if (!t) {
      t = tiltOf(CS(el));
      tlC.set(el, t);
    }
    return t;
  };
  const tilted = t => Math.abs(t.ang) > 0.5 || Math.abs(t.skew) > 0.5 || t.d3;

  // a button, by how it looks: a short label on a fill or an outline
  function buttonLook(el, real) {
    const r = el.getBoundingClientRect();
    // a real link or button may run the width of the page (a full-width closing call); a drawn box only to 460px
    if (
      r.height < 26
      || r.height > 90
      || r.width < 36
      || (r.width > 460 && !(real && el.matches && el.matches(INTER) && r.width <= vwNow() + 1))
    )
      return null;
    const txt = String(el.innerText || el.value || "")
      .trim()
      .replace(/\s+/g, " ");
    if (!txt || txt.length > 42 || txt.split(" ").length > 7) return null;
    // an announcement pill over the headline ("Stackline 3.0 is here · Read the post", x.ai's launch pill) is a line of
    // news, not one of the page's buttons
    if (
      txt.split(" ").length >= 4
      && el.matches
      && el.matches('.pill, [class*="announce"], [class*="badge"], [class*="eyebrow"], [class*="news"]')
    )
      return null;
    const c = CS(el);
    const layers = [c];
    // a pseudo-element is a layer of the button's look only when it covers most of it (an underline drawn by ::after,
    // a 2px bar under the current link, is no fill)
    for (const ps of ["::before", "::after"]) {
      const p = getComputedStyle(el, ps);
      if (p.content === "none" || p.content === "normal" || !(p.position === "absolute" || p.display === "block"))
        continue;
      const pw = parseFloat(p.width),
        ph = parseFloat(p.height);
      if (isFinite(pw) && isFinite(ph) && pw * ph < 0.6 * r.width * r.height) continue;
      if (/scale\(0|matrix\(0,/.test(p.transform || "")) continue;
      layers.push(p);
    }
    for (const ch of el.children) {
      const q = ch.getBoundingClientRect();
      if (q.width * q.height >= 0.85 * r.width * r.height) layers.push(CS(ch));
    }
    let fill = null,
      stroke = null,
      radius = 0,
      slant = "";
    for (const lc of layers) {
      const bg = rgba(lc.backgroundColor);
      if (!fill && bg.a >= 0.3) fill = bg;
      if (!fill && lc.backgroundImage && /gradient/.test(lc.backgroundImage) && !lineImage(lc))
        fill = { gradient: true };
      if (!stroke && bordered(lc))
        stroke = rgba(lc.borderTopColor).a >= 0.25 ? rgba(lc.borderTopColor) : rgba(lc.borderBottomColor);
      const rad = lc.borderTopLeftRadius || "0";
      radius = Math.max(radius, /%/.test(rad) && parseFloat(rad) > 0 ? 999 : parseFloat(rad) || 0);
      const tt = tiltOf(lc);
      if (!slant && Math.abs(tt.skew) > 0.5) slant = `skewed ${Math.round(tt.skew)}°`;
      else if (!slant && (Math.abs(tt.ang) > 0.5 || tt.d3)) slant = `rotated ${Math.round(tt.ang)}°`;
      if (!slant && lc.clipPath && lc.clipPath !== "none") slant = "cut by clip-path";
    }
    // a label beside a filled disc (an arrow in a circle) is a button too: the disc is its look and its height
    let disc = null;
    if (!fill && !stroke && real) {
      for (const d of el.querySelectorAll(":scope > *, :scope > * > *")) {
        if (ownText(d) || d.querySelector("img, picture, video")) continue;
        const q = d.getBoundingClientRect(),
          dc = CS(d),
          bg = rgba(dc.backgroundColor);
        if (bg.a < 0.3 || q.height < 24 || q.height < 0.55 * r.height || Math.abs(q.width - q.height) > 0.25 * q.height)
          continue;
        const rad = dc.borderTopLeftRadius || "0";
        if (!(/%/.test(rad) ? parseFloat(rad) >= 40 : parseFloat(rad) >= 0.4 * q.height)) continue;
        disc = q;
        fill = bg;
        break;
      }
    }
    if (!fill && !stroke) return null;
    if (fill && !fill.gradient && !stroke && !disc) {
      const bd = backdrop(el);
      if (bd && cdist(fill, bd) < 10 && !paintDiffers(el, fill)) return null;
    }
    // an outlined button filled in the colour of what it sits on reads as an outline: the same button on a card of
    // another colour reads as a filled one (in testing: one secondary button white in the hero, grey in the room cards)
    if (fill && !fill.gradient && stroke && !disc) {
      const bd = backdrop(el);
      if (bd && cdist(fill, bd) < 6 && !paintDiffers(el, fill)) fill = null;
    }
    const h = disc ? disc.height : r.height;
    const shape =
      disc ? "label and disc"
      : slant ? "slanted"
      : radius <= 2 ? "square"
      : radius >= h / 2 - 2 ? "pill"
      : radius <= 12 ? "soft"
      : "round";
    // the label's size is the size of its words (a 63px label in a 21px button is a 63px label)
    let fs = ownText(el) ? parseFloat(c.fontSize) || 16 : 0;
    for (const d of el.querySelectorAll("*"))
      if (ownText(d) && shown(d)) fs = Math.max(fs, parseFloat(CS(d).fontSize) || 0);
    // the ground it sits on (a button on a brand band is the page's button inverted: same-action reads the pair as one action)
    let bdHex = null;
    if (fill && !fill.gradient) {
      try {
        const b0 = backdrop(el);
        if (b0 && b0.a >= 0.5) bdHex = hex(b0);
      } catch {}
    }
    return {
      shape,
      slant,
      fill:
        fill ?
          fill.gradient ?
            "gradient"
          : hex(fill)
        : null,
      stroke: stroke ? hex(stroke) : null,
      bd: bdHex,
      text: txt.slice(0, 40),
      h: Math.round(h),
      fs: fs || parseFloat(c.fontSize) || 16,
      real: !!real,
    };
  }

  function sectionsList() {
    if (secEls) return secEls;
    const main = document.querySelector("main");
    const top = main ? [...main.children] : [...document.body.children];
    if (main)
      for (const c of document.body.children)
        if (c !== main && !c.contains(main) && /^(FOOTER|SECTION)$/.test(c.tagName)) top.push(c);
    const isSec = n => /^(SECTION|FOOTER|ARTICLE|ASIDE|HEADER)$/.test(n.tagName);
    const flat = (nodes, d) =>
      nodes.flatMap(n => {
        if (!(n instanceof HTMLElement) || SKIP.has(n.tagName) || n.tagName === "DIALOG") return [];
        const c = CS(n);
        if (c.display === "none" || c.position === "fixed") return [];
        if (d < 4 && !isSec(n) && !ownText(n) && ([...n.children].some(isSec) || n.classList.contains("pin-spacer")))
          return flat([...n.children], d + 1);
        if (n.getBoundingClientRect().height < 40) return [];
        return [n];
      });
    // the site's bar is no section: a <nav>, and any block under 200px at the top of the list (before the first h1) that
    // is sticky or fixed, or holds a nav or two links or more (a sticky <div class="nav">, an announcement strip)
    const isBar = n => {
      if (n.tagName === "FOOTER") return false;
      const r = n.getBoundingClientRect();
      if (r.height >= 200 || n.querySelector("h1, h2")) return false;
      const c = CS(n);
      return (
        c.position === "sticky"
        || c.position === "fixed"
        || !!n.querySelector('nav, [role="navigation"]')
        || n.querySelectorAll("a[href], button").length >= 2
        || n.tagName === "HEADER"
      );
    };
    let all = flat(top, 0).filter(n => n.tagName !== "NAV");
    while (all.length > 1 && isBar(all[0])) all.shift();
    secEls = all;
    secEls.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    return secEls;
  }
  const secIndex = el => sectionsList().findIndex(s => s.contains(el));

  // the top and bottom of what a section shows (text, pictures, boxes), as seen now
  function extent(sec, vw) {
    let top = Infinity,
      bottom = -Infinity;
    for (const e of sec.querySelectorAll("*")) {
      if (SKIP.has(e.tagName) || isSvgPart(e)) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || !shown(e, r)) continue;
      if (inFixed(e)) continue;
      let box = null;
      if (MEDIA.has(e.tagName) || (e.tagName.toLowerCase() === "svg" && r.width >= 16)) box = r;
      // a filled or bordered box (a button, a chip) reaches its own edge, not its label's line: a button with words in
      // it ends where its fill ends (the closing call flush on the footer)
      else if (
        (quickKind(e) || faintBox(CS(e)))
        && r.width < vw * 0.98
        && (!ownText(e) || (e.matches(INTER) && r.height <= 120))
      )
        box = r;
      else if (ownText(e)) {
        const ls = lines(e);
        if (ls.length)
          box = {
            left: Math.min(...ls.map(l => l.left)),
            right: Math.max(...ls.map(l => l.right)),
            top: Math.min(...ls.map(l => l.top)),
            bottom: Math.max(...ls.map(l => l.bottom)),
          };
      }
      if (!box) continue;
      const v = clipRect(e, box);
      if (v.width < 1 || v.height < 1) continue;
      top = Math.min(top, v.top);
      bottom = Math.max(bottom, v.bottom);
    }
    return isFinite(top) ? { top, bottom } : null;
  }
  function groundAt(x, y) {
    const list = document.elementsFromPoint(x, Math.max(0, Math.min(innerHeight - 1, y)));
    for (const e of list) {
      if (inFixed(e)) continue;
      const c = CS(e);
      if (MEDIA.has(e.tagName)) return "picture";
      if (c.backgroundImage && c.backgroundImage !== "none") return "effect";
      const b = rgba(c.backgroundColor);
      if (b.a >= 0.9) return hex(b);
    }
    const bb = rgba(CS(document.body).backgroundColor),
      hb = rgba(CS(document.documentElement).backgroundColor);
    return hex(
      bb.a >= 0.9 ? bb
      : hb.a >= 0.9 ? hb
      : { r: 255, g: 255, b: 255 },
    );
  }
  let pevC = null; // the page's pass-through layers, read once per measure
  function passLayer(x, y, el) {
    if (!pevC || pevC.t !== csC) {
      const list = [];
      for (const c of document.body.querySelectorAll("*")) {
        if (SKIP.has(c.tagName) || isSvgPart(c)) continue;
        const cc = CS(c);
        if (cc.pointerEvents !== "none" || !/absolute|fixed/.test(cc.position)) continue;
        const b = rgba(cc.backgroundColor),
          img = cc.backgroundImage && cc.backgroundImage !== "none" && !lineImage(cc);
        if (b.a >= 0.9 || img) list.push(c);
      }
      pevC = { t: csC, list };
    }
    for (const c of pevC.list) {
      if (c === el || c.contains(el) || el.contains(c)) continue;
      const cc = CS(c);
      if (effOpacity(c) < 0.5 || cc.visibility === "hidden" || cc.display === "none") continue;
      const q = c.getBoundingClientRect();
      if (x < q.left || x > q.right || y < q.top || y > q.bottom || q.width * q.height > innerWidth * innerHeight * 0.5)
        continue;
      // in the same component (within four levels), and drawn under the words: earlier in the page, or on a lower layer
      let near = false;
      for (let a = el.parentElement, up = 0; a && up < 4 && !near; a = a.parentElement, up++) near = a.contains(c);
      if (!near) continue;
      const zc = parseInt(cc.zIndex, 10) || 0;
      let ze = 0;
      for (let a = el; a && !a.contains(c); a = a.parentElement) {
        const z = parseInt(CS(a).zIndex, 10);
        if (z > ze) ze = z;
      }
      if (!(c.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) && zc >= ze) continue;
      if (cc.backgroundImage && cc.backgroundImage !== "none" && !lineImage(cc))
        return { kind: /url\(/.test(cc.backgroundImage) ? "picture" : "effect", e: c };
      const b = rgba(cc.backgroundColor);
      if (b.a >= 0.9) return { kind: "solid", e: c, col: b };
    }
    return null;
  }
  function under(x, y, el) {
    // text on its own fill (a tab, a label with a ground) sits on that fill
    const own = CS(el);
    // an inline span's own background-image is a mark or an underline in the text, not a ground under it
    if (own.backgroundImage && own.backgroundImage !== "none" && own.display !== "inline")
      return { kind: /url\(/.test(own.backgroundImage) ? "picture" : "effect", e: el };
    const ob = rgba(own.backgroundColor);
    if (ob.a >= 0.9) return { kind: "solid", e: el, col: ob };
    // a layer the pointer passes through (a tab indicator, a nav pill sliding under the words: pointer-events none)
    // is not in elementsFromPoint, yet the words sit on it
    {
      const pv = passLayer(x, y, el);
      if (pv) return pv;
    }
    const list = document.elementsFromPoint(x, y);
    const start = list.indexOf(el);
    for (let i = start < 0 ? 0 : start + 1; i < list.length; i++) {
      const e = list[i];
      if (e === el || el.contains(e)) continue;
      if (inFixed(e) && !inFixed(el)) continue;
      const c = CS(e);
      if (MEDIA.has(e.tagName))
        return { kind: e.tagName === "CANVAS" || e.tagName === "IFRAME" ? "effect" : "picture", e };
      if (e.tagName.toLowerCase() === "svg") {
        const r = e.getBoundingClientRect();
        if (r.width > 120 && r.height > 60) return { kind: "effect", e };
      }
      if (c.backgroundImage && c.backgroundImage !== "none" && c.display !== "inline")
        return { kind: /url\(/.test(c.backgroundImage) ? "picture" : "effect", e };
      const b = rgba(c.backgroundColor);
      if (b.a >= 0.9) return { kind: "solid", e, col: b };
    }
    const bb = rgba(CS(document.body).backgroundColor),
      hb = rgba(CS(document.documentElement).backgroundColor);
    return {
      kind: "solid",
      e: null,
      col:
        bb.a >= 0.9 ? bb
        : hb.a >= 0.9 ? hb
        : { r: 255, g: 255, b: 255, a: 1 },
    };
  }

  function add(out, check, sev, el, msg, rects, extra) {
    out.findings.push(
      Object.assign(
        {
          check,
          sev,
          id: el ? idOf(el) : 0,
          sel: sel(el),
          text: label(el),
          msg,
          rects: rects.map(r => Object.assign(R(r), r.ref ? { ref: true } : {})),
        },
        extra || {},
      ),
    );
  }

  // ------------------------------------------------ checks, each element judged once, when it is first seen whole
  function checkTilt(view, first, out) {
    const bent = new Map(); // letters or words of one block turned one by one (text set on an arc)
    for (const [el, r] of view) {
      if (!first(seen.tilt, el, r)) continue;
      const t = tiltC(el);
      if (!tilted(t)) continue;
      let up = false;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement)
        if (tilted(tiltC(a))) {
          up = true;
          break;
        }
      if (up) continue;
      // letters of a word set one by one (aria-hidden copies of a heading count: they are what shows)
      if (
        r.width < 48
        && r.height < 48
        && ownText(el)
        && !el.closest('[data-ui], .ui[class*=ui-], [data-fx], [data-fx-mounted], [role="img"]')
      ) {
        const b = el.closest(HEADS + ", p") || el.parentElement;
        if (!bent.has(b)) bent.set(b, []);
        bent.get(b).push(r);
        continue;
      }
      if (r.width < 48 && r.height < 48) continue; // an icon or an arrow
      const btn = el.matches(INTER) ? el : null;
      if ((btn && buttonLook(btn, true)) || (LOOK_TAGS.has(el.tagName) && buttonLook(el, false))) continue; // judged as a button
      if (
        el.getAnimations
        && el.getAnimations().some(a => {
          try {
            return a.effect.getComputedTiming().iterations === Infinity;
          } catch {
            return false;
          }
        })
      )
        continue; // a spinner
      const quarter = !t.d3 && Math.abs(t.skew) <= 0.5 && Math.abs(Math.abs(t.ang) % 90) < 0.5;
      const how =
        t.d3 ? "turned in 3D"
        : Math.abs(t.skew) > 0.5 ? `skewed ${t.skew.toFixed(1)}°`
        : `rotated ${t.ang.toFixed(1)}°`;
      add(out, "tilt", quarter ? "WARN" : "FAIL", el, how, [r]);
    }
    for (const [b, rs] of bent)
      if (rs.length >= 3)
        add(
          out,
          "tilt",
          "FAIL",
          b,
          `${rs.length} letters or words of this text are turned one by one (text set on a curve or a slant)`,
          rs.slice(0, 12),
        );
    // text set on a curve as an SVG textPath (a heading on an arch, a rotating badge), outside the nav and drawn mocks
    for (const [el, r] of view) {
      if (
        el.tagName.toLowerCase() !== "svg"
        || seen.curve.has(el)
        || el.closest("[data-ui], .ui[class*=ui-], [data-fx], [data-fx-mounted]")
        || inFixed(el)
        || inChrome(el)
      )
        continue;
      const t = [...el.querySelectorAll("textPath")]
        .map(x =>
          String(x.textContent || "")
            .replace(/\s+/g, " ")
            .trim(),
        )
        .find(x => x.replace(/\s/g, "").length >= 6);
      if (!t) continue;
      seen.curve.add(el);
      add(out, "tilt", "FAIL", el, `"${t.slice(0, 40)}" is set on a curve (an SVG textPath)`, [r]);
    }
  }
  // a heading whose lines start at different left edges and are not centred: a headline broken across columns
  function checkHeadingLines(view, first, out, vw) {
    for (const [el, r] of view) {
      if (!el.matches("h1, h2, h3") || !first(seen.hlines, el, r) || inDrawn(el) || inFixed(el)) continue;
      // a picture set in the line (the editorial hero's pills, .ly-pic) is part of the line it starts
      const pics = [...el.querySelectorAll("img, picture, svg, video, .ly-pic")]
        .filter(m => !(m.parentElement && m.parentElement.closest("svg, picture, .ly-pic")))
        .map(m => m.getBoundingClientRect())
        .filter(q => q.width >= 4 && q.height >= 4);
      const rs = [...deepLines(el), ...pics].sort((a, b) => a.top - b.top),
        ls = [];
      for (const q of rs) {
        const L = ls.find(x => Math.abs(x.top - q.top) < 0.5 * Math.min(x.height, q.height));
        if (L) {
          L.left = Math.min(L.left, q.left);
          L.right = Math.max(L.right, q.right);
        } else ls.push({ left: q.left, right: q.right, top: q.top, height: q.height, width: 0 });
      }
      if (ls.length < 2) continue;
      for (const L of ls) L.width = L.right - L.left;
      const sp = k => Math.max(...ls.map(k)) - Math.min(...ls.map(k));
      if (sp(L => L.left) > 48 && sp(L => L.right) > 48 && sp(L => (L.left + L.right) / 2) > 24)
        add(
          out,
          "stagger",
          "FAIL",
          el,
          `the ${ls.length} lines of this heading start at ${ls.map(L => Math.round(L.left)).join(", ")}px: a headline broken across columns, read in a zigzag`,
          ls,
        );
    }
  }

  function beneath(P, B, vb, vp) {
    if (P.contains(B)) return true;
    const x = (Math.max(vb.left, vp.left) + Math.min(vb.right, vp.right)) / 2,
      y = (Math.max(vb.top, vp.top) + Math.min(vb.bottom, vp.bottom)) / 2;
    if (x >= 0 && x < innerWidth && y >= 0 && y < innerHeight) {
      const list = document.elementsFromPoint(x, y);
      const ib = list.findIndex(e => e === B || B.contains(e)),
        ip = list.indexOf(P);
      if (ib >= 0 && ip >= 0) return ip > ib;
    }
    return !!(P.compareDocumentPosition(B) & Node.DOCUMENT_POSITION_FOLLOWING);
  }
  function checkSpill(view, first, out, vw) {
    const boxes = [],
      panels = [];
    for (const [el, r] of view) {
      if (inFixed(el)) continue;
      const k = surface(el);
      if (!k) continue;
      const v = clipRect(el, r);
      if (v.width < 2 || v.height < 2) continue;
      const it = { el, r, v, k, area: v.width * v.height, st: stageOf(el) };
      panels.push(it);
      if (r.width >= 60 && r.height >= 40) boxes.push(it);
    }
    const hits = [];
    const secs = new Set(sectionsList());
    for (const B of boxes) {
      if (!first(seen.spill, B.el, B.r)) continue;
      if (secs.has(B.el)) continue; // sections that overlap are told under section-gaps
      if ((B.v.left < -2 || B.v.right > vw + 2) && B.v.right > 0 && B.v.left < vw && !inScroller(B.el)) {
        hits.push({
          B,
          P: null,
          side: B.v.left < -2 ? "left" : "right",
          by: Math.round(Math.max(-B.v.left, B.v.right - vw)),
        });
      }
      for (const P of panels) {
        if (P.el === B.el || B.el.contains(P.el) || P.k === "shadow") continue;
        // an effect's canvas laid in its host (absolute, behind the content) is the host's ground: the host is the panel
        if (P.el.tagName === "CANVAS" && /absolute|fixed/.test(CS(P.el).position)) continue;
        if (P.st !== B.st && !(P.st && P.st.contains(B.el))) continue; // a held stage slides over what is outside it
        // a popover a drawn mock places over its own page (a note hanging past the page edge) is drawn so on purpose
        if (/absolute|fixed/.test(CS(B.el).position)) {
          const m = B.el.parentElement && B.el.parentElement.closest('[data-ui], .ui[class*=ui-], [role="img"]');
          if (m && m.contains(P.el)) continue;
        }
        if (P.area < 0.3 * B.area) continue;
        const ix = Math.max(0, Math.min(B.v.right, P.v.right) - Math.max(B.v.left, P.v.left));
        const iy = Math.max(0, Math.min(B.v.bottom, P.v.bottom) - Math.max(B.v.top, P.v.top));
        if (ix < 1 || iy < 1) continue;
        // it sits on P: it starts inside P, or most of it lies on P
        const starts =
          B.v.top >= P.v.top - 2 && B.v.left >= P.v.left - 2 && B.v.top < P.v.bottom - 4 && B.v.left < P.v.right - 4;
        if ((!starts || ix * iy < 0.15 * B.area) && ix * iy < 0.5 * B.area) {
          // straddles: a photograph or a card laid across a card's edge, part on it and part off (a picture hung off
          // the corner of the card it belongs to); a drawn mock's own pieces and a section's ground are not told
          const card =
            (P.k === "fill" || P.k === "border") && P.r.width < vw * 0.9 && !secs.has(P.el) && !P.el.contains(B.el);
          const pic = B.k === "media" || B.k === "picture" || B.k === "fill" || B.k === "border";
          if (
            card
            && pic
            && ix >= 24
            && iy >= 24
            && B.r.width >= 120
            && B.r.height >= 80
            && !inDrawn(B.el)
            && !inDrawn(P.el)
            && !B.el.closest(".at-over, .at-over-l")
            && beneath(P.el, B.el, B.v, P.v)
          ) {
            const outs = {
              top: P.v.top - B.v.top,
              bottom: B.v.bottom - P.v.bottom,
              left: P.v.left - B.v.left,
              right: B.v.right - P.v.right,
            };
            const off = Object.entries(outs)
              .filter(([, d]) => d >= 12)
              .map(([s, d]) => `${Math.round(d)}px past its ${s}`);
            if (off.length)
              hits.push({
                B,
                P,
                side: "straddle",
                by: Math.round(Math.max(...Object.values(outs))),
                straddle: `lies across the edge of the card ${sel(P.el).split(" > ").slice(-2).join(" > ")}: ${Math.round(ix)}x${Math.round(iy)}px on it, ${off.join(", ")}`,
              });
          }
          continue;
        }
        const outs = {
          top: P.v.top - B.v.top,
          bottom: B.v.bottom - P.v.bottom,
          left: P.v.left - B.v.left,
          right: B.v.right - P.v.right,
        };
        let side = null,
          by = 0;
        for (const [s, d] of Object.entries(outs))
          if (d > by) {
            by = d;
            side = s;
          }
        if (by < 12) continue;
        if (!beneath(P.el, B.el, B.v, P.v)) continue;
        hits.push({ B, P, side, by: Math.round(by) });
      }
    }
    for (const h of hits) {
      if (hits.some(q => q !== h && q.P === h.P && q.B.el !== h.B.el && q.B.el.contains(h.B.el))) continue; // the outer box says it
      if (
        h.P
        && hits.some(
          q => q !== h && q.P && q.B === h.B && (q.by > h.by || (q.by === h.by && hits.indexOf(q) < hits.indexOf(h))),
        )
      )
        continue; // one panel per box
      // running off a band at the screen's edge is running off the screen: told once, as that
      if (
        h.P
        && hits.some(q => !q.P && q.B === h.B && q.side === h.side)
        && ((h.side === "right" && h.P.v.right >= vw - 2) || (h.side === "left" && h.P.v.left <= 2))
      )
        continue;
      if (h.straddle) {
        if (!hits.some(q => q !== h && q.B === h.B && !q.straddle))
          add(out, "spill", "FAIL", h.B.el, h.straddle, [h.B.v, Object.assign({}, h.P.v, { ref: true })]);
      } else if (h.P) {
        add(
          out,
          "spill",
          "FAIL",
          h.B.el,
          `runs ${h.by}px past the ${h.side} edge of the panel it sits on (${sel(h.P.el)})`,
          [h.B.v, Object.assign({}, h.P.v, { ref: true })],
        );
        spilled.push(h.B.el);
      } else add(out, "off-viewport", "FAIL", h.B.el, `runs ${h.by}px off the ${h.side} side of the screen`, [h.B.v]);
    }
  }

  // the box whose fill the text sits on, when that fill shows as a box somewhere (and has no outline or shadow of its own)
  function fillOwner(el) {
    for (let a = el; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      const c = CS(a);
      const bg = rgba(c.backgroundColor);
      if (c.backgroundImage && c.backgroundImage !== "none") return null;
      if (bg.a < 0.5) continue;
      return surface(a) === "fill" && !bordered(c) && !shadowed(c) ? a : null;
    }
    return null;
  }
  function checkCut(view, first, out, vw, vh) {
    const lost = new Map();
    try {
      cutLines(view, first, out, vw, vh, lost);
    } finally {
      for (const [box, ls] of lost) {
        edgeless.add(box);
        // a card running off its panel leaves its text floating past the panel: that is the spill, told once with it
        const sp = spilled.find(s => s === box || s.contains(box) || box.contains(s));
        add(
          out,
          "cut-text",
          "FAIL",
          box,
          `${ls.length} line${ls.length > 1 ? "s" : ""} of its text sit where the box has no visible edge (its fill matches what is behind it there)`,
          [...ls.slice(0, 12), Object.assign(R(box.getBoundingClientRect()), { ref: true })],
          sp ? { merge: idOf(sp), lines: ls.length } : null,
        );
      }
    }
  }
  function cutLines(view, first, out, vw, vh, lost) {
    for (const [el, r] of view) {
      if (!ownText(el) || !first(seen.cut, el, r)) continue;
      if (el.matches("input, textarea, select, option") || inMarquee(el)) continue; // a running line is told under marquee
      const c = CS(el);
      const fs = parseFloat(c.fontSize) || 16;
      const all = lines(el);
      const ls = all.filter(l => l.bottom > 0 && l.top < vh);
      if (!ls.length) continue;
      const tolY = Math.max(2, 0.18 * fs),
        tolX = Math.max(2, 0.4 * fs);
      const cl = clips(el);
      let worst = null;
      let hidden = 0,
        visible = 0,
        hider = null;
      const note = (by, how, line, by_) => {
        if (!worst || by > worst.by) worst = { by: Math.round(by), how, line, by_ };
      };
      for (const L of ls) {
        let gone = false;
        for (const k of cl) {
          const ix = Math.min(L.right, k.right) - Math.max(L.left, k.left),
            iy = Math.min(L.bottom, k.bottom) - Math.max(L.top, k.top);
          if ((k.x && ix <= 1) || (k.y && iy <= 1)) {
            gone = true;
            hider = k.a;
            break;
          }
          if (k.y && !k.sy) {
            const t = k.top - L.top,
              b = L.bottom - k.bottom;
            if (t > tolY) note(t, "top", L, k.a);
            if (b > tolY) note(b, "bottom", L, k.a);
          }
          if (k.x && !k.sx) {
            const lf = k.left - L.left,
              rt = L.right - k.right;
            if (lf > tolX) note(lf, "left", L, k.a);
            if (rt > tolX) note(rt, "right", L, k.a);
          }
        }
        if (gone) {
          hidden++;
          continue;
        }
        visible++;
        if (!inScroller(el)) {
          if (L.left < -1 && L.right > 0) note(-L.left, "screen-left", L, null);
          if (L.right > vw + 1 && L.left < vw) note(L.right - vw, "screen-right", L, null);
        }
      }
      if (!visible) continue; // hidden on purpose (a rolling label's spare copy, a closed panel)
      if (worst) {
        const where =
          worst.how.startsWith("screen") ?
            `cut ${worst.by}px by the ${worst.how === "screen-left" ? "left" : "right"} edge of the screen`
          : `cut ${worst.by}px at the ${worst.how} by the overflow of ${sel(worst.by_)}`;
        // a drawn fragment run out through its panel's edge (a bleed) is cut there on purpose: a WARN, so the cut
        // falls between lines or under the edge's fade
        const mk = el.closest('[data-ui], .ui[class*=ui-], [role="img"]'),
          bleed = !!(mk && worst.by_ && worst.by_ !== mk && worst.by_.contains(mk));
        add(
          out,
          "cut-text",
          bleed ? "WARN" : "FAIL",
          el,
          bleed ? `${where}: a fragment run out through its panel's edge` : where,
          [worst.line, ...(worst.by_ ? [Object.assign(R(worst.by_.getBoundingClientRect()), { ref: true })] : [])],
        );
        continue;
      }
      if (hidden && visible) {
        // a drawn mock cropped by its frame (a bleed: the page runs on past the panel's edge) hides whole lines on
        // purpose; a line sliced through is told above
        const mock = el.closest('[data-ui], .ui[class*=ui-], [role="img"]');
        if (!(mock && hider && hider.contains(mock) && hider !== mock))
          add(
            out,
            "cut-text",
            "FAIL",
            el,
            `${hidden} of ${hidden + visible} lines hidden by the overflow of ${sel(hider)}`,
            [r],
          );
        continue;
      }
      // text running past its own box (a fill or an outline it does not fit in)
      let box = null;
      for (let a = el; a && a !== document.body; a = a.parentElement) {
        const k = quickKind(a);
        if (k && k !== "media") {
          box = a;
          break;
        }
      }
      if (box && c.textOverflow !== "ellipsis") {
        // shortened text is told as such below
        const b = box.getBoundingClientRect();
        if (b.width < vw * 0.98) {
          for (const L of ls) {
            const o = Math.max(
              b.top - L.top - tolY,
              L.bottom - b.bottom - tolY,
              b.left - L.left - tolX,
              L.right - b.right - tolX,
            );
            if (o > 0) {
              add(out, "cut-text", "FAIL", el, `runs past the edge of its box ${sel(box)}`, [
                L,
                Object.assign(R(b), { ref: true }),
              ]);
              break;
            }
          }
        }
      }
      if (c.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1)
        add(out, "cut-text", "WARN", el, "shortened with an ellipsis", [r]);
      else if (c.webkitLineClamp && c.webkitLineClamp !== "none" && el.scrollHeight > el.clientHeight + 2)
        add(out, "cut-text", "WARN", el, `clamped to ${c.webkitLineClamp} lines`, [r]);
      // text in a part of its box that cannot be seen: the panel behind the box ends, and the box's fill matches the page
      const owner = fillOwner(el);
      if (owner && !edgeless.has(owner)) {
        const bg = rgba(CS(owner).backgroundColor);
        for (const L of ls) {
          if (visibleAt(owner, bg, (L.left + L.right) / 2, (L.top + L.bottom) / 2) === false) {
            if (!lost.has(owner)) lost.set(owner, []);
            lost.get(owner).push(L);
          }
        }
      }
      // a line sitting across the edge of a panel behind it (a mock's own parts are drawn as they are)
      if (el.closest('[data-ui], .ui[class*=ui-], [role="img"]')) continue;
      for (const L of ls.slice(0, 3)) {
        const x = (L.left + L.right) / 2;
        if (x < 0 || x >= vw || L.top < 1 || L.bottom > vh - 1 || L.height < 8) continue;
        const a = under(x, L.top + 1, el),
          b = under(x, L.bottom - 1, el);
        if (a.e !== b.e && (a.kind !== b.kind || (a.col && b.col && cdist(a.col, b.col) >= 16))) {
          add(out, "cut-text", "WARN", el, "sits across the edge of a panel behind it", [L]);
          break;
        }
      }
    }
  }

  // a band runs (nearly) edge to edge; anything narrower with a fill or an outline is a box, and what sits inside a box,
  // or inside a drawn mock (data-ui, role=img, aria-hidden), keeps to the box's own edges, not the page's
  const isBand = (r, vw) => r.left <= Math.max(12, vw * 0.02) && r.right >= vw - Math.max(12, vw * 0.02);
  function onGround(el, vw) {
    if (el.parentElement && el.parentElement.closest('[data-ui], .ui[class*=ui-], [role="img"], [aria-hidden="true"]'))
      return false;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const k = surface(a);
      if (k && k !== "media" && !isBand(a.getBoundingClientRect(), vw)) return false;
      // an effect ground or a visual panel (a map, a gradient), or a box drawn with a faint hairline, places what is
      // on it by its own edges
      if (
        (a.matches("[data-fx], [data-fx-mounted], .panel, .stage, .frame") || faintBox(CS(a)))
        && !isBand(a.getBoundingClientRect(), vw)
      )
        return false;
    }
    // a box laid over a picture or an effect that is not its ancestor (a card on a map layer) keeps to that picture
    const r = el.getBoundingClientRect();
    const x = r.left + Math.min(6, r.width / 2),
      y = r.top + Math.min(6, r.height / 2);
    if (x >= 0 && y >= 0 && x < innerWidth && y < innerHeight) {
      for (const e of document.elementsFromPoint(x, y)) {
        if (e === el || el.contains(e) || e.contains(el)) continue;
        const q = e.getBoundingClientRect();
        if (
          (e.tagName === "CANVAS" || e.matches("[data-fx], [data-fx-mounted]") || MEDIA.has(e.tagName))
          && !isBand(q, vw)
          && q.width * q.height > 4 * r.width * r.height
        )
          return false;
        if (rgba(CS(e).backgroundColor).a >= 0.5) break; // an opaque layer: what lies under it does not show
      }
    }
    return true;
  }
  // a box an endless animation moves (a loop, a drifting card): where it stands now is not where it is set
  let loopSet = null,
    loopAt = -1;
  function loopMoved(el) {
    if (loopAt !== csC) {
      loopAt = csC;
      loopSet = new Set();
      try {
        for (const an of document.getAnimations ? document.getAnimations() : []) {
          const t = an.effect && an.effect.target;
          if (!t || an.playState !== "running") continue;
          const tm = an.effect.getComputedTiming();
          if (tm.iterations !== Infinity) continue;
          const kf = JSON.stringify(an.effect.getKeyframes ? an.effect.getKeyframes() : []);
          if (/transform|translate|left|margin|inset|offset/.test(kf)) loopSet.add(t);
        }
      } catch (e) {}
    }
    if (!loopSet.size) return false;
    for (let a = el; a && a !== document.body; a = a.parentElement) if (loopSet.has(a)) return true;
    return false;
  }
  function gridCands(view, first, out, vw) {
    const blocks = new Map();
    for (const [el, r] of view) {
      if (inFixed(el) || loopMoved(el)) continue;
      // a table is judged by its outer box, not by its cells and headers
      const tbl = el.parentElement && el.parentElement.closest('table, [role="table"]');
      if (tbl) continue;
      if (el.matches('table, [role="table"]')) {
        if (
          !first(seen.grid, el, r)
          || r.left <= 2
          || isBand(r, vw)
          || !onGround(el, vw)
          || inScroller(el)
          || inCentred(el, vw)
        )
          continue;
        const v = clipRect(el, r);
        if (v.width < 8 || v.height < 8) continue;
        out.grid.push({
          id: idOf(el),
          sel: sel(el),
          text: label(el),
          left: Math.round(v.left * 2) / 2,
          kind: "table",
          fs: 0,
          sec: secIndex(el),
          rect: R(v),
        });
        continue;
      }
      const k = surface(el);
      if (k) {
        if (!first(seen.grid, el, r)) continue;
        if (isBand(r, vw) || r.left <= 2) continue;
        if (k === "shadow" && r.height < 24) continue;
        const pe = el.parentElement;
        if (/^inline/.test(CS(el).display) && pe && (ownText(pe) || /^inline/.test(CS(pe).display))) continue; // a mark inside running text
        if (!onGround(el, vw) || inScroller(el) || pinnedRight(el)) continue;
        if (Math.abs((r.left + r.right) / 2 - vw / 2) <= 3 && r.width < vw * 0.85) continue; // centred
        if (inCentred(el, vw)) continue; // a part of a centred block (the buttons under a centred heading)
        const v = clipRect(el, r);
        if (v.width < 8 || v.height < 8) continue;
        out.grid.push({
          id: idOf(el),
          sel: sel(el),
          text: label(el),
          left: Math.round(v.left * 2) / 2,
          right: Math.round(v.right * 2) / 2,
          kind: k,
          fs: 0,
          sec: secIndex(el),
          rect: R(v),
        });
        continue;
      }
      if (!ownText(el)) continue;
      let blk = el;
      // (an inline-flex or inline-block chip is a box of its own: its words line up inside it)
      while (blk && blk !== document.body && /^(inline|contents)$/.test(CS(blk).display) && !surface(blk))
        blk = blk.parentElement;
      if (!blk || blk === document.body || surface(blk)) continue;
      if (!blocks.has(blk)) blocks.set(blk, []);
      for (const L of lines(el)) blocks.get(blk).push(L);
    }
    for (const [blk, ls] of blocks) {
      const r = blk.getBoundingClientRect();
      if (!ls.length || !first(seen.grid, blk, r)) continue;
      if (/center|right|end/.test(CS(blk).textAlign)) continue;
      if (!onGround(blk, vw) || inScroller(blk) || inFixed(blk) || inCentred(blk, vw) || pinnedRight(blk)) continue;
      // a chip or tag drawn with a faint outline (or a marker before its words) lines up by its box, not its words
      const bc = CS(blk),
        faint = faintBox(bc);
      const mark = (() => {
        const p = getComputedStyle(blk, "::before");
        return (
          p.content !== "none"
          && p.content !== "normal"
          && (parseFloat(p.width) || 0) > 0
          && /inline-flex|flex/.test(bc.display)
        );
      })();
      // (a small mark set before the words, a swatch, a dot or an icon, starts the line: the words follow it)
      const tl = Math.min(...ls.map(l => l.left));
      const lead =
        faint || mark ? null : (
          [...blk.querySelectorAll("svg, img, span, i")].find(m => {
            if ((m.textContent || "").trim()) return false;
            const q = m.getBoundingClientRect();
            return (
              q.width >= 4
              && q.width <= 40
              && q.height >= 4
              && q.height <= 40
              && q.left < tl - 2
              && q.left >= r.left - 1
              && shown(m, q)
            );
          })
        );
      const left =
        faint || mark ? r.left
        : lead ? Math.min(tl, lead.getBoundingClientRect().left)
        : tl;
      if (left <= 2) continue;
      const u =
        faint || mark ?
          R(r)
        : {
            left,
            top: Math.min(...ls.map(l => l.top)),
            width: Math.max(...ls.map(l => l.right)) - left,
            height: Math.max(...ls.map(l => l.bottom)) - Math.min(...ls.map(l => l.top)),
          };
      out.grid.push({
        id: idOf(blk),
        sel: sel(blk),
        text: label(blk),
        left: Math.round(left * 2) / 2,
        kind: "text",
        fs: parseFloat(CS(blk).fontSize) || 16,
        sec: secIndex(blk),
        rect: R(u),
      });
    }
  }

  // where a row's content starts: its words, pictures and small marks (a fill across the whole row, like a stripe, is not)
  function contentLeft(k) {
    let min = Infinity;
    const kw = k.getBoundingClientRect().width;
    const nodes = [k, ...k.querySelectorAll("*")].slice(0, 400);
    for (const e of nodes) {
      if (SKIP.has(e.tagName) || isSvgPart(e)) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || !shown(e, r)) continue;
      const k2 = quickKind(e);
      if (
        k2
        && r.width >= 6
        && r.height >= 6
        && r.width < 0.8 * kw
        && (k2 === "media" || (r.width <= 64 && r.height <= 64))
      )
        min = Math.min(min, r.left); // pictures and marks, not cell fills
      else if (
        (e.tagName === "IMG" || e.tagName.toLowerCase() === "svg")
        && r.width >= 6
        && r.height >= 6
        && r.width < 0.8 * kw
      )
        min = Math.min(min, r.left); // a small icon starts its row too
      if (ownText(e)) for (const l of lines(e)) min = Math.min(min, l.left);
    }
    return min;
  }
  function checkStagger(view, first, out, vw) {
    for (const [box, r] of view) {
      if (box.children.length < 3 || !first(seen.stagger, box, r)) continue;
      if (inScroller(box)) continue;
      // a drawn UI mock lays out its own rows: a chat's bubbles sit left and right, a diff's lines are indented
      if (inDrawn(box) || box.closest(STAGGER_DRAWN)) continue;
      // rows are separate boxes: inline runs that wrap with the text and full-width bands (sections) are not rows
      const kids = [...box.children].filter(k => {
        const q = k.getBoundingClientRect();
        return (
          q.width >= 8
          && q.height >= 8
          && shown(k, q)
          && !SKIP.has(k.tagName)
          && !/^inline|^contents/.test(CS(k).display)
          && !isBand(q, vw)
        );
      });
      if (kids.length < 3) continue;
      const sig = k => k.tagName + "." + (k.classList[0] || "");
      const counts = new Map();
      for (const k of kids) counts.set(sig(k), (counts.get(sig(k)) || 0) + 1);
      let best = null,
        n = 0;
      for (const [s, c] of counts)
        if (c > n) {
          best = s;
          n = c;
        }
      if (n < 3) continue;
      const rows = kids
        .filter(k => sig(k) === best)
        .map(k => ({ k, q: k.getBoundingClientRect() }))
        .sort((a, b) => a.q.top - b.q.top);
      // the page's own sections (a centred hero beside left-aligned sections) are not rows of a list
      const tops = new Set(sectionsList());
      if (rows.some(({ k }) => tops.has(k) || /^(SECTION|FOOTER|HEADER|MAIN)$/.test(k.tagName))) continue;
      let stacked = true;
      for (let i = 1; i < rows.length; i++)
        if (rows[i].q.top < rows[i - 1].q.top + 0.5 * Math.min(rows[i].q.height, rows[i - 1].q.height)) {
          stacked = false;
          break;
        }
      if (!stacked) continue; // a row or a grid, not a list
      const hs = rows.map(({ q }) => q.height);
      if (Math.max(...hs) > 3 * Math.min(...hs)) continue; // parts of different kinds (a mock's panels), not rows of one list
      if (rows.every(({ k }) => /center/.test(CS(k).textAlign))) continue;
      const mids = rows.map(({ q }) => (q.left + q.right) / 2);
      if (Math.max(...mids) - Math.min(...mids) <= 3 && rows.some(({ q }) => Math.abs(q.width - rows[0].q.width) > 6))
        continue; // a centred stack
      const lefts = rows.map(({ k }) => contentLeft(k));
      if (lefts.some(v => !isFinite(v))) continue;
      const groups = [];
      for (const v of lefts) {
        const g = groups.find(x => Math.abs(x.v - v) <= 3);
        if (g) g.n++;
        else groups.push({ v, n: 1 });
      }
      const spread = Math.max(...lefts) - Math.min(...lefts);
      if (groups.length < 2 || spread < 4) continue;
      const minority = Math.min(...groups.map(g => g.n));
      const sev =
        spread < 6 ? "WARN"
        : groups.length >= 3 || minority >= 2 ? "FAIL"
        : "WARN";
      const offs = lefts.map(v => Math.round(v - Math.min(...lefts)));
      add(
        out,
        "stagger",
        sev,
        box,
        `${rows.length} rows start at ${groups.length} different left offsets (+${offs.join(", +")}px)`,
        rows.map(({ q }) => q),
      );
    }
  }

  // a grid row whose boxes hug one side and leave more than 40% of the grid empty (a split visual left at half
  // width on a tablet), and a last card stretched alone across a row that its siblings share
  function checkRows(view, first, out, vw) {
    for (const [g, r] of view) {
      if (r.width < vw * 0.5) continue;
      const c = CS(g);
      if (!/grid/.test(c.display)) continue;
      if ((c.gridTemplateColumns || "").split(/\s+/).filter(t => /px$/.test(t)).length < 2) continue;
      if (!first(seen.rows, g, r)) continue;
      if (
        inFixed(g)
        || inScroller(g)
        || (g.parentElement
          && g.parentElement.closest('[data-ui], .ui[class*=ui-], [role="img"], [aria-hidden="true"]'))
      )
        continue;
      const cl = r.left + (parseFloat(c.paddingLeft) || 0) + (parseFloat(c.borderLeftWidth) || 0);
      const cr = r.right - (parseFloat(c.paddingRight) || 0) - (parseFloat(c.borderRightWidth) || 0);
      const cw = cr - cl;
      if (cw < 200) continue;
      const kids = [...g.children]
        .map(k => ({ k, q: k.getBoundingClientRect() }))
        .filter(
          ({ k, q }) =>
            q.width >= 8
            && q.height >= 8
            && !SKIP.has(k.tagName)
            && shown(k, q)
            && !/absolute|fixed/.test(CS(k).position),
        );
      if (kids.length < 2) continue;
      // one row: boxes that share their height (a short copy block beside a tall picture is on the picture's row,
      // even when it starts lower)
      const rows = [];
      for (const it of kids.sort((a, b) => a.q.top - b.q.top || a.q.left - b.q.left)) {
        const row = rows.find(
          w =>
            Math.abs(w.top - it.q.top) <= 4
            || Math.min(w.bottom, it.q.bottom) - Math.max(w.top, it.q.top)
              >= 0.5 * Math.min(w.bottom - w.top, it.q.height),
        );
        if (row) {
          row.items.push(it);
          row.bottom = Math.max(row.bottom, it.q.bottom);
        } else rows.push({ top: it.q.top, bottom: it.q.bottom, items: [it] });
      }
      for (const row of rows) {
        if (!row.items.some(({ k }) => surface(k))) continue; // only rows with a card, panel or picture
        const left = Math.min(...row.items.map(({ q }) => q.left)),
          right = Math.max(...row.items.map(({ q }) => q.right));
        const gl = Math.max(0, left - cl),
          gr = Math.max(0, cr - right),
          empty = (gl + gr) / cw;
        if (empty <= 0.4 || Math.abs(gl - gr) <= 0.15 * cw) continue; // full enough, or centred on purpose
        const bottom = Math.max(...row.items.map(({ q }) => q.bottom));
        const k0 = row.items.find(({ k }) => surface(k)).k;
        add(
          out,
          "row-gap",
          "FAIL",
          k0,
          `fills ${Math.round((1 - empty) * 100)}% of its grid row and leaves ${Math.round(empty * 100)}% of it empty on the ${gr > gl ? "right" : "left"}`,
          [
            ...row.items.map(({ q }) => q),
            Object.assign({ left: cl, top: row.top, width: cw, height: bottom - row.top }, { ref: true }),
          ],
        );
      }
      if (rows.length >= 2) {
        const last = rows[rows.length - 1],
          prev = rows[rows.length - 2];
        const one = last.items[0],
          kind = k => k.tagName + "." + (k.classList[0] || "");
        const sibs = prev.items.filter(({ k }) => kind(k) === kind(one.k));
        if (
          last.items.length === 1
          && sibs.length >= 2
          && surface(one.k)
          && one.q.width > 1.4 * Math.max(...sibs.map(({ q }) => q.width))
        ) {
          add(
            out,
            "row-gap",
            "FAIL",
            one.k,
            `stretched alone across the last row (${Math.round(one.q.width)}px) while the ${sibs.length} like it above are ${Math.round(Math.max(...sibs.map(({ q }) => q.width)))}px`,
            [one.q, ...sibs.map(({ q }) => Object.assign({}, R(q), { ref: true }))],
          );
        }
      }
    }
  }

  function collectButtons(view, out, vw, vh) {
    const looks = [];
    for (const [el, r] of view) {
      if (r.top < 0 || r.bottom > vh || r.left < -2 || r.right > vw + 2) continue;
      const real = el.matches(INTER);
      if (real) {
        if (el.parentElement && el.parentElement.closest(INTER)) continue;
        // toggles and tabs (a segmented switch, a stepper) are their own component, not a button style
        if (
          el.matches(
            '[aria-pressed], [aria-selected], [role="tab"], [role="radio"], [role="switch"], [role="option"], [role="menuitemradio"]',
          )
          || el.closest('[role="tablist"], [role="radiogroup"]')
        )
          continue;
        // a disclosure row (a question that opens its answer) is a row, not a button
        if (
          (el.matches("summary") || el.hasAttribute("aria-expanded"))
          && el.parentElement
          && r.width >= 0.6 * el.parentElement.getBoundingClientRect().width
        )
          continue;
        // the brand's link home
        const href = el.getAttribute("href");
        if (
          href != null
          && /^(#|#top|\/|\.\/|index\.html)?$/.test(href.trim())
          && el.closest("header, nav, [data-nav]")
        )
          continue;
      } else {
        if (!LOOK_TAGS.has(el.tagName) || el.closest(INTER) || el.querySelector(INTER)) continue;
        if (el.parentElement && ownText(el.parentElement)) continue; // a highlight inside running text
        // a span or div only looks like a button inside a drawn mock (a fragment's own buttons); on the page it is a
        // label, a chip or a data bar
        if (!el.closest('[data-ui], .ui[class*=ui-], [role="img"]')) continue;
      }
      // a bar or a row: a label with its value set at the far end ("Bed ... 2 m"), not a button
      {
        const ls = deepLines(el).sort((a, b) => a.left - b.left);
        const fs = parseFloat(CS(el).fontSize) || 16;
        let gapMax = 0;
        for (let i = 1; i < ls.length; i++)
          if (Math.abs(ls[i].top - ls[i - 1].top) < ls[i].height * 0.6)
            gapMax = Math.max(gapMax, ls[i].left - ls[i - 1].right);
        if (gapMax > Math.max(32, 2 * fs)) continue;
      }
      if (looks.some(a => a.contains(el))) continue;
      // a real <button> inside a drawn mock (a UI fragment) is a part of the mock: it counts on its screen, not in the
      // page's own button family
      const mock = !!(
        el.parentElement && el.parentElement.closest('[data-ui], .ui[class*=ui-], [role="img"], [aria-hidden="true"]')
      );
      const L = buttonLook(el, real && !mock);
      if (!L) continue;
      if (!/\p{L}/u.test(L.text)) continue; // a number (a date cell, a page number) is not a button label
      if (playCtl(el)) continue; // a film's play control is the film's own, not one of the page's button styles
      if (!real) {
        if (L.h < 30 || L.fs < 12 || L.text.length > 28) continue;
        // a button hugs its label; a selected row stretched across a list is not one
        const ls = deepLines(el);
        if (!ls.length) continue;
        const tw = Math.max(...ls.map(l => l.right)) - Math.min(...ls.map(l => l.left));
        const c = CS(el);
        if (r.width > tw + (parseFloat(c.paddingLeft) || 0) + (parseFloat(c.paddingRight) || 0) + 24) continue;
      }
      looks.push(el);
      const href =
        real && el.getAttribute("href") != null ?
          (() => {
            try {
              return new URL(el.getAttribute("href"), location.href).href;
            } catch {
              return null;
            }
          })()
        : null;
      out.buttons.push(
        Object.assign(
          {
            id: idOf(el),
            sel: sel(el),
            rect: R(r),
            fixed: inFixed(el),
            href,
            nav: real && !!(inFixed(el) || inChrome(el)),
            faint: faintBox(CS(el)),
          },
          L,
          { mock: mock || !real },
        ),
      );
      if (real && !mock) buttonExtras(el, r, out);
    }
  }

  function contrastCands(view, first, out, vw, vh) {
    for (const [el, r] of view) {
      if (!ownText(el) || !first(seen.contrast, el, r)) continue;
      const c = CS(el);
      const fs = parseFloat(c.fontSize) || 16;
      if (fs < 9) continue;
      const col = rgba(c.color);
      if (col.a < 0.05) continue;
      if (c.webkitTextFillColor && rgba(c.webkitTextFillColor).a < 0.05) continue; // gradient-filled type
      const ls = lines(el)
        .filter(l => l.top >= 0 && l.bottom <= vh && l.left >= 0 && l.right <= vw && l.width >= 4 && l.height >= 6)
        .slice(0, 4);
      if (!ls.length) continue;
      let kind = null;
      for (const L of ls) {
        const u = under((L.left + L.right) / 2, (L.top + L.bottom) / 2, el);
        if (u.kind !== "solid") {
          kind = u.kind;
          break;
        }
      }
      if (!kind) continue;
      const wt = parseInt(c.fontWeight, 10) || 400;
      out.contrast.push({
        id: idOf(el),
        sel: sel(el),
        text: label(el),
        color: col,
        fs,
        large: fs >= 24 || (fs >= 18.66 && wt >= 700),
        kind,
        lines: ls.map(R),
      });
    }
  }

  function sectionData(out, vw, vh) {
    const S = sectionsList();
    const ext = S.map(s => extent(s, vw));
    out.sections = S.map((s, i) => ({
      i,
      sel: sel(s),
      top: ext[i] ? Math.round(ext[i].top) : null,
      bottom: ext[i] ? Math.round(ext[i].bottom) : null,
    }));
    // every adjacent pair, measured now (a pinned or held section moves against the page, so the caller keeps the
    // measure taken with both edges on screen, or else the one with the seam nearest the middle of the screen)
    for (let i = 0; i + 1 < S.length; i++) {
      const A = ext[i],
        B = ext[i + 1];
      if (!A || !B) continue;
      const gap = B.top - A.bottom;
      const on = A.bottom >= 0 && A.bottom <= vh && B.top >= 0 && B.top <= vh;
      let gA = null,
        gB = null;
      if (on && gap >= 6) {
        gA = groundAt(vw / 2, A.bottom + 2);
        gB = groundAt(vw / 2, B.top - 2);
      }
      const same = (p, q) => p === q || (/^#/.test(p || "") && /^#/.test(q || "") && cdist(rgba(p), rgba(q)) < 12);
      // at a change of ground: the space outside the band's edge against the space inside it (lopsided padding)
      let outer = null,
        inner = null;
      if (gA && gB && !same(gA, gB)) {
        const seam = S[i + 1].getBoundingClientRect().top,
          pg = hex(pageBg());
        if (
          seam > A.bottom + 2
          && seam < B.top - 2
          && same(groundAt(vw / 2, seam - 2), gA)
          && same(groundAt(vw / 2, seam + 2), gB)
        ) {
          const bandB = !same(gB, pg) && same(gA, pg),
            bandA = !same(gA, pg) && same(gB, pg);
          if (bandB) {
            outer = Math.round(seam - A.bottom);
            inner = Math.round(B.top - seam);
          } else if (bandA) {
            inner = Math.round(seam - A.bottom);
            outer = Math.round(B.top - seam);
          }
        }
      }
      out.pairs.push({
        i,
        a: sel(S[i]),
        b: sel(S[i + 1]),
        gap: Math.round(gap),
        top: Math.round(A.bottom),
        bottom: Math.round(B.top),
        on,
        off: Math.abs((A.bottom + B.top) / 2 - vh / 2),
        band: gA && gB ? !same(gA, gB) : false,
        gA,
        gB,
        outer,
        inner,
      });
    }
  }

  function navInfo(vw, vh) {
    const q = [
      ...document.querySelectorAll(
        'header, [role="banner"], nav, [data-nav], .nav, .navbar, .site-header, .header, .topbar',
      ),
    ];
    const cands = q.filter(e => {
      const r = e.getBoundingClientRect();
      return (
        r.width > vw * 0.35
        && r.height > 20
        && r.top < 150
        && r.bottom > 0
        && r.height < vh * 0.45
        && CS(e).visibility !== "hidden"
      );
    });
    if (!cands.length) return null;
    const outer = cands.filter(e => !cands.some(o => o !== e && o.contains(e)));
    outer.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    const H = outer[0];
    const hr = H.getBoundingClientRect();
    const items = [...H.querySelectorAll(INTER)].filter(e => {
      const r = e.getBoundingClientRect();
      return shown(e, r) && r.top < hr.top + 170 && r.bottom > 0 && r.right > 0 && r.left < vw;
    });
    if (!items.length) return null;
    // the bar holds most of the nav's links and actions (a segmented toggle in the header is not the bar)
    const TOGGLE = '[aria-pressed], [aria-selected], [role="tab"], [role="radio"], [role="switch"], [role="option"]';
    const navItems = items.filter(i => !i.matches(TOGGLE) && !i.closest('[role="tablist"], [role="radiogroup"]'));
    const bars = [H, ...H.querySelectorAll("*")].filter(e => {
      if (e.matches(INTER) || e.closest(INTER)) return false;
      const r = e.getBoundingClientRect();
      if (!shown(e, r)) return false;
      const k = surface(e);
      if (!k || k === "media" || r.height < 32 || r.height > 180 || r.width < vw * 0.3) return false;
      const n = navItems.filter(i => e.contains(i)).length;
      return n >= 1 && n >= navItems.length / 2;
    });
    bars.sort((a, b) => {
      const ra = a.getBoundingClientRect(),
        rb = b.getBoundingClientRect();
      return rb.width * rb.height - ra.width * ra.height;
    });
    const bar = bars[0] || null;
    const br = bar ? bar.getBoundingClientRect() : null;
    const it = e => ({ id: idOf(e), sel: sel(e), text: label(e), rect: R(e.getBoundingClientRect()) });
    const outside =
      br ?
        items
          .filter(e => {
            const r = e.getBoundingClientRect();
            return r.left < br.left - 2 || r.right > br.right + 2 || r.top < br.top - 2 || r.bottom > br.bottom + 2;
          })
          .map(it)
      : [];
    const links = items.filter(e => !buttonLook(e, true));
    const wraps = links
      .filter(e => {
        const ls = deepLines(e);
        if (ls.length < 2) return false;
        const tops = ls.map(l => l.top);
        return Math.max(...tops) - Math.min(...tops) > 0.6 * Math.min(...ls.map(l => l.height));
      })
      .map(it);
    // links of one list sitting on more than one row
    const byList = new Map();
    for (const e of links) {
      const li = e.closest("li");
      const key = li ? li.parentElement : e.parentElement;
      if (!byList.has(key)) byList.set(key, []);
      byList.get(key).push(e);
    }
    let rowsWrap = null;
    for (const [key, group] of byList) {
      if (group.length < 3) continue;
      const ys = [];
      for (const e of group) {
        const r = e.getBoundingClientRect();
        const y = r.top + r.height / 2;
        if (!ys.some(v => Math.abs(v - y) < Math.max(10, r.height * 0.5))) ys.push(y);
      }
      if (ys.length > 1) rowsWrap = { sel: sel(key), rows: ys.length, rect: R(key.getBoundingClientRect()) };
    }
    // where an item shows: a text link by its letters (its padding is not seen), a button or a logo by its box
    const inkRect = e => {
      const r = e.getBoundingClientRect(),
        c = CS(e);
      if (
        buttonLook(e, true)
        || rgba(c.backgroundColor).a >= 0.2
        || bordered(c)
        || (c.boxShadow && c.boxShadow !== "none")
      )
        return r; // its box shows
      const parts = deepLines(e).map(l => ({ left: l.left, right: l.right }));
      for (const m of e.querySelectorAll("svg, img, picture, canvas")) {
        const q = m.getBoundingClientRect();
        if (q.width >= 2 && shown(m, q)) parts.push({ left: q.left, right: q.right });
      }
      if (!parts.length) return r;
      const l = Math.min(...parts.map(p => p.left)),
        rr = Math.max(...parts.map(p => p.right));
      return { left: l, top: r.top, width: rr - l, height: r.height };
    };
    return {
      sel: sel(H),
      id: idOf(H),
      fixed: inFixed(H),
      bar: bar ? { sel: sel(bar), rect: R(br) } : null,
      outside,
      wraps,
      rowsWrap,
      items: navItems
        .filter(e => {
          const r = e.getBoundingClientRect();
          return r.top < hr.top + 120;
        })
        .map(e => Object.assign(it(e), { rect: R(inkRect(e)) })),
    };
  }

  // ------------------------------------------------ checks added in the second pass (a review, a study of fifteen sites, the
  // references check of the card kit)
  // inkBounds: where a picture draws its subject, as fractions of the picture (0..1): the loaded <img>, <video> or <canvas>
  // read at 320px on its long side. The ground is the transparent border or, on an opaque picture, the border's own flat colour (the
  // median of its outer 2px, 70% of that ring within 36 of it); what stands more than 56 off that ground (or is 80 of 255 opaque)
  // is the subject, a column or row counting from 2 such pixels. A picture with no flat border (a photograph of a scene) is its
  // whole box. null when it cannot be read (not loaded, another origin, a WebGL canvas that reads back blank)
  function inkBounds(el) {
    try {
      const nw = el.naturalWidth || el.videoWidth || el.width,
        nh = el.naturalHeight || el.videoHeight || el.height;
      if (!nw || !nh) return null;
      if (el.tagName === "IMG" && !el.complete) return null;
      const k = Math.min(1, 320 / Math.max(nw, nh)),
        cw = Math.max(8, Math.round(nw * k)),
        ch = Math.max(8, Math.round(nh * k));
      const cv = document.createElement("canvas");
      cv.width = cw;
      cv.height = ch;
      const g = cv.getContext("2d", { willReadFrequently: true });
      g.drawImage(el, 0, 0, cw, ch);
      const d = g.getImageData(0, 0, cw, ch).data,
        at = (xx, yy) => (yy * cw + xx) * 4;
      let any = 0;
      for (let q = 3; q < d.length; q += 4)
        if (d[q] >= 16) {
          any = 1;
          break;
        }
      if (!any) return null;
      const ring = [];
      for (let yy = 0; yy < ch; yy++)
        for (let xx = 0; xx < cw; xx++) if (xx < 2 || yy < 2 || xx >= cw - 2 || yy >= ch - 2) ring.push(at(xx, yy));
      const clear = ring.filter(q => d[q + 3] < 16).length / ring.length >= 0.9;
      let med = null;
      if (!clear) {
        const ch3 = [0, 1, 2].map(c => ring.map(q => d[q + c]).sort((a, b) => a - b)[ring.length >> 1]);
        med = ch3;
        const near =
          ring.filter(
            q =>
              d[q + 3] >= 16
              && Math.max(Math.abs(d[q] - med[0]), Math.abs(d[q + 1] - med[1]), Math.abs(d[q + 2] - med[2])) <= 36,
          ).length / ring.length;
        if (near < 0.7) return { x0: 0, y0: 0, x1: 1, y1: 1, flat: false };
      }
      const cols = new Array(cw).fill(0),
        rows = new Array(ch).fill(0);
      for (let yy = 0; yy < ch; yy++)
        for (let xx = 0; xx < cw; xx++) {
          const q = at(xx, yy);
          let on;
          if (clear) on = d[q + 3] >= 80;
          else
            on =
              d[q + 3] >= 16
              && Math.max(Math.abs(d[q] - med[0]), Math.abs(d[q + 1] - med[1]), Math.abs(d[q + 2] - med[2])) > 56;
          if (on) {
            cols[xx]++;
            rows[yy]++;
          }
        }
      const first = a => a.findIndex(v => v >= 2),
        last = a => {
          for (let q = a.length - 1; q >= 0; q--) if (a[q] >= 2) return q;
          return -1;
        };
      const x0 = first(cols),
        x1 = last(cols),
        y0 = first(rows),
        y1 = last(rows);
      if (x0 < 0 || y0 < 0) return null;
      return { x0: x0 / cw, x1: (x1 + 1) / cw, y0: y0 / ch, y1: (y1 + 1) / ch, flat: true };
    } catch (e) {
      return null;
    }
  }
  const DRAWN = '[data-ui], .ui[class*=ui-], [role="img"], [data-fx], [data-fx-mounted], [aria-hidden="true"]';
  const inDrawn = el => !!(el && el.closest && el.closest(DRAWN));
  // drawn mocks the stagger check leaves alone besides DRAWN: the ui kit's fragments and loops, a diagram, and the layout
  // kit's own windows and pieces (a chat, a diff, an inbox)
  const STAGGER_DRAWN =
    '.ui, [data-ui-loop], [data-m-loop], [data-diagram], [data-ly-steps], .d-win, .d-chat, .ly-piece, [class*="ui-chat"], [class*="ui-diff"]';
  // a dealt moment (moments.md): its host ([data-moment]) and the section that is or holds one; the moment's display
  // type, its scroll, pinned and enter motion belong to it (since 2.5.1 every kind deals one)
  const momentSec = el => {
    if (!el || !el.closest) return null;
    const m = el.closest("[data-moment][data-moment-mounted]");
    if (m) return m;
    const s = sectionsList().find(x => x.contains(el));
    return (
        s && (s.matches("[data-moment][data-moment-mounted]") || s.querySelector("[data-moment][data-moment-mounted]"))
      ) ?
        s
      : null;
  };
  const inMoment = el => !!momentSec(el);
  // a film's play control (heroes.json film: a disc and its label, "Play the film"): the film's own control, only the
  // kit's marked control (.ly-play, [data-play]) in a film hero (the first section, .hero--film or holding a video or
  // a data-film control); a "Watch …" or "Play …" link elsewhere is an action like any other
  const playCtl = el => {
    if (!el || !el.matches(".ly-play, [data-play]") || secIndex(el) !== 0) return false;
    const h = sectionsList()[0];
    return !!(el.closest(".hero--film") || el.matches("[data-film]") || (h && h.querySelector("video, [data-film]")));
  };
  // the page's chrome: a nav, a banner, or the page's own <header> (one outside main and its sections; a section's
  // <header> is its intro, part of the page)
  const inChrome = (el, extra) => {
    if (!el || !el.closest) return false;
    if (el.closest('nav, [data-nav], [role="banner"]' + (extra ? ", " + extra : ""))) return true;
    const h = el.closest("header");
    return !!h && !(h.parentElement && h.parentElement.closest('main, section, article, [role="main"]'));
  };
  const HEADS = "h1, h2, h3, h4, h5, h6";
  // what a section is for, by its id, class, label and heading: a price, a quote or an order is not a feature
  const EXEMPT =
    /quote|testimon|review|pricing|price|\bplans?\b|\border\b|\bbuy\b|checkout|faq|question|footer|contact|\bclos(e|ing)\b|cta|sign-?up|subscribe|newsletter|legal|credits?\b|\d[\d,.]*\s?(€|\$|£)|(€|\$|£)\s?\d/i;
  const PRICE = /(€|\$|£)\s?\d|\d[\d.,]*\s?(€|\$|£|EUR|USD|GBP)(?![\p{L}])/u;
  const full = e =>
    String((e && (e.innerText || e.textContent)) || "")
      .trim()
      .replace(/\s+/g, " ");
  const secName = s => {
    const h = s && s.querySelector("h1, h2, h3");
    return s ?
        [
          s.id,
          typeof s.className === "string" ? s.className : "",
          s.getAttribute("aria-label") || "",
          h ? h.textContent : "",
        ].join(" ")
      : "";
  };
  const sectionOf = el => sectionsList().find(s => s.contains(el)) || null;
  const marquees = new WeakSet(); // running lines found by checkMarquee (their cut words are told once, there)
  const inMarquee = el => {
    for (let a = el; a && a !== document.body; a = a.parentElement) if (marquees.has(a)) return true;
    return false;
  };
  const endless = a =>
    !!(
      a.getAnimations
      && a.getAnimations().some(x => {
        try {
          return x.effect.getComputedTiming().iterations === Infinity;
        } catch {
          return false;
        }
      })
    );
  const lum = c => {
    const f = v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const told = { piece: new WeakSet(), box: new WeakSet(), btn: new WeakSet(), panel: new WeakSet() };
  Object.assign(seen, {
    overlap: new WeakSet(),
    tops: new WeakSet(),
    orphan: new WeakSet(),
    cards: new WeakSet(),
    frag: new WeakSet(),
    photo: new WeakSet(),
    centre: new WeakSet(),
    hlines: new WeakSet(),
    curve: new WeakSet(),
  });
  // a side neighbour: a sibling box next to it that shares at least half its height (a column of a split or a grid)
  function sideBy(a) {
    const p = a.parentElement;
    if (!p) return false;
    const q = a.getBoundingClientRect();
    for (const s of p.children) {
      if (s === a || SKIP.has(s.tagName)) continue;
      const t = s.getBoundingClientRect();
      if (t.width < 40 || t.height < 20 || !shown(s, t)) continue;
      if (
        (t.left >= q.right - 2 || t.right <= q.left + 2)
        && Math.min(t.bottom, q.bottom) - Math.max(t.top, q.top) >= 0.5 * Math.min(t.height, q.height)
      )
        return true;
    }
    return false;
  }
  // what paints at (x, y) between the element hit there and the text's own block: a picture, a fill, an svg or other
  // words; null when what lies over the text is transparent (a stretched link, an empty wrapper)
  function painter(top, el, x, y) {
    for (
      let a = top;
      a && a !== document.body && a !== document.documentElement && !a.contains(el);
      a = a.parentElement
    ) {
      if (MEDIA.has(a.tagName) || a.tagName.toLowerCase() === "svg") return a;
      const c = CS(a);
      if (c.backgroundImage && c.backgroundImage !== "none") return a;
      if (rgba(c.backgroundColor).a >= 0.5) return a;
      if (ownText(a) && lines(a).some(l => x >= l.left && x <= l.right && y >= l.top && y <= l.bottom)) return a;
    }
    return null;
  }
  // the outermost fixed (or small sticky) box an element sits in
  function barRoot(el) {
    let root = null;
    for (let a = el; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      const c = CS(a);
      if (c.position === "fixed" || (c.position === "sticky" && a.getBoundingClientRect().height < innerHeight * 0.35))
        root = a;
    }
    return root;
  }
  // one opaque (or frosted) band across the whole screen, from p up to its fixed root
  function inBand(p, root, vw) {
    for (let a = p; a; a = a.parentElement) {
      const c = CS(a),
        q = a.getBoundingClientRect();
      if (
        q.width >= vw * 0.98
        && (rgba(c.backgroundColor).a >= 0.5 || (c.backdropFilter && c.backdropFilter !== "none"))
      )
        return true;
      if (a === root) break;
    }
    return false;
  }

  // fold-cut and fold-card: the first screen at rest, cut by its bottom edge
  function checkFold(view, out, vw, vh) {
    if (scrollY > 2 || document.scrollingElement.scrollHeight - vh < 40) return;
    const S = sectionsList(),
      hero = S[0],
      done = new Set();
    for (const [el, r] of view) {
      if (r.bottom <= vh + 4 || !ownText(el) || inFixed(el) || inDrawn(el) || el.closest(INTER)) continue;
      const fs = parseFloat(CS(el).fontSize) || 16,
        big = !!el.closest("h1, h2") || fs >= 32;
      const L = lines(el).find(l => l.top < vh - 2 && l.bottom > vh + 4);
      if (!L) continue;
      const v = clipRect(el, L);
      if (v.bottom < L.bottom - 1) continue; // cut by an overflow: told under cut-text
      const blk = el.closest(HEADS) || el;
      if (done.has(blk)) continue;
      done.add(blk);
      if (big)
        add(
          out,
          "fold-cut",
          "FAIL",
          blk,
          `a ${Math.round(fs)}px line is sliced by the bottom of the first screen (${Math.round(L.bottom - vh)}px of it below the fold)`,
          [L],
        );
      else if (hero && hero.contains(el))
        add(out, "fold-cut", "WARN", blk, "a line of the hero text is sliced by the bottom of the first screen", [L]);
    }
    // the hero's own button cut in two by the fold (a phone's "Book a test ride" half below the screen)
    if (hero)
      for (const b of hero.querySelectorAll(INTER)) {
        const q = b.getBoundingClientRect();
        if (q.top >= vh - 4 || q.bottom <= vh + 4 || q.height > 120 || !shown(b, q) || inFixed(b) || inDrawn(b))
          continue;
        const bc = CS(b);
        if (!(buttonLook(b, true) || faintBox(bc) || bordered(bc) || rgba(bc.backgroundColor).a >= 0.3)) continue; // a text link is no box to cut
        const v = clipRect(b, q);
        if (v.bottom < q.bottom - 1) continue;
        add(
          out,
          "fold-cut",
          "WARN",
          b,
          `the hero's button "${label(b).slice(0, 30)}" is cut by the bottom of the first screen (${Math.round(q.bottom - vh)}px of its ${Math.round(q.height)}px below the fold)`,
          [q],
        );
        break;
      }
    const cands = [];
    const secs = new Set(S);
    for (const [el, r] of view) {
      if (
        r.top < 0
        || r.top >= vh * 0.7
        || r.bottom <= vh + 2
        || r.width < 200
        || r.height < 150
        || r.width > vw * 0.6
        || secs.has(el)
        || inFixed(el)
      )
        continue;
      const mock =
        el.matches("[data-ui], .ui[class*=ui-]")
        && !(el.parentElement && el.parentElement.closest("[data-ui], .ui[class*=ui-]"));
      const k = mock ? "mock" : surface(el);
      if (!k || k === "media" || k === "picture" || k === "effect") continue;
      if (!mock && inDrawn(el)) continue;
      if (
        el.closest(".stage, .panel, .panel__screen, .frame, [data-ui-pause-host]")
        && el.closest(".stage, .panel, .panel__screen, .frame, [data-ui-pause-host]") !== el
      )
        continue; // cut by its panel on purpose
      cands.push({ el, r });
    }
    for (const { el, r } of cands) {
      if (cands.some(o => o.el !== el && o.el.contains(el))) continue;
      const v = clipRect(el, r);
      if (v.bottom < r.bottom - 12) {
        const by = clips(el)
          .filter(k => k.y && k.bottom < r.bottom - 12)
          .pop();
        add(
          out,
          "fold-card",
          "FAIL",
          el,
          `the ${Math.round(r.width)}x${Math.round(r.height)} card starts on the first screen and is cut at its bottom by ${by ? sel(by.a) : "its section"}: its lower edge never shows`,
          [v],
        );
      } else
        add(
          out,
          "fold-card",
          "WARN",
          el,
          `the ${Math.round(r.width)}x${Math.round(r.height)} card starts on the first screen and runs ${Math.round(r.bottom - vh)}px past its bottom`,
          [{ left: r.left, top: r.top, width: r.width, height: vh - r.top }],
        );
    }
  }

  // overlap-text: a box (not the fixed nav) lying over part of a line of text
  function checkOverlap(view, first, out, vw, vh) {
    for (const [el, r] of view) {
      if (!ownText(el) || !first(seen.overlap, el, r) || inDrawn(el) || inFixed(el) || inMarquee(el)) continue;
      const ls = lines(el)
        .filter(l => l.top >= 0 && l.bottom <= vh && l.left >= 0 && l.right <= vw && l.width >= 8 && l.height >= 6)
        .slice(0, 6);
      let hit = null;
      for (const L of ls) {
        const y = (L.top + L.bottom) / 2;
        for (const x of [
          L.left + 3,
          L.left + L.width / 4,
          (L.left + L.right) / 2,
          L.right - L.width / 4,
          L.right - 3,
        ]) {
          const top = document.elementFromPoint(x, y);
          if (!top || top === el || el.contains(top) || top.contains(el) || inFixed(top)) continue;
          const p = painter(top, el, x, y);
          if (!p || inFixed(p)) continue;
          let box = p;
          for (let a = p.parentElement; a && a !== document.body && !a.contains(el); a = a.parentElement) {
            const k = quickKind(a);
            if (k && k !== "shadow") box = a;
          }
          const q = box.getBoundingClientRect();
          if (
            Math.min(q.right, L.right) - Math.max(q.left, L.left) < 4
            || Math.min(q.bottom, L.bottom) - Math.max(q.top, L.top) < 4
          )
            continue;
          hit = { box, L };
          break;
        }
        if (hit) break;
      }
      if (!hit || told.box.has(hit.box)) continue;
      told.box.add(hit.box);
      add(
        out,
        "overlap-text",
        "FAIL",
        hit.box,
        `lies over the text "${label(el).slice(0, 40)}" (${sel(el).split(" > ").slice(-2).join(" > ")})`,
        [hit.box.getBoundingClientRect(), Object.assign({}, hit.L, { ref: true })],
      );
    }
  }

  // collide (a phone, 600px and narrower): a line of text and another thing in one place where neither holds the other.
  // A line's box is as tall as its line-height (a display face set at 1.0 draws glyph boxes taller than its lines) and
  // only the part its clipping boxes leave; drawn mocks, marquees, held stages and parts that move with the scroll are
  // left out. Two lines over each other FAIL; a line on a picture, button or card of another section FAILs (a section
  // too short for its content runs into the next, the closing heading lands on the last card); a button with a picture
  // or card laid over it FAILs.
  const toldCollide = new Set(),
    toldRest = new WeakSet(),
    seenTap = new WeakSet(),
    toldTap = new Set();
  const movingUp = el => {
    for (let a = el; a && a !== document.body; a = a.parentElement) if (moving.has(a)) return true;
    return false;
  };
  const secOf = el => {
    for (const s of sectionsList()) if (s === el || s.contains(el)) return s;
    return null;
  };
  const meet = (a, b) => [
    Math.min(a.right, b.right) - Math.max(a.left, b.left),
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
  ];
  function lineBoxes(el, vh) {
    const c = CS(el),
      fs = parseFloat(c.fontSize) || 16,
      lh = parseFloat(c.lineHeight) || fs * 1.2;
    return lines(el)
      .map(l => {
        const cut = Math.max(0, (l.height - lh) / 2);
        return clipRect(el, { left: l.left, right: l.right, top: l.top + cut, bottom: l.bottom - cut });
      })
      .filter(l => l.width >= 6 && l.height >= 4 && l.top >= -1 && l.bottom <= vh + 1);
  }
  const outsideOwn = (t, l) => {
    if (!t.sec) return false;
    const q = t.sec.getBoundingClientRect();
    return l.top >= q.bottom - 2 || l.bottom <= q.top + 2;
  };
  function checkCollide(view, out, vw, vh) {
    if (vw > 600) return;
    const T = [],
      B = [];
    for (const [el, r] of view) {
      if (inFixed(el) || inMarquee(el) || holdOf(el) || movingUp(el)) continue;
      if (ownText(el) && !inDrawn(el) && effOpacity(el) >= 0.5) {
        const ls = lineBoxes(el, vh);
        if (ls.length) T.push({ el, ls, sec: secOf(el) });
      }
      if (r.width < 24 || r.height < 24 || sectionsList().includes(el)) continue;
      const media = MEDIA.has(el.tagName) || (el.tagName.toLowerCase() === "svg" && r.width >= 40 && r.height >= 40);
      const kind =
        media ? "picture"
        : el.matches(INTER) && buttonLook(el, true) ? "button"
        : r.width >= 60 && r.height >= 40 && r.width < vw - 8 && /^(fill|border|picture)$/.test(surface(el) || "") ?
          "card"
        : null;
      if (!kind) continue;
      const v = clipRect(el, r);
      if (v.width < 8 || v.height < 8) continue;
      B.push({ el, v, kind, sec: secOf(el) });
    }
    const tell = (key, el, msg, rects) => {
      if (toldCollide.has(key) || toldCollide.has("el" + idOf(el))) return;
      toldCollide.add(key);
      toldCollide.add("el" + idOf(el));
      const sc = secOf(el);
      if (sc) toldCollide.add("sec" + idOf(sc));
      add(out, "collide", "FAIL", el, msg, rects);
    };
    const q2 = x => '"' + label(x).slice(0, 32) + '"';
    // two lines of words in one place
    for (let i = 0; i < T.length; i++)
      for (let j = i + 1; j < T.length; j++) {
        const a = T[i],
          b = T[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        let hit = null;
        for (const la of a.ls) {
          for (const lb of b.ls) {
            const [ix, iy] = meet(la, lb);
            if (ix >= 8 && iy >= Math.max(3, 0.35 * Math.min(la.height, lb.height))) {
              hit = [la, lb];
              break;
            }
          }
          if (hit) break;
        }
        if (!hit) continue;
        // the one that left its section is the fault; else the later one in the page
        const [x, y, lx, ly] =
          outsideOwn(b, hit[1]) && !outsideOwn(a, hit[0]) ? [b, a, hit[1], hit[0]] : [a, b, hit[0], hit[1]];
        const other = x.sec !== y.sec;
        tell(
          idOf(a.el) + "-" + idOf(b.el),
          x.el,
          `the words ${q2(x.el)} lie over ${q2(y.el)}${other ? " of another section" : ""}: two lines in one place${outsideOwn(x, lx) ? " (they run out of their own section, which is shorter than what it holds)" : ""}`,
          [lx, Object.assign({}, ly, { ref: true })],
        );
      }
    // the words of one section on a picture, button or card of another
    for (const t of T)
      for (const b of B) {
        if (!t.sec || !b.sec || t.sec === b.sec || b.el.contains(t.el) || t.el.contains(b.el)) continue;
        const L = t.ls.find(l => {
          const [ix, iy] = meet(l, b.v);
          return ix >= 8 && iy >= Math.max(4, 0.5 * l.height);
        });
        if (!L) continue;
        if (
          B.some(
            o =>
              o !== b
              && o.el.contains(b.el)
              && o.sec === b.sec
              && !o.el.contains(t.el)
              && (() => {
                const [ix, iy] = meet(L, o.v);
                return ix >= 8 && iy >= 4;
              })(),
          )
        )
          continue; // the outer box says it
        const mover = outsideOwn(t, L) ? t.el : b.el;
        tell(
          idOf(t.el) + "-" + idOf(b.el),
          mover,
          `the words ${q2(t.el)} and the ${b.kind} ${sel(b.el).split(" > ").slice(-2).join(" > ")} of another section lie in one place: ${mover === t.el ? "the words run out of their section" : "the " + b.kind + " runs out of its section"}, which is shorter than what it holds`,
          [L, Object.assign({}, b.v, { ref: true })],
        );
      }
    // a button with a picture or a card laid over it
    for (const b of B) {
      if (b.kind !== "button") continue;
      for (const o of B) {
        if (o === b || o.kind === "button" || o.el.contains(b.el) || b.el.contains(o.el)) continue;
        const [ix, iy] = meet(b.v, o.v);
        if (ix < 8 || iy < 8) continue;
        const x = (Math.max(b.v.left, o.v.left) + Math.min(b.v.right, o.v.right)) / 2,
          y = (Math.max(b.v.top, o.v.top) + Math.min(b.v.bottom, o.v.bottom)) / 2;
        if (x < 0 || x >= vw || y < 0 || y >= vh) continue;
        const list = document.elementsFromPoint(x, y),
          io = list.findIndex(e => e === o.el || o.el.contains(e)),
          ib = list.findIndex(e => e === b.el || b.el.contains(e));
        if (io < 0 || (ib >= 0 && ib < io)) continue;
        tell(
          idOf(b.el) + "-" + idOf(o.el),
          o.el,
          `the ${o.kind} ${sel(o.el).split(" > ").slice(-2).join(" > ")} lies over the button "${label(b.el).slice(0, 30)}" (${Math.round(ix)}x${Math.round(iy)}px of it)`,
          [o.v, Object.assign({}, b.v, { ref: true })],
        );
        break;
      }
    }
    // words that left their section and lie in the next one (nothing else there to hit yet): WARN
    for (const t of T) {
      if (!t.sec) continue;
      const L = t.ls.find(l => outsideOwn(t, l));
      if (!L) continue;
      const cy = (L.top + L.bottom) / 2,
        cx = (L.left + L.right) / 2;
      const into = sectionsList().find(
        s =>
          s !== t.sec
          && !s.contains(t.sec)
          && !t.sec.contains(s)
          && (() => {
            const q = s.getBoundingClientRect();
            return cy > q.top + 2 && cy < q.bottom - 2 && cx > q.left && cx < q.right;
          })(),
      );
      if (
        !into
        || toldCollide.has("el" + idOf(t.el))
        || toldCollide.has("out" + idOf(t.sec))
        || toldCollide.has("sec" + idOf(t.sec))
      )
        continue;
      toldCollide.add("out" + idOf(t.sec));
      add(
        out,
        "collide",
        "WARN",
        t.el,
        `the words ${q2(t.el)} run out of their section into the next one (${sel(into).split(" > ").pop()}): the section is shorter than what it holds`,
        [L, Object.assign(R(into.getBoundingClientRect()), { ref: true })],
      );
    }
    // at rest: the top of the page (a bar on the upper half) and its end (a bar on the lower half) leave nothing to scroll
    const max = document.scrollingElement.scrollHeight - vh,
      atTop = scrollY < 2,
      atEnd = scrollY >= max - 2;
    if (!atTop && !atEnd) return;
    const roots = new Set();
    for (const [el] of view)
      if (inFixed(el)) {
        const rt = barRoot(el);
        if (rt) roots.add(rt);
      }
    for (const rt of roots) {
      if (toldRest.has(rt)) continue;
      const q = rt.getBoundingClientRect();
      if (q.width < vw * 0.5 || q.height < 16 || q.height > vh * 0.35 || !shown(rt, q)) continue;
      const upper = (q.top + q.bottom) / 2 < vh / 2,
        where =
          atTop && upper ? "top"
          : atEnd && !upper ? "end"
          : null;
      if (!where) continue;
      for (const [el, r] of view) {
        if (rt.contains(el) || el.contains(rt) || inFixed(el) || toldRest.has(rt)) continue;
        const rects =
          ownText(el) ? lineBoxes(el, vh)
          : el.matches(INTER) || MEDIA.has(el.tagName) ? [clipRect(el, r)]
          : [];
        for (const L of rects) {
          const [ix, iy] = meet(L, q);
          if (ix < 8 || iy < 4) continue;
          const x = (Math.max(L.left, q.left) + Math.min(L.right, q.right)) / 2,
            y = (Math.max(L.top, q.top) + Math.min(L.bottom, q.bottom)) / 2;
          const top = x >= 0 && x < vw && y >= 0 && y < vh ? document.elementFromPoint(x, y) : null;
          if (!top || !rt.contains(top)) continue;
          toldRest.add(rt);
          add(
            out,
            "collide",
            "FAIL",
            rt,
            where === "top" ?
              `at the top of the page the fixed bar covers ${ownText(el) ? q2(el) : "the " + (MEDIA.has(el.tagName) ? "picture" : "button") + " " + q2(el)}: nothing scrolls it out from under the bar`
            : `at the end of the page the fixed bar covers ${ownText(el) ? q2(el) : "the " + (MEDIA.has(el.tagName) ? "picture" : "button") + " " + q2(el)}: the page cannot scroll further, so it stays under the bar`,
            [q, Object.assign({}, L, { ref: true })],
            { rest: where },
          );
          break;
        }
      }
    }
  }
  // tap-size (a phone): links, buttons, fields, summaries and tabs outside a line of running text, by their hit box
  const TAP =
    'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="link"], [role="switch"], [role="checkbox"]';
  // the nearest other target to a box: the gap between their edges (0 when they touch or overlap)
  function nearTap(el, q, all) {
    let best = null;
    for (const o of all) {
      if (o.el === el || o.el.contains(el) || el.contains(o.el) || (o.href && o.href === el.getAttribute("href")))
        continue;
      const gx = Math.max(0, o.r.left - q.right, q.left - o.r.right),
        gy = Math.max(0, o.r.top - q.bottom, q.top - o.r.bottom),
        d = Math.hypot(gx, gy);
      if (!best || d < best.d) best = { d, el: o.el, r: o.r };
    }
    return best;
  }
  function checkTaps(view, out, vw, vh) {
    if (vw > 600) return;
    const found = [];
    // every target on this screen, small or not: a small one FAILs only with another this close (WCAG 2.5.8 asks for
    // 24px of room; a thumb is wider), else it WARNs
    const all = view
      .filter(([e]) => e.matches(TAP) && !inDrawn(e) && CS(e).pointerEvents !== "none")
      .map(([e, r]) => ({ el: e, r, href: e.getAttribute("href") }));
    for (const [el, r] of view) {
      if (!el.matches(TAP) || seenTap.has(el) || r.top < 0 || r.bottom > vh) continue;
      seenTap.add(el);
      if (
        inDrawn(el)
        || el.disabled
        || el.closest("[inert], fieldset[disabled]")
        || CS(el).pointerEvents === "none"
        || /^(none|hidden)$/.test(CS(el).visibility)
      )
        continue;
      // a link in a line of running text (the line is the target's neighbour, not a list of links)
      // (a short sentence counts too: "Questions? Write to us.")
      if (el.tagName === "A" && CS(el).display === "inline") {
        const p = el.parentElement,
          pt = String((p && p.textContent) || "")
            .replace(/\s+/g, " ")
            .trim(),
          t = String(el.textContent || "")
            .replace(/\s+/g, " ")
            .trim();
        const rest = pt.replace(t, "").trim();
        if (rest.length > 15 || (rest.length >= 8 && /[a-z]{2,}/i.test(rest) && /\s/.test(pt))) continue;
      }
      let L = r.left,
        T = r.top,
        Rr = r.right,
        Bt = r.bottom;
      if (CS(el).position !== "static")
        for (const ps of ["::before", "::after"]) {
          const p = getComputedStyle(el, ps);
          if (p.content === "none" || p.content === "normal" || p.position !== "absolute") continue;
          const px = v => (/px$/.test(v) ? parseFloat(v) : null),
            t = px(p.top),
            b = px(p.bottom),
            l = px(p.left),
            rr = px(p.right);
          if (t !== null && t < 0) T = Math.min(T, r.top + t);
          if (b !== null && b < 0) Bt = Math.max(Bt, r.bottom - b);
          if (l !== null && l < 0) L = Math.min(L, r.left + l);
          if (rr !== null && rr < 0) Rr = Math.max(Rr, r.right - rr);
        }
      let w = Rr - L,
        h = Bt - T;
      if (el.matches('input[type="checkbox"], input[type="radio"]')) {
        const lb = el.closest("label") || (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null);
        if (lb) {
          const q = lb.getBoundingClientRect();
          w = Math.max(w, q.width);
          h = Math.max(h, q.height);
        }
      }
      if (h >= 43.5 && w >= 24) continue;
      const small = h < 32 || w < 24,
        nb = small ? nearTap(el, { left: L, top: T, right: Rr, bottom: Bt }, all) : null;
      const sev = small && nb && nb.d < 8 ? "FAIL" : "WARN";
      const cls = e =>
        e ?
          e.tagName.toLowerCase()
          + [...e.classList]
            .filter(c => !/^(is|js|has)-/.test(c))
            .sort()
            .map(c => "." + c)
            .join("")
        : "";
      found.push({
        el,
        r,
        w: Math.round(w),
        h: Math.round(h),
        sev,
        nb: sev === "FAIL" ? nb : null,
        sig: [
          cls(el),
          cls(el.parentElement),
          cls(el.parentElement && el.parentElement.parentElement),
          sev,
          Math.round(h / 4),
        ].join("|"),
      });
    }
    const groups = new Map();
    for (const f of found) {
      if (!groups.has(f.sig)) groups.set(f.sig, []);
      groups.get(f.sig).push(f);
    }
    for (const [sig, g] of groups) {
      if (toldTap.has(sig)) continue;
      toldTap.add(sig);
      const f = g[0],
        n = g.length;
      add(
        out,
        "tap-size",
        f.sev,
        f.el,
        `a ${f.w}x${f.h}px tap target${n > 1 ? ` (and ${n - 1} more like it on this screen)` : ""}: ${f.sev === "FAIL" ? `${Math.round(f.nb.d)}px from the next one ("${label(f.nb.el).slice(0, 24)}"), so a thumb lands on the wrong one` : "under the 44px a phone needs"}`,
        [...g.slice(0, 6).map(x => x.r), ...(f.nb ? [Object.assign(R(f.nb.r), { ref: true })] : [])],
      );
    }
  }

  // nav-covers: a fixed piece (a tab, pill, chip, dock or a bar narrower than the screen) on top of part of a line
  // while the rest of the line shows beside it; one opaque band across the whole screen is not told
  function checkUnderChrome(view, out, vw, vh) {
    const roots = new Set();
    for (const [el] of view)
      if (inFixed(el)) {
        const rt = barRoot(el);
        if (rt) roots.add(rt);
      }
    const pieces = [];
    for (const rt of roots) {
      if (told.piece.has(rt)) continue;
      const q = rt.getBoundingClientRect();
      if (q.width >= 1 && q.height >= 1) pieces.push({ rt, q });
    }
    if (!pieces.length) return;
    for (const [el, r] of view) {
      if (!ownText(el) || inFixed(el) || inDrawn(el)) continue;
      const near = pieces.filter(
        p =>
          !told.piece.has(p.rt) && r.left < p.q.right && r.right > p.q.left && r.top < p.q.bottom && r.bottom > p.q.top,
      );
      if (!near.length) continue;
      for (const L of lines(el)) {
        if (L.bottom <= 0 || L.top >= vh || L.width < 8) continue;
        const piece = near.find(
          p =>
            !told.piece.has(p.rt)
            && L.left < p.q.right
            && L.right > p.q.left
            && L.top < p.q.bottom
            && L.bottom > p.q.top,
        );
        if (!piece) continue;
        const y = (L.top + L.bottom) / 2;
        let under = 0,
          free = 0,
          pq = null;
        for (let i = 0; i <= 8; i++) {
          const x = L.left + 2 + ((L.width - 4) * i) / 8;
          if (x < 0 || x >= vw) continue;
          const top = document.elementFromPoint(x, y);
          if (!top) continue;
          if (top === el || el.contains(top)) {
            free++;
            continue;
          }
          if (!piece.rt.contains(top)) continue;
          const p = painter(top, el, x, y);
          if (p && !inBand(p, piece.rt, vw)) {
            under++;
            pq = pq || p.getBoundingClientRect();
          }
        }
        if (under && free) {
          told.piece.add(piece.rt);
          add(
            out,
            "nav-covers",
            "FAIL",
            piece.rt,
            `sits on top of the text "${label(el).slice(0, 40)}" while the page scrolls: part of the line shows beside it`,
            [pq || piece.q, Object.assign({}, L, { ref: true })],
          );
          break;
        }
      }
    }
  }

  // top-stagger: boxes side by side in one row (same tag and class) whose tops differ
  function checkTopStagger(view, first, out) {
    for (const [p, r] of view) {
      if (p.children.length < 2 || !first(seen.tops, p, r)) continue;
      if (inFixed(p) || inDrawn(p) || inScroller(p) || inChrome(p)) continue;
      if (
        /masonry/.test(CS(p).gridTemplateRows || "")
        || /masonry/i.test(typeof p.className === "string" ? p.className : "")
      )
        continue;
      const kids = [];
      for (const k of p.children) {
        if (SKIP.has(k.tagName)) continue;
        const q = k.getBoundingClientRect(),
          c = CS(k);
        if (
          q.width < 60
          || q.height < 80
          || !shown(k, q)
          || /^inline/.test(c.display)
          || /absolute|fixed/.test(c.position)
        )
          continue;
        if (
          !surface(k)
          && !k.querySelector("img, video, canvas, picture, svg, [data-ui], .ui[class*=ui-]")
          && q.height < 160
        )
          continue;
        kids.push({ k, q });
      }
      if (kids.length < 2) continue;
      const sig = k => k.tagName + "." + (k.classList[0] || "");
      const groups = new Map();
      for (const it of kids) {
        const s = sig(it.k);
        if (!groups.has(s)) groups.set(s, []);
        groups.get(s).push(it);
      }
      let worst = null;
      for (const g of groups.values()) {
        if (g.length < 2) continue;
        const rows = [];
        for (const it of g.sort((a, b) => a.q.left - b.q.left)) {
          const row = rows.find(w =>
            w.every(
              o =>
                Math.min(o.q.bottom, it.q.bottom) - Math.max(o.q.top, it.q.top)
                  >= 0.5 * Math.min(o.q.height, it.q.height)
                && (it.q.left >= o.q.right - 2 || it.q.right <= o.q.left + 2),
            ),
          );
          if (row) row.push(it);
          else rows.push([it]);
        }
        for (const row of rows) {
          if (row.length < 2) continue;
          const tops = row.map(o => o.q.top),
            spread = Math.max(...tops) - Math.min(...tops);
          if (spread > 4 && (!worst || spread > worst.spread)) worst = { spread, row };
        }
      }
      if (!worst) continue;
      const base = Math.min(...worst.row.map(o => o.q.top));
      add(
        out,
        "top-stagger",
        worst.spread > 8 ? "FAIL" : "WARN",
        p,
        `${worst.row.length} boxes side by side start at different heights (+${worst.row.map(o => Math.round(o.q.top - base)).join(", +")}px)`,
        worst.row.map(o => o.q),
      );
    }
  }

  // orphan: the last line of a paragraph or heading holds one short word, a number or a unit
  function checkOrphans(view, first, out) {
    for (const [el, r] of view) {
      if (!el.matches("p, li, h1, h2, h3, h4, h5, h6, dd, figcaption, blockquote") || !first(seen.orphan, el, r))
        continue;
      if (inDrawn(el) || inFixed(el) || el.closest(INTER) || inMarquee(el)) continue;
      const nodes = [];
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) if (/\S/.test(n.nodeValue) && n.parentElement && shown(n.parentElement)) nodes.push(n);
      const words = [];
      for (let i = nodes.length - 1; i >= 0 && words.length < 2; i--) {
        const ms = [...nodes[i].nodeValue.matchAll(/\S+/g)];
        for (let j = ms.length - 1; j >= 0 && words.length < 2; j--) {
          const rg = document.createRange();
          rg.setStart(nodes[i], ms[j].index);
          rg.setEnd(nodes[i], ms[j].index + ms[j][0].length);
          const rs = [...rg.getClientRects()].filter(q => q.width > 0);
          if (rs.length) words.push({ w: ms[j][0], r: rs[rs.length - 1] });
        }
      }
      if (words.length < 2) continue;
      const [last, prev] = words;
      if (last.r.top < prev.r.bottom - 2) continue; // on the line before it too
      const bare = last.w.replace(/[.,;:!?)"'’»”]+$/, "");
      if (!(
        /^\p{L}{1,3}$/u.test(bare)
        || /^[\d.,:%°€$£/–-]+$/.test(bare)
        || /^(€|\$|£|kg|km|cm|mm|min|h|g|m)$/i.test(bare)
      ))
        continue;
      add(out, "orphan", "WARN", el, `its last line holds only "${last.w}"`, [last.r]);
    }
  }

  // marquee: a running line of text cut mid-word at the screen's edges
  function checkMarquee(view, out, vw, vh) {
    for (const [el, r] of view) {
      // (a running line is often aria-hidden, its words read once from a label: it is still drawn on the page)
      if (
        !(r.width > vw + 4 || r.left < -2 || r.right > vw + 2)
        || marquees.has(el)
        || inMarquee(el)
        || inFixed(el)
        || (el.closest && el.closest('[data-ui], .ui[class*=ui-], [role="img"], [data-fx], [data-fx-mounted]'))
      )
        continue;
      let named = false;
      for (let a = el; a && a !== document.body && !named; a = a.parentElement)
        named = /marquee|ticker|running-?line/i.test(typeof a.className === "string" ? a.className : "");
      if (!(endless(el) || loopers.has(idOf(el)) || named)) continue;
      const vis = clipRect(el, r);
      if (vis.left > 2 || vis.right < vw - 2) continue;
      const ls = deepLines(el).filter(l => l.bottom > 0 && l.top < vh);
      const cutL = ls.some(l => l.left < vis.left - 1 && l.right > vis.left + 1),
        cutR = ls.some(l => l.left < vis.right - 1 && l.right > vis.right + 1);
      if (!cutL && !cutR) continue;
      marquees.add(el);
      let fade = false;
      for (let a = el; a && a !== document.body; a = a.parentElement) {
        const c = CS(a);
        const m = c.maskImage || c.webkitMaskImage;
        if (m && m !== "none") {
          fade = true;
          break;
        }
      }
      add(
        out,
        "marquee",
        fade ? "WARN" : "FAIL",
        el,
        `a running line of text, cut mid-word at ${cutL && cutR ? "both edges" : "the edge"} of the screen in every still${fade ? " (under an edge fade)" : ""}`,
        [vis],
      );
    }
  }

  // card-visual: a group of 3 or more cards that are text only
  function coverOf(card) {
    const q = card.getBoundingClientRect(),
      area = q.width * q.height;
    let cover = 0,
      icon = false;
    for (const e of card.querySelectorAll("*")) {
      if (SKIP.has(e.tagName) || isSvgPart(e)) continue;
      const c = CS(e);
      const vis =
        e.matches(
          'img, video, canvas, picture, iframe, object, embed, svg, [data-ui], .ui[class*=ui-], [data-fx], [data-fx-mounted], [role="img"]',
        )
        || (c.backgroundImage && c.backgroundImage !== "none" && c.display !== "inline");
      if (!vis) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 1 || !shown(e, r)) continue;
      const w = Math.min(r.right, q.right) - Math.max(r.left, q.left),
        h = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top);
      if (w <= 0 || h <= 0) continue;
      cover = Math.max(cover, (w * h) / area);
      if (r.width >= 18 && r.height >= 18) icon = true;
    }
    return { cover, icon };
  }
  function checkCardGroups(view, first, out, vw) {
    for (const [p, r] of view) {
      if (p.children.length < 3 || !first(seen.cards, p, r)) continue;
      if (inFixed(p) || inDrawn(p) || inChrome(p, 'footer, [role="tablist"]')) continue;
      const cards = [];
      for (let k of p.children) {
        if (SKIP.has(k.tagName)) continue;
        let q = k.getBoundingClientRect();
        if (!surface(k) && k.children.length === 1) {
          const c1 = k.firstElementChild,
            q1 = c1.getBoundingClientRect();
          if (q1.width * q1.height >= 0.85 * q.width * q.height) {
            k = c1;
            q = q1;
          }
        }
        const s = surface(k);
        if (
          !s
          || s === "media"
          || s === "picture"
          || s === "effect"
          || q.width < 140
          || q.height < 90
          || !shown(k, q)
          || isBand(q, vw)
        )
          continue;
        cards.push({ k, q });
      }
      const sig = k => k.tagName + "." + (k.classList[0] || "");
      const groups = new Map();
      for (const it of cards) {
        const s = sig(it.k);
        if (!groups.has(s)) groups.set(s, []);
        groups.get(s).push(it);
      }
      const g = [...groups.values()].sort((a, b) => b.length - a.length)[0];
      if (!g || g.length < 3) continue;
      if (g.some(({ k }) => k.querySelector("details, blockquote"))) continue; // questions and quotes are text by nature
      const info = g.map(({ k }) => coverOf(k));
      if (info.some(x => x.cover >= 0.25 || x.icon)) continue; // a visual, or real icons (a quiet rest row)
      const exempt = EXEMPT.test(secName(sectionOf(p))) || g.some(({ k }) => PRICE.test(full(k)));
      add(
        out,
        "card-visual",
        exempt ? "WARN" : "FAIL",
        p,
        `${g.length} cards hold only text: no picture, icon, UI fragment or effect in any of them`,
        g.map(({ q }) => q),
      );
    }
  }

  // ui-fit and ui-centre: a fragment's parts running past its own box or its slot; a compact fragment off the middle of
  // its panel. grounds: the panels behind UI, sampled from the screenshot for dark-ground
  function checkFragments(view, first, out, vw, vh) {
    const panels = new Map();
    for (const [el, r] of view) {
      if (
        !el.matches("[data-ui], .ui[class*=ui-]")
        || (el.parentElement && el.parentElement.closest("[data-ui], .ui[class*=ui-]"))
      )
        continue;
      const panel = el.closest(".panel, .panel__screen, .frame, [data-ui-pause-host]");
      if (panel) {
        if (!panels.has(panel)) panels.set(panel, []);
        panels.get(panel).push({ el, r });
      }
      if (!first(seen.frag, el, r)) continue;
      let worst = null;
      for (const e of el.querySelectorAll("*")) {
        if (SKIP.has(e.tagName) || isSvgPart(e)) continue;
        if (!(ownText(e) || e.matches("button, input, select, textarea"))) continue;
        const q = e.getBoundingClientRect();
        if (q.width < 1 || !shown(e, q)) continue;
        let skip = false;
        for (let a = e; a && a !== el; a = a.parentElement) {
          const c = CS(a);
          if (/absolute|fixed/.test(c.position) || /auto|scroll/.test(c.overflowX)) {
            skip = true;
            break;
          }
        }
        if (skip) continue;
        const by = Math.max(r.left - q.left, q.right - r.right);
        if (by > 2 && (!worst || by > worst.by)) worst = { e, q, by };
      }
      if (worst)
        add(
          out,
          "ui-fit",
          "FAIL",
          el,
          `its ${label(worst.e) ? `"${label(worst.e).slice(0, 24)}"` : sel(worst.e).split(" > ").pop()} runs ${Math.round(worst.by)}px past the fragment's own edge: the fragment is narrower than its content`,
          [worst.q, Object.assign(R(r), { ref: true })],
        );
      const slot = el.parentElement;
      if (slot && !slot.matches(".stage, .panel, .panel__screen, .frame")) {
        const sq = slot.getBoundingClientRect();
        if (r.width > sq.width + 2 && sq.width > 40)
          add(
            out,
            "ui-fit",
            "FAIL",
            el,
            `the fragment is ${Math.round(r.width)}px wide in a ${Math.round(sq.width)}px slot (${sel(slot).split(" > ").pop()})`,
            [r, Object.assign(R(sq), { ref: true })],
          );
      }
      if (el.closest(".at-center") && panel) {
        const pq = panel.getBoundingClientRect();
        if (r.width > pq.width - 48)
          add(
            out,
            "ui-fit",
            "FAIL",
            el,
            `a centred fragment ${Math.round(r.width)}px wide in a ${Math.round(pq.width)}px panel: it needs 24px of ground on each side`,
            [r, Object.assign(R(pq), { ref: true })],
          );
      }
    }
    for (const [panel, frs] of panels) {
      const pq = panel.getBoundingClientRect();
      if (pq.top < -1 || pq.bottom > vh + 1 || told.panel.has(panel)) continue;
      told.panel.add(panel);
      // the ground behind the UI, read from the screenshot (dark-ground)
      let card = null;
      for (let a = panel.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        const b = rgba(CS(a).backgroundColor);
        if (b.a >= 0.5) {
          card = b;
          break;
        }
      }
      if (!card) card = pageBg();
      const fb = rgba(CS(frs[0].el).backgroundColor);
      out.grounds.push({
        id: idOf(panel),
        sel: sel(panel),
        rect: R(pq),
        holes: frs.map(f => R(clipRect(f.el, f.r))),
        card: { r: card.r, g: card.g, b: card.b },
        frag: fb.a >= 0.5 ? { r: fb.r, g: fb.g, b: fb.b } : null,
      });
      // only what is meant to sit in the middle: .at-center, a .fit slot, a fragment placed by hand, or the pair in a hero
      // frame; a fragment anchored at a corner or rising from the bottom keeps its corner (the edge rule covers it)
      const wrapOf = el =>
        el.closest(".at-corner, .at-rise, .at-right, .at-over, .at-over-l, .at-center, .fit, .to-edge");
      const anchored = el => {
        const w = wrapOf(el);
        return (
          !!w
          && panel.contains(w)
          && w.matches(".at-corner, .at-rise, .at-right, .at-over, .at-over-l, .to-edge")
          && !w.matches(".fit, .at-center")
        );
      };
      const heroPair = panel.matches(".frame--hero") || (panel.matches(".frame") && pq.width >= vw * 0.6);
      if (
        vw < 700
        || frs.some(({ el }) => el.closest(".at-right"))
        || (!heroPair && frs.every(({ el }) => anchored(el)))
      )
        continue;
      const L = Math.min(...frs.map(f => f.r.left)),
        Rr = Math.max(...frs.map(f => f.r.right));
      const gl = L - pq.left,
        gr = pq.right - Rr;
      if (gl < 0 || gr < 0 || Rr - L > 0.9 * pq.width) continue; // cut by an edge (anchored), or filling the panel
      if (Math.abs(gl - gr) <= Math.max(12, 0.06 * pq.width)) continue;
      add(
        out,
        "ui-centre",
        "FAIL",
        frs[0].el,
        `${frs.length > 1 ? `the ${frs.length} fragments sit` : "a fragment meant for the middle sits"} off the middle of ${heroPair ? "the frame" : "its panel"}: ${Math.round(gl)}px of ground at the left, ${Math.round(gr)}px at the right`,
        [...frs.map(f => f.r), Object.assign(R(pq), { ref: true })],
      );
    }
  }

  // photographs: upscaled ones (photo-upscale), library sources (photo-credit) and the ones to grade (photo-set)
  const LIBRARY =
    /wikimedia|wikipedia|unsplash|pexels|pixabay|picsum|flickr|shutterstock|istockphoto|gettyimages|stocksnap|burst\.shopify|placehold|loremflickr|placekitten/i;
  function collectPhotos(view, first, out, vw, vh) {
    for (const [el, r] of view) {
      if (!(el.tagName === "IMG" || el.tagName === "VIDEO") || !first(seen.photo, el, r)) continue;
      if (el.parentElement && el.parentElement.closest('[data-ui], .ui[class*=ui-], [role="img"]')) continue;
      const src = el.currentSrc || el.src || "";
      if (/\.svg(\?|#|$)/i.test(src) || /^data:image\/svg/i.test(src)) continue;
      const nw = el.tagName === "IMG" ? el.naturalWidth : el.videoWidth,
        nh = el.tagName === "IMG" ? el.naturalHeight : el.videoHeight;
      if (!nw || !nh || r.width < 120 || r.height < 80) continue;
      const fit = CS(el).objectFit;
      const k =
        fit === "contain" || fit === "scale-down" ?
          Math.min(r.width / nw, r.height / nh)
        : Math.max(r.width / nw, r.height / nh);
      const name = decodeURIComponent(src.split(/[?#]/)[0].split("/").pop() || "").slice(0, 60);
      if (k * (devicePixelRatio || 1) > 1 / 0.75)
        add(
          out,
          "photo-upscale",
          "FAIL",
          el,
          `${name}: ${nw}x${nh} shown at ${Math.round(r.width)}x${Math.round(r.height)}, blown up ${k.toFixed(2)}x`,
          [r],
        );
      if (LIBRARY.test(src))
        out.credits.push({ id: idOf(el), sel: sel(el), name, host: (src.match(LIBRARY) || [""])[0] });
      const v = clipRect(el, r);
      if (v.width * v.height >= 0.7 * r.width * r.height && v.top >= 0 && v.bottom <= vh && el.tagName === "IMG")
        out.photos.push({ id: idOf(el), sel: sel(el), name, rect: R(v) });
    }
  }

  // fake-button candidates: a filled, padded box with a short label that is not a link, button or control
  function collectFakes(view, out, vw, vh) {
    for (const [el, r] of view) {
      if (
        !(LOOK_TAGS.has(el.tagName) || /^H[1-6]$/.test(el.tagName))
        || r.top < 0
        || r.bottom > vh
        || r.height < 30
        || r.height > 64
      )
        continue;
      if (
        el.closest(INTER)
        || el.querySelector(INTER)
        || inDrawn(el)
        || inFixed(el)
        || el.closest('label, [role="tab"], [role="tablist"], [role="status"]')
      )
        continue;
      if (el.parentElement && ownText(el.parentElement)) continue;
      const c = CS(el);
      if (c.cursor === "pointer" || (parseFloat(c.paddingLeft) || 0) < 8) continue;
      const L = buttonLook(el, false);
      if (!L || !L.fill || L.fill === "gradient" || L.text.split(" ").length > 4 || !/\p{L}/u.test(L.text)) continue;
      const ls = deepLines(el);
      if (!ls.length) continue;
      const tw = Math.max(...ls.map(l => l.right)) - Math.min(...ls.map(l => l.left));
      if (
        r.width
        > Math.max(
          tw + (parseFloat(c.paddingLeft) || 0) + (parseFloat(c.paddingRight) || 0) + 24,
          Math.min(240, 2.4 * tw),
        )
      )
        continue; // a label block of a fixed width (a tab) counts
      const bd = backdrop(el);
      out.fakes.push(
        Object.assign({ id: idOf(el), sel: sel(el), rect: R(r), strong: !!bd && cdist(rgba(L.fill), bd) >= 80 }, L),
      );
    }
  }

  // centre-axis: centred text whose block is off the middle of the frame it sits in
  function checkCentre(view, first, out, vw) {
    for (const [el, r] of view) {
      if (!ownText(el) || !/center/.test(CS(el).textAlign)) continue;
      if (
        inFixed(el)
        || inDrawn(el)
        || inScroller(el)
        || el.closest(INTER + ", label, td, th, figcaption")
        || inMarquee(el)
      )
        continue;
      let blk = el;
      while (blk && blk !== document.body && /^(inline|contents)/.test(CS(blk).display)) blk = blk.parentElement;
      if (!blk || blk === document.body) continue;
      // the block's lines, all of them: a highlighted phrase inside a centred line is not centred on its own
      if (!first(seen.centre, blk, blk.getBoundingClientRect())) continue;
      const ls = deepLines(blk);
      if (!ls.length) continue;
      const cx = (Math.min(...ls.map(l => l.left)) + Math.max(...ls.map(l => l.right))) / 2;
      let frame = null,
        kind = null;
      for (let a = blk; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
        const q = a.getBoundingClientRect();
        if (sideBy(a)) {
          frame = a;
          kind = "column";
          break;
        }
        if (a !== blk) {
          const k = surface(a);
          if (k && k !== "media" && q.width < vw * 0.85) {
            frame = a;
            kind = "box";
            break;
          }
        }
        if (q.width >= vw * 0.85) {
          frame = a;
          kind = "page";
          break;
        }
      }
      if (!frame || frame === blk) continue;
      const fq = frame.getBoundingClientRect(),
        fc = CS(frame);
      const fx =
        (fq.left
          + (parseFloat(fc.paddingLeft) || 0)
          + (parseFloat(fc.borderLeftWidth) || 0)
          + fq.right
          - (parseFloat(fc.paddingRight) || 0)
          - (parseFloat(fc.borderRightWidth) || 0))
        / 2;
      const d = Math.abs(cx - fx);
      // centred on the screen: kept for the column check (a side rail moves the content's axis off the screen's)
      if (d < 6) {
        if (kind === "page") {
          const L0 = Math.min(...ls.map(l => l.left)),
            T0 = Math.min(...ls.map(l => l.top));
          out.centred.push({
            id: idOf(blk),
            sel: sel(blk),
            text: label(blk),
            cx: Math.round(cx),
            kind: "text",
            sec: secIndex(blk),
            rect: {
              left: Math.round(L0),
              top: Math.round(T0),
              width: Math.round(Math.max(...ls.map(l => l.right)) - L0),
              height: Math.round(Math.max(...ls.map(l => l.bottom)) - T0),
            },
          });
        }
        continue;
      }
      const sev = d >= 12 && kind === "page" ? "FAIL" : "WARN";
      add(
        out,
        "centre-axis",
        sev,
        blk,
        `centred text ${Math.round(d)}px ${cx < fx ? "left" : "right"} of the middle of its ${kind === "page" ? "page" : kind} (${Math.round(cx)}px against ${Math.round(fx)}px)`,
        [
          {
            left: Math.min(...ls.map(l => l.left)),
            top: Math.min(...ls.map(l => l.top)),
            width: Math.max(...ls.map(l => l.right)) - Math.min(...ls.map(l => l.left)),
            height: Math.max(...ls.map(l => l.bottom)) - Math.min(...ls.map(l => l.top)),
          },
          Object.assign(R(fq), { ref: true }),
        ],
      );
    }
  }

  // a page button: how far its label sits off-centre, a picture inside it, and how far it stands from its text
  function buttonExtras(el, r, out) {
    if (told.btn.has(el)) return;
    told.btn.add(el);
    const parts = deepLines(el);
    for (const e of el.querySelectorAll("*")) {
      const q = e.getBoundingClientRect();
      if (q.width < 6 || q.height < 6 || q.width * q.height >= 0.85 * r.width * r.height || !shown(e, q)) continue;
      const c = CS(e);
      if (
        e.matches("svg, img")
        || rgba(c.backgroundColor).a >= 0.3
        || (c.backgroundImage && c.backgroundImage !== "none")
        || bordered(c)
      )
        parts.push({ left: q.left, right: q.right });
    }
    if (parts.length) {
      const gl = Math.min(...parts.map(p => p.left)) - r.left,
        gr = r.right - Math.max(...parts.map(p => p.right));
      if (Math.abs(gl - gr) > 12 && r.width < innerWidth * 0.8)
        add(
          out,
          "label-centre",
          "WARN",
          el,
          `its label sits ${Math.round(Math.abs(gl - gr))}px off-centre (${Math.round(gl)}px of room at the left, ${Math.round(gr)}px at the right)`,
          [r],
        );
    }
    let pic = null;
    for (const e of [el, ...el.querySelectorAll("*")]) {
      if (e.tagName === "IMG" || e.tagName === "VIDEO" || e.tagName === "PICTURE") {
        const q = e.getBoundingClientRect();
        const src = e.currentSrc || e.src || "";
        if (q.width >= 12 && q.height >= 12 && !/\.svg(\?|#|$)|^data:image\/svg/i.test(src)) {
          pic = /\.(jpe?g|webp|avif)(\?|#|$)/i.test(src) || e.tagName === "VIDEO" ? "photo" : "image";
          break;
        }
      }
      const bi = CS(e).backgroundImage;
      if (bi && /url\(/.test(bi) && !/\.svg/i.test(bi)) {
        pic = /\.(jpe?g|webp|avif)/i.test(bi) ? "photo" : "image";
        break;
      }
    }
    if (pic)
      add(
        out,
        "button-picture",
        pic === "photo" ? "FAIL" : "WARN",
        el,
        `a ${pic === "photo" ? "photograph" : "picture"} sits inside the button "${label(el).slice(0, 30)}"`,
        [r],
      );
    if (inFixed(el) || inChrome(el, "footer")) return;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      // (a heading set in spans, one per line, has no words of its own but is text all the same)
      const ts = [...a.querySelectorAll("h1, h2, h3, h4, h5, h6, p")].filter(
        t =>
          !el.contains(t)
          && !t.contains(el)
          && !t.closest(INTER)
          && !inDrawn(t)
          && (ownText(t) || (t.matches(HEADS) && deepLines(t).length))
          && shown(t),
      );
      if (!ts.length) continue;
      let best = null;
      for (const t of ts) {
        const q = t.getBoundingClientRect();
        const dx = Math.max(0, q.left - r.right, r.left - q.right),
          dy = Math.max(0, q.top - r.bottom, r.top - q.bottom),
          d = Math.hypot(dx, dy);
        if (!best || d < best.d) best = { t, q, dx, dy, d };
      }
      // jammed: the button's box runs into the line box of a heading above or beside it, or touches it (closer than
      // 8% of the heading's size, where a descender reaches it)
      for (const t of ts) {
        if (!t.matches("h1, h2, h3")) continue;
        const near = Math.max(4, 0.08 * (parseFloat(CS(t).fontSize) || 16));
        const L = deepLines(t).find(
          l =>
            Math.min(l.right, r.right) - Math.max(l.left, r.left) > 4
            && Math.max(r.top - l.bottom, l.top - r.bottom) < near,
        );
        if (!L) continue;
        const ov = Math.min(L.bottom, r.bottom) - Math.max(L.top, r.top);
        add(
          out,
          "overlap-text",
          "WARN",
          el,
          ov >= 2 ?
            `jammed into the heading "${label(t).slice(0, 30)}": its box runs ${Math.round(ov)}px into the heading's line`
          : `jammed against the heading "${label(t).slice(0, 30)}": ${Math.max(0, Math.round(-ov))}px from its line, where the letters' descenders reach`,
          [r, Object.assign({}, L, { ref: true })],
        );
        break;
      }
      // what the button follows may be a list, a table of rows, a form, a picture or a mock rather than a paragraph: it
      // belongs to that block (a submit under its fields, an order button under its price rows)
      if (best && (best.dx > 300 || best.dy > 240)) {
        for (const t of a.querySelectorAll(
          "li, dt, dd, td, th, label, input, select, textarea, img, picture, video, canvas, [data-ui], .ui[class*=ui-], .frame, figure, table, dl",
        )) {
          if (el.contains(t) || t.contains(el) || t.closest(INTER)) continue;
          const q = t.getBoundingClientRect();
          if (q.width < 8 || q.height < 8 || !shown(t, q)) continue;
          const dx = Math.max(0, q.left - r.right, r.left - q.right),
            dy = Math.max(0, q.top - r.bottom, r.top - q.bottom),
            d = Math.hypot(dx, dy);
          if (d < best.d) best = { t, q, dx, dy, d };
        }
      }
      if (best && (best.dx > 300 || best.dy > 240))
        add(
          out,
          "stranded-action",
          "WARN",
          el,
          `stands ${Math.round(best.dx > 300 ? best.dx : best.dy)}px ${best.dx > 300 ? "across" : "down"} from the nearest text of its block ("${label(best.t).slice(0, 30)}")`,
          [r, Object.assign(R(best.q), { ref: true })],
        );
      break;
    }
  }

  // the nav on this screen, for nav-family: the bar holding the most links (a fixed one after the first screen)
  function navSig(vw, vh, stop) {
    let root = null,
      n = 0;
    const counts = new Map();
    for (const e of document.querySelectorAll(INTER)) {
      const q = e.getBoundingClientRect();
      if (q.width < 1 || q.bottom <= 0 || q.top >= vh || !shown(e, q) || inDrawn(e)) continue;
      let rt = inFixed(e) ? barRoot(e) : null;
      if (!rt && stop === 0 && q.top < 160) {
        for (let a = e.parentElement; a && a !== document.body; a = a.parentElement)
          if (a.matches('header, nav, [data-nav], [role="banner"]')) rt = a;
        rt = rt || e.parentElement;
      }
      if (rt) counts.set(rt, (counts.get(rt) || 0) + 1);
    }
    for (const [rt, c] of counts)
      if (c > n) {
        root = rt;
        n = c;
      }
    if (!root || n < 2) return null;
    const q = root.getBoundingClientRect();
    let bar = root,
      ba = 0;
    for (const e of [root, ...root.querySelectorAll("*")]) {
      const b = rgba(CS(e).backgroundColor),
        t = e.getBoundingClientRect();
      if (b.a >= 0.5 && t.width * t.height > ba && !e.matches(INTER) && t.width >= vw * 0.3) {
        bar = e;
        ba = t.width * t.height;
      }
    }
    const bq = bar.getBoundingClientRect(),
      bf = rgba(CS(bar).backgroundColor);
    const items = [...root.querySelectorAll(INTER)].filter(e => {
      const t = e.getBoundingClientRect();
      return t.width >= 1 && shown(e, t) && t.bottom > 0 && t.top < vh;
    });
    const brand = items.find(e => {
      const h = (e.getAttribute("href") || "").trim();
      return (
        /^(#|#top|\/|\.\/|index\.html)?$/.test(h)
        || /logo|brand|wordmark/i.test(typeof e.className === "string" ? e.className : "")
      );
    });
    const rest = items.filter(e => e !== brand && !e.closest('[role="tablist"], [role="radiogroup"]'));
    const links = rest.filter(e => !buttonLook(e, true));
    const fam = e => {
      let t = e;
      for (const d of e.querySelectorAll("*"))
        if (ownText(d)) {
          t = d;
          break;
        }
      return CS(t).fontFamily.split(",")[0].replace(/["']/g, "").trim();
    };
    const toggle = items.some(
      e => e.matches("[aria-expanded]") && /menu/i.test((e.getAttribute("aria-label") || "") + " " + full(e)),
    );
    // nav-current: how each in-page link looks on this screen (a link marked for the section on screen changes its look,
    // its aria-current or its class), and where the bar's small marks sit (a dot or a line that moves to the current link)
    const hashLinks = links.filter(e => /^#[\w-]/.test((e.getAttribute("href") || "").trim()));
    const cur = hashLinks.map(e => {
      const c = CS(e);
      return {
        h: (e.getAttribute("href") || "").trim(),
        s: [
          c.color,
          c.fontWeight,
          c.backgroundColor,
          c.textDecorationLine,
          c.borderBottomColor + " " + c.borderBottomWidth,
          c.opacity,
        ].join("¦"),
        on:
          (!!e.getAttribute("aria-current") && e.getAttribute("aria-current") !== "false")
          || /(^|\s|-)(active|current|is-on|selected)(\s|$)/.test(typeof e.className === "string" ? e.className : ""),
      };
    });
    const marks = [...root.querySelectorAll("*")]
      .filter(e => !e.matches(INTER) && !e.closest(INTER) && !e.children.length && !ownText(e))
      .map(e => {
        const t = e.getBoundingClientRect();
        return t.width >= 2 && t.width < 300 && t.height < 60 && rgba(CS(e).backgroundColor).a >= 0.3 && shown(e, t) ?
            `${Math.round(t.left)}:${Math.round(t.width)}`
          : null;
      })
      .filter(Boolean)
      .join(";");
    // how many separate sections the in-page links open (a short page's one section holds them all: nothing to mark as you scroll)
    let secs = null;
    try {
      const ix = new Set();
      for (const e of hashLinks) {
        const t = document.getElementById((e.getAttribute("href") || "").trim().slice(1));
        if (t) ix.add(secIndex(t));
      }
      secs = ix.size;
    } catch {}
    return {
      id: idOf(root),
      sel: sel(root),
      rect: R(q),
      left: Math.round(bq.left),
      width: Math.round(bq.width),
      fill: bf.a >= 0.5 ? hex(bf) : null,
      links: links.length,
      toggle,
      cur,
      secs,
      marks,
      fixedBar: inFixed(root),
      fonts: [...new Set(rest.map(fam))],
      sizes: [...new Set(links.map(e => Math.round(parseFloat(CS(e).fontSize) || 16)))],
    };
  }

  // the narrow pass (320): only what a short, narrow phone breaks on one screen: words or pictures over each other
  // (collide), targets too small and too close (tap-size), and the first screen's fold through a card or a line (fold)
  function phoneLook(stop) {
    fresh();
    const vw = vwNow(),
      vh = innerHeight;
    const out = { stop, scrollY: Math.round(scrollY), vw, vh, findings: [], errors: [] };
    const view = [];
    for (const el of document.body.querySelectorAll("*")) {
      if (SKIP.has(el.tagName) || isSvgPart(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.top >= vh) continue;
      if (!shown(el, r)) continue;
      view.push([el, r]);
    }
    const run = (name, fn) => {
      try {
        fn();
      } catch (e) {
        out.errors.push(name + ": " + (e && e.stack ? e.stack.split("\n").slice(0, 2).join(" ") : e));
      }
    };
    run("fold", () => {
      if (stop === 0) checkFold(view, out, vw, vh);
    });
    run("collide", () => checkCollide(view, out, vw, vh));
    run("tap-size", () => checkTaps(view, out, vw, vh));
    return out;
  }

  function measure(stop) {
    fresh();
    const vw = vwNow(),
      vh = innerHeight;
    const out = {
      stop,
      scrollY: Math.round(scrollY),
      vw,
      vh,
      maxScroll: Math.max(0, Math.round(document.scrollingElement.scrollHeight - vh)),
      docWidth: document.documentElement.scrollWidth,
      findings: [],
      grid: [],
      buttons: [],
      contrast: [],
      sections: [],
      pairs: [],
      nav: null,
      navSig: null,
      grounds: [],
      photos: [],
      credits: [],
      fakes: [],
      centred: [],
      ink: [],
      body: [],
      visuals: [],
      errors: [],
    };
    const view = [];
    for (const el of document.body.querySelectorAll("*")) {
      if (SKIP.has(el.tagName) || isSvgPart(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.top >= vh) continue;
      if (!shown(el, r)) continue;
      view.push([el, r]);
    }
    const first = (set, el, r) => {
      if (set.has(el)) return false;
      if ((r.top >= -1 && r.bottom <= vh + 1) || r.top <= vh * 0.5) {
        set.add(el);
        return true;
      }
      return false;
    };
    const run = (name, fn) => {
      try {
        fn();
      } catch (e) {
        out.errors.push(name + ": " + (e && e.stack ? e.stack.split("\n").slice(0, 2).join(" ") : e));
      }
    };
    run("tilt", () => checkTilt(view, first, out));
    run("spill", () => checkSpill(view, first, out, vw));
    run("marquee", () => checkMarquee(view, out, vw, vh));
    run("cut", () => checkCut(view, first, out, vw, vh));
    run("grid", () => gridCands(view, first, out, vw));
    run("stagger", () => checkStagger(view, first, out, vw));
    run("heading-lines", () => checkHeadingLines(view, first, out, vw));
    run("rows", () => checkRows(view, first, out, vw));
    run("buttons", () => collectButtons(view, out, vw, vh));
    run("contrast", () => contrastCands(view, first, out, vw, vh));
    run("sections", () => sectionData(out, vw, vh));
    if (stop <= 1)
      run("nav", () => {
        out.nav = navInfo(vw, vh);
      });
    run("nav-sig", () => {
      out.navSig = navSig(vw, vh, stop);
    });
    run("fold", () => {
      if (stop === 0) checkFold(view, out, vw, vh);
    });
    run("overlap", () => checkOverlap(view, first, out, vw, vh));
    run("under-chrome", () => checkUnderChrome(view, out, vw, vh));
    run("collide", () => checkCollide(view, out, vw, vh));
    run("tap-size", () => checkTaps(view, out, vw, vh));
    run("top-stagger", () => checkTopStagger(view, first, out));
    run("orphan", () => checkOrphans(view, first, out));
    run("card-visual", () => checkCardGroups(view, first, out, vw));
    run("fragments", () => checkFragments(view, first, out, vw, vh));
    run("photos", () => collectPhotos(view, first, out, vw, vh));
    run("fakes", () => collectFakes(view, out, vw, vh));
    run("centre", () => checkCentre(view, first, out, vw));
    run("ink", () => inkCands(view, out, vw, vh));
    run("visuals", () => {
      out.visuals = visualCands(view, vw, vh);
    });
    run("fades", () => {
      out.fades = fadeCands(view, vw, vh);
    });
    return out;
  }

  // ------------------------------------------------ motion: what each element shows, one snapshot at a time
  const D = r => ({
    left: Math.round(r.left),
    top: Math.round(r.top + scrollY),
    width: Math.round(r.width),
    height: Math.round(r.height),
  });
  // a bar that stays on screen (a nav, a cookie line, a progress bar), and everything in it, is left out of the motion checks
  const barBox = (c, r) => (c.position === "fixed" || c.position === "sticky") && r.height < innerHeight * 0.35;
  function inBar(el) {
    for (let a = el; a && a !== document.body && a !== document.documentElement; a = a.parentElement)
      if (barBox(CS(a), a.getBoundingClientRect())) return true;
    return false;
  }
  // inside a stage held on screen (sticky, a third of the screen or more)
  function inStage(el) {
    for (let a = el; a && a !== document.body && a !== document.documentElement; a = a.parentElement)
      if (CS(a).position === "sticky" && a.getBoundingClientRect().height >= innerHeight * 0.35) return true;
    return false;
  }
  // a part of a drawn mock or an effect: its own loops are allowed (system.md), so it is judged more strictly
  const inMock = el =>
    !!(
      el.parentElement
      && el.parentElement.closest('[data-ui], .ui[class*=ui-], [data-fx], [data-fx-mounted], [role="img"]')
    );
  const heldScopeOf = el => {
    for (const h of heldInfo) if (h.scope.contains(el)) return h;
    return null;
  };

  function vec(c, r, el) {
    let t = [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
      tx = 0,
      ty = 0;
    if (c.transform && c.transform !== "none") {
      try {
        const m = new DOMMatrixReadOnly(c.transform);
        t = [m.m11, m.m12, m.m21, m.m22, m.m13, m.m23, m.m31, m.m32, m.m33, m.m34 * 100, m.m43 / 50];
        tx = m.m41;
        ty = m.m42;
      } catch {}
    }
    return {
      t,
      tx,
      ty,
      o: parseFloat(c.opacity),
      cp: c.clipPath || "none",
      ind: `${c.translate}|${c.rotate}|${c.scale}`,
      f: c.filter || "none",
      cls: el.getAttribute("class") || "",
      bg: c.backgroundColor,
      col: c.color,
      txt: ownText(el) ? String(el.textContent).replace(/\s+/g, " ").slice(0, 120) : "",
      n: el.childElementCount,
      top: r.top,
      left: r.left,
      w: r.width,
      h: r.height,
    };
  }
  function strDiff(a, b) {
    if (a === b) return 0;
    const num = /-?\d*\.?\d+(?:e-?\d+)?/g;
    if (a.replace(num, "#") !== b.replace(num, "#")) return 1;
    const x = a.match(num) || [],
      y = b.match(num) || [];
    let d = 0;
    for (let i = 0; i < x.length; i++) d += Math.abs(parseFloat(x[i]) - parseFloat(y[i]));
    return d / 100;
  }
  // how far apart two looks of one element are (a class alone is not a look: what it changes shows elsewhere)
  function vdist(a, b) {
    let non = 0;
    for (let i = 0; i < a.t.length; i++) non += Math.abs(a.t[i] - b.t[i]);
    const dx = b.tx - a.tx,
      dy = b.ty - a.ty,
      o = Math.abs(a.o - b.o),
      cp = strDiff(a.cp, b.cp),
      ind = strDiff(a.ind, b.ind),
      f = strDiff(a.f, b.f);
    const colr = a.bg === b.bg && a.col === b.col ? 0 : 1,
      txt = a.txt === b.txt ? 0 : 1,
      st = colr + txt;
    return {
      d: non + (Math.abs(dx) + Math.abs(dy)) / 50 + o + cp + ind + f + st,
      non,
      dx,
      dy,
      o,
      cp,
      ind,
      f,
      st,
      colr,
      txt,
    };
  }
  // a pin holding it in place, or a scrolled wrapper (its translate follows the scroll exactly), is not an animation
  const carried = (d, dy) =>
    d.non < 0.003
    && d.o < 0.01
    && d.cp === 0
    && d.ind === 0
    && d.f === 0
    && d.st === 0
    && Math.abs(Math.abs(d.dy) - Math.abs(dy)) < 4
    && Math.abs(d.dx) < 1;
  function whatOf(d) {
    const w = [];
    if (d.non > 0.003 || Math.abs(d.dx) + Math.abs(d.dy) > 1 || d.ind) w.push("moves");
    if (d.cp) w.push("clip");
    if (d.o > 0.01) w.push("opacity");
    if (d.f) w.push("filter");
    if (d.colr) w.push("colour");
    if (d.txt) w.push("words");
    return w;
  }
  const howOf = w =>
    w.includes("moves") || w.includes("clip") ? "moves with the scroll"
    : w.includes("words") ? "its words change with the scroll"
    : w.includes("colour") ? "its colour changes with the scroll"
    : w.includes("opacity") ? "fades with the scroll"
    : "its filter changes with the scroll";

  // scope: null (near the screen), 'all' (the whole page) or an element (everything inside it)
  function takeSnap(scope) {
    const vh = innerHeight,
      m = new Map(),
      bars = new Set();
    const root = scope instanceof Element ? scope : document.body,
      all = scope != null;
    for (const el of root.querySelectorAll("*")) {
      if (SKIP.has(el.tagName) || isSvgPart(el)) continue;
      if (bars.has(el.parentElement)) {
        bars.add(el);
        continue;
      }
      const r = el.getBoundingClientRect();
      if (!all && (r.bottom < -vh * 1.5 || r.top > vh * 2)) continue;
      const c = CS(el);
      if (barBox(c, r)) {
        bars.add(el);
        continue;
      }
      if (r.width * r.height < 1500) continue;
      m.set(idOf(el), vec(c, r, el));
    }
    return { y: scrollY, m };
  }
  // read a position once two snapshots agree (typing, a rolling figure, a transition have finished); what still changes
  // after `max` ms moves by itself (a loop) and is left out from then on
  async function settle(scope, max = 3000) {
    let a = takeSnap(scope);
    const first = a,
      t0 = performance.now();
    for (;;) {
      await wait(220);
      const b = takeSnap(scope),
        busy = [];
      for (const [id, v] of b.m) {
        if (loopers.has(id)) continue;
        const u = a.m.get(id);
        if (u && vdist(u, v).d > 0.012) busy.push(id);
      }
      a = b;
      if (!busy.length) break;
      if (performance.now() - t0 > max) {
        for (const id of busy) loopers.add(id);
        break;
      }
    }
    a.first = first;
    return a;
  }
  async function go(y, scope) {
    scrollToY(y);
    await wait(120);
    return settle(scope);
  }
  async function arrive() {
    await wait(120);
    snaps.s0 = await settle(null);
    return snaps.s0.m.size;
  }

  // the screen at the current stop: four steps on to the next screen (back up the page from the last one), then back.
  // Scroll-linked: it changes over a step and is back where it was when the scroll is (a part of a mock or an effect
  // over two steps, so its own loop is not taken for the scroll), and does the same when scrolled there again.
  async function probe() {
    const vh = innerHeight,
      y0 = Math.round(scrollY),
      max = Math.max(0, Math.round(document.scrollingElement.scrollHeight - vh));
    const F0 = snaps.s0;
    if (!F0) return [];
    const dir = y0 + 0.85 * vh <= max ? 1 : -1,
      step = Math.round((0.85 * vh) / 4) * dir;
    const pos = [y0],
      F = [F0];
    for (let i = 1; i <= 4; i++) {
      pos.push(Math.max(0, Math.min(max, y0 + i * step)));
      F.push(await go(pos[i], null));
    }
    const back = await go(y0, null);
    const cands = new Map();
    for (const [id, a0] of F0.m) {
      if (loopers.has(id)) continue;
      const el = els.get(id);
      if (!el || !el.isConnected || linkedDone.has(el) || holdOf(el) || heldScopeOf(el)) continue;
      const series = F.map(s => s.m.get(id));
      if (series.some(x => !x)) continue;
      const b = back.m.get(id);
      if (!b) continue;
      let steps = 0;
      for (let i = 0; i + 1 < series.length; i++) {
        const d = vdist(series[i], series[i + 1]);
        if (d.d >= 0.012 && !carried(d, F[i + 1].y - F[i].y)) steps++;
      }
      if (!steps || (inMock(el) && steps < 2)) continue;
      let mx = 0,
        far = null,
        at = 0;
      for (let i = 1; i < series.length; i++) {
        const d = vdist(a0, series[i]);
        if (d.d > mx) {
          mx = d.d;
          far = d;
          at = i;
        }
      }
      if (!far || mx < 0.012 || vdist(a0, b).d > 0.5 * mx) continue; // it did not come back: a one-way change (scroll-reveal)
      if (!whatOf(far).length) continue;
      const bf = back.first && back.first.m.get(id);
      cands.set(id, {
        el,
        id,
        far,
        mx,
        at,
        ref: series[at],
        lag: !!bf && vdist(bf, b).d > 0.25 * mx,
        rect: { left: a0.left, top: a0.top, width: a0.w, height: a0.h },
        doc: {
          left: Math.round(a0.left),
          top: Math.round(a0.top + F0.y),
          width: Math.round(a0.w),
          height: Math.round(a0.h),
        },
      });
    }
    if (cands.size) {
      for (const j of [...new Set([...cands.values()].map(c => c.at))]) {
        const S = await go(pos[j], null);
        for (const [id, c] of cands)
          if (c.at === j) {
            const v = S.m.get(id);
            if (!v || vdist(c.ref, v).d > 0.5 * c.mx) cands.delete(id);
          }
      }
      await go(y0, null);
      // with the scroll held still: what changes now runs on its own clock (a mock's step loop, which holds a state
      // for up to about 3s), not the scroll's
      if (cands.size) {
        let a = takeSnap(null);
        const n = [...cands.values()].some(c => inMock(c.el)) ? 11 : 6;
        for (let i = 0; i < n && cands.size; i++) {
          await wait(400);
          const b = takeSnap(null);
          for (const [id] of cands) {
            const u = a.m.get(id),
              v = b.m.get(id);
            if (u && v && vdist(u, v).d > 0.012) {
              cands.delete(id);
              loopers.add(id);
            }
          }
          a = b;
        }
        // a mock's loop runs only while the mock is on screen (it pauses off screen), so a part of one is watched again
        // in the middle of the screen
        for (const [id, c] of [...cands].filter(([, c]) => inMock(c.el)).slice(0, 4)) {
          if (!cands.has(id)) continue;
          scrollToY(Math.max(0, Math.round(c.doc.top + c.doc.height / 2 - vh / 2)));
          await wait(300);
          let p = takeSnap(null);
          for (let i = 0; i < 11; i++) {
            await wait(400);
            const q = takeSnap(null);
            for (const [id2, c2] of cands) {
              if (!inMock(c2.el)) continue;
              const u = p.m.get(id2),
                v = q.m.get(id2);
              if (u && v && vdist(u, v).d > 0.012) {
                cands.delete(id2);
                loopers.add(id2);
              }
            }
            if (!cands.has(id)) break;
            p = q;
          }
        }
        if (Math.round(scrollY) !== y0) await go(y0, null);
      }
    }
    const flagged = new Map([...cands.values()].map(c => [c.el, c]));
    const res = [];
    for (const [el, c] of flagged) {
      linkedDone.add(el);
      moving.add(el);
      let up = null;
      for (let p = el.parentElement; p; p = p.parentElement)
        if (flagged.has(p)) {
          up = p;
          break;
        }
      if (up) {
        flagged.get(up).inner = (flagged.get(up).inner || 0) + 1;
        continue;
      }
      res.push(c);
    }
    // small parts of one block (the letters or words of a heading) that follow the scroll together are as big as the block
    const blockOf = el => {
      let a = el.parentElement;
      while (a && a !== document.body && /^(inline|contents)/.test(CS(a).display)) a = a.parentElement;
      return a;
    };
    const union = new Map();
    for (const c of res) {
      const b = blockOf(c.el);
      if (!b) continue;
      const u = union.get(b) || { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity, n: 0 };
      u.l = Math.min(u.l, c.rect.left);
      u.t = Math.min(u.t, c.rect.top);
      u.r = Math.max(u.r, c.rect.left + c.rect.width);
      u.b = Math.max(u.b, c.rect.top + c.rect.height);
      u.n++;
      union.set(b, u);
    }
    const together = c => {
      const u = union.get(blockOf(c.el));
      return !!u && u.n >= 2 && u.r - u.l >= 100 && u.b - u.t >= 60;
    };
    return res.map(c => {
      const what = whatOf(c.far),
        big = (c.rect.width >= 100 && c.rect.height >= 60) || together(c),
        stage = inStage(c.el);
      return {
        id: c.id,
        sel: sel(c.el),
        text: label(c.el),
        sev: big || stage ? "FAIL" : "WARN",
        rect: R(c.rect),
        doc: c.doc,
        msg: `${howOf(what)} and changes back when the scroll goes back (${what.join(", ")})${c.inner ? `, with ${c.inner} part${c.inner > 1 ? "s" : ""} inside it` : ""}${c.lag ? ", eased after the scroll stops" : ""}`,
      };
    });
  }

  // sections held on screen while the page scrolls: a sticky box a third of the screen tall or more, or the box a
  // pin-spacer holds, with the scroll range it stays put for (measured at the top of the page)
  function findHeld() {
    held = [];
    heldInfo = [];
    const vh = innerHeight,
      vw = vwNow(),
      y = scrollY,
      max = Math.max(0, document.scrollingElement.scrollHeight - vh);
    for (const el of document.body.querySelectorAll("*")) {
      if (SKIP.has(el.tagName) || isSvgPart(el) || el.closest("dialog")) continue;
      const c = CS(el);
      const pin = !!(el.parentElement && el.parentElement.classList.contains("pin-spacer"));
      if (c.position !== "sticky" && !pin) continue;
      if (held.some(h => h.contains(el))) continue;
      const r = el.getBoundingClientRect();
      if (r.height < vh * 0.35 || r.width < 120 || !shown(el, r)) continue;
      let y0, y1;
      if (pin) {
        const s = el.parentElement.getBoundingClientRect();
        y0 = s.top + y;
        y1 = s.bottom + y - r.height;
      } else {
        const t = parseFloat(c.top);
        if (isNaN(t)) continue;
        const p = el.parentElement,
          pr = p.getBoundingClientRect(),
          pc = CS(p);
        const end = pr.bottom + y - (parseFloat(pc.paddingBottom) || 0) - (parseFloat(pc.borderBottomWidth) || 0);
        y0 = r.top + y - t;
        y1 = end - r.height - t;
      }
      y0 = Math.max(0, y0);
      y1 = Math.min(max, y1);
      if (y1 - y0 < vh * 0.25) continue; // it barely holds
      held.push(el);
      heldInfo.push({
        el,
        scope: sectionsList().find(s => s.contains(el)) || el.parentElement,
        y0: Math.round(y0),
        y1: Math.round(y1),
        wide: r.width >= vw * 0.6,
        how: pin ? "a pin-spacer" : "position: sticky",
      });
    }
    return heldInfo.map((h, i) => ({
      i,
      id: idOf(h.el),
      sel: sel(h.el),
      text: label(h.el),
      sec: secIndex(h.el),
      y0: h.y0,
      y1: h.y1,
      screens: Math.round(((h.y1 - h.y0) / vh) * 10) / 10,
      wide: h.wide,
      how: h.how,
    }));
  }
  // step through a held section from before it holds to after it lets go, then back over every step where something
  // changed: what changes and comes back follows the scroll; what changes once was set off by it
  async function holdPass(i) {
    const H = heldInfo[i];
    if (!H || !H.el.isConnected) return null;
    const vh = innerHeight,
      max = Math.max(0, Math.round(document.scrollingElement.scrollHeight - vh));
    const a = Math.max(0, Math.round(H.y0 - vh * 0.15)),
      b = Math.min(max, Math.round(H.y1 + vh * 0.15));
    let step = Math.round(vh * 0.25);
    if ((b - a) / step > 30) step = Math.ceil((b - a) / 30);
    const pos = [];
    for (let y = a; y < b - 4; y += step) pos.push(y);
    pos.push(b);
    const F = [];
    for (const y of pos) F.push(await go(y, H.scope));
    const changed = new Map();
    for (let k = 0; k + 1 < F.length; k++) {
      const dy = F[k + 1].y - F[k].y;
      for (const [id, u] of F[k].m) {
        if (loopers.has(id)) continue;
        const v = F[k + 1].m.get(id);
        if (!v) continue;
        const d = vdist(u, v);
        if (d.d < 0.012 || carried(d, dy) || !whatOf(d).length) continue;
        if (!changed.has(id)) changed.set(id, []);
        changed.get(id).push(k);
      }
    }
    const ks = new Set();
    for (const l of changed.values())
      for (const k of l) {
        ks.add(k);
        ks.add(k + 1);
      }
    const B = new Map();
    for (const k of [...ks].sort((x, y) => y - x)) B.set(k, await go(pos[k], H.scope));
    const flagged = new Map();
    for (const [id, l] of changed) {
      const el = els.get(id);
      if (!el || !el.isConnected || loopers.has(id)) continue;
      let back = 0,
        once = 0,
        far = null,
        fd = 0;
      for (const k of l) {
        const u = F[k].m.get(id),
          v = F[k + 1].m.get(id),
          d = vdist(u, v);
        if (d.d > fd) {
          fd = d.d;
          far = d;
        }
        const bu = B.get(k) && B.get(k).m.get(id),
          bv = B.get(k + 1) && B.get(k + 1).m.get(id);
        if (bu && bv && vdist(u, bu).d <= 0.5 * d.d && vdist(v, bv).d <= 0.5 * d.d) back++;
        else once++;
      }
      if (!back && inMock(el)) continue; // a mock's own loop runs on its clock, not the scroll's
      flagged.set(el, { far, back });
    }
    await go(pos[Math.floor(pos.length / 2)], H.scope); // the picture: the middle of the hold
    const outer = [],
      kinds = new Set();
    let backs = 0,
      onces = 0;
    for (const [el, f] of flagged) {
      linkedDone.add(el);
      moving.add(el);
      whatOf(f.far).forEach(w => kinds.add(w));
      if (f.back) backs++;
      else onces++;
      let up = false;
      for (let p = el.parentElement; p; p = p.parentElement)
        if (flagged.has(p)) {
          up = true;
          break;
        }
      if (!up) outer.push(el);
    }
    // what else is told inside a held section whose parts follow the scroll was caught mid-scene: a WARN under its FAIL
    if (flagged.size) moving.add(H.el);
    return {
      parts: flagged.size,
      backs,
      onces,
      kinds: [...kinds],
      rect: R(H.el.getBoundingClientRect()),
      outer: outer.slice(0, 6).map(e => ({ sel: sel(e), rect: R(e.getBoundingClientRect()) })),
    };
  }

  // how far a look is from its resting state: hidden, shifted, turned, scaled or blurred
  const nums = s => (s && s !== "none" ? (s.match(/-?\d*\.?\d+/g) || []).map(Number) : []);
  function restDist(v) {
    const t = v.t;
    let d = Math.max(0, 1 - v.o) + (Math.abs(v.tx) + Math.abs(v.ty)) / 40;
    d +=
      Math.abs(t[0] - 1)
      + Math.abs(t[3] - 1)
      + 2 * (Math.abs(t[1]) + Math.abs(t[2]))
      + Math.abs(t[4])
      + Math.abs(t[5])
      + Math.abs(t[6])
      + Math.abs(t[7])
      + Math.abs(t[10]);
    const [tr, ro, sc] = v.ind.split("|");
    d += nums(tr).reduce((s, x) => s + Math.abs(x), 0) / 40;
    d +=
      nums(ro)
        .slice(-1)
        .reduce((s, x) => s + Math.abs(x), 0) * 0.07;
    d += nums(sc).reduce((s, x) => s + Math.abs(x - 1), 0) * 2;
    const bl = (v.f.match(/blur\(([\d.]+)px\)/) || [])[1];
    if (bl) d += +bl / 4;
    return d;
  }
  // during the first scroll: what, below the first screen, has come to rest (or been split into lines) since the
  // snapshot taken before any scroll, now that it is in view
  function judgeStep() {
    if (!pre) return 0;
    const vh = innerHeight,
      S = takeSnap(null);
    let added = 0;
    for (const [id, v] of S.m) {
      const p = pre.m.get(id);
      if (!p || loopers.has(id)) continue;
      if (p.top < vh - 2) continue; // on the first screen: the hero's own entrance
      if (v.top >= vh || v.top + v.h <= 0) continue; // not in view yet
      const el = els.get(id);
      if (!el) continue;
      const gain = restDist(p) - restDist(v) + (strDiff(p.cp, v.cp) >= 0.05 ? 0.5 : 0);
      const onlyFade = Math.abs(p.o - v.o) > 0.01 && vdist(Object.assign({}, p, { o: v.o }), v).d < 0.012;
      const vis = gain >= 0.1 && !(MEDIA.has(el.tagName) && onlyFade); // a picture fading in as it loads is not a reveal
      const cls = p.cls !== v.cls,
        split = cls && p.n !== v.n;
      if (!vis && !cls) continue;
      // below the first screen nothing is exempt for its class: an .enter or a [data-hl] block that waits for the
      // scroll is a scroll reveal like any other (their on-load runs are over before this pass starts)
      if (inMock(el) || inBar(el)) continue;
      const anc = [];
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) anc.push(idOf(a));
      if (vis || split) {
        const had = V.get(id);
        if (!had) {
          V.set(id, { p, v, gain, anc });
          added++;
        } else if (gain > had.gain) Object.assign(had, { v, gain });
      }
      if (cls && !K.has(id)) K.set(id, anc);
    }
    return added;
  }
  function revealHow(p, v) {
    const w = [];
    if (v.o - p.o >= 0.1) w.push(`fades in from ${p.o.toFixed(1)}`);
    const tr = x => {
      const n = [...x.ind.split("|")[0].matchAll(/(-?[\d.]+)px/g)].map(m => +m[1]);
      return [x.tx + (n[0] || 0), x.ty + (n[1] || 0)];
    };
    const [px, py] = tr(p),
      [qx, qy] = tr(v),
      dy = Math.round(py - qy),
      dx = Math.round(px - qx);
    if (Math.abs(dy) >= 3) w.push(dy > 0 ? `rises ${dy}px` : `drops ${-dy}px`);
    if (Math.abs(dx) >= 3) w.push(`slides ${Math.abs(dx)}px sideways`);
    const ang = x => (Math.atan2(x.t[1], x.t[0]) * 180) / Math.PI + (nums(x.ind.split("|")[1]).slice(-1)[0] || 0);
    const da = ang(p) - ang(v);
    if (Math.abs(da) >= 0.5) w.push(`turns ${Math.abs(da).toFixed(1)}°`);
    const scl = x => Math.hypot(x.t[0], x.t[1]) * (nums(x.ind.split("|")[2])[0] ?? 1);
    if (Math.abs(scl(p) - scl(v)) >= 0.02) w.push(`${scl(p) < scl(v) ? "grows" : "shrinks"} from ${scl(p).toFixed(2)}`);
    if (strDiff(p.cp, v.cp) >= 0.05) w.push("is unmasked");
    if (p.f !== v.f) w.push("unblurs");
    if (!w.length) w.push(p.n !== v.n ? "is split into lines that rise in" : "changes");
    return w.join(", ");
  }
  // one finding per section: the outermost part that animated in (a card, a heading whose lines rose), and how
  function revealList() {
    const subj = new Map();
    for (const [id, x] of V) {
      if (loopers.has(id)) continue;
      // a part of a loop inside a card's picture (the motion layer's [data-m-loop], a fragment's [data-ui-loop]) that
      // starts on view: the card stays still, its picture plays (allowed; loop-pause times it)
      {
        const me = els.get(id);
        const lp = me && me.closest && me.closest("[data-m-loop], [data-ui-loop]");
        if (lp && lp !== me) continue;
      }
      let s = id;
      for (const a of x.anc) if (V.has(a) || K.has(a)) s = a;
      const el = els.get(s);
      if (!el || !el.isConnected || holdOf(el) || heldScopeOf(el)) continue;
      let mv = false;
      for (let a = els.get(id); a && !mv; a = a.parentElement) if (moving.has(a)) mv = true;
      for (let a = el; a && !mv; a = a.parentElement) if (moving.has(a)) mv = true;
      if (mv) continue; // it follows the scroll: told under scroll-linked
      if (!subj.has(s)) subj.set(s, []);
      subj.get(s).push(x);
    }
    const bySec = new Map();
    for (const [s, xs] of subj) {
      const el = els.get(s),
        k = secIndex(el),
        key = k >= 0 ? k : "e" + s;
      if (!bySec.has(key)) bySec.set(key, []);
      bySec.get(key).push({ el, xs });
    }
    const out = [];
    for (const list of bySec.values()) {
      list.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      const best = list.flatMap(q => q.xs).sort((a, b) => b.gain - a.gain)[0];
      out.push({
        id: idOf(list[0].el),
        sel: sel(list[0].el),
        text: label(list[0].el),
        n: list.length,
        how: revealHow(best.p, best.v),
        sels: list.slice(0, 5).map(q => sel(q.el).split(" > ").pop()),
        docs: list.slice(0, 8).map(q => D(q.el.getBoundingClientRect())),
      });
    }
    return out;
  }
  // animations an IntersectionObserver started as their box came on screen (IO_HOOK), one per box; a UI fragment's own
  // loop and a ground's short fade as it mounts are not this
  function ioReveals(skip) {
    const S0 = window.__ccio;
    if (!S0) return [];
    const out = [],
      told = new Set(skip || []);
    for (const x of S0.list) {
      // (a fragment that re-renders its rows leaves the animated row detached: judged by where its host sits)
      if (
        !x.host.isConnected
        || !x.target.isConnected
        || x.target.closest(FRAG + ", [data-ui-loop], [data-m-loop]")
        || x.host.closest(FRAG + ", [data-ui-loop], [data-m-loop]")
      )
        continue;
      // a small part inside a picture (a map pin's halo, a dot, an icon) that pulses as it comes on screen is a
      // micro-animation of the picture, not a box revealed by the scroll
      {
        const tq = x.target.getBoundingClientRect();
        if (
          tq.width <= 96
          && tq.height <= 96
          && x.target !== x.host
          && x.target.closest('svg, figure, .frame, .panel, [class*="map"], [role="img"], [class*="cx-"]')
        )
          continue;
      }
      if (
        (x.target.matches("canvas, [data-fx], [data-fx-mounted]") || x.target.closest("[data-fx], [data-fx-mounted]"))
        && x.dur <= 600
      )
        continue;
      // the hero's entrance (motion.md: [data-enter], once on load, about 1.1 s) is no reveal on scroll, on every kind:
      // only in the hero (the first section) and only for what stands on the first screen; [data-enter] lower down
      // excuses nothing
      {
        const en = x.target.closest('[data-enter]:not([data-enter="off"])');
        if (
          en
          && secIndex(en) === 0
          && x.target.getBoundingClientRect().top + scrollY < innerHeight
          && x.dur * Math.max(1, x.it || 1) <= 1200
        )
          continue;
      }
      const hid = idOf(x.host);
      if (
        told.has(hid)
        || [...told].some(i => {
          const e = els.get(i);
          return e && (e.contains(x.host) || x.host.contains(e));
        })
      )
        continue;
      told.add(hid);
      const n = x.it > 1 ? `${x.it} x ${(x.dur / 1000).toFixed(1)} s` : `${(x.dur / 1000).toFixed(1)} s`;
      out.push({
        id: hid,
        sel: sel(x.host),
        text: label(x.host),
        msg: `starts ${x.name === "an animation" ? "an animation" : `"${x.name}"`} (${n}) the moment it is scrolled into view (an IntersectionObserver)${x.target !== x.host ? ` on ${sel(x.target).split(" > ").pop()}` : ""}`,
        doc: D(x.host.getBoundingClientRect()),
      });
    }
    return out;
  }
  // animations on a CSS scroll timeline (animation-timeline: scroll() or view()) not already told
  function scrollTimelines() {
    const out = [],
      done = new Set();
    if (!document.getAnimations) return out;
    for (const a of document.getAnimations()) {
      const tl = a.timeline;
      if (!tl || (typeof DocumentTimeline !== "undefined" && tl instanceof DocumentTimeline)) continue;
      const el = a.effect && a.effect.target;
      if (!el || !(el instanceof Element) || done.has(el)) continue;
      done.add(el);
      if (linkedDone.has(el) || inBar(el)) continue;
      linkedDone.add(el);
      moving.add(el);
      const r = el.getBoundingClientRect();
      out.push({
        id: idOf(el),
        sel: sel(el),
        text: label(el),
        big: r.width >= 100 && r.height >= 60,
        stage: inStage(el),
        kind: typeof ViewTimeline !== "undefined" && tl instanceof ViewTimeline ? "view()" : "scroll()",
        doc: D(r),
      });
    }
    return out;
  }
  // feature sections whose pictures, effects and mocks cover under a quarter of what they show; each is looked at in
  // view and settled (a held section half way through its hold), as a visitor sees it
  // hole: the largest empty rectangle inside a section (between content above and below it), and the largest empty band
  // across a card (between content above and below it)
  function contentGrid(box, left, top, width, height, skipSelf) {
    const cell = Math.max(8, Math.round(Math.min(width, height) / 60));
    const cols = Math.max(1, Math.ceil(width / cell)),
      rows = Math.max(1, Math.ceil(height / cell)),
      g = new Uint8Array(cols * rows);
    const mark = q => {
      const l = Math.max(left, q.left),
        rr = Math.min(left + width, q.right ?? q.left + q.width),
        t = Math.max(top, q.top),
        b = Math.min(top + height, q.bottom ?? q.top + q.height);
      if (rr <= l || b <= t) return;
      for (let y = Math.floor((t - top) / cell); y < Math.min(rows, Math.ceil((b - top) / cell)); y++)
        for (let x = Math.floor((l - left) / cell); x < Math.min(cols, Math.ceil((rr - left) / cell)); x++)
          g[y * cols + x] = 1;
    };
    for (const e of box.querySelectorAll("*")) {
      if (SKIP.has(e.tagName) || isSvgPart(e) || inFixed(e)) continue;
      const q = e.getBoundingClientRect();
      if (q.width < 1 || q.height < 1 || !shown(e, q)) continue;
      if (
        MEDIA.has(e.tagName)
        || e.tagName.toLowerCase() === "svg"
        || e.matches(
          INTER
            + ', input, select, textarea, [data-ui], .ui[class*=ui-], [data-fx], [data-fx-mounted], [role="img"], hr',
        )
      ) {
        mark(clipRect(e, q));
        continue;
      }
      const k = quickKind(e);
      if (k && k !== "shadow" && !(skipSelf && e === box) && !isBand(q, innerWidth)) {
        mark(clipRect(e, q));
        continue;
      }
      if (ownText(e)) for (const l of lines(e)) mark(clipRect(e, l));
    }
    return { g, cols, rows, cell };
  }
  function holeOf(G) {
    // every maximal empty rectangle (histogram method) with content in the rows above and below it
    const { g, cols, rows, cell } = G,
      h = new Int32Array(cols);
    let best = null;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) h[x] = g[y * cols + x] ? 0 : h[x] + 1;
      const st = [];
      for (let x = 0; x <= cols; x++) {
        const cur = x < cols ? h[x] : 0;
        while (st.length && h[st[st.length - 1]] >= cur) {
          const i = st.pop(),
            ht = h[i];
          if (!ht) continue;
          const l = st.length ? st[st.length - 1] + 1 : 0,
            w = x - l,
            t = y - ht + 1;
          if (t <= 0 || y >= rows - 1) continue;
          let below = false;
          for (let k = l; k < x; k++)
            if (g[(y + 1) * cols + k]) {
              below = true;
              break;
            }
          if (!below) continue;
          if (!best || w * ht > best.w * best.h) best = { x: l * cell, y: t * cell, w: w * cell, h: ht * cell };
        }
        st.push(x);
      }
    }
    return best;
  }
  function holes(s, top, bottom, vw, vh, out) {
    const r = s.getBoundingClientRect();
    if (bottom - top < vh * 0.25) return;
    const G = contentGrid(s, r.left, top, r.width, bottom - top, false);
    const hb = holeOf(G);
    // the statement hero docks its facts at the hero's foot under its words (heroes.json), and the starter's split hero
    // its three facts at the foot of the words' column on the picture's bottom line (system.css .hero-facts): the air
    // between is their design
    if (
      hb
      && sectionsList()[0] === s
      && (s.matches(".hero--statement") || s.querySelector(".hero-split > .hero-copy > .hero-facts:last-child"))
    ) {
      /* not a hole */
    } else if (hb && hb.w > 0.4 * r.width && hb.h > 0.25 * vh)
      out.push({
        id: idOf(s),
        sel: sel(s),
        text: label(s.querySelector("h1, h2, h3") || s),
        sev: hb.h > 0.35 * vh ? "FAIL" : "WARN",
        msg: `an empty hole ${Math.round(hb.w)}x${Math.round(hb.h)}px inside the section (${Math.round((hb.h / vh) * 100)}% of the screen's height), with content above and below it`,
        doc: D({ left: r.left + hb.x, top: top + hb.y, width: hb.w, height: hb.h }),
      });
    // cards of 300x200 or more: an empty band across the card between content above and below it
    for (const c of s.querySelectorAll("*")) {
      if (SKIP.has(c.tagName) || isSvgPart(c) || inDrawn(c) || inFixed(c)) continue;
      const k = quickKind(c);
      if (!k || k === "media" || k === "picture" || k === "effect") continue;
      const q = c.getBoundingClientRect();
      if (q.width < 300 || q.height < 200 || q.width > vw * 0.95 || !shown(c, q)) continue;
      if (c.parentElement && c.parentElement.closest("[data-ui], .ui[class*=ui-]")) continue;
      const cc = CS(c),
        pl = parseFloat(cc.paddingLeft) || 0,
        pr = parseFloat(cc.paddingRight) || 0;
      const C = contentGrid(c, q.left + pl, q.top, Math.max(8, q.width - pl - pr), q.height, true);
      let run = 0,
        bestRun = 0,
        at = 0,
        seenContent = false;
      for (let y = 0; y < C.rows; y++) {
        let empty = true;
        for (let x = 0; x < C.cols; x++)
          if (C.g[y * C.cols + x]) {
            empty = false;
            break;
          }
        if (empty) {
          if (seenContent) run++;
        } else {
          if (seenContent && run > bestRun) {
            bestRun = run;
            at = y - run;
          }
          run = 0;
          seenContent = true;
        }
      }
      const frac = (bestRun * C.cell) / q.height;
      if (frac > 0.3)
        out.push({
          id: idOf(c),
          sel: sel(c),
          text: label(c),
          sev: frac > 0.4 ? "FAIL" : "WARN",
          msg: `an empty band ${Math.round(bestRun * C.cell)}px tall across the card (${Math.round(frac * 100)}% of its height), with content above and below it`,
          doc: D({ left: q.left, top: q.top + at * C.cell, width: q.width, height: bestRun * C.cell }),
        });
      // a card stretched across a stacked layout (a tablet) whose content keeps to its left part: the right half empty
      else if (vw < 1000 && q.width >= 520 && q.width <= vw * 0.95) {
        let mx = -1;
        for (let y = 0; y < C.rows; y++)
          for (let x = C.cols - 1; x > mx; x--)
            if (C.g[y * C.cols + x]) {
              mx = x;
              break;
            }
        const used = ((mx + 1) * C.cell) / Math.max(1, q.width - pl - pr);
        if (mx >= 0 && used < 0.6)
          out.push({
            id: idOf(c),
            sel: sel(c),
            text: label(c),
            sev: "WARN",
            msg: `the card is ${Math.round(q.width)}px wide but its content keeps to the left ${Math.round(used * 100)}%: the right side stands empty`,
            doc: D({ left: q.left, top: q.top, width: q.width, height: q.height }),
          });
      }
    }
  }

  // type: the page's type (software, product, place, service). On a product or a place a section of prices, rooms or
  // goods must show them (SKILL.md: rooms, menus and goods shown as themselves), so a price does not exempt it
  const EXEMPT_PLACE =
    /quote|testimon|review|faq|question|footer|contact|\bclos(e|ing)\b|cta|sign-?up|subscribe|newsletter|legal|credits?\b/i;
  async function noVisual(type) {
    const vw = vwNow(),
      vh = innerHeight,
      S = sectionsList(),
      out = [],
      hl = [];
    const placeLike = type === "place" || type === "product";
    const VIS =
      'img, video, canvas, iframe, picture, object, embed, svg, [data-ui], .ui[class*=ui-], [role="img"], [data-fx], [data-fx-mounted]';
    const lastMain = S.filter(s => s.tagName !== "FOOTER").slice(-1)[0];
    for (const s of S) {
      if (s.tagName === "FOOTER" || s.tagName === "NAV" || !s.isConnected) continue;
      let r = s.getBoundingClientRect();
      if (r.height < vh * 0.25 || r.width < vw * 0.5) continue;
      const name = secName(s),
        h = s.querySelector("h1, h2, h3");
      // quiet: a section not judged for a visual (prices, questions, quotes, the closing call), told when it is text only
      let judge = r.height >= vh * 0.35,
        quiet = false;
      if (
        (placeLike ? EXEMPT_PLACE : EXEMPT).test(name)
        || s.querySelectorAll("details").length >= 3
        || s.querySelector("blockquote")
      ) {
        judge = false;
        quiet = true;
      }
      if (s === lastMain && r.height < vh * 0.9) {
        judge = false;
        quiet = true;
      } // the closing call
      const own = CS(s);
      if (own.backgroundImage && own.backgroundImage !== "none") {
        judge = false;
        quiet = false;
      } // on a picture or an effect ground
      // a dealt statement moment's own section is type by design (once, never beside another picture-less section: sections.md).
      // A statement hero is dealt (layout-deal.mjs --hero statement: a tech or gaming page with no art, a product's short page) and is
      // type on its ground by design, on any page; a statement section (the statement a text moment is dealt with) likewise.
      // The short page's one section holds the offer and the visit as ruled text, with no picture on purpose (sections.md §4,
      // the short page): on a page marked data-page-mode="short" only the hero is judged for a visual.
      // The word and editorial heroes are type-led the same way (heroes.json: dealt to briefs without a strong photograph).
      // (the hero classes count on the first section only: on a later section they excuse nothing)
      const STATEMENT = '.statement, [class*="section--statement"], [data-statement]',
        HERO_TYPE = '.hero--statement, [class*="hero--statement"], .hero--word, .hero--editorial';
      const shortPage = !!document.querySelector('[data-page-mode="short"]');
      if (
        s.matches("[data-moment][data-moment-mounted], [data-scroll-moment]")
        || s.querySelector("[data-moment][data-moment-mounted], [data-scroll-moment]")
        || s.matches(STATEMENT)
        || (s === S[0] && s.matches(HERO_TYPE))
        || (shortPage && !s.matches('.hero, [class*="hero"]'))
      ) {
        judge = false;
        quiet = false;
      }
      const hd = heldInfo.find(x => s.contains(x.el));
      scrollToY(hd ? Math.round((hd.y0 + hd.y1) / 2) : Math.max(0, Math.round(r.top + scrollY - vh * 0.1)));
      await wait(150);
      await settle(s, 1500);
      fresh();
      r = s.getBoundingClientRect();
      const ext = extent(s, vw);
      const top = ext ? Math.max(r.top, ext.top) : r.top,
        bottom = ext ? Math.min(r.bottom, ext.bottom) : r.bottom;
      const H = bottom - top;
      if (H < 40) continue;
      if (!hd) {
        try {
          holes(s, top, bottom, vw, vh, hl);
        } catch {}
      }
      if (!judge && !quiet) continue;
      const cell = Math.max(8, Math.round(Math.min(r.width, H) / 50));
      const cols = Math.ceil(r.width / cell),
        rows = Math.ceil(H / cell),
        grid = new Uint8Array(cols * rows);
      const take = q => {
        const l = Math.max(r.left, q.left),
          rr = Math.min(r.right, q.right),
          t = Math.max(top, q.top),
          b = Math.min(bottom, q.bottom);
        if (rr <= l || b <= t) return;
        for (let y = Math.floor((t - top) / cell); y < Math.min(rows, Math.ceil((b - top) / cell)); y++)
          for (let x = Math.floor((l - r.left) / cell); x < Math.min(cols, Math.ceil((rr - r.left) / cell)); x++)
            grid[y * cols + x] = 1;
      };
      for (const e of s.querySelectorAll("*")) {
        if (SKIP.has(e.tagName) || isSvgPart(e)) continue;
        const c = CS(e);
        if (!e.matches(VIS) && !(c.backgroundImage && c.backgroundImage !== "none" && c.display !== "inline")) continue;
        const q = e.getBoundingClientRect();
        if (q.width < 120 || q.height < 80 || !shown(e, q)) continue;
        take(clipRect(e, q));
      }
      let n = 0;
      for (const v of grid) n += v;
      const cover = n / grid.length;
      // a starter's slot not filled yet (data-fx="[dealt-effect]", data-ui-load="[fragment]") draws nothing
      const slot = s.querySelector('[data-fx^="["], [data-ui-load^="["]');
      const ph =
        slot ?
          slot.hasAttribute("data-fx") && /^\[/.test(slot.getAttribute("data-fx")) ?
            `data-fx="${slot.getAttribute("data-fx")}"`
          : `data-ui-load="${slot.getAttribute("data-ui-load")}"`
        : null;
      if (!judge) {
        // text only: no picture, icon, mock or effect of 24px or more anywhere in it
        const icon = [...s.querySelectorAll(VIS)].some(e => {
          if (isSvgPart(e)) return false;
          const q = e.getBoundingClientRect();
          return q.width >= 24 && q.height >= 24 && shown(e, q);
        });
        // a closing call drawn as one great button (figma.com's full-width black slab) is its own picture
        const slab =
          s === lastMain
          && [...s.querySelectorAll("a[href], button")].some(e => {
            const q = e.getBoundingClientRect();
            if (q.width < 600 || q.height < 64 || !shown(e, q) || e.closest('details, summary, [role="tablist"]'))
              return false;
            const c = CS(e);
            return rgba(c.backgroundColor).a >= 0.3 || (c.backgroundImage && c.backgroundImage !== "none");
          });
        if (cover < 0.05 && !icon && !slab)
          out.push({
            id: idOf(s),
            sel: sel(s),
            text: label(h || s),
            cover: Math.round(cover * 100),
            textOnly: true,
            quote: !!s.querySelector('blockquote, figure.quote, [class*="quote"], [class*="testimonial"]'),
            close: s === lastMain,
            doc: D({ left: r.left, top, width: r.width, height: H }),
          });
        continue;
      }
      if (cover < 0.25)
        out.push({
          id: idOf(s),
          sel: sel(s),
          text: label(h || s),
          cover: Math.round(cover * 100),
          slot: ph,
          doc: D({ left: r.left, top, width: r.width, height: H }),
        });
    }
    return { nv: out, holes: hl };
  }
  // a gap between two sections never seen whole at the screen stops: brought to the middle of the screen and measured
  // (twice, since a held section ends where it is let go)
  // the top-level sections that are a mounted statement moment's own section (its host, or the section holding it)
  function stmtSecs(ids) {
    return sectionsList()
      .map((sec, i) => {
        const h =
          sec.matches("[data-moment][data-moment-mounted]") ? sec : (
            sec.querySelector("[data-moment][data-moment-mounted]")
          );
        return h && ids.includes(h.dataset.moment) ? i : -1;
      })
      .filter(i => i >= 0);
  }
  async function seam(i) {
    const S = sectionsList(),
      vw = vwNow(),
      vh = innerHeight;
    if (!S[i] || !S[i + 1]) return null;
    let a = null,
      b = null;
    for (let k = 0; k < 2; k++) {
      fresh();
      a = extent(S[i], vw);
      b = extent(S[i + 1], vw);
      if (!a || !b) return null;
      scrollToY(Math.max(0, Math.round((a.bottom + b.top) / 2 + scrollY - vh / 2)));
      await wait(150);
      await settle(null, 1500);
    }
    fresh();
    a = extent(S[i], vw);
    b = extent(S[i + 1], vw);
    if (!a || !b) return null;
    const on = a.bottom >= 0 && a.bottom <= vh && b.top >= 0 && b.top <= vh,
      gap = b.top - a.bottom;
    let band = false;
    if (on && gap >= 6) {
      const gA = groundAt(vw / 2, a.bottom + 2),
        gB = groundAt(vw / 2, b.top - 2);
      band = !(gA === gB || (/^#/.test(gA) && /^#/.test(gB) && cdist(rgba(gA), rgba(gB)) < 12));
    }
    return { gap: Math.round(gap), top: Math.round(a.bottom), bottom: Math.round(b.top), on, band };
  }
  function insideMoving(list) {
    return list.map(id => {
      const el = els.get(id);
      if (!el) return false;
      for (let a = el; a; a = a.parentElement) if (moving.has(a)) return true;
      return false;
    });
  }
  // the big scene ([data-big-scene]) or scroll moment ([data-scroll-moment], [data-moment]) a part belongs to, or holds: { kind, key } or null
  function momentOf(list) {
    const hosts = [
      ...document.querySelectorAll("[data-big-scene], [data-moment][data-moment-mounted], [data-scroll-moment]"),
    ];
    // (a part of a section that holds a dealt moment, its sticky stage beside the moment's host, is the moment's too)
    const secHost = el => {
      const m = momentSec(el);
      return (
        m ?
          m.matches("[data-moment][data-moment-mounted]") ?
            m
          : m.querySelector("[data-moment][data-moment-mounted]")
        : null
      );
    };
    return list.map(id => {
      const el = els.get(id);
      if (!el) return null;
      const h =
        el.closest("[data-big-scene], [data-moment][data-moment-mounted], [data-scroll-moment]")
        || hosts.find(x => el.contains(x))
        || secHost(el);
      return h ?
          {
            kind: h.matches("[data-moment][data-moment-mounted], [data-scroll-moment]") ? "moment" : "scene",
            key: hosts.indexOf(h),
          }
        : null;
    });
  }
  // (--quick) inside a held section or a scroll scene, whose motion was not checked
  function insideScene(list) {
    return list.map(id => {
      const el = els.get(id);
      if (!el) return false;
      return !!(
        el.closest("[data-big-scene], [data-scroll-moment], [data-moment][data-moment-mounted]")
        || holdOf(el)
        || inStage(el)
      );
    });
  }
  // for grouping: the top-level section an element is in, and how deep
  function placeOf(list) {
    return list.map(id => {
      const el = els.get(id);
      if (!el) return [-1, 0];
      let d = 0;
      for (let a = el; a; a = a.parentElement) d++;
      return [secIndex(el), d];
    });
  }
  function rectOf(id) {
    const el = els.get(id);
    return el && el.isConnected ? R(el.getBoundingClientRect()) : null;
  }

  // ------------------------------------------------ the page as a whole (read once per width, at the top)
  function pageInfo() {
    fresh();
    const vw = vwNow(),
      vh = innerHeight,
      S = sectionsList();
    const doc = e => D(e.getBoundingClientRect());
    const visible = e => {
      const r = e.getBoundingClientRect();
      return r.width >= 2 && r.height >= 2 && shown(e, r);
    };
    const inCard = e => {
      for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
        const k = quickKind(a);
        if (k && k !== "media" && a.getBoundingClientRect().width < vw * 0.6) return true;
      }
      return false;
    };
    const heads = [];
    for (const h of document.querySelectorAll("h1, h2, h3, h4")) {
      if (inDrawn(h) || inFixed(h) || h.closest('dialog, .nav__menu, [role="menu"], header nav') || !visible(h))
        continue;
      let mx = ownText(h) ? parseFloat(CS(h).fontSize) || 16 : 0;
      for (const e of h.querySelectorAll("*"))
        if (ownText(e) && shown(e)) mx = Math.max(mx, parseFloat(CS(e).fontSize) || 0);
      if (!mx) mx = parseFloat(CS(h).fontSize) || 16;
      // its lines on screen and its words (a paragraph set as a heading: copy-length)
      const hl = deepLines(h),
        tops = [];
      for (const l of hl) if (!tops.some(t => Math.abs(t - l.top) < Math.max(4, l.height * 0.5))) tops.push(l.top);
      heads.push({
        id: idOf(h),
        sel: sel(h),
        text: label(h),
        full: full(h).slice(0, 200),
        level: +h.tagName[1],
        fs: Math.round(mx * 10) / 10,
        foot: !!h.closest("footer"),
        card: inCard(h),
        doc: doc(h),
        centred: /center/.test(CS(h).textAlign),
        lines: tops.length,
        words: full(h)
          .split(/\s+/)
          .filter(w => /[\p{L}\d]/u.test(w)).length,
        moment: inMoment(h),
        step:
          h.tagName === "H3"
          && !!h.closest(
            'ol, .steps, [class*="steps"], [class*="chapters"], [data-moment="pinned-chapters"], [data-moment="photo-chapters"]',
          ),
      });
    }
    // text that is not a heading but is set as large as one (a figure or a price excepted)
    const big = [];
    for (const e of document.body.querySelectorAll("*")) {
      if (
        SKIP.has(e.tagName)
        || isSvgPart(e)
        || !ownText(e)
        || e.closest(HEADS)
        || inDrawn(e)
        || inFixed(e)
        || e.closest("footer, header, nav, " + INTER)
      )
        continue;
      const fs = parseFloat(CS(e).fontSize) || 16;
      if (fs < 26) continue;
      const t = full(e);
      if (!/\p{L}{3}/u.test(t) || PRICE.test(t) || !visible(e) || inMarquee(e)) continue;
      let run = false;
      for (let a = e; a && a !== document.body && !run; a = a.parentElement) run = endless(a);
      if (run) continue; // a running line
      if (inMoment(e)) continue; // a dealt moment's display type is the moment's own size
      big.push({ id: idOf(e), sel: sel(e), text: t.slice(0, 48), fs: Math.round(fs * 10) / 10, doc: doc(e) });
    }
    // the hero, the headline, the line after it
    const hero = S[0] || null,
      last = S.filter(s => s.tagName !== "FOOTER" && !s.closest("footer")).slice(-1)[0] || null;
    const h1 = [...document.querySelectorAll("h1")].find(h => visible(h) && !inDrawn(h)) || null;
    let after = "";
    if (h1) {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      w.currentNode = h1;
      let e;
      while ((e = w.nextNode())) {
        if (h1.contains(e) || inDrawn(e) || inFixed(e) || e.closest(INTER)) continue;
        if (ownText(e) && visible(e) && full(e).length >= 12) {
          const b = e.closest("p, li, h2, h3, div") || e;
          after = full(b).slice(0, 400);
          break;
        }
      }
    }
    let heroText = "";
    for (const e of document.body.querySelectorAll("*")) {
      if (!ownText(e) || inFixed(e) || inDrawn(e) || inChrome(e) || SKIP.has(e.tagName)) continue;
      const r = e.getBoundingClientRect();
      if (r.top + scrollY >= 900 || !shown(e, r) || r.width < 1) continue;
      heroText +=
        " "
        + [...e.childNodes]
          .filter(n => n.nodeType === 3)
          .map(n => n.nodeValue)
          .join(" ");
    }
    // the actions: every link or button with a button look, outside drawn mocks
    const ctas = [];
    for (const e of document.querySelectorAll(INTER)) {
      if (inDrawn(e) || (e.parentElement && e.parentElement.closest(INTER)) || !visible(e)) continue;
      if (
        e.matches('[aria-pressed], [aria-selected], [role="tab"], [role="switch"]')
        || e.closest('[role="tablist"], [role="radiogroup"], .nav__menu, dialog')
      )
        continue;
      if (
        /^skip (to|the)\b/i.test(full(e))
        || /(^|\s)skip(-link)?(\s|$)/.test(typeof e.className === "string" ? e.className : "")
      )
        continue; // a skip link is for keyboards
      if (
        e.hasAttribute("href")
        && /^(#|#top|\/|\.\/|index\.html)?$/.test(e.getAttribute("href").trim())
        && inChrome(e)
      )
        continue; // the brand's link home
      const L = buttonLook(e, true);
      if (!L) continue;
      if (playCtl(e)) continue; // a film's play control (the film hero's disc and label) plays the film, it is no action
      const raw = e.getAttribute("href");
      let href = null;
      if (raw != null) {
        try {
          href = new URL(raw, location.href).href;
        } catch {}
      }
      const where =
        inFixed(e) || inChrome(e) ? "nav"
        : hero && hero.contains(e) ? "hero"
        : (last && last.contains(e)) || e.closest("footer.closing") ? "last"
        : "other"; // footer.closing is the page's closing section (system.css): its button is the last section's
      ctas.push({
        id: idOf(e),
        sel: sel(e),
        label: full(e).slice(0, 60),
        href,
        where,
        shape: L.shape,
        fill: L.fill,
        h: L.h,
        doc: doc(e),
      });
    }
    // price cards with no action in them or right under them
    const priced = [];
    for (const e of document.body.querySelectorAll("*")) {
      if (
        !ownText(e)
        || !PRICE.test(full(e))
        || full(e).length > 120
        || inDrawn(e)
        || e.closest("header, footer, nav, " + INTER)
        || !visible(e)
      )
        continue;
      let card = null;
      for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
        const k = quickKind(a);
        const q = a.getBoundingClientRect();
        if (k && k !== "media" && q.width >= 160 && q.height >= 120 && q.width <= vw * 0.7) {
          card = a;
          break;
        }
      }
      if (!card || priced.some(p => p.el === card)) continue;
      const q = card.getBoundingClientRect();
      const act =
        [...card.querySelectorAll('a[href], button, input[type="submit"], [role="button"]')].some(visible)
        || [...document.querySelectorAll("a[href], button")].some(b => {
          const t = b.getBoundingClientRect();
          return visible(b) && t.top >= q.bottom - 2 && t.top <= q.bottom + 160 && t.left < q.right && t.right > q.left;
        });
      priced.push({
        el: card,
        act,
        id: idOf(card),
        sel: sel(card),
        text: label(card),
        sec: secIndex(card),
        doc: doc(card),
      });
    }
    for (const s of S) {
      if (
        !/pricing|prices?\b|plans?\b|tarif/i.test(secName(s))
        || !PRICE.test(full(s))
        || priced.some(p => s.contains(p.el))
      )
        continue;
      if ([...s.querySelectorAll('a[href], button, input[type="submit"], [role="button"]')].some(visible)) continue;
      priced.push({
        el: s,
        act: false,
        whole: true,
        id: idOf(s),
        sel: sel(s),
        text: label(s.querySelector("h1, h2, h3") || s),
        sec: secIndex(s),
        doc: doc(s),
      });
    }
    const longBare = S.filter(
      s =>
        s.tagName !== "FOOTER"
        && s !== hero
        && s.getBoundingClientRect().height > 1.5 * vh
        && !EXEMPT.test(secName(s))
        && ![...s.querySelectorAll("a[href], button")].some(visible),
    ).map(s => ({ id: idOf(s), sel: sel(s), text: label(s.querySelector("h1, h2, h3") || s), doc: doc(s) }));
    // links
    const links = [],
      pages = [];
    for (const a of document.querySelectorAll("a[href]")) {
      if (inDrawn(a)) continue;
      const raw = a.getAttribute("href").trim(),
        lab = (full(a) || a.getAttribute("aria-label") || "").slice(0, 40);
      const it = { id: idOf(a), sel: sel(a), label: lab, href: raw, doc: visible(a) ? doc(a) : null };
      if (raw === "" || raw === "#") {
        if (a.matches('[aria-controls], [aria-expanded], [role="button"]')) continue;
        links.push(Object.assign(it, { sev: "FAIL", why: raw === "" ? "has an empty href" : 'goes to "#", nowhere' }));
        continue;
      }
      if (/^(mailto|tel|sms|javascript):/i.test(raw)) continue;
      if (raw.startsWith("#")) {
        let id = raw.slice(1);
        try {
          id = decodeURIComponent(id);
        } catch {}
        if (id === "top") continue;
        const t = document.getElementById(id) || document.getElementsByName(id)[0];
        if (!t) {
          links.push(Object.assign(it, { sev: "FAIL", why: `goes to ${raw}, which is not on this page` }));
          continue;
        }
        if (t.contains(a) && t !== document.body && !t.matches("main, body, html"))
          links.push(Object.assign(it, { sev: "WARN", why: `goes to ${raw}, the block it already sits in` }));
        else if ((t.tagName === "FOOTER" || t.closest("footer")) && !a.closest("footer"))
          links.push(Object.assign(it, { sev: "WARN", why: `goes to ${raw}, in the footer` }));
        else if (
          /^(download|order|book|buy|reserve|get)\b/i.test(lab)
          && !t.querySelector(
            'form, input, select, a[download], a[href$=".dmg"], a[href$=".exe"], a[href$=".zip"], a[href$=".pdf"], a[href^="http"]',
          )
        )
          links.push(Object.assign(it, { sev: "WARN", why: `only scrolls to ${raw}, where nothing completes it` }));
        continue;
      }
      try {
        const u = new URL(raw, location.href);
        if (u.origin === location.origin && u.pathname !== location.pathname)
          pages.push(Object.assign(it, { url: u.origin + u.pathname }));
      } catch {}
    }
    // nav links and the heading of the section each opens
    const navLinks = [];
    const navRoot = document.querySelector("header nav, nav, header, [data-nav]");
    if (navRoot)
      for (const a of navRoot.querySelectorAll('a[href^="#"]')) {
        let id = a.getAttribute("href").slice(1);
        try {
          id = decodeURIComponent(id);
        } catch {}
        const t = id && document.getElementById(id);
        if (!t || buttonLook(a, true)) continue;
        const h = t.matches(HEADS) ? t : t.querySelector(HEADS);
        if (h)
          navLinks.push({
            id: idOf(a),
            sel: sel(a),
            label: full(a).slice(0, 40),
            heading: full(h).slice(0, 120),
            doc: visible(a) ? doc(a) : null,
          });
      }
    // card-family: boxes that share a class (one card part) drawn two ways. Siblings in two fills, each used twice or
    // more (one featured card in its own fill is a choice; striped rows are rows, not cards), or titles in two faces
    const famName = f =>
      String(f || "")
        .split(",")[0]
        .replace(/["']/g, "")
        .trim()
        .toLowerCase();
    const fam = new Map();
    for (const e of document.body.querySelectorAll("[class]")) {
      if (
        SKIP.has(e.tagName)
        || isSvgPart(e)
        || MEDIA.has(e.tagName)
        || e.matches(HEADS + ", " + INTER + ", p, span, label")
        || inDrawn(e)
        || inFixed(e)
        || e.closest(
          'header, nav, footer, dialog, form, [role="tablist"], [role="menu"], [role="listbox"], [role="radiogroup"]',
        )
      )
        continue;
      const q = e.getBoundingClientRect();
      if (q.width < 140 || q.height < 90 || q.width > vw - 8 || q.height > vh * 1.5 || !visible(e)) continue;
      const wide = q.width > vw * 0.9 || q.width / q.height > 5; // a band or a row: its fill is judged, never its title
      const k = quickKind(e);
      if (k === "media" || k === "picture" || k === "effect") continue;
      // its title: the largest heading in it (an eyebrow set as an h4 is not the title)
      const bg = rgba(CS(e).backgroundColor),
        t = [...e.querySelectorAll("h2, h3, h4")]
          .filter(h => visible(h) && !inDrawn(h))
          .sort((a, b) => (parseFloat(CS(b).fontSize) || 0) - (parseFloat(CS(a).fontSize) || 0))[0];
      const covered = bg.a >= 0.3 && coverOf(e).cover >= 0.6; // a fill hidden under a picture is no look
      const it = {
        el: e,
        id: idOf(e),
        sel: sel(e),
        text: label(t || e),
        doc: doc(e),
        card: !!k,
        wide,
        row: !t && q.height < 140,
        tall: q.height > vh * 0.8,
        fill: bg.a >= 0.3 && !covered ? hex(bg) : null,
        face: t ? famName(CS(t).fontFamily) : null,
        tag: t ? t.tagName.toLowerCase() : "",
      };
      for (const c of e.classList) {
        if (
          /^(is|js|has)-|--|^(active|open|selected|current|visible|show|shown|hidden|in|on|off|dark|light|wide|full|alt|sec|section|wrap|container|inner|grid|row|col|stack|flex)$/.test(
            c,
          )
        )
          continue;
        if (!fam.has(c)) fam.set(c, []);
        fam.get(c).push(it);
      }
    }
    const cardFam = [],
      famDone = new Set();
    for (const [c, list0] of fam) {
      // the outermost boxes only (a card's inner panel shares no class with it, but a nested .card would)
      const list = list0.filter(x => !list0.some(y => y !== x && y.el.contains(x.el)));
      if (list.length < 3 || !list.some(x => x.card)) continue;
      const boxes = list.filter(x => !x.wide),
        faces = [...new Set(boxes.map(x => x.face).filter(Boolean))];
      if (boxes.length >= 3 && faces.length >= 2 && !famDone.has("f" + boxes.map(x => x.id).join())) {
        famDone.add("f" + boxes.map(x => x.id).join());
        const by = faces.map(f => boxes.filter(x => x.face === f));
        const odd = by.sort((a, b) => a.length - b.length)[0][0],
          main = by[by.length - 1][0];
        cardFam.push({
          sev: "FAIL",
          id: odd.id,
          sel: odd.sel,
          text: odd.text,
          doc: odd.doc,
          msg: `${boxes.length} cards of one kind (.${c}) set their titles in ${faces.length} faces: ${by.map(g => `${g[0].face} (${g.length}, like "${g[0].text.slice(0, 24)}")`).join(", ")}`,
          ref: main.doc,
        });
      }
      const byParent = new Map();
      for (const x of list) {
        const p = x.el.parentElement;
        if (!byParent.has(p)) byParent.set(p, []);
        byParent.get(p).push(x);
      }
      for (const sib of byParent.values()) {
        if (sib.length < 4 || famDone.has("c" + sib.map(x => x.id).join())) continue;
        // filled cards only: a photo tile beside a colour tile in a bento is two kinds of tile, not two looks; panels
        // taller than most of the screen are sections on two grounds (a rhythm), not cards
        const fills = [];
        for (const x of sib) {
          if (!x.fill || x.row || x.tall) continue;
          const f = fills.find(g => cdist(rgba(g.key), rgba(x.fill)) <= 28);
          if (f) f.items.push(x);
          else fills.push({ key: x.fill, items: [x] });
        }
        const used = fills.filter(g => g.items.length >= 2);
        if (used.length < 2) continue;
        famDone.add("c" + sib.map(x => x.id).join());
        const odd = used.sort((a, b) => a.items.length - b.items.length)[0].items[0];
        cardFam.push({
          sev: "FAIL",
          id: odd.id,
          sel: odd.sel,
          text: odd.text,
          doc: odd.doc,
          msg: `${sib.length} cards of one kind (.${c}) side by side in ${used.length} fills, each used twice or more: ${used.map(g => `${g.key} (${g.items.length})`).join(", ")}`,
        });
      }
    }
    // striped rows (every other row filled) drawn two ways on one page: inset with round ends in one list, edge to edge
    // and square in another
    const stripes = [];
    for (const p of document.body.querySelectorAll("ul, ol, tbody, dl, div")) {
      const kids = [...p.children].filter(k => !SKIP.has(k.tagName));
      if (
        kids.length < 3
        || new Set(kids.map(k => k.tagName)).size > 1
        || inDrawn(p)
        || inFixed(p)
        || p.closest("header, nav, dialog, [data-ui], .ui[class*=ui-]")
        || !visible(p)
      )
        continue;
      const f = kids.map(k => {
        const b = rgba(CS(k).backgroundColor);
        return b.a >= 0.3 ? hex(b) : "none";
      });
      const A = f.filter((x, i) => i % 2 === 0),
        B = f.filter((x, i) => i % 2 === 1);
      if (new Set(A).size !== 1 || new Set(B).size !== 1 || A[0] === B[0]) continue;
      const k = kids[A[0] !== "none" ? 0 : 1],
        q = k.getBoundingClientRect();
      if (q.height > 140 || q.width < 200) continue;
      const rad = Math.round(parseFloat(CS(k).borderTopLeftRadius) || 0),
        bleed = q.width >= vw - 4;
      stripes.push({
        id: idOf(p),
        sel: sel(p),
        text: label(k),
        doc: doc(p),
        rad,
        bleed,
        look: `${bleed ? "edge to edge" : "inset"}, ${rad ? rad + "px round ends" : "square ends"}`,
      });
    }
    {
      const looks = [...new Set(stripes.map(x => x.look))];
      if (looks.length >= 2) {
        const by = looks.map(l => stripes.filter(x => x.look === l)).sort((a, b) => a.length - b.length),
          odd = by[0][0];
        cardFam.push({
          sev: "FAIL",
          id: odd.id,
          sel: odd.sel,
          text: odd.text,
          doc: odd.doc,
          ref: by[by.length - 1][0].doc,
          msg: `striped rows drawn ${looks.length} ways: ${by.map(g => `${g[0].look} (${g.length} list${g.length > 1 ? "s" : ""}, like "${g[0].text.slice(0, 20)}")`).join("; ")}`,
        });
      }
    }
    // a heading that the text under it outranks: the paragraph's letters (x-height) as tall as the heading's or taller
    const inkC = new Map();
    const ink = (c, ch) => {
      const key = [c.fontStyle, c.fontWeight, c.fontSize, c.fontFamily, ch].join("|");
      if (!inkC.has(key)) {
        cx.font = `${c.fontStyle} ${c.fontWeight} ${c.fontSize} ${c.fontFamily}`;
        inkC.set(key, cx.measureText(ch).actualBoundingBoxAscent || 0);
      }
      return inkC.get(key);
    };
    const outranked = [];
    for (const h of document.querySelectorAll("h2, h3")) {
      if (
        inDrawn(h)
        || inFixed(h)
        || inChrome(h)
        || h.closest("footer, dialog, [data-ui], .ui[class*=ui-]")
        || !visible(h)
      )
        continue;
      const hc = CS(h),
        hfs = parseFloat(hc.fontSize) || 16;
      if (hfs < 22) continue; // a small label over a statement is an eyebrow
      const hq = h.getBoundingClientRect();
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      w.currentNode = h;
      let e,
        nx = null,
        nb = null;
      while ((e = w.nextNode())) {
        if (h.contains(e) || inDrawn(e) || e.closest(INTER)) continue;
        if (e.matches(HEADS) || e.closest(HEADS)) break;
        // the first text after it, read as its block (a paragraph set word by word in spans is one paragraph)
        if (ownText(e) && visible(e)) {
          const b = e.closest("p, li, dd, blockquote, figcaption") || e;
          if (full(b).length >= 24) {
            nx = e;
            nb = b;
          }
          break;
        }
      }
      if (!nx) continue;
      const nq = nb.getBoundingClientRect();
      if (nq.top - hq.bottom > 160 || nq.top < hq.bottom - 4 || nq.left >= hq.right || nq.right <= hq.left) continue; // under it, near it
      const nc = CS(nx),
        up = hc.textTransform === "uppercase";
      const a = ink(hc, up ? "H" : "x"),
        b = ink(nc, "x");
      if (!a || !b) continue;
      const k = b / a;
      if (k < 0.92) continue;
      outranked.push({
        sev: k >= 1.0 ? "FAIL" : "WARN",
        id: idOf(h),
        sel: sel(h),
        text: label(h),
        doc: doc(h),
        msg: `the text under this ${h.tagName.toLowerCase()} reads ${k >= 1 ? "larger" : "as large"}: its letters are ${b.toFixed(1)}px tall (x-height, ${nc.fontSize}) against the heading's ${a.toFixed(1)}px (${up ? "capitals" : "x-height"}, ${hc.fontSize})`,
      });
    }
    // link-styles: text links (not buttons, not the nav) in more than two looks
    const linkLooks = new Map();
    for (const a of document.querySelectorAll("a[href]")) {
      if (
        inDrawn(a)
        || inFixed(a)
        || inChrome(a)
        || a.closest("dialog")
        || !visible(a)
        || buttonLook(a, true)
        || !/\p{L}/u.test(full(a))
        || full(a).length > 60
        || a.querySelector("img, picture, video")
      )
        continue;
      if (/^(#|#top|\/|\.\/|index\.html)?$/.test(a.getAttribute("href").trim())) continue; // the brand's link home
      const c = CS(a),
        line = /underline/.test(c.textDecorationLine),
        bb = parseFloat(c.borderBottomWidth) || 0;
      // a box drawn by a faint outline on all four sides (a secondary button) is a button, not a text link
      if (
        bb >= 1
        && ["Top", "Left", "Right"].every(
          s => (parseFloat(c["border" + s + "Width"]) || 0) >= 1 && c["border" + s + "Style"] !== "none",
        )
      )
        continue;
      // at rest: an underline drawn as a background line (the motion layer's hairline that draws on hover) is an
      // underline when a layer of it shows, no line when none does
      const u =
        line ? "underline"
        : bb >= 1 && c.borderBottomStyle !== "none" ? `border ${Math.round(bb * 2) / 2}px`
        : lineImage(c) ?
          lineShows(c) ? "underline"
          : "no line"
        : c.backgroundImage && c.backgroundImage !== "none" ? "drawn line"
        : "no line";
      const key = `${u}, ${+c.fontWeight >= 600 ? "bold" : "regular"}`;
      if (!linkLooks.has(key)) linkLooks.set(key, []);
      linkLooks.get(key).push({ id: idOf(a), sel: sel(a), text: full(a).slice(0, 40), doc: doc(a) });
    }
    // one action in two looks: the same words a button in one place and a text link in another
    const twoLooks = [];
    {
      const nk = t =>
        String(t)
          .toLowerCase()
          .replace(/[→←↗›»>→]+/g, " ")
          .replace(/[^\p{L}\p{N} ]+/gu, "")
          .replace(/\s+/g, " ")
          .trim();
      const boxed = new Map();
      for (const b of document.querySelectorAll(INTER)) {
        if (
          inDrawn(b)
          || inFixed(b)
          || inChrome(b)
          || !visible(b)
          || b.matches('[role="tab"], [aria-selected], [aria-pressed]')
          || b.closest('[role="tablist"], footer')
        )
          continue;
        const bc = CS(b),
          four = ["Top", "Right", "Bottom", "Left"].every(
            s => (parseFloat(bc["border" + s + "Width"]) || 0) >= 1 && bc["border" + s + "Style"] !== "none",
          );
        if (buttonLook(b, true) || four) {
          const k = nk(full(b));
          if (k.length >= 4 && !boxed.has(k)) boxed.set(k, b);
        }
      }
      // (a footer's sitemap repeats the page's actions as links on purpose)
      for (const items of linkLooks.values())
        for (const it of items) {
          const ie = els.get(it.id);
          if (ie && ie.closest('footer, nav, [role="navigation"]')) continue;
          const k = nk(it.text),
            b = boxed.get(k);
          if (b && !twoLooks.some(x => x.k === k))
            twoLooks.push({ k, id: it.id, sel: it.sel, text: it.text, doc: it.doc, other: doc(b) });
        }
    }
    const brandEl = document.querySelector(
      'header a[href="/"], header a[href="./"], header a[href="#top"], header a[href="#"], .nav__logo, [class*="logo"] a, a[class*="logo"], a[class*="brand"]',
    );
    const meta = document.querySelector('meta[name="description"]');
    const credits =
      LIBRARY.test(document.body.innerText || "") ?
        (document.body.innerText.match(new RegExp(LIBRARY.source, "ig")) || []).slice(0, 6)
      : [];
    return {
      vw,
      vh,
      heads,
      big,
      title: document.title || "",
      description: meta ? meta.getAttribute("content") || "" : "",
      brand: brandEl ? full(brandEl).slice(0, 40) : "",
      h1: h1 ? { id: idOf(h1), sel: sel(h1), text: full(h1), doc: doc(h1) } : null,
      after,
      heroText: heroText.replace(/\s+/g, " ").trim().slice(0, 3000),
      hero: hero ? { sel: sel(hero), doc: doc(hero) } : null,
      last:
        last && last !== hero ?
          { sel: sel(last), doc: doc(last), text: label(last.querySelector("h1, h2, h3") || last) }
        : null,
      ctas,
      priced: priced.filter(p => !p.act).map(({ el, act, ...p }) => p),
      longBare,
      links,
      pages,
      navLinks,
      credits,
      cardFam,
      outranked,
      twoLooks,
      linkLooks: [...linkLooks].map(([look, items]) => ({ look, n: items.length, first: items[0] })),
    };
  }
  // pictures that show only on hover or focus: hidden at rest inside a card or link that is shown
  function hiddenCands() {
    const out = [];
    for (const e of document.querySelectorAll("img, video, picture, canvas, [data-ui], .ui[class*=ui-]")) {
      if (
        inChrome(e, 'dialog, [role="menu"], .nav__menu, details:not([open]), [hidden]')
        || inFixed(e)
        || (e.parentElement && e.parentElement.closest("[data-ui], .ui[class*=ui-]"))
      )
        continue;
      const r = e.getBoundingClientRect();
      if (r.width < 80 || r.height < 60) continue;
      if (effOpacity(e) >= 0.05 && CS(e).visibility !== "hidden") continue;
      const host = e.closest("a[href], button, [tabindex], article, li, .card") || e.parentElement;
      if (!host || !shown(host)) continue;
      const hr = host.getBoundingClientRect();
      if (hr.width < 1) continue;
      out.push({ id: idOf(e), host: idOf(host), sel: sel(e), hsel: sel(host), doc: D(hr) });
      if (out.length >= 12) break;
    }
    return out;
  }
  function isShownNow(id) {
    fresh();
    const e = els.get(id);
    return !!e && effOpacity(e) >= 0.4 && CS(e).visibility !== "hidden";
  }
  // cards and link cards, hovered one by one for hover-spill
  function hoverCands() {
    const vw = vwNow(),
      out = [],
      picked = [];
    for (const e of document.body.querySelectorAll("a[href], .card, article, li")) {
      if (inFixed(e) || inDrawn(e) || inChrome(e, "footer, dialog")) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 120 || r.height < 80 || r.width > vw * 0.9 || !shown(e, r)) continue;
      if (!surface(e) && !e.querySelector("img, video")) continue;
      if (picked.some(o => o.contains(e) || e.contains(o))) continue;
      picked.push(e);
      out.push({
        id: idOf(e),
        sel: sel(e),
        text: label(e),
        doc: D(r),
        linked: e.matches("a[href]") || !!e.querySelector("a[href]"),
      });
      if (out.length >= 30) break;
    }
    return out;
  }
  // a hovered card's own move and its picture's zoom (house rule: a linked card lifts 2px, a photo zooms 1.02-1.03
  // inside its frame, nothing tilts): the card's transform and translate, and the largest scale of a picture inside it
  function hoverXf(id) {
    const e = els.get(id);
    if (!e) return null;
    const mx = el => {
      const c = getComputedStyle(el);
      let m;
      try {
        m = new DOMMatrix(c.transform === "none" ? undefined : c.transform);
      } catch (x) {
        m = new DOMMatrix();
      }
      const t = c.translate && c.translate !== "none" ? c.translate.split(/\s+/).map(parseFloat) : [0, 0];
      const sc = c.scale && c.scale !== "none" ? parseFloat(c.scale) : 1;
      const rot = c.rotate && c.rotate !== "none" ? parseFloat(c.rotate) || 0 : 0;
      return {
        flat: m.is2D,
        deg: Math.round(((Math.atan2(m.b, m.a) * 180) / Math.PI + rot) * 10) / 10,
        ty: Math.round((m.f + (t[1] || 0)) * 10) / 10,
        s: Math.round(Math.hypot(m.a, m.b) * sc * 1000) / 1000,
      };
    };
    let pic = 1;
    for (const p of e.querySelectorAll("img, picture, video")) {
      const q = mx(p);
      pic = Math.max(pic, q.s);
    }
    return Object.assign(mx(e), { pic: Math.round(pic * 1000) / 1000 });
  }
  // everything a hover can change on a card and what is in it (its own look, its pictures' scale, its parts), read at rest and hovered:
  // a card whose signature is the same hovered shows no change at all (hover-move). What runs by itself (a fragment, a loop, a canvas,
  // a pulse) is left out: it changes without the pointer
  function hoverSig(id) {
    const e = els.get(id);
    if (!e) return null;
    const keys = [
      "transform",
      "translate",
      "scale",
      "rotate",
      "opacity",
      "boxShadow",
      "backgroundColor",
      "backgroundImage",
      "backgroundSize",
      "backgroundPosition",
      "color",
      "borderTopColor",
      "borderBottomColor",
      "outlineStyle",
      "filter",
      "textDecorationLine",
      "textDecorationColor",
      "letterSpacing",
      "clipPath",
    ];
    const sig = (x, ps) => {
      const c = getComputedStyle(x, ps);
      return keys.map(k => c[k]).join("|") + (ps ? "|" + c.content + "|" + c.width + "|" + c.height : "");
    };
    const LOOP = "[data-ui], .ui[class*=ui-], [data-m-loop], [data-ui-loop], [data-diagram], [data-fx], canvas, video";
    const parts = [sig(e), sig(e, "::before"), sig(e, "::after")];
    for (const k of [...e.querySelectorAll("*")].slice(0, 80)) {
      if (k.closest(LOOP)) continue;
      parts.push(sig(k));
      if (/^(A|BUTTON)$/.test(k.tagName) || k.querySelector("svg")) {
        parts.push(sig(k, "::after"));
        parts.push(sig(k, "::before"));
      }
    }
    const r = e.getBoundingClientRect();
    return { sig: parts.join("#"), r: R(r), motion: document.documentElement.hasAttribute("data-motion") };
  }
  function hoverBox(id) {
    const e = els.get(id);
    if (!e) return null;
    const r = e.getBoundingClientRect(),
      p = e.parentElement,
      pr = p.getBoundingClientRect(),
      pc = getComputedStyle(p);
    return {
      r: R(r),
      box: {
        left: pr.left + (parseFloat(pc.paddingLeft) || 0),
        right: pr.right - (parseFloat(pc.paddingRight) || 0),
        top: pr.top,
        bottom: pr.bottom,
      },
      vw: vwNow(),
      vh: innerHeight,
    };
  }
  // the site's bar (a header under 200px at the top of the page, its wordmark and links): its own small motion is not a
  // visual; a hero written as <header class="hero"> is a section like any other
  const inSiteBar = e => {
    const h = e.closest('header, [role="banner"]');
    if (!h) return false;
    const r = h.getBoundingClientRect();
    return r.height < 200 && r.top + scrollY < 120;
  };
  // visuals that may loop: grounds, fragments, canvases, films, endless CSS animations
  function loopCands() {
    const out = [],
      picked = [];
    const take = e => {
      if (
        inFixed(e)
        || e.closest('dialog, nav, [role="navigation"]')
        || inSiteBar(e)
        || picked.some(o => o.contains(e))
      )
        return;
      const r = e.getBoundingClientRect();
      if (r.width < 60 || r.height < 40 || !shown(e, r)) return;
      for (let i = picked.length - 1; i >= 0; i--)
        if (e.contains(picked[i])) {
          picked.splice(i, 1);
          out.splice(i, 1);
        }
      picked.push(e);
      out.push({ id: idOf(e), sel: sel(e), text: label(e), doc: D(r) });
    };
    for (const e of document.querySelectorAll(".panel, .panel__screen, .frame, [data-fx], [data-fx-mounted]"))
      if (e.querySelector("canvas, [data-ui], .ui[class*=ui-]") || e.matches("[data-fx], [data-fx-mounted]")) take(e);
    for (const e of document.querySelectorAll("[data-ui], .ui[class*=ui-], canvas, video")) {
      if (e.tagName === "VIDEO" && e.controls) continue;
      take(e);
    }
    if (document.getAnimations)
      for (const a of document.getAnimations()) {
        try {
          if (a.effect.getComputedTiming().iterations !== Infinity) continue;
        } catch {
          continue;
        }
        const e = a.effect && a.effect.target;
        if (e instanceof Element) take(e);
      }
    return out.slice(0, 40);
  }
  const PAUSE = /pause|play|stop|resume|motion|animation/i;
  const PAUSE_LABEL = /\b(pause|play|stop|resume|freeze)\b|\b(motion|animation)s?\b/i;
  function pauseFor(id) {
    const e = els.get(id);
    if (!e) return true;
    if (e.tagName === "VIDEO" && e.controls) return true;
    // a pause control says so: aria-pressed, or a label or title that names pausing, or a short label that starts with
    // pause, play, stop or resume ("Plan your stop" is no pause button)
    const ctl = b => {
      const r = b.getBoundingClientRect();
      if (r.width < 8 || !shown(b, r)) return false;
      const lab = [b.getAttribute("aria-label"), b.getAttribute("title")].filter(Boolean).join(" "),
        txt = (b.textContent || "").trim();
      return (
        (b.hasAttribute("aria-pressed") && PAUSE.test(lab + " " + txt + " " + String(b.className)))
        || PAUSE_LABEL.test(lab)
        || (txt.length <= 24 && /^(pause|play|stop|resume|freeze)\b/i.test(txt))
        || (b.getAttribute("role") === "switch" && /motion|animation/i.test(lab + " " + txt))
      );
    };
    const host =
      e.closest("[data-ui-pause-host], .panel__screen, .panel, .frame, figure, .card")
      || sectionOf(e)
      || e.parentElement;
    for (const b of [
      ...host.querySelectorAll('button, [role="button"], [role="switch"]'),
      ...(host.parentElement ? host.parentElement.querySelectorAll(':scope > button, :scope > [role="button"]') : []),
    ])
      if (ctl(b)) return true;
    for (const b of document.querySelectorAll('button, [role="button"], [role="switch"]'))
      if (
        /motion|animation/i.test((b.getAttribute("aria-label") || "") + " " + b.textContent)
        && !host.contains(b)
        && shown(b)
        && !sectionOf(b)
      )
        return true;
    return false;
  }
  function viewRect(id) {
    const e = els.get(id);
    return e && e.isConnected ? R(clipRect(e, e.getBoundingClientRect())) : null;
  }
  // forms: filled with test values and submitted with every request held in the browser (the caller fulfils them)
  function formsList() {
    return [...document.querySelectorAll("form")]
      .filter(f => !inDrawn(f) && shown(f))
      .map(f => ({
        id: idOf(f),
        sel: sel(f),
        action: f.getAttribute("action"),
        text: label(f),
        doc: D(f.getBoundingClientRect()),
      }));
  }
  async function trySubmit(id) {
    const f = els.get(id);
    if (!f) return null;
    const day = new Date(Date.now() + 864e5 * 40).toISOString().slice(0, 10);
    for (const i of f.querySelectorAll("input, textarea, select")) {
      if (i.disabled || /^(hidden|submit|button|reset|image|file)$/.test(i.type)) continue;
      if (i.tagName === "SELECT") {
        if (!i.value && i.options.length > 1) i.selectedIndex = 1;
        continue;
      }
      if (i.type === "checkbox") {
        if (i.required) i.checked = true;
        continue;
      }
      if (i.type === "radio") {
        if (!f.querySelector(`input[type="radio"][name="${CSS.escape(i.name)}"]:checked`)) i.checked = true;
        continue;
      }
      if (i.value) continue;
      const t = i.type;
      i.value =
        t === "email" ? "test@example.com"
        : t === "tel" ? "+10000000000"
        : t === "number" || t === "range" ? i.min || "1"
        : t === "date" ?
          i.min && i.min > day ?
            i.min
          : day
        : t === "url" ? "https://example.com"
        : t === "time" ? "12:00"
        : "Test";
      i.dispatchEvent(new Event("input", { bubbles: true }));
      i.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const res = { native: false, prevented: false, opened: [], before: full(f) };
    const onSubmit = e => {
      if (e.target !== f) return;
      res.native = true;
      res.prevented = e.defaultPrevented;
      e.preventDefault();
    };
    window.addEventListener("submit", onSubmit);
    const oo = window.open;
    window.open = u => {
      res.opened.push(String(u));
      return null;
    };
    const os = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function () {
      if (this === f) {
        res.native = true;
        res.prevented = false;
      }
    };
    const nv = f.noValidate;
    f.noValidate = true;
    const btn = f.querySelector('button:not([type="button"]):not([type="reset"]), input[type="submit"]');
    try {
      if (btn) btn.click();
      else f.requestSubmit();
    } catch (e) {
      res.error = String(e).slice(0, 120);
    }
    await wait(1600);
    window.removeEventListener("submit", onSubmit);
    window.open = oo;
    HTMLFormElement.prototype.submit = os;
    f.noValidate = nv;
    res.after = full(f);
    res.action = f.getAttribute("action");
    res.actionUrl = (() => {
      try {
        return f.getAttribute("action") ? new URL(f.getAttribute("action"), location.href).href : null;
      } catch {
        return null;
      }
    })();
    return res;
  }

  // ------------------------------------------------ checks added in the second pass: faults of the first test pages a
  // script can decide. What a builder leaves on the page (a bracketed placeholder, a "sample" tag on every figure, a
  // caption that says how a picture was made or apologises for it), an effect or a card layout used too often, boxes
  // three deep, plan cards for what is no subscription, a second column that starts somewhere new in every section, a
  // caption touching its picture, rows closer to each other than a picture to its own caption (text in grey: inkCands)
  // a bracket holding a stand-in noun ("[Editor name]", "[Company]"); a bracket set round real words is a design device
  const PH_WORD =
    /\b(name|names|company|client|customer|brand|date|price|city|town|address|e-?mail|phone|logo|photo|image|picture|title|link|url|number|amount|quote|author|role|product|location|headline|copy|tagline|insert|placeholder|tbd|tbc|here)\b/i;
  const PH_TEXT =
    /\blorem ipsum\b|\bto be (replaced|confirmed|added|written|announced)\b|\b(your|client'?s?) (name|company|logo|photo|text|quote) here\b|\bplaceholder\b|\bBeispiel\p{L}*|\bMuster(stra(ss|ß)e|name|stadt)\b/iu;
  const PH_CAPS = /\bTODO\b|\bTBD\b|\bX{3,}\b|\{\{[^}\n]{1,40}\}\}/;
  function placeholderIn(t) {
    for (const m of t.matchAll(/\[([^\]\n]{2,48})\]/g)) {
      const x = m[1].trim();
      if (/\p{L}/u.test(x) && PH_WORD.test(x)) return m[0];
    }
    const a = t.match(PH_TEXT) || t.match(PH_CAPS);
    return a ? a[0] : null;
  }
  // "sample" as a builder's tag on a figure, a price, an address or a quote (not a free sample a shop gives away)
  const SAMPLE =
    /\(\s*samples?\b[^)]{0,40}\)|\bsamples? (figures?|prices?|hours|quotes?|address(es)?|data|terms?|dates?|numbers?|names?|rooms?|details|coordinates|answers?|reviews?|copy|text|photos?|pictures?|images?|plans?|menus?|coffees?|products?|items?|map|contacts?|times?|figures? and)\b|\b(are|is|as|marked( as)?|all) samples?\b|^\s*samples?\b|\bsamples? only\b|\bsamples? until\b|\bsamples?\s*[:;]/im;
  // a line about the page itself: how a picture was made, what will come later, what the client has not sent
  const NOTE = new RegExp(
    [
      String.raw`\b(drawn|made|rendered|painted|printed|coded|generated) (in|with|by) (code|css|svg|webgl|canvas|the browser)\b`,
      String.raw`\b(a|an) (drawing|render(ing)?|illustration|stand-?in) of\b[^.]{0,60}\b(code|follow|until|instead)\b`,
      String.raw`\bphotograph(s|y)?\b[^.]{0,60}\b(follow|to come|will be added|will follow|later|yet)\b`,
      String.raw`\bnot [^.]{0,40}\bown (photo|photograph|picture|image|product|place|room)`,
      String.raw`\bhas (none|no [a-z]+) yet\b`,
      String.raw`\bnot (supplied|provided|sent|shared) (any|them|it|one|ones)? ?yet\b`,
      String.raw`\buntil [^.]{0,40}\b(confirms?|supplies|sends|provides|approves|replaces)\b`,
      String.raw`\bstand-?in (photo|photograph|picture|image)`,
      String.raw`\bfor illustration( only)?\b`,
      String.raw`\billustrative only\b`,
      String.raw`\b(imprint|address|details|prices|photos|photographs|pictures|images|menu|hours|reviews|legal)\b[^.]{0,30}\bto follow\b`,
      String.raw`\bto follow\s*[.)]?\s*$`,
      String.raw`\bnot (a |an )?(real|actual) (photo|photograph|picture|product|customer|quote|address)`,
      // where the picture comes from instead of what it shows ("A similar bar in Lisbon, not ours")
      String.raw`\bnot ours\b|\bnot (our|the client'?s?) (own |actual |real )?(bar|room|caf[eé]|shop|kitchen|space|house|bike|photo|photograph|picture|image)s?\b`,
      String.raw`\bstock (photo(graph)?|image|picture|shot|footage)s?\b|\b(example|sample|placeholder|representative|generic) (photo(graph)?|image|picture|shot)s?\b`,
      String.raw`\b(photo(graph)?|image|picture)s? (is|are) (representative|illustrative|for illustration|an example|examples|not (of )?ours)\b|\b(photo(graph)?|image|picture)s? for illustration\b`,
    ].join("|"),
    "im",
  );
  const CREDIT =
    /\b(CC[ -]?BY(-[A-Z]{2})*( \d\.\d)?|CC0|Creative Commons|public domain|Wikimedia|Unsplash|Pexels|Pixabay|photo(graph)? by)\b/i;
  // a UI fragment: the ui kit's, and the layout kit's own drawn windows, panes and cards (assets/layout/demo.css) when
  // they are drawn mocks (aria-hidden, or inside a role="img" picture); a .d-card reused as a page's real card is a card
  const FRAG =
    '[data-ui], .ui[class*=ui-], [aria-hidden="true"]:is(.d-win, .d-pane, .d-card), [role="img"] :is(.d-win, .d-pane, .d-card)';
  const PATTERN_FX = new Set([
    "grid-pulse",
    "contour-lines",
    "dot-terrain",
    "dotted-globe",
    "ridgeline",
    "ruled-grounds",
  ]);
  const blockOf = e => {
    let b = e;
    while (b && b !== document.body && /^(inline|contents)/.test(CS(b).display) && !b.matches("a, button, label"))
      b = b.parentElement;
    return b || e;
  };
  const fxOf = e =>
    (e.getAttribute("data-fx") || e.getAttribute("data-cx-effect") || e.getAttribute("data-glow") || "").trim();
  function audit(families) {
    fresh();
    const vw = vwNow(),
      vh = innerHeight,
      S = sectionsList();
    const doc = e => D(e.getBoundingClientRect());
    const visible = e => {
      const r = e.getBoundingClientRect();
      return r.width >= 1 && r.height >= 1 && shown(e, r);
    };
    const secKey = e => {
      const i = secIndex(e);
      return i >= 0 ? i : -1;
    };
    const secSel = i => (S[i] ? sel(S[i]).split(" > ").pop() : "outside the sections");
    const fam = families || {};
    const isPattern = id => (fam[id] ? fam[id] === "pattern" : PATTERN_FX.has(id));
    const out = {
      placeholders: [],
      stand: [],
      samples: [],
      notes: [],
      credits: [],
      effects: [],
      groups: [],
      sections: [],
      nests: [],
      tiers: [],
      splits: [],
      touch: [],
      rows: [],
    };
    // 1. text the builder left: placeholders, sample tags, notes about the page, credits under a picture
    const blocks = new Set();
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) {
      if (!/\S/.test(n.nodeValue)) continue;
      const p = n.parentElement;
      if (!p || SKIP.has(p.tagName) || p.closest("code, pre, kbd, samp, script, style, noscript, template")) continue;
      const b = blockOf(p);
      if (blocks.has(b)) continue;
      if (!visible(p)) continue;
      blocks.add(b);
    }
    for (const b of blocks) {
      const t = full(b);
      if (!t) continue;
      const it = () => ({ id: idOf(b), sel: sel(b), text: t.slice(0, 80), doc: doc(b), drawn: inDrawn(b) });
      const ph = placeholderIn(t);
      if (ph) out.placeholders.push(Object.assign(it(), { what: ph }));
      if (SAMPLE.test(t)) out.samples.push(it());
      // (a licence credit that names its source "... Free Stock Photos" is a credit, not a note about the page)
      const nw = NOTE.test(t) && t.length <= 400 ? (t.match(NOTE) || [""])[0] : null;
      if (nw && !(/stock/i.test(nw) && (CREDIT.test(t) || b.closest("footer"))))
        out.notes.push(Object.assign(it(), { what: nw }));
      else if (
        CREDIT.test(t)
        && t.length <= 160
        && !b.closest("footer")
        && (b.closest("figcaption, figure")
          || (() => {
            const pv = b.previousElementSibling;
            return !!(
              pv
              && (MEDIA.has(pv.tagName)
                || pv.matches("figure, picture, .frame, .panel, [data-fx]")
                || pv.querySelector("img, picture, canvas, video"))
            );
          })())
      )
        out.credits.push(it());
    }
    // a contact or link left on a stand-in domain (.example, example.com): it must be the client's before the page ships
    {
      const ex = [...document.querySelectorAll("a[href]")].filter(
        a =>
          /^(mailto:[^?]*@|tel:|https?:\/\/)[^?#]*\b(example\.(com|org|net)|\.example|\.invalid|\.test)\b/i.test(
            a.getAttribute("href"),
          )
          && !/^mailto:[^?]*@(?:[\w-]+\.)*[\w-]+\.example(?:$|[?#])/i.test(a.getAttribute("href"))
          && !inDrawn(a),
      ); // (CO-68: a mailto: on .example is the house "Email us" button, not a leftover)
      if (ex.length) {
        const a0 = ex.find(visible) || ex[0];
        out.stand.push({
          id: idOf(a0),
          sel: sel(a0),
          text: (full(a0) || a0.getAttribute("href")).slice(0, 60),
          n: ex.length,
          href: a0.getAttribute("href").slice(0, 60),
          doc: visible(a0) ? doc(a0) : null,
        });
      }
    }
    // 2. effect ids by section (an effect id in at most two sections)
    const fxBy = new Map();
    for (const e of document.querySelectorAll("[data-fx], [data-cx-effect], [data-glow]")) {
      const id = fxOf(e);
      if (!id || id.startsWith("[")) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 1 && r.height < 1 && !e.closest('[hidden], [role="tabpanel"]')) continue;
      if (!fxBy.has(id)) fxBy.set(id, { els: [], secs: new Set() });
      const m = fxBy.get(id);
      m.els.push(e);
      m.secs.add(secKey(e));
    }
    for (const [id, m] of fxBy)
      if (m.secs.size > 2)
        out.effects.push({
          fx: id,
          n: m.els.length,
          secs: [...m.secs].sort((a, b) => a - b).map(secSel),
          id: idOf(m.els[0]),
          sel: sel(m.els[0]),
          doc: doc(m.els[0]),
          more: m.els.slice(1, 6).map(doc),
        });
    // 3. card layouts: sibling cards drawn one way (the same panel, ground, placement and fragment), and one section
    // layout of the kit (.frame--split, .card--row ...) in more than two sections
    const kitCls = e =>
      [...e.classList]
        .filter(
          c => !/^(span|start|end|col|row|order|is|has|js)-|^(enter|in|on|active|reveal|visible|stack)(-\d+)?$/.test(c),
        )
        .sort()
        .join(".");
    const placeOf = e =>
      [
        ...new Set(
          [...e.querySelectorAll("[class]")].flatMap(x =>
            [...x.classList].filter(c => /^(at-[\w-]+|fit|to-edge|wide)$/.test(c)),
          ),
        ),
      ]
        .sort()
        .join("+");
    const groundOf = e => {
      const g = e.matches("[data-fx]") ? e : e.querySelector("[data-fx]");
      if (!g) return "";
      let p = g.getAttribute("data-fx-params") || "";
      return fxOf(g) + (p ? " " + p : "") + (g.getAttribute("data-fx-palette") || "");
    };
    const fragOf = e =>
      [...e.querySelectorAll(FRAG)]
        .filter(f => !(f.parentElement && f.parentElement.closest(FRAG)))
        .map(f => f.getAttribute("data-ui") || [...f.classList].filter(c => /^ui-/.test(c)).join("."))
        .sort()
        .join("+");
    const seenG = new Set();
    for (const p of document.body.querySelectorAll("*")) {
      if (p.children.length < 3 || inFixed(p) || p.closest(FRAG) || inChrome(p, "footer")) continue;
      const kids = [...p.children].filter(k => !SKIP.has(k.tagName) && visible(k));
      const cards = kids.filter(k => {
        const q = k.getBoundingClientRect();
        return (
          q.width >= 140
          && q.height >= 90
          && q.width < vw * 0.9
          && (k.matches(FRAG + ", [data-fx]") || k.querySelector(FRAG + ", [data-fx], img, video, canvas"))
          && (surface(k)
            || k.matches("[data-fx], .card, .panel, .tile, .frame")
            || k.querySelector("[data-fx], .panel, .frame"))
        );
      });
      if (cards.length < 3 || cards.length < kids.length - 2 || seenG.has(p)) continue;
      seenG.add(p);
      const info = cards.map(k => ({ k, cls: kitCls(k), ground: groundOf(k), place: placeOf(k), frag: fragOf(k) }));
      out.groups.push({
        id: idOf(p),
        sel: sel(p),
        text: label(cards[0]),
        sec: secKey(p),
        n: cards.length,
        doc: doc(p),
        cards: info.map(({ k, ...x }) => Object.assign(x, { doc: doc(k) })),
      });
    }
    S.forEach((s, i) => {
      if (s.tagName === "FOOTER" || i === 0) return;
      const toks = new Set();
      for (const e of s.querySelectorAll("[class]")) {
        if (e.parentElement && e.parentElement.closest(FRAG)) continue;
        for (const c of e.classList)
          if (
            /^(frame|card|panel|plan|tile|bento)(--[\w-]+)?$/.test(c)
            && !/--(hero|cta|flip|inset|flush|top|device)$/.test(c)
          )
            toks.add(c);
      }
      const key = [...toks]
        .filter(c => /--/.test(c) || c === "plan" || c === "bento")
        .sort()
        .join(" ");
      if (key) out.sections.push({ i, key, id: idOf(s), sel: sel(s).split(" > ").pop(), doc: doc(s) });
    });
    // 4. boxes three deep: a UI card on a patterned or plain panel inside a card; a text box inside two boxes
    const boxK = e => {
      if (e.matches("[data-fx], [data-fx-mounted]")) return "ground";
      if (e.matches(FRAG)) return "fragment";
      const k = quickKind(e);
      return k && k !== "media" && k !== "shadow" ? k : null;
    };
    const chainOf = (start, stop) => {
      const ch = [];
      for (let a = start; a && a !== stop && a !== document.body; a = a.parentElement) {
        const k = boxK(a);
        if (!k) continue;
        const q = a.getBoundingClientRect();
        if (q.width < 60 || q.height < 40 || q.width >= vw * 0.95 || isBand(q, vw)) continue;
        const last = ch[ch.length - 1];
        if (last && Math.abs(last.q.width - q.width) <= 6 && Math.abs(last.q.height - q.height) <= 6) {
          if (k === "ground") ((last.k = "ground"), (last.a = a));
          continue;
        } // one box drawn by two elements
        ch.push({ a, k, q });
      }
      return ch;
    };
    const toldN = new Set();
    for (const f of document.querySelectorAll(FRAG)) {
      if (f.parentElement && f.parentElement.closest(FRAG)) continue;
      if (!visible(f)) continue;
      const s = sectionOf(f);
      const ch = chainOf(f, s);
      if (ch.length < 3) continue;
      const mid = ch.slice(1, -1),
        outer = ch[ch.length - 1];
      const patterned = mid.find(x => x.k === "ground" && isPattern(fxOf(x.a.closest("[data-fx]") || x.a)));
      // a lit panel (cards.md: a soft field that reads as a picture, a gradient or a photograph, no border lines of its
      // own) is the card's picture, not a box: card > lit panel > fragment is two levels
      const lit = a => {
        if (a.querySelector(":scope > img, :scope > picture, :scope > canvas, :scope > video")) return true;
        const lc = CS(a),
          q = a.getBoundingClientRect();
        // a ground drawn as a pattern (grid paper, ruling, dots: a repeating gradient or small tiles) is a box, not a picture
        const tiled = c =>
          /repeating-/.test(c.backgroundImage)
          || String(c.backgroundSize || "")
            .split(",")
            .some(s => {
              const p = s
                .trim()
                .split(/\s+/)
                .map(v => (/px$/.test(v) ? parseFloat(v) : NaN));
              return p.some(v => v > 0 && v < 80);
            });
        const img = c =>
          c.backgroundImage
          && c.backgroundImage !== "none"
          && !lineImage(c)
          && (/url\(/.test(c.backgroundImage) || !tiled(c));
        if (img(lc) && !bordered(lc)) return true;
        // the kit's .panel: its ground with a soft vignette drawn as its ::before (ui/cards.css) reads as a lit field
        {
          const pb = getComputedStyle(a, "::before");
          if (
            pb.content !== "none"
            && pb.content !== "normal"
            && /gradient/.test(pb.backgroundImage || "")
            && !bordered(lc)
          )
            return true;
        }
        for (const k of a.children) {
          const kq = k.getBoundingClientRect();
          if (
            kq.width * kq.height >= 0.85 * q.width * q.height
            && (img(CS(k)) || k.matches("[data-fx], [data-fx-mounted]"))
          )
            return true;
        }
        return false;
      };
      const plain = mid.find(x => x.k !== "ground" && !lit(x.a));
      if (ch.length < 4 && !patterned && !plain) continue; // card > a lit picture > the fragment: two levels, as cards.md has it
      if (toldN.has(outer.a)) continue;
      toldN.add(outer.a);
      const why =
        patterned ? `a patterned ground (${fxOf(patterned.a.closest("[data-fx]") || patterned.a)})`
        : plain ? `a plain ${plain.k} box (${sel(plain.a).split(" > ").pop()})`
        : "boxes";
      out.nests.push({
        id: idOf(f),
        sel: sel(f),
        text: label(f),
        depth: ch.length,
        why,
        chain: ch.map(x => sel(x.a).split(" > ").pop()).reverse(),
        doc: doc(outer.a),
        sec: secKey(f),
      });
    }
    for (const e of document.body.querySelectorAll("p, h3, h4, li, dd")) {
      if (e.closest(FRAG) || e.closest(INTER) || inFixed(e) || inChrome(e, "footer") || !ownText(e) || !visible(e))
        continue;
      const ch = chainOf(e.parentElement, sectionOf(e)).filter(x => x.k !== "ground" || x.q.width >= 200);
      if (ch.length < 3 || toldN.has(ch[ch.length - 1].a)) continue;
      toldN.add(ch[ch.length - 1].a);
      out.nests.push({
        id: idOf(ch[0].a),
        sel: sel(ch[0].a),
        text: label(e),
        depth: ch.length,
        why: "text in a box in a box",
        chain: ch.map(x => sel(x.a).split(" > ").pop()).reverse(),
        doc: doc(ch[ch.length - 1].a),
        sec: secKey(e),
      });
    }
    // 5. plan cards: two or more priced cards side by side, each with its own button, or one marked "most popular"
    const SUB =
      /\/\s?(mo|month|yr|year|user|seat|editor|member)\b|\bper (month|year|user|seat|editor|member)\b|\ba (month|year)\b|\bmonthly\b|\byearly\b|\bannual(ly)?\b|\bbilled\b|\bsubscription\b/i;
    const FEAT = /\b(most popular|popular|recommended|best value|best seller|our pick)\b/i;
    const seenT = new Set();
    for (const p of document.body.querySelectorAll("*")) {
      if (p.children.length < 2 || p.closest(FRAG) || inFixed(p) || seenT.has(p)) continue;
      const kids = [...p.children].filter(k => !SKIP.has(k.tagName) && visible(k));
      if (kids.length < 2 || kids.length > 6) continue;
      const priced = kids.filter(k => {
        const q = k.getBoundingClientRect();
        return (
          q.width >= 150
          && q.height >= 120
          && q.width < vw * 0.6
          && PRICE.test(full(k))
          && (quickKind(k) || k.matches(".card, .plan, .tier"))
          && [...k.querySelectorAll("a[href], button")].some(visible)
        );
      });
      if (priced.length < 2 || priced.length < kids.length - 1) continue;
      const feat = priced.find(
        k =>
          FEAT.test(full(k))
          || /featured|highlight|popular|recommended/i.test(typeof k.className === "string" ? k.className : ""),
      );
      if (!feat && priced.length < 3) continue;
      seenT.add(p);
      const txt = priced.map(full).join(" ");
      out.tiers.push({
        id: idOf(p),
        sel: sel(p),
        text: label(priced[0]),
        n: priced.length,
        feat: feat ? label(feat).slice(0, 30) : "",
        sub: SUB.test(txt),
        night: /\bper (night|stay|person|guest)\b|\/\s?night\b|\ba night\b/i.test(txt),
        doc: doc(p),
        sec: secKey(p),
      });
    }
    for (const t of document.querySelectorAll('table, [class*="cmp"], [class*="compar"], [class*="versus"]')) {
      if (
        t.closest(FRAG)
        || !visible(t)
        || out.tiers.some(x => els.get(x.id) && (els.get(x.id).contains(t) || t.contains(els.get(x.id))))
      )
        continue;
      if (t.parentElement && t.parentElement.closest('table, [class*="cmp"], [class*="compar"]')) continue;
      const prices = (full(t).match(new RegExp(PRICE.source, "gu")) || []).length;
      const ticks =
        t.querySelectorAll('svg, [class*="check"], [class*="tick"]').length + (full(t).match(/[✓✔✗✕×—]/g) || []).length;
      if (prices >= 2 && ticks >= 3)
        out.tiers.push({
          id: idOf(t),
          sel: sel(t),
          text: label(t),
          n: prices,
          table: true,
          sub: SUB.test(full(t)),
          night: false,
          feat: "",
          doc: doc(t),
          sec: secKey(t),
        });
    }
    // 6. the second column of a two-column section: where it starts, section by section
    if (vw >= 1000)
      S.forEach((s, i) => {
        if (s.tagName === "FOOTER") return;
        for (const g of s.querySelectorAll("*")) {
          if (g.closest(FRAG) || inFixed(g) || (g.closest("[data-fx]") && !g.matches("[data-fx]"))) continue;
          const c = CS(g);
          if (!/grid|flex/.test(c.display) || (/flex/.test(c.display) && /column/.test(c.flexDirection))) continue;
          const gr = g.getBoundingClientRect();
          if (gr.width < vw * 0.6 || gr.height < 120) continue;
          const kids = [...g.children].filter(
            k => !SKIP.has(k.tagName) && visible(k) && !/absolute|fixed/.test(CS(k).position),
          );
          if (kids.length !== 2) continue;
          const [a, b] = kids.map(k => k.getBoundingClientRect());
          if (
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) < 40
            || a.width < gr.width * 0.2
            || b.width < gr.width * 0.2
          )
            continue;
          const k2 = a.left < b.left ? kids[1] : kids[0],
            q2 = k2.getBoundingClientRect();
          out.splits.push({
            sec: i,
            secSel: secSel(i),
            x: Math.round(q2.left),
            id: idOf(k2),
            sel: sel(k2),
            text: label(k2),
            doc: doc(k2),
          });
          break;
        }
      });
    // 7. a label or caption touching the picture or panel right above it; rows of a grid closer together than a
    // picture to its own caption
    const isVis = e =>
      MEDIA.has(e.tagName)
      || e.matches("svg, figure, picture, .frame, .panel, [data-fx], [data-fx-mounted], " + FRAG)
      || ["fill", "border", "effect", "picture"].includes(quickKind(e));
    for (const e of document.body.querySelectorAll("p, span, h3, h4, h5, figcaption, small, time, dt, dd")) {
      if (!ownText(e) || e.closest(FRAG) || e.closest(INTER) || inFixed(e) || !visible(e)) continue;
      let pv = e.previousElementSibling;
      while (pv && (SKIP.has(pv.tagName) || !visible(pv) || /absolute|fixed/.test(CS(pv).position)))
        pv = pv.previousElementSibling;
      if (!pv || !isVis(pv)) continue;
      const q = pv.getBoundingClientRect();
      if (q.height < 60 || q.width < 80) continue;
      const ls = deepLines(e);
      if (!ls.length) continue;
      const top = Math.min(...ls.map(l => l.top)),
        L = Math.min(...ls.map(l => l.left)),
        Rr = Math.max(...ls.map(l => l.right));
      if (Math.min(Rr, q.right) - Math.max(L, q.left) < 0.5 * (Rr - L)) continue;
      const gap = top - q.bottom;
      if (gap < -1 || gap >= 6) continue;
      out.touch.push({
        id: idOf(e),
        sel: sel(e),
        text: label(e),
        gap: Math.round(gap),
        doc: D({ left: L, top: q.bottom - 30, width: Rr - L, height: top - q.bottom + 50 }),
        ref: D(q),
      });
    }
    for (const g of document.body.querySelectorAll("*")) {
      if (g.closest(FRAG) || inFixed(g) || !/grid|flex/.test(CS(g).display)) continue;
      const items = [...g.children].filter(
        k => !SKIP.has(k.tagName) && visible(k) && !/absolute|fixed/.test(CS(k).position),
      );
      if (items.length < 4) continue;
      const qs = items.map(k => ({ k, q: k.getBoundingClientRect() }));
      const tops = [];
      for (const x of qs) if (!tops.some(t => Math.abs(t - x.q.top) < 6)) tops.push(x.q.top);
      tops.sort((a, b) => a - b);
      if (tops.length < 2) continue;
      const r1 = qs.filter(x => Math.abs(x.q.top - tops[0]) < 6),
        r2 = qs.filter(x => Math.abs(x.q.top - tops[1]) < 6);
      if (r1.length < 2 || r2.length < 2) continue;
      const rowGap = Math.min(...r2.map(x => x.q.top)) - Math.max(...r1.map(x => x.q.bottom));
      // inside an item: the picture or panel, then its title or caption under it
      const inner = [];
      for (const { k } of qs) {
        const kids = [...k.children].filter(c => !SKIP.has(c.tagName) && visible(c));
        for (let j = 0; j + 1 < kids.length; j++)
          if (isVis(kids[j]) && kids[j].getBoundingClientRect().height >= 60 && !isVis(kids[j + 1])) {
            inner.push(kids[j + 1].getBoundingClientRect().top - kids[j].getBoundingClientRect().bottom);
            break;
          }
      }
      if (inner.length < 2) continue;
      const iv = median2(inner);
      if (rowGap >= 0 && rowGap < 40 && rowGap <= iv * 1.25 + 2)
        out.rows.push({
          id: idOf(g),
          sel: sel(g),
          text: label(items[0]),
          gap: Math.round(rowGap),
          inner: Math.round(iv),
          doc: D({
            left: Math.min(...r1.map(x => x.q.left)),
            top: Math.max(...r1.map(x => x.q.bottom)) - 60,
            width: Math.max(...r1.map(x => x.q.right)) - Math.min(...r1.map(x => x.q.left)),
            height: rowGap + 120,
          }),
        });
    }
    return out;
  }
  const median2 = a => {
    const s = [...a].sort((x, y) => x - y),
      m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  // fade-cut ("rows fade out mid-word" on four pages): the lines of text in a drawn mock, a
  // panel or a card, with the colour their CSS gives them on their ground; the caller reads the screenshot and names a
  // line drawn far fainter than that (a mask or a gradient laid over the mock's edge erases it). A line under another
  // box of the mock (a note card over the page's text) is named here: cover
  const seenFade = new WeakSet();
  function fadeCands(view, vw, vh) {
    const out = [];
    for (const [el, r] of view) {
      if (out.length >= 160) break;
      if (!ownText(el) || seenFade.has(el) || r.top < 0 || r.bottom > vh || r.left < 0 || r.right > vw) continue;
      const host = el.closest(FRAG) || el.closest('.panel, .frame, .card, [class*="card"]');
      if (
        !host
        || inFixed(el)
        || el.closest('input, textarea, select, option, nav, header, footer, dialog, [role="menu"]')
      )
        continue;
      const c = CS(el);
      const fs = parseFloat(c.fontSize) || 16;
      if (fs < 11) continue;
      const col = rgba(c.color);
      if (col.a < 0.5) continue;
      if (c.webkitTextFillColor && rgba(c.webkitTextFillColor).a < 0.5) continue;
      if (/text/.test(String(c.backgroundClip) + String(c.webkitBackgroundClip))) continue;
      if (effOpacity(el) < 0.95) continue; // a row mid-fade in a loop: its opacity says so, no mask does
      let moving = false;
      for (let a = el; a && a !== host.parentElement; a = a.parentElement) {
        if (endless(a)) {
          moving = true;
          break;
        }
      }
      if (moving) continue;
      // (shortened with an ellipsis or a clamp: its words run past its own box, and cut-text tells it)
      if (
        (c.textOverflow === "ellipsis" || (c.webkitLineClamp && c.webkitLineClamp !== "none"))
        && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
      )
        continue;
      const ls = lines(el)
        .filter(l => l.width >= 14 && l.height >= 8 && l.top >= 0 && l.bottom <= vh)
        .slice(0, 2);
      if (!ls.length) continue;
      if (
        ls.some(l => {
          const v = clipRect(el, l);
          return v.width < l.width - 1 || v.height < l.height - 1 || l.right > r.right + 2 || l.left < r.left - 2;
        })
      )
        continue; // cut by an overflow: cut-text's
      const u = under((ls[0].left + ls[0].right) / 2, (ls[0].top + ls[0].bottom) / 2, el);
      if (u.kind !== "solid") continue;
      seenFade.add(el);
      // what is on top of the line's middle and its two quarters: another box of the mock with its own fill or words
      let cover = null;
      for (const L of ls)
        for (const fx of [0.25, 0.5, 0.75]) {
          const x = L.left + (L.right - L.left) * fx,
            y = (L.top + L.bottom) / 2,
            t = document.elementFromPoint(x, y);
          if (!t || t === el || el.contains(t) || t.contains(el) || inFixed(t)) continue;
          let box = null;
          for (let a = t; a && !a.contains(el); a = a.parentElement) {
            const ac = CS(a);
            if (rgba(ac.backgroundColor).a >= 0.85 || ownText(a)) {
              box = a;
              break;
            }
          }
          if (!box || cover || !host.contains(box)) continue;
          const bq = box.getBoundingClientRect();
          if (bq.width < 40 || bq.height < 16 || !full(box) || !shown(box, bq) || effOpacity(box) < 0.6) continue; // a cursor, a dot, a note faded out in its loop
          let runs = false;
          for (let a = box; a && a !== host; a = a.parentElement)
            if (endless(a)) {
              runs = true;
              break;
            }
          if (runs) continue;
          cover = { id: idOf(box), sel: sel(box), text: label(box) };
        }
      const a = col.a,
        bg = u.col,
        fg = { r: col.r * a + bg.r * (1 - a), g: col.g * a + bg.g * (1 - a), b: col.b * a + bg.b * (1 - a) };
      out.push({
        id: idOf(el),
        sel: sel(el),
        text: label(el),
        host: idOf(host),
        hostSel: sel(host),
        hostRect: R(host.getBoundingClientRect()),
        rects: ls.map(R),
        fg: hex(fg),
        bg: hex(bg),
        exp: Math.abs(lum(fg) - lum(bg)),
        fs: Math.round(fs),
        cover,
      });
    }
    return out;
  }
  // text on a plain ground: body text at 7:1 at least, captions, labels and muted lines at 4.5:1 (large type 4.5 and 3)
  const ink = { seen: new WeakSet() };
  function inkCands(view, out, vw, vh) {
    for (const [el, r] of view) {
      if (!ownText(el) || ink.seen.has(el) || r.top < 0 || r.bottom > vh) continue;
      if (
        el.closest('input, textarea, select, option, [aria-hidden="true"], [disabled], [aria-disabled="true"]')
        || inMarquee(el)
      )
        continue;
      const c = CS(el);
      const fs = parseFloat(c.fontSize) || 16;
      if (fs < 9) continue;
      const col = rgba(c.color);
      if (col.a < 0.05) continue;
      if (c.webkitTextFillColor && rgba(c.webkitTextFillColor).a < 0.05) continue;
      const ls = lines(el)
        .filter(l => l.top >= 0 && l.bottom <= vh && l.left >= 0 && l.right <= vw && l.width >= 4 && l.height >= 6)
        .slice(0, 3);
      if (!ls.length) continue;
      ink.seen.add(el);
      let bg = null;
      for (const L of ls) {
        const u = under((L.left + L.right) / 2, (L.top + L.bottom) / 2, el);
        if (u.kind !== "solid") {
          bg = null;
          break;
        }
        if (!bg) bg = u.col;
      }
      if (!bg) continue; // over a picture or an effect: the contrast check reads the pixels
      const op = effOpacity(el),
        a = col.a * op;
      const fg = { r: col.r * a + bg.r * (1 - a), g: col.g * a + bg.g * (1 - a), b: col.b * a + bg.b * (1 - a) };
      const L1 = lum(fg),
        L2 = lum(bg),
        k = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const wt = parseInt(c.fontWeight, 10) || 400,
        large = fs >= 24 || (fs >= 18.66 && wt >= 700);
      const blk = el.closest("p, li, dd, blockquote, td") || blockOf(el);
      const words = full(blk).split(" ").length;
      const drawn = inDrawn(el) || !!el.closest(FRAG);
      // (a one-word chip or label inside a long row is a label, not running text)
      const body =
        !drawn
        && !el.closest(HEADS + ", figcaption, small, label, footer, nav, header, dt, th, " + INTER)
        && words >= 12
        && full(el).split(" ").length >= 4
        && fs >= 13
        && !/(^|\s|-)(label|eyebrow|caption|meta|kicker|overline|tag|chip|badge|note)(\s|$|-)/i.test(
          String(el.className) + " " + String(blk.className),
        );
      const need =
        body ?
          large ? 4.5
          : 7
        : large ? 3
        : 4.5;
      if (body && !large)
        out.body.push({
          fs: Math.round(fs * 10) / 10,
          id: idOf(el),
          sel: sel(el),
          text: label(el),
          rect: R(ls[0]),
          words,
        });
      if (k + 0.005 >= need) continue;
      out.ink.push({
        id: idOf(el),
        sel: sel(el),
        text: label(el),
        k: Math.round(k * 100) / 100,
        need,
        body,
        drawn,
        fs: Math.round(fs),
        col: hex(fg),
        bg: hex(bg),
        rects: ls.map(R),
      });
    }
  }

  function scrollToY(y) {
    const L = window.lenis || window.__lenis;
    try {
      if (L && typeof L.scrollTo === "function") L.scrollTo(y, { immediate: true, force: true });
    } catch {}
    window.scrollTo({ top: y, left: 0, behavior: "instant" });
    return Math.round(scrollY);
  }
  // the whole page once, top to bottom, so lazy parts load; with watch, a snapshot of the whole page first, and at each
  // step what has animated in since (judgeStep)
  async function prescroll(watch) {
    const vh = innerHeight;
    let y = 0;
    if (watch) {
      pre = takeSnap("all");
      await wait(300);
      const p2 = takeSnap("all");
      for (const [id, v] of p2.m) {
        const u = pre.m.get(id);
        if (u && vdist(u, v).d > 0.012) loopers.add(id);
      }
    }
    for (let i = 0; i < 400; i++) {
      const max = document.scrollingElement.scrollHeight - vh;
      scrollToY(y);
      if (watch && y > 0) {
        await wait(150);
        judgeStep();
        await wait(650);
        if (judgeStep()) await settle(null, 1500); // new ones: a loop shows itself by not settling
      } else await wait(90);
      if (y >= max) break;
      y = Math.min(max, y + vh * 0.6);
    }
    await wait(500);
    scrollToY(0);
    await wait(300);
    secEls = null;
    sectionsList();
    return true;
  }
  function hideText(on) {
    let s = document.getElementById("__cc_hide");
    if (on && !s) {
      s = document.createElement("style");
      s.id = "__cc_hide";
      s.textContent =
        "*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;text-decoration-color:transparent!important;caret-color:transparent!important;transition:none!important}";
      document.head.appendChild(s);
    }
    if (!on && s) s.remove();
    return new Promise(r => {
      let done = false;
      const fin = () => {
        if (!done) {
          done = true;
          r(true);
        }
      };
      requestAnimationFrame(() => requestAnimationFrame(fin));
      setTimeout(fin, 150);
    });
  }
  // ------------------------------------------------ checks added in the second pass, later (two readers): the faults
  // they counted that a script can decide
  // empty-visual: every picture, canvas, effect ground and photo frame wholly on this screen, with what is drawn over it
  // (its UI card, its words) to leave out; the caller reads the pixels: one colour over all of it is a visual that shows
  // nothing, or only its ground
  const seenVis = new WeakSet();
  const glRefused = cv => !!(cv && window.__ccgl && window.__ccgl.refusedEls && window.__ccgl.refusedEls.has(cv));
  function holesIn(host, hr, skip) {
    const hs = [];
    for (const d of host.querySelectorAll("*")) {
      if (d === skip || (skip && skip.contains(d)) || SKIP.has(d.tagName) || isSvgPart(d) || d.tagName === "CANVAS")
        continue;
      const q = d.getBoundingClientRect();
      if (q.width < 2 || q.height < 2 || !shown(d, q)) continue;
      if (q.right <= hr.left || q.left >= hr.right || q.bottom <= hr.top || q.top >= hr.bottom) continue;
      if (q.width * q.height >= 0.8 * hr.width * hr.height && !ownText(d) && !d.matches(FRAG)) continue; // a layer of the ground
      if (ownText(d)) {
        for (const l of lines(d)) hs.push(R(l));
        continue;
      }
      if (
        MEDIA.has(d.tagName)
        || d.matches("svg, " + FRAG + ", " + INTER + ", input, select, textarea")
        || quickKind(d)
      )
        hs.push(R(q));
      if (hs.length >= 120) break;
    }
    return hs;
  }
  function visualCands(view, vw, vh) {
    const out = [],
      taken = [];
    // whole on this screen, or most of it: the walk steps 0.85 of a screen, so a box taller than the overlap can straddle
    // every seam; it is judged on the screen that shows 60% of it or more (the flat test reads only what is on screen)
    const whole = r =>
      r.left >= -1
      && r.right <= vw + 1
      && ((r.top >= -1 && r.bottom <= vh + 1)
        || Math.min(r.bottom, vh) - Math.max(r.top, 0) >= 0.6 * Math.min(r.height, vh));
    const off = el =>
      inFixed(el)
      || !!el.closest(
        'dialog, [role="menu"], .nav__menu, [hidden], template, [aria-hidden="true"] [aria-hidden="true"]',
      );
    const push = (el, r, kind, extra) => {
      if (seenVis.has(el)) return;
      if (
        taken.some(
          q =>
            Math.abs(q.left - r.left) < 4
            && Math.abs(q.top - r.top) < 4
            && Math.abs(q.right - r.right) < 4
            && Math.abs(q.bottom - r.bottom) < 4,
        )
      )
        return;
      seenVis.add(el);
      taken.push(r);
      const holes = kind === "img" || kind === "canvas" ? holesIn(el.parentElement || el, r, el) : holesIn(el, r, null);
      // hide: the caller shoots the screen again with this visual's own content hidden (the picture, the canvas, an
      // effect's canvas); the same pixels both times is a visual that shows only its ground, gradient or not. Not for a
      // picture under another one (a cross-fade's slide, a poster under its film) or a refused or fallen-back effect
      const hide =
        (kind === "img"
          || kind === "canvas"
          || (kind === "fx"
            && [...el.querySelectorAll("canvas")].some(c => {
              const q = c.getBoundingClientRect();
              return q.width >= 32 && q.height >= 32 && shown(c, q);
            })))
        && !(extra && extra.refused)
        && !el.hasAttribute("data-fx-fallback")
        && !mediaOver(el, r);
      out.push(
        Object.assign(
          {
            id: idOf(el),
            sel: sel(el),
            kind,
            rect: R(onScreen(r, vw, vh)),
            holes,
            fx: fxOf(el),
            sec: secIndex(el),
            hide,
          },
          extra || {},
        ),
      );
    };
    for (const [el, r] of view) {
      if (r.width < 64 || r.height < 48 || !whole(r) || off(el)) continue;
      const tag = el.tagName;
      if (tag === "IMG" || tag === "VIDEO") {
        if (tag === "IMG" && !el.complete) continue; // still loading: judged on a later screen, or told as not loaded
        push(
          el,
          r,
          "img",
          tag === "IMG" ?
            {
              broken:
                !!el.getAttribute("src")
                && !el.naturalWidth
                && !/\.svg(\?|#|$)|^data:image\/svg/i.test(el.currentSrc || el.getAttribute("src")),
              src: (el.currentSrc || el.getAttribute("src") || "").split("/").pop().slice(0, 60),
            }
          : {},
        );
        continue;
      }
      if (tag === "CANVAS") {
        if (!el.closest("[data-fx], [data-fx-mounted]")) push(el, r, "canvas", { refused: glRefused(el) });
        continue;
      }
      if (el.matches("[data-fx], [data-fx-mounted]")) {
        push(el, r, "fx", { refused: glRefused(el.querySelector("canvas")) });
        continue;
      }
      const c = CS(el);
      if (c.backgroundImage && /url\(/.test(c.backgroundImage) && c.display !== "inline" && !lineImage(c)) {
        push(el, r, "bg");
        continue;
      }
      if (tag.toLowerCase() === "svg" && r.width >= 120 && r.height >= 80 && !el.closest(FRAG)) push(el, r, "img");
    }
    // a frame whose picture does not show (faded out at rest, hidden, or broken): the frame itself is judged
    for (const m of document.querySelectorAll("img, video, canvas")) {
      if (seenVis.has(m) || off(m) || inDrawn(m.parentElement)) continue;
      const mc = CS(m);
      if (mc.display === "none") continue; // taken out at this width on purpose
      const mr = m.getBoundingClientRect();
      const broken = m.tagName === "IMG" && !!m.getAttribute("src") && m.complete && !m.naturalWidth;
      const faded = mc.visibility === "hidden" || effOpacity(m) < 0.05;
      if (!broken && !faded) continue;
      let host = null;
      for (let a = m.parentElement; a && a !== document.body; a = a.parentElement) {
        const q = a.getBoundingClientRect();
        if (q.width < 64 || q.height < 48) continue;
        if (q.height > vh * 1.2) break;
        if (
          quickKind(a)
          || a.matches('figure, picture, .frame, .media, [class*="photo"], [class*="frame"], [class*="media"]')
        ) {
          host = a;
          break;
        }
      }
      if (!host || seenVis.has(host)) continue;
      const hr = host.getBoundingClientRect();
      if (!whole(hr) || !shown(host, hr)) continue;
      // a picture that comes on hover is the hidden-visual check's
      if (
        host.closest("a[href], button, .card")
        && !broken
        && /opacity|visibility/.test(CS(m).transitionProperty || "")
      )
        continue;
      push(host, hr, "frame", {
        why:
          broken ?
            `its picture ${(m.currentSrc || m.getAttribute("src") || "").split("/").pop().slice(0, 50)} did not load`
          : `its ${m.tagName.toLowerCase()} is ${mc.visibility === "hidden" ? "hidden" : "faded to nothing"} at rest`,
      });
    }
    return out;
  }
  // another picture shown over most of this one (a cross-fade's slide, a poster under its film, a print over a photo)
  function mediaOver(el, r) {
    for (const m of document.querySelectorAll("img, video, canvas, svg")) {
      if (m === el || el.contains(m) || m.contains(el) || isSvgPart(m)) continue;
      const q = m.getBoundingClientRect();
      if (q.width < 32 || q.height < 32) continue;
      const ov =
        Math.max(0, Math.min(q.right, r.right) - Math.max(q.left, r.left))
        * Math.max(0, Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top));
      if (ov >= 0.5 * r.width * r.height && shown(m, q)) return true;
    }
    return false;
  }
  // empty-visual's second picture: each visual's own content hidden (an img, video or svg itself; the canvases of an
  // effect or a canvas), no transition, restored after
  const hidState = new Map();
  const restoreProps = (t, saved) => {
    for (const [k, v, p] of saved) {
      if (v) t.style.setProperty(k, v, p);
      else t.style.removeProperty(k);
    }
  };
  const saveProps = (t, keys) => keys.map(k => [k, t.style.getPropertyValue(k), t.style.getPropertyPriority(k)]);
  function hideVis(ids, on) {
    if (on)
      for (const id of ids) {
        const el = els.get(id);
        if (!el) continue;
        const list =
          /^(IMG|VIDEO|CANVAS)$/.test(el.tagName) || el.tagName.toLowerCase() === "svg" ?
            [el]
          : [...el.querySelectorAll("canvas")];
        for (const t of list) {
          if (hidState.has(t)) continue;
          hidState.set(t, saveProps(t, ["visibility", "transition"]));
          t.style.setProperty("transition", "none", "important");
          t.style.setProperty("visibility", "hidden", "important");
        }
      }
    else {
      for (const [t, saved] of hidState) restoreProps(t, saved);
      hidState.clear();
    }
    return new Promise(r => {
      let done = false;
      const fin = () => {
        if (!done) {
          done = true;
          r(true);
        }
      };
      requestAnimationFrame(() => requestAnimationFrame(fin));
      setTimeout(fin, 150);
    });
  }
  // gl-fallback's bare ground: what a WebGL host shows with its drawn parts taken away (its canvases, the pictures over
  // the canvas, and any background a script set on it, as an effect kit sets its CSS fallback): the stylesheet's ground
  function stripHost(ids, on) {
    if (on)
      for (const id of ids) {
        const h = els.get(id);
        if (!h) continue;
        const cvs = [...h.querySelectorAll("canvas")].filter(c => {
          const q = c.getBoundingClientRect();
          return q.width >= 32 && q.height >= 32;
        });
        const area =
          cvs.length ?
            cvs.map(c => c.getBoundingClientRect()).sort((a, b) => b.width * b.height - a.width * a.height)[0]
          : h.getBoundingClientRect();
        const over = q =>
          Math.min(q.right, area.right) - Math.max(q.left, area.left) > 4
          && Math.min(q.bottom, area.bottom) - Math.max(q.top, area.top) > 4;
        for (const t of [h, ...h.querySelectorAll("*")]) {
          if (hidState.has(t)) continue;
          const tag = t.tagName.toLowerCase();
          if (
            tag === "canvas"
            || ((tag === "img" || tag === "video" || tag === "svg" || tag === "picture")
              && over(t.getBoundingClientRect()))
          ) {
            hidState.set(t, saveProps(t, ["visibility", "transition"]));
            t.style.setProperty("transition", "none", "important");
            t.style.setProperty("visibility", "hidden", "important");
            continue;
          }
          if (isSvgPart(t) || !t.style || !/background/.test(t.getAttribute("style") || "")) continue;
          hidState.set(t, saveProps(t, ["background", "background-image", "background-color", "transition"]));
          t.style.setProperty("transition", "none", "important");
          t.style.removeProperty("background");
          t.style.removeProperty("background-image");
          t.style.removeProperty("background-color");
        }
      }
    else {
      for (const [t, saved] of hidState) restoreProps(t, saved);
      hidState.clear();
    }
    return new Promise(r => {
      let done = false;
      const fin = () => {
        if (!done) {
          done = true;
          r(true);
        }
      };
      requestAnimationFrame(() => requestAnimationFrame(fin));
      setTimeout(fin, 150);
    });
  }
  // the rect of the largest canvas of a host on screen (gl-fallback reads the bare ground there)
  function canvasArea(id) {
    const h = els.get(id);
    if (!h) return null;
    const vw = vwNow(),
      vh = innerHeight;
    const cvs = [...h.querySelectorAll("canvas")]
      .map(c => c.getBoundingClientRect())
      .filter(q => q.width >= 32 && q.height >= 32)
      .sort((a, b) => b.width * b.height - a.width * a.height);
    return R(onScreen(cvs[0] || h.getBoundingClientRect(), vw, vh));
  }
  // a picture that has loaded but stays invisible (opacity under 0.1 or hidden) once the page has been scrolled
  // through, still so 1.1 s after it is brought to the middle of the screen: a reveal that never fires (an observer
  // whose threshold a frame taller than the screen never reaches), a class never set
  async function ghostPics() {
    fresh();
    const vh = innerHeight,
      cands = [],
      out = [];
    const faded = m => CS(m).visibility === "hidden" || effOpacity(m) < 0.1;
    for (const m of document.querySelectorAll("img, video")) {
      if (!(m.tagName === "IMG" ? m.complete && m.naturalWidth > 0 : m.readyState >= 2)) continue;
      if (
        CS(m).display === "none"
        || inFixed(m)
        || m.closest(
          'dialog, [role="menu"], .nav__menu, [hidden], template, [inert], [aria-hidden="true"], details:not([open]), [role="tabpanel"]',
        )
      )
        continue;
      const r = m.getBoundingClientRect();
      if (r.width < 64 || r.height < 48 || !faded(m)) continue;
      if (m.closest("a[href], button, [tabindex]")) continue; // a picture that comes on hover or focus: hidden-visual's
      if (m.closest(".card") && /opacity|visibility|all/.test(CS(m).transitionProperty || "")) continue;
      if (mediaOver(m, r)) continue;
      cands.push(m);
      if (cands.length >= 10) break;
    }
    for (const m of cands) {
      const r0 = m.getBoundingClientRect(),
        y = r0.top + scrollY;
      scrollToY(Math.max(0, r0.height > vh * 0.9 ? y - vh * 0.05 : y + r0.height / 2 - vh / 2));
      await wait(1100);
      fresh();
      if (!faded(m)) continue;
      let host = m;
      for (let a = m.parentElement; a && a !== document.body; a = a.parentElement) {
        const q = a.getBoundingClientRect();
        if (q.width < 64 || q.height < 48) continue;
        if (q.height > r0.height * 1.6 + 40) break;
        if (
          quickKind(a)
          || a.matches('figure, picture, .frame, .media, [class*="photo"], [class*="frame"], [class*="media"]')
        ) {
          host = a;
          break;
        }
      }
      const hr = host.getBoundingClientRect(),
        mc = CS(m);
      out.push({
        id: idOf(host),
        img: idOf(m),
        sel: sel(host),
        src: (m.currentSrc || m.getAttribute("src") || m.tagName.toLowerCase()).split("/").pop().slice(0, 50),
        how: mc.visibility === "hidden" ? "hidden" : `at opacity ${effOpacity(m).toFixed(2)}`,
        tall: r0.height > vh,
        doc: D(hr),
      });
    }
    scrollToY(0);
    await wait(200);
    return out;
  }
  // loop-pause by pixels: the element that holds a moving box of the screen (a ticker or a rotation a script drives)
  function moverAt(box) {
    const vw = vwNow(),
      vh = innerHeight;
    const cx = box.left + box.width / 2,
      cy = box.top + box.height / 2;
    const hit = document
      .elementsFromPoint(cx, cy)
      .find(e => e !== document.body && e !== document.documentElement && !inFixed(e) && !e.closest("dialog"));
    if (!hit) return null;
    if (hit.closest('nav, [role="navigation"]')) return null;
    let e = hit.closest("svg") || hit;
    // the smallest box that holds the whole moving part (the tiles round it out by up to 32px)
    for (let a = e; a && a !== document.body; a = a.parentElement) {
      const q = a.getBoundingClientRect();
      if (
        q.left <= box.left + 32
        && q.right >= box.left + box.width - 32
        && q.top <= box.top + 32
        && q.bottom >= box.top + box.height - 32
        && q.width >= 40
        && q.height >= 24
      ) {
        e = a;
        break;
      }
      if (q.height > vh * 1.5 || q.width > vw) break;
    }
    const r = e.getBoundingClientRect();
    if (r.width < 40 || r.height < 24) return null;
    return { id: idOf(e), sel: sel(e), text: label(e), rect: R(clipRect(e, r)), doc: D(r) };
  }
  // the reduced-motion pass: what starts to animate on this screen (finite animations begun in the last 900 ms)
  function motionNow() {
    fresh();
    const vh = innerHeight,
      out = [],
      seenM = new Set();
    for (const a of document.getAnimations ? document.getAnimations() : []) {
      const t = a.effect && a.effect.target;
      if (!(t instanceof Element) || a.playState !== "running") continue;
      let tm;
      try {
        tm = a.effect.getComputedTiming();
      } catch {
        continue;
      }
      if (!(tm.duration > 80)) continue;
      const r = t.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > vh || inFixed(t)) continue;
      const loop = tm.iterations === Infinity;
      if (!loop && (a.currentTime || 0) > 900) continue;
      const host = t.closest("section, article, figure, li, [data-ui], .ui[class*=ui-], .card") || t;
      if (seenM.has(host)) continue;
      seenM.add(host);
      out.push({
        id: idOf(t),
        sel: sel(t),
        text: label(t),
        loop,
        name: a.animationName || a.transitionProperty || "an animation",
        dur: Math.round(tm.duration),
        rect: R(clipRect(t, r)),
        doc: D(r),
      });
      if (out.length >= 12) break;
    }
    return out;
  }
  // pictures on screen still loading: waited for before the screen is read (up to ms)
  async function picsReady(ms) {
    const t0 = performance.now();
    const pend = () =>
      [...document.images].filter(i => {
        if (i.complete || !i.getAttribute("src")) return false;
        const r = i.getBoundingClientRect();
        return r.bottom > 0 && r.top < innerHeight && r.width > 8;
      });
    while (pend().length && performance.now() - t0 < ms) await wait(120);
    return pend().map(i => ({
      id: idOf(i),
      sel: sel(i),
      src: (i.currentSrc || i.getAttribute("src") || "").split("/").pop().slice(0, 60),
      doc: D(i.getBoundingClientRect()),
    }));
  }

  // hero-fill: the first screen shows the hero alone; nothing of the next section (its words, its picture, its box)
  function heroFill() {
    fresh();
    const vw = vwNow(),
      vh = innerHeight,
      S = sectionsList().filter(s => s.tagName !== "FOOTER");
    if (S.length < 2 || scrollY > 2) return null;
    const hero = S[0],
      next = S[1];
    const ext = extent(next, vw);
    if (!ext) return null;
    const hr = hero.getBoundingClientRect(),
      nr = next.getBoundingClientRect();
    // the next section's own ground counts as soon as it differs from the hero's
    let top = ext.top;
    if (nr.top < vh - 2 && nr.top > 0 && hr.bottom > 2) {
      const a = groundAt(vw / 2, Math.min(vh - 1, nr.top + 3)),
        b = groundAt(vw / 2, Math.max(0, hr.bottom - 3));
      if (a !== b && !(/^#/.test(a) && /^#/.test(b) && cdist(rgba(a), rgba(b)) < 6)) top = Math.min(top, nr.top);
    }
    if (top >= vh - 2) return null;
    const h = next.querySelector("h1, h2, h3");
    return {
      sel: sel(next),
      hero: sel(hero),
      top: Math.round(top),
      heroBottom: Math.round(hr.bottom),
      vh,
      text: label(h || next),
      id: idOf(next),
      doc: D({ left: 0, top, width: vw, height: Math.max(4, vh - top) }),
    };
  }

  // flush: a section's content right on an edge where the ground changes (the closing call on the footer), or two
  // sections' content run together. Each seam is brought to the middle of the screen and its grounds read
  async function seams() {
    const vw = vwNow(),
      vh = innerHeight,
      S = sectionsList(),
      out = [];
    const lastItem = (sec, ext, edge) => {
      // what ends the section: the lowest box or line in it, and whether it bleeds (a picture the width of the page)
      let best = null,
        bd = -1e9;
      for (const e of sec.querySelectorAll("*")) {
        if (SKIP.has(e.tagName) || isSvgPart(e) || inFixed(e)) continue;
        let q = e.getBoundingClientRect();
        if (q.width < 2 || q.height < 2 || !shown(e, q)) continue;
        if (!(MEDIA.has(e.tagName) || ownText(e) || e.matches(INTER) || quickKind(e))) continue;
        // measured as the extent measures it: a line of words by its line box, a box by its edge
        if (
          ownText(e)
          && !MEDIA.has(e.tagName)
          && !((quickKind(e) || faintBox(CS(e))) && e.matches(INTER) && q.height <= 120)
        ) {
          const ls = lines(e);
          if (ls.length) q = { top: Math.min(...ls.map(l => l.top)), bottom: Math.max(...ls.map(l => l.bottom)) };
        }
        const v = edge === "bottom" ? q.bottom : -q.top;
        if (Math.abs((edge === "bottom" ? q.bottom : q.top) - (edge === "bottom" ? ext.bottom : ext.top)) > 1.5)
          continue;
        if (v > bd || (v === bd && best && best.contains(e))) {
          bd = v;
          best = e;
        }
      }
      return best;
    };
    for (let i = 0; i + 1 < S.length; i++) {
      const A = S[i],
        B = S[i + 1];
      let ra = A.getBoundingClientRect();
      const mid = Math.round((ra.bottom + B.getBoundingClientRect().top) / 2 + scrollY - vh / 2);
      scrollToY(Math.max(0, mid));
      await wait(140);
      await settle(null, 900);
      fresh();
      ra = A.getBoundingClientRect();
      const rb = B.getBoundingClientRect();
      const ea = extent(A, vw),
        eb = extent(B, vw);
      if (!ea || !eb) continue;
      if (ra.bottom < 8 || ra.bottom > vh - 8) continue;
      const xs = [vw * 0.3, vw * 0.5, vw * 0.7];
      const g = y => {
        const c = new Map();
        for (const x of xs) {
          const k = groundAt(x, y);
          c.set(k, (c.get(k) || 0) + 1);
        }
        return [...c].sort((p, q) => q[1] - p[1])[0][0];
      };
      const same = (p, q) => p === q || (/^#/.test(p || "") && /^#/.test(q || "") && cdist(rgba(p), rgba(q)) < 6); // a tint of 6 levels or more is a band the eye sees
      const gA = g(ra.bottom - 3),
        gGap = g(Math.min(rb.top, ra.bottom) + Math.max(0, rb.top - ra.bottom) / 2 + 0.5),
        gB = g(rb.top + 3);
      // a rule between the two (a 1px border on the footer's top or the section's bottom) is an edge as much as a change
      // of ground: what ends A is measured to the rule (the closing button resting on the footer's line)
      const rule = (el, side) => {
        const c = CS(el),
          w = parseFloat(c["border" + side + "Width"]) || 0;
        return (
          w >= 1 && !/none|hidden/.test(c["border" + side + "Style"]) && rgba(c["border" + side + "Color"]).a > 0.15
        );
      };
      const ruleAt =
        rule(B, "Top") ? rb.top
        : rule(A, "Bottom") ? ra.bottom - (parseFloat(CS(A).borderBottomWidth) || 0)
        : null;
      const edgeA = !same(gA, rb.top - ra.bottom > 4 ? gGap : gB) || ruleAt != null,
        edgeB = !same(gB, rb.top - ra.bottom > 4 ? gGap : gA);
      const it = (e, sec) => ({ id: idOf(e || sec), sel: sel(e || sec), text: label(e || sec) });
      if (edgeA) {
        const d =
            (ruleAt != null && same(gA, rb.top - ra.bottom > 4 ? gGap : gB) ? Math.min(ra.bottom, ruleAt) : ra.bottom)
            - ea.bottom,
          e = lastItem(A, ea, "bottom");
        const bleed =
          e
          && (MEDIA.has(e.tagName) || ["picture", "effect"].includes(quickKind(e)))
          && e.getBoundingClientRect().width >= vw * 0.9;
        if (e && !bleed && d < 32)
          out.push(
            Object.assign(it(e, A), {
              side: "bottom",
              d: Math.round(d),
              rule: ruleAt != null && same(gA, rb.top - ra.bottom > 4 ? gGap : gB),
              a: sel(A),
              b: sel(B),
              foot: B.tagName === "FOOTER" || !!B.closest("footer"),
              btn: !!(e && (e.matches(INTER) || e.closest(INTER))),
              doc: D({ left: 0, top: ea.bottom - 40, width: vw, height: Math.max(0, d) + 60 }),
            }),
          );
      }
      if (edgeB) {
        const d = eb.top - rb.top,
          e = lastItem(B, eb, "top");
        const bleed =
          e
          && (MEDIA.has(e.tagName) || ["picture", "effect"].includes(quickKind(e)))
          && e.getBoundingClientRect().width >= vw * 0.9;
        if (e && !bleed && d < 32)
          out.push(
            Object.assign(it(e, B), {
              side: "top",
              d: Math.round(d),
              a: sel(A),
              b: sel(B),
              foot: B.tagName === "FOOTER",
              btn: false,
              doc: D({ left: 0, top: rb.top - 20, width: vw, height: Math.max(0, d) + 60 }),
            }),
          );
      }
      if (!edgeA && !edgeB) {
        const gap = eb.top - ea.bottom;
        if (gap < 24)
          out.push(
            Object.assign(it(lastItem(A, ea, "bottom"), A), {
              side: "gap",
              d: Math.round(gap),
              a: sel(A),
              b: sel(B),
              foot: B.tagName === "FOOTER",
              btn: false,
              doc: D({ left: 0, top: ea.bottom - 30, width: vw, height: Math.max(0, gap) + 60 }),
            }),
          );
      }
    }
    scrollToY(0);
    await wait(200);
    return out;
  }

  // the rest, read once per width at the top of the page
  const CREDIT_W =
    /\b(photo(graph)?s?|pictures?|images?)\b[^.]{0,40}\b(by|from|via|courtesy)\b|\bCC[ -]?BY(-[A-Z]{2})*\b|\bCC0\b|\bCreative Commons\b|\bpublic domain\b|\bWikimedia\b|\bUnsplash\b|\bPexels\b|\bPixabay\b|\bFlickr\b/i;
  const EXAMPLES =
    /\b(names?|figures?|numbers?|prices?|people|persons|quotes?|reviews?|photos?|photographs?|images?|pictures?|details|contacts?|addresses?|data|compan(y|ies)|customers?|testimonials?|everything|all of (it|this)|this page|the page|content)\b[^.]{0,50}\b(are|is|were|was)\b[^.]{0,24}\b(examples?|samples?|illustrative|fictional|fictitious|invented|made[ -]up|placeholders?|not real|for illustration|for demonstration|demo|stand-?ins?)\b|\b(illustrative|demonstration) (only|purposes)\b|\bfor (illustration|demonstration) (only|purposes)\b|\b(example|demo|dummy|sample) (data|figures|names|content|copy|text|details)\b|\bnames and figures\b/i;
  const EXPLAIN =
    /\b(this|the) (photo|photograph|picture|image|drawing|illustration|render(ing)?|visual|mock-?up|screen(shot)?|map|animation|video)\b[^.]{0,40}\b(shows?|is|was|depicts?|illustrates?)\b|\b(shown|pictured|seen) (here|above|below)\b|^\s*(above|below|left|right|top|bottom)\s*:/i;
  // a line under a picture that says where the picture comes from (a place that is not the client's, a stock or
  // example shot, a render, a generated image), not what the client offers: FAIL like an explaining caption
  const PROVENANCE =
    /^\s*pictured\s*[:—–-]|\b(photographed|shot|taken|pictured) (in|at|by|on)\b|\bnot ours\b|\bsimilar\b|\bstock\b|\b(example|sample|placeholder|representative|generic) (photo(graph)?|image|picture|shot)\b|\bfor illustration\b|\b(AI[- ]generated|generated|rendered|render of|made in code|drawn in code)\b|\bours (opens?|will|is coming)\b/i;
  // (a normal space only: a no-break space keeps the two together)
  const UNIT =
    /(\d[\d.,]*)( +)(kWh|Wh|kW|W|V|mAh|kg|g|km\/h|km|m|cm|mm|metres|meters|metre|meter|kilometres|kilometers|litres|liters|kilos|mph|min|h|hrs?|°C|°F|%|€|£|EUR|USD|GB|MB|TB|ml|cl|l|L|kcal)(?![\p{L}\d])/gu;
  // a stand-in contact printed on the page: an address on a reserved domain (.example, example.com, .invalid, .test),
  // a phone number of zeros or one repeated digit, a 555-01xx number, or 1234567
  function fakeContact(t) {
    const m = t.match(
      /[\w.+-]*@?\b[\w-]+\.(example|invalid|test)\b|[\w.+-]+@example\.(com|org|net)\b|\b(www\.)?example\.(com|org|net)\b/i,
    );
    if (m) return m[0];
    for (const x of t.matchAll(
      /(?:\+\d{1,3}[\s.\-]?|\b0)\(?\d[\d\s().\-\/]{5,}\d|\b(?:tel|phone|call|ring|fon|telefon|t)\.?:?\s*\(?\d[\d\s().\-\/]{6,}\d|\b555[\s.\-]?01\d\d\b/gi,
    )) {
      const d = x[0].replace(/\D/g, "");
      if (d.length < 7) continue;
      if (
        /0{5,}/.test(d)
        || /(\d)\1{5,}/.test(d)
        || /555-?01\d\d/.test(x[0].replace(/[\s.]/g, "-"))
        || /5550[01]\d\d/.test(d)
        || /1234567|7654321/.test(d)
      )
        return x[0].trim();
    }
    return null;
  }
  function extras() {
    fresh();
    const vw = vwNow(),
      vh = innerHeight,
      S = sectionsList();
    const doc = e => D(e.getBoundingClientRect());
    const visible = e => {
      const r = e.getBoundingClientRect();
      return r.width >= 1 && r.height >= 1 && shown(e, r);
    };
    const out = {
      units: [],
      tabWraps: [],
      tabs: [],
      figures: [],
      starts: [],
      credits: null,
      creditLinks: null,
      examples: [],
      explain: [],
      captions: [],
      printed: [],
      formNest: [],
      navEdge: null,
      heavy: [],
      fragPlaces: [],
      progress: [],
    };
    // ui-centre across a card group: the fragments of sibling cards set at different places in their panels (three
    // centred, one pinned to an edge), read from the whole page at once
    {
      const groups = new Map();
      for (const f of document.querySelectorAll("[data-ui], .ui[class*=ui-]")) {
        if ((f.parentElement && f.parentElement.closest("[data-ui], .ui[class*=ui-]")) || !visible(f) || inFixed(f))
          continue;
        const panel = f.closest(".panel, .panel__screen, .frame, .stage");
        if (!panel) continue;
        const card =
          (panel.parentElement && panel.parentElement.closest('article, .card, [class*="card"], li')) || panel;
        const grid = card.parentElement;
        if (!grid) continue;
        const pq = panel.getBoundingClientRect(),
          q = f.getBoundingClientRect();
        if (pq.width < 160 || q.width < 60) continue;
        if (!groups.has(grid)) groups.set(grid, []);
        const g = groups.get(grid),
          had = g.find(x => x.panel === panel);
        const it = {
          panel,
          area: q.width * q.height,
          x: ((q.left + q.right) / 2 - (pq.left + pq.right) / 2) / pq.width,
          w: q.width / pq.width,
          id: idOf(f),
          sel: sel(f),
          text: label(f),
          doc: doc(f),
          pdoc: doc(panel),
        };
        if (!had) g.push(it);
        else if (it.area > had.area) g[g.indexOf(had)] = it;
      }
      for (const [, g] of groups) {
        if (g.length < 3) continue;
        const xs = g.map(p => p.x).sort((a, b) => a - b),
          med = xs[Math.floor(xs.length / 2)];
        if (g.filter(p => Math.abs(p.x - med) <= 0.06).length < 2) continue; // no shared place to be off
        const odd = g.filter(p => Math.abs(p.x - med) > 0.12 && p.w < 0.85);
        if (odd.length && odd.length <= (g.length - 1) / 2)
          out.fragPlaces.push({
            id: odd[0].id,
            sel: odd[0].sel,
            text: odd[0].text,
            doc: odd[0].doc,
            n: g.length,
            odd: odd.length,
            off: Math.round((odd[0].x - med) * 100),
            med: Math.round(med * 100),
            more: [odd[0].pdoc],
          });
      }
    }
    // a progress or drag bar (the house rules: none): a track with a part-width fill, a <progress>, a <meter>
    for (const e of document.querySelectorAll(
      'progress, meter, [role="progressbar"], [class*="progress"], [class*="meter"]',
    )) {
      if (out.progress.length >= 4 || !visible(e)) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 60 || r.height > 24 || r.height < 2) continue;
      const tag = /^(PROGRESS|METER)$/.test(e.tagName) || e.getAttribute("role") === "progressbar";
      let fill = null;
      if (!tag)
        for (const c of e.querySelectorAll("*")) {
          const q = c.getBoundingClientRect();
          if (
            q.height >= r.height * 0.5
            && q.height <= r.height + 1
            && q.width > 2
            && q.width < r.width * 0.97
            && Math.abs(q.left - r.left) < 3
            && rgba(CS(c).backgroundColor).a > 0.3
          ) {
            fill = c;
            break;
          }
        }
      if ((tag || fill) && !out.progress.some(p => p.el.contains(e) || e.contains(p.el)))
        out.progress.push({
          el: e,
          id: idOf(e),
          sel: sel(e),
          text: label(e.closest("[data-ui], .ui[class*=ui-]") || e.parentElement || e),
          fixed: inFixed(e),
          doc: doc(e),
        });
    }
    out.progress = out.progress.map(({ el, ...p }) => p);
    // photo-repeat: one picture shown twice on the page (the same latte in the hero and the bar). Pictures are compared
    // by content, not by file name: the width variants one image ships (name-700.webp beside name.webp) and one
    // picture at two places are one picture; a picture is the same when the files its src and srcset name overlap, or
    // when its pixels match another size of it (the same view at the same colours, whatever the file is called)
    out.repeats = [];
    {
      const pathOf = u => {
        try {
          const a = new URL(u, document.baseURI);
          return a.origin + a.pathname;
        } catch (e) {
          return String(u).split(/[?#]/)[0];
        }
      };
      const files = i => {
        const set = new Set(),
          add = u => {
            if (u && !/^data:/i.test(u)) set.add(pathOf(u));
          },
          list = ss =>
            String(ss || "")
              .split(",")
              .forEach(c => add(c.trim().split(/\s+/)[0]));
        add(i.currentSrc);
        add(i.getAttribute("src"));
        list(i.getAttribute("srcset"));
        const pic = i.closest("picture");
        if (pic) pic.querySelectorAll("source[srcset]").forEach(s => list(s.getAttribute("srcset")));
        return set;
      };
      // a loaded picture drawn at 32x32 (its colours, cell by cell); null when it cannot be read (not loaded, another origin)
      const sigOf = i => {
        try {
          if (!i.complete || !i.naturalWidth) return null;
          const c = document.createElement("canvas");
          c.width = 32;
          c.height = 32;
          const x = c.getContext("2d", { willReadFrequently: true });
          x.imageSmoothingQuality = "high";
          x.fillStyle = "#808080";
          x.fillRect(0, 0, 32, 32);
          x.drawImage(i, 0, 0, 32, 32);
          return { px: x.getImageData(0, 0, 32, 32).data, ar: i.naturalWidth / i.naturalHeight };
        } catch (e) {
          return null;
        }
      };
      // one picture at two sizes differs by a few edge cells (a 700px file against the 1600px one: at most 2 cells over 40 of 255 in
      // a render of a bike); another colourway or another view of the same product differs in dozens
      const same = (A, B) => {
        if (A.files.size && B.files.size && [...A.files].some(f => B.files.has(f))) return true;
        const a = A.sig,
          b = B.sig;
        if (!a || !b || Math.abs(a.ar / b.ar - 1) > 0.03) return false;
        let strong = 0,
          sum = 0;
        for (let k = 0; k < 1024; k++) {
          const d = Math.max(
            Math.abs(a.px[k * 4] - b.px[k * 4]),
            Math.abs(a.px[k * 4 + 1] - b.px[k * 4 + 1]),
            Math.abs(a.px[k * 4 + 2] - b.px[k * 4 + 2]),
          );
          sum += d;
          if (d > 40) strong++;
        }
        return strong <= 6 && sum / 1024 <= 8;
      };
      const items = [];
      for (const i of document.images) {
        if (inDrawn(i) || inFixed(i) || !visible(i)) continue;
        const r = i.getBoundingClientRect();
        if (r.width < 160 || r.height < 100) continue;
        const f = i.currentSrc || i.getAttribute("src") || "";
        if (!f || /\.svg([?#]|$)/i.test(f) || /^data:/i.test(f)) continue;
        items.push({
          i,
          files: files(i),
          sig: sigOf(i),
          name: f.split(/[?#]/)[0].split("/").pop(),
          top: Math.round(r.top + scrollY),
        });
      }
      const groups = [];
      for (const it of items) {
        const g = groups.filter(q => q.some(o => same(o, it)));
        if (!g.length) groups.push([it]);
        else {
          g[0].push(it);
          for (const h of g.slice(1)) {
            g[0].push(...h);
            groups.splice(groups.indexOf(h), 1);
          }
        }
      }
      for (const list of groups) {
        // apart on the page (a crossfade's two copies, a loop's duplicate, sit at one place)
        const tops = list.map(o => o.top);
        if (
          list.length >= 2
          && Math.max(...tops) - Math.min(...tops) > innerHeight * 0.5
          && !list.some(o => o.i.closest('[class*="marquee"], [class*="ticker"], [aria-hidden="true"]'))
        ) {
          const sorted = [...list].sort((p, q) => p.top - q.top),
            f = sorted[0].name.replace(/-\d{3,4}(?=\.\w+$)/, "");
          out.repeats.push({
            id: idOf(sorted[1].i),
            sel: sel(sorted[1].i),
            text: f.slice(0, 50),
            n: list.length,
            doc: doc(sorted[1].i),
            more: [doc(sorted[0].i)],
          });
        }
      }
    }
    // view-repeat (a product page's repeated VIEW): two pictures of one product from the same view are one picture, in
    // another colour or not. A [data-product] frame is its spec + view + scene (its colour left out); a plain picture is its file stem
    // without the srcset width, the half-size suffix and a trailing colour word or the frame's colour id. The same pixels twice are
    // photo-repeat's (the files overlap); this reads the same view in different colours, and a still the kit swapped in
    out.viewRepeats = [];
    {
      const COLOUR =
        /^(black|white|grey|gray|silver|graphite|stone|sand|cream|beige|ivory|red|blue|navy|green|olive|sage|yellow|orange|pink|purple|brown|tan|charcoal|natural|oak|walnut|bone|moss|clay|rust|teal|gold|copper|slate|ash|mint|sky|night|dark|light|ink|petrol|forest|sea|ocean|coral|plum|wine|mustard|lemon|lime|rose|blush|mist|fog|smoke|chalk|snow|steel|chrome|bronze|brass)$/i;
      const stemOf = (u, colourId) => {
        let p;
        try {
          const a = new URL(u, document.baseURI);
          p = a.pathname;
        } catch (e) {
          p = String(u).split(/[?#]/)[0];
        }
        const dir = p.slice(0, p.lastIndexOf("/") + 1);
        let n = p
          .slice(p.lastIndexOf("/") + 1)
          .replace(/\.\w+$/, "")
          .toLowerCase();
        n = n.replace(/-(half|\d{3,4}|\d{3,4}x\d{3,4}|@\dx)$/, "");
        let colour = "";
        const m = n.match(/^(.*)-([a-z]+)$/);
        if (m && (COLOUR.test(m[2]) || (colourId && m[2] === String(colourId).toLowerCase()))) {
          n = m[1];
          colour = m[2];
        }
        return { key: dir + n, colour };
      };
      const items = [];
      for (const f of document.querySelectorAll("[data-product]")) {
        if (inFixed(f) || f.closest('[class*="marquee"], [class*="ticker"]')) continue;
        const r = f.getBoundingClientRect();
        if (r.width < 120 || r.height < 90 || !visible(f)) continue;
        const view = (f.getAttribute("data-product-view") || f.dataset.productView || "three-quarter").toLowerCase(),
          scene = (f.getAttribute("data-product-scene") || "").toLowerCase();
        const colour = (f.dataset.productColorShown || f.getAttribute("data-product-color") || "").toLowerCase();
        items.push({
          el: f,
          key: "P|" + (f.getAttribute("data-product") || "") + "|" + view + "|" + scene,
          colour,
          name: `${view}${scene ? " / " + scene : ""}`,
          top: Math.round(r.top + scrollY),
        });
      }
      for (const i of document.images) {
        if (
          i.closest("[data-product]")
          || inDrawn(i)
          || inFixed(i)
          || !visible(i)
          || i.closest('[class*="marquee"], [class*="ticker"]')
        )
          continue;
        const r = i.getBoundingClientRect();
        if (r.width < 160 || r.height < 100) continue;
        const u = i.getAttribute("src") || i.currentSrc || "";
        if (!u || /\.svg([?#]|$)/i.test(u) || /^data:/i.test(u)) continue;
        const s = stemOf(u, i.getAttribute("data-colour") || "");
        if (!s.colour) continue; // no colour in the name: nothing to tell this from photo-repeat
        items.push({
          el: i,
          key: "I|" + s.key,
          colour: s.colour,
          name: s.key.split("/").pop(),
          top: Math.round(r.top + scrollY),
        });
      }
      const by = new Map();
      for (const it of items) {
        if (!by.has(it.key)) by.set(it.key, []);
        by.get(it.key).push(it);
      }
      for (const [, all] of by) {
        if (all.length < 2) continue;
        // a colourway row (one section showing one view in each of its colours) is one picture: it counts once
        const perSec = new Map();
        for (const o of all) {
          const k = secIndex(o.el);
          if (!perSec.has(k)) perSec.set(k, []);
          perSec.get(k).push(o);
        }
        const list = [];
        for (const [k, arr] of perSec) {
          if (k >= 0 && arr.length > 1 && new Set(arr.map(o => o.colour)).size === arr.length) list.push(arr[0]);
          else list.push(...arr);
        }
        if (list.length < 2) continue;
        const cols = new Set(list.map(o => o.colour)),
          sameColour = cols.size < list.length;
        // a plain picture twice in one colour is photo-repeat's (same file); a [data-product] frame twice is told here either way
        if (list[0].key[0] === "I" && cols.size < 2) continue;
        const sorted = [...list].sort((p, q) => p.top - q.top),
          idx = sorted.map(o => secIndex(o.el));
        let adjacent = false;
        for (let a = 0; a < idx.length; a++)
          for (let b = a + 1; b < idx.length; b++)
            if (idx[a] >= 0 && idx[b] >= 0 && Math.abs(idx[a] - idx[b]) === 1) adjacent = true;
        const sec = o => {
          const k = secIndex(o.el);
          return (
            k >= 0 ?
              S[k].id ?
                "#" + S[k].id
              : "section " + (k + 1)
            : "the page"
          );
        };
        out.viewRepeats.push({
          id: idOf(sorted[1].el),
          sel: sel(sorted[1].el),
          text: sorted[0].name.slice(0, 50),
          n: list.length,
          sameColour,
          adjacent,
          colours: [...cols].filter(Boolean),
          where: sorted.map(sec),
          doc: doc(sorted[1].el),
          more: [doc(sorted[0].el)],
        });
      }
    }
    // same-object: the sections whose MAIN visual (the largest picture, render or object a section holds) is one and the same object.
    // An object is a [data-product] spec whatever its colour (and every still the render kit exported for it), a [data-object] or [data-print]
    // id, or a still file stem less its width, half-size, colour, ground and view suffixes. It counts only WHOLE: a section whose main visual is a
    // use scene, a detail close-up or the exploded view (frame or still) is another kind of picture and counts for no object
    out.sameObject = null;
    {
      const SECS = S.filter(s => !/^(FOOTER|HEADER)$/.test(s.tagName));
      const COLOUR =
        /^(black|white|grey|gray|silver|graphite|stone|sand|cream|beige|ivory|red|blue|navy|green|olive|sage|yellow|orange|pink|purple|brown|tan|charcoal|natural|oak|walnut|bone|moss|clay|rust|teal|gold|copper|slate|ash|mint|sky|night|ink|petrol|forest|sea|ocean|coral|plum|wine|mustard|lemon|lime|rose|blush|mist|fog|smoke|chalk|snow|steel|chrome|bronze|brass|ember|signal|amber|dark|light)$/i;
      const VIEWTOK =
        /^(side|front|rear|back|top|three|quarter|detail|closeup|profile|angle|iso|exploded|hero|loaded|square|carry|studio)$/;
      const baseOf = u =>
        String(u || "")
          .split(/[?#]/)[0]
          .split("/")
          .pop()
          .replace(/\.(stills\.)?json$/i, "")
          .toLowerCase();
      const bases = [
        ...new Set(
          [...document.querySelectorAll("[data-product]")]
            .map(f => baseOf(f.getAttribute("data-product")))
            .filter(Boolean),
        ),
      ].sort((a, b) => b.length - a.length);
      // a picture of the object that is NOT the object whole: a use scene (its setting fills the frame), a detail:<part> close-up, the exploded
      // scene. The scene words are the page's own data-product-scene names plus the common ones; a still names its view and scene after the stem
      // The scene names a product spec declares are read too (the spec the frames point to and any stills manifest the page loaded, best
      // effort, read once: only files the page itself already loaded, so nothing new is requested); the built-in words stay as a fallback
      if (!window.__ccDeclared) {
        const sc = new Set(),
          co = new Set(),
          seen = new Set(),
          tokens = s =>
            String(s || "")
              .toLowerCase()
              .split(/[^a-z0-9]+/)
              .filter(x => x.length >= 3);
        const urls = [...document.querySelectorAll("[data-product]")]
          .map(f => f.getAttribute("data-product") || "")
          .filter(u => /\.json(?:[?#]|$)/i.test(u));
        try {
          for (const e of performance.getEntriesByType("resource"))
            if (/\/specs?\/[^?#]*\.json(?:[?#]|$)/i.test(e.name) || /\.stills\.json(?:[?#]|$)/i.test(e.name))
              urls.push(e.name);
        } catch (e) {
          /* no resource timing */
        }
        for (const u of urls) {
          if (seen.size >= 8) break;
          let abs;
          try {
            abs = new URL(u, document.baseURI).href;
          } catch (e) {
            continue;
          }
          if (seen.has(abs)) continue;
          seen.add(abs);
          try {
            const x = new XMLHttpRequest();
            x.open("GET", abs, false);
            x.send(null);
            if (x.status < 200 || x.status >= 300) continue;
            const d = JSON.parse(x.responseText);
            for (const k of Object.keys(d.scenes || {})) tokens(k).forEach(t => sc.add(t));
            for (const v of Object.values(d.variants || {})) if (v && v.scene) tokens(v.scene).forEach(t => sc.add(t));
            for (const c of Array.isArray(d.colors) ? d.colors : [])
              tokens(typeof c === "string" ? c : (c.id || "") + "-" + (c.name || "")).forEach(t => co.add(t));
          } catch (e) {
            /* best effort */
          }
        }
        window.__ccDeclared = { scenes: sc, colours: co };
      }
      const SCENEW = new Set([
        "detail",
        "closeup",
        "exploded",
        "loaded",
        "work",
        "desk",
        "carry",
        "scene",
        "use",
        "inuse",
        "lifestyle",
        "bench",
        "parts",
        "macro",
        ...[...document.querySelectorAll("[data-product-scene]")]
          .flatMap(f =>
            String(f.getAttribute("data-product-scene") || "")
              .toLowerCase()
              .split(/[^a-z0-9]+/),
          )
          .filter(x => x.length >= 3),
        ...window.__ccDeclared.scenes,
      ]);
      const notWhole = f => {
        if ((f.getAttribute("data-product-scene") || "").trim()) return true;
        const v = (f.getAttribute("data-product-view") || f.dataset.productView || "").toLowerCase();
        return /^(detail|closeup|exploded)/.test(v);
      };
      // a scene still: a scene word anywhere after the stem's first word, or, once the width, half, ground and colour suffixes are off, a token
      // after the view tokens (<id>-three-quarter-handling-graphite is the use scene "handling": a view alone is the object whole)
      const sceneStill = n => {
        if (
          n
            .split(/[-_]/)
            .slice(1)
            .some(x => SCENEW.has(x))
        )
          return true;
        const t = n.split(/[-_]/);
        while (
          t.length > 1
          && (/^(half|\d{3,4}|\d{3,4}x\d{3,4}|@\dx|2x|3x)$/.test(t[t.length - 1])
            || COLOUR.test(t[t.length - 1])
            || window.__ccDeclared.colours.has(t[t.length - 1]))
        )
          t.pop();
        const v = t.findIndex((x, i) => i >= 1 && VIEWTOK.test(x));
        if (v < 1) return false;
        let e = v;
        while (e < t.length && VIEWTOK.test(t[e])) e++;
        return e < t.length;
      };
      const stillKey = u => {
        let p;
        try {
          p = new URL(u, document.baseURI).pathname;
        } catch (e) {
          p = String(u).split(/[?#]/)[0];
        }
        const n = decodeURIComponent(p.slice(p.lastIndexOf("/") + 1))
          .replace(/\.\w+$/, "")
          .toLowerCase();
        if (sceneStill(n)) return "X|scene";
        const b = bases.find(x => n === x || n.startsWith(x + "-"));
        if (b) return "S|" + b;
        const t = n.split("-"); // width, half-size, colour and ground suffixes come off the end, then the view and what follows it
        while (
          t.length > 1
          && (/^(half|\d{3,4}|\d{3,4}x\d{3,4}|@\dx|2x|3x)$/.test(t[t.length - 1]) || COLOUR.test(t[t.length - 1]))
        )
          t.pop();
        const v = t.findIndex((x, i) => i >= 1 && VIEWTOK.test(x));
        if (v >= 1) t.length = v;
        const s = t.join("-");
        return s.length >= 4 && !/^(photo|img|image|pic|picture|hero|bg|background|shot|still|render)$/.test(s) ?
            "F|" + s
          : null;
      };
      const vis = [];
      for (const f of document.querySelectorAll("[data-product], [data-object], [data-print]")) {
        if (f.parentElement && f.parentElement.closest("[data-product], [data-object], [data-print]")) continue;
        if (inFixed(f) || f.closest('[class*="marquee"], [class*="ticker"]') || !visible(f)) continue;
        const r = f.getBoundingClientRect();
        if (r.width < 120 || r.height < 90) continue;
        // a use scene, a close-up or the exploded view is another kind of picture: it can be a section's main visual, but it is not the object whole
        if (f.hasAttribute("data-product") && notWhole(f)) {
          vis.push({ el: f, key: "X|scene", area: r.width * r.height, name: "scene" });
          continue;
        }
        const key =
          f.hasAttribute("data-product") ?
            "S|" + baseOf(f.getAttribute("data-product"))
          : "O|"
            + String(f.getAttribute("data-object") || f.getAttribute("data-print") || "")
              .trim()
              .toLowerCase();
        if (/\|$/.test(key)) continue;
        vis.push({ el: f, key, area: r.width * r.height, name: key.slice(2) });
      }
      for (const i of document.images) {
        if (
          i.closest("[data-product], [data-object], [data-print]")
          || inDrawn(i)
          || inFixed(i)
          || !visible(i)
          || i.closest('[class*="marquee"], [class*="ticker"]')
        )
          continue;
        const r = i.getBoundingClientRect();
        if (r.width < 160 || r.height < 100) continue;
        const u = i.getAttribute("src") || i.currentSrc || "";
        if (!u || /\.svg([?#]|$)/i.test(u) || /^data:/i.test(u)) continue;
        const key = stillKey(u);
        if (!key) continue;
        vis.push({ el: i, key, area: r.width * r.height, name: key.slice(2) });
      }
      const main = new Map(); // section index -> its largest visual
      for (const v of vis) {
        const k = SECS.findIndex(s => s.contains(v.el));
        if (k < 0) continue;
        const m = main.get(k);
        if (!m || v.area > m.area) main.set(k, v);
      }
      const by = new Map();
      for (const [k, v] of main) {
        if (v.key === "X|scene") continue;
        if (!by.has(v.key)) by.set(v.key, []);
        by.get(v.key).push({ k, v });
      }
      let best = null;
      for (const [key, arr] of by) if (!best || arr.length > best.arr.length) best = { key, arr };
      if (best && best.arr.length >= 4) {
        const name = k => {
          const s = SECS[k],
            h = s.querySelector("h1, h2, h3");
          return (
            k === 0 && s.matches('.hero, [class*="hero"]') ? "the hero"
            : s.id ? "#" + s.id
            : h ? `"${label(h).slice(0, 24)}"`
            : "section " + (k + 1)
          );
        };
        const arr = best.arr.sort((a, b) => a.k - b.k),
          v0 = arr[0].v;
        out.sameObject = {
          id: idOf(v0.el),
          sel: sel(v0.el),
          text: v0.name.slice(0, 50),
          n: arr.length,
          total: SECS.length,
          where: arr.map(x => name(x.k)),
          doc: doc(v0.el),
          more: arr.slice(1, 6).map(x => doc(x.v.el)),
        };
      }
    }
    // photo-weight: a photograph far wider than it is drawn, with no srcset: on a phone it arrives late and its frame
    // shows only its ground until then (an empty frame on a phone)
    for (const i of document.images) {
      if (
        inDrawn(i)
        || !i.naturalWidth
        || i.srcset
        || (i.closest("picture") && i.closest("picture").querySelector("source[srcset]"))
      )
        continue;
      const r = i.getBoundingClientRect();
      if (r.width < 120 || r.height < 80 || !visible(i)) continue;
      const src = i.currentSrc || i.src;
      if (/\.svg(\?|#|$)|^data:/i.test(src)) continue;
      const e = performance.getEntriesByName(src)[0],
        kb = e ? Math.round((e.encodedBodySize || e.decodedBodySize || e.transferSize || 0) / 1024) : 0;
      if (i.naturalWidth >= 3 * r.width && i.naturalWidth >= 1200 && kb >= 150)
        out.heavy.push({
          id: idOf(i),
          sel: sel(i),
          text: src.split("/").pop().slice(0, 50),
          nw: i.naturalWidth,
          w: Math.round(r.width),
          kb,
          lazy: i.loading === "lazy",
          doc: doc(i),
        });
    }
    // a number broken from its unit at the end of a line ("250 / W")
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode()) && out.units.length < 12) {
      const t = n.nodeValue;
      if (!/\d/.test(t)) continue;
      const p = n.parentElement;
      if (!p || SKIP.has(p.tagName) || inFixed(p) || !visible(p)) continue;
      for (const m of t.matchAll(UNIT)) {
        const a = document.createRange();
        a.setStart(n, m.index);
        a.setEnd(n, m.index + m[1].length);
        const b = document.createRange();
        b.setStart(n, m.index + m[1].length + m[2].length);
        b.setEnd(n, m.index + m[0].length);
        const ra = [...a.getClientRects()].pop(),
          rb = b.getClientRects()[0];
        if (!ra || !rb || rb.top < ra.bottom - 2) continue;
        const blk = p.closest("p, li, h1, h2, h3, h4, h5, h6, dd, td, figcaption, blockquote") || p;
        out.units.push({
          id: idOf(blk),
          sel: sel(blk),
          text: label(blk),
          what: m[0].replace(/\s+/g, " "),
          drawn: inDrawn(p),
          doc: D({
            left: Math.min(ra.left, rb.left),
            top: ra.top,
            width: Math.max(ra.right, rb.right) - Math.min(ra.left, rb.left),
            height: rb.bottom - ra.top,
          }),
        });
        break;
      }
    }
    // a row of tabs that wraps and leaves one tab alone on its line; the selected tab's look at rest
    for (const L of document.querySelectorAll('[role="tablist"], .tabs, [class*="segmented"], [class*="filters"]')) {
      if (inDrawn(L) || inFixed(L) || !visible(L)) continue;
      const items = [...L.querySelectorAll('[role="tab"], button, a[href]')].filter(
        e => visible(e) && !(e.parentElement && e.parentElement.closest('[role="tab"]')),
      );
      if (items.length < 3) continue;
      const rows = [];
      for (const e of items) {
        const r = e.getBoundingClientRect();
        const row = rows.find(x => Math.abs(x.y - r.top) < r.height * 0.5);
        if (row) row.items.push(e);
        else rows.push({ y: r.top, items: [e] });
      }
      rows.sort((a, b) => a.y - b.y);
      if (rows.length >= 2 && rows[rows.length - 1].items.length === 1) {
        const lone = rows[rows.length - 1].items[0];
        out.tabWraps.push({
          id: idOf(lone),
          sel: sel(lone),
          text: label(lone),
          n: items.length,
          rows: rows.length,
          doc: doc(L),
        });
      }
      const on = items.find(e =>
        e.matches('[aria-selected="true"], [aria-current], .is-active, .active, [aria-pressed="true"]'),
      );
      if (on) {
        let L2 = buttonLook(on, true),
          via = "";
        if (!L2 || !L2.fill) {
          // the indicator drawn under it (a pill that slides between tabs)
          const r = on.getBoundingClientRect();
          for (const c of L.querySelectorAll("*")) {
            if (c === on || c.contains(on) || on.contains(c)) continue;
            const q = c.getBoundingClientRect(),
              b = rgba(CS(c).backgroundColor);
            const ov =
              Math.max(0, Math.min(q.right, r.right) - Math.max(q.left, r.left))
              * Math.max(0, Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top));
            if (b.a >= 0.5 && ov >= 0.8 * r.width * r.height && q.width * q.height <= 1.6 * r.width * r.height) {
              const rad = parseFloat(CS(c).borderTopLeftRadius) || 0;
              L2 = {
                fill: hex(b),
                shape:
                  rad >= q.height / 2 - 2 ? "pill"
                  : rad <= 2 ? "square"
                  : rad <= 12 ? "soft"
                  : "round",
                text: label(on),
                h: Math.round(q.height),
              };
              via = "its sliding indicator";
              break;
            }
          }
        }
        if (L2 && L2.fill)
          out.tabs.push({
            id: idOf(on),
            sel: sel(on),
            text: label(on),
            fill: L2.fill,
            shape: L2.shape,
            via,
            doc: doc(on),
          });
      }
    }
    // big figures (a stat, a price, a measure) and their sizes
    for (const e of document.body.querySelectorAll("*")) {
      if (
        SKIP.has(e.tagName)
        || isSvgPart(e)
        || !ownText(e)
        || inDrawn(e)
        || inFixed(e)
        || e.closest("header nav, nav, " + INTER)
      )
        continue;
      const t = full(e);
      if (t.length > 16 || !/\d/.test(t) || !visible(e)) continue;
      const fs = parseFloat(CS(e).fontSize) || 16;
      if (fs < 24) continue;
      out.figures.push({
        id: idOf(e),
        sel: sel(e),
        text: t,
        fs: Math.round(fs * 10) / 10,
        head: !!e.closest(HEADS),
        foot: !!e.closest("footer"),
        sec: secIndex(e),
        doc: doc(e),
      });
    }
    // where each section's heading starts (a left-aligned heading off the page margin), and whether a visual sits left of it
    S.forEach((s, i) => {
      if (i === 0 || s.tagName === "FOOTER") return;
      const h = s.querySelector("h2, h3");
      if (!h || inDrawn(h) || !visible(h)) return;
      const hc = CS(h);
      if (/center|right|end/.test(hc.textAlign)) return;
      // a heading on a panel or a card starts at its padding: the panel is what sits on the grid
      for (let a = h.parentElement; a && a !== s; a = a.parentElement) {
        const k = quickKind(a);
        if (k && k !== "media" && a.getBoundingClientRect().width < vw * 0.9) return;
      }
      const ls = deepLines(h);
      if (!ls.length) return;
      const left = Math.min(...ls.map(l => l.left)),
        hr = h.getBoundingClientRect();
      const beside = [
        ...s.querySelectorAll(
          "img, video, canvas, picture, svg, [data-ui], .ui[class*=ui-], [data-fx], .frame, .panel, figure, blockquote, aside, ul, ol, dl",
        ),
      ].some(e => {
        const q = e.getBoundingClientRect();
        return (
          q.width >= 60 && q.right <= left - 16 && q.bottom > hr.top - 200 && q.top < hr.bottom + 400 && shown(e, q)
        );
      });
      // a block centred on the page with its words set on the left (a narrow closing column)
      let blk = h.parentElement;
      while (blk && blk !== s && blk.getBoundingClientRect().width < vw * 0.4) blk = blk.parentElement;
      const br = (blk || h).getBoundingClientRect(),
        centredBlock = Math.abs((br.left + br.right) / 2 - vw / 2) <= 3 && br.width < vw * 0.8;
      out.starts.push({
        sec: i,
        id: idOf(h),
        sel: sel(h),
        text: label(h),
        left: Math.round(left),
        beside,
        centredBlock,
        doc: doc(h),
      });
    });
    // credits: every line that credits a photograph or a licence, outside a picture's own caption, and how many lines
    {
      const blocks = [];
      for (const e of document.body.querySelectorAll("p, li, small, span, div, dd, figcaption, address")) {
        if (inDrawn(e) || !ownText(e) || !visible(e)) continue;
        const t = full(e);
        if (!CREDIT_W.test(t) || t.length > 900) continue;
        if (blocks.some(b => b.contains(e) || e.contains(b))) continue;
        blocks.push(e);
      }
      const foot = blocks.filter(b => b.closest("footer") || secIndex(b) === S.length - 1);
      if (foot.length) {
        const tops = new Set();
        let chars = 0;
        for (const b of foot) {
          for (const l of deepLines(b)) tops.add(Math.round(l.top + scrollY));
          chars += full(b).length;
        }
        const text = foot.map(full).join(" ");
        const entries = (
          text.match(
            /\b(by|from|via)\s+\p{Lu}|\bCC[ -]?BY|\bCC0\b|\bpublic domain\b|\bUnsplash\b|\bPexels\b|\bPixabay\b|\bWikimedia\b/giu,
          ) || []
        ).length;
        out.credits = {
          id: idOf(foot[0]),
          sel: sel(foot[0]),
          text: label(foot[0]),
          blocks: foot.length,
          lines: tops.size,
          chars,
          entries,
          doc: D(
            (() => {
              const rs = foot.map(b => b.getBoundingClientRect());
              const l = Math.min(...rs.map(r => r.left)),
                t = Math.min(...rs.map(r => r.top));
              return {
                left: l,
                top: t,
                width: Math.max(...rs.map(r => r.right)) - l,
                height: Math.max(...rs.map(r => r.bottom)) - t,
              };
            })(),
          ),
        };
      }
    }
    // every link in the footer that credits a photograph (a photographer's page, a source file, a licence), read even when a closed
    // <details> hides it: the footer holds one credits line, the list is a page of its own (photos.mjs credits --write)
    {
      const CH =
        /(^|\.)(wikimedia\.org|unsplash\.com|pexels\.com|pixabay\.com|flickr\.com|creativecommons\.org|publicdomainpictures\.net)$/i;
      const links = [];
      for (const a of document.querySelectorAll("footer a[href]")) {
        let h = "";
        try {
          h = new URL(a.href, location.href).hostname;
        } catch (x) {
          continue;
        }
        if (CH.test(h)) links.push(a);
      }
      if (links.length) {
        const ft = links[0].closest("footer");
        out.creditLinks = {
          id: idOf(ft),
          sel: sel(ft),
          text: label(links[0]),
          n: links.length,
          hidden: links.filter(a => !visible(a)).length,
          doc: doc(ft),
        };
      }
    }
    // a note that the page's names and figures are examples; a caption that explains the picture; any line of words
    // right under a photograph; a stand-in address printed on the page
    const seenB = new Set();
    for (const e of document.body.querySelectorAll("p, li, small, span, div, figcaption, dd, address, em")) {
      if (!ownText(e) || inDrawn(e) || !visible(e)) continue;
      const b = blockOf(e);
      if (seenB.has(b)) continue;
      seenB.add(b);
      const t = full(b);
      if (!t || t.length > 400) continue;
      const it = { id: idOf(b), sel: sel(b), text: t.slice(0, 80), doc: doc(b) };
      if (EXAMPLES.test(t)) out.examples.push(Object.assign(it, { what: (t.match(EXAMPLES) || [""])[0] }));
      const under = (() => {
        if (b.closest("figcaption")) {
          const fg = b.closest("figure");
          return (
              fg
                && [...fg.querySelectorAll("img, picture, video, canvas, svg")].some(x => {
                  const q = x.getBoundingClientRect();
                  return q.width >= 200 && q.height >= 120;
                })
            ) ?
              fg
            : null;
        }
        let pv = b.previousElementSibling;
        while (pv && (SKIP.has(pv.tagName) || !visible(pv))) pv = pv.previousElementSibling;
        if (!pv) return null;
        const pic =
          MEDIA.has(pv.tagName) || pv.matches("figure, picture, .frame, [data-fx]") ?
            pv
          : pv.querySelector(":scope > img, :scope > picture, :scope > video, :scope > canvas");
        if (!pic) return null;
        const q = pv.getBoundingClientRect(),
          r = b.getBoundingClientRect();
        return q.width >= 200 && q.height >= 120 && r.top - q.bottom >= -1 && r.top - q.bottom <= 40 ? pv : null;
      })();
      if (under && !CREDIT_W.test(t) && !b.closest(FRAG)) {
        if (EXPLAIN.test(t) || PROVENANCE.test(t))
          out.explain.push(
            Object.assign({}, it, { what: (t.match(EXPLAIN) || t.match(PROVENANCE) || [""])[0], ref: doc(under) }),
          );
        else if (t.split(" ").length >= 4 && /\p{Ll}/u.test(t) && !b.closest("a[href], button"))
          out.captions.push(Object.assign({}, it, { ref: doc(under) }));
      }
      {
        const ph = fakeContact(t);
        if (ph) out.printed.push(Object.assign({}, it, { what: ph }));
      }
    }
    // a form whose fields (boxes) sit in two more boxes
    for (const f of document.querySelectorAll("form")) {
      if (inDrawn(f) || !visible(f)) continue;
      const fld = [
        ...f.querySelectorAll(
          'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea',
        ),
      ].find(i => visible(i) && (bordered(CS(i)) || quickKind(i)));
      if (!fld) continue;
      const ch = [];
      for (
        let a = fld.parentElement;
        a && a !== document.body && !a.matches("section, main, footer");
        a = a.parentElement
      ) {
        const k = quickKind(a);
        if (!k || k === "media" || k === "shadow") continue;
        const q = a.getBoundingClientRect();
        if (q.width < 120 || q.width >= vw * 0.95 || isBand(q, vw)) continue;
        if (
          ch.length
          && Math.abs(ch[ch.length - 1].q.width - q.width) <= 6
          && Math.abs(ch[ch.length - 1].q.height - q.height) <= 6
        )
          continue;
        ch.push({ a, q });
      }
      if (ch.length >= 2)
        out.formNest.push({
          id: idOf(f),
          sel: sel(f),
          text: label(f),
          chain: [...ch.map(x => sel(x.a).split(" > ").pop()).reverse(), "its fields"],
          doc: doc(ch[ch.length - 1].a),
        });
    }
    // on a phone, the page's buttons full width but one or two left at their own width (one action in two sizes)
    out.btnWidth = null;
    if (vw < 700) {
      const full = [],
        auto = [];
      for (const b of document.querySelectorAll(INTER)) {
        if (
          inDrawn(b)
          || inFixed(b)
          || b.closest('header, nav, [role="tablist"], details, dialog, [role="menu"], .nav__menu, [hidden]')
          || b.matches('summary, [role="tab"], [aria-expanded]')
        )
          continue;
        const r = b.getBoundingClientRect();
        if (r.width < 1 || r.height < 36 || !shown(b, r)) continue;
        const L = buttonLook(b, true);
        if (!L || !(L.fill || L.stroke)) continue;
        const p = b.parentElement,
          pc = CS(p),
          pr = p.getBoundingClientRect();
        const inner = pr.width - (parseFloat(pc.paddingLeft) || 0) - (parseFloat(pc.paddingRight) || 0);
        if (inner < vw * 0.6) continue; // a button in a card or a narrow column
        // a button beside another one in a row is sized by the row
        if (
          [...p.children].some(s => s !== b && s.matches(INTER) && Math.abs(s.getBoundingClientRect().top - r.top) < 4)
        )
          continue;
        (r.width >= inner * 0.9 ? full : auto).push({
          id: idOf(b),
          sel: sel(b),
          text: label(b),
          w: Math.round(r.width),
          inner: Math.round(inner),
          doc: doc(b),
        });
      }
      if (full.length >= 2 && auto.length >= 1 && auto.length <= full.length)
        out.btnWidth = { full: full.length, auto };
    }
    // a split that stacks (a tablet, a phone): its text and its visual one under the other, closer than 24px (the
    // grid's row gap left at 16px glues the picture to the buttons above it)
    out.stackGap = [];
    if (vw < 1024) {
      const VIS = "img, picture, video, canvas, svg, [data-ui], .ui[class*=ui-], [data-fx], .frame, figure";
      for (const g of document.querySelectorAll("main *")) {
        if (out.stackGap.length >= 4) break;
        const gc = CS(g);
        if (!/grid|flex/.test(gc.display) || inDrawn(g) || inFixed(g)) continue;
        const kids = [...g.children].filter(k => {
          const r = k.getBoundingClientRect();
          return r.width >= vw * 0.5 && r.height >= 24 && shown(k, r);
        });
        for (let i = 0; i + 1 < kids.length; i++) {
          const a = kids[i],
            b = kids[i + 1],
            ra = a.getBoundingClientRect(),
            rb = b.getBoundingClientRect();
          if (rb.top < ra.bottom - 2 || Math.abs(ra.left - rb.left) > 24) continue; // not stacked
          const aText =
            !a.matches(VIS)
            && !a.querySelector("img, video, canvas, [data-ui], .ui[class*=ui-], [data-fx]")
            && /\S/.test(full(a));
          const bVis =
            b.matches(VIS)
            || (!!b.querySelector("img, video, canvas, [data-ui], .ui[class*=ui-], [data-fx]")
              && full(b).length < 400
              && quickKind(b));
          if (!aText || !bVis) continue;
          const ext = (() => {
            let bot = -1e9;
            for (const e of a.querySelectorAll("*")) {
              if (SKIP.has(e.tagName)) continue;
              const q = e.getBoundingClientRect();
              if (q.height < 1 || !shown(e, q)) continue;
              if (e.matches(INTER) && quickKind(e)) bot = Math.max(bot, q.bottom);
              else if (ownText(e)) for (const l of lines(e)) bot = Math.max(bot, l.bottom);
            }
            return bot;
          })();
          const d = Math.round(rb.top - ext);
          if (ext > -1e9 && d < 24 && d > -2)
            out.stackGap.push({
              id: idOf(b),
              sel: sel(b),
              text: label(a),
              d,
              doc: D({ left: ra.left, top: ext - 20, width: Math.max(ra.width, rb.width), height: d + 60 }),
            });
        }
      }
    }
    // a menu whose entries go to one place: three or more labels in one dropdown sharing a target
    out.menuDup = [];
    for (const m of document.querySelectorAll(
      'header .nav__menu, header [role="menu"], header [class*="dropdown"], header [class*="mega"], nav [role="menu"], nav [class*="dropdown"], nav [class*="mega"]',
    )) {
      if (m.parentElement && m.parentElement.closest('.nav__menu, [role="menu"], [class*="dropdown"], [class*="mega"]'))
        continue;
      const by = new Map();
      for (const a of m.querySelectorAll("a[href]")) {
        const h = a.getAttribute("href");
        if (!/^#./.test(h)) continue;
        const t = full(a).slice(0, 30);
        if (!by.has(h)) by.set(h, new Set());
        by.get(h).add(t);
      }
      for (const [h, ts] of by)
        if (ts.size >= 3) {
          const first = m.querySelector(`a[href="${CSS.escape(h)}"]`);
          out.menuDup.push({
            id: idOf(first),
            sel: sel(first),
            text: [...ts][0],
            href: h,
            n: ts.size,
            labels: [...ts].slice(0, 4),
          });
        }
    }
    return out;
  }
  // every shader the page compiled, the ones that failed, and its script sources (read by the caller for the lint)
  function glInfo() {
    const G = window.__ccgl || { shaders: [], fails: [] };
    const files = [
      ...new Set(
        [...document.scripts]
          .map(s => s.src)
          .filter(Boolean)
          .concat(
            performance
              .getEntriesByType("resource")
              .map(e => e.name)
              .filter(u => /\.(m?js|glsl|frag|vert|vs|fs)(\?|#|$)/i.test(u)),
          ),
      ),
    ].slice(0, 80);
    const inline = [...document.scripts].filter(s => !s.src && s.textContent.length < 400000).map(s => s.textContent);
    return { shaders: G.shaders || [], fails: G.fails || [], files, inline };
  }
  // the gl-fallback pass: each WebGL host on this screen (an effect ground, a canvas), with what is drawn over it
  function glHosts() {
    fresh();
    const vw = vwNow(),
      vh = innerHeight,
      out = [];
    const hosts = new Set();
    for (const cv of document.querySelectorAll("canvas")) {
      const h = cv.closest("[data-fx], [data-fx-mounted], [data-object], [data-scene]") || cv.parentElement;
      if (h) hosts.add(h);
    }
    for (const h of document.querySelectorAll("[data-fx], [data-fx-mounted]")) hosts.add(h);
    for (const h of hosts) {
      if (inFixed(h) || h.closest('dialog, [role="menu"], .nav__menu, [hidden]')) continue;
      const r = h.getBoundingClientRect();
      if (
        r.width < 64
        || r.height < 48
        || r.left < -1
        || r.right > vw + 1
        || Math.min(r.bottom, vh) - Math.max(r.top, 0) < 0.6 * Math.min(r.height, vh)
        || !shown(h, r)
      )
        continue;
      out.push({
        id: idOf(h),
        sel: sel(h),
        fx: fxOf(h),
        rect: R(onScreen(r, vw, vh)),
        holes: holesIn(h, r, null),
        sec: secIndex(h),
        text: label(h.closest("section") ? h.closest("section").querySelector("h1, h2, h3") || h : h),
      });
    }
    return out;
  }

  // nav-collapse: at a tablet width the bar keeps only the wordmark and a menu button while its main action (a filled
  // button the bar holds) is hidden in the closed menu, though the bar has room for it
  async function navCollapse() {
    // read at the top of the page, as it loads (a pass before may have left the page scrolled, and a bar that changes
    // on scroll shows another set of items there)
    if (scrollY > 2) {
      scrollToY(0);
      await wait(250);
    }
    fresh();
    const vw = vwNow(),
      vh = innerHeight;
    const head = [...document.querySelectorAll('header, [role="banner"], body > nav, [data-nav]')].find(h => {
      const r = h.getBoundingClientRect();
      return r.top < 120 && r.width >= vw * 0.5 && r.height > 0 && r.height < 200;
    });
    if (!head) return null;
    const vis = e => {
      const r = e.getBoundingClientRect();
      return r.width >= 1 && r.height >= 1 && r.top < vh && shown(e, r);
    };
    const items = [...head.querySelectorAll(INTER)];
    const toggle = items.find(
      e =>
        vis(e)
        && (e.matches("[aria-expanded], [aria-controls]")
          || /menu|burger|toggle/i.test(
            (typeof e.className === "string" ? e.className : "")
              + " "
              + (e.getAttribute("aria-label") || "")
              + " "
              + full(e),
          )),
    );
    if (!toggle) return null;
    const shownBtns = items.filter(e => e !== toggle && vis(e) && buttonLook(e, true) && buttonLook(e, true).fill);
    if (shownBtns.length) return null;
    const hidden = items.filter(
      e =>
        e !== toggle
        && !vis(e)
        && /btn|button|cta/i.test(typeof e.className === "string" ? e.className : "")
        && full(e).length >= 3
        && full(e).length <= 40,
    );
    if (!hidden.length) return null;
    const main = hidden.find(e => /primary|cta|accent|solid/i.test(e.className)) || hidden[0];
    const bar = head.getBoundingClientRect(),
      used = items.filter(e => vis(e)).map(e => e.getBoundingClientRect());
    const free = bar.width - used.reduce((s, r) => s + r.width, 0);
    return { id: idOf(toggle), sel: sel(toggle), text: full(main).slice(0, 40), free: Math.round(free), doc: D(bar) };
  }
  // anchors that land on a closed answer: a link to a closed <details>, into one, or into a hidden panel; the page is
  // given the hash (its own script may open the target) and the target read 300 ms later
  async function closedAnchors() {
    const seen = new Set(),
      out = [];
    const links = [...document.querySelectorAll('a[href^="#"]')].filter(a => {
      const h = a.getAttribute("href");
      return h.length > 1 && !inDrawn(a);
    });
    for (const a of links) {
      const id = decodeURIComponent(a.getAttribute("href").slice(1));
      if (seen.has(id)) continue;
      seen.add(id);
      const t = document.getElementById(id);
      if (!t || (t.matches("section, main, footer, header, article") && !t.matches("details"))) continue;
      const det = t.matches("details") ? t : t.closest("details");
      const pane = !det && t.closest('[hidden], [role="tabpanel"], [aria-hidden="true"]');
      if (!(det && !det.open) && !pane) continue;
      const before = location.hash;
      try {
        location.hash = "#" + id;
      } catch (e) {}
      await wait(300);
      const closed =
        det ?
          !det.open
        : (() => {
            const r = t.getBoundingClientRect();
            return !(r.width > 0 && r.height > 0 && shown(t, r));
          })();
      if (det && det.open) det.open = false; // the page opened it: put it back as it was for the rest of the check
      try {
        history.replaceState(null, "", location.pathname + location.search + (before || ""));
      } catch (e) {}
      if (closed)
        out.push({
          id: idOf(a),
          sel: sel(a),
          text: label(a),
          target: id,
          kind: det ? "a closed answer" : "a hidden panel",
        });
      if (out.length >= 6) break;
    }
    scrollToY(0);
    await wait(200);
    return out;
  }
  // font-load: the first family of each stack the type tokens, the h1, the h2s and the body text ask for, once the fonts
  // are ready: a web font no loaded face answers (a missing or misspelt font link, a family nothing loads) shows its
  // fallback. Generic families, system stacks and a face installed on this machine are no web fonts
  async function fontLoad() {
    if (!document.fonts) return [];
    await Promise.race([document.fonts.ready, wait(5000)]);
    const SYS =
      /^(serif|sans-serif|monospace|cursive|fantasy|math|emoji|fangsong|system-ui|ui-(serif|sans-serif|monospace|rounded)|-apple-system|blinkmacsystemfont|segoe ui.*|helvetica( neue)?|arial|georgia|times( new roman)?|menlo|monaco|consolas|sfmono-regular|sf mono|courier( new)?|liberation mono|.*emoji|inherit|initial|unset|revert)$/i;
    const fam = s =>
      String(s || "")
        .split(",")[0]
        .trim()
        .replace(/^["']|["']$/g, "");
    const fc = document.createElement("canvas").getContext("2d");
    const wide = f => {
      fc.font = `40px ${f}`;
      return fc.measureText("mmmmmmmmmmlli WQ@").width;
    };
    const local = f => ["monospace", "serif"].some(g => wide(`"${f}", ${g}`) !== wide(g));
    const asks = new Map();
    const ask = (s, where, e) => {
      const f = fam(s);
      if (!f || SYS.test(f)) return;
      const a = asks.get(f.toLowerCase()) || { f, where: [], e: null };
      asks.set(f.toLowerCase(), a);
      if (!a.where.includes(where)) a.where.push(where);
      a.e = a.e || e;
    };
    const root = getComputedStyle(document.documentElement);
    for (const t of ["--font-display", "--font-text", "--font-mono"]) ask(root.getPropertyValue(t), t, null);
    for (const [q, where] of [
      ["h1", "the h1"],
      ["h2", "the h2s"],
      ["body, p", "the body text"],
    ])
      for (const e of [...document.querySelectorAll(q)].slice(0, 6)) ask(getComputedStyle(e).fontFamily, where, e);
    const out = [];
    for (const { f, where, e } of asks.values()) {
      const faces = [...document.fonts].filter(x => fam(x.family).toLowerCase() === f.toLowerCase());
      if (!faces.length && local(f)) continue;
      // a face no text on the page has used yet (the mono token's) is asked for once
      if (faces.length && !faces.some(x => x.status === "loaded"))
        await Promise.race([document.fonts.load(`16px "${f}"`).catch(() => {}), wait(3000)]);
      if (faces.some(x => x.status === "loaded")) continue;
      const r = e && e !== document.body ? e.getBoundingClientRect() : null;
      out.push({
        id: e ? idOf(e) : 0,
        sel: e ? sel(e) || "body" : ":root",
        family: f,
        where: where.join(", ").replace(/, ([^,]*)$/, " and $1"),
        why: faces.length ? "its font file did not load" : "no font link or @font-face loads it",
        doc: r && r.width >= 1 ? D(r) : null,
      });
    }
    return out;
  }

  // ------------------------------------------------ checks added in v4 (the readers' faults the
  // checker still missed on earlier test pages, and two of the house rules)
  // photo-print: a print (halftone, dither, engraving) drawn over a photograph. A photo object mounts its canvas on view
  // and removes it off screen, so every canvas the page adds is noted as it comes, with the photograph under it
  const prints = new Map(),
    printSeen = new WeakSet();
  function notePrints() {
    for (const cv of document.querySelectorAll("canvas")) {
      // (a print's canvas is aria-hidden: only a drawn mock around it counts as drawn)
      if (
        printSeen.has(cv)
        || (cv.parentElement && cv.parentElement.closest('[data-ui], .ui[class*=ui-], [role="img"]'))
        || inFixed(cv)
      )
        continue;
      const q = cv.getBoundingClientRect();
      if (q.width < 120 || q.height < 80) continue;
      const kit0 = /\bpk-canvas\b/.test(cv.className || "");
      // an effect ground, a scene or a printed object keeps its own still picture as its fallback: not a photograph
      if (
        !kit0
        && cv.closest(
          "[data-fx], [data-fx-mounted], [data-scene], [data-big-scene], [data-print], [data-product], [data-object], [data-moment][data-moment-mounted], [data-scroll-moment]",
        )
      )
        continue;
      const host = cv.closest(".frame, .panel, figure, [data-photo]") || cv.parentElement;
      if (!host) continue;
      let photo = null;
      for (const im of host.querySelectorAll("img")) {
        const s = im.currentSrc || im.getAttribute("src") || "";
        if (/\.svg(\?|#|$)|^data:|fallback|still/i.test(s)) continue;
        const r = im.getBoundingClientRect(),
          ix = Math.max(0, Math.min(r.right, q.right) - Math.max(r.left, q.left)),
          iy = Math.max(0, Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top));
        if ((im.naturalWidth >= 320 || r.width >= 200) && ix * iy >= 0.6 * q.width * q.height) {
          photo = im;
          break;
        }
      }
      const kit = /\bpk-canvas\b/.test(cv.className || "");
      if (!photo && !kit) continue;
      const S0 = sectionsList().filter(s => s.tagName !== "FOOTER")[0];
      printSeen.add(cv);
      if (prints.has(host)) continue;
      prints.set(host, {
        id: idOf(host),
        sel: sel(host),
        text:
          photo ?
            (photo.currentSrc || photo.getAttribute("src") || "").split("/").pop().slice(0, 60)
          : "a photo object",
        hero: !!(S0 && S0.contains(host)),
        w: Math.round(q.width),
        doc: D(q),
      });
    }
  }
  try {
    let t = 0;
    new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => {
        try {
          notePrints();
        } catch (e) {}
      }, 80);
    }).observe(document.body, { childList: true, subtree: true });
    notePrints();
  } catch (e) {}

  function moreChecks() {
    fresh();
    notePrints();
    const vw = vwNow(),
      vh = innerHeight,
      S = sectionsList();
    const visible = e => {
      const r = e.getBoundingClientRect();
      return r.width >= 1 && r.height >= 1 && shown(e, r);
    };
    const out = { prints: [...prints.values()], grounds: [], splits: [], hours: [], toggle: null, short: [] };
    // grounds: the flat grounds the page lays across its width (a section, a band, a footer); a picture, a gradient or an
    // effect is the lit ground of its visual, not one more ground
    {
      const seen = [];
      const add = (c, e, what) => {
        if (!c || c.a < 0.9) return;
        const g = seen.find(x => cdist(x.c, c) <= 8);
        if (g) {
          g.n++;
          return;
        }
        seen.push({
          c,
          hex: hex(c),
          n: 1,
          id: idOf(e),
          sel: sel(e),
          text: label(e).slice(0, 40),
          what,
          doc: D(e.getBoundingClientRect()),
        });
      };
      const own = e => {
        for (let a = e; a; a = a.parentElement) {
          const c = CS(a);
          if (
            c.backgroundImage
            && c.backgroundImage !== "none"
            && a !== document.body
            && a !== document.documentElement
          )
            return null;
          const b = rgba(c.backgroundColor);
          if (b.a >= 0.9) return b;
        }
        return { r: 255, g: 255, b: 255, a: 1 };
      };
      for (const s of S) {
        const r = s.getBoundingClientRect();
        if (r.height < 120 || r.width < vw * 0.85) continue;
        add(own(s), s, s.tagName === "FOOTER" ? "footer" : "section");
        for (const e of s.querySelectorAll("*")) {
          if (SKIP.has(e.tagName) || inDrawn(e) || inFixed(e)) continue;
          const q = e.getBoundingClientRect();
          if (q.width < vw * 0.85 || q.height < 160 || !shown(e, q)) continue;
          const c = CS(e);
          if (c.backgroundImage && c.backgroundImage !== "none") continue;
          // a band holds words (a picture's frame, a panel behind a mock, is that picture's ground)
          if (
            e.matches(".frame, .panel, figure, [data-fx], [data-fx-mounted], [data-ui], .ui[class*=ui-]")
            || !e.querySelector("h1, h2, h3, p, blockquote, ul, dl")
          )
            continue;
          if (
            [...e.querySelectorAll("img, video, canvas, picture, [data-ui], .ui[class*=ui-], .frame")].some(m => {
              const mq = m.getBoundingClientRect();
              return mq.width * mq.height >= 0.5 * q.width * q.height;
            })
          )
            continue;
          const b = rgba(c.backgroundColor);
          if (b.a >= 0.9) add(b, e, "band");
        }
      }
      out.grounds = seen;
    }
    // split-align: in each split (text beside its visual), where the shorter of the two sits against the taller one
    {
      const VISQ =
        'img, video, canvas, picture, [data-ui], .ui[class*=ui-], [data-fx], [data-fx-mounted], .frame, .panel, iframe, [role="img"]';
      const box = c => {
        let t = Infinity,
          b = -Infinity;
        for (const e of [c, ...c.querySelectorAll("*")]) {
          if (SKIP.has(e.tagName) || isSvgPart(e)) continue;
          const r = e.getBoundingClientRect();
          if (r.width < 2 || r.height < 2 || !shown(e, r)) continue;
          let q = null;
          if (MEDIA.has(e.tagName) || e.matches(VISQ) || (quickKind(e) && e !== c)) q = r;
          else if (ownText(e)) {
            const ls = lines(e);
            if (ls.length) q = { top: Math.min(...ls.map(l => l.top)), bottom: Math.max(...ls.map(l => l.bottom)) };
          }
          if (!q) continue;
          t = Math.min(t, q.top);
          b = Math.max(b, q.bottom);
        }
        return isFinite(t) ? { top: t, bottom: b } : null;
      };
      const done = new Set();
      for (const s of S) {
        if (s.tagName === "FOOTER") continue;
        for (const g of s.querySelectorAll("*")) {
          if (inDrawn(g) || inFixed(g) || g.closest('nav, header, dialog, [role="tablist"]')) continue;
          const kids = [...g.children].filter(k => visible(k) && !SKIP.has(k.tagName));
          if (kids.length !== 2) continue;
          const gr = g.getBoundingClientRect();
          if (gr.width < vw * 0.5) continue;
          kids.sort((p, q) => p.getBoundingClientRect().left - q.getBoundingClientRect().left); // a flipped split sits right to left
          const [a, b] = kids.map(k => k.getBoundingClientRect());
          if (a.width < gr.width * 0.25 || b.width < gr.width * 0.25 || b.left < a.right - 4) continue;
          if (Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) < 40) continue;
          // the share of a column a picture, a mock, an effect or a component ground (a map) covers
          const visShare = k => {
            const kq = k.getBoundingClientRect(),
              A = Math.max(1, kq.width * kq.height);
            let m = 0;
            for (const v of [k, ...k.querySelectorAll("*")]) {
              if (SKIP.has(v.tagName) || isSvgPart(v)) continue;
              const isV =
                v.matches(VISQ)
                || v.matches(".cx, [data-cx-effect], [data-scene], [data-print]")
                || v.tagName.toLowerCase() === "svg"
                || ["picture", "effect", "media"].includes(quickKind(v));
              if (!isV) continue;
              const q = v.getBoundingClientRect();
              if (q.width < 100 || q.height < 80) continue;
              m = Math.max(m, (q.width * q.height) / A);
            }
            return m;
          };
          const isVis = k => visShare(k) >= 0.5;
          const isText = k => !!k.querySelector("h2, h3, p, li") && visShare(k) < 0.3;
          const [k1, k2] = kids;
          const vk =
            isVis(k1) && isText(k2) ? k1
            : isVis(k2) && isText(k1) ? k2
            : null;
          if (!vk) continue;
          if ([...done].some(d => d.contains(g) || g.contains(d))) continue;
          done.add(g);
          // (a frame is measured by its own edge: a mock run out through it, cut by its overflow, is not its height)
          const tk = vk === k1 ? k2 : k1,
            T = box(tk),
            V = vk.matches(VISQ) ? vk.getBoundingClientRect() : box(vk);
          if (!T || !V) continue;
          const th = T.bottom - T.top,
            vh2 = V.bottom - V.top,
            [sh, lg] = th <= vh2 ? [T, V] : [V, T],
            shH = Math.min(th, vh2),
            lgH = Math.max(th, vh2);
          if (shH >= 0.9 * lgH || lgH - shH < 48) continue; // the two fill each other: no way to sit
          const gap = Math.round(lgH - shH);
          const d = (x, y) => Math.abs(x - y),
            tol = Math.max(12, 0.05 * lgH);
          const how =
            d(sh.top, lg.top) <= tol ? "top"
            : d((sh.top + sh.bottom) / 2, (lg.top + lg.bottom) / 2) <= tol ? "middle"
            : d(sh.bottom, lg.bottom) <= tol ? "bottom"
            : "loose";
          out.splits.push({
            id: idOf(g),
            sel: sel(g),
            text: label(tk.querySelector("h2, h3") || tk).slice(0, 40),
            sec: sel(s),
            how,
            short: th <= vh2 ? "text" : "visual",
            gap,
            doc: D(gr),
          });
        }
      }
    }
    // fact-agree: the opening hours said twice, differently ("8 to 19, Tuesday to Sunday" and "Saturday 9 to 19"); each
    // clause of a short box is read for its days and its time; a clause of days alone takes the nearest clause of a time
    // alone (a figure "8 to 19" over its label "Opening hours, Tuesday to Sunday")
    {
      const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const dayIx = w => {
        w = w.toLowerCase().replace(/\.$/, "").replace(/s$/, "");
        return DAYS.findIndex(d => d === w || (w.length >= 3 && d.startsWith(w)));
      };
      const DW =
        "(mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)s?\\.?";
      const T = "(\\d{1,2})(?:[:.](\\d{2}))?\\s*(am|pm|h)?";
      const reRange = new RegExp(`(?:^|[^\\d€$£.,:])${T}\\s*(?:to|until|till|–|—|-|bis)\\s*${T}(?![\\d%])`, "i");
      const reFrom = new RegExp(`\\b(?:from|opens? at)\\s+${T}(?![\\d%.,])`, "i");
      const reDays = new RegExp(`\\b${DW}(?:\\s*(?:to|–|—|-|through|until)\\s*${DW})?(?![a-z])`, "ig");
      const hr = (h, m, ap) => {
        let x = +h + (m ? +m / 60 : 0);
        if (/pm/i.test(ap || "") && x < 12) x += 12;
        return Math.round(x * 4) / 4;
      };
      const daysOf = t => {
        const set = new Set();
        reDays.lastIndex = 0;
        for (const m of t.matchAll(reDays)) {
          if (/^(sat|sun|mon|wed|fri|tue|thu)s?\.?$/i.test(m[0]) && !/^[A-Z]/.test(m[0])) continue;
          const a = dayIx(m[1]),
            b = m[2] ? dayIx(m[2]) : a;
          if (a < 0 || b < 0) continue;
          for (let i = a; ; i = (i + 1) % 7) {
            set.add(i);
            if (i === b) break;
          }
        }
        if (/\b(every ?day|daily|seven days a week|every (morning|evening|day of the week))\b/i.test(t))
          for (let i = 0; i < 7; i++) set.add(i);
        if (/\bweekends?\b/i.test(t)) {
          set.add(5);
          set.add(6);
        }
        if (/\bweekdays?\b/i.test(t)) for (let i = 0; i < 5; i++) set.add(i);
        return set;
      };
      const timeOf = t => {
        const rg = t.match(reRange);
        if (rg) {
          const open = hr(rg[1], rg[2], rg[3] || rg[6]),
            close = hr(rg[4], rg[5], rg[6]);
          return open <= 24 && close <= 24 && close > open ? { open, close } : null;
        }
        const fr = t.match(reFrom);
        if (fr) {
          const open = hr(fr[1], fr[2], fr[3]);
          return open <= 24 ? { open, close: null } : null;
        }
        return null;
      };
      const facts = [];
      const blocks = [...document.body.querySelectorAll("tr, li, dt, p, div, span, td, h3, h4")].filter(
        e => !inDrawn(e) && !inFixed(e) && !e.closest("nav, header, script, style, [hidden]") && visible(e),
      );
      for (const e of blocks) {
        let t = full(e);
        if (e.tagName === "DT" && e.nextElementSibling && e.nextElementSibling.tagName === "DD")
          t += " " + full(e.nextElementSibling);
        if (t.length > 170 || !/\d/.test(t)) continue;
        if (!daysOf(t).size) continue;
        // opening hours, not a meal, a check-in or an event: the box or a parent near it says open, hours or closed
        if (
          /\b(breakfast|lunch|dinner|brunch|check-?in|check-?out|tasting|cupping|class|tour|course|workshop|delivery|deliver)\b/i.test(
            t,
          )
        )
          continue;
        let ctx = false;
        for (let a = e, n = 0; a && n < 5 && !ctx; a = a.parentElement, n++)
          ctx =
            /hour|open|time/i.test(typeof a.className === "string" ? a.className : "")
            || (full(a).length <= 700 && /\b(open|opening|hours|closed|every morning|daily)\b/i.test(full(a)));
        if (!ctx) continue;
        // its clauses (a figure and its label are two: "8 to 18" "Monday to Friday, weekends from 9")
        const parts = [];
        for (const k of e.querySelectorAll("*")) if (ownText(k) && !k.querySelector("*")) parts.push(full(k));
        const text = parts.length >= 2 && parts.join(" ").length >= t.length - 4 ? parts.join(", ") : t;
        const cl = text
          .split(/[,;]|\.\s|\s(?:and|but|or)\s/i)
          .map(x => x.trim())
          .filter(Boolean)
          .map(x => ({ x, d: daysOf(x), tm: timeOf(x) }));
        const got = [];
        cl.forEach((c, i) => {
          if (c.d.size && c.tm) {
            got.push({ days: c.d, ...c.tm, x: c.x });
            return;
          }
          if (!c.d.size || c.tm || /\bclosed\b/i.test(c.x)) return;
          // days alone: the nearest clause of a time alone, the one before it first
          let best = null;
          for (const j of [i - 1, i + 1, i - 2, i + 2]) {
            const o = cl[j];
            if (o && o.tm && !o.d.size) {
              best = o;
              break;
            }
          }
          if (best) got.push({ days: c.d, ...best.tm, x: best.x + ", " + c.x });
        });
        for (const g of got) {
          if (g.close == null && !/\b(open|morning|serve|from|pour)\b/i.test(text)) continue;
          facts.push({
            el: e,
            days: [...g.days],
            open: g.open,
            close: g.close,
            text: g.x.slice(0, 70),
            id: idOf(e),
            sel: sel(e),
            doc: D(e.getBoundingClientRect()),
          });
        }
      }
      // the smallest box that says it (a section that holds the line is not one more fact)
      for (let i = facts.length - 1; i >= 0; i--)
        if (facts.some(g => g.el !== facts[i].el && facts[i].el.contains(g.el))) facts.splice(i, 1);
      const pairs = new Map();
      const fmt = h => `${Math.floor(h)}${h % 1 ? ":" + String(Math.round((h % 1) * 60)).padStart(2, "0") : ""}`;
      for (let d = 0; d < 7; d++) {
        const fs2 = facts.filter(f => f.days.includes(d));
        if (fs2.length < 2) continue;
        const ranges = fs2.filter(f => f.close != null),
          opens = new Set(fs2.map(f => f.open)),
          rset = new Set(ranges.map(f => f.open + "-" + f.close));
        if (rset.size >= 2 || opens.size >= 2) {
          const a = fs2.find(f => f.close != null) || fs2[0],
            b = fs2.find(f => f !== a && (f.open !== a.open || f.close !== a.close));
          if (!b) continue;
          const say = f =>
              `"${f.text.slice(0, 60)}" (${fmt(f.open)}${f.close != null ? " to " + fmt(f.close) : " on"})`,
            two = rset.size >= 2 && b.close != null && a.close != null;
          // one finding per statement that disagrees (the weekend rows against "from 8 every morning" are one)
          const had = pairs.get(a.id) || [...pairs.values()].find(p => p.ids.has(b.id) || p.ids.has(a.id));
          if (had) {
            if (!had.days.includes(DAYS[d])) had.days.push(DAYS[d]);
            for (const f of [a, b])
              if (!had.say.includes(say(f))) {
                had.say.push(say(f));
                had.more.push(f.doc);
                had.ids.add(f.id);
              }
            had.two = had.two || two;
            continue;
          }
          pairs.set(a.id, {
            id: a.id,
            sel: a.sel,
            text: a.text,
            days: [DAYS[d]],
            two,
            say: [say(a), say(b)],
            doc: a.doc,
            more: [b.doc],
            ids: new Set([a.id, b.id]),
          });
        }
      }
      out.hours = [...pairs.values()].map(({ ids, ...p }) => p);
    }
    // what the page's pictures say they show: alt texts, picture labels, the objects and prints it mounts
    out.picLabels = [];
    for (const e of document.querySelectorAll(
      'img[alt], [role="img"][aria-label], video[aria-label], video[title], [data-object], [data-print], [data-product] [aria-label], svg > title',
    )) {
      if (e.closest("nav, header, footer, [data-ui], .ui[class*=ui-]")) continue;
      const t = (
        e.getAttribute("alt")
        || e.getAttribute("aria-label")
        || e.getAttribute("title")
        || e.getAttribute("data-object")
        || e.getAttribute("data-print")
        || (e.tagName.toLowerCase() === "title" ? e.textContent : "")
        || ""
      ).trim();
      if (t && out.picLabels.length < 60) out.picLabels.push(t.slice(0, 160));
    }
    // what the hero shows (a physical product's page shows the product in its hero: a photograph, a video, or a render the page mounts:
    // an <img>, a <picture>, a <video>, a <canvas>, a [data-object] or [data-print], or a background picture of the hero; a UI fragment,
    // an icon and a drawn svg are not the product)
    {
      const hero = S[0];
      out.heroMedia = [];
      if (hero) {
        out.hero = {
          id: idOf(hero),
          sel: sel(hero),
          text: label(hero.querySelector("h1") || hero).slice(0, 40),
          doc: D(hero.getBoundingClientRect()),
        };
        for (const e of hero.querySelectorAll(
          "img, picture, video, canvas, [data-object], [data-print], [data-product]",
        )) {
          if (e.closest("nav, header.nav, [data-ui], .ui[class*=ui-]") || (e.tagName === "IMG" && e.closest("picture")))
            continue;
          const r = e.getBoundingClientRect();
          if (r.width < 120 || r.height < 90 || !shown(e, r)) continue;
          out.heroMedia.push({ tag: e.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height) });
        }
        if (!out.heroMedia.length)
          for (const e of [hero, ...hero.querySelectorAll("*")].slice(0, 400)) {
            const bi = CS(e).backgroundImage;
            if (!bi || !/url\(/.test(bi)) continue;
            const r = e.getBoundingClientRect();
            if (r.width < 200 || r.height < 150) continue;
            out.heroMedia.push({ tag: "background", w: Math.round(r.width), h: Math.round(r.height) });
            break;
          }
      }
    }
    // the hero product's DRAWN size (the judges' "product small and boxed"): of the hero's pictures (an <img>, a <video>, a
    // <canvas>, the still or canvas a [data-product] frame mounts) the one whose subject is widest, measured where its subject is
    // drawn (inkBounds: the picture's own ground left out, object-fit and padding applied), against the content width of the hero's
    // container. A canvas that reads back blank (a live WebGL turn) is the frame's box times the kit's fill (.86)
    out.heroProduct = null;
    {
      const hero = S[0];
      if (hero) {
        const pct = (v, room) =>
          /%$/.test(v) ? (parseFloat(v) / 100) * room
          : /^-?[\d.]+px$/.test(v) ? parseFloat(v)
          : v === "left" || v === "top" ? 0
          : v === "right" || v === "bottom" ? room
          : 0.5 * room;
        let best = null;
        for (const e of hero.querySelectorAll("img, video, canvas")) {
          if (e.closest("nav, header.nav, [data-ui], .ui[class*=ui-]")) continue;
          const r = e.getBoundingClientRect();
          if (r.width < 120 || r.height < 90 || !shown(e, r)) continue;
          const c = CS(e),
            n = p => parseFloat(c[p]) || 0;
          const pl = n("paddingLeft") + n("borderLeftWidth"),
            pr = n("paddingRight") + n("borderRightWidth"),
            pt = n("paddingTop") + n("borderTopWidth"),
            pb = n("paddingBottom") + n("borderBottomWidth");
          const bx = {
            l: r.left + pl,
            t: r.top + pt,
            w: Math.max(1, r.width - pl - pr),
            h: Math.max(1, r.height - pt - pb),
          };
          let ink = inkBounds(e),
            how = ink ? "pixels" : "box";
          if (!ink && e.tagName === "CANVAS" && e.closest("[data-product]")) {
            ink = { x0: 0.07, x1: 0.93, y0: 0.07, y1: 0.93 };
            how = "estimate";
          }
          if (!ink) ink = { x0: 0, x1: 1, y0: 0, y1: 1 };
          // the picture's own rectangle inside the box (object-fit, object-position)
          const nw = e.naturalWidth || e.videoWidth || e.width || bx.w,
            nh = e.naturalHeight || e.videoHeight || e.height || bx.h,
            fit = e.tagName === "CANVAS" ? "fill" : c.objectFit || "fill";
          let dw = bx.w,
            dh = bx.h,
            ox = 0,
            oy = 0;
          if (fit !== "fill") {
            const sx = bx.w / nw,
              sy = bx.h / nh,
              s =
                fit === "cover" ? Math.max(sx, sy)
                : fit === "none" ? 1
                : fit === "scale-down" ? Math.min(1, sx, sy)
                : Math.min(sx, sy);
            dw = nw * s;
            dh = nh * s;
            const pos = String(c.objectPosition || "50% 50%").split(/\s+/);
            ox = pct(pos[0] || "50%", bx.w - dw);
            oy = pct(pos[1] || "50%", bx.h - dh);
          }
          const L = Math.max(bx.l, bx.l + ox + ink.x0 * dw, 0),
            R = Math.min(bx.l + bx.w, bx.l + ox + ink.x1 * dw, vw),
            T = Math.max(bx.t, bx.t + oy + ink.y0 * dh),
            B = Math.min(bx.t + bx.h, bx.t + oy + ink.y1 * dh);
          if (R - L < 1 || B - T < 1) continue;
          const m = { el: e, how, w: R - L, h: B - T, left: L, top: T, boxW: r.width };
          if (!best || m.w > best.w) best = m;
        }
        if (best) {
          // the content width of the hero's container (a .wrap, a .container: its width less its padding); else 88% of the screen
          let content = 0;
          for (const e of hero.querySelectorAll('.wrap, .container, [class*="wrap"], [class*="container"]')) {
            const c = CS(e),
              w = e.clientWidth - (parseFloat(c.paddingLeft) || 0) - (parseFloat(c.paddingRight) || 0);
            if (w >= vw * 0.5 && w <= vw + 1 && w > content) content = w;
          }
          if (!content) content = Math.round(vw * 0.88);
          const bb = best.el.getBoundingClientRect();
          out.heroProduct = {
            tag: best.el.tagName.toLowerCase(),
            how: best.how,
            w: Math.round(best.w),
            h: Math.round(best.h),
            content: Math.round(content),
            frac: best.w / content,
            boxW: Math.round(best.boxW),
            id: idOf(best.el),
            sel: sel(best.el),
            text: label(best.el).slice(0, 40),
            doc: D({ left: best.left, top: best.top, width: best.w, height: best.h }),
            more: [D(bb)],
          };
        }
      }
    }
    // words a screen (a tech page is read in a glance: the words outside the UI mocks, per section, over the screens it takes)
    {
      out.words = [];
      for (const sc of S) {
        if (sc.tagName === "FOOTER") continue;
        const r = sc.getBoundingClientRect();
        if (r.height < 60) continue;
        let n = 0;
        const walk = document.createTreeWalker(sc, NodeFilter.SHOW_TEXT);
        for (let t = walk.nextNode(); t; t = walk.nextNode()) {
          const p = t.parentElement;
          if (!p || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|SVG|TEXTAREA)$/i.test(p.tagName)) continue;
          if (
            p.closest(
              '[data-ui], .ui[class*=ui-], [data-diagram], [role="img"], [data-fx], [data-fx-mounted], [aria-hidden="true"], svg, canvas, template, nav, [hidden], .panel__screen',
            )
            || p.getClientRects().length === 0
          )
            continue;
          n += (t.textContent.match(/[\p{L}\p{N}][\p{L}\p{N}'.,%:-]*/gu) || []).length;
        }
        out.words.push({
          id: idOf(sc),
          sel: sel(sc),
          text: label(sc.querySelector("h1, h2, h3") || sc).slice(0, 40),
          words: n,
          screens: Math.max(1, Math.round((r.height / vh) * 10) / 10),
          doc: D(r),
        });
      }
    }
    // every action's label, counted over the page's links and buttons (a submit inside a lit frame counts too)
    out.labels = {};
    for (const e of document.querySelectorAll('a[href], button, input[type="submit"]')) {
      if (
        e.closest('[data-ui], .ui[class*=ui-], [role="img"], dialog, .nav__menu, [hidden], [role="tablist"]')
        || !visible(e)
      )
        continue;
      const k = String(e.value && e.tagName === "INPUT" ? e.value : full(e))
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
      if (!k || k.length > 40) continue;
      out.labels[k] = (out.labels[k] || 0) + 1;
    }
    // links that promise their own card's thing ("Book this room") but all go to one place that cannot know which
    {
      const by = new Map();
      for (const a of document.querySelectorAll("a[href]")) {
        if (inDrawn(a) || inFixed(a) || !visible(a)) continue;
        const t = full(a);
        if (!/\b(this|these)\b/i.test(t) || t.length > 40) continue;
        const card = a.closest('article, li, .card, [class*="card"], .tile, [class*="room"], [class*="plan"]');
        if (!card) continue;
        const k = t.toLowerCase() + "|" + a.getAttribute("href");
        if (!by.has(k)) by.set(k, []);
        by.get(k).push({ a, card });
      }
      out.thisLinks = [];
      for (const [k, l] of by) {
        if (l.length < 2 || new Set(l.map(x => x.card)).size < 2) continue;
        const a = l[0].a;
        out.thisLinks.push({
          id: idOf(a),
          sel: sel(a),
          text: full(a).slice(0, 40),
          n: l.length,
          href: a.getAttribute("href"),
          doc: D(a.getBoundingClientRect()),
          more: l.slice(1, 5).map(x => D(x.a.getBoundingClientRect())),
        });
      }
    }
    // the menu button's fill (a grey disc no button of the page uses)
    {
      const head = [...document.querySelectorAll('header, [role="banner"], body > nav, [data-nav]')].find(h => {
        const r = h.getBoundingClientRect();
        return r.top < 120 && r.width >= vw * 0.5 && r.height > 0 && r.height < 200;
      });
      const tg =
        head
        && [...head.querySelectorAll(INTER)].find(
          e =>
            visible(e)
            && (e.matches("[aria-expanded], [aria-controls]")
              || /menu|burger|toggle/i.test(
                (typeof e.className === "string" ? e.className : "") + " " + (e.getAttribute("aria-label") || ""),
              ))
            && e.getBoundingClientRect().width <= 64,
        );
      if (tg) {
        const b = rgba(CS(tg).backgroundColor),
          bd = backdrop(tg);
        if (b.a >= 0.3 && !(bd && cdist(b, bd) < 10))
          out.toggle = { id: idOf(tg), sel: sel(tg), text: "", fill: hex(b), doc: D(tg.getBoundingClientRect()) };
      }
    }
    // one-screen (house rule: "you only see one section at a time"): a section shorter than the screen shows its
    // neighbour's heading or picture with it
    {
      const navH = (() => {
        const h = [...document.querySelectorAll('header, [role="banner"], body > nav')].find(x =>
          /fixed|sticky/.test(CS(x).position),
        );
        return h ? Math.min(140, h.getBoundingClientRect().height) : 0;
      })();
      const main = S.filter(s => s.tagName !== "FOOTER");
      for (let i = 1; i < main.length; i++) {
        const s = main[i],
          r = s.getBoundingClientRect(),
          room = vh - navH;
        if (r.height >= room - 24 || r.height < vh * 0.45) continue; // a screen or more, or a strip (logos, figures)
        const nx = S[i + 1];
        if (!nx) continue;
        const h = nx.querySelector("h1, h2, h3, img, canvas, [data-ui], .frame");
        if (!h) continue;
        const nh = h.getBoundingClientRect(),
          shows = nh.top - r.top < room - 8;
        if (shows)
          out.short.push({
            id: idOf(s),
            sel: sel(s),
            text: label(s.querySelector("h1, h2, h3") || s).slice(0, 40),
            h: Math.round(r.height),
            room: Math.round(room),
            next: label(nx.querySelector("h1, h2, h3") || nx).slice(0, 30),
            doc: D(r),
          });
      }
    }
    return out;
  }
  // hover: what a button or a link does under the pointer (house rule: micro-animations, button hovers); its look
  // is read at rest and 350 ms into a hover
  function hoverKinds() {
    fresh();
    const out = [],
      have = new Set();
    for (const e of document.querySelectorAll(INTER)) {
      if (
        inDrawn(e)
        || e.closest('dialog, [role="tablist"], .nav__menu, footer')
        || !shown(e, e.getBoundingClientRect())
      )
        continue;
      const r = e.getBoundingClientRect();
      if (r.width < 24 || r.height < 14) continue;
      const L = buttonLook(e, true);
      const home =
        (e.hasAttribute("href") && /^(#|#top|\/|\.\/|index\.html)?$/.test(e.getAttribute("href").trim()))
        || /logo|brand|wordmark/i.test(typeof e.className === "string" ? e.className : "");
      if (home && e.closest('header, nav, [role="banner"]')) continue;
      const kind =
        L ?
          L.fill ?
            "filled button"
          : "outlined button"
        : e.closest('header, nav, [role="banner"]') ? "nav link"
        : e.tagName === "A" && full(e).length >= 3 && full(e).length <= 60 ? "text link"
        : null;
      if (!kind || have.has(kind)) continue;
      have.add(kind);
      out.push({ id: idOf(e), sel: sel(e), text: full(e).slice(0, 40), kind, doc: D(r) });
      if (out.length >= 4) break;
    }
    return out;
  }
  function lookSig(id) {
    const e = els.get(id);
    if (!e) return null;
    const keys = [
      "backgroundColor",
      "color",
      "borderTopColor",
      "boxShadow",
      "transform",
      "textDecorationLine",
      "textDecorationColor",
      "backgroundSize",
      "backgroundPosition",
      "backgroundImage",
      "opacity",
      "outlineStyle",
      "letterSpacing",
      "translate",
      "scale",
      "filter",
    ];
    const sig = (x, ps) => {
      const c = getComputedStyle(x, ps);
      return keys.map(k => c[k]).join("|") + (ps ? "|" + c.content + "|" + c.width : "");
    };
    const parts = [sig(e), sig(e, "::before"), sig(e, "::after")];
    for (const k of [...e.querySelectorAll("*")].slice(0, 6)) parts.push(sig(k));
    const r = e.getBoundingClientRect();
    return { sig: parts.join("#"), r: R(r) };
  }

  window.__cc = {
    measure,
    phoneLook,
    arrive,
    probe,
    findHeld,
    holdPass,
    revealList,
    scrollTimelines,
    noVisual,
    seam,
    stmtSecs,
    insideMoving,
    insideScene,
    momentOf,
    placeOf,
    rectOf,
    scrollTo: scrollToY,
    prescroll,
    hideText,
    navCollapse,
    closedAnchors,
    fontLoad,
    pageInfo,
    hiddenCands,
    isShownNow,
    hoverCands,
    hoverBox,
    hoverSig,
    hoverXf,
    loopCands,
    pauseFor,
    viewRect,
    formsList,
    trySubmit,
    audit,
    ioReveals,
    moreChecks,
    hoverKinds,
    lookSig,
    picsReady,
    heroFill,
    seams,
    extras,
    glInfo,
    glHosts,
    hideVis,
    stripHost,
    canvasArea,
    ghostPics,
    moverAt,
    motionNow,
    imgDone: list =>
      list.map(id => {
        const e = els.get(id);
        return !!(e && e.complete && e.naturalWidth);
      }),
  };
  return true;
}

// ---------------------------------------------------------------- the helper tab reads pixels and cuts the crops
export function helperLib() {
  const imgs = new Map();
  const lin = v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  window.__h = {
    async use(key, b64) {
      const img = new Image();
      img.src = "data:image/jpeg;base64," + b64;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const x = c.getContext("2d", { willReadFrequently: true });
      x.drawImage(img, 0, 0);
      imgs.clear();
      imgs.set(key, { c, x });
      return true;
    },
    stats(key, items) {
      const { c, x } = imgs.get(key);
      return items.map(({ rect, color }) => {
        const x0 = Math.max(0, Math.floor(rect.left)),
          y0 = Math.max(0, Math.floor(rect.top));
        const w = Math.min(c.width - x0, Math.ceil(rect.width)),
          h = Math.min(c.height - y0, Math.ceil(rect.height));
        if (w < 2 || h < 2) return null;
        const d = x.getImageData(x0, y0, w, h).data;
        const a = color.a ?? 1;
        const rs = [],
          ls = [];
        const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 3000)));
        for (let j = 0; j < h; j += step)
          for (let i = 0; i < w; i += step) {
            const k = (j * w + i) * 4;
            const r = d[k],
              g = d[k + 1],
              b = d[k + 2];
            const bl = L(r, g, b),
              tl = L(a * color.r + (1 - a) * r, a * color.g + (1 - a) * g, a * color.b + (1 - a) * b);
            ls.push(bl);
            rs.push((Math.max(bl, tl) + 0.05) / (Math.min(bl, tl) + 0.05));
          }
        rs.sort((p, q) => p - q);
        const mean = ls.reduce((s, v) => s + v, 0) / ls.length;
        // edge: how much the ground changes from one pixel to the next under the words (mean |dL*| of neighbours, L* 0-100):
        // a scrim over foliage keeps the spread low but the detail stays
        const Ls = y => (y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y);
        let es = 0,
          en = 0;
        const ey = Math.max(1, Math.floor(h / 12));
        for (let j = 0; j < h; j += ey) {
          let prev = null;
          for (let i = 0; i < w; i++) {
            const k = (j * w + i) * 4,
              v = Ls(L(d[k], d[k + 1], d[k + 2]));
            if (prev != null) {
              es += Math.abs(v - prev);
              en++;
            }
            prev = v;
          }
        }
        const lq = [...ls].sort((p, q) => p - q);
        return {
          p10: rs[Math.floor(rs.length * 0.1)],
          med: rs[Math.floor(rs.length / 2)],
          sd: Math.sqrt(ls.reduce((s, v) => s + (v - mean) ** 2, 0) / ls.length),
          edge: en ? es / en : 0,
          rng: lq[Math.floor(lq.length * 0.95)] - lq[Math.floor(lq.length * 0.05)],
        };
      });
    },
    // a second picture beside the first (for diff)
    async keep(key, b64) {
      const img = new Image();
      img.src = "data:image/jpeg;base64," + b64;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const x = c.getContext("2d", { willReadFrequently: true });
      x.drawImage(img, 0, 0);
      imgs.set(key, { c, x });
      return true;
    },
    // the share of pixels in each box that changed by more than 16 in a channel between two pictures
    diff(a, b, rects) {
      const A = imgs.get(a),
        B = imgs.get(b);
      return rects.map(rect => {
        const x0 = Math.max(0, Math.floor(rect.left)),
          y0 = Math.max(0, Math.floor(rect.top));
        const w = Math.min(A.c.width - x0, Math.ceil(rect.width)),
          h = Math.min(A.c.height - y0, Math.ceil(rect.height));
        if (w < 4 || h < 4) return 0;
        const p = A.x.getImageData(x0, y0, w, h).data,
          q = B.x.getImageData(x0, y0, w, h).data;
        let n = 0,
          m = 0;
        const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 40000)));
        for (let j = 0; j < h; j += step)
          for (let i = 0; i < w; i += step) {
            const k = (j * w + i) * 4;
            m++;
            if (Math.max(Math.abs(p[k] - q[k]), Math.abs(p[k + 1] - q[k + 1]), Math.abs(p[k + 2] - q[k + 2])) > 16) n++;
          }
        return m ? n / m : 0;
      });
    },
    // empty-visual and gl-fallback: the share of each box (its holes left out) that differs by more than t in a channel
    // between two pictures of one screen
    diffH(a, b, items, t = 8) {
      const A = imgs.get(a),
        B = imgs.get(b);
      return items.map(({ rect, holes }) => {
        const x0 = Math.max(0, Math.floor(rect.left)),
          y0 = Math.max(0, Math.floor(rect.top));
        const w = Math.min(A.c.width - x0, Math.ceil(rect.width)),
          h = Math.min(A.c.height - y0, Math.ceil(rect.height));
        if (w < 8 || h < 8) return null;
        const p = A.x.getImageData(x0, y0, w, h).data,
          q = B.x.getImageData(x0, y0, w, h).data;
        let n = 0,
          m = 0;
        const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 20000))),
          hs = holes || [];
        for (let j = 2; j < h - 2; j += step)
          for (let i = 2; i < w - 2; i += step) {
            const X = x0 + i,
              Y = y0 + j;
            if (
              hs.some(o => X >= o.left - 3 && X <= o.left + o.width + 3 && Y >= o.top - 3 && Y <= o.top + o.height + 3)
            )
              continue;
            const k = (j * w + i) * 4;
            m++;
            if (Math.max(Math.abs(p[k] - q[k]), Math.abs(p[k + 1] - q[k + 1]), Math.abs(p[k + 2] - q[k + 2])) > t) n++;
          }
        return { n: m, share: m ? n / m : 0 };
      });
    },
    // loop-pause by pixels: the boxes of the screen that changed between two pictures (32px tiles, 3% of a tile's
    // pixels by more than 16), joined where they touch; boxes under 40x30 (a caret) are left out. both: a tile counts only
    // when it changed from the first picture to the second and again from the second to the third, 1.5% of it each time
    // (still moving, not a part that arrived once, as an effect mounting late)
    moving(a, b, c, vw, vh, both) {
      const A = imgs.get(a),
        B = imgs.get(b),
        C = c ? imgs.get(c) : null,
        T = 32;
      const W = Math.min(vw, A.c.width),
        H = Math.min(vh, A.c.height);
      const p = A.x.getImageData(0, 0, W, H).data,
        q = B.x.getImageData(0, 0, W, H).data,
        s = C ? C.x.getImageData(0, 0, W, H).data : null;
      const cols = Math.ceil(W / T),
        rows = Math.ceil(H / T),
        on = new Uint8Array(cols * rows);
      const dd = (u, v, k) =>
        Math.max(Math.abs(u[k] - v[k]), Math.abs(u[k + 1] - v[k + 1]), Math.abs(u[k + 2] - v[k + 2]));
      for (let ty = 0; ty < rows; ty++)
        for (let tx = 0; tx < cols; tx++) {
          let n = 0,
            n1 = 0,
            n2 = 0,
            m = 0;
          for (let y = ty * T; y < Math.min(H, ty * T + T); y += 2)
            for (let x = tx * T; x < Math.min(W, tx * T + T); x += 2) {
              const k = (y * W + x) * 4;
              m++;
              const ab = dd(p, q, k) > 16,
                ac = s ? dd(p, s, k) > 16 : false,
                bc = s ? dd(q, s, k) > 16 : false;
              if (ab || ac) n++;
              if (ab) n1++;
              if (bc) n2++;
            }
          if (m && (both ? s && n1 / m >= 0.015 && n2 / m >= 0.015 : n / m >= 0.03)) on[ty * cols + tx] = 1;
        }
      const seen = new Uint8Array(cols * rows),
        boxes = [];
      for (let i = 0; i < on.length; i++) {
        if (!on[i] || seen[i]) continue;
        let x0 = 1e9,
          y0 = 1e9,
          x1 = -1,
          y1 = -1,
          cnt = 0;
        const st = [i];
        seen[i] = 1;
        while (st.length) {
          const j = st.pop(),
            tx = j % cols,
            ty = (j - tx) / cols;
          cnt++;
          x0 = Math.min(x0, tx);
          x1 = Math.max(x1, tx);
          y0 = Math.min(y0, ty);
          y1 = Math.max(y1, ty);
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            const nx = tx + dx,
              ny = ty + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
            const k = ny * cols + nx;
            if (on[k] && !seen[k]) {
              seen[k] = 1;
              st.push(k);
            }
          }
        }
        const box = {
          left: x0 * T,
          top: y0 * T,
          width: Math.min(W, (x1 + 1) * T) - x0 * T,
          height: Math.min(H, (y1 + 1) * T) - y0 * T,
          tiles: cnt,
        };
        if (box.width >= 40 && box.height >= 30) boxes.push(box);
      }
      return boxes.sort((u, v) => v.tiles - u.tiles).slice(0, 12);
    },
    // photo-set: mean lightness and saturation (HSL) and warmth (b* of Lab) of each box
    grade(key, rects) {
      const { c, x } = imgs.get(key);
      const lab = (r, g, b) => {
        const X = 0.4124 * lin(r) + 0.3576 * lin(g) + 0.1805 * lin(b),
          Y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b),
          Z = 0.0193 * lin(r) + 0.1192 * lin(g) + 0.9505 * lin(b);
        const f = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
        return 200 * (f(Y) - f(Z / 1.089));
      };
      return rects.map(rect => {
        const x0 = Math.max(0, Math.floor(rect.left)),
          y0 = Math.max(0, Math.floor(rect.top));
        const w = Math.min(c.width - x0, Math.ceil(rect.width)),
          h = Math.min(c.height - y0, Math.ceil(rect.height));
        if (w < 8 || h < 8) return null;
        const d = x.getImageData(x0, y0, w, h).data;
        let L = 0,
          S = 0,
          B = 0,
          n = 0;
        const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 4000)));
        for (let j = 0; j < h; j += step)
          for (let i = 0; i < w; i += step) {
            const k = (j * w + i) * 4,
              r = d[k] / 255,
              g = d[k + 1] / 255,
              b = d[k + 2] / 255,
              mx = Math.max(r, g, b),
              mn = Math.min(r, g, b),
              l = (mx + mn) / 2;
            L += l;
            S += mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
            B += lab(d[k], d[k + 1], d[k + 2]);
            n++;
          }
        return { l: L / n, s: S / n, b: B / n };
      });
    },
    // dark-ground: mean relative luminance of a box with the fragments on it left out
    ground(key, items) {
      const { c, x } = imgs.get(key);
      return items.map(({ rect, holes }) => {
        const x0 = Math.max(0, Math.floor(rect.left)),
          y0 = Math.max(0, Math.floor(rect.top));
        const w = Math.min(c.width - x0, Math.ceil(rect.width)),
          h = Math.min(c.height - y0, Math.ceil(rect.height));
        if (w < 8 || h < 8) return null;
        const d = x.getImageData(x0, y0, w, h).data;
        let s = 0,
          n = 0;
        const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 6000)));
        for (let j = 0; j < h; j += step)
          for (let i = 0; i < w; i += step) {
            const px = x0 + i,
              py = y0 + j;
            if (
              holes.some(
                o => px >= o.left - 4 && px <= o.left + o.width + 4 && py >= o.top - 4 && py <= o.top + o.height + 4,
              )
            )
              continue;
            const k = (j * w + i) * 4;
            s += L(d[k], d[k + 1], d[k + 2]);
            n++;
          }
        return n >= 20 ? s / n : null;
      });
    },
    // empty-visual: the share of a box (its holes left out) within 6 levels of its most common colour, and that colour
    flat(key, items) {
      const { c, x } = imgs.get(key);
      return items.map(({ rect, holes }) => {
        const x0 = Math.max(0, Math.floor(rect.left)),
          y0 = Math.max(0, Math.floor(rect.top));
        const w = Math.min(c.width - x0, Math.ceil(rect.width)),
          h = Math.min(c.height - y0, Math.ceil(rect.height));
        if (w < 8 || h < 8) return null;
        const d = x.getImageData(x0, y0, w, h).data,
          step = Math.max(1, Math.floor(Math.sqrt((w * h) / 9000)));
        const px = [],
          hist = new Map();
        for (let j = 1; j < h - 1; j += step)
          for (let i = 1; i < w - 1; i += step) {
            const X = x0 + i,
              Y = y0 + j;
            if (
              holes.some(
                o => X >= o.left - 3 && X <= o.left + o.width + 3 && Y >= o.top - 3 && Y <= o.top + o.height + 3,
              )
            )
              continue;
            const k = (j * w + i) * 4,
              r = d[k],
              g = d[k + 1],
              b = d[k + 2];
            px.push(r, g, b);
            const q = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
            hist.set(q, (hist.get(q) || 0) + 1);
          }
        const n = px.length / 3;
        if (n < 150) return { n, share: 0 };
        let best = 0,
          bq = 0;
        for (const [q, v] of hist)
          if (v > best) {
            best = v;
            bq = q;
          }
        let mr = 0,
          mg = 0,
          mb = 0,
          mn = 0;
        for (let i = 0; i < px.length; i += 3) {
          const q = ((px[i] >> 3) << 10) | ((px[i + 1] >> 3) << 5) | (px[i + 2] >> 3);
          if (q === bq) {
            mr += px[i];
            mg += px[i + 1];
            mb += px[i + 2];
            mn++;
          }
        }
        mr /= mn;
        mg /= mn;
        mb /= mn;
        let near = 0;
        for (let i = 0; i < px.length; i += 3)
          if (Math.max(Math.abs(px[i] - mr), Math.abs(px[i + 1] - mg), Math.abs(px[i + 2] - mb)) <= 6) near++;
        const hx = "#" + [mr, mg, mb].map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
        return { n, share: near / n, mode: hx };
      });
    },
    // fade-cut: the spread of luminance in each line's box (its darkest against its lightest pixels, the 3rd and 97th
    // percentiles): a line drawn in full shows its ink against its ground, a faded one hardly any
    inkRange(key, rects) {
      const { c, x } = imgs.get(key);
      return rects.map(rect => {
        const x0 = Math.max(0, Math.floor(rect.left + 1)),
          y0 = Math.max(0, Math.floor(rect.top + 1));
        const w = Math.min(c.width - x0, Math.floor(rect.width - 2)),
          h = Math.min(c.height - y0, Math.floor(rect.height - 2));
        if (w < 6 || h < 4) return null;
        const d = x.getImageData(x0, y0, w, h).data,
          v = [];
        for (let k = 0; k < d.length; k += 4) v.push(L(d[k], d[k + 1], d[k + 2]));
        v.sort((p, q) => p - q);
        return v[Math.floor(v.length * 0.97)] - v[Math.floor(v.length * 0.03)];
      });
    },
    crop(key, reg, rects) {
      const { c } = imgs.get(key);
      const scale = Math.min(1, 1100 / reg.width, 900 / reg.height);
      const o = document.createElement("canvas");
      o.width = Math.max(1, Math.round(reg.width * scale));
      o.height = Math.max(1, Math.round(reg.height * scale));
      const x = o.getContext("2d");
      x.drawImage(c, reg.left, reg.top, reg.width, reg.height, 0, 0, o.width, o.height);
      for (const r of [...rects].sort((p, q) => (q.ref ? 1 : 0) - (p.ref ? 1 : 0))) {
        x.lineWidth = 2;
        x.setLineDash(r.ref ? [6, 4] : []);
        x.strokeStyle = r.ref ? "#0091ff" : "#ff1744";
        x.strokeRect(
          (r.left - reg.left) * scale - 1.5,
          (r.top - reg.top) * scale - 1.5,
          r.width * scale + 3,
          r.height * scale + 3,
        );
      }
      return o.toDataURL("image/jpeg", 0.86).split(",")[1];
    },
  };
  return true;
}
