# Record

Output: `<skill>/catalog/<name>/`. The name is `as <name>`, else the host without `www.` plus the
path as a slug (`https://www.raycast.com/keyboard` → `raycast-keyboard`). A name that exists:
ask before replacing it. Steps 2–4 only measure and shoot; every judgement is step 5.

## 1. Browser

Load the `browser-use` skill and start its dedicated Chrome (its Local Chrome section). With no
Chrome app installed, start the newest Playwright build the same way:

```bash
curl -fs -m 1 -o /dev/null http://127.0.0.1:9333/json/version ||
open -na "$(ls -d ~/Library/Caches/ms-playwright/chromium-*/chrome-*/"Google Chrome for Testing.app" | tail -1)" \
  --args --remote-debugging-port=9333 --user-data-dir="${XDG_CONFIG_HOME:-$HOME/.config}/browser-harness/chrome-profile" \
  --no-first-run --no-default-browser-check
```

A consent wall, a login or a bot check in the way: stop and say so. Never click through one.

## The header

Each step below is one `BU_CDP_URL=http://127.0.0.1:9333 browser-use <<'PY' … PY` call. Every
call is a new Python process, so each one starts with this header, filled in once per record:

```python
import base64, json, os
URL, D, P = "<url>", "<skill>/catalog/<name>", "<skill>/probe.js"

def at(W, H, prescroll=True):
    # A fresh tab at one viewport (the override belongs to the tab).
    # Bring it to the front: a background tab never advances its animations.
    new_tab(URL); activate_tab(current_tab()); wait_for_load()
    cdp("Emulation.setDeviceMetricsOverride", width=W, height=H, deviceScaleFactor=1, mobile=W < 600)
    cdp("Page.reload"); wait_for_load(); wait_for_network_idle()
    if prescroll:                                        # load lazy media and play reveals before measuring
        for y in range(0, page_info()["ph"], H): js(f"scrollTo(0,{y})"); wait(0.25)
    js("scrollTo(0,0)"); wait(1.5)                       # entrances replay at the top; let them finish

def probe():
    r = cdp("Runtime.evaluate", expression=open(P).read(), returnByValue=True, _response_timeout=60)
    return r["result"]["value"]

def save(rel, obj):
    os.makedirs(os.path.dirname(f"{D}/{rel}"), exist_ok=True)
    json.dump(obj, open(f"{D}/{rel}", "w"), indent=1)

def clip(rel, x, y, w, h):                               # page coordinates; cut at 2400 px tall
    os.makedirs(os.path.dirname(f"{D}/{rel}"), exist_ok=True)
    d = cdp("Page.captureScreenshot", format="png", captureBeyondViewport=True,
            clip=dict(x=x, y=y, width=w, height=min(h, 2400), scale=1), _response_timeout=60)["data"]
    open(f"{D}/{rel}", "wb").write(base64.b64decode(d))

def box(sel):                                            # an element's box now, in page coordinates
    return js(f"(()=>{{const r=document.querySelector({json.dumps(sel)}).getBoundingClientRect();"
              f"return {{y:r.top+scrollY,h:r.height}}}})()")
```

## 2. Sections, at 1440x900 and 390x844

```python
for W, H in ((1440, 900), (390, 844)):
    at(W, H)
    p = probe(); save(f"raw/probe-{W}.json", p)
    bar = p["layout"]["header"] or 0
    for s in p["sections"]:
        js(f"scrollTo(0,{max(0, s['y'] - bar)})"); wait(1.0)   # a fixed bar sits above the section
        r = box(s["sel"])                                      # scroll-linked layouts change once in view
        clip(f"sections/{s['i']:02d}@{W}.png", 0, r["y"], W, r["h"])
    js("scrollTo(0,0)"); wait(0.5); capture_screenshot(path=f"{D}/raw/page@{W}.png", full=True)
```

Sections whose count or order differs between the widths are matched by heading in step 5,
never by index alone.

## 3. Dark, at 1440

```python
at(1440, 900)
cdp("Emulation.setEmulatedMedia", media="", features=[{"name": "prefers-color-scheme", "value": "dark"}])
cdp("Page.reload"); wait_for_load(); wait_for_network_idle(); wait(1.5)
capture_screenshot(path=f"{D}/raw/dark@1440.png")
save("raw/probe-1440-dark.json", probe())
```

## 4. Motion, at 1440

