// The reader of the proposal-dossier contract, schema 1 — a port of the reference validator
// (DossierValidator.java, spec 2026-10-03 sections 1-2) judged against the same fixture corpus.
// Structural only: it never re-verifies evidence.

import { scan } from "./strict-json.mjs";

export const SUPPORTED_VERSIONS = [1];

export const REASONS = [
  "malformed-header", "duplicate-key", "unknown-schema-version", "unknown-field", "missing-field",
  "null-value", "wrong-type", "bad-date", "answer-source-not-prospect", "unknown-answer-kind",
  "unknown-answer-value", "label-mismatch", "lead-source-not-catalogue", "duplicate-id",
  "orphan-backed-by", "underivable-answer", "unknown-check", "unknown-verifier", "derivation-mismatch",
  "outcome-without-evidence", "outcome-on-unverifiable", "empty-evidence", "evidence-on-unverifiable",
  "evidence-via-mismatch", "evidence-source-not-discovery",
];

class Refusal extends Error {
  constructor(reason, detail) {
    super(reason);
    this.reason = reason;
    this.detail = detail;
  }
}
const refuse = (reason, detail) => {
  throw new Refusal(reason, detail);
};

const TEXT = "text", INT = "int", LIST = "list", OBJECT = "object";
const shape = (keys, required) => ({ keys: Object.entries(keys), names: new Set(Object.keys(keys)), required: new Set(required) });

const ROOT = shape(
  { "lumnik-dossier": INT, catalogue: TEXT, created: TEXT, language: TEXT, words: TEXT, answers: LIST, leads: LIST },
  ["lumnik-dossier", "catalogue", "created", "language", "answers", "leads"]);
const ANSWER = shape({ id: TEXT, kind: TEXT, asked: TEXT, value: TEXT, label: TEXT, source: TEXT }, ["id", "kind", "asked", "source"]);
const LEAD = shape(
  { id: TEXT, rule: TEXT, source: TEXT, title: TEXT, says: TEXT, "does-not-say": LIST, proposes: OBJECT, conditions: LIST },
  ["id", "rule", "source", "title", "says", "does-not-say", "proposes", "conditions"]);
const PROPOSES = shape({ kind: TEXT, uses: LIST }, ["kind", "uses"]);
const CONDITION = shape(
  { id: TEXT, needs: TEXT, verifier: TEXT, label: TEXT, "backed-by": TEXT, check: TEXT, note: TEXT, evidence: LIST },
  ["id", "needs", "verifier", "label", "check"]);
const EVIDENCE = shape({ source: TEXT, via: TEXT, target: TEXT, observed: TEXT }, ["source", "via", "target", "observed"]);

const YES_NO_UNKNOWN = new Set(["yes", "no", "unknown"]);
const CHECKS = new Set(["unverified", "missing", "confirmed", "refuted"]);
const VERIFIERS = new Set(["workflow-data-truth", "workflow-apply-door", "none"]);

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** The one place the §2 table of the contract lives. `answer` is the backing answer entry, or
 *  undefined when the condition has no `backed-by`. Unknown never becomes absent: it is `missing`. */
export function derive(answer) {
  if (!answer || !Object.hasOwn(answer, "value")) return "missing";
  return answer.value === "unknown" ? "missing" : "unverified";
}

/** @returns {{verdict: "valid"|"valid-recheck"|"invalid", reason?: string, detail?: *, header?: object}} */
export function read(file) {
  try {
    const { root, numbers } = parseHeader(file);
    return { verdict: judge(root, numbers) ? "valid-recheck" : "valid", header: root };
  } catch (e) {
    if (e instanceof Refusal) return { verdict: "invalid", reason: e.reason, detail: e.detail };
    throw e;
  }
}

function parseHeader(file) {
  const text = file.replaceAll("\r\n", "\n");
  if (!text.startsWith("---\n")) refuse("malformed-header");
  // The closing line is "---", followed by the body or by nothing at all.
  let end = text.indexOf("\n---\n", 3);
  if (end < 0 && text.endsWith("\n---")) end = text.length - 4;
  if (end < 0) refuse("malformed-header");
  const headerText = text.substring(4, end + 1);
  let root;
  try {
    root = JSON.parse(headerText);
  } catch {
    refuse("malformed-header");
  }
  if (!isObject(root)) refuse("malformed-header");
  let scanned;
  try {
    scanned = scan(headerText);
  } catch (e) {
    if (e instanceof RangeError) refuse("malformed-header"); // nested past Jackson's 1000 levels
    throw e;
  }
  if (scanned.duplicateKey) refuse("duplicate-key");
  return { root, numbers: scanned.numbers };
}

// A Jackson isInt(): an integer spelling that fits 32 bits. 1.0 and 1e0 are not.
function isInt(lexeme) {
  return /^-?(0|[1-9]\d*)$/.test(lexeme) && Number(lexeme) >= -(2 ** 31) && Number(lexeme) <= 2 ** 31 - 1;
}

