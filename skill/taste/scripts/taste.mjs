#!/usr/bin/env node
// Public entry point. Existing commands remain available for direct use.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const commands = {
  plan: ["start.mjs", "plan"],
  build: ["kit-copy.mjs"],
  check: ["gate.mjs"],
  pack: ["pack.mjs"],
};
const [command, ...args] = process.argv.slice(2);
if (!Object.hasOwn(commands, command || "")) {
  console.error("usage: taste.mjs plan|build|check|pack [options]");
  process.exit(2);
}
const [file, ...prefix] = commands[command];
const child = spawn(
  process.execPath,
  [path.join(path.dirname(fileURLToPath(import.meta.url)), file), ...prefix, ...args],
  {
    stdio: "inherit",
  },
);
for (const signal of /** @type {const} */ (["SIGINT", "SIGTERM"])) process.on(signal, () => child.kill(signal));
child.on("error", error => {
  console.error(`taste: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode =
    code
    ?? (signal === "SIGINT" ? 130
    : signal === "SIGTERM" ? 143
    : 1);
});
