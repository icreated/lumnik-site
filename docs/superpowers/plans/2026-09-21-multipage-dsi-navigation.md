# Multipage DSI Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the overloaded French single-page marketing site into a DSI-first static multipage site organized around Gel, Dégel, Usages, Architecture, and Offre without rewriting the existing visible copy.

**Architecture:** Keep the site build-free and share the existing `styles.css` and `site.js` across semantic HTML pages. Move existing section blocks to focused pages, keep the home page as the short category introduction, and add one accessible global mobile menu plus plain-anchor local navigation.

**Tech Stack:** Static HTML5, CSS, vanilla JavaScript, Python 3 standard-library structural tests, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-20-multipage-dsi-navigation-design.md`

## Global Constraints

- The primary reader is a DSI; executives remain indirect beneficiaries.
- `Gel` describes information that no longer circulates into action, not a dead or defective system.
- Keep the story positive: the existing infrastructure still has value and may remain useful for a long time.
- Preserve the existing visible copy; move it without rewriting or shortening it.
- Preserve the existing visual identity, fonts, restrained motion, and `prefers-reduced-motion` support.
- Keep the site static and build-free: no framework, CMS, bundler, templating layer, or client-side router.
- Retain the existing Formspree endpoint and fields, documentation URL, repository URL, and legal-notice page.
- Use the global navigation labels exactly: `Gel`, `Dégel`, `Usages`, `Architecture`, `Offre`, `Essai`, `Nous parler`.
- Use shared `styles.css` and `site.js`; add only the JavaScript required for the accessible mobile menu.

## File map

- `index.html` — short category introduction: hero, global diagram, essential proof points, manifesto.
- `gel.html` — the frozen-circulation diagnosis and comparison with conventional alternatives.
- `degel.html` — facts, meaning, time, sourced answers, adapter, and events.
- `usages.html` — the five existing concrete use cases.
- `architecture.html` — architecture diagram, console preview, commitments, source code, and documentation.
- `offre.html` — personas, Hub/Pro/Enterprise tiers, and contact form.
- `essai.html` — existing trial page with the shared global navigation.
- `mentions.html` — existing legal page with the shared global navigation/footer treatment where applicable.
- `styles.css` — shared page-header, active navigation, local navigation, and mobile-menu presentation.
- `site.js` — existing progress/reveal behaviors plus the accessible mobile-menu state machine.
- `tests/site_structure_test.py` — standard-library regression tests for page inventory, navigation, anchors, metadata, and unique ownership of moved sections.

---

### Task 1: Establish the multipage structural contract

**Files:**
- Create: `tests/site_structure_test.py`

**Interfaces:**
- Consumes: HTML pages in the repository root.
- Produces: `SitePage`, `load_page(name)`, and structural regression tests used by every later task.

- [ ] **Step 1: Create the failing page-inventory and navigation tests**

Implement a standard-library parser and initial tests with these exact constants and interfaces:

```python
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGES = (
    "index.html",
    "gel.html",
    "degel.html",
    "usages.html",
    "architecture.html",
    "offre.html",
    "essai.html",
)
ALL_PAGES = PAGES + ("mentions.html",)
NAV_LABELS = (
    "Gel",
    "Dégel",
    "Usages",
    "Architecture",
    "Offre",
    "Essai",
    "Nous parler",
)

