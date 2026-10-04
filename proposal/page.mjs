// The questionnaire page: the only DOM code. Whatever comes from the prospect or from a file reaches
// the page through textContent (Node.append of a string), never as markup. Nothing is persisted in
// the browser; the only requests are the same-origin catalogue index and catalogue.

import { digest } from "./digest.mjs";
import { conditionSentence, read, serialize } from "./dossier.mjs";
import { GOAL, Refusal, buildHeader, localDay, locate, lockedAnswers, parseServed, questionsToAsk, resume } from "./flow.mjs";
import { refusalMessage } from "./messages.mjs";

const LANGUAGE = "fr";
const MAX_BYTES = 1_000_000;

const T = {
  fr: {
    warning: "N'écrivez ici ni données réelles, ni mots de passe, ni noms de clients. Rien ne quitte votre navigateur : le dossier est un fichier que vous téléchargez.",
    words: "Votre problème, avec vos mots",
    wordsHelp: "Ce texte est gardé tel quel dans le dossier. Il n'oriente pas les pistes : seules vos réponses aux questions le font.",
    yes: "Oui", no: "Non", unknown: "Je ne sais pas", none: "Pas de réponse",
    locked: "Une piste qui dépend de cette réponse a déjà été examinée par le hub : pour la changer, démarrez un nouveau dossier.",
    pickGoal: "Choisissez ce que vous voulez obtenir : les questions et les pistes suivront.",
    noProposal: "Pas encore de proposition pour ce but. Votre dossier garde vos réponses, sans piste.",
    reviewTitle: "Ce que lumnik pourrait faire — et ce qu'il faut vérifier",
    notSays: "Ce que cette piste ne dit pas",
    toVerify: "À vérifier",
    recomputed: "Recalculé par ce site",
    carried: "Transporté dans le fichier, non vérifié par ce site",
    download: "Télécharger mon dossier",
    importLabel: "Reprendre un dossier",
    fresh: "Nouveau dossier",
    newer: (current, latest) => `Une version plus récente du catalogue existe (${latest}). Ce dossier reste sur la version ${current} ; pour profiter de la nouvelle, démarrez un nouveau dossier.`,
    tooBig: "Ce fichier est trop volumineux pour un dossier (limite : 1 Mo).",
    unreadable: "Ce fichier n'a pas pu être lu.",
  },
}[LANGUAGE];

const YES_NO = [
  { value: "yes", label: T.yes }, { value: "no", label: T.no },
  { value: "unknown", label: T.unknown }, { value: undefined, label: T.none },
];

let state;                       // { catalogue, language, created, words, answers, carried }
let latest;                      // the newest published catalogue version
let status, wordsField, goalBlock, followups, review, downloadButton;

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else if (value === true) el.setAttribute(key, "");
    else if (value !== false && value != null) el.setAttribute(key, value);
  }
  for (const child of children.flat()) if (child != null) el.append(child); // a string becomes a Text node
  return el;
}

// ---- loading the catalogue -----------------------------------------------------------------

async function fetchServed(url, code) {
  let response;
  try {
    response = await fetch(url, { cache: "no-cache" });
  } catch {
    throw new Refusal(code);
  }
  if (!response.ok) throw new Refusal(code);
  let text;
  try {
    text = await response.text();
  } catch {
    throw new Refusal(code);
  }
  return parseServed(text); // strict: a repeated key is refused BEFORE any digest is computed
}

/** Exactly the version asked (the latest when none is), checked against the digest the index
 *  records. A missing version, a missing file or a different digest refuses; nothing falls back. */
async function loadCatalogue(version) {
  const index = await fetchServed("catalogue-index.json", "catalogue-index-unavailable");
  const wanted = locate(index, version);
  const catalogue = await fetchServed(`catalogue/${encodeURIComponent(wanted.version)}.json`, "catalogue-unavailable");
  let actual;
  try {
    actual = await digest(catalogue);
  } catch {
    throw new Refusal("digest-unavailable");
  }
  if (actual !== wanted.digest) throw new Refusal("catalogue-digest-mismatch", wanted.version);
  return { catalogue, latest: index.latest };
}

// ---- state ---------------------------------------------------------------------------------

const freshState = (catalogue) => ({
  catalogue, language: LANGUAGE, created: localDay(), words: "", answers: {}, carried: [],
});

const currentHeader = () => buildHeader(state);

function answer(id, value) {
  if (value === undefined) delete state.answers[id];
  else state.answers[id] = value;
  if (id === GOAL) renderFollowups();
  renderReview();
}

// ---- rendering -----------------------------------------------------------------------------

function choiceFieldset(question, options, locked) {
  const name = `q-${question.id}`;
  const current = state.answers[question.id];
  return h("fieldset", { class: "dossier-question", disabled: locked },
    h("legend", {}, question.asked[state.language]),
    options.map(({ value, label }) => h("label", { class: "dossier-choix" },
      h("input", {
        type: "radio", name, value: value ?? "", checked: current === value,
        onchange: () => answer(question.id, value),
      }),
      " ", label)));
}

const lockNote = () => h("p", { class: "dossier-verrou" }, T.locked, " ",
  h("button", { type: "button", class: "btn btn-givre", onclick: startFresh }, T.fresh));

function renderGoal() {
  const goal = state.catalogue.questions.find((q) => q.id === GOAL);
  const locked = lockedAnswers(state.catalogue, state.answers, state.carried).has(GOAL);
  const options = goal.options.map((o) => ({ value: o.id, label: o.label[state.language] }));
  goalBlock.replaceChildren(choiceFieldset(goal, options, locked), locked ? lockNote() : null);
}

