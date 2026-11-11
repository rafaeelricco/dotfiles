// consistency/modules/visuals.mjs — the visuals check module (moved from consistency.mjs)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { readCatalogue } from "../../moments.mjs";
import { itemDir } from "../../roots.mjs";
import { sleep, TASTE } from "../cli.mjs";
import { isTreatment, sceneFitsKind } from "../fit.mjs";

// ---------------------------------------------------------------- visual: kept as one block
export const visualMod = (() => {
  // visual.mjs: captions under visuals, visuals that show nothing, and effects that do not fit the kind of page. Its rules:
  // a shader string needs a real GLSL sign before it counts as shader code, a data: texture or
  // a #filter reference inside a background is no picture to load, a product's own object render is its picture, a data-fx
  // ground is no scene, a diagram mount that never drew is empty, and a smooth gradient with nothing on it is nearly empty.
  // Its shader lint is left to shader-lint, which reads the same files and every compiled shader. The page is the one
  // consistency.mjs has loaded and walked: no Chrome of its own.
  //
  // Usage:
  //   checker    node run.mjs visual.mjs <url or file> [--widths 1440,1024,768x1024,390] [--type place] [--tech-subject]
  //              [--no-visuals]
  //
  //   visuals    visual-caption (a caption, description or caption-like line under, over or on an image, render or visual
  //              of 120x80px or more, house rule: a figcaption, a caption class or a caption phrase FAIL, a muted line of
  //              2 rows or less and 15px or less 32px under it, or one laid over its lower half, WARN)
  //   render     visual-empty (a canvas, effect or diagram mount, svg, picture or background frame of 120x80px or more
  //              showing under 6 colours at this width: blank (99.8% one colour, a canvas or mount 98%) FAIL, else WARN;
  //              6 colours or more with no detail, a smooth gradient only, WARN; a broken picture or background, or a
  //              diagram mount that never drew, FAIL)
  //   effects    effect-kind (by the page's kind: --type, data-type, page-type, page-kind=place, site-kind, taste-kind
  //              (alias), title; any effect on a place, a service or a product without a technical subject FAILs; tech,
  //              gaming and software: a second big scene or a data-fx ground beside it FAILs (MO-16, MO-23); WARN above
  //              4 live WebGL contexts, 8 created, one big scene, two scroll moments, or no reduced-motion or phone branch)
  // Captions: a figcaption in a figure that holds a visual (told once, at the first width); under a visual (top within 32px
  // of its bottom, overlapping 40% of the narrower width): a line whose class names it a caption, a line of 2 rows and 180
  // characters or less with a caption phrase ("made in code", "photo of", "fig. 2", "(sample)"), or a muted line of 15px
  // or less with no heading 40px under it; over a visual: a caption-like line (FAIL at 15px or less, else WARN); on a
  // visual: a small absolute line of 3 words or more in its lower half, unless it sits on a card of its own (a map's
  // address card). Headings, links, buttons, nav, header, footer, quotes, prices and licence credits are exempt (caption
  // and credit-wall tell credits). Eight findings a width at most, FAILs first, the rest named in the eighth.
  // Empty: every visual of 120x80px or more (the outermost of nested ones, the first 40; those past 40 are named in a probe
  // note) is brought on screen, the fixed and sticky bars that are not part of it hidden, and its own pixels shot as PNG at
  // half scale: each channel cut to 5 bits, a colour counts when it holds 0.1% of the pixels, and its detail is the share of
  // pixels whose right or lower neighbour differs by 10 or more in a channel (under 0.2% with 6 colours or more is a smooth
  // gradient). A flagged visual is looked at again 1.3 s later. A visual in a scroll scene or a held sticky stage, one
  // mid-animation, or one whose WebGL context the checker refused (past its cap of 4) is a WARN, not a FAIL. A picture,
  // drawing or background that showed 12 colours or more with detail at the first width is not shot again at later widths.
  // Eight findings a width at most, FAILs first.
  // Effects: the kind is --type, else the page's own marks (pages declare site-kind and page-type):
  // <meta name="page-type">, <html data-type> or <meta name="page-kind" content="place"> naming place, product or service,
  // each read on its own; else <meta name="site-kind"> naming tech, software or gaming; else a page type naming one of
  // those; else <meta name="taste-kind"> (an alias); else the type read from the title. A product is technical with
  // --tech-subject or a site-kind of tech, software or gaming (ST-61, MO-02: hardware is page-type product, site-kind
  // tech). No-effect kinds FAIL: WebGL asked for (outside a product's own render: a [data-product] frame's contexts, even when its canvas is gone after a still, are never counted), data-fx, data-scene or data-print
  // mounts and photo print objects, data-moment, particle code or 300+ canvas 2D shapes a second, scroll libraries and
  // timelines, or a section, card or frame that drifts more than 4px off the scroll (parallax); an effect library WARNs.
  // Effect kinds (house rule: one big scene and one or two scroll moments are fine) WARN past 4 live contexts, 8 created
  // (a refused ask is no context), one big scene (a data-scene or data-print mount, or a large WebGL canvas that is no
  // data-fx ground), two scroll moments, effects with no reduced-motion or phone branch, particle code. The files, the
  // particle rate and the drift walk are read at the first width; the WebGL and mount counts at every width, the largest
  // kept, so a fault that only comes at a later width is told there.
  // Big scenes are [data-big-scene] ([data-scene] is the objects kit's photo scene); a scroll moment is [data-scroll-moment] or
  // [data-moment]. MO-16 and MO-23: a second [data-big-scene] FAILs, and so does a data-fx ground beside the big scene
  // (outside the scroll moments); more big scenes or large WebGL canvases without those marks stay a WARN.
  // Not ported (consistency.mjs has them): the shader lint (shader-lint), webgl-fallback (its gl-fallback pass), and the
  // cards and sections that animate in on scroll (its scroll-reveal: on the walked tab they have already been revealed).

  const id = "visuals";
  const phase = "width";
  const checks = [
    {
      id: "visual-caption",
      sev: "FAIL",
      what: "a caption, description or caption-like line under, over or on an image, render or visual of 120x80px or more",
    },
    {
      id: "visual-empty",
      sev: "FAIL",
      what: "a visual of 120x80px or more showing under 6 colours or only a smooth gradient at this width (blank FAILs), or a broken picture",
    },
    {
      id: "effect-kind",
      sev: "FAIL",
      what: "an effect on a place, service or plain product page beyond one quiet treatment, or a scene that does not fit its kind; past 4 live WebGL contexts, one scene or three scroll moments on a tech page",
    },
    {
      id: "hero-enter",
      sev: "WARN",
      what: 'a hero that does not enter on load: no data-enter on it, or no head line setting html.m-enter (data-enter="off" on a hero holding a big scene is its entrance)',
    },
    {
      id: "moment-none",
      sev: "WARN",
      what: "a page with no dealt moment (every kind carries two, three on a long page); the gate holds it as a FAIL",
    },
  ];
  const fixes = {
    "visual-caption":
      "take the line away: no caption or description under, over or on any image, render or visual; a licence credit goes in one footer line",
    "visual-empty":
      "make the visual draw at this width: a picture that loads, an effect that renders, or its still fallback; never an empty ground or frame",
    "hero-enter":
      "put data-enter on the hero <section> and keep the head line from starter.html that sets html.m-enter (motion.md: the entrance)",
    "moment-none":
      "deal them (start.mjs plan, or moments.mjs pick --page <kind> --scene deal) and mount each in its own section (moments.md)",
    "effect-kind":
      "take the effect off or deal one that fits: a place, shop or service page takes one quiet treatment at most (effects.mjs pick --page <kind> --slots band) and a scene dealt by fit (moments.mjs pick --page <kind> --scene deal), never a tech-looking shader ground",
  };
  const summary = [
    "  visuals    visual-caption (a caption, description or caption-like line under, over or on an image, render or visual",
    "             of 120x80px or more, house rule: a figcaption, a caption class or a caption phrase FAIL, a muted line of",
    "             2 rows or less and 15px or less 32px under it, or one laid over its lower half, WARN)",
    "  render     visual-empty (a canvas, effect or diagram mount, svg, picture or background frame of 120x80px or more",
    "             showing under 6 colours at this width: blank (99.8% one colour, a canvas or mount 98%) FAIL, else WARN;",
    "             6 colours or more with no detail, a smooth gradient only, WARN; a broken picture or background, or a",
    "             diagram mount that never drew, FAIL)",
    "  effects    effect-kind (by the page's kind: --type, data-type, page-type, page-kind=place, site-kind, taste-kind (alias), title;",
    "             any effect on a place, a service or a product without a technical subject FAILs; tech, gaming and",
    "             software: a second big scene ([data-big-scene]) or a data-fx ground beside it FAILs (MO-16, MO-23); WARN",
    "             above 4 live WebGL contexts, 8 created, one big scene, two scroll moments, or no reduced-motion or phone branch;",
    "             every kind: moment-none, a page with no dealt moment, WARNs)",
    "  motion     hero-enter (every kind: a hero without data-enter, or a page without the head line that sets html.m-enter, WARN;",
    "             gate.mjs holds hero-enter and moment-none as FAILs)",
  ].join("\n");
  const flags = [
    {
      name: "tech-subject",
      kind: "bool",
      default: false,
      help: "a product page with a technical subject (hardware, a device): effects are judged as on a tech page",
    },
  ];
  const quick = true;

  // the kinds as the effect tables name them, and the words a brief may use for them
  const KIND_ALIAS = {
    game: "gaming",
    games: "gaming",
    ai: "software",
    saas: "software",
    app: "software",
    other: null,
  };
  const NO_EFFECT = new Set(["place", "product", "service"]);
  const EFFECT_OK = new Set(["tech", "gaming", "software"]);
  const KIND_RULE =
    "shader grounds fit tech, gaming and software pages and a product with a technical subject; a place, shop or service page takes one quiet treatment at most and a scene dealt by fit (house rule 8, effects-usage.md)";
  // the dealt moments and the kinds each is dealt to (assets/moments/index.json, "pages"): since 2.5.1 every kind deals one,
  // a place, product or service page its photo- and type-led ones; a moment off its kind, retired, or the halftone look of
  // picture-develops (not dealt) is an effect there
  const MOMENT_PAGES = (() => {
    const o = {};
    try {
      for (const m of readCatalogue(TASTE)) o[m.id] = { pages: m.retired ? [] : m.pages || [] };
    } catch {}
    return o;
  })();
  const momentFits = (m, kind) => {
    const x = MOMENT_PAGES[m.id];
    return !!x && x.pages.includes(kind) && !(m.id === "picture-develops" && /print/i.test(m.look || ""));
  };
  // 6 colours or more with detail under 0.2%: a smooth gradient with nothing on it (lines, text, halftone and
  // photographs score about 0.5% and up)
  const SMOOTH_MAX = 0.002;
  // a picture, drawing or background this rich at the first width is not shot again at later widths
  const RICH = 12;

  // what the first width read once a page (the kind, the files' effect signs, the particle rate, the drift walk) and the
  // largest counts seen at any width so far; what has been told, so a later width tells only what is new. Both are reset
  // at the first width of a run.
  let pageFx = null;
  let rich = { url: "", sels: new Set() };

  // ---------------------------------------------------------------- GLSL lint (proof only: shader-lint tells these)
  // GLSL ES 1.00/3.00 reserved words a shader must not use as names (the task list first, then the spec's remaining
  // "future reserved" words); flat, smooth and layout are real qualifiers in ES 3.00, so only their uses as names count
  const RESERVED = [
    "flat",
    "smooth",
    "layout",
    "input",
    "output",
    "sample",
    "filter",
    "sizeof",
    "cast",
    "namespace",
    "using",
    "common",
    "partition",
    "active",
    "superp",
    "union",
    "interface",
    "long",
    "short",
    "half",
    "fixed",
    "unsigned",
    "external",
    "noinline",
    "inline",
    "packed",
    "template",
    "this",
    "goto",
    "class",
    "typedef",
    "public",
    "static",
    "extern",
    "asm",
    "double",
    "enum",
    "volatile",
    "resource",
    "hvec2",
    "hvec3",
    "hvec4",
    "fvec2",
    "fvec3",
    "fvec4",
    "sampler1D",
    "sampler1DShadow",
    "sampler2DRect",
    "sampler2DRectShadow",
  ];
  const RESERVED_SET = new Set(RESERVED);
  const QUALIFIER_WORDS = new Set(["flat", "smooth", "layout"]);
  const TYPE_BEFORE =
    /\b(?:float|int|uint|bool|vec[234]|ivec[234]|uvec[234]|bvec[234]|mat[234](?:x[234])?|sampler\w+|void|struct|const|in|out|inout|highp|mediump|lowp)\s+$/;
  const blank = s => s.replace(/[^\n]/g, " ");
  const stripGlslComments = src =>
    src.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/\/\/[^\n]*/g, m => " ".repeat(m.length));

  // every reserved word one shader uses as a name: [{ word, line, use, snippet, sev }], line 1-based inside src
  function lintGlsl(src) {
    const text = stripGlslComments(src),
      out = [];
    const lines = text.split("\n"),
      orig = src.split("\n"),
      lineStart = [];
    {
      let p = 0;
      for (const l of lines) {
        lineStart.push(p);
        p += l.length + 1;
      }
    }
    // a preprocessor line: only the macro name of a #define is a name (its body is read with the rest below)
    for (let li = 0; li < lines.length; li++) {
      const m = lines[li].match(/^\s*#\s*define\s+(\w+)/);
      if (m && RESERVED_SET.has(m[1]))
        out.push({ word: m[1], line: li + 1, use: "#define", snippet: orig[li].trim().slice(0, 100), sev: "FAIL" });
    }
    const body = lines.map(l => (/^\s*#/.test(l) ? " ".repeat(l.length) : l)).join("\n");
    const lineAt = idx => {
      let lo = 0,
        hi = lineStart.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (lineStart[mid] <= idx) lo = mid;
        else hi = mid - 1;
      }
      return lo;
    };
    const re = /[A-Za-z_]\w*/g;
    let m;
    while ((m = re.exec(body))) {
      const w = m[0],
        idx = m.index,
        end = idx + w.length;
      if (!RESERVED_SET.has(w)) continue;
      const before = body.slice(Math.max(0, idx - 60), idx),
        after = body.slice(end, end + 60);
      const prevCh = (before.match(/(\S)\s*$/) || [])[1] || "";
      let legal = false;
      if (QUALIFIER_WORDS.has(w) && prevCh !== ".")
        legal =
          w === "layout" ? /^\s*\(/.test(after) : /^\s*(?:in|out|centroid|flat|smooth|varying|invariant)\b/.test(after);
      if (legal) continue;
      const use =
        prevCh === "." ? "field or swizzle access"
        : TYPE_BEFORE.test(before) ? "declaration"
        : /^\s*\(/.test(after) ? "call or function name"
        : /^\s*[=;,)[]/.test(after) ? "variable"
        : "use";
      const li = lineAt(idx);
      out.push({ word: w, line: li + 1, use, snippet: (orig[li] || "").trim().slice(0, 100), sev: "FAIL" });
    }
    // a gl_ prefix or a double underscore in a name the shader declares (gl_ FAILs, __ WARNs)
    const decl =
      /\b(?:float|int|uint|bool|vec[234]|ivec[234]|uvec[234]|bvec[234]|mat[234](?:x[234])?|sampler\w+|struct)\s+((?:gl_|\w*__)\w*)/g;
    while ((m = decl.exec(body))) {
      if (/ZZINTERPZZ/.test(m[1])) continue;
      const li = lineAt(m.index);
      out.push({
        word: m[1],
        line: li + 1,
        use: "declaration",
        snippet: (orig[li] || "").trim().slice(0, 100),
        sev: m[1].startsWith("gl_") ? "FAIL" : "WARN",
        prefix: m[1].startsWith("gl_") ? "gl_" : "__",
      });
    }
    return out;
  }

  // a string is shader source when it has a structural sign (a gl_ output, #version, a precision statement, main, or a
  // declaration ending in ";"), or vector types with two ; a { and float or void: a word list of GLSL keywords is none
  // (a test page gave 5 false FAILs from the reserved-word tables in kit.js and photo.js)
  const GLSL_STRONG =
    /gl_(?:FragColor|FragCoord|Position|FragData|PointSize)\b|#version\s+\d|precision\s+(?:highp|mediump|lowp)\s+\w+\s*;|\bvoid\s+main\s*\(/;
  const GLSL_DECL =
    /\b(?:uniform|varying|attribute|in|out)\s+(?:(?:highp|mediump|lowp)\s+)?(?:float|int|uint|bool|vec[234]|ivec[234]|uvec[234]|bvec[234]|mat[234](?:x[234])?|sampler(?:2D|3D|Cube)\w*)\s+\w+\s*(?:\[[^\]]*\])?\s*;/;
  const GLSL_TYPES = /\b(?:vec[234]|mat[234]|ivec[234]|uvec[234])\b/;
  const looksGlsl = t =>
    t.length > 30
    && (GLSL_STRONG.test(t)
      || GLSL_DECL.test(t)
      || (GLSL_TYPES.test(t) && (t.match(/;/g) || []).length >= 2 && /[{]/.test(t) && /\b(?:float|void)\b/.test(t)));
  // a whole shader has main(); anything else is a fragment (a chunk, a patch string, a dormant test hook)
  const isWholeShader = t => /\bvoid\s+main\s*\(/.test(t);

  // ---- a small JS scanner: string and template literals (interpolations replaced), try ranges, comment-free text
  function skipString(src, i) {
    const q = src[i];
    let j = i + 1;
    while (j < src.length && src[j] !== q && src[j] !== "\n") {
      if (src[j] === "\\") j++;
      j++;
    }
    return j + 1;
  }
  function readTemplate(src, i) {
    let out = "",
      j = i + 1;
    while (j < src.length) {
      const c = src[j];
      if (c === "\\") {
        const d = src[j + 1];
        out +=
          d === "n" ? "\n"
          : d === "t" ? "\t"
          : d === "r" ? ""
          : d;
        j += 2;
        continue;
      }
      if (c === "`") return { text: out, end: j + 1 };
      if (c === "$" && src[j + 1] === "{") {
        j = skipExpr(src, j + 2);
        out += "ZZINTERPZZ";
        continue;
      }
      out += c;
      j++;
    }
    return { text: out, end: j };
  }
  function skipExpr(src, i) {
    let depth = 1,
      j = i;
    while (j < src.length && depth) {
      const c = src[j];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === '"' || c === "'") {
        j = skipString(src, j);
        continue;
      } else if (c === "`") {
        j = readTemplate(src, j).end;
        continue;
      }
      j++;
    }
    return j;
  }
  const REGEX_PREV = new Set([
    "",
    "(",
    ",",
    "=",
    ":",
    "[",
    "!",
    "&",
    "|",
    "?",
    "{",
    "}",
    ";",
    "+",
    "-",
    "*",
    "%",
    "<",
    ">",
    "~",
    "^",
  ]);
  function scanJs(src) {
    const strings = [],
      comments = [];
    let i = 0,
      prevSig = "",
      lastWord = "";
    const n = src.length;
    while (i < n) {
      const c = src[i],
        d = src[i + 1];
      if (c === "/" && d === "/") {
        let e = src.indexOf("\n", i);
        if (e < 0) e = n;
        comments.push([i, e]);
        i = e;
        continue;
      }
      if (c === "/" && d === "*") {
        let e = src.indexOf("*/", i + 2);
        e = e < 0 ? n : e + 2;
        comments.push([i, e]);
        i = e;
        continue;
      }
      if (c === '"' || c === "'") {
        const e = skipString(src, i);
        strings.push({
          pos: i,
          kind: "str",
          text: src.slice(i + 1, e - 1).replace(/\\(n|t|r|\\|'|"|`)/g, (_m, k) =>
            k === "n" ? "\n"
            : k === "t" ? "\t"
            : k === "r" ? ""
            : k,
          ),
        });
        i = e;
        prevSig = '"';
        lastWord = "";
        continue;
      }
      if (c === "`") {
        const t = readTemplate(src, i);
        strings.push({ pos: i, kind: "tpl", text: t.text });
        i = t.end;
        prevSig = "`";
        lastWord = "";
        continue;
      }
      if (c === "/" && (REGEX_PREV.has(prevSig) || /^(?:return|typeof|case|in|of|delete|void)$/.test(lastWord))) {
        let j = i + 1,
          cls = false,
          ok = false;
        while (j < n && src[j] !== "\n") {
          const ch = src[j];
          if (ch === "\\") {
            j += 2;
            continue;
          }
          if (ch === "[") cls = true;
          else if (ch === "]") cls = false;
          else if (ch === "/" && !cls) {
            ok = true;
            break;
          }
          j++;
        }
        if (ok) {
          j++;
          while (j < n && /[a-z]/i.test(src[j])) j++;
          i = j;
          prevSig = '"';
          lastWord = "";
          continue;
        }
      }
      if (/[A-Za-z_$]/.test(c)) {
        let j = i + 1;
        while (j < n && /[\w$]/.test(src[j])) j++;
        lastWord = src.slice(i, j);
        prevSig = "a";
        i = j;
        continue;
      }
      if (/\d/.test(c)) {
        let j = i + 1;
        while (j < n && /[\w.]/.test(src[j])) j++;
        prevSig = "0";
        lastWord = "";
        i = j;
        continue;
      }
      if (!/\s/.test(c)) {
        prevSig = c;
        lastWord = "";
      }
      i++;
    }
    // the comments blanked slice by slice (same length, same lines), never character by character: a bundle is megabytes
    let noComments = src;
    if (comments.length) {
      const parts = [];
      let p = 0;
      for (const [s, e] of comments) {
        parts.push(src.slice(p, s), blank(src.slice(s, e)));
        p = e;
      }
      parts.push(src.slice(p));
      noComments = parts.join("");
    }
    return { strings, noComments };
  }
  const lineStarts = src => {
    const a = [0];
    for (let i = 0; i < src.length; i++) if (src[i] === "\n") a.push(i + 1);
    return a;
  };
  const lineOfPos = (ls, pos) => {
    let lo = 0,
      hi = ls.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (ls[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  // the shader sources inside one file: [{ line, text }] (a script already scanned is not scanned again)
  function extractShaders(text, fileKind, scanned) {
    if (fileKind === "glsl") return [{ line: 1, text }];
    const found = [];
    const consider = (src, off, sc) => {
      const ls = lineStarts(src);
      for (const s of (sc || scanJs(src)).strings)
        if (looksGlsl(s.text)) found.push({ line: lineOfPos(ls, s.pos) + off, text: s.text });
    };
    if (fileKind !== "html") {
      consider(text, 0, scanned);
      return found;
    }
    for (const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc\s*=/.test(m[1])) continue;
      const off = text.slice(0, m.index + m[0].indexOf(">") + 1).split("\n").length - 1;
      if (/x-shader|glsl/i.test(m[1])) found.push({ line: off + 1, text: m[2] });
      else consider(m[2], off);
    }
    return found;
  }
  // each file's shaders found once (the effect signs and any later reader share them)
  const shadersOf = f => f.shaders || (f.shaders = f.kind === "css" ? [] : extractShaders(f.text, f.kind, f.scan));

  // ---------------------------------------------------------------- what the page loads, read over http (no browser)
  // the page as served, every script, module, style and shader file of its import graph, the same-origin pages it embeds
  // (<iframe src>) with their scripts, and every script the browser fetched (dynamic imports included); other origins and
  // bare package names are listed as external, not read. A file over 3 MB is skipped and named, six are read at a time,
  // and the read stops after 20 s (what is left is named).
  const kindOf = u => {
    const e = (String(u)
      .split(/[?#]/)[0]
      .match(/\.[a-z0-9]+$/i) || [""])[0].toLowerCase();
    return (
      /^\.(js|mjs|cjs)$/.test(e) ? "js"
      : /^\.html?$/.test(e) ? "html"
      : e === ".css" ? "css"
      : /^\.(glsl|frag|vert|fs|vs)$/.test(e) ? "glsl"
      : null
    );
  };
  // matched against script URLs and bare import names only, on whole path or package segments ("ogl" is not "googleapis")
  const EXTERNAL_LIBS =
    /(?:^|[/@._-])(?:three|ogl|pixi|pixijs|regl|babylon|babylonjs|p5|tsparticles|particles|gsap|scrolltrigger|lenis|locomotive-scroll|scrollama|lottie|lottie-web|vanta|curtainsjs|unicorn|spline|splinetool|rive)(?:[/@._-]|$)/i;
  const MAX_BYTES = 3e6,
    READ_AT_ONCE = 6,
    READ_BUDGET = 20000;
  async function staticScan(pageUrl, fetched) {
    const out = { files: [], missing: [], external: [], skipped: [] };
    const origin = new URL(pageUrl).origin,
      seen = new Set(),
      queue = [],
      soft = new Set(),
      kinds = new Map(),
      t0 = Date.now();
    const get = async u => {
      const left = READ_BUDGET - (Date.now() - t0);
      if (left < 500) throw new Error("OUT OF TIME");
      const r = await fetch(u, { signal: AbortSignal.timeout(Math.min(10000, left)) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const size = Number(r.headers.get("content-length") || 0);
      if (size > MAX_BYTES) {
        if (r.body) r.body.cancel().catch(() => {});
        throw new Error("TOO BIG " + size);
      }
      const t = await r.text();
      if (t.length > MAX_BYTES) throw new Error("TOO BIG " + t.length);
      return t;
    };
    const add = (spec, from, isSoft, asKind) => {
      spec = String(spec).split("#")[0];
      if (!spec || /^(?:data|blob|mailto|tel|javascript|about):/i.test(spec)) return;
      let u;
      try {
        u = new URL(spec, from);
      } catch {
        return;
      }
      if (u.origin !== origin) {
        if (!out.external.includes(u.href)) out.external.push(u.href);
        return;
      }
      const k0 = asKind || kindOf(u.pathname);
      if (!k0) return;
      const k = u.href.split("#")[0];
      if (!seen.has(k)) {
        seen.add(k);
        queue.push(k);
        kinds.set(k, k0);
        if (isSoft) soft.add(k);
      }
    };
    const followJs = (sc, from) => {
      const code = sc.noComments;
      for (const re of [
        /\bimport\s*(?:[\w*${}\s,]+?\s*from\s*)?['"]([^'"]+)['"]/g,
        /\bexport\s*(?:\*|\{[^}]*\})\s*from\s*['"]([^'"]+)['"]/g,
        /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
      ]) {
        for (const m of code.matchAll(re)) {
          if (!/^(?:\.|\/|https?:)/.test(m[1])) {
            if (!out.external.includes(m[1])) out.external.push(m[1]);
            continue;
          }
          add(m[1], from);
        }
      }
      for (const m of code.matchAll(/\bnew\s+URL\(\s*(['"`])([^'"`]+)\1\s*,/g))
        if (!m[2].includes("${") && /\.(js|mjs|glsl|frag|vert|css|html?)$/i.test(m[2])) add(m[2], from, true);
    };
    const followHtml = (html, from) => {
      for (const m of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) add(m[1], from);
      for (const m of html.matchAll(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi))
        if (
          /rel\s*=\s*["'](?:stylesheet|modulepreload|preload)/i.test(m[0])
          && !/as\s*=\s*["'](?:font|image)/i.test(m[0])
        )
          add(m[1], from);
      // a same-origin page the page embeds is read like the page (its shaders and effect code are on screen too)
      for (const m of html.matchAll(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) add(m[1], from, false, "html");
      for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))
        if (!/\bsrc\s*=/.test(m[1])) followJs(scanJs(m[2]), from);
      for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))
        for (const im of m[1].matchAll(/@import\s+(?:url\()?["']?([^"')\s;]+)/g)) add(im[1], from);
    };
    // HTML comments are blanked (same length, same lines): a commented-out script is not on the page
    const html = (await get(pageUrl)).replace(/<!--[\s\S]*?-->/g, blank);
    out.files.push({ ref: pageUrl, kind: "html", text: html, isPage: true });
    seen.add(pageUrl.split("#")[0]);
    followHtml(html, pageUrl);
    for (const u of fetched || []) add(u, pageUrl, true);
    while (queue.length && out.files.length < 400 && Date.now() - t0 < READ_BUDGET) {
      await Promise.all(
        queue.splice(0, Math.min(READ_AT_ONCE, 400 - out.files.length)).map(async ref => {
          const kind = kinds.get(ref) || "js";
          let text;
          try {
            text = await get(ref);
          } catch (e) {
            const msg = String(e.message || e);
            if (/^TOO BIG/.test(msg))
              out.skipped.push({ ref, why: `over 3 MB (${Math.round(Number(msg.slice(8)) / 1e5) / 10} MB)` });
            else if (/^OUT OF TIME|aborted|timeout/i.test(msg) && Date.now() - t0 >= READ_BUDGET - 600)
              out.skipped.push({ ref, why: "the 20 s read ran out" });
            // a 404 on a file only the browser's request list or a new URL() guess named (a test page: ui.js builds
            // <name>/fragment.html at run time) is no probe error; a 404 on a real import is
            else if (!(soft.has(ref) && /HTTP 404/.test(msg))) out.missing.push({ ref, error: msg });
            return;
          }
          const f = {
            ref,
            kind,
            text: kind === "html" ? text.replace(/<!--[\s\S]*?-->/g, blank) : text,
            isPage: false,
          };
          out.files.push(f);
          if (kind === "js") {
            f.scan = scanJs(text);
            followJs(f.scan, ref);
          } else if (kind === "css")
            for (const im of text.matchAll(/@import\s+(?:url\()?["']?([^"')\s;]+)/g)) add(im[1], ref);
          else if (kind === "html") followHtml(f.text, ref);
        }),
      );
    }
    for (const ref of queue)
      out.skipped.push({ ref, why: out.files.length >= 400 ? "400 files read already" : "the 20 s read ran out" });
    return out;
  }

  const KIT_MOMENT_FILE =
    /\/assets\/(?:moments\/(?:[a-z0-9-]+\/moment\.(?:js|css)|lib\.js|moments\.js)|scenes\/(?:[a-z0-9-]+\/(?:scene|classic|stage)\.(?:js|css)|scenes\.(?:js|css)|lib\.js|print\.js))$/;
  const urlPath = u => {
    try {
      return new URL(u).pathname;
    } catch {
      return String(u || "");
    }
  };
  // the effect signs in what the page loads (effectSignals)
  function effectSignals(scan) {
    const all = scan.files.map(f => f.text).join("\n");
    const page = (scan.files.find(f => f.isPage) || { text: "" }).text;
    const css =
      scan.files
        .filter(f => f.kind === "css")
        .map(f => f.text)
        .join("\n")
      + "\n"
      + page;
    const attr = a => (page.match(new RegExp("<[^>]+\\sdata-" + a + "(?=[\\s=>/])", "g")) || []).length;
    return {
      dataFx: attr("fx"),
      dataScene: attr("scene") + attr("big-scene"),
      dataBigScene: attr("big-scene"),
      dataPrint: attr("print"),
      dataMoment: attr("moment"),
      photoObjects: [
        ...new Set(
          [
            ...all.matchAll(
              /objects\/(photo-halftone|photo-dither|photo-engraving|dot-object|dither-sequence|exploded-layers|split-reveal)\b/g,
            ),
          ].map(m => m[1]),
        ),
      ],
      shaderStrings: scan.files.reduce((n, f) => n + shadersOf(f).length, 0),
      // (a dealt moment's own files follow the scroll inside its section: effect-kind judges the moment. Only the kit's own
      // files count as one: assets/moments/<id>/moment.js or .css, lib.js and moments.js; a builder's js/moments/app.js is the page's)
      scrollStrong: [
        ...new Set(
          [
            ...scan.files
              .filter(f => f.isPage || !KIT_MOMENT_FILE.test(urlPath(f.ref)))
              .map(f => f.text)
              .join("\n")
              .matchAll(
                /ScrollTrigger|ScrollSmoother|\bLenis\b|locomotive-scroll|scroll-timeline|animation-timeline\s*:\s*(?:scroll|view)|view-timeline|scrollama/g,
              ),
          ].map(m => m[0]),
        ),
      ],
      particleLibs: [
        ...new Set(
          [
            ...all.matchAll(
              /tsparticles|particlesJS|new\s+Particle\s*\(|class\s+Particle\b|particleCount|THREE\.Points|numParticles|particles\.push\(/g,
            ),
          ].map(m => m[0]),
        ),
      ],
      externalLibs: scan.external.filter(
        e => !/\.css(?:[?#]|$)|fonts\.(?:googleapis|gstatic)\.com/i.test(e) && EXTERNAL_LIBS.test(e),
      ),
      reducedMotion: /prefers-reduced-motion/.test(all + "\n" + css),
      phoneHint: /\(\s*max-width|pointer\s*:\s*coarse|innerWidth|matchMedia|isMobile|isTouch/.test(all),
    };
  }

  // ---------------------------------------------------------------- PNG colours (no dependencies)
  function decodePng(buf) {
    if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a png");
    let p = 8,
      w = 0,
      h = 0,
      bd = 8,
      ct = 6,
      il = 0;
    const idat = [];
    while (p < buf.length) {
      const len = buf.readUInt32BE(p),
        type = buf.toString("ascii", p + 4, p + 8),
        data = buf.subarray(p + 8, p + 8 + len);
      if (type === "IHDR") {
        w = data.readUInt32BE(0);
        h = data.readUInt32BE(4);
        bd = data[8];
        ct = data[9];
        il = data[12];
      } else if (type === "IDAT") idat.push(data);
      else if (type === "IEND") break;
      p += 12 + len;
    }
    const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ct];
    if (bd !== 8 || il !== 0 || !ch) throw new Error(`unsupported png (depth ${bd}, type ${ct}, interlace ${il})`);
    const raw = inflateSync(Buffer.concat(idat)),
      stride = w * ch,
      out = Buffer.alloc(h * stride);
    for (let y = 0; y < h; y++) {
      const f = raw[y * (stride + 1)],
        o = y * stride,
        line = y * (stride + 1) + 1;
      for (let x = 0; x < stride; x++) {
        const a = x >= ch ? out[o + x - ch] : 0,
          b = y ? out[o - stride + x] : 0,
          c = x >= ch && y ? out[o - stride + x - ch] : 0;
        let v = raw[line + x];
        if (f === 1) v += a;
        else if (f === 2) v += b;
        else if (f === 3) v += (a + b) >> 1;
        else if (f === 4) {
          const pp = a + b - c,
            pa = Math.abs(pp - a),
            pb = Math.abs(pp - b),
            pc = Math.abs(pp - c);
          v +=
            pa <= pb && pa <= pc ? a
            : pb <= pc ? b
            : c;
        }
        out[o + x] = v & 255;
      }
    }
    return { w, h, ch, data: out };
  }
  // distinct colours: each channel cut to 5 bits; a colour counts when it holds 0.1% of the pixels (edges and noise
  // ignored). Detail: the share of pixels whose right or lower neighbour differs by 10 or more in a channel; a
  // smooth gradient scores 0
  function colourStats(png) {
    const counts = new Map(),
      total = png.w * png.h,
      gray = png.ch < 3;
    for (let i = 0; i < png.data.length; i += png.ch) {
      const r = png.data[i],
        g = gray ? r : png.data[i + 1],
        b = gray ? r : png.data[i + 2];
      const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    let max = 0,
      sig = 0;
    for (const c of counts.values()) {
      if (c > max) max = c;
      if (c / total >= 0.001) sig++;
    }
    let edge = 0;
    const cc = Math.min(png.ch, 3),
      stride = png.w * png.ch;
    for (let y = 0; y < png.h - 1; y++) {
      for (let x = 0; x < png.w - 1; x++) {
        const i = y * stride + x * png.ch;
        for (let k = 0; k < cc; k++) {
          const v = png.data[i + k];
          if (Math.abs(v - png.data[i + png.ch + k]) >= 10 || Math.abs(v - png.data[i + stride + k]) >= 10) {
            edge++;
            break;
          }
        }
      }
    }
    return {
      distinct: sig,
      dominant: Math.round((max / total) * 1000) / 1000,
      detail: Math.round((edge / Math.max(1, total)) * 10000) / 10000,
    };
  }
  // under 6 colours is flagged: FAIL when it is blank (99.8% one colour) or a shader frame (canvas, mount) is 98% one
  // colour; else WARN (a thin line drawing or a logo has few colours but real content: its lines are 1-3% of the pixels).
  // 6 colours or more with no detail is a smooth gradient with nothing on it: WARN
  const flatVerdict = (st, kind) =>
    st.distinct >= 6 ?
      st.detail < SMOOTH_MAX ?
        "WARN"
      : "PASS"
    : st.dominant >= 0.998 || ((kind === "canvas" || kind === "mount") && st.dominant >= 0.98) ? "FAIL"
    : "WARN";
  const lookAgain = st => st.distinct < 6 || st.detail < SMOOTH_MAX;

  // ---------------------------------------------------------------- in the page (serialised: nothing from this module's scope)
  // the visuals (120x80px or more, the outermost of nested ones, 40 at most), the caption lines round them, the broken
  // pictures and the CSS background urls; the visuals and the fixed bars are kept on window.__vxCands and __vxFixed
  function visualProbe(o) {
    const W = document.documentElement.clientWidth || innerWidth,
      H = innerHeight,
      sy = scrollY;
    const cs = e => getComputedStyle(e);
    const vis = e => {
      try {
        return e.checkVisibility({ checkVisibilityCSS: true });
      } catch (x) {
        return e.getClientRects().length > 0;
      }
    };
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
    const txt = el => (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
    const doc = r => {
      const l = Math.max(0, r.left),
        rr = Math.min(W, r.right);
      return rr - l >= 1 && r.height >= 1 ?
          { left: Math.round(l), top: Math.round(r.top + sy), width: Math.round(rr - l), height: Math.round(r.height) }
        : null;
    };
    const file = u =>
      /^data:/i.test(String(u || "")) ? "" : (
        String(u || "")
          .split(/[?#]/)[0]
          .split("/")
          .pop()
          .slice(0, 44)
      );
    // the picture urls of a background: quoted or bare, escapes kept whole; a data: or blob: texture and a #filter
    // reference inside one (url(%23n) in an svg data url) are no picture to load (false FAILs seen on two test pages)
    const picUrls = bi => {
      const out = [];
      for (const m of String(bi || "").matchAll(
        /url\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^)"'\s]*))\s*\)/g,
      )) {
        const u = m[1] ?? m[2] ?? m[3] ?? "";
        if (u && !/^(?:data|blob):|^#|^%23/i.test(u)) out.push(u);
      }
      return out;
    };
    // the WebGL guard's own lists: the canvases holding a context, and those it refused past its cap
    const G = window.__ccgl,
      glEls = new Set();
    try {
      for (const x of (G && G.list) || []) {
        const c = x.c && x.c.deref && x.c.deref();
        if (c) glEls.add(c);
      }
    } catch (e) {
      /* no guard */
    }
    const inside = (el, set) => {
      try {
        return set.has(el) || [...el.querySelectorAll("canvas")].some(c => set.has(c));
      } catch (e) {
        return false;
      }
    };
    // a visual that moves as it is measured: in a scroll scene, in a held sticky stage, or under a running finite animation
    const held = el => {
      if (el.closest("[data-big-scene], [data-scroll-moment], [data-moment][data-moment-mounted]"))
        return "it sits in a scroll scene";
      for (let e = el.parentElement; e && e !== document.body; e = e.parentElement)
        if (cs(e).position === "sticky") {
          const r = e.getBoundingClientRect();
          if (r.width >= W * 0.6 && r.height >= H * 0.6) return "it sits in a held sticky stage";
        }
      return "";
    };
    // the targets of the running finite animations, read once
    const running = new Set();
    try {
      for (const a of document.getAnimations()) {
        const t = a.effect && a.effect.target;
        if (t && a.playState === "running" && Number.isFinite(a.effect.getComputedTiming().iterations)) running.add(t);
      }
    } catch (e) {
      /* no animations */
    }
    const moving = el => {
      for (let e = el; e; e = e.parentElement) if (running.has(e)) return true;
      return false;
    };
    const out = {
      W,
      H,
      maxScroll: Math.max(0, document.scrollingElement.scrollHeight - H),
      captions: [],
      cands: [],
      broken: [],
      bgUrls: [],
      notes: [],
      overN: 0,
      over: [],
    };
    const SKIPTAG = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|HEAD|META|LINK)$/;
    // ---- the visuals (also what a caption is measured against)
    let cands = [];
    for (const el of document.body.querySelectorAll("*")) {
      const tag = el.tagName.toLowerCase();
      if (SKIPTAG.test(el.tagName)) continue;
      if (el instanceof SVGElement && tag !== "svg") continue;
      if (tag !== "svg" && el.closest("svg")) continue;
      if (tag === "svg" && el.parentElement && el.parentElement.closest("svg")) continue;
      const media = /^(img|canvas|video|svg)$/.test(tag),
        mount = el.matches("[data-fx],[data-print],[data-product],[data-scene],[data-webgl],[data-diagram]");
      // a background picture is a url that is no data: texture (a grain or noise tile under a card is its ground)
      const bg =
        !media
        && !mount
        && picUrls(cs(el).backgroundImage).length > 0
        && !/^(body|html|main|section|header|footer|article|nav|aside)$/.test(tag);
      if (!(media || mount || bg) || !vis(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 120 || r.height < 80) continue;
      cands.push({
        el,
        kind:
          mount ? "mount"
          : bg ? "bg"
          : tag,
        r,
      });
    }
    cands = cands.filter(c => !cands.some(x => x !== c && x.el.contains(c.el)));
    // past the first 40 (in page order) nothing is shot: they are named, so the report says so
    if (cands.length > 40) {
      out.overN = cands.length - 40;
      out.over = cands.slice(40, 44).map(c => sel(c.el));
      cands = cands.slice(0, 40);
    }
    const what = c => {
      const e = c.el;
      if (c.kind === "mount") {
        if (e.hasAttribute("data-diagram"))
          return `diagram${e.getAttribute("data-diagram") ? ` (${e.getAttribute("data-diagram")})` : ""}`;
        const fx =
          e.getAttribute("data-fx")
          || e.getAttribute("data-print")
          || e.getAttribute("data-scene")
          || e.getAttribute("data-webgl");
        return `effect${fx ? ` (${fx})` : ""}`;
      }
      if (c.kind === "img") return `picture ${file(e.currentSrc || e.getAttribute("src"))}`.trim();
      if (c.kind === "bg") return `background picture ${file(picUrls(cs(e).backgroundImage)[0])}`.trim();
      return { canvas: "canvas", svg: "drawing (svg)", video: "video" }[c.kind] || c.kind;
    };
    // ---- text blocks: the nearest block-level box of each run of words
    const blocks = [],
      seen = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!/\S/.test(n.data)) continue;
      let el = n.parentElement;
      if (!el || el.closest("script,style,noscript,template,svg,[hidden]")) continue;
      while (el && /^inline/.test(cs(el).display) && el.parentElement) el = el.parentElement;
      if (!el || seen.has(el)) continue;
      seen.add(el);
      if (!vis(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 6) continue;
      const s = cs(el),
        fs = parseFloat(s.fontSize) || 16;
      let lh = parseFloat(s.lineHeight);
      if (!isFinite(lh)) lh = fs * 1.25;
      blocks.push({
        el,
        r,
        fs,
        rows: Math.max(1, Math.round(r.height / lh)),
        text: txt(el),
        tag: el.tagName.toLowerCase(),
        cls: typeof el.className === "string" ? el.className : "",
      });
    }
    const CREDIT =
      /©|\b(?:unsplash|pexels|pixabay|shutterstock|getty|wikimedia|cc by|cc0|licen[cs]e[sd]?|credits?|courtesy of|photo(?:graph)? (?:by|credit)|image (?:by|credit)|photos? from|images? from)\b/i;
    const PRICE = /(?:[€$£]\s?\d|\d\s?(?:€|\$|£|eur|usd|chf)\b)/i;
    // "example" and "sample" count only as a label ("(sample)", "Sample coffees"), never inside an address such as hello@x.example
    const PHRASE =
      /\b(?:made (?:in|with) code|placeholder|illustration|rendering|render of|pictured|photo of|picture of|image of|view of|shown (?:above|here|below)|fig\.?\s*\d|figure\s*\d|caption)\b|\((?:sample|example)s?\)|^\s*(?:sample|example)s?\b/i;
    const CAPCLS = /(?:^|[\s_-])(?:caption|figcaption|img-?cap|photo-?cap|legend)(?:$|[\s_-])/i;
    const exempt = b =>
      /^h[1-6]$/.test(b.tag)
      || b.el.closest("a,button,nav,summary,label,header,footer,blockquote,q,[role=heading],[role=button],[role=tab]")
      || PRICE.test(b.text)
      || CREDIT.test(b.text);
    const xo = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const add = (kind, sev, b, c, note, gap) =>
      out.captions.push({
        kind,
        sev,
        text: b.text.slice(0, 90),
        sel: sel(b.el),
        visual: sel(c.el),
        what: what(c),
        note,
        fs: Math.round(b.fs),
        rows: b.rows,
        gap: gap == null ? null : Math.max(0, Math.round(gap)),
        doc: doc(b.r),
        vdoc: doc(c.r),
      });
    // a figcaption counts whenever its figure holds a visual (a markup fault: told at the first width only)
    if (o.first)
      for (const fc of document.querySelectorAll("figcaption")) {
        if (!vis(fc)) continue;
        const fig = fc.closest("figure"),
          c = fig && cands.find(x => fig.contains(x.el) && !fc.contains(x.el));
        if (c)
          add(
            "figcaption",
            "FAIL",
            { el: fc, r: fc.getBoundingClientRect(), text: txt(fc), fs: parseFloat(cs(fc).fontSize) || 16, rows: 1 },
            c,
            "a figcaption in the figure of the visual",
          );
        else out.notes.push("figcaption without a 120x80 visual, not counted: " + sel(fc));
      }
    for (const c of cands) {
      const rv = c.r;
      const below = blocks
        .filter(
          b =>
            !c.el.contains(b.el)
            && b.r.top >= rv.bottom - 4
            && b.r.top - rv.bottom <= 32
            && xo(b.r, rv) >= Math.min(b.r.width, rv.width) * 0.4,
        )
        .sort((a, b) => a.r.top - b.r.top)[0];
      const above = blocks
        .filter(
          b =>
            !c.el.contains(b.el)
            && b.r.bottom <= rv.top + 4
            && rv.top - b.r.bottom <= 32
            && xo(b.r, rv) >= Math.min(b.r.width, rv.width) * 0.4,
        )
        .sort((a, b) => b.r.bottom - a.r.bottom)[0];
      if (below && !exempt(below) && below.tag !== "figcaption") {
        const short = below.rows <= 2 && below.text.length <= 180,
          gap = below.r.top - rv.bottom;
        if (CAPCLS.test(below.cls)) add("caption-class", "FAIL", below, c, "its class names it a caption", gap);
        else if (short && PHRASE.test(below.text)) add("caption-phrase", "FAIL", below, c, "a caption phrase", gap);
        else if (
          short
          && below.fs <= 15
          && !blocks.some(
            n =>
              n !== below
              && /^h[1-6]$/.test(n.tag)
              && n.r.top >= below.r.bottom - 2
              && n.r.top - below.r.bottom <= 40
              && xo(n.r, below.r) >= Math.min(n.r.width, below.r.width) * 0.4,
          )
        )
          add("caption-line", "WARN", below, c, "a muted line", gap);
      }
      if (
        above
        && !exempt(above)
        && above.tag !== "figcaption"
        && above.rows <= 2
        && above.text.length <= 180
        && (CAPCLS.test(above.cls) || PHRASE.test(above.text))
      )
        add(
          "caption-above",
          above.fs <= 15 ? "FAIL" : "WARN",
          above,
          c,
          "a caption-like line",
          rv.top - above.r.bottom,
        );
      for (const b of blocks) {
        if (
          c.el.contains(b.el)
          || exempt(b)
          || b.fs > 15
          || b.rows > 2
          || b.text.length < 14
          || b.text.split(/\s+/).length < 3
        )
          continue;
        if (
          b.r.left < rv.left - 2
          || b.r.right > rv.right + 2
          || b.r.top < rv.top + rv.height * 0.5
          || b.r.bottom > rv.bottom + 2
        )
          continue;
        let abs = false,
          card = false;
        for (let e = b.el; e && e !== document.body; e = e.parentElement)
          if (cs(e).position === "absolute") {
            abs = true;
            break;
          }
        // a line on a card of its own laid over the visual (a map's address card, a UI window) is that card's text
        for (let e = b.el; e && e !== document.body && !e.contains(c.el); e = e.parentElement) {
          const m = String(cs(e).backgroundColor).match(/rgba?\(([^)]+)\)/);
          const p = m ? m[1].split(/[\s,/]+/).filter(Boolean) : [];
          if (p.length && (p.length < 4 || parseFloat(p[3]) > 0.5)) {
            card = true;
            break;
          }
        }
        if (abs && !card) add("overlay-caption", "WARN", b, c, "a small line laid over the lower half of the visual");
      }
    }
    // ---- the visuals for the colour count, and the fixed and sticky bars hidden while each is shot
    window.__vxCands = cands.map(c => c.el);
    window.__vxFixed = [...document.body.querySelectorAll("*")].filter(e => {
      const p = cs(e).position;
      return (p === "fixed" || p === "sticky") && vis(e);
    });
    cands.forEach((c, i) =>
      out.cands.push({
        i,
        kind: c.kind,
        sel: sel(c.el),
        what: what(c),
        w: Math.round(c.r.width),
        h: Math.round(c.r.height),
        doc: doc(c.r),
        gl: inside(c.el, glEls),
        refused: !!(G && G.refusedEls && inside(c.el, G.refusedEls)),
        held: held(c.el),
        moving: moving(c.el),
        unmounted: [
          ...(c.el.matches("[data-diagram],[data-scene]") ? [c.el] : []),
          ...c.el.querySelectorAll("[data-diagram],[data-scene]"),
        ]
          .slice(0, 6)
          .filter(m => !m.querySelector("canvas,svg,img,video,picture,iframe"))
          .map(m => ({ sel: sel(m), attr: m.hasAttribute("data-diagram") ? "data-diagram" : "data-scene" })),
      }),
    );
    // ---- broken pictures (every img, even a small one) and the CSS background urls
    for (const img of document.images) {
      if (!vis(img)) continue;
      const src = img.currentSrc || img.getAttribute("src") || "";
      const r = img.getBoundingClientRect(),
        d =
          r.width >= 2 && r.height >= 2 ? doc(r)
          : img.parentElement ? doc(img.parentElement.getBoundingClientRect())
          : null;
      const why =
        !src ? "no source"
        : img.complete && img.naturalWidth === 0 ? "broken"
        : !img.complete ? "loading"
        : "";
      if (why) out.broken.push({ sel: sel(img), src: src.slice(0, 120), file: file(src), why, doc: d });
    }
    const urls = new Map();
    for (const el of document.body.querySelectorAll("*")) {
      if (SKIPTAG.test(el.tagName) || el instanceof SVGElement) continue;
      const bi = cs(el).backgroundImage;
      if (!bi || bi === "none" || !/url\(/.test(bi)) continue;
      for (const u of picUrls(bi))
        if (!urls.has(u)) urls.set(u, { sel: sel(el), doc: doc(el.getBoundingClientRect()) });
    }
    out.bgUrls = [...urls].slice(0, 40).map(([u, x]) => ({ src: u, ...x }));
    return out;
  }
  // each CSS background url loaded once more: those that fail (6 s each at most)
  function bgProbe(list) {
    const bad = [];
    return Promise.all(
      list.map(
        x =>
          new Promise(res => {
            const i = new Image();
            const t = setTimeout(res, 6000);
            i.onload = () => {
              clearTimeout(t);
              res();
            };
            i.onerror = () => {
              clearTimeout(t);
              bad.push(x);
              res();
            };
            i.src = x.src;
          }),
      ),
    ).then(() => bad);
  }
  // on this screen: the fixed and sticky bars that are not part of its visuals hidden, and each visual's page-coordinate clip
  function clipsProbe(o) {
    const C = window.__vxCands || [],
      W = document.documentElement.clientWidth || innerWidth,
      H = innerHeight;
    if (!document.getElementById("__vxstyle")) {
      const s = document.createElement("style");
      s.id = "__vxstyle";
      s.textContent = "[data-vx-hide]{visibility:hidden !important}html,body{scroll-behavior:auto !important}";
      document.head.appendChild(s);
    }
    const els = o.idx.map(i => C[i]).filter(Boolean);
    for (const f of window.__vxFixed || [])
      f.toggleAttribute("data-vx-hide", !els.some(el => f.contains(el) || el.contains(f)));
    return o.idx.map(i => {
      const el = C[i];
      if (!el || !el.isConnected) return null;
      const r = el.getBoundingClientRect(),
        x0 = Math.max(0, r.left),
        y0 = Math.max(0, r.top),
        x1 = Math.min(W, r.right),
        y1 = Math.min(H, r.bottom);
      return {
        i,
        x: x0 + scrollX,
        y: y0 + scrollY,
        w: Math.round(x1 - x0),
        h: Math.round(y1 - y0),
        full: Math.round((((x1 - x0) * (y1 - y0)) / Math.max(1, r.width * r.height)) * 100),
        rect: { left: Math.round(x0), top: Math.round(y0), width: Math.round(x1 - x0), height: Math.round(y1 - y0) },
      };
    });
  }
  // the page as it was: bars shown again, the style and the kept elements gone
  function cleanupProbe() {
    for (const e of document.querySelectorAll("[data-vx-hide]")) e.removeAttribute("data-vx-hide");
    const s = document.getElementById("__vxstyle");
    if (s) s.remove();
    delete window.__vxCands;
    delete window.__vxFixed;
    return 1;
  }
  // the page's kind marks, the effect parts on the page, the WebGL guard's counts and the scripts the browser fetched
  function kindProbe() {
    const meta = n => {
      const m = document.querySelector(`meta[name="${n}"]`);
      return m ?
          String(m.getAttribute("content") || "")
            .trim()
            .toLowerCase()
        : "";
    };
    const q = s => document.querySelectorAll(s).length;
    const G = window.__ccgl,
      W = document.documentElement.clientWidth || innerWidth,
      H = innerHeight;
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
    const first = s => {
      const e = document.querySelector(s);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return r.width >= 1 && r.height >= 1 ?
          {
            sel: sel(e),
            doc: {
              left: Math.round(Math.max(0, r.left)),
              top: Math.round(r.top + scrollY),
              width: Math.round(Math.min(W, r.right) - Math.max(0, r.left)),
              height: Math.round(r.height),
            },
          }
        : { sel: sel(e), doc: null };
    };
    // the canvases holding a live context now (the guard's list, lost and dropped ones left out)
    const live = [];
    try {
      for (const x of (G && G.list) || []) {
        const c = x.c && x.c.deref && x.c.deref(),
          g = x.g && x.g.deref && x.g.deref();
        if (!c || !g || !c.isConnected) continue;
        try {
          if (g.isContextLost()) continue;
        } catch (e) {
          continue;
        }
        live.push(c);
      }
    } catch (e) {
      /* guard changed */
    }
    // the canvases a product's own render asked a context for (some are off the page by now, freed after a still)
    const prodEls = new Set();
    try {
      for (const x of (G && G.list) || []) {
        if (!x.prod) continue;
        const c = x.c && x.c.deref && x.c.deref();
        if (c) prodEls.add(c);
      }
    } catch (e) {
      /* guard changed */
    }
    const origin = location.origin;
    const fetched = [
      ...new Set([
        ...performance.getEntriesByType("resource").map(e => e.name),
        ...[...document.scripts].map(s => s.src).filter(Boolean),
      ]),
    ].filter(u => {
      try {
        return new URL(u).origin === origin;
      } catch (e) {
        return false;
      }
    });
    return {
      taste: meta("taste-kind"),
      siteKind: meta("site-kind"),
      pageKind: meta("page-kind"),
      pageType: meta("page-type"),
      dataType: String(document.documentElement.getAttribute("data-type") || "")
        .trim()
        .toLowerCase(),
      fxIds: [...document.querySelectorAll("[data-fx]")].map(
        e =>
          String(e.getAttribute("data-fx") || "")
            .trim()
            .split(/[\s:]/)[0],
      ),
      bigIds: [...document.querySelectorAll("[data-big-scene]")].map(e =>
        String(e.getAttribute("data-big-scene") || "").trim(),
      ),
      dataFx: q("[data-fx]"),
      dataScene: q("[data-scene], [data-big-scene]"),
      dataPrint: q("[data-print]"),
      dataMoment: q("[data-scroll-moment], [data-moment]"),
      bigScene: q("[data-big-scene]"),
      fxBeside: [...document.querySelectorAll("[data-fx]")].filter(
        e => !e.closest("[data-big-scene], [data-scroll-moment], [data-moment][data-moment-mounted]"),
      ).length,
      mount: first("[data-fx], [data-scene], [data-big-scene], [data-print]"),
      moment: first("[data-scroll-moment], [data-moment]"),
      // the hero's entrance (motion.md): data-enter on the hero section and the head line that sets html.m-enter; a hero
      // that holds a big scene with its own load motion writes data-enter="off" (motion.md), and the scene is its entrance
      enter: {
        hero: first("main > section.hero, section.hero, .hero"),
        data: !!document.querySelector('.hero[data-enter]:not([data-enter="off"])'),
        head: document.documentElement.classList.contains("m-enter"),
        scene: !!document.querySelector(
          '.hero[data-enter="off"][data-big-scene], .hero[data-enter="off"] [data-big-scene]',
        ),
      },
      moments: [...document.querySelectorAll("[data-moment]")].map(e => {
        let look = "";
        try {
          look = String((JSON.parse(e.getAttribute("data-moment-opts") || "{}") || {}).look || "");
        } catch (x) {
          /* bad json */
        }
        const id = String(e.getAttribute("data-moment") || "").trim();
        return {
          id,
          look,
          sel: sel(e),
          nested: !!(e.parentElement && e.parentElement.closest("[data-moment]")),
          mounted: e.hasAttribute("data-moment-mounted"),
          failed: String(e.getAttribute("data-moment-failed") || "").slice(0, 120),
          loaded: performance.getEntriesByType("resource").some(r => {
            try {
              return new URL(r.name).pathname.endsWith(`/moments/${id}/moment.js`);
            } catch (x) {
              return false;
            }
          }),
        };
      }),
      printObjects: [
        ...[...document.querySelectorAll("[data-print]")].map(e => {
          let fx = "render";
          try {
            fx = String(
              (JSON.parse(e.getAttribute("data-print-params") || "{}") || {}).effect || "render",
            ).toLowerCase();
          } catch (x) {
            /* bad json */
          }
          return { id: String(e.getAttribute("data-print") || "").trim(), effect: fx };
        }),
        ...[...document.querySelectorAll("[data-product]")].map(() => ({ id: "print-product", effect: "render" })),
      ],
      // created: the contexts the page got (an ask the guard refused is no context, and a canvas asked again after a
      // refusal is counted once more by the guard); big: a large live canvas that is no data-fx ground and no part of a
      // scene (bigGlNonFx)
      gl:
        G ?
          {
            asked: (G.asked || 0) - (G.prodAsked || 0),
            created: Math.max(0, (G.asked || 0) - (G.prodAsked || 0) - ((G.refused || 0) - (G.prodRefused || 0))),
            prodAsked: G.prodAsked || 0,
            peak: G.peak,
            at: (G.peakAt || []).slice(0, 8),
            refused: G.refused,
            big: live.filter(c => {
              const r = c.getBoundingClientRect();
              return (
                r.width >= 0.5 * W
                && r.height >= 0.4 * H
                && !prodEls.has(c)
                && !c.closest("[data-fx], [data-fx-mounted], [data-scene], [data-big-scene], [data-product]")
              );
            }).length,
            outsidePrint: (() => {
              try {
                return ((G && G.list) || [])
                  .map(x => x.c && x.c.deref && x.c.deref())
                  .filter(c => c && !prodEls.has(c) && !c.closest("[data-print], [data-product]")).length;
              } catch (e) {
                return G.asked;
              }
            })(),
          }
        : null,
      canvas: (() => {
        try {
          const c =
            live[0] || ((G && G.list) || []).map(x => x.c && x.c.deref && x.c.deref()).find(e => e && e.isConnected);
          if (c) {
            c.setAttribute("data-vx-gl", "");
            const f = first("[data-vx-gl]");
            c.removeAttribute("data-vx-gl");
            return f;
          }
        } catch (e) {
          /* guard changed */
        }
        return first("canvas");
      })(),
      fetched: fetched.slice(0, 300),
    };
  }
  // canvas 2D shapes drawn a second at the top of the page (arc and fillRect counted for 0.6 s, then put back)
  async function particleProbe() {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    scrollTo({ top: 0, left: 0, behavior: "instant" });
    await wait(400);
    const P = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
    if (!P) return 0;
    let n = 0;
    const orig = { arc: P.arc, fillRect: P.fillRect };
    for (const m of ["arc", "fillRect"])
      P[m] = function () {
        n++;
        return orig[m].apply(this, arguments);
      };
    try {
      await wait(600);
    } finally {
      P.arc = orig.arc;
      P.fillRect = orig.fillRect;
    }
    return Math.round(n / 0.6);
  }
  // parallax (the scroll-linked probe): sections, cards and frames whose box drifts more than 4px off the scroll when the
  // page moves 100px, a screen's 0.7 at a time; a fixed or sticky part, and one under a running finite animation, is passed
  async function driftProbe(o) {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const H = innerHeight,
      W = document.documentElement.clientWidth || innerWidth;
    const cs = e => getComputedStyle(e);
    const vis = e => {
      try {
        return e.checkVisibility({ checkVisibilityCSS: true });
      } catch (x) {
        return e.getClientRects().length > 0;
      }
    };
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
    const boxed = e => {
      const s = cs(e);
      if (
        alphaOf(s.backgroundColor) > 0.03
        || (s.backgroundImage && s.backgroundImage !== "none")
        || (s.boxShadow && s.boxShadow !== "none")
      )
        return true;
      return ["Top", "Right", "Bottom", "Left"].some(
        k =>
          parseFloat(s["border" + k + "Width"]) > 0
          && s["border" + k + "Style"] !== "none"
          && alphaOf(s["border" + k + "Color"]) > 0.05,
      );
    };
    const fixedLike = e => {
      for (let x = e; x && x !== document.body; x = x.parentElement) {
        const p = cs(x).position;
        if (p === "fixed" || p === "sticky") return true;
      }
      return false;
    };
    // the targets of the running finite animations, read once a step (not once an element)
    const running = () => {
      const s = new Set();
      try {
        for (const a of document.getAnimations()) {
          const t = a.effect && a.effect.target;
          if (t && a.playState === "running" && Number.isFinite(a.effect.getComputedTiming().iterations)) s.add(t);
        }
      } catch (e) {
        /* no animations */
      }
      return s;
    };
    const under = (el, s) => {
      for (let e = el; e; e = e.parentElement) if (s.has(e)) return true;
      return false;
    };
    const st = document.createElement("style");
    st.textContent = "html,body{scroll-behavior:auto !important}";
    document.head.appendChild(st);
    try {
      const main = document.querySelector("main") || document.body;
      const secs = [...main.children].filter(
        e => !/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT)$/.test(e.tagName) && vis(e) && e.getBoundingClientRect().height >= 160,
      );
      const secSet = new Set(secs),
        cardRe = /card|tile|tier|plan|feature|room|item|panel|box/i;
      let cards = [];
      for (const e of main.querySelectorAll("*")) {
        if (
          e instanceof SVGElement
          || secSet.has(e)
          || /^(SCRIPT|STYLE|SPAN|P|H[1-6]|IMG|CANVAS|BUTTON|INPUT|PICTURE|VIDEO)$/.test(e.tagName)
        )
          continue;
        const r = e.getBoundingClientRect();
        if (r.width < 140 || r.height < 80 || r.width > W * 0.92 || r.height > H * 1.2 || !boxed(e) || !vis(e))
          continue;
        const cls = typeof e.className === "string" ? e.className : "";
        const sibs =
          e.parentElement ?
            [...e.parentElement.children].filter(k => k !== e && k.tagName === e.tagName && k.className === e.className)
          : [];
        if (cardRe.test(cls) || sibs.length >= 1) cards.push(e);
      }
      cards = cards.filter(c => !cards.some(x => x !== c && x.contains(c))).slice(0, 80);
      const frames = [...main.querySelectorAll("img,canvas,svg,video")]
        .filter(e => {
          const r = e.getBoundingClientRect();
          return r.width >= 120 && r.height >= 80 && vis(e) && !(e.parentElement && e.parentElement.closest("svg"));
        })
        .slice(0, 40);
      // a dealt moment's section ([data-moment], or a section holding one) follows the scroll by design: the moment itself is
      // judged by its id against the page's kind
      // (2.5.2: a dealt big scene's section too, on every kind it fits)
      const momentSecs = secs.filter(
        s =>
          s.matches("[data-moment][data-moment-mounted], [data-big-scene]")
          || s.querySelector("[data-moment][data-moment-mounted], [data-big-scene]"),
      );
      const inMoment = e =>
        !!e.closest("[data-moment][data-moment-mounted], [data-big-scene]") || momentSecs.some(s => s.contains(e));
      const linked = [...secs, ...cards, ...frames].filter(e => !fixedLike(e) && !inMoment(e));
      const dev = new Map(),
        docs = new Map();
      const maxY = Math.max(0, document.scrollingElement.scrollHeight - H),
        step = Math.round(H * 0.7);
      for (let y = 0; ; y += step) {
        const yy = Math.min(y, maxY);
        scrollTo({ top: yy, left: 0, behavior: "instant" });
        await wait(o.settle || 400);
        if (yy + 100 <= maxY) {
          const y0 = scrollY,
            a = new Map(linked.map(e => [e, e.getBoundingClientRect()]));
          scrollTo({ top: yy + 100, left: 0, behavior: "instant" });
          await wait(170);
          const dy = scrollY - y0,
            now = running();
          if (dy >= 50)
            for (const e of linked) {
              const r = e.getBoundingClientRect(),
                r0 = a.get(e);
              if (!(r0.top < H && r0.bottom > 0) || under(e, now)) continue;
              const d = Math.abs(r.top - r0.top + dy);
              if (d > 4) {
                dev.set(e, Math.max(dev.get(e) || 0, Math.round(d)));
                if (!docs.has(e))
                  docs.set(e, {
                    left: Math.round(Math.max(0, r.left)),
                    top: Math.round(r.top + scrollY),
                    width: Math.round(Math.min(W, r.right) - Math.max(0, r.left)),
                    height: Math.round(r.height),
                  });
              }
            }
        }
        if (yy >= maxY) break;
      }
      return [...dev]
        .map(([e, d]) => ({
          kind: secSet.has(e) ? "section" : "frame-or-card",
          sel: sel(e),
          devPx: d,
          doc: docs.get(e),
        }))
        .sort((a, b) => (a.kind === "section" ? 0 : 1) - (b.kind === "section" ? 0 : 1))
        .slice(0, 30);
    } finally {
      st.remove();
    }
  }
  const call = (fn, arg) => `(${fn.toString()})(${JSON.stringify(arg ?? null)})`;

  // ---------------------------------------------------------------- Node side
  const q = (s, n = 40) => `"${String(s || "").slice(0, n)}${String(s || "").length > n ? "..." : ""}"`;
  const pct = v => `${Math.round(v * 1000) / 10}%`;
  // a page-coordinate box on the walked screen that shows most of it, with a second box (what it is measured against) on
  // the same screen, dashed; a part with no box on the page (off screen, no size) is told without a crop
  function put(ctx, f, d, ref) {
    if (!d) return Object.assign(f, { stop: null, rects: [] });
    const p = ctx.place(d);
    if (p.stop == null || !ref) return Object.assign(f, p);
    const y = ctx.stopY[p.stop],
      top = Math.max(0, ref.top - y),
      bottom = Math.min(ctx.vh, ref.top + ref.height - y);
    return Object.assign(f, {
      stop: p.stop,
      rects:
        bottom - top >= 2 ?
          [...p.rects, { left: ref.left, top, width: ref.width, height: bottom - top, ref: true }]
        : p.rects,
    });
  }
  // a fault on many parts of one check: FAILs first, eight told, the others named in the eighth
  function capped(list, name) {
    const sorted = [...list.filter(f => f.sev === "FAIL"), ...list.filter(f => f.sev !== "FAIL")],
      told = sorted.slice(0, 8);
    if (sorted.length > 8)
      told[7].msg += ` (and ${sorted.length - 8} more like it: ${sorted.slice(8, 12).map(name).join(", ")}${sorted.length > 12 ? ", ..." : ""})`;
    return told;
  }

  // visual-caption: the caption lines round each visual
  function captionFindings(ctx, P) {
    const words = {
      figcaption: c => `a figcaption under the ${c.what}`,
      "caption-class": c => `a line marked as a caption sits ${c.gap}px under the ${c.what} (its class names it one)`,
      "caption-phrase": c => `a line about the picture sits ${c.gap}px under the ${c.what} (a caption phrase)`,
      "caption-line": c =>
        `a muted ${c.fs}px line of ${c.rows} row${c.rows > 1 ? "s" : ""} sits ${c.gap}px under the ${c.what}: it reads as a caption`,
      "caption-above": c => `a caption-like line of ${c.fs}px sits ${c.gap}px over the ${c.what}`,
      "overlay-caption": c => `a small ${c.fs}px line is laid over the lower half of the ${c.what}`,
    };
    const L = P.captions.map(c =>
      put(
        ctx,
        {
          check: "visual-caption",
          sev: c.sev,
          id: 0,
          sel: c.sel,
          text: c.text.slice(0, 48),
          msg: `${words[c.kind](c)}: ${q(c.text)}; no caption or description under any image, render or visual (house rule)`,
        },
        c.doc,
        c.vdoc,
      ),
    );
    return capped(L, f => q(f.text, 20));
  }

  // visual-empty: each visual shot on a screen that shows it, its colours and detail counted
  async function emptyFindings(ctx, P, broken) {
    const tab = ctx.tab,
      vh = P.H,
      maxY = P.maxScroll;
    const brokenSel = new Set(broken.map(b => b.sel));
    // at a later width a picture, drawing or background that was rich at the first width is not shot again
    const again = c => ctx.first || rich.url !== ctx.url || !rich.sels.has(c.kind + "|" + c.sel);
    const todo = P.cands.filter(c => c.doc && !brokenSel.has(c.sel));
    const want = todo
      .filter(again)
      .map(c => ({
        c,
        y: Math.round(
          Math.max(0, Math.min(maxY, c.doc.height <= vh * 0.9 ? c.doc.top - (vh - c.doc.height) / 2 : c.doc.top - 8)),
        ),
      }))
      .sort((a, b) => a.y - b.y);
    // one screen for the visuals that fit on it whole (a visual taller than the screen gets its own)
    const screens = [];
    for (const w of want) {
      const s = screens[screens.length - 1],
        d = w.c.doc;
      if (s && d.height <= vh * 0.9 && d.top >= s.y && d.top + d.height <= s.y + vh) s.list.push(w.c);
      else screens.push({ y: w.y, list: [w.c] });
    }
    const go = y =>
      tab.eval(
        `window.__cc && window.__cc.scrollTo ? window.__cc.scrollTo(${y}) : (scrollTo({ top: ${y}, left: 0, behavior: 'instant' }), Math.round(scrollY))`,
      );
    const shoot = async cl => {
      const { data } = await tab.send(
        "Page.captureScreenshot",
        { format: "png", clip: { x: cl.x, y: cl.y, width: cl.w, height: cl.h, scale: 0.5 } },
        45000,
      );
      return colourStats(decodePng(Buffer.from(data, "base64")));
    };
    const F = [];
    let sampled = 0;
    for (const s of screens) {
      await go(s.y);
      const clips =
        (await ctx.safe("visual-empty", () => tab.eval(call(clipsProbe, { idx: s.list.map(c => c.i) })))) || [];
      await ctx.sleep(700);
      const res = [];
      for (const [k, c] of s.list.entries()) {
        const cl = clips[k];
        if (!cl || cl.w < 20 || cl.h < 20) continue;
        const st = await ctx.safe("visual-empty", () => shoot(cl));
        if (st) {
          res.push({ c, cl, st });
          sampled++;
        }
      }
      // slow software WebGL, fade-ins and a picture still decoding get a second look, 1.3 s later
      if (res.some(r => lookAgain(r.st))) {
        await ctx.sleep(1300);
        for (const r of res)
          if (lookAgain(r.st)) {
            const st = await ctx.safe("visual-empty", () => shoot(r.cl));
            if (st) r.st = st;
          }
      }
      if (ctx.first)
        for (const r of res)
          if (/^(img|svg|bg)$/.test(r.c.kind) && r.st.distinct >= RICH && r.st.detail >= SMOOTH_MAX)
            rich.sels.add(r.c.kind + "|" + r.c.sel);
      for (const r of res)
        if (r.c.unmounted && r.c.unmounted.length && flatVerdict(r.st, r.c.kind) === "PASS") r.unmounted = true;
      const bad = res.filter(r => r.unmounted || flatVerdict(r.st, r.c.kind) !== "PASS");
      if (!bad.length) continue;
      const shot = await ctx.safe("visual-empty", () => tab.shot());
      const stop = shot ? ctx.addShot(shot) : null;
      for (const { c, cl, st, unmounted } of bad) {
        if (unmounted) {
          const u = c.unmounted,
            dia = u.some(x => x.attr === "data-diagram");
          const f = {
            check: "visual-empty",
            sev: dia ? "FAIL" : "WARN",
            id: 0,
            sel: u[0].sel,
            text: c.what.slice(0, 48),
            msg: `${u.map(x => `${x.attr} ${x.sel.split(" > ").pop()}`).join(", ")} holds no canvas, svg or picture at ${ctx.width}px: its ${dia ? "diagram" : "scene"} never drew (its script or stylesheet did not load, or it threw), so the card shows only its ground`,
          };
          if (stop != null) Object.assign(f, { stop, rects: [cl.rect] });
          else put(ctx, f, c.doc);
          F.push(f);
          continue;
        }
        const verdict = flatVerdict(st, c.kind);
        const why =
          c.refused ?
            "the checker refused its WebGL context past its cap of 4, so this is its fallback"
          : c.held || (c.moving ? "it is mid-animation" : "");
        const sev = verdict === "FAIL" && why ? "WARN" : verdict;
        const part = cl.full < 100 ? ` (${cl.full}% of it on screen)` : "";
        const seen = `${st.distinct} colour${st.distinct === 1 ? "" : "s"} in its ${c.w}x${c.h}px, ${pct(st.dominant)} one colour${part}`;
        const msg =
          st.distinct >= 6 ?
            `the ${c.what} is only a smooth gradient at ${ctx.width}px: ${st.distinct} colours but almost no detail (${pct(st.detail)} of its pixels differ from the next one)${part}, a ground with nothing on it where the visual should be${why ? `; ${why}` : ""}`
          : verdict === "FAIL" ?
            `the ${c.what} shows nothing at ${ctx.width}px: ${seen}, an empty ground or frame where the visual should be${why ? `; ${why}` : ""}`
          : `the ${c.what} is nearly empty at ${ctx.width}px: ${seen} (a thin line drawing or a logo can be this plain: look at it)${why ? `; ${why}` : ""}`;
        const f = { check: "visual-empty", sev, id: 0, sel: c.sel, text: c.what.slice(0, 48), msg };
        if (stop != null) Object.assign(f, { stop, rects: [cl.rect] });
        else put(ctx, f, c.doc);
        F.push(f);
      }
    }
    ctx.log(
      `${P.cands.length} visuals, ${todo.length - want.length} rich at the first width not shot again, ${screens.length} screens, ${sampled} shot, ${F.length} flagged`,
    );
    const B = broken.map(b =>
      put(
        ctx,
        {
          check: "visual-empty",
          sev: "FAIL",
          id: 0,
          sel: b.sel,
          text: b.file || "",
          msg:
            b.bg ? `the background picture ${b.file || b.src} failed to load: the frame shows only its ground`
            : b.why === "no source" ? "the picture has no source: its frame shows empty"
            : b.why === "loading" ?
              `the picture ${b.file} has still not loaded after the page was walked: its frame shows empty`
            : `the picture ${b.file || b.src} is broken (it loaded nothing): its frame shows empty`,
        },
        b.doc,
      ),
    );
    return capped([...B, ...F], f => f.text || f.sel);
  }

  // the page's kind (pages declare it with site-kind and page-type; taste-kind is an alias only):
  // --type; else <meta name="page-type">, <html data-type> or <meta name="page-kind" content="place"> naming place,
  // product or service (each read on its own, so a wrong value in one does not hide the next); else <meta
  // name="site-kind"> naming tech, software or gaming; else a page type naming one of those (page-type software with
  // site-kind other); else <meta name="taste-kind">; else the type read from the title. A product is technical with
  // --tech-subject or a site-kind of tech, software or gaming (ST-61, MO-02)
  function kindFrom(ctx, K) {
    const low = v =>
      String(v || "")
        .trim()
        .toLowerCase();
    const norm = v => {
      v = low(v);
      if (!v) return "";
      if (v in KIND_ALIAS) return KIND_ALIAS[v] || "";
      return NO_EFFECT.has(v) || EFFECT_OK.has(v) ? v : null;
    };
    const bad = (v, from) =>
      ctx.errors.push(
        `effect-kind: the kind "${v}" (${from}) is none of place, product, service, tech, gaming, software`,
      );
    const flag = ctx.typeFlag !== undefined ? ctx.typeFlag : ctx.type,
      titled = ctx.typeFlag !== undefined ? ctx.type : "";
    const site = low(K.siteKind),
      siteK = norm(site),
      siteFx = EFFECT_OK.has(siteK) ? siteK : "";
    const techFlag = !!(ctx.flags && ctx.flags["tech-subject"]);
    const out = (kind, from) => ({ kind, from, tech: kind === "product" && (techFlag || !!siteFx) });
    const f = norm(flag);
    if (f === null) bad(flag, "--type");
    else if (f) return out(f, "--type");
    if (siteK === null) bad(site, '<meta name="site-kind">');
    // every mark is read (and a wrong one told) before one is chosen
    const marks = [
      [K.pageType, '<meta name="page-type">'],
      [K.dataType, "<html data-type>"],
      [K.pageKind === "place" ? "place" : "", '<meta name="page-kind">'],
    ].map(([v, from]) => ({ v, from, k: norm(v) }));
    for (const m of marks) if (m.k === null) bad(m.v, m.from);
    const typed = marks.find(m => NO_EFFECT.has(m.k)),
      named = marks.find(m => EFFECT_OK.has(m.k));
    if (typed) return out(typed.k, site ? `${typed.from} with <meta name="site-kind" content="${site}">` : typed.from);
    if (siteFx) return out(siteFx, `<meta name="site-kind">${named ? ` (${named.from} says ${named.k})` : ""}`);
    if (named) return out(named.k, named.from);
    const t = norm(K.taste);
    if (t === null) bad(K.taste, '<meta name="taste-kind">');
    else if (t) return out(t, '<meta name="taste-kind">, an alias');
    const ti = norm(titled);
    if (ti) return out(ti, "read from the title");
    return { kind: "", from: "", tech: false };
  }

  // effect-kind, once a page: the kind, the effect signs in the files, the particle rate and the drift walk (first width)
  async function pageEffects(ctx, scan, K) {
    const { kind, from, tech } = kindFrom(ctx, K);
    const S = {
      url: ctx.url,
      kind,
      from,
      tech,
      told: new Set(),
      max: {
        guard: false,
        created: 0,
        asked: 0,
        peak: 0,
        at: [],
        big: 0,
        outsidePrint: 0,
        dataFx: 0,
        dataScene: 0,
        dataPrint: 0,
        dataMoment: 0,
        bigScene: 0,
        fxBeside: 0,
        printObjects: [],
      },
    };
    if (!kind) {
      ctx.log("no kind given or marked: effects are not judged");
      return S;
    }
    S.sig = effectSignals(scan);
    S.rate = (await ctx.safe("effect-kind particle rate", () => ctx.tab.eval(call(particleProbe), 15000))) || 0;
    S.linked =
      ctx.quick ?
        []
      : (await ctx.safe("effect-kind drift walk", () => ctx.tab.eval(call(driftProbe, { settle: 400 }), 180000))) || [];
    return S;
  }

  // effect-kind, at every width: this width's WebGL and mount counts kept with the largest seen so far, judged by the
  // rules; what was told at an earlier width is not told again
  function effectFindings(ctx, K) {
    const S = pageFx,
      M = S.max,
      G = K.gl;
    if (G) {
      M.guard = true;
      for (const k of ["created", "asked", "big", "outsidePrint"]) M[k] = Math.max(M[k], G[k] || 0);
      if ((G.peak || 0) > M.peak) {
        M.peak = G.peak;
        M.at = G.at || [];
      }
    }
    for (const k of ["dataFx", "dataScene", "dataPrint", "dataMoment", "bigScene", "fxBeside"])
      M[k] = Math.max(M[k] || 0, K[k] || 0);
    if ((K.printObjects || []).length > M.printObjects.length) M.printObjects = K.printObjects;
    const { kind, from, tech, sig, rate, linked } = S;
    const noEffect = NO_EFFECT.has(kind) && !(kind === "product" && tech);
    const linkedSections = linked.filter(x => x.kind === "section");
    // a product's own object render (print-<kind>, effect render) is its picture (PH-04 says a
    // non-technical product never uses one)
    // the [data-product] frames (id print-product) are pictures of the product, as many as the page has views of it: never
    // counted as prints or effect parts; the page's data-print objects are the ones counted
    const productFrames = M.printObjects.filter(p => p.id === "print-product"),
      printObjs = M.printObjects.filter(p => p.id !== "print-product");
    const own =
      kind === "product" && !tech ?
        printObjs.filter(p => /^print-[\w-]+$/.test(p.id) && p.effect === "render").slice(0, 2)
      : [];
    const objRender = own.length > 0 || (kind === "product" && !tech && productFrames.length > 0);
    const fxMounts = Math.max(sig.dataFx, M.dataFx),
      sceneTags = Math.max(sig.dataScene, M.dataScene),
      printTags = Math.max(sig.dataPrint, M.dataPrint);
    const prints =
      objRender ?
        Math.max(printObjs.length - own.length, sig.photoObjects.length)
      : Math.max(printTags, sig.photoObjects.length);
    // a big scene: a data-scene or data-print mount, or a large WebGL canvas that is no data-fx ground (the larger
    // count); on a no-effect page the prints are told on their own
    const scenes = Math.max(sceneTags + printTags, M.guard ? M.big : 0),
      scenesNo = Math.max(sceneTags, M.guard ? M.big : 0);
    const momentsTag = Math.max(sig.dataMoment, M.dataMoment),
      scrollMoments = momentsTag + linkedSections.length;
    const particles = sig.particleLibs.length > 0 || rate >= 300;
    const gl =
      objRender ?
        M.guard ?
          M.outsidePrint
        : 0
      : M.guard ? M.created
      : sig.shaderStrings ? 1
      : 0;
    const any = gl > 0 || fxMounts || scenesNo || scrollMoments || sig.scrollStrong.length;
    const page = `a ${kind} page (${from})`,
      later = ctx.first ? "" : ` (first seen at ${ctx.width}px)`;
    const F = [];
    const add = (key, sev, msg, fix, at) => {
      if (S.told.has(key)) return;
      S.told.add(key);
      const f = { check: "effect-kind", sev, id: 0, sel: at ? at.sel : "(the page)", text: "", msg: msg + later };
      if (fix) f.fix = fix;
      put(ctx, f, at && at.doc);
      F.push(f);
    };
    ctx.log(
      `kind ${kind} (${from})${tech ? ", technical subject" : ""}: webgl ${gl} (peak ${M.peak}), mounts ${fxMounts}, scenes ${noEffect ? scenesNo : scenes}, prints ${prints}, moments ${scrollMoments}, particles ${rate}/s, drifting ${linked.length}`,
    );
    // on every kind: a [data-moment] counts as a moment only when moments.js mounted it (data-moment-mounted, its own
    // moment.js fetched); one that never runs is a mark, not a moment (the sections it would excuse are judged as plain
    // sections), and a page holds two moments at most (moments.md)
    {
      const all = K.moments || [],
        top = all.filter(m => !m.nested);
      const dead = all.filter(m => m.nested || m.failed || !m.mounted || !m.loaded);
      if (dead.length)
        add(
          "moment-dead",
          "FAIL",
          `${dead.length} [data-moment] mark${dead.length > 1 ? "s" : ""} that never run${dead.length > 1 ? "" : "s"}: ${dead
            .slice(0, 3)
            .map(
              m =>
                `${m.id || "(no id)"} on ${m.sel} (${
                  m.nested ? "inside another moment"
                  : m.failed ? `failed: ${m.failed}`
                  : !m.loaded ? `assets/moments/${m.id}/moment.js was never loaded`
                  : "moments.js never mounted it"
                })`,
            )
            .join("; ")}; a moment is judged as one only when it runs`,
          "load assets/moments/moments.js (system.js does it for a page with [data-moment]) and keep the dealt id, or take the data-moment mark off the section",
          { sel: dead[0].sel, doc: null },
        );
      if (top.length > 3)
        add(
          "moment-count",
          "FAIL",
          `${top.length} moments on one page (${top
            .map(m => m.id)
            .slice(0, 5)
            .join(", ")}): three at most on every kind (moments.md)`,
          "keep the two or three moments the deal gave and let the other sections scroll plainly",
          { sel: top[3].sel, doc: null },
        );
      // a retired moment, or one dealt to none of the effect kinds, is off on a tech, gaming or software page as well
      if (!noEffect) {
        const fitsTech = m =>
          momentFits(m, kind) || (kind === "product" && ["tech", "software"].some(x => momentFits(m, x)));
        const off = all.filter(m => !fitsTech(m));
        if (off.length)
          add(
            "moment",
            "FAIL",
            `${off.length} moment${off.length > 1 ? "s" : ""} not dealt to a ${kind} page (${[...new Set(off.map(m => m.id + (m.look ? ` look ${m.look}` : "")))].slice(0, 4).join(", ")}): retired, unknown, or dealt to other kinds only (assets/moments/index.json)`,
            `deal the moment again for this kind (moments.mjs pick --page ${kind})`,
            { sel: off[0].sel, doc: null },
          );
      }
    }
    // on every kind (2.5.1, motion.md): the hero enters once on load ([data-enter] and the head line that sets html.m-enter),
    // and the page carries one dealt moment, two on a long page; a missing one is a WARN, never a FAIL
    if (
      ctx.first
      && K.enter
      && K.enter.hero
      && !K.enter.scene
      && !(K.enter.data && K.enter.head)
      && !S.told.has("hero-enter")
    ) {
      S.told.add("hero-enter");
      const f = {
        check: "hero-enter",
        sev: "WARN",
        id: 0,
        sel: K.enter.hero.sel,
        text: "",
        msg: `the hero does not enter on load: ${[!K.enter.data && "no data-enter on the hero", !K.enter.head && "no head line setting html.m-enter"].filter(Boolean).join(" and ")} (motion.md, The hero's entrance)`,
        fix: "put data-enter on the hero <section> and keep the head line from starter.html that sets html.m-enter",
      };
      put(ctx, f, K.enter.hero.doc);
      F.push(f);
    }
    // its own id (not effect-kind, which reads as "take an effect off"); a WARN here, a FAIL at the gate
    if (ctx.first && !(K.moments || []).length && !momentsTag && !S.told.has("moment-none")) {
      S.told.add("moment-none");
      const f = {
        check: "moment-none",
        sev: "WARN",
        id: 0,
        sel: "(the page)",
        text: "",
        msg: `${page} deals no moment: every kind carries two, three on a long page (moments.md)`,
        fix: `deal them (start.mjs plan, or moments.mjs pick --page ${kind} --scene deal) and mount each in its own section`,
      };
      put(ctx, f);
      F.push(f);
    }
    if (noEffect) {
      const why = `${kind === "product" ? ' (a product with a technical subject: pass --tech-subject or mark <meta name="site-kind" content="tech">)' : ""}: ${KIND_RULE}`;
      if (objRender)
        ctx.log(
          `the product's own render (${[...own.map(p => p.id), ...(productFrames.length ? [`${productFrames.length} [data-product] frame${productFrames.length > 1 ? "s" : ""}`] : [])].join(", ")}) is its picture`,
        );
      // 2.5.2: one quiet treatment (one WebGL context) and a big scene that fits the kind are allowed here
      const fxIds = K.fxIds || [],
        treat = fxIds.length === 1 && isTreatment(fxIds[0]) ? 1 : 0;
      const fitScenes = (K.bigIds || []).filter(id => sceneFitsKind(id, kind)).length;
      if (treat) ctx.log(`the quiet treatment ${fxIds[0]} is allowed on ${page}`);
      if (fitScenes)
        ctx.log(
          `${fitScenes} big scene${fitScenes > 1 ? "s" : ""} that fit${fitScenes > 1 ? "" : "s"} ${page} (${(K.bigIds || []).join(", ")})`,
        );
      const glOver = gl - treat,
        fxOver = fxMounts - treat,
        scenesOver = Math.max(0, scenesNo - fitScenes);
      if (glOver > 0)
        add(
          "gl",
          "FAIL",
          `${page} ${M.guard ? `asks for ${gl} WebGL context${gl > 1 ? "s" : ""}${objRender ? " outside its object render" : ""}${M.at.length ? ` (${[...new Set(M.at)].slice(0, 4).join(", ")})` : ""}` : "loads shader code"}${sig.shaderStrings ? ` and ships ${sig.shaderStrings} shader source${sig.shaderStrings > 1 ? "s" : ""}` : ""}${treat ? " beyond its one quiet treatment" : ""}${why}`,
          null,
          K.canvas,
        );
      if (fxOver > 0 || scenesOver || prints)
        add(
          "parts",
          "FAIL",
          `${page} has effect parts: ${[fxOver > 0 && `${fxMounts} data-fx${fxIds.length ? ` (${fxIds.slice(0, 3).join(", ")})` : ""}`, scenesOver && `${scenesOver} scene${scenesOver > 1 ? "s" : ""} that do${scenesOver > 1 ? "" : "es"} not fit the kind (${(K.bigIds || []).join(", ") || "data-scene"})`, prints && (sig.photoObjects.length ? `the photo print object${sig.photoObjects.length > 1 ? "s" : ""} ${sig.photoObjects.join(", ")}` : `${prints} data-print`)].filter(Boolean).join(", ")}${why}`,
          null,
          K.mount,
        );
      // a dealt moment of this kind (photo-chapters, pinned-chapters, picture-develops in its film look, word-highlight on a
      // place, product or service) is the page's one or two moments; one off its kind, and a data-scroll-moment, are effects
      const offKind = (K.moments || []).filter(m => !momentFits(m, kind)),
        scrollTags = Math.max(0, momentsTag - (K.moments || []).length);
      if (offKind.length || scrollTags)
        add(
          "moment",
          "FAIL",
          `${page} has ${[offKind.length && `${offKind.length} moment${offKind.length > 1 ? "s" : ""} dealt to other kinds only (${[...new Set(offKind.map(m => m.id + (m.look ? ` look ${m.look}` : "")))].slice(0, 4).join(", ")})`, scrollTags && `${scrollTags} data-scroll-moment`].filter(Boolean).join(" and ")}${why}`,
          `deal the moment again for this kind (moments.mjs pick --page ${kind} --photo): photographs and type, no shader, liquid or pointer effect`,
          offKind.length ? { sel: offKind[0].sel, doc: null } : K.moment,
        );
      if (particles)
        add(
          "particles",
          "FAIL",
          `${page} draws particles: ${[sig.particleLibs.length && `particle code (${sig.particleLibs.slice(0, 3).join(", ")})`, rate >= 300 && `${rate} canvas 2D shapes a second`].filter(Boolean).join(", ")}${why}`,
          null,
          K.canvas,
        );
      if (sig.scrollStrong.length || linked.length)
        add(
          "scroll",
          "FAIL",
          `${page} moves with the scroll: ${sig.scrollStrong.length ? `scroll libraries or timelines (${sig.scrollStrong.join(", ")})` : ""}${sig.scrollStrong.length && linked.length ? "; " : ""}${
            linked.length ?
              `parts that drift off the scroll (parallax): ${linked
                .slice(0, 3)
                .map(x => `${x.sel} ${x.devPx}px`)
                .join("; ")}${linked.length > 3 ? ` and ${linked.length - 3} more` : ""}`
            : ""
          }${why}`,
          "take the scroll-driven motion off: on a place, shop or service page the page scrolls plainly and the parts sit still",
          linked[0],
        );
      if (sig.externalLibs.length)
        add(
          "libs",
          "WARN",
          `${page} loads effect libraries: ${sig.externalLibs
            .slice(0, 4)
            .map(u => u.replace(/^https?:\/\//, "").slice(0, 60))
            .join(", ")}; check each is wanted`,
          "drop the effect library unless the page needs it for something that is not an effect",
        );
    } else {
      const k = `a ${kind} page${kind === "product" ? " with a technical subject" : ""}`;
      if (M.guard && M.peak > 4)
        add(
          "peak",
          "WARN",
          `the page asks for ${M.peak} WebGL contexts live at once (${[...new Set(M.at)].slice(0, 5).join(", ")}): at most 4 on ${k} (house rule)`,
          "mount each effect when it comes on screen and destroy it off screen: at most 4 live WebGL contexts",
        );
      // the threshold is 16
      if (M.guard && M.created > 8)
        add(
          "created",
          "WARN",
          `the page creates ${M.created} WebGL contexts in all (released ones count too): the browser's limit is about 16`,
          "reuse one context per effect instead of making a new one each time it mounts",
        );
      // MO-16, MO-23: the big scene is the page's one effect: a second [data-big-scene], or a data-fx ground beside it (outside
      // the one or two scroll moments), FAILs; more big scenes or large WebGL canvases without those marks stay a WARN
      const bigTags = Math.max(sig.dataBigScene || 0, M.bigScene || 0);
      if (bigTags > 1)
        add(
          "scenes",
          "FAIL",
          `${bigTags} big scenes ([data-big-scene]) on ${k}: one at most (house rule; MO-23)`,
          "keep one big scene and turn the others into still pictures or the UI",
          K.mount,
        );
      else if (bigTags === 1 && (M.fxBeside || 0) > 0)
        add(
          "scenes",
          "FAIL",
          `a big scene and ${M.fxBeside} effect ground${M.fxBeside > 1 ? "s" : ""} (data-fx) beside it on ${k}: the big scene is the page's one effect (MO-16, MO-23); only the one or two scroll moments may hold their own`,
          "drop the data-fx ground (a plain or photographed ground in its place), or drop the big scene and keep the ground",
          K.mount,
        );
      else if (scenes > 1)
        add(
          "scenes",
          "WARN",
          `${scenes} big scenes on ${k} (data-big-scene or photo data-scene ${sceneTags}, data-print ${printTags}, large WebGL canvases that are no data-fx ground ${M.guard ? M.big : 0}): one is allowed (house rule)`,
          "keep one big scene and turn the others into still pictures or the UI",
          K.mount,
        );
      if (scrollMoments > 3)
        add(
          "moments",
          "WARN",
          `${scrollMoments} scroll-driven section moments on ${k} (data-scroll-moment or data-moment ${momentsTag}, sections moving with the scroll ${linkedSections.length}): two or three are allowed (house rule)`,
          "keep the two or three dealt moments and let the other sections scroll plainly",
          linkedSections[0] || K.moment,
        );
      if (any && !sig.reducedMotion)
        add(
          "reduced",
          "WARN",
          "the page has effects but no prefers-reduced-motion branch in its scripts or styles: reduced motion must show the finished still",
          "under prefers-reduced-motion: reduce, show each effect's finished still and stop its motion",
        );
      if (any && !sig.phoneHint)
        add(
          "phone",
          "WARN",
          "the page has effects but no phone, touch or max-width branch in its scripts: a phone needs the still or a light version",
          "give phones (max-width or pointer: coarse) the still or a lighter version of each effect",
        );
      if (particles)
        add(
          "particles",
          "WARN",
          `particle code or heavy canvas 2D drawing on ${k}${rate >= 300 ? ` (${rate} shapes a second)` : ""}: check it is a deliberate scene`,
          "keep particles to the one big scene, or take them off",
          K.canvas,
        );
    }
    return F;
  }

  async function run(ctx) {
    const tab = ctx.tab;
    if (ctx.first) {
      pageFx = null;
      rich = { url: ctx.url, sels: new Set() };
    }
    const y0 = await ctx.safe("visual probe", () => tab.eval("Math.round(scrollY)"));
    if (y0 == null) return [];
    const F = [];
    try {
      const P = await ctx.safe("visual probe", () => tab.eval(call(visualProbe, { first: ctx.first }), 60000));
      if (P) {
        if (P.overN)
          ctx.errors.push(
            `visual-empty: ${P.overN} visual${P.overN > 1 ? "s" : ""} past the first 40 not shot at ${ctx.width}px: ${P.over.join(", ")}${P.overN > P.over.length ? ", ..." : ""}`,
          );
        F.push(...captionFindings(ctx, P));
        const bad =
          (await ctx.safe("visual-empty", () =>
            tab.eval(
              call(
                bgProbe,
                P.bgUrls.map(x => ({ src: x.src, sel: x.sel, doc: x.doc })),
              ),
              60000,
            ),
          )) || [];
        const broken = [
          ...P.broken,
          ...bad.map(x => ({
            sel: x.sel,
            src: x.src.slice(0, 120),
            file: x.src.split(/[?#]/)[0].split("/").pop().slice(0, 44),
            why: "failed",
            bg: true,
            doc: x.doc,
          })),
        ];
        F.push(...((await ctx.safe("visual-empty", () => emptyFindings(ctx, P, broken))) || []));
      }
      // the effects: the files, the particle rate and the drift walk once a page, the WebGL and mount counts at every width
      const K = await ctx.safe("effect-kind", () => tab.eval(call(kindProbe), 30000));
      if (K && ctx.first) {
        const scan = await ctx.safe("effect-kind", () => staticScan(ctx.url, K.fetched));
        if (scan) {
          for (const m of scan.missing.filter(x => /\.(m?js|glsl|frag|vert)(?:[?#]|$)/i.test(x.ref)).slice(0, 3))
            ctx.errors.push(`effect-kind: could not read ${m.ref} (${m.error})`);
          if (scan.skipped.length)
            ctx.errors.push(
              `effect-kind: ${scan.skipped.length} file${scan.skipped.length > 1 ? "s" : ""} not read: ${scan.skipped
                .slice(0, 3)
                .map(x => `${x.ref.split(/[?#]/)[0].split("/").pop()} (${x.why})`)
                .join(", ")}${scan.skipped.length > 3 ? ", ..." : ""}`,
            );
          pageFx = await ctx.safe("effect-kind", () => pageEffects(ctx, scan, K));
        }
      }
      if (K && pageFx && pageFx.url === ctx.url && pageFx.kind)
        F.push(...((await ctx.safe("effect-kind", () => effectFindings(ctx, K))) || []));
    } finally {
      // the page as the walk left it: bars shown, the kept elements dropped, scrolled back
      await tab.eval(call(cleanupProbe)).catch(() => {});
      await tab
        .eval(
          `window.__cc && window.__cc.scrollTo ? window.__cc.scrollTo(${y0}) : (scrollTo({ top: ${y0}, left: 0, behavior: 'instant' }), 1)`,
        )
        .catch(() => {});
    }
    return F;
  }

  // proof without a browser that the lint fires (shader-lint tells these in consistency.mjs; this module keeps the
  // cases): a shader that uses flat as a struct field (it failed on a real GPU), with the legal qualifier uses that must
  // stay silent; returns true when every case behaved
  function selfTest(log = _line => {}) {
    const cases = [
      {
        name: "flat as a struct field",
        file: "js",
        src: "const FRAG = `precision mediump float;\nstruct Hit { float flat; vec3 n; };\nvoid main() { Hit h; h.flat = 1.0; gl_FragColor = vec4(vec3(h.flat), 1.0); }`",
        expect: ["flat"],
      },
      {
        name: "smooth as a local variable",
        file: "glsl",
        src: "void main() { float smooth = 0.5; gl_FragColor = vec4(smooth); }",
        expect: ["smooth"],
      },
      {
        name: "sample and filter as functions",
        file: "js",
        src: "const s = 'precision highp float; float sample(vec2 p) { return p.x; } float filter(float x) { return x; } void main() { gl_FragColor = vec4(sample(vec2(1.0)) + filter(1.0)); }'",
        expect: ["sample", "filter"],
      },
      {
        name: "flat qualifier is legal",
        file: "glsl",
        src: "#version 300 es\nprecision highp float;\nflat in vec3 vN;\nsmooth in vec2 vUv;\nlayout(location = 0) out vec4 outColor;\nvoid main() { outColor = vec4(vN, vUv.x); }",
        expect: [],
      },
      {
        name: "u_flat and flatten are other names",
        file: "js",
        src: "const f = `uniform float u_flat; float flatten(float x) { return x * u_flat; } void main() { gl_FragColor = vec4(flatten(1.0)); }`",
        expect: [],
      },
      {
        name: "a reserved word only in a comment",
        file: "glsl",
        src: "// the input flat colour\nvoid main() { gl_FragColor = vec4(1.0); }",
        expect: [],
      },
    ];
    let ok = true;
    for (const c of cases) {
      const shaders = extractShaders(c.src, c.file),
        hits = shaders.flatMap(s => lintGlsl(s.text)).map(h => h.word);
      const pass = shaders.length > 0 && c.expect.every(w => hits.includes(w)) && hits.every(w => c.expect.includes(w));
      if (!pass) ok = false;
      log(
        `${pass ? "ok  " : "FAIL"} ${c.name}: found ${hits.length ? [...new Set(hits)].join(", ") : "nothing"}, expected ${c.expect.length ? c.expect.join(", ") : "nothing"}`,
      );
    }
    // a reserved-word list is not a shader; a fragment without main() is found as a fragment
    const list = extractShaders(
      "const KW = words(`attribute const uniform varying layout centroid flat smooth in out inout volatile resource sampler2DRect`);",
      "js",
    );
    const frag = extractShaders(
      "frag = frag.replace('out vec4 o;', 'out vec4 o;\\nstruct Broken { float flat; };');",
      "js",
    );
    const v2 = [
      ["a reserved-word list is not scanned as a shader", list.length === 0],
      [
        "a fragment is found and has no main()",
        frag.length === 1 && !isWholeShader(frag[0].text) && lintGlsl(frag[0].text).some(h => h.word === "flat"),
      ],
    ];
    for (const [name, pass] of v2) {
      if (!pass) ok = false;
      log(`${pass ? "ok  " : "FAIL"} ${name}`);
    }
    return ok;
  }
  return { id, phase, checks, fixes, summary, flags, quick, run, selfTest };
})();
