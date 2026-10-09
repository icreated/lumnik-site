from html.parser import HTMLParser
from pathlib import Path
import json
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGES = (
    "index.html",
    "gel.html",
    "degel.html",
    "mouvement.html",
    "architecture.html",
    "offre.html",
    "essai.html",
)
ALL_PAGES = PAGES + ("mentions.html", "dossier.html")
NAV_LABELS = (
    "Gel",
    "Dégel",
    "Mouvement",
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
            "mouvement.html": "mouvement.html",
            "architecture.html": "architecture.html",
            "offre.html": "offre.html#offre",
            "essai.html": "essai.html",
        }
        for name, target in current_targets.items():
            with self.subTest(name=name):
                self.assertEqual([target], load_page(name).current_links)

    def test_the_dossier_page_has_its_metadata_and_exactly_its_two_scripts(self):
        page = load_page("dossier.html")
        self.assertEqual(1, page.title_count)
        self.assertEqual(1, page.h1_count)
        self.assertEqual("https://lumnik.fr/dossier.html", page.canonical)
        self.assertEqual(page.canonical, page.open_graph.get("og:url"))
        self.assertIn("dossier-app", page.ids)
        # Count the tags rather than look for one spelling: an inline block can carry attributes
        # (<script type="module">…), and harmless reformatting must not fail the test.
        text = (ROOT / "dossier.html").read_text(encoding="utf-8")
        tags = re.findall(r"<script\b[^>]*>", text)
        self.assertEqual(2, len(tags), tags)
        sources = [re.search(r'\bsrc="([^"]+)"', tag) for tag in tags]
        self.assertTrue(all(sources), f"an inline script: {tags}")
        self.assertEqual(["site.js", "proposal/page.mjs"], [m.group(1) for m in sources])
        self.assertEqual(["proposal/page.mjs"], [m.group(1) for tag, m in zip(tags, sources) if re.search(r'\btype="module"', tag)])

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
            "mouvement.html": "https://lumnik.fr/mouvement.html",
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
            "adaptateur": "mouvement.html",
            "cas": "mouvement.html",
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

    def test_the_pages_carry_what_the_landing_page_proved(self):
        """The split moved sections; it must not roll their copy back.

        Splitting one page into seven copies text by hand, and a branch cut before
        a content merge silently restores the older wording. These are the claims
        whose loss is not cosmetic: the invented console that was replaced by a real
        `lm` session, the four verifiable mechanisms, the beta admission, and the
        freeze grid that stopped being 100% legacy.
        """
        architecture = (ROOT / "architecture.html").read_text(encoding="utf-8")
        gel = (ROOT / "gel.html").read_text(encoding="utf-8")
        degel = (ROOT / "degel.html").read_text(encoding="utf-8")
        offre = (ROOT / "offre.html").read_text(encoding="utf-8")

        # The terminal is a real lm session, and it says what it accounts for.
        self.assertIn("$ lm login", architecture)
        self.assertIn("IN = OUT + SKIPPED", architecture)
        # The four mechanisms a RSSI can check, and the invitation to check them.
        self.assertIn('class="garanties"', architecture)
        self.assertIn("docs.lumnik.io/security/", architecture)
        # Maturity is stated, not implied.
        self.assertIn("Beta · open source", architecture)
        self.assertIn("personne d'extérieur ne l'a fait tourner en production", architecture)
        # The gel grid illustrates the four causes the paragraph claims, not only age.
        self.assertIn("SaaS métier fermé", gel)
        self.assertIn("CRM + ERP flambant neufs", gel)
        # The three dead ends and the three refusals.
        self.assertIn('class="impasses"', gel)
        self.assertIn('class="principes"', degel)
        # Reversibility and integration-as-code are what each persona is here for.
        self.assertIn("docs.lumnik.io/reversibility/", offre)
        self.assertIn("docs.lumnik.io/integration-as-code/", offre)

        # The invented console had figures from no real installation. It is gone.
        for name in ALL_PAGES:
            with self.subTest(name=name):
                page_text = (ROOT / name).read_text(encoding="utf-8")
                self.assertNotIn("lumnik Console", page_text)
                self.assertNotIn("console-preuve", page_text)

    def test_no_public_page_links_to_the_hero_variants(self):
        for name in ALL_PAGES:
            with self.subTest(name=name):
                for href in load_page(name).links:
                    self.assertNotIn(href.partition("#")[0], HERO_VARIANTS)

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


# --- Issue #13: the two hero variants of the five-second test -----------------------------
#
# Two pages that differ by one variable only: which of "category" and "visible object" is the
# H1 and which is the eyebrow. Everything else — sub-title, proofs, the fused record, the
# buttons — is byte-identical, so the test measures the title and nothing else. The record is
# the demo desk's P-1008 as `lm entity get acmecustomer` prints it in docs/entities.md: real
# output on fictional data, never a customer's.

