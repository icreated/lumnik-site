// What the questionnaire asks, what it proposes, and how a carried dossier resumes. Pure.

import { digest } from "./digest.mjs";
import { derive } from "./dossier.mjs";
import { scan } from "./strict-json.mjs";

export const GOAL = "goal";
const ruleRef = (rule) => `${rule.id}@${rule.version}`;

export const RESUME_CODES = [
  "catalogue-mismatch", "unknown-language", "unknown-question", "unknown-choice-value",
  "unknown-rule", "answer-not-asked", "evidence-unplaceable",
];

/** A refusal carries a code a French sentence exists for (messages.mjs). */
export class Refusal extends Error {
  constructor(code, detail) {
    super(code);
    this.code = code;
    this.detail = detail;
  }
}

/** Rules whose `when` holds, in catalogue order. `answers` maps a question id to its value. */
export function matchedRules(catalogue, answers) {
  return catalogue.rules.filter((rule) => answers[rule.when.answer] === rule.when.is);
}

/** The questions after the goal: those a matched rule's conditions name through `asked-by`,
 *  de-duplicated, in catalogue question order. */
export function questionsToAsk(catalogue, answers) {
  const wanted = new Set();
  for (const rule of matchedRules(catalogue, answers)) {
    for (const c of rule.conditions) if (c["asked-by"]) wanted.add(c["asked-by"]);
  }
  return catalogue.questions.filter((q) => q.id !== GOAL && wanted.has(q.id));
}

/** A stable partition: leads no condition of which is backed by a `no` first, the others last.
 *  `unknown` and unanswered do not demote — only an explicit `no` says the lead does not fit. */
export function rankRules(rules, answers) {
  const against = (rule) => rule.conditions.some((c) => c["asked-by"] && answers[c["asked-by"]] === "no");
  return [...rules.filter((r) => !against(r)), ...rules.filter(against)];
}

/** Answers read by the `when` of a matched rule whose carried lead holds hub evidence: editing one
 *  would make the lead — and the evidence — disappear. Backing answers never lock. */
export function lockedAnswers(catalogue, answers, carried) {
  const locked = new Set();
  for (const rule of matchedRules(catalogue, answers)) {
    const lead = carried.find((l) => l.rule === ruleRef(rule));
    if (lead && lead.conditions.some((c) => Object.hasOwn(c, "evidence"))) locked.add(rule.when.answer);
  }
  return locked;
}

function answerEntry(question, value, language) {
  const entry = { id: question.id, kind: question.kind, asked: question.asked[language] };
  if (value !== undefined) {
    entry.value = value;
    if (question.kind === "choice") entry.label = question.options.find((o) => o.id === value).label[language];
  }
  entry.source = "prospect";
  return entry;
}

/** Ids are never reassigned: a carried id is kept, a new one takes the next free number — and a
 *  number a carried dossier ever used is not given to another lead or condition. */
function idAllocator(carried) {
  const used = new Set();
  const max = { L: 0, C: 0 };
  const note = (id) => {
    used.add(id);
    const m = /^([LC])(\d+)$/.exec(id);
    if (m) max[m[1]] = Math.max(max[m[1]], Number(m[2]));
  };
  for (const lead of carried) {
    note(lead.id);
    for (const c of lead.conditions) note(c.id);
  }
  return {
    fresh(prefix) {
      let n = max[prefix] + 1;
      while (used.has(`${prefix}${n}`)) n++;
      max[prefix] = n;
      used.add(`${prefix}${n}`);
      return `${prefix}${n}`;
    },
  };
}

/** The dossier header for these answers. `carried` is the leads of a resumed dossier (ids and hub
 *  evidence are taken from it); leave it empty for a fresh dossier. The site only ever writes
 *  `unverified` or `missing`: `check` comes from derive() alone. */
export function buildHeader({ catalogue, language, created, words, answers, carried = [] }) {
  const goal = catalogue.questions.find((q) => q.id === GOAL);
  const entries = [goal, ...questionsToAsk(catalogue, answers)].map((q) => answerEntry(q, answers[q.id], language));
  const byId = new Map(entries.map((e) => [e.id, e]));
  const ids = idAllocator(carried);

  const leads = rankRules(matchedRules(catalogue, answers), answers).map((rule) => {
    const was = carried.find((l) => l.rule === ruleRef(rule));
    const meaning = rule.meaning[language];
    return {
      id: was ? was.id : ids.fresh("L"),
      rule: ruleRef(rule),
      source: "catalogue",
      title: meaning.title,
      says: meaning.says,
      "does-not-say": [...meaning["does-not-say"]],
      proposes: { kind: rule.proposes.kind, uses: [...rule.proposes.uses] },
      conditions: rule.conditions.map((c) => {
        const wasCondition = was?.conditions.find((x) => x.needs === c.needs);
        const out = {
          id: wasCondition ? wasCondition.id : ids.fresh("C"),
          needs: c.needs,
          verifier: c.verifier,
          label: c.label[language],
        };
        if (c["asked-by"]) out["backed-by"] = c["asked-by"];
        out.check = derive(c["asked-by"] ? byId.get(c["asked-by"]) : undefined);
        if (c.note) out.note = c.note[language];
        if (wasCondition && Object.hasOwn(wasCondition, "evidence")) out.evidence = wasCondition.evidence;
        return out;
      }),
    };
  });

  const header = { "lumnik-dossier": 1, catalogue: catalogue.catalogue, created, language };
  if (words) header.words = words;
  header.answers = entries;
  header.leads = leads;
  return header;
}

