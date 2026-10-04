import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { read, REASONS } from "../../proposal/dossier.mjs";
import { FIXTURES, inventory, corpusDigest } from "./corpus-digest.mjs";

const { problems, paths } = inventory();

test("the vendored corpus is exactly what was published: no stray file, digest equal", () => {
  assert.deepEqual(problems, []);
  const recorded = readFileSync(new URL("corpus.digest", FIXTURES), "utf8").trim();
  assert.equal(corpusDigest(FIXTURES, paths), recorded, "a vendored fixture was edited in lumnik-site — republish instead");
});

for (const rel of paths) {
  test(`same verdict and same reason as the Java validator: ${rel}`, () => {
    const [dir, name] = rel.split("/");
    const result = read(readFileSync(new URL(rel, FIXTURES), "utf8"));
    assert.equal(result.verdict, dir, `verdict of ${rel} (reason ${result.reason})`);
    if (dir === "invalid") {
      const stem = name.replace(/\.md$/, "");
      const cut = stem.indexOf("--");
      assert.equal(result.reason, cut < 0 ? stem : stem.slice(0, cut), `reason of ${rel}`);
    }
  });
}

test("inventory guard: every reason has a fixture and every verdict a directory", () => {
  const reasons = new Set(
    paths.filter((p) => p.startsWith("invalid/")).map((p) => {
      const stem = p.split("/")[1].replace(/\.md$/, "");
      const cut = stem.indexOf("--");
      return cut < 0 ? stem : stem.slice(0, cut);
    }));
  assert.deepEqual([...reasons].sort(), [...REASONS].sort());
  assert.deepEqual([...new Set(paths.map((p) => p.split("/")[0]))].sort(), ["invalid", "valid", "valid-recheck"]);
});
