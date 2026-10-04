import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonical, digest, byCodePoint } from "../../proposal/digest.mjs";

const read = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), "utf8"));

test("the canonical form sorts keys by code point, drops whitespace, keeps raw UTF-8", () => {
  assert.equal(canonical({ b: 1, a: [true, null, "é"] }), '{"a":[true,null,"é"],"b":1}');
});

test("keys sort by Unicode code point, not by UTF-16 unit (Python's order, not JavaScript's default)", () => {
  const astral = String.fromCodePoint(0x1f600);
  const bmpHigh = String.fromCharCode(0xffff);
  assert.ok(byCodePoint(bmpHigh, astral) < 0, "U+FFFF sorts before U+1F600 by code point");
  assert.ok([astral, bmpHigh].sort()[0] === astral, "…whereas the default sort puts the surrogate pair first");
  assert.ok(canonical({ [astral]: 1, [bmpHigh]: 2 }).indexOf(bmpHigh) < canonical({ [astral]: 1, [bmpHigh]: 2 }).indexOf(astral));
});

test("a vector computed by Python's digest() — astral keys, escapes, nesting", async () => {
  const astral = String.fromCodePoint(0x1f600);
  const v = {
    b: [1, 2, { z: "é", a: astral }],
    a: 'é\n"x"',
    [astral]: true,
    [String.fromCharCode(0xffff)]: null,
    é: 3,
  };
  assert.equal(await digest(v), "sha256:6325cb4547a2fe97c8f8137b0b0aa8e6c17617959c62b92587cae30cace35866");
});

test("every published catalogue equals the digest the Python publication tool wrote in the index", async () => {
  const index = read("catalogue-index.json");
  assert.ok(Object.keys(index.versions).length > 0);
  for (const [version, expected] of Object.entries(index.versions)) {
    assert.equal(await digest(read(`catalogue/${version}.json`)), expected, `catalogue ${version}`);
  }
  assert.ok(Object.hasOwn(index.versions, index.latest));
});

test("without WebCrypto the digest refuses — it never answers 'unchecked'", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
  try {
    await assert.rejects(() => digest({}), /digest-unavailable/);
  } finally {
    Object.defineProperty(globalThis, "crypto", original);
  }
});
