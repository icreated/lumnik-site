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
        self.buttons = []
        self.menu_lists = []
        self.current_links = []
        self.nav_text = []
        self.title_parts = []
        self.canonical = ""
        self.description = ""
        self._inside_title = False
        self.h1_count = 0
        self.title_count = 0
        self.canonical_count = 0
        self.description_count = 0
        self.open_graph = {}
        self._inside_nav = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag == "a" and "href" in attrs:
            self.links.append(attrs["href"])
        if tag == "a" and attrs.get("aria-current") == "page":
            self.current_links.append(attrs.get("href", ""))
        if tag == "button":
            self.buttons.append(attrs)
        if tag == "ul" and attrs.get("id") == "menu-principal":
            self.menu_lists.append(attrs)
        if tag == "nav":
            self._inside_nav = True
        if tag == "title":
            self._inside_title = True
            self.title_count += 1
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonical = attrs.get("href", "")
            self.canonical_count += 1
        if tag == "meta" and attrs.get("name") == "description":
            self.description = attrs.get("content", "")
            self.description_count += 1
        if tag == "meta" and attrs.get("property", "").startswith("og:"):
            self.open_graph[attrs["property"]] = attrs.get("content", "")
        if tag == "h1":
            self.h1_count += 1

    def handle_endtag(self, tag):
        if tag == "nav":
            self._inside_nav = False
        if tag == "title":
            self._inside_title = False

    def handle_data(self, data):
        if self._inside_nav and data.strip():
            self.nav_text.append(data.strip())
        if self._inside_title:
            self.title_parts.append(data)


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

    def test_mobile_menu_contract_is_present(self):
        for name in ALL_PAGES:
            page = load_page(name)
            menu_buttons = [
                button
                for button in page.buttons
                if button.get("aria-controls") == "menu-principal"
            ]
            with self.subTest(name=name):
                self.assertEqual(1, len(menu_buttons))
                self.assertEqual("false", menu_buttons[0].get("aria-expanded"))
                self.assertEqual(1, len(page.menu_lists))

    def test_mobile_menu_script_supports_keyboard_close(self):
        script = (ROOT / "site.js").read_text(encoding="utf-8")
        self.assertIn('event.key === "Escape"', script)
        self.assertIn('setAttribute("aria-expanded"', script)

    def test_each_thematic_page_marks_its_global_link_as_current(self):
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

    def test_every_thematic_page_has_unique_metadata(self):
        pages = {name: load_page(name) for name in PAGES}
        titles = []
        descriptions = []

        for name, page in pages.items():
            title = "".join(page.title_parts).strip()
            with self.subTest(name=name):
                self.assertEqual(1, page.title_count)
                self.assertTrue(title)
                self.assertEqual(1, page.description_count)
                self.assertTrue(page.description.strip())
                self.assertEqual(title, page.open_graph.get("og:title"))
                # The two descriptions may legitimately differ: the meta one is written
                # for a SERP result, the Open Graph one for a social card.
                self.assertTrue(page.open_graph.get("og:description", "").strip())
                self.assertEqual(page.canonical, page.open_graph.get("og:url"))
            titles.append(title)
            descriptions.append(page.description)

        self.assertEqual(len(PAGES), len(set(titles)))
        self.assertEqual(len(PAGES), len(set(descriptions)))

    def test_every_thematic_page_has_its_canonical_url(self):
        canonical_urls = {
            "index.html": "https://lumnik.fr/",
            "gel.html": "https://lumnik.fr/gel.html",
            "degel.html": "https://lumnik.fr/degel.html",
            "usages.html": "https://lumnik.fr/usages.html",
            "architecture.html": "https://lumnik.fr/architecture.html",
            "offre.html": "https://lumnik.fr/offre.html",
            "essai.html": "https://lumnik.fr/essai.html",
        }
        for name, expected_url in canonical_urls.items():
            page = load_page(name)
            with self.subTest(name=name):
                self.assertEqual(1, page.canonical_count)
                self.assertEqual(expected_url, page.canonical)

    def test_every_thematic_page_has_one_h1_and_a_working_skip_link(self):
        for name in PAGES:
            page = load_page(name)
            with self.subTest(name=name):
                self.assertEqual(1, page.h1_count)
                self.assertIn("contenu", page.ids)
                self.assertIn("#contenu", page.links)

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

    def test_comparison_table_becomes_readable_cards_on_phone(self):
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        gel = (ROOT / "gel.html").read_text(encoding="utf-8")

        self.assertIn("@media (max-width: 600px)", styles)
        self.assertIn(".comparaison tr {", styles)
        self.assertIn(".comparaison td::before", styles)
        self.assertIn('data-label="L\'alternative classique"', gel)
        self.assertIn('data-label="Ce qu\'elle exige"', gel)
        self.assertIn('data-label="lumnik"', gel)

    def test_fragment_destinations_clear_the_sticky_navigation(self):
        """Anchor geometry is one calculation, not three independent numbers.

        A fragment inside a .reveal is scrolled to while the reveal still holds
        its content down; the class lands a moment later and lifts everything.
        Without reserving that lift in the scroll-margin, the heading rises under
        the sticky bar — which is what happened to #faits, #sens and the Usages
        cards.
        """
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")

        self.assertIn("--nav-h: 64px;", styles)
        self.assertIn("--anchor-gap: 20px;", styles)
        self.assertIn("--reveal-lift: 30px;", styles)
        self.assertIn(
            "[id] { scroll-margin-top: calc(var(--nav-h) + var(--anchor-gap)); }",
            styles,
        )
        self.assertIn(
            ".reveal [id] { scroll-margin-top: "
            "calc(var(--nav-h) + var(--anchor-gap) + var(--reveal-lift)); }",
            styles,
        )
        # The bar and the reveal must read the very variables they are compensated by.
        self.assertIn("height: var(--nav-h);", styles)
        self.assertIn("transform: translateY(var(--reveal-lift));", styles)
        # Reduced motion drops the lift, so it has to drop the reserve with it.
        reduced = styles.split("@media (prefers-reduced-motion: reduce) {", 1)[1]
        self.assertIn(":root { --reveal-lift: 0px; }", reduced)

    def test_only_homepage_announces_language_alternates(self):
        homepage = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('hreflang="fr"', homepage)
        self.assertIn('hreflang="en"', homepage)
        self.assertIn('hreflang="x-default"', homepage)

        for name in PAGES[1:]:
            with self.subTest(name=name):
                self.assertNotIn(
                    "hreflang=",
                    (ROOT / name).read_text(encoding="utf-8"),
                )
