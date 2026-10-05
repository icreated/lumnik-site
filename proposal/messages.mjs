// Every refusal a prospect can meet, in French. Keyed by the same codes the reader (REASONS),
// the flow (RESUME_CODES) and the catalogue loader (CATALOGUE_CODES) throw: a test requires one
// sentence for each, so a new code without wording cannot ship.

import { SUPPORTED_VERSIONS } from "./dossier.mjs";

export const CATALOGUE_CODES = [
  "catalogue-index-unavailable", "catalogue-version-unknown", "catalogue-unavailable",
  "catalogue-digest-mismatch", "digest-unavailable", "catalogue-malformed",
];

export const MESSAGES = {
  // The contract's reasons: the file is refused whole, nothing is imported.
  "malformed-header": (detail) => detail === "not-utf8"
    ? "Ce fichier n'est pas encodé en UTF-8 (une copie enregistrée en Latin-1, par exemple) : il est refusé plutôt que lu avec des accents perdus. Réenregistrez-le en UTF-8."
    : "L'en-tête de ce fichier n'est pas du JSON valide, ou ses deux lignes « --- » manquent ou il est imbriqué trop profondément.",
  "duplicate-key": () => "Une clé apparaît deux fois dans le même objet de l'en-tête : le fichier est ambigu, il est refusé.",
  "unknown-schema-version": (found) => `Ce dossier est de version ${found} ; cette page lit la version ${SUPPORTED_VERSIONS.join(", ")}.`,
  "unknown-field": () => "L'en-tête contient un champ que cette version du format ne connaît pas.",
  "missing-field": () => "Un champ obligatoire manque dans l'en-tête.",
  "null-value": () => "Une valeur est « null » : une réponse absente s'écrit en omettant la clé.",
  "wrong-type": () => "Un champ n'a pas le type attendu (texte, entier, liste ou objet).",
  "bad-date": () => "La date de création n'est pas un jour réel au format AAAA-MM-JJ.",
  "answer-source-not-prospect": () => "Une réponse déclare une autre origine que « prospect ».",
  "unknown-answer-kind": () => "Une réponse porte un type de question inconnu.",
  "unknown-answer-value": () => "Une réponse oui / non / je ne sais pas porte une autre valeur.",
  "label-mismatch": () => "Le libellé d'une réponse est incohérent avec son type de question.",
  "lead-source-not-catalogue": () => "Une piste déclare une autre origine que « catalogue ».",
  "duplicate-id": () => "Deux réponses, ou une piste et une condition, portent le même identifiant.",
  "orphan-backed-by": () => "Une condition s'appuie sur une réponse qui n'existe pas.",
  "underivable-answer": () => "Une condition s'appuie sur une réponse dont on ne peut pas déduire l'état.",
  "unknown-check": () => "Une condition porte un état de vérification inconnu.",
  "unknown-verifier": () => "Une condition nomme un vérificateur inconnu.",
  "derivation-mismatch": () => "L'état d'une condition ne correspond pas à la réponse sur laquelle elle s'appuie.",
  "outcome-without-evidence": () => "Une condition « confirmée » ou « réfutée » n'a pas de preuve.",
  "outcome-on-unverifiable": () => "Une condition sans vérificateur automatique est déclarée « confirmée » ou « réfutée ».",
  "empty-evidence": () => "Une liste de preuves est vide : l'absence de preuve s'écrit en omettant la clé.",
  "evidence-on-unverifiable": () => "Une condition sans vérificateur automatique porte des preuves.",
  "evidence-via-mismatch": () => "Une preuve ne vient pas du vérificateur de sa condition.",
  "evidence-source-not-discovery": () => "Une preuve ne déclare pas l'origine « discovery ».",
  // Resume refusals bound to the catalogue version the dossier names.
  "catalogue-mismatch": (v) => `Ce dossier annonce le catalogue ${v}, qui n'est pas celui chargé.`,
  "unknown-language": (l) => `Ce dossier est écrit en « ${l} », langue que ce catalogue ne propose pas.`,
  "unknown-question": (id) => `Ce dossier répond à une question (« ${id} ») que son catalogue ne contient pas.`,
  "unknown-choice-value": (id) => `La réponse à « ${id} » n'est pas l'une des options de ce catalogue.`,
  "unknown-rule": (r) => `Ce dossier contient une piste (« ${r} ») que son catalogue ne contient pas.`,
  "answer-not-asked": (id) => `Ce dossier contient une réponse (« ${id} ») que ce questionnaire ne pose pas pour ce but : il n'est pas repris, pour ne rien perdre en silence.`,
  "evidence-unplaceable": (id) => `La condition « ${id} » porte une preuve que ce site ne sait pas replacer : ouvrez ce dossier dans le hub.`,
  // Loading the catalogue.
  "catalogue-index-unavailable": () => "Le catalogue des versions est introuvable. Réessayez dans un instant.",
  "catalogue-version-unknown": (v) => `La version de catalogue « ${v} » n'est pas publiée : ce dossier ne peut pas être repris ici.`,
  "catalogue-unavailable": () => "Le catalogue est introuvable. Réessayez dans un instant.",
  "catalogue-digest-mismatch": (v) => `Le catalogue ${v} ne correspond pas à son empreinte publiée (déploiement en cours ou copie périmée) : rechargez la page.`,
  "catalogue-malformed": () => "Le catalogue publié est mal formé (JSON invalide, clé en double ou imbrication excessive) : rien n'est repris.",
  "digest-unavailable": () => "Ce navigateur ne peut pas vérifier l'empreinte du catalogue (page non sécurisée ?) : rien n'est repris sans cette vérification.",
};

export function refusalMessage(code, detail) {
  return MESSAGES[code]?.(detail) ?? "Ce fichier ne peut pas être lu.";
}