HERO_VARIANTS = ("heros-a.html", "heros-b.html")
CATEGORY = "La couche de lecture de vos logiciels"
OBJECT = "Une seule fiche client, lisible partout"
TARGET_NAV = (
    ("Produit", "degel.html"),
    ("Situations", "mouvement.html"),
    ("Pour qui", "offre.html#pour-qui"),
    ("Architecture", "architecture.html"),
    ("Offre", "offre.html#offre"),
    ("Essayer", "essai.html"),
    ("Nous parler", "offre.html#contact"),
)
FORBIDDEN = ("temps réel", "zéro risque", "honnête", "proxy", "nettoie", "Personne ne", "gelée")


def between(text, start, end):
    head, sep, rest = text.partition(start)
    if not sep:
        raise AssertionError(f"marker not found: {start}")
    body, sep, _ = rest.partition(end)
    if not sep:
        raise AssertionError(f"marker not found: {end}")
    return body


class HeroVariantTest(unittest.TestCase):
    def text(self, name):
        return (ROOT / name).read_text(encoding="utf-8")

    def test_both_variants_exist_and_stay_out_of_search_engines(self):
        for name in HERO_VARIANTS:
            with self.subTest(name=name):
                text = self.text(name)
                self.assertIn('<meta name="robots" content="noindex, nofollow">', text)
                self.assertNotIn("hreflang=", text)
                self.assertNotIn('rel="canonical"', text)

    def test_each_variant_has_one_h1_a_skip_link_and_the_mobile_menu(self):
        for name in HERO_VARIANTS:
            page = load_page(name)
            with self.subTest(name=name):
                self.assertEqual(1, page.h1_count)
                self.assertEqual(1, page.title_count)
                self.assertIn("contenu", page.ids)
                self.assertIn("#contenu", page.links)
                self.assertEqual(1, len(page.menu_lists))

    def test_the_category_and_the_object_swap_places(self):
        a, b = (self.text(name) for name in HERO_VARIANTS)
        self.assertIn(f"<h1>{CATEGORY}.</h1>", a)
        self.assertIn(f'<p class="surtitre">{OBJECT}</p>', a)
        self.assertIn(f"<h1>{OBJECT}.</h1>", b)
        self.assertIn(f'<p class="surtitre">{CATEGORY}</p>', b)

    def test_the_variants_differ_by_the_title_alone(self):
        def without_title(text):
            text = re.sub(r"<title>.*?</title>", "", text, flags=re.S)
            text = re.sub(r'<p class="surtitre">.*?</p>', "", text, flags=re.S)
            return re.sub(r"<h1>.*?</h1>", "", text, flags=re.S)

        a, b = (without_title(self.text(name)) for name in HERO_VARIANTS)
        self.assertEqual(a, b)

    def test_the_record_is_the_demo_desk_p1008(self):
        record = between(self.text("heros-a.html"), "<!-- fiche:debut -->", "<!-- fiche:fin -->")
        # The ERP and the CRM agree on the name, disagree on the city, and only the CRM has
        # the email — a fusion and a disagreement in one record (docs/entities.md).
        for value in ("P-1008", "Filtration Lyon 1008", "Lyon", "Villeurbanne", "GOLD",
                      "contact@filtration-lyon.example"):
            with self.subTest(value=value):
                self.assertIn(value, record)
        self.assertIn("https://docs.lumnik.io/entities/", record)
        self.assertIn("fictives", record)

    def test_the_target_navigation_points_at_pages_that_exist(self):
        for name in HERO_VARIANTS:
            text = between(self.text(name), '<ul id="menu-principal">', "</ul>")
            for label, href in TARGET_NAV:
                with self.subTest(name=name, label=label):
                    self.assertIn(f'href="{href}"', text)
                    self.assertIn(f">{label}</a>", text)

    def test_local_links_and_fragments_resolve(self):
        for name in HERO_VARIANTS:
            for href in load_page(name).links:
                if href.startswith(("http://", "https://", "mailto:")):
                    continue
                target, _, fragment = href.partition("#")
                target = target or name
                with self.subTest(name=name, href=href):
                    self.assertTrue((ROOT / target).is_file())
                    if fragment:
                        self.assertIn(fragment, load_page(target).ids)

    def test_the_copy_avoids_the_words_the_theses_ruled_out(self):
        for name in HERO_VARIANTS:
            text = self.text(name)
            for word in FORBIDDEN:
                with self.subTest(name=name, word=word):
                    self.assertNotIn(word, text)


# --- Issue #14: the homepage built around hero B -------------------------------------------
#
# Every value a window shows comes from donnees/p1008.json, itself copied from real outputs on
# the demo desk (each block names its source). The windows are checked against that one file,
# so a value edited in one window and not the others fails here.

