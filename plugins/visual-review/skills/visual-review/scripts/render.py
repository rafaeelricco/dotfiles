#!/usr/bin/env python3
"""Render a visual-review findings JSON into a self-contained interactive .html.

Usage:  render.py <findings.json> <out.html>

Input JSON (produced by references/workflow.js):
    { "verdict": "pass"|"needs-attention",
      "summary": { "critical": n, "high": n, "medium": n, "low": n },
      "fileTree": [ { "path": str, "change": "added"|"modified"|"removed"|"renamed" } ],
      "findings": [ {
          "category", "severity", "summary", "failure_scenario", "file", "line",
          "hunk": { "before": str, "after": str },
          "suggested_fix": str|None, "wireframe_html": str|None, "verdict": "CONFIRMED"
      } ] }

The renderer is deterministic and owns all layout/CSS/JS. No external assets, no CDN.
"""
import html
import json
import re
import sys
from html.parser import HTMLParser

SEV_ORDER = ["critical", "high", "medium", "low"]
CATEGORIES = ["correctness", "security", "performance", "simplification", "api-contract", "tests"]
CHANGE_FLAG = {"added": "A", "modified": "M", "removed": "D", "renamed": "R"}
SECRET_PATTERNS = [
    (re.compile(r"\bsk-[A-Za-z0-9_-]{16,}\b"), "sk-•••"),
    (re.compile(r"\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}\b"), "gh-•••"),
    (re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b"), "xox-•••"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "AKIA•••"),
    (re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b"), "jwt-•••"),
    (re.compile(r"\b((?:api[_-]?key|token|secret|password|passwd|authorization)\s*[:=]\s*[\"']?)[^\"',\s}]{8,}", re.I), r"\1•••"),
]
ALLOWED_WIREFRAME_TAGS = {"article", "aside", "button", "div", "footer", "header", "label", "li", "main", "nav", "ol", "p", "section", "small", "span", "strong", "ul"}
ALLOWED_WIREFRAME_ATTRS = {"aria-label", "aria-hidden", "class", "disabled", "role", "title", "type"}


def redact_secrets(s):
    text = s if s is not None else ""
    for pattern, replacement in SECRET_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def esc(s):
    return html.escape(redact_secrets(s), quote=True)


class WireframeSanitizer(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag not in ALLOWED_WIREFRAME_TAGS:
            return
        safe_attrs = [
            (name.lower(), value)
            for name, value in attrs
            if name.lower() in ALLOWED_WIREFRAME_ATTRS and not name.lower().startswith("on")
        ]
        attr_text = "".join(' {}="{}"'.format(name, esc(value)) for name, value in safe_attrs)
        self.parts.append("<{}{}>".format(tag, attr_text))

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in ALLOWED_WIREFRAME_TAGS:
            self.parts.append("</{}>".format(tag))

    def handle_data(self, data):
        self.parts.append(esc(data))


def sanitize_wireframe_html(raw):
    parser = WireframeSanitizer()
    parser.feed(raw or "")
    parser.close()
    return "".join(parser.parts)


def code_pane(text, line_cls):
    lines = (text or "").split("\n")
    rows = "".join(
        '<div class="ln {c}">{t}</div>'.format(c=line_cls, t=esc(line) or "&nbsp;")
        for line in lines
    )
    return '<div class="pane">{}</div>'.format(rows)


def split_diff(hunk):
    hunk = hunk or {}
    before = code_pane(hunk.get("before", ""), "removed")
    after = code_pane(hunk.get("after", ""), "added")
    return (
        '<div class="diff">'
        '<div class="col"><div class="col-h">before</div>{b}</div>'
        '<div class="col"><div class="col-h">after</div>{a}</div>'
        "</div>"
    ).format(b=before, a=after)


def unified_diff(text):
    if not text:
        return ""
    rows = []
    for line in text.split("\n"):
        if line.startswith(("@@", "diff ", "index ")) or line.startswith("--- ") or line.startswith("+++ "):
            cls = "ctx"  # diff/hunk headers ("--- a/x", "+++ b/x", "@@") — not content;
            # the trailing space avoids misreading content lines like "-----" as a header
        elif line.startswith("+"):
            cls = "added"
        elif line.startswith("-"):
            cls = "removed"
        else:
            cls = "ctx"
        rows.append('<div class="ln {c}">{t}</div>'.format(c=cls, t=esc(line) or "&nbsp;"))
    return '<div class="pane">{}</div>'.format("".join(rows))


def finding_card(f, idx):
    cid = "card-{}".format(idx)
    sev = f.get("severity", "low")
    cat = f.get("category", "correctness")
    body = [
        '<p class="scenario"><strong>Failure scenario.</strong> {}</p>'.format(esc(f.get("failure_scenario"))),
        split_diff(f.get("hunk")),
    ]
    if f.get("suggested_fix"):
        body.append(
            '<div class="block"><div class="sub">Suggested fix '
            '<span class="muted">(not applied)</span></div>{}</div>'.format(unified_diff(f["suggested_fix"]))
        )
    wireframe_html = sanitize_wireframe_html(f.get("wireframe_html"))
    if wireframe_html:
        body.append(
            '<div class="block"><div class="sub">Affected UI</div>'
            '<div class="wf-frame">{}</div></div>'.format(wireframe_html)
        )
    return (
        '<section class="finding" id="{cid}" data-severity="{sev}" data-category="{cat}">'
        '<header class="finding-header">'
        '<span class="pill sev-{sev}">{sev}</span>'
        '<span class="chip-tag">{cat}</span>'
        '<span class="title">{summary}</span>'
        '<span class="loc">{file}:{line}</span>'
        '<span class="caret">▾</span>'
        "</header>"
        '<div class="finding-body">{body}</div>'
        "</section>"
    ).format(
        cid=cid,
        sev=esc(sev),
        cat=esc(cat),
        summary=esc(f.get("summary")),
        file=esc(f.get("file")),
        line=f.get("line", ""),
        body="".join(body),
    )


def count_badges(summary):
    """Non-interactive header tally (the sidebar owns filtering)."""
    badges = []
    for s in SEV_ORDER:
        badges.append(
            '<span class="badge sev-{s}">{n} {s}</span>'.format(s=s, n=summary.get(s, 0))
        )
    return "".join(badges)


def severity_chips(summary):
    chips = []
    for s in SEV_ORDER:
        n = summary.get(s, 0)
        chips.append(
            '<button class="chip sev-{s}" data-filter-type="severity" data-value="{s}">'
            '{s}<span class="n">{n}</span></button>'.format(s=s, n=n)
        )
    return "".join(chips)


def category_chips(findings):
    counts = {c: 0 for c in CATEGORIES}
    for f in findings:
        c = f.get("category")
        if c in counts:
            counts[c] += 1
    chips = []
    for c in CATEGORIES:
        chips.append(
            '<button class="chip cat" data-filter-type="category" data-value="{c}">'
            '{c}<span class="n">{n}</span></button>'.format(c=c, n=counts[c])
        )
    return "".join(chips)


def norm_path(p):
    """Normalize so tree paths and finding paths match despite a/ b/ ./ or leading-slash divergence."""
    p = (p or "").strip().lstrip("/")
    for pre in ("a/", "b/", "./"):
        if p.startswith(pre):
            p = p[len(pre):]
    return p


def file_tree(file_tree, findings):
    first = {}
    for i, f in enumerate(findings):
        first.setdefault(norm_path(f.get("file")), "card-{}".format(i))
    rows = []
    for entry in file_tree:
        path = entry.get("path", "")
        change = entry.get("change", "modified")
        flag = CHANGE_FLAG.get(change, "?")
        label = '<span class="flag flag-{ch}">{fl}</span> {p}'.format(ch=change, fl=flag, p=esc(path))
        key = norm_path(path)
        if key in first:
            rows.append('<li><a href="#{cid}">{label}</a></li>'.format(cid=first[key], label=label))
        else:
            rows.append('<li class="nofind">{label}</li>'.format(label=label))
    if not rows:
        rows.append('<li class="nofind">no files</li>')
    return "<ul class=\"tree\">{}</ul>".format("".join(rows))


def render(data):
    # `or` (not .get default) so an explicit null also falls back to the default.
    findings = data.get("findings") or []
    summary = data.get("summary") or {s: 0 for s in SEV_ORDER}
    verdict = data.get("verdict") or "pass"
    total = len(findings)

    verdict_label = "Needs attention" if verdict == "needs-attention" else "Pass"
    header = (
        '<div class="verdict v-{v}">{label}</div>'
        '<div class="counts">{badges}</div>'
    ).format(v=esc(verdict), label=verdict_label, badges=count_badges(summary))

    cards = "".join(finding_card(f, i) for i, f in enumerate(findings))
    if not cards:
        cards = '<p class="empty">No findings survived verification.</p>'

    return TEMPLATE.format(
        css=CSS,
        js=FILTER_JS,
        header=header,
        sev_chips=severity_chips(summary),
        cat_chips=category_chips(findings),
        tree=file_tree(data.get("fileTree") or [], findings),
        cards=cards,
        total=total,
    )


CSS = """
:root{--bg:#0f1115;--panel:#171a21;--ink:#e6e8ee;--mut:#8b93a7;--line:#262b36;
--add:#1f3a2b;--addln:#3fb950;--del:#3a1f24;--delln:#f85149;--ctx:#11141a;
--wf-bg:#10131a;--wf-line:#2a3140;--wf-ink:#c7cddb;
--critical:#f85149;--high:#ff8c42;--medium:#e3b341;--low:#58a6ff;}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
font:14px/1.5 ui-sans-serif,-apple-system,Segoe UI,Roboto,sans-serif;}
.wrap{max-width:1100px;margin:0 auto;padding:24px;}
header.top{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:18px;}
.verdict{font-weight:700;padding:6px 12px;border-radius:8px;}
.v-pass{background:#15301f;color:#3fb950;}
.v-needs-attention{background:#3a1f24;color:#f85149;}
.counts{display:flex;gap:8px;flex-wrap:wrap;}
.badge{font-size:12px;font-weight:600;padding:3px 9px;border-radius:999px;color:#0b0d11;}
.layout{display:grid;grid-template-columns:260px 1fr;gap:24px;align-items:start;}
.side{position:sticky;top:24px;}
.side h3{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);margin:0 0 8px;}
.filters{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px;}
.chip{cursor:pointer;border:1px solid var(--line);background:var(--panel);color:var(--ink);
border-radius:999px;padding:4px 10px;font-size:12px;display:inline-flex;gap:6px;align-items:center;}
.chip .n{color:var(--mut);font-variant-numeric:tabular-nums;}
.chip.off{opacity:.35;text-decoration:line-through;}
.chip.sev-critical{border-color:var(--critical);}
.chip.sev-high{border-color:var(--high);}
.chip.sev-medium{border-color:var(--medium);}
.chip.sev-low{border-color:var(--low);}
.tree{list-style:none;margin:0;padding:0;font-size:13px;}
.tree li{padding:3px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.tree a{color:var(--ink);text-decoration:none;}
.tree a:hover{text-decoration:underline;}
.tree li.nofind{color:var(--mut);}
.flag{display:inline-block;width:16px;text-align:center;border-radius:3px;font-size:11px;font-weight:700;margin-right:4px;}
.flag-added{background:var(--add);color:var(--addln);}
.flag-modified{background:#243; color:var(--medium);}
.flag-removed{background:var(--del);color:var(--delln);}
.flag-renamed{background:#222d3d;color:var(--low);}
.showing{color:var(--mut);font-size:12px;margin:0 0 12px;}
.finding{border:1px solid var(--line);border-radius:10px;background:var(--panel);margin-bottom:14px;overflow:hidden;}
.finding-header{display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;}
.finding-header:hover{background:#1b1f28;}
.pill{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:2px 8px;border-radius:6px;color:#0b0d11;}
.sev-critical{background:var(--critical);} .sev-high{background:var(--high);}
.sev-medium{background:var(--medium);} .sev-low{background:var(--low);}
.chip-tag{font-size:12px;color:var(--mut);border:1px solid var(--line);border-radius:6px;padding:2px 8px;}
.title{flex:1;font-weight:600;}
.loc{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--mut);}
.caret{color:var(--mut);transition:transform .15s;}
.finding.collapsed .finding-body{display:none;}
.finding.collapsed .caret{transform:rotate(-90deg);}
.finding-body{padding:0 14px 14px;border-top:1px solid var(--line);}
.scenario{color:var(--ink);}
.sub{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--mut);margin:14px 0 6px;}
.muted{color:var(--mut);text-transform:none;letter-spacing:0;}
.block{margin-top:6px;}
.diff{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;}
.col-h{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;}
.pane{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;
white-space:pre;overflow-x:auto;border:1px solid var(--line);border-radius:8px;background:var(--ctx);}
.ln{padding:1px 10px;}
.ln.added{background:var(--add);} .ln.removed{background:var(--del);}
.wf-frame{border:1px dashed var(--wf-line);border-radius:10px;background:var(--wf-bg);
color:var(--wf-ink);padding:16px;}
.empty{color:var(--mut);padding:40px;text-align:center;border:1px dashed var(--line);border-radius:10px;}
@media(max-width:820px){.layout{grid-template-columns:1fr;}.side{position:static;}.diff{grid-template-columns:1fr;}}
"""

FILTER_JS = """
const cards=[...document.querySelectorAll('.finding')];
const disabled={severity:new Set(),category:new Set()};
const shownEl=document.getElementById('shown');
function apply(){
  let shown=0;
  for(const c of cards){
    const vis=!disabled.severity.has(c.dataset.severity)&&!disabled.category.has(c.dataset.category);
    c.style.display=vis?'':'none'; if(vis)shown++;
  }
  if(shownEl)shownEl.textContent=shown;
}
document.querySelectorAll('.chip').forEach(chip=>{
  chip.addEventListener('click',()=>{
    const set=disabled[chip.dataset.filterType];const v=chip.dataset.value;
    if(set.has(v)){set.delete(v);chip.classList.remove('off');}
    else{set.add(v);chip.classList.add('off');}
    apply();
  });
});
document.querySelectorAll('.finding-header').forEach(h=>{
  h.addEventListener('click',()=>h.parentElement.classList.toggle('collapsed'));
});
function reveal(){
  const el=location.hash?document.querySelector(location.hash):null;
  if(el&&el.classList.contains('finding')){el.classList.remove('collapsed');el.style.display='';el.scrollIntoView({behavior:'smooth'});}
}
window.addEventListener('hashchange',reveal);
apply();reveal();
"""

TEMPLATE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Visual Review</title><style>{css}</style></head>
<body><div class="wrap">
<header class="top">{header}</header>
<div class="layout">
<aside class="side">
<h3>Filter</h3>
<div class="filters">{sev_chips}</div>
<div class="filters">{cat_chips}</div>
<h3>Files</h3>
{tree}
</aside>
<main>
<p class="showing"><span id="shown">{total}</span> of {total} findings shown</p>
{cards}
</main>
</div>
</div><script>{js}</script></body></html>
"""


def main():
    if len(sys.argv) != 3:
        sys.stderr.write("usage: render.py <findings.json> <out.html>\n")
        return 2
    src, out = sys.argv[1], sys.argv[2]
    with open(src, encoding="utf-8") as fh:
        data = json.load(fh)
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(render(data))
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
