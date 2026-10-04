import { test } from "node:test";
import assert from "node:assert/strict";
import { read, derive, serialize, conditionSentence, SUPPORTED_VERSIONS } from "../../proposal/dossier.mjs";

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

const header = (over = {}) => ({
  "lumnik-dossier": 1, catalogue: "c", created: "2026-10-04", language: "fr",
  answers: [
    { id: "goal", kind: "choice", asked: "But ?", value: "g1", label: "Un but", source: "prospect" },
    { id: "q1", kind: "yes-no-unknown", asked: "Q1 ?", value: "no", source: "prospect" },
    { id: "q2", kind: "yes-no-unknown", asked: "Q2 ?", source: "prospect" },
  ],
  leads: [{
    id: "L1", rule: "r@1", source: "catalogue", title: "T", says: "S", "does-not-say": ["a", "b"],
    proposes: { kind: "Workflow", uses: ["spec.on.table"] },
    conditions: [
      { id: "C1", needs: "n1", verifier: "workflow-data-truth", label: "Cond 1", "backed-by": "q1", check: "unverified" },
      { id: "C2", needs: "n2", verifier: "none", label: "Cond 2", "backed-by": "q2", check: "missing", note: "Une note" },
      { id: "C3", needs: "n3", verifier: "workflow-apply-door", label: "Cond 3", check: "missing" },
    ],
  }],
  ...over,
});

test("serialize writes a file the reader accepts, header deep-equal to what was written", () => {
  const h = header({ words: "mes mots" });
  const r = read(serialize(h));
  assert.equal(r.verdict, "valid");
  assert.deepEqual(r.header, h);
});

test("free text that looks like format survives byte-faithfully and never becomes the header", () => {
  const words = 'ligne 1\n---\n<script>alert(1)</script>\n"guillemets" \\ antislash\n# titre\n- puce';
  const r = read(serialize(header({ words })));
  assert.equal(r.verdict, "valid");
  assert.equal(r.header.words, words);
});

test("the body states that only the header is read back, on its first line", () => {
  const lines = serialize(header()).split("\n");
  assert.equal(lines[lines.indexOf("---", 1) + 1],
    "<!-- Generated from the header above. Only the header is read back; edits below are ignored. -->");
});

test("evidence is re-emitted unchanged: deep-equal after parsing, serialization depends on the array alone", () => {
  const evidence = [{ source: "discovery", via: "workflow-data-truth", target: "t.c", observed: "obs \"q\" é" }];
  const h = header();
  h.leads[0].conditions[0].evidence = evidence;
  const once = serialize(h);
  const back = read(once);
  assert.deepEqual(back.header.leads[0].conditions[0].evidence, evidence);
  const other = header({ words: "autre" });
  other.leads[0].conditions[0].evidence = structuredClone(evidence);
  const line = (t) => t.split("\n").find((l) => l.includes('"evidence"')).match(/"evidence": .*\]/)[0];
  assert.equal(line(serialize(other)), line(once));
});

test("serialization is idempotent: read then serialize again gives the same bytes", () => {
  const once = serialize(header({ words: "x" }));
  assert.equal(serialize(read(once).header), once);
});

test("conditionSentence: said / not covered / not answered / the 'no' frame", () => {
  const answers = new Map(header().answers.map((a) => [a.id, a]));
  const [c1, c2, c3] = header().leads[0].conditions;
  assert.match(conditionSentence("fr", c1, answers), /Cette piste suppose : Cond 1\. Vous indiquez ne pas l'avoir/);
  assert.equal(conditionSentence("fr", c2, answers), "Pas de réponse — à établir.");
  assert.equal(conditionSentence("fr", c3, answers), "Non couvert par le questionnaire — à établir.");
});

test("a language with no presentation strings is refused, not guessed", () => {
  assert.throws(() => serialize(header({ language: "xx" })), /no presentation strings/);
});
