---
name: captcha-solver
description: >
  Solve a CAPTCHA already on the attached browser-use page (reCAPTCHA,
  Turnstile, hCaptcha, image/text challenge). Use when: captcha, recaptcha,
  turnstile, hcaptcha, "i'm not a robot", "verify you are human", challenge.
  Not for general browsing or starting a session (use browser-use). Not for
  avoiding captchas up front — that stays browser-use cloud guidance.
---

# Captcha solver

Requires an attached **browser-use** session. If `browser-use` is not loaded,
read its `SKILL.md` now and follow it for connection; do not restate that
skill here.

Run every step as `browser-use <<'PY' … PY`. Prefer helpers already on that
surface (`click_at_xy`, `js`, `wait`, `page_info`, `capture_screenshot`,
`fill_input`, `cdp`). When stuck on a mechanic (iframes, screenshots, drag),
open the matching file under browser-use’s Interaction Skills list — do not
copy those docs into this skill.

**Split with browser-use:** not yet browsing / scraping where blocking is
likely → follow browser-use (cloud). Widget already on the user’s attached
tab and the user wants it solved → this skill.

## Checkbox (reCAPTCHA / Turnstile / hCaptcha)

1. Locate the widget iframe bounds with `js(...)` (vendor `src` substrings:
   `recaptcha`, `hcaptcha`, `challenges.cloudflare`). If AX already exposes
   the checkbox, use browser-use’s AX → box → `click_at_xy` path instead —
   do not restate it.
2. Click left-center of the iframe: `click_at_xy(bounds["x"] + 12, bounds["y"] + bounds["height"] / 2)`.
3. `wait(3)`.
4. Verify with `page_info()`, a short `js("document.body.innerText.slice(0, 500)")`,
   and/or `capture_screenshot("/tmp/captcha.png", max_dim=1800)`.

```python
bounds = js("""(() => {
  const el = document.querySelector(
    'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="challenges.cloudflare"]'
  );
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {x: r.x, y: r.y, width: r.width, height: r.height};
})()""")
if not bounds:
    raise SystemExit("no captcha iframe found")
click_at_xy(bounds["x"] + 12, bounds["y"] + bounds["height"] / 2)
wait(3)
print(page_info())
print(js("document.body.innerText.slice(0, 500)"))
print(capture_screenshot("/tmp/captcha.png", max_dim=1800))
```

## Slider / puzzle drag

No drag helper on browser-use. Drive a stepped press→move→release with raw
`cdp("Input.dispatchMouseEvent", …)` (CSS viewport px). If the widget ignores
it, stop and open browser-use’s `drag-and-drop` interaction skill — do not
invent a second drag API here.

```python
def drag_xy(x0, y0, x1, y1, steps=20):
    cdp("Input.dispatchMouseEvent", type="mouseMoved", x=x0, y=y0)
    cdp("Input.dispatchMouseEvent", type="mousePressed", x=x0, y=y0, button="left", clickCount=1)
    for i in range(1, steps + 1):
        t = i / steps
        cdp("Input.dispatchMouseEvent", type="mouseMoved", x=x0 + (x1 - x0) * t, y=y0 + (y1 - y0) * t, button="left")
    cdp("Input.dispatchMouseEvent", type="mouseReleased", x=x1, y=y1, button="left", clickCount=1)

# from / to = handle and target centers (CSS px), from screenshot or js bounds
drag_xy(from_x, from_y, to_x, to_y, steps=40)
wait(2)
print(capture_screenshot("/tmp/captcha-drag.png", max_dim=1800))
```

## Text / number

1. `path = capture_screenshot("/tmp/captcha-text.png", max_dim=1800)`.
2. OCR with agent vision on that PNG (no harness `readText`).
3. Fill the answer field with `fill_input(selector, text)` (or focus + `type_text`).
4. Verify as in Checkbox step 4.

Measure clicks from the image only after converting device px → CSS px — that
rule lives in browser-use’s screenshots interaction skill; point at it, do not
copy it.

## Image grid

1. Screenshot (`max_dim=1800`).
2. Vision picks which cells match the prompt.
3. Click each cell center with `click_at_xy` (CSS px).
4. Verify with another screenshot / `js` / `page_info`.

No annotated overlay helper exists — cell geometry is yours from the PNG and
widget bounds.

## Out of scope

- Starting Chrome, `--doctor`, `mac-approve`, `BU_NAME`, cloud spawn/auth.
- Restating browser-use page workflow (AX tree, `new_tab`, recordings).
- Claiming a `captcha` global or Aside REPL APIs.
