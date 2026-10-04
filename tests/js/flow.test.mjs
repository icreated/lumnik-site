import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { read, serialize } from "../../proposal/dossier.mjs";
import {
  GOAL, RESUME_CODES, Refusal, matchedRules, questionsToAsk, rankRules, lockedAnswers,
  buildHeader, resume, locate, localDay, parseServed, loadCatalogue,
} from "../../proposal/flow.mjs";
import { digest } from "../../proposal/digest.mjs";

const json = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), "utf8"));
const fixture = (p) => readFileSync(new URL(`../fixtures/proposal/${p}`, import.meta.url), "utf8");
const catalogue = json("catalogue/2026.10.0.json");
const base = { catalogue, language: "fr", created: "2026-10-04", words: "" };
const stalled = { goal: "stalled-documents" };

// ---- what is asked ------------------------------------------------------------------------

test("a goal with a rule asks the questions its conditions name, once each, in catalogue order", () => {
  assert.deepEqual(questionsToAsk(catalogue, stalled).map((q) => q.id), ["has-status", "has-stable-id"]);
});

test("a goal with no rule asks nothing and proposes nothing", () => {
  for (const goal of ["find-information", "reconcile-sources"]) {
    assert.deepEqual(questionsToAsk(catalogue, { goal }), []);
    const h = buildHeader({ ...base, answers: { goal } });
    assert.deepEqual(h.leads, []);
    assert.deepEqual(h.answers.map((a) => a.id), [GOAL]);
  }
});

test("no goal chosen yet: nothing matches", () => {
  assert.deepEqual(matchedRules(catalogue, {}), []);
});

test("questions are de-duplicated when several rules ask the same one", () => {
  const two = structuredClone(catalogue);
  const second = structuredClone(two.rules[0]);
  second.id = "second";
  two.rules.push(second);
  assert.deepEqual(questionsToAsk(two, stalled).map((q) => q.id), ["has-status", "has-stable-id"]);
});

// ---- ranking ------------------------------------------------------------------------------

test("a stable partition: leads with a no-backed condition go last, unknown and unanswered never demote", () => {
  const rule = (id, askedBy) => ({ id, version: 1, conditions: askedBy.map((q) => ({ "asked-by": q })), when: {} });
  const rules = [rule("a", ["x"]), rule("b", ["y"]), rule("c", ["x", "y"]), rule("d", [undefined])];
  const ids = (answers) => rankRules(rules, answers).map((r) => r.id).join("");
  assert.equal(ids({}), "abcd");
  assert.equal(ids({ x: "unknown", y: "yes" }), "abcd");        // unknown does not demote
  assert.equal(ids({ x: "no" }), "bdac");                       // a, c demoted, catalogue order inside each group
  assert.equal(ids({ x: "no", y: "no" }), "dabc");
});

// ---- the dossier written ------------------------------------------------------------------

test("a fresh dossier: checks come from derive alone, never confirmed or refuted", () => {
  const h = buildHeader({ ...base, answers: { ...stalled, "has-status": "yes", "has-stable-id": "unknown" } });
  const checks = h.leads[0].conditions.map((c) => `${c.id}:${c.check}`);
  assert.deepEqual(checks, ["C1:unverified", "C2:unverified", "C3:missing", "C4:missing", "C5:missing"]);
  assert.ok(h.answers.every((a) => a.source === "prospect"));
  assert.equal(read(serialize(h)).verdict, "valid");
});

test("honesty invariant: over every answer combination the writer never emits confirmed or refuted", () => {
  const values = [undefined, "yes", "no", "unknown"];
  for (const s of values) for (const k of values) {
    const answers = { ...stalled };
    if (s) answers["has-status"] = s;
    if (k) answers["has-stable-id"] = k;
    const h = buildHeader({ ...base, answers });
    for (const c of h.leads.flatMap((l) => l.conditions)) assert.ok(["unverified", "missing"].includes(c.check), `${s}/${k}`);
    assert.notEqual(read(serialize(h)).verdict, "invalid", `${s}/${k}`);
  }
});

test("an unanswered presented question has no value key (never null)", () => {
  const h = buildHeader({ ...base, answers: stalled });
  for (const a of h.answers.filter((x) => x.id !== GOAL)) assert.equal(Object.hasOwn(a, "value"), false);
});