function renderFollowups() {
  const locked = lockedAnswers(state.catalogue, state.answers, state.carried);
  followups.replaceChildren(...questionsToAsk(state.catalogue, state.answers)
    .map((q) => choiceFieldset(q, YES_NO, locked.has(q.id))));
}

function renderCondition(c, answersById) {
  return h("li", {},
    h("strong", {}, c.label),
    h("div", { class: "dossier-recalcule" },
      h("span", { class: "dossier-etiquette" }, T.recomputed), " ", conditionSentence(state.language, c, answersById)),
    c.note ? h("div", { class: "dossier-note" }, c.note) : null,
    c.evidence ? h("div", { class: "dossier-transporte" },
      h("span", { class: "dossier-etiquette" }, T.carried),
      h("ul", {}, c.evidence.map((e) => h("li", {}, `${e.target} — ${e.observed}`)))) : null);
}

function renderLead(lead, answersById) {
  return h("article", { class: "dossier-piste" },
    h("h3", {}, lead.title),
    h("p", {}, lead.says),
    h("h4", {}, T.notSays),
    h("ul", {}, lead["does-not-say"].map((line) => h("li", {}, line))),
    h("h4", {}, T.toVerify),
    h("ul", { class: "dossier-conditions" }, lead.conditions.map((c) => renderCondition(c, answersById))));
}

function renderReview() {
  const header = currentHeader();
  const answersById = new Map(header.answers.map((a) => [a.id, a]));
  const goalChosen = Object.hasOwn(state.answers, GOAL);
  const nodes = [h("h2", {}, T.reviewTitle)];
  if (!goalChosen) nodes.push(h("p", { class: "dossier-aide" }, T.pickGoal));
  else if (header.leads.length === 0) nodes.push(h("p", { class: "dossier-vide" }, T.noProposal));
  for (const lead of header.leads) nodes.push(renderLead(lead, answersById));
  review.replaceChildren(...nodes);
  downloadButton.disabled = !goalChosen;
}

function renderAll() {
  wordsField.value = state.words;
  renderGoal();
  renderFollowups();
  renderReview();
}

// ---- actions -------------------------------------------------------------------------------

function showError(error) {
  const text = error instanceof Refusal ? refusalMessage(error.code, error.detail) : T.unreadable;
  status.replaceChildren(h("p", { class: "dossier-erreur", role: "alert" }, text));
}

function showNotice(text) {
  status.replaceChildren(text ? h("p", { class: "dossier-notice", role: "status" }, text) : "");
}

function startFresh() {
  loadCatalogue().then(({ catalogue, latest: newest }) => {
    state = freshState(catalogue);
    latest = newest;
    showNotice(null);
    renderAll();
  }).catch(showError);
}

function download() {
  const header = currentHeader();
  const url = URL.createObjectURL(new Blob([serialize(header)], { type: "text/markdown;charset=utf-8" }));
  const link = h("a", { href: url, download: `dossier-lumnik-${header.created}.md` });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function importFile(file) {
  try {
    if (file.size > MAX_BYTES) {
      status.replaceChildren(h("p", { class: "dossier-erreur", role: "alert" }, T.tooBig));
      return;
    }
    const result = read(await file.text());
    if (result.verdict === "invalid") throw new Refusal(result.reason, result.detail);
    const { catalogue, latest: newest } = await loadCatalogue(result.header.catalogue);
    state = { catalogue, ...resume(result.header, catalogue) };
    latest = newest;
    showNotice(newest !== catalogue.catalogue ? T.newer(catalogue.catalogue, newest) : null);
    renderAll();
  } catch (error) {
    showError(error);
  }
}

// ---- boot ----------------------------------------------------------------------------------

function build(root) {
  status = h("div", { class: "dossier-status" });
  wordsField = h("textarea", {
    id: "dossier-mots", rows: "4", maxlength: "4000",
    oninput: () => { state.words = wordsField.value; },
  });
  goalBlock = h("div", { class: "dossier-bloc" });
  followups = h("div", { class: "dossier-bloc" });
  review = h("section", { class: "dossier-revue", "aria-live": "polite" });
  downloadButton = h("button", { type: "button", class: "btn btn-lumiere", onclick: download }, T.download);
  const picker = h("input", {
    type: "file", accept: ".md,text/markdown,text/plain", class: "dossier-fichier",
    onchange: () => { const file = picker.files[0]; picker.value = ""; if (file) importFile(file); },
  });
  root.replaceChildren(
    status,
    h("p", { class: "dossier-avertissement" }, T.warning),
    h("div", { class: "dossier-bloc" },
      h("label", { for: "dossier-mots" }, T.words),
      h("p", { class: "dossier-aide" }, T.wordsHelp),
      wordsField),
    goalBlock, followups, review,
    h("div", { class: "dossier-actions" },
      downloadButton,
      h("label", { class: "btn btn-givre" }, T.importLabel, picker),
      h("button", { type: "button", class: "btn btn-givre", onclick: startFresh }, T.fresh)));
}

const root = document.getElementById("dossier-app");
loadCatalogue()
  .then(({ catalogue, latest: newest }) => {
    state = freshState(catalogue);
    latest = newest;
    build(root);
    renderAll();
  })
  .catch((error) => {
    root.replaceChildren(h("p", { class: "dossier-erreur", role: "alert" },
      error instanceof Refusal ? refusalMessage(error.code, error.detail) : T.unreadable));
  });