/** @returns {boolean} true when some condition carries evidence the importer must re-verify. */
function judge(root, numbers) {
  // The version first: a schema-2 file is expected to carry fields schema 1 does not know.
  if (!Object.hasOwn(root, "lumnik-dossier")) refuse("missing-field");
  const version = numbers.find((n) => n.path.length === 1 && n.path[0] === "lumnik-dossier");
  if (typeof root["lumnik-dossier"] !== "number" || !isInt(version.lexeme)) refuse("wrong-type");
  if (!SUPPORTED_VERSIONS.includes(root["lumnik-dossier"])) refuse("unknown-schema-version", root["lumnik-dossier"]);
  checkShape(root, ROOT);
  checkDate(root.created);

  const answers = new Map();
  for (const a of root.answers) {
    checkAnswer(a);
    if (answers.has(a.id)) refuse("duplicate-id");
    answers.set(a.id, a);
  }
  const ids = new Set();
  let recheck = false;
  for (const lead of root.leads) {
    checkShape(lead, LEAD);
    checkShape(lead.proposes, PROPOSES);
    checkTexts(lead["does-not-say"]);
    checkTexts(lead.proposes.uses);
    if (lead.source !== "catalogue") refuse("lead-source-not-catalogue");
    if (ids.has(lead.id)) refuse("duplicate-id");
    ids.add(lead.id);
    for (const c of lead.conditions) {
      checkShape(c, CONDITION);
      if (ids.has(c.id)) refuse("duplicate-id");
      ids.add(c.id);
      recheck = checkCondition(c, answers) || recheck;
    }
  }
  return recheck;
}

function checkDate(created) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(created)) refuse("bad-date");
  const [y, m, d] = created.split("-").map(Number);
  const day = new Date(0);
  day.setUTCFullYear(y, m - 1, d); // setUTCFullYear keeps years 0-99 as written; Date.UTC would not
  if (day.getUTCFullYear() !== y || day.getUTCMonth() !== m - 1 || day.getUTCDate() !== d) refuse("bad-date");
}

/** Spec section 1, "Answers carry their question's kind": checkable without the catalogue. */
function checkAnswer(a) {
  checkShape(a, ANSWER);
  if (a.source !== "prospect") refuse("answer-source-not-prospect");
  const answered = Object.hasOwn(a, "value");
  const labelled = Object.hasOwn(a, "label");
  switch (a.kind) {
    case "yes-no-unknown":
      if (answered && !YES_NO_UNKNOWN.has(a.value)) refuse("unknown-answer-value");
      if (labelled) refuse("label-mismatch");
      break;
    case "choice":
      if (answered !== labelled) refuse("label-mismatch");
      break;
    default:
      refuse("unknown-answer-kind");
  }
}

/** @returns {boolean} true when the condition carries evidence (kept history or a transported outcome). */
function checkCondition(c, answers) {
  if (!VERIFIERS.has(c.verifier)) refuse("unknown-verifier");
  if (!CHECKS.has(c.check)) refuse("unknown-check");
  const derived = deriveChecked(c, answers);
  const evidence = c.evidence;
  if (evidence !== undefined) {
    // One spelling for "no evidence": the key is absent — like "value": null, [] is a second one.
    if (evidence.length === 0) refuse("empty-evidence");
    if (c.verifier === "none") refuse("evidence-on-unverifiable");
    for (const e of evidence) {
      checkShape(e, EVIDENCE);
      if (e.source !== "discovery") refuse("evidence-source-not-discovery");
      if (e.via !== c.verifier) refuse("evidence-via-mismatch");
    }
  }
  if (c.check === "confirmed" || c.check === "refuted") {
    if (c.verifier === "none") refuse("outcome-on-unverifiable");
    if (evidence === undefined) refuse("outcome-without-evidence");
  } else if (c.check !== derived) {
    // Evidence beside an unverified/missing check is kept history: allowed, never believed —
    // but the check itself must be exactly what the answers give.
    refuse("derivation-mismatch");
  }
  return evidence !== undefined;
}

function deriveChecked(c, answers) {
  if (!Object.hasOwn(c, "backed-by")) return derive(undefined);
  const answer = answers.get(c["backed-by"]);
  if (!answer) refuse("orphan-backed-by");
  if (answer.kind !== "yes-no-unknown") refuse("underivable-answer");
  return derive(answer);
}

function checkShape(node, s) {
  if (!isObject(node)) refuse("wrong-type");
  if (Object.keys(node).some((k) => !s.names.has(k))) refuse("unknown-field");
  for (const [key, type] of s.keys) {
    if (!Object.hasOwn(node, key)) {
      if (s.required.has(key)) refuse("missing-field");
      continue;
    }
    const v = node[key];
    if (v === null) refuse("null-value");
    const ok = type === TEXT ? typeof v === "string"
      : type === INT ? typeof v === "number"
      : type === LIST ? Array.isArray(v)
      : isObject(v);
    if (!ok) refuse("wrong-type");
  }
}

function checkTexts(list) {
  for (const item of list) if (typeof item !== "string") refuse("wrong-type");
}
