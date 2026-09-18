# Gel → Dégel → Mouvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the French and English marketing sites around Gel → Dégel → Mouvement while preserving legacy systems as the commercial wedge.

**Architecture:** Keep both sites as independent static HTML/CSS repositories. Restructure copy in each `index.html` around a shared Facts · Meaning · Time model, while giving French and English distinct market-appropriate voices; change CSS only when the revised hierarchy requires it.

**Tech Stack:** Static HTML5, CSS, vanilla JavaScript, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-18-gel-degel-positioning-design.md`

## Global Constraints

- Use the canonical signature exactly: `Defrost the enterprise.`
- Treat legacy systems as a cause of frozen operations, not the definition of the market.
- Keep temporal claims observation-relative; do not claim source history or real-time operation.
- Preserve read-only, grounded-answer, controlled-deployment, and reversibility proofs.
- Do not make the French and English pages literal translations.
- Do not add frameworks, dependencies, or a build step.

---

### Task 1: Reframe the French commercial story

**Files:**
- Modify: `index.html`
- Modify only if required: `styles.css`

**Interfaces:**
- Consumes: the existing section anchors, visual classes, and static navigation.
- Produces: the primary plain-language Gel → Dégel → Mouvement narrative and shared positioning vocabulary.

- [ ] Rewrite the metadata, hero, and problem framing so the inability to move operational knowledge into decisions leads, with legacy ERP, spreadsheets, and fragmented modern tools presented as causes.
- [ ] Align the explanatory center to Facts · Meaning · Time using plain French labels, concrete user outcomes, and observation-relative temporal language.
- [ ] Remove repetition, demote CLI detail below user value, connect the adapter section to restored movement, and close with the exact canonical signature.
- [ ] Verify HTML parsing, JavaScript syntax, navigation fragments, local links, and the canonical signature.
- [ ] Inspect the page at desktop and narrow mobile widths, then commit the French implementation.

### Task 2: Reframe the English international story

**Files:**
- Modify: `../lumnik-site-en/index.html`
- Modify only if required: `../lumnik-site-en/styles.css`

**Interfaces:**
- Consumes: the approved positioning spec and the English site's existing market examples.
- Produces: a distinct English expression of Freeze → Thaw → Flow using Facts · Meaning · Time.

- [ ] Lead with frozen operational knowledge, retain North American system examples as evidence, and use technical vocabulary only where it increases trust.
- [ ] Explain recovery of stored facts, declaration of business meaning, and reconstruction of observed time without translating the French prose literally.
- [ ] Keep the public docs and open-source proof, connect modern-tool integration to restored flow, and close with the exact canonical signature.
- [ ] Verify HTML parsing, JavaScript syntax, navigation fragments, local links, and the canonical signature.
- [ ] Inspect the page at desktop and narrow mobile widths, then commit the English implementation.

### Task 3: Cross-language review and pull requests

**Files:**
- Review: `index.html`
- Review: `../lumnik-site-en/index.html`

**Interfaces:**
- Consumes: both completed site narratives.
- Produces: two independently reviewable GitHub pull requests with shared strategic intent.

- [ ] Confirm that both pages express Freeze/Gel, Thaw/Dégel, Flow/Mouvement, and Facts/Meaning/Time while preserving different examples and tones.
- [ ] Run `git diff --check main...HEAD` and inspect the final diff in each repository.
- [ ] Push both positioning branches and create PRs describing the shared model, deliberate FR/EN differences, verification performed, and review points for Claude.