class SitePage(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []
        self.nav_text = []
        self._inside_nav = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag == "a" and "href" in attrs:
            self.links.append(attrs["href"])
        if tag == "nav":
            self._inside_nav = True

    def handle_endtag(self, tag):
        if tag == "nav":
            self._inside_nav = False

    def handle_data(self, data):
        if self._inside_nav and data.strip():
            self.nav_text.append(data.strip())

def load_page(name):
    page = SitePage()
    page.feed((ROOT / name).read_text(encoding="utf-8"))
    return page

class SiteStructureTest(unittest.TestCase):
    def test_expected_pages_exist(self):
        for name in ALL_PAGES:
            with self.subTest(name=name):
                self.assertTrue((ROOT / name).is_file())

    def test_every_page_exposes_the_global_navigation(self):
        for name in ALL_PAGES:
            page = load_page(name)
            text = " ".join(page.nav_text)
            with self.subTest(name=name):
                for label in NAV_LABELS:
                    self.assertIn(label, text)
```

- [ ] **Step 2: Run the new tests and verify the intended failure**

Run:

```bash
python3 -m unittest tests/site_structure_test.py -v
```

Expected: `test_expected_pages_exist` fails for `gel.html`, `degel.html`, `usages.html`, `architecture.html`, and `offre.html`; the navigation test also fails against the current labels.

- [ ] **Step 3: Add local-link and section-ownership tests**

Extend `SiteStructureTest` with:

```python
    def test_local_html_links_and_fragments_resolve(self):
        for source_name in ALL_PAGES:
            source = load_page(source_name)
            for href in source.links:
                if href.startswith(("http://", "https://", "mailto:", "#")):
                    target_name = source_name
                    fragment = href[1:] if href.startswith("#") else ""
                elif ".html" in href:
                    target, _, fragment = href.partition("#")
                    target_name = target
                else:
                    continue
                with self.subTest(source=source_name, href=href):
                    self.assertTrue((ROOT / target_name).is_file())
                    if fragment:
                        self.assertIn(fragment, load_page(target_name).ids)

    def test_moved_sections_have_one_owner(self):
        owners = {
            "probleme": "gel.html",
            "comment": "degel.html",
            "temps": "degel.html",
            "adaptateur": "degel.html",
            "cas": "usages.html",
            "architecture": "architecture.html",
            "pour-qui": "offre.html",
            "offre": "offre.html",
            "contact": "offre.html",
        }
        parsed = {name: load_page(name) for name in PAGES}
        for section_id, owner in owners.items():
            found = [name for name, page in parsed.items() if section_id in page.ids]
            with self.subTest(section_id=section_id):
                self.assertEqual([owner], found)
```

- [ ] **Step 4: Run the suite and retain the failure as the implementation contract**

Run: `python3 -m unittest tests/site_structure_test.py -v`

Expected: failures identify missing pages, old navigation labels, unresolved future ownership, and any current `#contact` links that will need cross-page destinations.

- [ ] **Step 5: Commit the test contract**

```bash
git add tests/site_structure_test.py
git commit -m "test: define the multipage site contract"
```

### Task 2: Split the existing narrative into focused pages

**Files:**
- Modify: `index.html`
- Create: `gel.html`
- Create: `degel.html`
- Create: `usages.html`
- Create: `architecture.html`
- Create: `offre.html`
- Modify: `essai.html`
- Modify: `mentions.html`

**Interfaces:**
- Consumes: `PAGES`, `NAV_LABELS`, the section ownership map from Task 1, and the existing section markup in `index.html`.
- Produces: seven public marketing pages sharing one global-navigation contract and resolving all local links.

- [ ] **Step 1: Capture a pre-split content inventory**

Before editing `index.html`, record the section boundaries and SHA-256 hashes of their exact source markup in a temporary file:

```bash
python3 - <<'PY'
from hashlib import sha256
from pathlib import Path
import re

source = Path("index.html").read_text(encoding="utf-8")
for section_id in ("probleme", "comment", "temps", "adaptateur", "cas", "architecture", "pour-qui", "doc", "offre", "manifeste", "contact"):
    match = re.search(rf'<section\b[^>]*\bid="{section_id}"[\s\S]*?</section>', source)
    if not match:
        raise SystemExit(f"missing section: {section_id}")
    print(section_id, sha256(match.group(0).encode()).hexdigest())
PY
```

Save the command output outside the repository at `/tmp/lumnik-site-section-hashes-before.txt`. Do not add that temporary file to Git.

- [ ] **Step 2: Create the common page shell**

For each new page, copy the existing document head, skip link, progress bar, navigation wrapper, `<main id="contenu">`, footer, and `site.js` include. Use relative `.html` links in every global navigation:

```html
<a class="logo" href="index.html">lumnik<span class="dot" aria-hidden="true"></span></a>
<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="menu-principal">
  <span class="menu-toggle-label">Menu</span>
</button>
<ul id="menu-principal">
  <li><a href="gel.html">Gel</a></li>
  <li><a href="degel.html">Dégel</a></li>
  <li><a href="usages.html">Usages</a></li>
  <li><a href="architecture.html">Architecture</a></li>
  <li><a href="offre.html#offre">Offre</a></li>
  <li><a href="essai.html">Essai</a></li>
  <li><a class="btn btn-lumiere nav-contact" href="offre.html#contact">Nous parler</a></li>
</ul>
```

Do not add dropdowns or a mega-menu.

- [ ] **Step 3: Reduce `index.html` to the category introduction**

Keep the existing hero, `hero-schema`, essential proof lines, and `#manifeste`. Move every other owned section to its destination page. Keep the home page's contact actions but change their destinations to `offre.html#contact`; change “Voir comment ça marche” to point to `degel.html` without changing its visible label.

- [ ] **Step 4: Populate `gel.html` and `degel.html` with unchanged blocks**

Move these exact sections:

- `#probleme` and `.comparaison` to `gel.html`; give the comparison section `id="comparaison"` without altering its visible copy.
- `#comment`, `#temps`, and `#adaptateur` to `degel.html`.

Add a page-local navigation immediately after the Dégel page introduction:

```html
<nav class="local-nav" aria-label="Dans Dégel">
  <a href="#faits">Faits</a>
  <a href="#sens">Sens</a>
  <a href="#temps">Temps</a>
  <a href="#adaptateur">Adaptateur</a>
</nav>
```

Add `id="faits"` and `id="sens"` to the corresponding existing gesture containers; do not change their paragraphs or headings.

- [ ] **Step 5: Populate `usages.html`, `architecture.html`, and `offre.html`**

Move these exact blocks:

- `#cas` to `usages.html` and add stable IDs `industrie`, `negoce`, `services`, and `secteur-public` to the relevant existing cards.
- `#architecture` and `#doc` to `architecture.html`.
- `#pour-qui`, `#offre`, and `#contact` to `offre.html`.

Add local navigation using only anchors to those IDs:

```html
<nav class="local-nav" aria-label="Dans Usages">
  <a href="#industrie">Industrie</a>
  <a href="#negoce">Négoce</a>
  <a href="#services">Services</a>
  <a href="#secteur-public">Secteur public</a>
</nav>
```

```html
<nav class="local-nav" aria-label="Dans Architecture">
  <a href="#vue-ensemble">Vue d'ensemble</a>
  <a href="#garde-fous">Garde-fous</a>
  <a href="#deploiement">Déploiement</a>
  <a href="#doc">Code &amp; documentation</a>
</nav>
```

Attach `vue-ensemble`, `garde-fous`, and `deploiement` to the closest existing architecture containers without altering their visible text.

- [ ] **Step 6: Update shared navigation on `essai.html` and `mentions.html`**

Use the same global link targets and labels. Preserve the trial form, legal copy, Formspree endpoint, and all existing fields verbatim.

- [ ] **Step 7: Run the structural suite**

Run: `python3 -m unittest tests/site_structure_test.py -v`

Expected: page inventory, global navigation, local links, and unique section ownership pass. If a test fails, correct the markup or contract; do not weaken the expected page inventory or ownership.

- [ ] **Step 8: Verify content conservation against the snapshot**

Re-run the Step 1 hashing logic against the destination page named in the spec. The source markup may differ only where an `id` was added or a cross-page `href` was corrected. Inspect each such difference directly with `git diff --word-diff`; visible sentences must remain unchanged.

- [ ] **Step 9: Commit the page split**

```bash
git add index.html gel.html degel.html usages.html architecture.html offre.html essai.html mentions.html
git commit -m "site: split the DSI journey into focused pages"
```

### Task 3: Implement accessible global and local navigation

**Files:**
- Modify: `styles.css`
- Modify: `site.js`
- Modify: `tests/site_structure_test.py`

**Interfaces:**
- Consumes: `.menu-toggle`, `#menu-principal`, `.local-nav`, and the global links created in Task 2.
- Produces: a keyboard-operable mobile menu and responsive local navigation; `site.js` keeps the existing progress/reveal behavior.

- [ ] **Step 1: Add failing navigation-accessibility assertions**

Extend the parser to capture button attributes and add tests asserting that each public page includes exactly one button with `aria-controls="menu-principal"` and `aria-expanded="false"`, and exactly one navigation list with `id="menu-principal"`. Add a source assertion that `site.js` contains handlers for `click` and `Escape` and updates `aria-expanded`.

```python
    def test_mobile_menu_contract_is_present(self):
        for name in ALL_PAGES:
            html = (ROOT / name).read_text(encoding="utf-8")
            with self.subTest(name=name):
                self.assertEqual(1, html.count('aria-controls="menu-principal"'))
                self.assertEqual(1, html.count('id="menu-principal"'))
                self.assertIn('aria-expanded="false"', html)

    def test_mobile_menu_script_supports_keyboard_close(self):
        script = (ROOT / "site.js").read_text(encoding="utf-8")
        self.assertIn('event.key === "Escape"', script)
        self.assertIn('setAttribute("aria-expanded"', script)
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```bash
python3 -m unittest \
  tests.site_structure_test.SiteStructureTest.test_mobile_menu_contract_is_present \
  tests.site_structure_test.SiteStructureTest.test_mobile_menu_script_supports_keyboard_close -v
```

Expected: the script test fails because the mobile-menu behavior does not yet exist.

- [ ] **Step 3: Implement the minimal menu state machine in `site.js`**

Append behavior that:

- selects `.menu-toggle` and `#menu-principal`;
- toggles a `menu-open` class on the containing `nav`;
- updates `aria-expanded` with the string value of the open state;
- closes after a menu link is selected;
- closes on `Escape` and returns focus to the button.

Keep the existing thermometer and reveal observer intact. Guard every menu operation so pages without the controls fail harmlessly.

- [ ] **Step 4: Add the responsive CSS**

Replace the rule that simply hides `nav ul` below `780px`. At desktop widths, hide `.menu-toggle`. Below `780px`:

- show `.menu-toggle` with a visible focus state;
- keep `#menu-principal` hidden until the parent `nav` has `.menu-open`;
- lay links out vertically in a contained panel below the 64px bar;
- preserve the yellow contact action;
- prevent the panel from exceeding the viewport height.

Add `.local-nav` as a quiet horizontal anchor row. Below `780px`, use `overflow-x: auto`, `white-space: nowrap`, and visible keyboard focus without hiding the scrollbar through browser-specific hacks.

- [ ] **Step 5: Add current-page styling without JavaScript**

On each thematic page, mark exactly one matching global link with `aria-current="page"`; on `index.html`, apply it to the logo. Style `nav a[aria-current="page"]` with the existing light color and a restrained underline or bottom rule. Do not use a filled pill or introduce another accent color. Add `self.current_links = []` in `SitePage.__init__`, then add this branch to `handle_starttag`:

```python
        if tag == "a" and attrs.get("aria-current") == "page":
            self.current_links.append(attrs.get("href", ""))
```

Extend the structural test with this exact mapping and assertion:

```python
current_targets = {
    "index.html": "index.html",
    "gel.html": "gel.html",
    "degel.html": "degel.html",
    "usages.html": "usages.html",
    "architecture.html": "architecture.html",
    "offre.html": "offre.html#offre",
    "essai.html": "essai.html",
}
for name, target in current_targets.items():
    with self.subTest(name=name):
        self.assertEqual([target], load_page(name).current_links)
```

- [ ] **Step 6: Run automated syntax and structure checks**

Run:

```bash
python3 -m unittest tests/site_structure_test.py -v
node --check site.js
```

Expected: all tests pass and Node reports no syntax error.

- [ ] **Step 7: Verify keyboard behavior manually**

Serve with `python3 -m http.server 8000`, open `http://localhost:8000/`, narrow the viewport below `780px`, then verify:

1. Tab reaches the menu button with visible focus.
2. Enter and Space open the menu.
3. `aria-expanded` changes to `true` while open.
4. Escape closes it and returns focus to the button.
5. Choosing a link closes the menu before navigation.
6. Local navigation remains horizontally usable at phone width.

- [ ] **Step 8: Commit navigation behavior**

```bash
git add styles.css site.js tests/site_structure_test.py index.html gel.html degel.html usages.html architecture.html offre.html essai.html mentions.html
git commit -m "site: add accessible multipage navigation"
```

### Task 4: Give every page correct identity and entry context

**Files:**
- Modify: `index.html`
- Modify: `gel.html`
- Modify: `degel.html`
- Modify: `usages.html`
- Modify: `architecture.html`
- Modify: `offre.html`
- Modify: `essai.html`
- Modify: `tests/site_structure_test.py`

**Interfaces:**
- Consumes: the page files and parser from Tasks 1–3.
- Produces: unique page titles, descriptions, canonical URLs, one `h1` per page, and a working skip target.

- [ ] **Step 1: Add failing metadata and heading tests**

Extend `SitePage.__init__` with these exact fields:

```python
        self.title_parts = []
        self.canonical = ""
        self.description = ""
        self._inside_title = False
        self.h1_count = 0
```

Add these exact branches to the existing callbacks:

```python
        if tag == "title":
            self._inside_title = True
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonical = attrs.get("href", "")
        if tag == "meta" and attrs.get("name") == "description":
            self.description = attrs.get("content", "")
        if tag == "h1":
            self.h1_count += 1

        if tag == "title":
            self._inside_title = False

        if self._inside_title:
            self.title_parts.append(data)
```

Add assertions that:

- every page has one non-empty title;
- titles are unique;
- every page has one non-empty description;
- every page has exactly one canonical URL under `https://lumnik.fr/`;
- every page has exactly one `h1`;
- every page has `id="contenu"` and a skip link targeting `#contenu`.

- [ ] **Step 2: Run the metadata tests and verify failure**

Run: `python3 -m unittest tests/site_structure_test.py -v`

Expected: duplicated metadata and pages without a dedicated `h1` fail.

- [ ] **Step 3: Set page-specific metadata**

Use concise metadata derived from each page's existing visible headings. Do not introduce new visible marketing copy. Canonicals must be exactly:

```text
https://lumnik.fr/
https://lumnik.fr/gel.html
https://lumnik.fr/degel.html
https://lumnik.fr/usages.html
https://lumnik.fr/architecture.html
https://lumnik.fr/offre.html
https://lumnik.fr/essai.html
```

Update Open Graph title, description, and URL to match each page's metadata.

- [ ] **Step 4: Establish one visible page heading and skip target per page**

Reuse an existing heading as each thematic page's `h1`; demote only the heading level of nested existing sections as required for a valid outline. Do not change heading text. Ensure the skip link targets `<main id="contenu">` on every page.

- [ ] **Step 5: Run the complete automated gate**

Run:

```bash
python3 -m unittest tests/site_structure_test.py -v
node --check site.js
git diff --check
```

Expected: all unit tests pass, JavaScript parses, and Git reports no whitespace errors.

- [ ] **Step 6: Commit page identity and metadata**

```bash
git add index.html gel.html degel.html usages.html architecture.html offre.html essai.html tests/site_structure_test.py
git commit -m "site: give each DSI page a clear entry point"
```

### Task 5: Perform content, responsive, and visual acceptance

**Files:**
- Modify only if defects are found: `index.html`
- Modify only if defects are found: `gel.html`
- Modify only if defects are found: `degel.html`
- Modify only if defects are found: `usages.html`
- Modify only if defects are found: `architecture.html`
- Modify only if defects are found: `offre.html`
- Modify only if defects are found: `essai.html`
- Modify only if defects are found: `mentions.html`
- Modify only if defects are found: `styles.css`
- Modify only if defects are found: `site.js`

**Interfaces:**
- Consumes: the completed multipage site and all automated checks.
- Produces: a visually inspected, link-complete site ready for review.

- [ ] **Step 1: Start the local site and visit every route**

Run: `python3 -m http.server 8000`

Inspect `/`, `/gel.html`, `/degel.html`, `/usages.html`, `/architecture.html`, `/offre.html`, `/essai.html`, and `/mentions.html`. Confirm that no page looks like an orphaned fragment and that the common navigation and footer remain visually consistent.

- [ ] **Step 2: Verify the DSI reading journey**

On the home page, confirm that the first screen names Gel, states read-only operation, preserves system value, and offers clear routes to Dégel and Architecture. Confirm that fear-bearing examples appear only on detailed pages and are paired with constructive outcomes.

- [ ] **Step 3: Verify responsive layouts**

Inspect each public page at approximately 390px, 768px, and 1440px widths. Check the hero, global menu, local navigation, diagrams, comparison table, console preview, offer cards, forms, and footer for overflow, clipped text, or unreadable line lengths.

- [ ] **Step 4: Verify accessibility and reduced motion**

Navigate every page with the keyboard, confirm visible focus, headings, skip links, menu state, and logical tab order. Emulate `prefers-reduced-motion: reduce` and confirm that all content is visible without reveal animation.

- [ ] **Step 5: Verify integrations and content conservation**

Confirm manually that:

- the Formspree endpoint is still `https://formspree.io/f/xqpzpwow`;
- all original contact fields and hidden fields remain;
- `https://docs.lumnik.io` and `https://github.com/icreated/lumnik-open` still resolve from Architecture;
- the trial and legal pages remain reachable from the footer;
- every original visible section appears on its specified destination page;
- no visible sentence was silently rewritten during movement.

- [ ] **Step 6: Run the final verification gate**

Run:

```bash
python3 -m unittest tests/site_structure_test.py -v
node --check site.js
git diff --check
git status --short
```

Expected: all tests pass, JavaScript parses, no whitespace errors are reported, and only intentional acceptance fixes remain uncommitted.

- [ ] **Step 7: Commit any acceptance fixes**

If Step 6 shows intentional fixes, commit only those files:

```bash
git add index.html gel.html degel.html usages.html architecture.html offre.html essai.html mentions.html styles.css site.js tests/site_structure_test.py
git commit -m "fix: polish the multipage DSI journey"
```

If no fixes were needed, do not create an empty commit.
