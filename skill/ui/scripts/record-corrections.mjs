import fs from "node:fs";
import path from "node:path";

// A derived view; never overwrite captured observations or the measured document.
export function correctedText(text, dir) {
  text = text.replaceAll("\r\n", "\n");
  const file = path.join(dir, "corrections.json");
  if (!fs.existsSync(file)) return text;
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(rows)) throw new Error("corrections.json must be an array");
  for (const row of rows) {
    if (!row || !["from", "to", "reason", "source"].every(k => typeof row[k] === "string" && row[k].trim()))
      throw new Error("each correction needs from, to, reason and source");
    const root = fs.realpathSync(dir);
    const source = fs.realpathSync(path.resolve(dir, row.source));
    if (path.isAbsolute(row.source) || !source.startsWith(root + path.sep) || !/\.(png|jpe?g|webp)$/i.test(source))
      throw new Error("correction evidence must be a screenshot inside the pack");
    if (text.split(row.from).length !== 2)
      throw new Error("correction source is missing or ambiguous; review it again");
    text = text.replace(row.from, () => row.to);
  }
  return text;
}