FICHE = json.loads((ROOT / "donnees" / "p1008.json").read_text(encoding="utf-8"))
HOME_SECTIONS = ("fenetres", "fusion", "avant-apres", "immobile", "portes", "confiance", "manifeste")


class HomepageTest(unittest.TestCase):
    def home(self):
        return (ROOT / "index.html").read_text(encoding="utf-8")

    def block(self, name):
        return between(self.home(), f"<!-- fenetre:{name} -->", f"<!-- /fenetre:{name} -->")

    def test_the_hero_is_variant_b_unchanged(self):
        hero = lambda text: between(text, '<header class="heros">', "</header>")
        self.assertEqual(hero(self.text_of("heros-b.html")), hero(self.home()))

    def text_of(self, name):
        return (ROOT / name).read_text(encoding="utf-8")

    def test_the_three_windows_come_right_after_the_hero(self):
        after_hero = self.home().split('<header class="heros">', 1)[1].split("</header>", 1)[1]
        first_section = re.search(r'<section[^>]*\bid="([^"]+)"', after_hero)
        self.assertEqual("fenetres", first_section.group(1))

    def test_the_sections_follow_the_order_of_issue_14(self):
        ids = re.findall(r'<section[^>]*\bid="([^"]+)"', self.home())
        self.assertEqual(list(HOME_SECTIONS), ids)

    def test_the_api_window_shows_the_real_row(self):
        api = self.block("api")
        self.assertIn(FICHE["api"]["requete"], api)
        for key, value in FICHE["api"]["ligne"].items():
            with self.subTest(key=key):
                self.assertIn(f'"{key}": {json.dumps(value, ensure_ascii=False)}', api)

    def test_the_phone_window_shows_the_pwa_detail(self):
        pwa = self.block("pwa")
        self.assertIn(FICHE["pwa"]["titre"], pwa)
        self.assertIn(FICHE["pwa"]["cle"], pwa)
        for label, value in FICHE["pwa"]["champs"]:
            with self.subTest(label=label):
                self.assertIn(f'<div class="lbl">{label}</div>', pwa)
                self.assertIn(f'<div class="val">{value}</div>', pwa)
        self.assertIn(FICHE["pwa"]["divergences_titre"], pwa)
        for conflict in FICHE["pwa"]["divergences"]:
            self.assertIn(conflict["colonne"], pwa)
            for src, value in conflict["sources"]:
                self.assertIn(f"{src} : <b>{value}</b>", pwa)

    def test_each_window_says_which_edition_carries_it(self):
        self.assertIn('class="edition">Hub<', self.block("pwa"))
        self.assertIn('class="edition">Hub<', self.block("api"))

    def test_no_ai_window_until_the_answer_can_name_a_disputed_record(self):
        """The homepage shows P-1008's disputed city, so an AI window may not count P-1008 in
        silence. The only real transcript did exactly that — `WHERE city = 'Lyon'` counted it
        without a word, in English. It comes back once lumnik#873 (answer in the question's
        language) and lumnik#874 (say so when a counted row is disputed) are shipped and a
        fresh run is transcribed into donnees/p1008.json.
        """
        self.assertNotIn("lm ask", self.home())
        self.assertNotIn("fenetre:question", self.home())

    def test_the_fusion_section_shows_both_sources_and_the_kept_disagreement(self):
        fusion = between(self.home(), 'id="fusion"', "</section>")
        erp, crm = FICHE["sources"]["t_acme_desk_erp"], FICHE["sources"]["t_acme_desk_crm"]
        for value in (erp["name"], erp["city"], erp["segment"], crm["town"], crm["email"]):
            with self.subTest(value=value):
                self.assertIn(value, fusion)

    def test_the_time_section_shows_the_same_order_in_every_export(self):
        time = between(self.home(), 'id="immobile"', "</section>")
        order = FICHE["commande"]
        self.assertEqual(order["exports"], time.count('class="jour"'))
        self.assertEqual(order["exports"], time.count(order["order_no"]))
        self.assertIn(order["status"], time)
        self.assertIn(order["code"], time)

    def test_maturity_is_a_link_to_its_single_source(self):
        confiance = between(self.home(), 'id="confiance"', "</section>")
        self.assertIn("https://docs.lumnik.io/where-lumnik-stands/", confiance)
        self.assertIn("https://docs.lumnik.io/security/", confiance)
        self.assertNotIn("personne d'extérieur", self.home())

    def test_the_homepage_avoids_the_words_the_theses_ruled_out(self):
        home = self.home()
        for word in FORBIDDEN:
            with self.subTest(word=word):
                self.assertNotIn(word, home)
