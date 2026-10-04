import { test } from "node:test";
import assert from "node:assert/strict";
import { read, derive, SUPPORTED_VERSIONS } from "../../proposal/dossier.mjs";

const BS = String.fromCharCode(92);
const file = (over = {}) =>
  `---\n{"lumnik-dossier": ${over.v ?? 1}, "catalogue":"c","created":"${over.d ?? "2026-10-04"}","language":"fr",${over.extra ?? ""}"answers":[],"leads":[]}\n---\n`;
const judge = (f) => {
  const r = read(f);
  return r.verdict === "invalid" ? `invalid:${r.reason}` : r.verdict;
};

test("the version is an integer spelling that fits 32 bits — observed on Jackson 2.21.5", () => {
  assert.equal(judge(file()), "valid");
  assert.equal(judge(file({ v: "1.0" })), "invalid:wrong-type");
  assert.equal(judge(file({ v: "1e0" })), "invalid:wrong-type");
  assert.equal(judge(file({ v: "3000000000" })), "invalid:wrong-type");
  assert.equal(judge(file({ v: "2" })), "invalid:unknown-schema-version");
  assert.equal(judge(file({ v: '"1"' })), "invalid:wrong-type");
});

test("unknown-schema-version names the version found and the versions supported", () => {
  const r = read(file({ v: "7" }));
  assert.equal(r.detail, 7);
  assert.deepEqual(SUPPORTED_VERSIONS, [1]);
});

test("created must be a real calendar day — years below 100 included, as LocalDate.parse", () => {
  assert.equal(judge(file({ d: "0050-01-01" })), "valid");
  assert.equal(judge(file({ d: "0000-01-01" })), "valid");
  assert.equal(judge(file({ d: "2024-02-29" })), "valid");
  assert.equal(judge(file({ d: "2026-02-30" })), "invalid:bad-date");
  assert.equal(judge(file({ d: "2026-13-01" })), "invalid:bad-date");
});

test("duplicate keys are refused after decoding, and a value that looks like a key is not one", () => {
  assert.equal(judge(file({ extra: `"language":"en","l${BS}u0061nguage":"x",` })), "invalid:duplicate-key");
  assert.equal(judge(file({ extra: `"words":"${BS}"language${BS}": ${BS}"en${BS}"",` })), "valid");
});

test("a header nested past 1000 levels is malformed-header, never a thrown error", () => {
  const deep = (n) => file({ extra: `"x":${"[".repeat(n)}${"]".repeat(n)},` });
  assert.equal(judge(deep(999)), "invalid:unknown-field");       // legal depth: refused for the unknown field, not the depth
  assert.equal(judge(deep(1000)), "invalid:malformed-header");
  assert.equal(judge(deep(100000)), "invalid:malformed-header");
});

test("CRLF line endings read like LF (a Windows editor must not break the file)", () => {
  assert.equal(judge(file().replaceAll("\n", "\r\n")), "valid");
});

test("the file's closing --- may be its last line, with or without a trailing newline", () => {
  const body = file();
  assert.equal(judge(body.trimEnd()), "valid");
  assert.equal(judge(body), "valid");
});

test("derive is the contract's §2 table", () => {
  assert.equal(derive({ value: "yes" }), "unverified");
  assert.equal(derive({ value: "no" }), "unverified");
  assert.equal(derive({ value: "unknown" }), "missing");
  assert.equal(derive({}), "missing");          // unanswered: no value key
  assert.equal(derive(undefined), "missing");   // no backed-by
});
