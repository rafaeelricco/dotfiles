# Record

Output: `<skill>/catalog/<name>/`. The name is `as <name>`, else the host without `www.` plus the
path as a slug (`https://www.raycast.com/keyboard` → `raycast-keyboard`). A name that exists:
ask before replacing it. Steps 2–4 only measure and shoot; every judgement is step 5, except a
stage page's sections (step 2), which its shots depend on.

## 1. Browser

Discover browser tools and browser skills exposed by the current harness, including deferred
tools. Read their instructions before choosing a provider. Prefer native tools; load
`browser-use` only when native tools are absent, cannot capture the required evidence, or cannot
isolate this recording. Use only documented APIs permitted by the provider.

Confirm support for the operations below before capture: owned-page navigation, reload and
scroll; `probe.js` execution; viewport/DPR and media emulation; saved full-page screenshots and
document-coordinate clips; forced CSS hover; wheel input; and timed frames, plus an image tool that
crops and stacks saved PNGs. A screenshot-only tool is insufficient.

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
- **Scroll** (every scroll in this file): set the offset, wait, then read it back. A smooth-scroll
  library (Lenis and the like) animates to its own target and undoes a set offset: when the
  read-back misses by more than 4 px, drive that page with wheel input, at most one viewport per
  event, until two read-backs 0.2 s apart sit within 4 px of the target. Stop after 200 events and
  put the offset reached in `problems`. Under touch emulation wheel input can hang, and these
  libraries leave touch scrolling native, so at the mobile width set the offset directly; one
  that does not hold there goes into `problems` too. Name frames by the offset read back, not
  the one asked for.
- **Measure:** evaluate `<skill>/probe.js` through the permitted page API; save its JSON result
  unchanged. Check its viewport/DPR against the requested settings before using the measurements.
- **Shoot:** save PNGs immediately under the output folder using the paths below. Clips use page
  coordinates and scale 1, with height capped at 2400 px. Remeasure section boxes after scrolling;
  their document y is the current bounding rectangle's top plus the page's scroll offset. On a stage
  page (step 2) capture the plain viewport only, with no clip, and crop a smaller shot from the
  saved PNG by the element's current viewport rectangle: capturing beyond the viewport, which a
  clip may switch on, re-lays out such a page and blanks its layers.
- **Render:** use supported background rendering. Do not bring a shared browser forward. If motion
  cannot render reliably in the background, try a separately controlled browser instance before
  reporting the limitation. Do not improvise unsupported APIs.

## 2. Sections, at 1440x900 and 390x844

For each width `W` and height `H`, prepare a page with pre-scroll and save the probe to
`raw/probe-<W>.json`; probe both widths, keeping both pages, before shooting either, so a stage
reason at one width reaches the other. Let `bar` be `layout.header`, or 0. For every probe
section `s`:

1. Scroll to `max(0, s.y - bar)` and wait 1.0 s so the fixed bar stays above the section.
2. Remeasure `s.sel` and clip at x=0, its current document y, width W, and its current height.
   Save `sections/<s.i padded to two digits>@<W>.png`.
3. After all sections, return to the top, wait 0.5 s, and save the full page to `raw/page@<W>.png`.

Sections whose count or order differs between widths are matched by heading in step 5,
never by index alone.

### Stage pages

When the probe's `stage` lists a reason at either width, the content scrolls through fixed or
pinned layers and section clips show the wrong thing; the probe's section boxes describe those
layers, not what shows. Replace 1–3 above at both widths, on the same prepared page:

1. Walk down from 0 in steps of `H // 2` px, then to `pageHeight - H`. Wait 1.0 s at each and
   save the viewport to `raw/walk-<W>/<offset padded to five>.png`.
2. Split the walk into sections by heading, numbered from 00 in page order; the fixed bar is
   section 00 when one shows, cut from the top `layout.header` px of the first frame.
3. Build each other `sections/NN@<W>.png` from the one or two frames where that section shows
   whole: crop each to the rows that show the section and stack them, height capped at 2400 px.
   Its section file names those frames in `evidence`.

The walk replaces `raw/page@<W>.png`; skip that shot and say so in `problems`.

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
waiting the difference between offsets. Save the viewport as `motion/entrance/01.png` through
`04.png`. Keep this owned page for the hover pass, then close it.

### Hover

For each target `t` in `m.hover`, numbered from 1, scroll to `max(0, t.y - H // 2)` and wait 0.5 s.
Clip the before frame at `(max(0, t.x - 16), t.y - 16, t.w + 32, t.h + 32)` to
`motion/hover-<n>/01.png`. Force CSS `:hover` on `t.sel`, wait 0.5 s, and save the same clip to
`02.png`. Clear the forced state even if capture fails. Mouse hover is not a substitute: it may
trigger JavaScript. This pass shows CSS hover only; scripted hover is not claimed.

On a stage page `t.y` is where the target sits at offset 0, not where it shows. After each scroll,
remeasure `t.sel` and check that it shows: the element at its rectangle's centre is `t.sel` or
inside it. A box can sit on screen in a faded, clipped or covered layer, so on-screen is not
enough. When it does not show, try the walk offsets in order until it does, and take a target that
never shows into `problems`. Crop both frames from viewport captures.

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

On a stage page, select every section from step 2 except the bar instead, with `start` the walk
offset before the first that shows it and `end` the one after the last, so a section seen in one
frame still gets a range. Hide only the bar, `layout.headerSel`: the other
fixed layers carry the content. At each position save the whole viewport rather than remeasuring
`s.sel`; frames 07 and 08 still apply.

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
use `uv run --no-project --no-config --isolated --with jsonschema==4.23.0 python -I` to keep project
configuration and local imports out of validation. Run the body below with the host shell's
supported syntax, passing `<skill>` and `<name>` as its two script arguments; it does not
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
