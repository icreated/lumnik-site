# Homepage Narrative Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the French homepage’s right-column customer card with an accessible, full-width three-slide narrative carousel beneath a shortened hero.

**Architecture:** `index.html` owns semantic carousel markup and the no-JavaScript first-slide fallback; `styles.css` owns the responsive visual stage and reduced-motion states. A page-specific ES module, `carousel.mjs`, owns navigation, autoplay and swipe behavior while exporting its pure index/swipe decisions for Node tests.

**Tech Stack:** Static HTML, CSS, native ES modules, Node `node:test`, Python `unittest`

**Spec:** `docs/superpowers/specs/2026-11-22-homepage-carousel-design.md`

## Global Constraints

- Use HTML, CSS and JavaScript only; add no Bootstrap or other dependency.
- Use the approved FR images `slide-01-entites-metier-v2.png`, `slide-02-kinds-tuyauterie-v3.png`, and `slide-03-metier-plusieurs-sorties-v2.png` without rewriting them.
- Keep the existing hero promise, proof pills, CTAs and every section following the hero.
- Keep every PNG whole at 16:9; never crop labels with `object-fit: cover`.
- Autoplay interval is 8,000 ms and stops permanently after hover, focus or deliberate navigation.
- `prefers-reduced-motion: reduce` disables autoplay and animated transitions.
- Do not modify the English site.

## Review Focus

- JavaScript unavailable: slide 1, its caption and the hero actions remain readable; Task 1 pins the markup/CSS fallback.
- Narrow mobile viewport: the complete 16:9 image remains visible and controls do not overlap its text; Task 1 pins the aspect/contain contract and visual verification.
- Keyboard or assistive technology: controls expose their target/state and slide changes are announced without moving focus; Tasks 1 and 2 pin ARIA structure and state updates.
- Reduced-motion preference: no autoplay starts and slide changes have no animated transition; Task 2 pins the policy function and CSS media query.
- Repeated manual navigation or swipe at either end: indices wrap within `0..2`, and a short accidental drag does nothing; Task 2 pins both pure decisions.

---

### Task 1: Semantic hero and responsive visual stage

**Files:**
- Modify: `tests/site_structure_test.py`
- Modify: `index.html`
- Modify: `styles.css`
- Use: `images/fr/slide-01-entites-metier-v2.png`
- Use: `images/fr/slide-02-kinds-tuyauterie-v3.png`
- Use: `images/fr/slide-03-metier-plusieurs-sorties-v2.png`

**Interfaces:**
- Consumes: the three approved PNG files and existing `.heros`, `.heros-preuves`, `.heros-ctas` styles.
- Produces: one `[data-carousel]` root containing `[data-carousel-track]`, three `[data-carousel-slide]` figures, `[data-carousel-prev]`, `[data-carousel-next]`, and three `[data-carousel-dot]` buttons for Task 2.

- [ ] **Step 1: Write the failing homepage structure tests**

Add `test_homepage_hero_has_the_three_slide_accessible_carousel` asserting exact image order, one eager first image, two `loading="lazy"` images, three figures, previous/next buttons, three dot buttons, and an `aria-live="polite"` caption/status region. Add `test_carousel_first_slide_is_the_no_javascript_fallback` asserting slide 1 lacks `hidden` while slides 2 and 3 carry `hidden` in source order.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `python3 -m unittest tests.site_structure_test.SiteStructureTest.test_homepage_hero_has_the_three_slide_accessible_carousel tests.site_structure_test.SiteStructureTest.test_carousel_first_slide_is_the_no_javascript_fallback -v`

Expected: FAIL because `index.html` still contains `.heros-fiche` and no carousel contract.

- [ ] **Step 3: Replace the hero grid/card with semantic carousel markup**

Keep the existing H1, supporting sentence, proof list and CTA labels. Change `.heros-grille` to a single-column content flow and add the Task 1 `data-*` interface. Give each figure a concise French `figcaption`; set meaningful French `alt` text; set `width="1672" height="941"`; add `fetchpriority="high"` only to slide 1; add `loading="lazy"` to slides 2 and 3. Add `<script type="module" src="carousel.mjs"></script>` after the existing `site.js` script on `index.html` only.

- [ ] **Step 4: Add the responsive visual stage styles**

Create `.heros-carrousel`, track, slide, caption, controls, arrows and dot styles. Use `aspect-ratio: 1672 / 941`, `width: 100%`, `height: auto`, and `object-fit: contain`; hide inactive `[hidden]` slides; keep controls outside the image’s information area. Under `880px`, preserve the image ratio and allow compact captions/controls. Under `prefers-reduced-motion: reduce`, set carousel transition/scroll animation to `none`.

- [ ] **Step 5: Run focused and full structure tests**

Run: `python3 -m unittest tests.site_structure_test.SiteStructureTest.test_homepage_hero_has_the_three_slide_accessible_carousel tests.site_structure_test.SiteStructureTest.test_carousel_first_slide_is_the_no_javascript_fallback -v && python3 -m unittest tests.site_structure_test -v`

