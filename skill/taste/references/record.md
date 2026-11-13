# Record

Output: `<skill>/catalog/<name>/`. The name is `as <name>`, else the host without `www.` plus the
path as a slug (`https://www.raycast.com/keyboard` → `raycast-keyboard`). A name that exists:
ask before replacing it. Steps 2–4 only measure and shoot; every judgement is step 5.

## 1. Browser

Discover browser tools and browser skills exposed by the current harness, including deferred
tools. Read their instructions before choosing a provider. Prefer native tools; load
`browser-use` only when native tools are absent, cannot capture the required evidence, or cannot
isolate this recording. Use only documented APIs permitted by the provider.

Confirm support for the operations below before capture: owned-page navigation, reload and
scroll; `probe.js` execution; viewport/DPR and media emulation; saved full-page screenshots and
document-coordinate clips; forced CSS hover; and timed frames. A screenshot-only tool is insufficient.

Create a recording-owned isolated context/session and retain its exact page handles. An incognito
context qualifies only when browser state and controller targeting are isolated; a window, tab
label, or session name alone is not proof. Bind every operation to owned handles, never a URL-only
lookup or a shared current tab. Attempt supported native isolation before falling back to
`browser-use` → **Isolated local sessions**. If neither can provide complete, isolated capture,
stop with the concrete missing capability.

Register each created resource immediately for cleanup: pages, contexts, sessions, controllers,
browser processes, and temporary profiles. Plan cleanup before creating resources, including
partial setup failures. Do not navigate, resize, activate, restart, or close pre-existing sessions.
A consent wall, a login or a bot check in the way: stop and say so. Never click through one.

### Common capture operations

Use the chosen provider's documented APIs for the following operations; this method applies to
both native and fallback providers. Keep owned handles across bounded calls rather than one long
capture call. Close temporary pages by their handles when their captures finish.

- **Prepare a page:** create a fresh owned page for the URL, set the requested viewport at DPR 1
  (mobile emulation for the mobile width), reload, and wait for load and network idle. Keep light
  and dark media state separate; section and motion passes use light. Unless a step says no
  pre-scroll, scroll from 0 to the page height in viewport-height increments, waiting 0.25 s each,
  to load lazy media and finish reveals. Return to the top and wait 1.5 s.
- **Measure:** evaluate `<skill>/probe.js` through the permitted page API; save its JSON result
  unchanged. Check its viewport/DPR against the requested settings before using the measurements.
- **Shoot:** save PNGs immediately under the output folder using the paths below. Clips use page
  coordinates and scale 1, with height capped at 2400 px. Remeasure section boxes after scrolling;
  their document y is the current bounding rectangle's top plus the page's scroll offset.
- **Render:** use supported background rendering. Do not bring a shared browser forward. If motion
  cannot render reliably in the background, try a separately controlled browser instance before
  reporting the limitation. Do not improvise unsupported APIs.

## 2. Sections, at 1440x900 and 390x844

For each width `W` and height `H`, prepare a page with pre-scroll and save the probe to
`raw/probe-<W>.json`. Let `bar` be `layout.header`, or 0. For every probe section `s`:

1. Scroll to `max(0, s.y - bar)` and wait 1.0 s so the fixed bar stays above the section.
2. Remeasure `s.sel` and clip at x=0, its current document y, width W, and its current height.
   Save `sections/<s.i padded to two digits>@<W>.png`.
3. After all sections, return to the top, wait 0.5 s, and save the full page to `raw/page@<W>.png`.

Sections whose count or order differs between widths are matched by heading in step 5,
never by index alone.

## 3. Dark, at 1440

Prepare a fresh desktop page with pre-scroll. Emulate `prefers-color-scheme: dark`, reload, wait
for load and network idle, then wait 1.5 s. Save the viewport screenshot to `raw/dark@1440.png`
and the unchanged probe to `raw/probe-1440-dark.json`. Close this page; its media state must not
carry into motion capture.

## 4. Motion, at 1440

Use the desktop viewport with `H=900`; read `p` from `raw/probe-1440.json` and `m=p.motion`.
Split entrance, hover, and scroll work into bounded calls while preserving owned handles and
frame order. Use fresh pages with no pre-scroll where specified so once-only reveals play on camera.

### Entrance

