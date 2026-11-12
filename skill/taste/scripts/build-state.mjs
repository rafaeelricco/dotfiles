import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function lstatIfPresent(file) {
  try {
    return fs.lstatSync(file);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return null;
    throw error;
  }
}

/** Reject every existing link-like path component before build state is written. */
export function assertSafeWritePath(file) {
  const absolute = path.resolve(file);
  const parsed = path.parse(absolute);
  const parts = absolute.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let current = parsed.root;

  for (let index = 0; index < parts.length; index++) {
    current = path.join(current, parts[index]);
    const stat = lstatIfPresent(current);
    if (!stat) continue;
    if (stat.isSymbolicLink()) throw new Error(`refusing to write build state through symlink or junction: ${current}`);
    if (index < parts.length - 1 && !stat.isDirectory())
      throw new Error(`refusing to write build state: ancestor is not a directory: ${current}`);
    if (index === parts.length - 1 && !stat.isFile())
      throw new Error(`refusing to write build state: target is not a regular file: ${current}`);
  }
  return absolute;
}

export function ensureSafeDirectory(dir) {
  const absolute = path.resolve(dir);
  assertSafeWritePath(path.join(absolute, ".build-state-probe"));
  fs.mkdirSync(absolute, { recursive: true });
  assertSafeWritePath(path.join(absolute, ".build-state-probe"));
  return absolute;
}

export function writeFileSafe(file, contents, options) {
  const absolute = path.resolve(file);
  ensureSafeDirectory(path.dirname(absolute));
  assertSafeWritePath(absolute);
  fs.writeFileSync(absolute, contents, options);
  return absolute;
}

export function writeJsonSafe(file, value, { spaces = 1, newline = true } = {}) {
  const suffix = newline ? "\n" : "";
  return writeFileSafe(file, JSON.stringify(value, null, spaces) + suffix, "utf8");
}

/** Persist a standalone deal's history and keep an existing plan in step. */
export function writeDealerState(historyFile, history, patch) {
  const file = path.join(path.dirname(path.resolve(historyFile)), "deal.json");
  assertSafeWritePath(file);
  writeJsonSafe(historyFile, history);

  let deal;
  try {
    deal = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return;
  }
  writeJsonSafe(file, { ...deal, ...patch });
}

/** Arm a new build or join the nearest open parent build, matching start.mjs's historic behavior. */
export function armBuild(page, cwd = process.cwd()) {
  const read = file => {
    const absolute = assertSafeWritePath(file);
    try {
      return JSON.parse(fs.readFileSync(absolute, "utf8"));
    } catch {
      return null;
    }
  };
  const homeDir = path.resolve(cwd);
  const up = [homeDir, path.dirname(homeDir), path.dirname(path.dirname(homeDir))].filter(
    (value, index, all) => all.indexOf(value) === index,
  );
  for (const dir of up) {
    assertSafeWritePath(path.join(dir, ".taste-skill", "build.json"));
    assertSafeWritePath(path.join(dir, ".taste-skill", "gate.json"));
  }
  const open = dir => {
    const build = read(path.join(dir, ".taste-skill", "build.json"));
    const gate = read(path.join(dir, ".taste-skill", "gate.json"));
    return (
      (build && typeof build === "object" && typeof build.start === "string")
      || (gate && typeof gate.start === "string" && /^(active|fail|error)$/.test(gate.status || ""))
    );
  };
  const home = up.find(open) || homeDir;
  const dot = path.join(home, ".taste-skill");
  const marker = path.join(dot, "build.json");
  const current = read(marker);
  if (home !== homeDir) console.error(`start: the finish gate is already armed in ${home}; this deal joins that build`);
  if (current && typeof current === "object" && typeof current.start === "string") {
    let changed = false;
    if (!current.kind && page) {
      current.kind = page;
      changed = true;
    }
    if (
      home !== homeDir
      && !current.url
      && !(typeof current.page === "string" && current.page && fs.existsSync(path.resolve(home, current.page)))
    ) {
      current.page = path.relative(home, homeDir).split(path.sep).join("/");
      changed = true;
    }
    if (changed) writeJsonSafe(marker, current, { spaces: 1 });
  } else if (home === homeDir) {
    writeJsonSafe(
      marker,
      {
        page: null,
        dir: homeDir,
        kind: page || null,
        start: new Date().toISOString(),
        by: "start.mjs",
        gate: path.join(path.dirname(fileURLToPath(import.meta.url)), "gate.mjs"),
      },
      { spaces: 1 },
    );
    console.error(
      `start: the finish gate is armed in ${homeDir}; run start.mjs from the project folder (the one that holds the page)`,
    );
  }
}
