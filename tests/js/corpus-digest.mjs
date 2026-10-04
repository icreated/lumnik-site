// The corpus digest, defined exactly as scripts/check-proposal-corpus.py defines it (spec §7):
// the .md files under the three verdict directories, corpus.digest excluded, any other file a problem.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";

export const FIXTURES = new URL("../fixtures/proposal/", import.meta.url);
const VERDICTS = ["valid", "valid-recheck", "invalid"];
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function inventory(dir = FIXTURES) {
  const problems = [];
  const paths = [];
  const walk = (url, prefix) => {
    for (const entry of readdirSync(url, { withFileTypes: true })) {
      const rel = prefix + entry.name;
      if (entry.isDirectory()) {
        walk(new URL(`${entry.name}/`, url), `${rel}/`);
      } else if (rel !== "corpus.digest") {
        const parts = rel.split("/");
        if (parts.length === 2 && VERDICTS.includes(parts[0]) && parts[1].endsWith(".md")) paths.push(rel);
        else problems.push(`${rel} is outside the corpus inventory`);
      }
    }
  };
  walk(dir, "");
  return { problems, paths: paths.sort() }; // paths are ASCII by the inventory rule
}

export function corpusDigest(dir, paths) {
  const lines = paths.map((rel) => `${rel}\t${sha256(readFileSync(new URL(rel, dir)))}`);
  return `sha256:${sha256(lines.join("\n"))}`;
}
