# Sites simplification — lumnik.fr, lumnik.io and the scenario catalogue

**Date:** 2026-10-25
**Status:** validated in conversation (Sergey: hero, dossier, catalogue, "go, review in the PRs")

## Purpose

The integrator docs went through a "driver, not mechanic" pass: short sentences, one idea each,
real outputs. The two institutional sites get the same pass. Today they are a long explanation
of what lumnik is. Since then lumnik has 47 replayed scenarios: they explain it better.

The visitor's path becomes three steps:

1. **Understand in ten seconds** — why I need lumnik.
2. **See it in my business** — a replayed scenario.
3. **Try it** — install lumnik Open, alone, for free.

No demo is offered for now. The contact form stays, for questions, prices and partners.

## Writing rules

- One idea per sentence. Subject, verb, complement. A list rather than a sentence of commas.
- The mechanism, never the virtue. No "honest", "zero risk", "real time", "forever".
- Business examples first. A scenario link is the proof of a claim.
- Only real outputs: the P-1008 record (`donnees/p1008.json`), the `up.sh` lines of the docs'
  deploy page, the scenarios' own titles.
- French typography: U+202F before `;` `!` `?`, U+00A0 before `:` `%`.

## Information architecture

### lumnik.fr

| File | Role |
|---|---|
| `index.html` | home: hero + four sections |
| `scenarios/` | the catalogue (publication artefact of `lumnik-scenario`) |
| `essai.html` | install lumnik Open, step by step — the sandbox form goes |
| `offre.html` | Hub (Open, free) · Pro · Enterprise, then the contact form |
| `architecture.html` | "Sécurité": the guarantees a DSI can check, with their links |
| `pourquoi.html` | the manifesto and the name (footer) |
| `mentions.html` | legal notice (footer) |
| `dossier.html` | stays served, **linked from nowhere** (Sergey's call) |

Relays (GitHub Pages cannot redirect server-side; same pattern as #15):
`produit.html` → `index.html`, `situations.html` → `scenarios/`, `pour-qui.html` → `index.html`,
`gel.html` → `pourquoi.html`, `degel.html` → `index.html`, `mouvement.html` → `scenarios/`.
The home carries the old fragments it can answer: `comment`, `faits`, `sens`, `temps`,
`direction`, `dsi`, `integrateurs`.

Deleted: `heros-a.html`, `heros-b.html`. The five-second test never ran and the hero changes.

Navigation: `Scénarios · Sécurité · Offre · Docs` and the light pill **Essayer**.
Footer: `Scénarios · Essayer · Pourquoi lumnik · Documentation · Mentions légales`.

### lumnik.io

The same skeleton, composed natively in English (never a translation):
`index.html`, `scenarios/`, `try.html` (new), `editions.html` (new), `architecture.html`
("Security"), `why.html` (new, footer), `contact.html`, `legal.html`.
Relays: `freeze.html` → `why.html`, `thaw.html` → `index.html`, `motion.html` → `scenarios/`.
Navigation: `Scenarios · Security · Editions · Docs` and the pill **Try it**.

The English site never got the theses pass. These claims go, because they are false or were
ruled out on the French site: "every answer cites its sources" and its invented conversation,
"EU cloud", "real cases… each exists today", "queryable forever", "zero-risk", "the audit trail
cannot be erased" (a retention purge runs at 365 days), the invented `quote_unmoved` payload,
"Book a walkthrough".

## The home page

1. **Hero.** Eyebrow « La couche de lecture de vos logiciels ».
   H1 « Vos logiciels restent en place. Vos données se remettent au travail. »
   (EN « Your software stays put. Your data gets back to work. »)
   One sentence: lumnik reads ERP, exports and APIs without writing to them, merges their data,
   repairs the exports (transformers act on file exports only), serves it all to teams and tools. Chips: lecture seule · installé chez vous · open
   source. Buttons: « Voir les scénarios » (primary), « Essayer lumnik Open ». Visual: the P-1008
   record, Lyon ≠ Villeurbanne, as today.
2. **Vous reconnaissez ?** (`#situations`) Six scenario cards: the family as kicker, the
   scenario's own title (pinned to `scenarios/index.json`), one line of what it shows, the
   edition badge. `dirty-order-statuses`, `entity-resolution`, `export-that-lies`,
   `orders-where-they-sleep`, `zombie-cmms`, `purchasing-ask-abstains` (Pro). Then « Tous les
   scénarios ».
3. **Comment** (`#comment`). Five moves, one line each: Lire · Réparer · Rassembler ·
   Surveiller · Servir. Then the conservation line: read = written + set aside.
4. **Essayer** (`#essayer`). The two real commands and the `up.sh` result, what Open does,
   what Pro adds, a link to `essai.html`.
5. **Confiance** (`#confiance`). Four checkable guarantees, the beta badge, Apache-2.0, then
   three doors: métiers → scenarios, DSI → security, integrators → integration as code.

## The scenario catalogue (`lumnik-scenario/tools/scenario-site`)

- Grouped by **seven families of problems**, in this order: repair an export · read an old
  format · bring systems together · lose nothing in silence · see what stopped moving, and act ·
  serve teams and their tools · ask your data. Each family has one line of description.
- A card shows the title, the edition ribbon and the business tags. The technical kinds and the
  long lede leave the card (they stay on the scenario page).
- The head of the catalogue counts the scenarios and the Open ones, with a link to try Open.
- The family of each slug is a table in the publisher. **An offered slug without a family is
  refused**: a new scenario must be placed.
- Every scenario page ends with one block: « Ce scénario tourne sur lumnik Open » → Essayer, or
  « Ce scénario demande lumnik Pro » → Offre. The copy and links are the site's, passed by the
  publisher; the shared page renders nothing without them (the preview).

## Tests

Each site's `tests/site_structure_test.py` is rewritten first, then the pages:
pages and relays, navigation and current page, one h1, canonical and metadata, links and
fragments, the P-1008 values, the scenario cards against `scenarios/index.json`, the real
commands, the guarantees (with the 365-day purge), the beta link, no link to `dossier.html`,
and the forbidden wordings — now including the demo CTAs.
The publisher's `test_publish_site.py` covers the families, the refusal and the closing block.
Rendering is checked in Chrome at desktop width and at 390 px.

## Out of scope

- Prices, the partner programme, the sandbox.
- Purging dead CSS (`.console-*` and the sections this pass removes): a later, separate change.
- `docs.lumnik.io`: its home still says answers "cite their sources" — to fix in the monorepo.

## Delivery

1. The publisher change, committed on the laboratory's `main` (it has no remote).
2. PR on `icreated/lumnik-site`, then on `icreated/lumnik-site-en`.
3. After both merges: republish the scenarios (two PRs) — the closing block links to pages
   these PRs create.