/** The state a valid dossier resumes into, against the catalogue version it names — or a refusal.
 *  A layer ABOVE the contract's reasons: the file stays `valid` for the corpus. Nothing is dropped
 *  silently: an answer, a rule or a piece of evidence the catalogue cannot place refuses the resume. */
export function resume(header, catalogue) {
  if (header.catalogue !== catalogue.catalogue) throw new Refusal("catalogue-mismatch", header.catalogue);
  const goal = catalogue.questions.find((q) => q.id === GOAL);
  if (!Object.hasOwn(goal.asked, header.language)) throw new Refusal("unknown-language", header.language);
  const questions = new Map(catalogue.questions.map((q) => [q.id, q]));
  const answers = {};
  for (const a of header.answers) {
    const q = questions.get(a.id);
    if (!q || q.kind !== a.kind) throw new Refusal("unknown-question", a.id);
    if (Object.hasOwn(a, "value")) {
      if (q.kind === "choice" && !q.options.some((o) => o.id === a.value)) throw new Refusal("unknown-choice-value", a.id);
      answers[a.id] = a.value;
    }
  }
  for (const lead of header.leads) {
    if (!catalogue.rules.some((r) => ruleRef(r) === lead.rule)) throw new Refusal("unknown-rule", lead.rule);
  }
  const state = { language: header.language, created: header.created, words: header.words ?? "", answers, carried: header.leads };
  const rebuilt = buildHeader({ catalogue, ...state });
  const presented = new Set(rebuilt.answers.map((a) => a.id));
  for (const a of header.answers) if (!presented.has(a.id)) throw new Refusal("answer-not-asked", a.id);
  for (const lead of header.leads) {
    for (const c of lead.conditions) {
      if (!Object.hasOwn(c, "evidence")) continue;
      const placed = rebuilt.leads.some((l) => l.rule === lead.rule && l.conditions.some((x) => x.needs === c.needs));
      if (!placed) throw new Refusal("evidence-unplaceable", c.id);
    }
  }
  return state;
}

/** A version's digest from the published index — exactly the version asked, or the latest when none
 *  is. Never a fallback to another version; an unknown or hostile name fetches nothing. */
export function locate(index, version) {
  const wanted = version ?? index.latest;
  if (typeof wanted !== "string" || !index.versions || !Object.hasOwn(index.versions, wanted)) {
    throw new Refusal("catalogue-version-unknown", wanted);
  }
  return { version: wanted, digest: index.versions[wanted] };
}

/** Parses a file the site serves (the catalogue index, a catalogue) under the contract's rule that
 *  EVERY reader refuses duplicate keys. response.json() keeps the last one silently, and an identical
 *  duplicate would not even move the canonical digest — so the digest cannot be the only guard. */
export function parseServed(text) {
  let value;
  try {
    value = JSON.parse(text);
    if (scan(text).duplicateKey) throw new Error("duplicate key");
  } catch {
    // invalid JSON, a repeated key, or nesting past the tokenizer's 1000 levels
    throw new Refusal("catalogue-malformed");
  }
  return value;
}

async function served(fetchText, url, code) {
  let text;
  try {
    text = await fetchText(url);
  } catch {
    throw new Refusal(code);
  }
  return parseServed(text); // strict: a repeated key is refused BEFORE any digest is computed
}

/** Exactly the version asked (the latest when none is), checked against the digest the index records.
 *  A missing version, a missing file, a malformed file or a different digest refuses; nothing falls
 *  back. `fetchText(url)` returns the text of a same-origin file or throws — injected, so the whole
 *  integrity path is testable without a browser. */
export async function loadCatalogue(fetchText, version) {
  const index = await served(fetchText, "catalogue-index.json", "catalogue-index-unavailable");
  const wanted = locate(index, version);
  const catalogue = await served(fetchText, `catalogue/${encodeURIComponent(wanted.version)}.json`, "catalogue-unavailable");
  let actual;
  try {
    actual = await digest(catalogue);
  } catch {
    throw new Refusal("digest-unavailable");
  }
  if (actual !== wanted.digest) throw new Refusal("catalogue-digest-mismatch", wanted.version);
  return { catalogue, latest: index.latest };
}

/** The prospect's local calendar day as YYYY-MM-DD — not the UTC one, which is yesterday for a
 *  French user working just after midnight. */
export function localDay(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