Expected: PASS.

- [ ] **Step 6: Commit the semantic stage**

```bash
git add index.html styles.css tests/site_structure_test.py images/fr docs/superpowers/specs/2026-11-22-homepage-carousel-design.md
git commit -m "feat: add homepage narrative carousel stage"
```

### Task 2: Navigation, autoplay and touch behavior

**Files:**
- Create: `carousel.mjs`
- Create: `tests/js/carousel.test.mjs`
- Modify: `styles.css`

**Interfaces:**
- Consumes: Task 1’s `data-carousel*` elements.
- Produces: `wrapIndex(index: number, delta: number, count: number): number`, `swipeDelta(startX: number, endX: number, threshold?: number): -1 | 0 | 1`, `allowsAutoplay(reducedMotion: boolean): boolean`, and `initCarousel(root: HTMLElement, options?: { intervalMs?: number }): () => void`.

- [ ] **Step 1: Write failing pure behavior tests**

Create tests asserting `wrapIndex(0, -1, 3) === 2`, `wrapIndex(2, 1, 3) === 0`, all results remain within `0..count-1`, `swipeDelta(100, 20) === 1`, `swipeDelta(20, 100) === -1`, drags under the 48 px default threshold return `0`, and `allowsAutoplay(true) === false` / `allowsAutoplay(false) === true`.

- [ ] **Step 2: Run the module test and verify failure**

Run: `node --test tests/js/carousel.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `carousel.mjs`.

- [ ] **Step 3: Implement the pure navigation decisions**

Add the four exported signatures above. `wrapIndex` must reject `count < 1` with `RangeError`; `swipeDelta` uses a 48 px threshold and maps a leftward swipe to next (`1`); `allowsAutoplay` returns false only for reduced motion.

- [ ] **Step 4: Run the pure tests**

Run: `node --test tests/js/carousel.test.mjs`

Expected: PASS.

- [ ] **Step 5: Implement `initCarousel` against Task 1’s markup**

On initialization, keep one slide exposed, update dot `aria-current`, update the polite caption/status, and bind previous/next, dot, Left/Right arrow and pointer swipe navigation. Start an 8,000 ms timer only when motion is allowed. Hover, focus within, pointer navigation or button/keyboard navigation calls one permanent `stopAutoplay`; return a cleanup function that clears the timer and listeners. Auto-initialize every `[data-carousel]` root only when `document` exists so Node imports remain safe.

- [ ] **Step 6: Add runtime-contract source assertions**

Extend `tests/js/carousel.test.mjs` to read `index.html` and assert the module script is page-specific, and read `carousel.mjs` to assert the runtime requests `matchMedia("(prefers-reduced-motion: reduce)")`, uses `8000`, updates `aria-current`, handles `ArrowLeft`/`ArrowRight`, and binds pointer events.

- [ ] **Step 7: Run all JavaScript and structure tests**

Run: `node --test tests/js/*.test.mjs && python3 -m unittest tests.site_structure_test -v`

Expected: PASS.

- [ ] **Step 8: Commit the carousel behavior**

```bash
git add carousel.mjs tests/js/carousel.test.mjs styles.css index.html
git commit -m "feat: make homepage carousel accessible"
```

### Task 3: Browser verification and polish

**Files:**
- Modify if required by observed defects: `index.html`, `styles.css`, `carousel.mjs`, their owning tests

**Interfaces:**
- Consumes: Tasks 1 and 2’s complete carousel.
- Produces: visually verified desktop/mobile/no-motion behavior with no regression to the following homepage sections.

- [ ] **Step 1: Serve the site locally and inspect desktop**

Run: `python3 -m http.server 4173`

Open `http://127.0.0.1:4173/` at a desktop viewport. Verify the first image is visible without scrolling past the hero copy, no PNG text is cropped, all controls work, autoplay advances after 8 seconds, hover/focus stops it permanently, and sections after the hero retain their layout.

- [ ] **Step 2: Inspect mobile and keyboard paths**

At a 390 px viewport, verify the complete image remains visible, captions and controls do not overlap labels, horizontal swipe changes one slide, and keyboard focus/Left/Right navigation remains visible and ordered.

- [ ] **Step 3: Inspect reduced motion and no-JavaScript fallback**

Emulate reduced motion and verify no autoplay or animated transition. Disable JavaScript and verify slide 1, its caption, hero promise, proofs and CTAs remain visible.

- [ ] **Step 4: Fix only defects observed in Steps 1–3 and rerun owning tests**

For each defect, first add or tighten the smallest owning assertion, observe failure, make the surgical correction, then rerun that focused test.

- [ ] **Step 5: Run the final gate**

Run: `node --test tests/js/*.test.mjs && python3 -m unittest tests.site_structure_test -v && git diff --check`

Expected: all tests PASS and `git diff --check` emits no output.

- [ ] **Step 6: Commit visual polish if Step 4 changed files**

```bash
git add index.html styles.css carousel.mjs tests
git commit -m "fix: polish homepage carousel presentation"
```