test("a 'no' keeps its lead; the dossier states it", () => {
  const h = buildHeader({ ...base, answers: { ...stalled, "has-status": "no" } });
  assert.equal(h.leads.length, 1);
  assert.equal(h.leads[0].conditions[0].check, "unverified");
});

// ---- resume -------------------------------------------------------------------------------

const recheck = () => read(fixture("valid-recheck/downgraded-evidence-kept.md")).header;

test("which valid fixtures resume, and the one that refuses", () => {
  const resumes = ["valid/answer-no-lead-kept.md", "valid/minimal.md", "valid/no-body.md", "valid/unanswered.md",
    "valid-recheck/confirmed-with-evidence.md", "valid-recheck/downgraded-evidence-kept.md", "valid-recheck/refuted-over-unknown.md"];
  for (const f of resumes) {
    const state = resume(read(fixture(f)).header, catalogue);
    assert.notEqual(read(serialize(buildHeader({ catalogue, ...state }))).verdict, "invalid", f);
  }
  // A goal never chosen, yet answers and leads present: a shape the site itself cannot produce.
  assert.throws(() => resume(read(fixture("valid/unanswered-choice.md")).header, catalogue),
    (e) => e instanceof Refusal && e.code === "answer-not-asked");
});

test("THE DECISIVE TEST: import valid-recheck, edit a backing answer, download again", () => {
  const imported = recheck();
  const originalEvidence = structuredClone(imported.leads[0].conditions[2].evidence);
  const state = resume(imported, catalogue);

  // the field that conditions the lead is locked; the backing answers are not
  assert.deepEqual([...lockedAnswers(catalogue, state.answers, state.carried)], ["goal"]);

  const edited = buildHeader({ catalogue, ...state, answers: { ...state.answers, "has-stable-id": "yes" } });
  const c3 = edited.leads[0].conditions.find((c) => c.needs === "key-column-exists");
  assert.equal(c3.check, "unverified");                      // the check follows the NEW answer (it was missing)
  assert.deepEqual(c3.evidence, originalEvidence);           // the evidence is deeply equal, no field recomputed, added or removed
  assert.equal(c3.id, "C3");                                 // and its id is kept
  const downloaded = read(serialize(edited));
  assert.equal(downloaded.verdict, "valid-recheck");
  assert.deepEqual(downloaded.header.leads[0].conditions[2].evidence, originalEvidence);
});

test("a transported confirmed/refuted is recomputed, never believed", () => {
  const state = resume(read(fixture("valid-recheck/refuted-over-unknown.md")).header, catalogue);
  const h = buildHeader({ catalogue, ...state });
  for (const c of h.leads.flatMap((l) => l.conditions)) assert.ok(["unverified", "missing"].includes(c.check));
});

test("one lead with evidence is enough to lock the goal; without evidence nothing locks", () => {
  const imported = recheck();
  assert.deepEqual([...lockedAnswers(catalogue, { goal: "stalled-documents" }, imported.leads)], ["goal"]);
  const clean = read(fixture("valid/minimal.md")).header;
  assert.deepEqual([...lockedAnswers(catalogue, { goal: "stalled-documents" }, clean.leads)], []);
});

test("resume refusals bound to the catalogue — each refuses whole, none drops anything", () => {
  const refusal = (mutate, code) => {
    const h = structuredClone(read(fixture("valid-recheck/downgraded-evidence-kept.md")).header);
    mutate(h);
    assert.throws(() => resume(h, catalogue), (e) => e instanceof Refusal && e.code === code, code);
  };
  refusal((h) => { h.answers.push({ id: "mystery", kind: "yes-no-unknown", asked: "?", source: "prospect" }); }, "unknown-question");
  refusal((h) => { h.answers[0].value = "no-such-option"; }, "unknown-choice-value");
  refusal((h) => { h.leads[0].rule = "ghost@9"; }, "unknown-rule");
  refusal((h) => { h.language = "xx"; }, "unknown-language");
  refusal((h) => { h.catalogue = "1999.1.0"; }, "catalogue-mismatch");
  refusal((h) => { h.answers.find((a) => a.id === "goal").value = "find-information"; h.answers.find((a) => a.id === "goal").label = "x"; }, "answer-not-asked");
  refusal((h) => { h.leads[0].conditions[2].needs = "renamed-need"; }, "evidence-unplaceable");
});