```python
at(1440, 900, prescroll=False); H = 900                  # no pre-scroll: once-only reveals must play on camera
p = json.load(open(f"{D}/raw/probe-1440.json")); m = p["motion"]

# Entrance: reload at the top and shoot the first screen as it settles (no network wait:
# the entrance is over before the network goes quiet).
cdp("Page.reload"); wait(0.1); wait_for_load(); t0 = 0
for n, t in enumerate((0, 0.3, 0.7, 1.5), 1):
    wait(t - t0); t0 = t; clip(f"motion/entrance/{n:02d}.png", 0, 0, 1440, H)

# Hover: force :hover (a synthetic mouse move changes the style but not the screenshot).
cdp("DOM.enable"); cdp("CSS.enable")
doc = cdp("DOM.getDocument", depth=0)["root"]["nodeId"]
for n, t in enumerate(m["hover"], 1):
    js(f"scrollTo(0,{max(0, t['y'] - H // 2)})"); wait(0.5)
    b = (max(0, t["x"] - 16), t["y"] - 16, t["w"] + 32, t["h"] + 32)
    clip(f"motion/hover-{n}/01.png", *b)
    node = cdp("DOM.querySelector", nodeId=doc, selector=t["sel"])["nodeId"]
    cdp("CSS.forcePseudoState", nodeId=node, forcedPseudoClasses=["hover"]); wait(0.5)
    clip(f"motion/hover-{n}/02.png", *b)
    cdp("CSS.forcePseudoState", nodeId=node, forcedPseudoClasses=[])

# Scroll: each section holding an animation, a paint effect or a sticky element, each shot in a
# fresh tab with no pre-scroll so a once-only reveal plays on camera. Fixed bars are hidden while
# shooting (the record's only write to the page) so they cannot pass for motion; sticky elements
# inside a section stay. Frames 01-06 run from the section just below the screen to its last 40%
# on screen; then 07 goes back to 01's position and 08 to 04's (classify.md reads these).
fixed = [b for b in m["sticky"] if b["position"] == "fixed"]
moving = sorted({x["section"] for k in ("animations", "effects", "sticky") for x in m[k] if x["section"] is not None})
for i in moving:
    at(1440, H, prescroll=False)
    for b in fixed:
        js(f"(e=>e&&(e.style.visibility='hidden'))(document.querySelector({json.dumps(b['sel'])}))")
    s = p["sections"][i]
    start, end = max(0, s["y"] - H), min(page_info()["ph"] - H, s["y"] + s["h"] - 0.4 * H)
    ys = [start + (end - start) * k / 5 for k in range(6)]
    for n, y in enumerate(ys + [ys[0], ys[3]], 1):
        js(f"scrollTo(0,{int(y)})"); wait(0.6)
        r = box(s["sel"]); clip(f"motion/s{i:02d}-scroll/{n:02d}.png", 0, r["y"], 1440, r["h"])
```

Hover shows CSS `:hover` rules only; a hover run by script does not show and is not claimed.
A fixed or sticky element is recorded as `pin` from the probe's `sticky`. A shot that comes
back blank or cut wrong is taken again once; still wrong, it goes into `site.json` `problems`, as
does a section taller than 2400 px (its shots are cut there).

## 5. Write and check

Look at every screenshot before writing. Then, following `extract.md` and `classify.md`:

1. one `sections/NN-<type>.json` a section;
2. `design.json`;
3. one `motion/<id>.json` an effect, its `frames` from step 4;
4. `site.json`;
5. `review.md`;
6. the site's entry in `<skill>/catalog/catalog.json` (create the file when missing).

Check every file against its schema; the `browser-use` tool's Python ships `jsonschema`:

```bash
"$(uv tool dir)/browser-use/bin/python" - "<skill>" "<name>" <<'PY'
import glob, json, sys, jsonschema
skill, name = sys.argv[1:]; d = f"{skill}/catalog/{name}"
S = lambda n: jsonschema.Draft202012Validator(json.load(open(f"{skill}/schemas/{n}.schema.json")),
                                              format_checker=jsonschema.FormatChecker())
files = [("site", f"{d}/site.json"), ("design", f"{d}/design.json"), ("catalog", f"{skill}/catalog/catalog.json")]
files += [("section", f) for f in glob.glob(f"{d}/sections/*.json")] + [("motion", f) for f in glob.glob(f"{d}/motion/*.json")]
bad = [f"{f}: {list(e.path)} {e.message}" for n, f in files for e in S(n).iter_errors(json.load(open(f)))]
print("\n".join(bad) or f"{len(files)} files valid")
PY
```

Fix every error, then report the review path and every `null` with its `why`.
