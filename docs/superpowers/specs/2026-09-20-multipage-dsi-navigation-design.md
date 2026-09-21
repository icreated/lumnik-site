# Multipage DSI navigation design

**Date:** 2026-09-20  
**Status:** validated in conversation, pending final document review

## Purpose

Restructure the lumnik marketing site around a short, comprehensible journey for a DSI. Preserve the existing visible copy and visual identity while replacing the overloaded single-page experience with focused thematic pages.

The site must introduce **Gel** as lumnik's diagnosis: the systems still work and still contain value, but their facts, meaning, and time no longer circulate well enough to support action. **Dégel** is the progressive, read-only process that restores that movement without forcing system replacement.

The story must remain positive. It does not create fear around aging infrastructure. It gives the DSI confidence that the existing estate can remain useful for a long time.

## Audience and message

The primary reader is a DSI managing valuable systems that are difficult or risky to replace. Executives remain indirect beneficiaries, not the main narrative target.

The central promise is:

> Your infrastructure still has value. lumnik restores movement to what it knows without weakening it or imposing a replacement deadline.

The term *gel* describes blocked circulation between information and action, not a dead, defective, or obsolete system.

## Information architecture

The primary navigation is:

- **Gel**
- **Dégel**
- **Usages**
- **Architecture**
- **Offre**
- **Essai**
- **Nous parler**

`Gel` and `Dégel` deliberately omit articles. They are first-class lumnik concepts rather than conventional section labels.

The logo returns to the home page. `Essai` and `Nous parler` remain visually identifiable actions. `Nous parler` leads directly to the contact form on the Offre page.

The files are:

```text
/
├── index.html
├── gel.html
├── degel.html
├── usages.html
├── architecture.html
├── offre.html
└── essai.html
```

Legal notices remain in `mentions.html`.

## Reading journey

The intended sequence is:

```text
Recognize Gel → Understand Dégel → See what it unlocks → Verify the architecture → Start safely
```

Visitors may enter at any thematic page through search or a direct link. Every page must therefore retain the common navigation, enough context to identify lumnik, and a clear next action.

## Existing content allocation

Visible copy is moved, not rewritten. Blocks may be separated when that improves hierarchy, but their wording remains unchanged.

| Destination | Existing content |
|---|---|
| **Accueil** | Hero, overall source-to-hub-to-output diagram, essential proof points, final manifesto |
| **Gel** | “Le congélateur” problem section and comparison with BI, ERP migration, and generic chatbot approaches |
| **Dégel** | Three gestures, sourced-answer demonstration, temporal memory, adapter, and events |
| **Usages** | The five concrete use cases |
| **Architecture** | Technical diagram, console preview, architecture commitments, open-source code, and documentation |
| **Offre** | Three reader profiles, Hub/Pro/Enterprise tiers, and contact form |
| **Essai** | Existing trial page, kept separate |

Anxiety-bearing examples such as departing experts, dormant quotes, or “zombie” systems remain in detailed use cases rather than the home-page path. Each is immediately paired with its constructive Dégel outcome.

## Home page

The home page introduces the category rather than proving every claim. Its job is to let a DSI understand lumnik in roughly 60–90 seconds and choose the appropriate depth.

Its hierarchy is:

1. Name the Gel.
2. State that lumnik restores movement without writing to source systems.
3. Show the source → lumnik → métier flow.
4. Surface essential trust signals: read-only, installed on the customer's infrastructure, sourced answers, reversibility.
5. Direct the reader to Gel, Dégel, Architecture, Usages, or a first conversation.
6. Close with the existing manifesto.

No alarmist message appears in this primary path.

## Local navigation

The global menu has no dropdown or mega-menu. Longer thematic pages use a small local table of contents under their title:

- **Dégel:** Faits · Sens · Temps · Adaptateur
- **Architecture:** Vue d'ensemble · Garde-fous · Déploiement · Code & documentation
- **Usages:** Industrie · Négoce · Services · Secteur public

On mobile, the local table of contents becomes a horizontally scrollable row. It does not create nested mobile menus.

## Visual and interaction principles

The existing visual identity remains intact:

- glacial night crossed by one warm yellow light;
- Fraunces for editorial headings;
- Archivo for body copy;
- IBM Plex Mono for technical labels;
- restrained motion with `prefers-reduced-motion` support.

The visual hierarchy becomes quieter because every page has one job. The site must not compensate for shorter pages by adding decorative cards or motion.

The existing Dégel progress bar measures reading progress independently on each page. Scroll reveals remain. The global navigation marks the current page visibly and accessibly.

On mobile, the currently hidden navigation becomes an operable menu with:

- an explicit button;
- a correct `aria-expanded` state;
- keyboard operation;
- closure with `Escape`;
- closure after choosing a destination.

Local navigation uses ordinary anchors and requires no complex client-side routing.

## Implementation boundaries

The site remains static and build-free:

- shared `styles.css`;
- shared `site.js`;
- separate semantic HTML pages;
- no framework;
- no templating or build step;
- only the JavaScript necessary for existing interactions and the accessible mobile menu.

Navigation duplication across the small set of static pages is accepted. Introducing a build system only to deduplicate it would violate the site's simplicity.

Each page receives its own title, description, canonical URL, and active navigation state. Existing external links to documentation and source code remain unchanged.

## Verification

Before completion:

1. Confirm that every existing visible content block appears exactly once in the new page structure unless deliberate repetition is documented.
2. Check every global link, local anchor, footer link, trial link, documentation link, repository link, and contact target.
3. Verify the active-page indication and skip link on every page.
4. Verify desktop and mobile navigation with mouse, keyboard, and `Escape`.
5. Verify layouts at phone, tablet, and desktop widths.
6. Verify `prefers-reduced-motion` behavior.
7. Confirm page-specific title, description, and canonical metadata.
8. Confirm that the Formspree form fields and endpoint are preserved.
9. Check that no visible copy was accidentally lost or rewritten during movement.
10. Serve the site locally and inspect all pages visually before delivery.

## Explicit non-goals

- Rewriting or shortening the existing visible copy.
- Changing the established visual identity.
- Adding a framework, CMS, bundler, or client-side router.
- Creating fear around legacy systems or presenting replacement as inevitable.
- Adding new product claims, prices, or technical promises.