Prepare a fresh page without pre-scroll. Reload at the top, wait 0.1 s and then for load, without
waiting for network idle. From there, shoot the first screen at offsets 0, 0.3, 0.7, and 1.5 s,
waiting the difference between offsets. Save `motion/entrance/01.png` through `04.png` with clip
(x=0, y=0, width=1440, height=H). Keep this owned page for the hover pass, then close it.

### Hover

For each target `t` in `m.hover`, numbered from 1, scroll to `max(0, t.y - H // 2)` and wait 0.5 s.
Clip the before frame at `(max(0, t.x - 16), t.y - 16, t.w + 32, t.h + 32)` to
`motion/hover-<n>/01.png`. Force CSS `:hover` on `t.sel`, wait 0.5 s, and save the same clip to
`02.png`. Clear the forced state even if capture fails. Mouse hover is not a substitute: it may
trigger JavaScript. This pass shows CSS hover only; scripted hover is not claimed.

### Scroll

Select the sorted unique section indices referenced by `m.animations`, `m.effects`, or `m.sticky`
(excluding null indices), plus every section whose `s.y + s.h > H`. A reveal may have finished
before the probe and left no animation trace, so include sections extending beyond the first screen.
For each selected section `s`, prepare a fresh page without pre-scroll:

1. Hide elements identified by `m.sticky` with `position == "fixed"` using their selectors and
   `visibility: hidden`. This capture-only page edit prevents bars from passing for motion;
   sticky elements inside the section stay visible.
2. Set `start=max(0, s.y-H)` and `end=min(pageHeight-H, s.y+s.h-0.4*H)`.
   The six positions are `ys[k]=start+(end-start)*k/5` for k=0 through 5.
3. Visit `ys[0]` through `ys[5]`, then `ys[0]` and `ys[3]` again. At each position, scroll to its
   integer value, wait 0.6 s, remeasure `s.sel`, and clip x=0, current document y, width=1440,
   current section height. Save `motion/s<s.i padded to two digits>-scroll/01.png` through `08.png`.
4. Close that owned page. Frames 07 and 08 revisit positions 01 and 04 for `classify.md`.

A fixed or sticky element is recorded as `pin` from the probe's `sticky`. A shot that comes
back blank or cut wrong is taken again once; still wrong, it goes into `site.json` `problems`, as
does a section taller than the clip height limit.

## 5. Write and check

Look at every screenshot before writing. Then, following `extract.md` and `classify.md`:

1. one `sections/NN-<type>.json` a section;
2. `design.json`;
3. one `motion/<id>.json` an effect, its `frames` from step 4;
4. `site.json`;
5. `review.md`;
6. the site's entry in `<skill>/catalog/catalog.json` (create the file when missing).

Check every file against its schema using an available Python with `jsonschema`. If unavailable,
use an ephemeral `uv run --with jsonschema python` environment. Run the body below with the host
shell's supported syntax, passing `<skill>` and `<name>` as its two script arguments; it does not
require browser-use. Fix every reported error. If the validator cannot run, validation is incomplete.

```python
import glob, json, sys, jsonschema
skill, name = sys.argv[1:]; d = f"{skill}/catalog/{name}"
S = lambda n: jsonschema.Draft202012Validator(json.load(open(f"{skill}/schemas/{n}.schema.json")),
                                              format_checker=jsonschema.FormatChecker())
files = [("site", f"{d}/site.json"), ("design", f"{d}/design.json"), ("catalog", f"{skill}/catalog/catalog.json")]
files += [("section", f) for f in glob.glob(f"{d}/sections/*.json")] + [("motion", f) for f in glob.glob(f"{d}/motion/*.json")]
bad = [f"{f}: {list(e.path)} {e.message}" for n, f in files for e in S(n).iter_errors(json.load(open(f)))]
print("\n".join(bad) or f"{len(files)} files valid")
```

## 6. Close and report

Run cleanup on success, failure, or cancellation while execution is available. Close all resources
registered in step 1, including the final working page. Close owned child resources without closing
a pre-existing parent browser. Use the provider's supported cleanup APIs and verify closure through
its status/listing operations; use the fallback skill's procedure when it supplied the resources.
Attempt cleanup of the remaining owned resources even if one close fails.

Completion requires validated output and verified cleanup. If cleanup fails, report the exact
remaining resources and the failure; do not claim completion. Report the review path, capture
limitations, and every `null` with its `why`.
