// Shared preview-server and headless Chrome mechanics for the taste scripts.
// Callers keep ownership of their root policy, MIME table, ports and launch flags.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import zlib from "node:zlib";
import { CDP, startHeadlessBrowser } from "./cdp.mjs";

export { CDP, startHeadlessBrowser };

// Runtime.evaluate needs to stay alive through a caller-requested page-side wait.
export const pageEvalTimeout = waitMs => Math.max(30_000, Number.isFinite(waitMs) ? waitMs + 10_000 : 300_000);

const within = (root, file) => file === root || file.startsWith(root.endsWith(path.sep) ? root : root + path.sep);

// Serve one page tree on loopback. The caller supplies its own allow callback so the
// consistency, layout, perf and screenshot tools retain their existing security rules.
export async function startPreviewServer({
  root,
  home = root,
  allowed,
  portStart,
  portEnd,
  mime,
  gzipExtensions = [],
  gzipLevel = 6,
  indexForBareDirectory = true,
  outsideStatus = 404,
  contentLength = false,
  streamFiles = false,
}) {
  if (!root || !Number.isInteger(portStart) || !Number.isInteger(portEnd) || portEnd < portStart)
    throw new TypeError("preview server needs a root and a valid port range");
  if (typeof allowed !== "function") throw new TypeError("preview server needs a file allow callback");
  const servedRoot = path.resolve(root);
  const gzip = new Set(gzipExtensions);
  const cache = new Map();
  const server = http.createServer((req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || "/", "http://127.0.0.1").pathname);
      let relative = pathname.replace(/^[/\\]+/, "");
      if (pathname.endsWith("/") || !relative) relative = path.join(relative, "index.html");
      let file = path.resolve(servedRoot, relative);
      if (!within(servedRoot, file)) {
        res.writeHead(outsideStatus);
        res.end(outsideStatus === 403 ? "" : "not found");
        return;
      }
      let stat = fs.statSync(file);
      if (stat.isDirectory() && indexForBareDirectory) {
        file = path.join(file, "index.html");
        stat = fs.statSync(file);
      }
      if (stat.isDirectory() || !allowed(servedRoot, file, home)) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      const ext = path.extname(file).toLowerCase();
      const headers = {
        "Content-Type": mime[ext] || "application/octet-stream",
        "Cache-Control": "no-store",
      };
      const shouldGzip = gzip.has(ext) && /gzip/.test(req.headers["accept-encoding"] || "");
      if (streamFiles && !shouldGzip) {
        if (contentLength) headers["Content-Length"] = stat.size;
        res.writeHead(200, headers);
        fs.createReadStream(file)
          .on("error", error => res.destroy(error))
          .pipe(res);
        return;
      }
      let body = fs.readFileSync(file);
      if (shouldGzip) {
        const key = `${file}\0${stat.size}\0${stat.mtimeMs}`;
        if (!cache.has(key)) cache.set(key, zlib.gzipSync(body, { level: gzipLevel }));
        body = cache.get(key);
        headers["Content-Encoding"] = "gzip";
      }
      if (contentLength) headers["Content-Length"] = body.length;
      res.writeHead(200, headers);
      res.end(body);
    } catch {
      if (!res.headersSent) res.writeHead(404);
      res.end("not found");
    }
  });

  let port = portStart;
  while (port <= portEnd) {
    const available = await new Promise(resolve => {
      const failed = () => resolve(false);
      server.once("error", failed);
      server.listen(port, "127.0.0.1", () => {
        server.removeListener("error", failed);
        resolve(true);
      });
    });
    if (available)
      return {
        server,
        port: /** @type {import("node:net").AddressInfo} */ (server.address()).port,
        close: () => new Promise((resolve, reject) => server.close(error => (error ? reject(error) : resolve()))),
      };
    port++;
  }
  throw new Error(`no free port in ${portStart}-${portEnd}`);
}