test("every resume code the module can throw is declared", () => {
  assert.deepEqual([...RESUME_CODES].sort(),
    ["answer-not-asked", "catalogue-mismatch", "evidence-unplaceable", "unknown-choice-value", "unknown-language", "unknown-question", "unknown-rule"]);
});

// ---- ids ----------------------------------------------------------------------------------

test("ids are never reassigned: a matched lead keeps its id, a number once used is not reused", () => {
  const carried = structuredClone(recheck().leads);
  carried[0].id = "L7";
  carried[0].conditions[0].id = "C9";
  const h = buildHeader({ ...base, answers: { ...stalled, "has-status": "yes" }, carried });
  assert.equal(h.leads[0].id, "L7");
  assert.equal(h.leads[0].conditions[0].id, "C9");
  // a brand-new lead takes the next free number above everything the carried dossier ever used
  const two = structuredClone(catalogue);
  const extra = structuredClone(two.rules[0]);
  extra.id = "extra";
  two.rules.push(extra);
  const h2 = buildHeader({ ...base, catalogue: two, answers: stalled, carried });
  assert.equal(h2.leads[1].id, "L8");
  assert.ok(h2.leads[1].conditions.every((c) => Number(c.id.slice(1)) > 9));
});

test("idempotence: resume then download with no edit gives the same bytes the second time", () => {
  const first = serialize(buildHeader({ catalogue, ...resume(recheck(), catalogue) }));
  const second = serialize(buildHeader({ catalogue, ...resume(read(first).header, catalogue) }));
  assert.equal(second, first);
});

// ---- locating the catalogue ---------------------------------------------------------------

const index = { latest: "2026.10.0", versions: { "2026.10.0": "sha256:aa" } };

test("locate finds exactly the version asked, or the latest when none is asked", () => {
  assert.deepEqual(locate(index, "2026.10.0"), { version: "2026.10.0", digest: "sha256:aa" });
  assert.deepEqual(locate(index), { version: "2026.10.0", digest: "sha256:aa" });
});

test("a hostile or unknown version is refused — never a fallback to latest, nothing to fetch", () => {
  for (const v of ["../../x", "__proto__", "constructor", "2026.10.1", "", 7, null, {}]) {
    if (v === null) continue; // null/undefined mean "latest" by design
    assert.throws(() => locate(index, v), (e) => e instanceof Refusal && e.code === "catalogue-version-unknown", String(v));
  }
});

// ---- parsing what the site serves ---------------------------------------------------------

test("a served file with a repeated key is refused even when the duplicate is IDENTICAL — the digest cannot see it", async () => {
  const doubled = `{"catalogue":"2026.10.0",${JSON.stringify(catalogue).slice(1)}`;   // the root key written twice, same value
  assert.deepEqual(JSON.parse(doubled), catalogue);                                   // response.json() would accept it…
  assert.equal(await digest(JSON.parse(doubled)), await digest(catalogue));           // …and the digest would not move
  assert.throws(() => parseServed(doubled), (e) => e instanceof Refusal && e.code === "catalogue-malformed");
});

test("a repeated key hidden behind an escape, invalid JSON and over-deep nesting are refused too", () => {
  const BS = String.fromCharCode(92);
  for (const text of [`{"a":1,"${BS}u0061":2}`, "{not json", '{"x":' + "[".repeat(1001) + "]".repeat(1001) + "}", ""]) {
    assert.throws(() => parseServed(text), (e) => e instanceof Refusal && e.code === "catalogue-malformed", text.slice(0, 20));
  }
});

test("a well-formed served file parses to the same value as JSON.parse", () => {
  const text = JSON.stringify(catalogue);
  assert.deepEqual(parseServed(text), catalogue);
  assert.deepEqual(parseServed('{"latest":"x","versions":{"x":"sha256:aa"}}'), { latest: "x", versions: { x: "sha256:aa" } });
});

