// consistency/cli.mjs — the flag reader every part shares; opt/has splice a flag out of argv, so the page is argv[0] once all are read (moved from consistency.mjs)
import { readBuildPlan } from "../build-policy.mjs";
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const argv = process.argv.slice(2);
export const opt = (n, d) => {
  const i = argv.indexOf("--" + n);
  if (i < 0) return d;
  const v = argv[i + 1];
  argv.splice(i, 2);
  return v;
};
export const has = n => {
  const i = argv.indexOf("--" + n);
  if (i < 0) return false;
  argv.splice(i, 1);
  return true;
};
// --taste: the saved taste the page was built from (gate.mjs passes it); its pack's items count as the kit's. Read here,
// not beside ROOT: the modules below read the catalogue when this file loads
export const TASTE = (() => {
  const v = opt("taste", null);
  return typeof v === "string" && v && !v.startsWith("--") ? v : null;
})();
// Gate-supplied state, not page-controlled data attributes, selects V2 policy.
export const BUILD_PLAN = readBuildPlan(opt("build-plan", null));
