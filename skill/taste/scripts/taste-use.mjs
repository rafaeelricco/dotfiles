// taste-use.mjs - a page dealt with a saved taste must carry it. Every finding is hard: no waiver, no taste override.
import { readTaste } from "./roots.mjs";

const NAME = /^[a-z0-9][a-z0-9-]{0,63}$/;
// the attribute that mounts each family's item on a page
const MOUNT = { moments: "data-moment", scenes: "data-big-scene", effects: "data-fx", ui: "data-ui" };
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
const noComments = t => t.replace(/<!--[\s\S]*?-->/g, "");
// the source without <template>…</template> (nested ones too): nothing in it is on the page
function noTemplates(t) {
  let out = "",
    depth = 0,
    at = 0;
  for (const m of t.matchAll(/<(\/?)template\b[^>]*>/gi)) {
    if (!m[1]) {
      if (!depth) out += t.slice(at, m.index);
      depth++;
    } else if (depth && !--depth) at = m.index + m[0].length;
  }
  return depth ? out : out + t.slice(at);
}
// the text of every <style> element
const styles = t => [...t.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map(m => m[1]);
// whitespace collapsed, quote characters normalised
const val = v =>
  v
    .replace(/[‘’“”`']/g, '"')
    .replace(/\s+/g, " ")
    .trim();
// every custom-property declaration of a stylesheet text: [name, value]
function decls(css) {
  const out = [];
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]*)/g)) {
    const v = val(m[2]);
    if (v) out.push([m[1], v]);
  }
  return out;
}

// html: the page source ("" or missing: nothing to read yet, so no findings); deal: .taste-skill/deal.json or null;
// kit: what `record.mjs kit <name>` prints; null or undefined when it was not asked for (taste-head is not checked),
// "" when printing it failed
export function tasteUse({ html, deal, kit }) {
  const name = typeof deal?.taste === "string" ? deal.taste.trim() : "";
  if (!name) return [];
  if (!String(html ?? "").trim()) return [];
  const page = noComments(String(html));
  const F = [];
  const hard = (check, where, msg, fix) => F.push({ check, where, msg, fix, hard: true });
  const where = `taste ${name}`;
  const live = noTemplates(page); // what the browser renders: no comments, no <template> contents

  // taste-missing: the page's <meta name="taste"> is absent or names another taste
  let named = null;
  for (const m of page.matchAll(/<meta\b[^>]*>/gi)) {
    const a = {};
    for (const x of m[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g))
      a[x[1].toLowerCase()] = x[2] ?? x[3] ?? x[4] ?? "";
    if ((a.name || "").trim().toLowerCase() === "taste") {
      named = (a.content || "").trim().toLowerCase();
      if (named === name.toLowerCase()) break;
    }
  }
  if (named !== name.toLowerCase()) {
    return [
      {
        check: "taste-missing",
        where,
        msg:
          named ?
            `the build was dealt with taste "${name}", but <meta name="taste"> names "${named}"`
          : `the build was dealt with taste "${name}", but the page has no <meta name="taste" content="${name}">`,
        fix: `print the head block again with record.mjs kit ${name} and paste it into the page's <head>`,
        hard: true,
      },
    ];
  }

  // taste-head: every custom property of kit's <style> block keeps its values on the page. A property may have
  // several values in the block (a dark variant): the page must declare each of them and none other.
  if (kit != null) {
    if (!String(kit).trim())
      hard(
        "taste-head",
        where,
        `the taste's head block could not be printed (record.mjs kit ${name} failed)`,
        `run node <ui skill>/scripts/record.mjs kit ${name} by hand and fix the taste file it names`,
      );
    else {
      const want = new Map(); // property → set of the kit's values
      for (const c of styles(noComments(String(kit))))
        for (const [n, v] of decls(c)) want.set(n, (want.get(n) || new Set()).add(v));
      const have = new Map(); // the same, from the page's <style> elements, for the kit's properties only
      for (const c of styles(live))
        for (const [n, v] of decls(c)) if (want.has(n)) have.set(n, (have.get(n) || new Set()).add(v));
      const bad = [];
      for (const [n, vs] of want) {
        const got = have.get(n) || new Set();
        if ([...vs].some(v => !got.has(v)) || [...got].some(v => !vs.has(v))) bad.push(n);
      }
      if (bad.length)
        hard(
          "taste-head",
          where,
          `the page's styles lack or change ${bad.length} custom ${bad.length > 1 ? "properties" : "property"} of the taste head block: ${bad.slice(0, 6).join(", ")}${bad.length > 6 ? ", …" : ""}`,
          `paste the record.mjs kit ${name} block unchanged and declare none of its properties again`,
        );
    }
  }

  // taste-signature: an item of taste.json "signature" has no mount on the page
  const sig = NAME.test(name) ? readTaste(name)?.signature : null;
  for (const item of Array.isArray(sig) ? sig : []) {
    if (typeof item !== "string") continue;
    const at = item.indexOf("/"),
      family = item.slice(0, at),
      id = item.slice(at + 1);
    const attr = MOUNT[family];
    if (at < 0 || !attr || !id) continue;
    if (new RegExp(`<[a-zA-Z][^>]*?\\s${attr}\\s*=\\s*["']?${reEsc(id)}(?![\\w-])`).test(live)) continue;
    hard(
      "taste-signature",
      `taste ${name} · ${family}/${id}`,
      `the taste's signature item ${family}/${id} has no [${attr}="${id}"] on the page`,
      `add the item's section from the pack (<ui skill>/tastes/${name}/assets/${family}/${id}/demo.html) and copy it with kit-copy.mjs --add ${family}/${id}`,
    );
  }
  return F;
}