// ---- the local day ------------------------------------------------------------------------

test("created is the LOCAL day: just after local midnight it is not yesterday's UTC date", () => {
  const before = process.env.TZ;
  try {
    process.env.TZ = "Pacific/Kiritimati"; // UTC+14: local 00:30 on the 4th is the 3rd in UTC
    assert.equal(localDay(new Date(2026, 9, 4, 0, 30)), "2026-10-04");
    assert.equal(localDay(new Date(2026, 0, 5, 9, 0)), "2026-01-05");
  } finally {
    if (before === undefined) delete process.env.TZ; else process.env.TZ = before;
  }
});

// ---- loading the catalogue (the integrity path, with an injected fetch) -------------------

const serve = (overrides = {}) => {
  const calls = [];
  const files = {
    "catalogue-index.json": readFileSync(new URL("../../catalogue-index.json", import.meta.url), "utf8"),
    "catalogue/2026.10.0.json": readFileSync(new URL("../../catalogue/2026.10.0.json", import.meta.url), "utf8"),
    ...overrides,
  };
  const fetchText = async (url) => {
    calls.push(url);
    if (!Object.hasOwn(files, url) || files[url] === null) throw new Error(`404 ${url}`);
    return files[url];
  };
  return { fetchText, calls };
};
const refusal = (code) => (e) => e instanceof Refusal && e.code === code;

test("loadCatalogue: the published catalogue loads, checked against its digest, latest or named", async () => {
  const a = await loadCatalogue(serve().fetchText);
  assert.equal(a.catalogue.catalogue, "2026.10.0");
  assert.equal(a.latest, "2026.10.0");
  assert.equal((await loadCatalogue(serve().fetchText, "2026.10.0")).catalogue.catalogue, "2026.10.0");
});

test("loadCatalogue: a version the index does not list is refused and NOTHING more is fetched — no fallback to latest", async () => {
  const s = serve();
  await assert.rejects(() => loadCatalogue(s.fetchText, "2099.1.0"), refusal("catalogue-version-unknown"));
  assert.deepEqual(s.calls, ["catalogue-index.json"]);
  const hostile = serve();
  await assert.rejects(() => loadCatalogue(hostile.fetchText, "../../x"), refusal("catalogue-version-unknown"));
  assert.deepEqual(hostile.calls, ["catalogue-index.json"]);
});

test("loadCatalogue: a catalogue that is not the one the index digests is refused (a hand edit, a torn deploy)", async () => {
  const text = readFileSync(new URL("../../catalogue/2026.10.0.json", import.meta.url), "utf8");
  const tampered = serve({ "catalogue/2026.10.0.json": text.replace("Repérer", "Reperer") });
  await assert.rejects(() => loadCatalogue(tampered.fetchText), refusal("catalogue-digest-mismatch"));
});

test("loadCatalogue: an IDENTICAL repeated key is refused by the strict parse — the digest alone would accept it", async () => {
  const text = readFileSync(new URL("../../catalogue/2026.10.0.json", import.meta.url), "utf8");
  const doubled = text.replace("{", '{"catalogue": "2026.10.0",');
  assert.equal(await digest(JSON.parse(doubled)), await digest(JSON.parse(text)));   // the premise
  await assert.rejects(() => loadCatalogue(serve({ "catalogue/2026.10.0.json": doubled }).fetchText), refusal("catalogue-malformed"));
});

test("loadCatalogue: a missing index or a missing catalogue file are told apart", async () => {
  await assert.rejects(() => loadCatalogue(serve({ "catalogue-index.json": null }).fetchText), refusal("catalogue-index-unavailable"));
  await assert.rejects(() => loadCatalogue(serve({ "catalogue/2026.10.0.json": null }).fetchText), refusal("catalogue-unavailable"));
  await assert.rejects(() => loadCatalogue(serve({ "catalogue-index.json": "{ not json" }).fetchText), refusal("catalogue-malformed"));
});

test("loadCatalogue: without WebCrypto the load is refused — never unchecked", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
  try {
    await assert.rejects(() => loadCatalogue(serve().fetchText), refusal("digest-unavailable"));
  } finally {
    Object.defineProperty(globalThis, "crypto", original);
  }
});
