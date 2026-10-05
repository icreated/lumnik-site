import { test } from "node:test";
import assert from "node:assert/strict";
import { REASONS, SUPPORTED_VERSIONS } from "../../proposal/dossier.mjs";
import { RESUME_CODES } from "../../proposal/flow.mjs";
import { MESSAGES, CATALOGUE_CODES, refusalMessage } from "../../proposal/messages.mjs";

test("every contract reason, resume refusal and catalogue refusal has its own sentence — and nothing else does", () => {
  const expected = [...REASONS, ...RESUME_CODES, ...CATALOGUE_CODES].sort();
  assert.deepEqual(Object.keys(MESSAGES).sort(), expected);
  for (const code of expected) {
    const text = refusalMessage(code, "x");
    assert.equal(typeof text, "string");
    assert.ok(text.length > 10, code);
  }
});

test("unknown-schema-version names the version found and the versions supported", () => {
  const text = refusalMessage("unknown-schema-version", 7);
  assert.ok(text.includes("7"));
  assert.ok(text.includes(SUPPORTED_VERSIONS.join(", ")));
});

test("a code nobody wrote a sentence for still yields a sentence, never a throw", () => {
  assert.equal(typeof refusalMessage("not-a-code"), "string");
});

test("messages are French sentences, none ends without a full stop", () => {
  for (const code of Object.keys(MESSAGES)) assert.match(refusalMessage(code, "x"), /[.»)]$/, code);
});

test("malformed-header says the encoding when that is what was wrong, and keeps its old sentence otherwise", () => {
  assert.match(refusalMessage("malformed-header", "not-utf8"), /UTF-8/);
  assert.doesNotMatch(refusalMessage("malformed-header"), /UTF-8/);
  assert.equal(refusalMessage("malformed-header", "x"), refusalMessage("malformed-header"));
});
