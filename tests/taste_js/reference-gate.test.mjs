import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { compileReferencePlan } from "../../skill/taste/scripts/reference-plan.mjs";
import { serializeTasteKit } from "../../skill/taste/scripts/taste-output.mjs";
import { tasteUse } from "../../skill/taste/scripts/taste-use.mjs";

const fixture = path.resolve("tests/fixtures/taste_v2/sample");
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
};
const temporary = t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reference-gate-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const document = (plan, body, head = '<meta name="taste" content="sample">') =>
  `<!doctype html><html data-build-mode="reference" data-buttons="${plan.layout.buttons}" data-mark="${plan.layout.mark}"
    data-rhythm="${plan.contract.layout.rhythm}" data-heading-align="${plan.contract.layout.headingAlign}"
    data-reveal="${plan.contract.motion.reveal}" data-fragment-playback="${plan.contract.motion.fragmentPlayback}"
    data-moment-count="${plan.contract.motion.moments}"><head>${head}</head><body>${body}</body></html>`;

for (const variant of ["recorded", "defaults", "signature defaults"])
  test(`a freshly compiled reference contract passes taste-use (${variant})`, t => {
    const packs = temporary(t);
    const packDir = path.join(packs, "sample");
    fs.cpSync(fixture, packDir, { recursive: true });
    const definition = JSON.parse(fs.readFileSync(path.join(packDir, "taste.json"), "utf8"));
    if (variant !== "recorded") definition.motion = {};
    if (variant === "signature defaults") definition.signature = ["moments/word-highlight"];
    write(path.join(packDir, "taste.json"), JSON.stringify(definition));
    const previous = process.env.TASTE_SKILL_TASTES;
    process.env.TASTE_SKILL_TASTES = packs;
    t.after(() => {
      if (previous === undefined) delete process.env.TASTE_SKILL_TASTES;
      else process.env.TASTE_SKILL_TASTES = previous;
    });
    const plan = compileReferencePlan(definition, { page: "software", packDir });
    const kit = serializeTasteKit(definition, { packDir });
    const html = document(plan, '<main><h1>Example</h1><p data-moment="word-highlight">A statement</p></main>', kit);
    assert.deepEqual(tasteUse({ html, deal: plan, kit }), []);
    // Equivalent object key order is harmless; ordered composition choices are not.
    const reordered = structuredClone(plan);
    reordered.contract.motion = Object.fromEntries(Object.entries(plan.contract.motion).reverse());
    assert.deepEqual(tasteUse({ html, deal: reordered, kit }), []);
    for (const changed of [
      { ...plan.contract, motion: { ...plan.contract.motion, moments: plan.contract.motion.moments + 1 } },
      { ...plan.contract, layout: { ...plan.contract.layout, bands: [] } },
    ]) {
      const findings = tasteUse({ html, deal: { ...plan, contract: changed }, kit });
      assert.ok(findings.some(f => f.check === "taste-contract" && f.hard && /persisted contract differs/.test(f.msg)));
    }
  });

test("gate validates rendered reference markup and falls back to source when capture is absent", t => {
  const root = temporary(t);
  const skill = path.join(root, "taste");
  const scripts = path.join(skill, "scripts");
  fs.cpSync(path.resolve("skill/taste/scripts"), scripts, { recursive: true });
  for (const file of ["motion/meta.json", "layout/heroes.json"])
    write(path.join(skill, "assets", file), fs.readFileSync(path.resolve("skill/taste/assets", file)));
  // Exercise the real gate CLI and persisted report. Only the expensive browser/linter subprocesses are substituted.
  write(
    path.join(scripts, "consistency.mjs"),
    `import fs from 'node:fs'; import path from 'node:path';
    const out = process.argv[process.argv.indexOf('--out') + 1];
    fs.mkdirSync(out, {recursive:true});
    if (process.env.REGRESSION_RENDERED) fs.writeFileSync(path.join(out, 'rendered.html'), process.env.REGRESSION_RENDERED);
    console.log(JSON.stringify({widths:[]}));`,
  );
  write(path.join(scripts, "layout-check.mjs"), "console.log('[]');");
  for (const name of ["copy-lint.mjs", "motion-lint.mjs"])
    write(path.join(scripts, name), "console.log(JSON.stringify({files:[{findings:[]}]}));");
  const packs = path.join(root, "packs");
  const packDir = path.join(packs, "sample");
  fs.cpSync(fixture, packDir, { recursive: true });
  const definition = JSON.parse(fs.readFileSync(path.join(packDir, "taste.json"), "utf8"));
  const plan = compileReferencePlan(definition, { page: "software", packDir });
  const shell = document(plan, '<div id="root"></div><script type="module" src="/app.js"></script>');
  const valid = document(
    plan,
    `<nav class="nav--centre"></nav><main>
    <section class="hero hero--${plan.hero}" data-enter="${plan.entrance}"><h1>Example</h1></section>
    </main><footer class="footer footer--dark"><div class="close--type"></div></footer>`,
  );
  const invalid = valid.replace(`hero--${plan.hero}`, "hero--word").replace('data-enter="still"', 'data-enter="rise"');
  const noHero = document(plan, "<main><section><h1>Missing hero</h1></section></main>");
  for (const [name, source, rendered, expected] of [
    ["spa-invalid", shell, invalid, ["hero split", "hero entrance still"]],
    ["spa-valid", shell, valid, []],
    ["static-no-hero", noHero, noHero, ["hero split"]],
    ["missing-capture", noHero, "", ["hero split"]],
    ["static-valid", valid, invalid, []],
  ]) {
    const project = path.join(root, name);
    write(path.join(project, "index.html"), source);
    write(path.join(project, ".taste-skill/deal.json"), JSON.stringify(plan));
    if (name === "missing-capture") write(path.join(project, ".taste-skill/gate/consistency/rendered.html"), valid);
    const env = { ...process.env, TASTE_SKILL_TASTES: packs, REGRESSION_RENDERED: rendered };
    const run = args =>
      spawnSync(process.execPath, [path.join(scripts, "gate.mjs"), ...args], {
        cwd: project,
        env,
        encoding: "utf8",
        timeout: 30_000,
      });
    const arm = run(["--start", "index.html"]);
    assert.equal(arm.status, 0, arm.stdout + arm.stderr);
    const checked = run(["index.html"]);
    assert.ok([0, 1].includes(checked.status), checked.stdout + checked.stderr);
    const state = JSON.parse(fs.readFileSync(path.join(project, ".taste-skill/gate.json"), "utf8"));
    assert.deepEqual(state.found.crashed, [], checked.stdout + checked.stderr);
    const findings = state.found.fails.filter(f => f.check === "build-plan");
    if (!expected.length) assert.deepEqual(findings, [], name);
    for (const where of expected)
      assert.ok(
        findings.some(f => f.where === where),
        `${name}: missing ${where}`,
      );
  }
});
