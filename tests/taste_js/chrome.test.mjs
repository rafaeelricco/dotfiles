// one browser lookup for every script: CHROME_PATH, the installed browsers, then the newest Playwright Chromium
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { findChrome } from "../../skill/taste/scripts/roots.mjs";

const withEnv = (vars, fn) => {
  const old = Object.fromEntries(Object.keys(vars).map(k => [k, process.env[k]]));
  Object.assign(process.env, vars);
  for (const [k, v] of Object.entries(vars)) if (v === undefined) delete process.env[k];
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(old))
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
  }
};
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "taste-chrome-"));
const exeIn =
  {
    darwin: "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    win32: "chrome-win/chrome.exe",
  }[process.platform] || "chrome-linux/chrome";

test("CHROME_PATH wins when it exists", () => {
  const f = path.join(tmp(), "chrome");
  fs.writeFileSync(f, "");
  assert.equal(withEnv({ CHROME_PATH: f }, findChrome), f);
});

test("the newest Playwright Chromium is found when no browser is installed", t => {
  const none = withEnv({ CHROME_PATH: undefined, CHROME: undefined, PLAYWRIGHT_BROWSERS_PATH: tmp() }, findChrome);
  if (none) return t.skip(`an installed browser comes first here: ${none}`);
  const cache = tmp();
  for (const v of ["chromium-1100", "chromium-1248"]) {
    const f = path.join(cache, v, exeIn);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, "");
  }
  const got = withEnv({ CHROME_PATH: undefined, CHROME: undefined, PLAYWRIGHT_BROWSERS_PATH: cache }, findChrome);
  assert.equal(got, path.join(cache, "chromium-1248", exeIn));
});

test("null when there is nothing to drive", t => {
  const got = withEnv(
    { CHROME_PATH: path.join(tmp(), "missing"), CHROME: undefined, PLAYWRIGHT_BROWSERS_PATH: tmp() },
    findChrome,
  );
  if (got) return t.skip(`an installed browser exists here: ${got}`);
  assert.equal(got, null);
});
