// Evidence freshness is mechanical; visual judgment remains the reviewer's job.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const skip = new Set([
  "node_modules",
  ".git",
  ".taste-skill",
  ".claude",
  ".codex",
  ".agents",
  "tmp",
  "shots",
  "screenshots",
  "coverage",
]);
export function treeHash(root, pack = false) {
  const hash = crypto.createHash("sha256");
  function visit(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if ((!pack && skip.has(e.name)) || e.name === ".git" || e.name === "node_modules") continue;
      if (e.isSymbolicLink()) throw new Error(`review cannot fingerprint symlink: ${path.join(dir, e.name)}`);
      const file = path.join(dir, e.name);
      if (e.isDirectory()) visit(file);
      else if (e.isFile()) {
        hash.update(path.relative(root, file).replaceAll("\\", "/") + "\0");
        hash.update(fs.readFileSync(file));
      }
    }
  }
  visit(root);
  return hash.digest("hex");
}

export function screenshotHash(root, relative) {
  if (typeof relative !== "string" || !relative || path.isAbsolute(relative))
    throw new Error("image path must be relative");
  const file = fs.realpathSync(path.resolve(root, relative));
  const base = fs.realpathSync(root);
  if (!file.startsWith(base + path.sep) || !/\.(png|jpe?g|webp)$/i.test(file))
    throw new Error("image outside evidence root");
  const bytes = fs.readFileSync(file);
  const image =
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    || (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP");
  if (!image) throw new Error("not an image");
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export function reviewEvidence({ review, buildHash, packHash, project, pack }) {
  const failures = [];
  const fail = msg =>
    failures.push({
      check: "taste-review",
      where: "visual review",
      msg,
      fix: "compare current reference and build crops; update .taste-skill/visual-review.json",
      hard: true,
    });
  if (!review || review.status !== "reviewed") {
    fail("visual review is missing or unfinished");
    return failures;
  }
  if (review.buildHash !== buildHash || review.packHash !== packHash)
    fail("visual review is stale: build or pack changed");
  for (const region of ["hero", "middle", "close"])
    for (const viewport of ["1440x900", "390x844"]) {
      const row = review.comparisons?.find(r => r.region === region && r.viewport === viewport);
      if (!row) {
        fail(`missing ${region} at ${viewport}`);
        continue;
      }
      for (const key of ["composition", "typography", "surfaces", "imagery", "motion"])
        if (typeof row.notes?.[key] !== "string" || !row.notes[key].trim())
          fail(`${region} ${viewport}: missing ${key} assessment`);
      if (
        !Array.isArray(row.findings)
        || row.findings.some(
          f =>
            !f
            || !["major", "minor"].includes(f.severity)
            || !["open", "resolved"].includes(f.status)
            || typeof f.description !== "string"
            || !f.description.trim()
            || (f.status !== "resolved" && f.severity === "major"),
        )
      )
        fail(`${region} ${viewport}: unresolved or missing findings`);
      if (!Array.isArray(row.adaptations)) fail(`${region} ${viewport}: adaptations must be recorded`);
      for (const [key, root] of [
        ["reference", pack],
        ["actual", project],
      ]) {
        try {
          if (screenshotHash(root, row[key]) !== row[key + "Hash"]) fail(`${region} ${viewport}: ${key} image changed`);
        } catch (e) {
          fail(`${region} ${viewport}: ${key}: ${e.message}`);
        }
      }
    }
  for (const key of ["hover", "focus", "reducedMotion"])
    if (typeof review.states?.[key] !== "string" || !review.states[key].trim()) fail(`missing ${key} state review`);
  return failures;
}

export function reviewEvidenceForBuild({ project, pack }) {
  try {
    const file = path.join(project, ".taste-skill/visual-review.json");
    const review = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
    return reviewEvidence({ review, buildHash: treeHash(project), packHash: treeHash(pack, true), project, pack });
  } catch (e) {
    return [
      { check: "taste-review", where: "visual review", msg: e.message, fix: "repair review evidence", hard: true },
    ];
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = name => args[args.indexOf(name) + 1];
  if (!args.includes("--project") || !args.includes("--pack")) throw new Error("--project DIR --pack DIR required");
  const project = path.resolve(option("--project")),
    pack = path.resolve(option("--pack"));
  if (args[0] === "hashes")
    console.log(JSON.stringify({ buildHash: treeHash(project), packHash: treeHash(pack, true) }, null, 2));
  else if (args[0] === "image")
    console.log(screenshotHash(args.includes("--reference") ? pack : project, option("--file")));
  else {
    const failures = reviewEvidenceForBuild({ project, pack });
    console.log(JSON.stringify({ status: failures.length ? "OPEN" : "REVIEWED", failures }, null, 2));
    process.exitCode = failures.length ? 1 : 0;
  }
}
