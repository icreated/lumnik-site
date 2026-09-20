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
