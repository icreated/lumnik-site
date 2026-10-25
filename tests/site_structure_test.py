from html.parser import HTMLParser
import html
from pathlib import Path
import json
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
# The visitor's path (spec 2026-10-25): understand on the home, see a replayed scenario, try Open.
PAGES = ("index.html", "essai.html", "offre.html", "architecture.html", "pourquoi.html")
ALL_PAGES = PAGES + ("mentions.html", "dossier.html")
TARGET_NAV = (
    ("Scénarios", "scenarios/"),
    ("Sécurité", "architecture.html"),
    ("Offre", "offre.html"),
    ("Docs", "https://docs.lumnik.io"),
    ("Essayer", "essai.html"),
)
# GitHub Pages cannot redirect server-side: each retired page is a small relay. The fragments
# listed are the ones its target still answers, so an old bookmark lands on its section.
RELAYS = {
    "produit.html": ("index.html", ("comment", "faits", "sens", "temps")),
    "situations.html": ("scenarios/", ()),
    "pour-qui.html": ("index.html", ("direction", "dsi", "integrateurs")),
    "gel.html": ("pourquoi.html", ()),
    "degel.html": ("index.html", ("comment", "faits", "sens", "temps")),
    "mouvement.html": ("scenarios/", ()),
}
# The five-second test of #13 never ran, and the hero they compared is gone.
RETIRED = ("heros-a.html", "heros-b.html")
# Wordings the theses ruled out, on the site and on the scenario pages alike: absolutes, real
# time, maturity copied away from its single source, a promise of French (the deterministic
# messages stay English, lumnik#879), citations the answer does not give (it shows its query,
# lumnik#874), and security or permanence sold as guarantees.
SITE_FORBIDDEN = (
    "temps réel",
    "zéro risque",
    "Personne ne",
    "ne la traverse pas",
    "Zéro recâblage",
    "Assistant en français",
    "personne d'extérieur",
    "lumnik Console",
    "console-preuve",
    "sources citées",
    "sourcée",
    "avec ses sources",
    "en français",
    "fuite de données",
    "pour toujours",
    "sans risque",
)
# On the site's own pages only: the virtue words, and every offer of a demo — there is none
# for now (Sergey, 2026-10-25); the visitor installs lumnik Open alone.
PAGE_FORBIDDEN = SITE_FORBIDDEN + (
    "honnête",
    "proxy",
    "nettoie",
    "gelée",
    "Demander une démonstration",
    "démonstration sur",
    "Demander un pilote",
    "bac à sable",
    "Demander mes accès",
    # Transformers repair a file export; a table or an API is read as it is (docs/wow.md).
    "répare et rassemble leurs données",
)
HOME_SECTIONS = ("situations", "comment", "essayer", "confiance")
# One replayed scenario per kind of problem; each card shows the title the catalogue serves.
FEATURED = (
    "dirty-order-statuses",
    "entity-resolution",
    "export-that-lies",
    "orders-where-they-sleep",
    "zombie-cmms",
    "purchasing-ask-abstains",
)
HERO_H1 = "<h1>Vos logiciels restent en place.<br>Vos données <em>se remettent au travail</em>.</h1>"
# The two commands and the result line of docs/deploy.md (lumnik monorepo), as up.sh prints them.
CLONE = "git clone https://github.com/icreated/lumnik-open.git && cd lumnik-open"
UP = "./deploy/selfhost/up.sh --build"
HEALTHY = "==> hub is healthy"
DOCS = "https://docs.lumnik.io/"
FICHE = json.loads((ROOT / "donnees" / "p1008.json").read_text(encoding="utf-8"))
CATALOGUE = {e["slug"]: e for e in json.loads((ROOT / "scenarios" / "index.json").read_text(encoding="utf-8"))["scenarios"]}


class SitePage(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []
        self.buttons = []
        self.menu_lists = []
        self.current_links = []
        self.title_parts = []
        self.canonical = ""
        self.description = ""
        self._inside_title = False
        self.h1_count = 0
        self.title_count = 0
        self.canonical_count = 0
        self.description_count = 0
        self.open_graph = {}

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
        if tag == "title":
            self._inside_title = False

    def handle_data(self, data):
        if self._inside_title:
            self.title_parts.append(data)


def load_page(name):
    page = SitePage()
    page.feed((ROOT / name).read_text(encoding="utf-8"))
    return page


def text_of(name):
    return (ROOT / name).read_text(encoding="utf-8")


def between(text, start, end):
    head, sep, rest = text.partition(start)
    if not sep:
        raise AssertionError(f"marker not found: {start}")
    body, sep, _ = rest.partition(end)
    if not sep:
        raise AssertionError(f"marker not found: {end}")
    return body


def section(name, section_id):
    return between(text_of(name), f'id="{section_id}"', "</section>")


def visible(fragment, sep=""):
    """The text a reader sees: tags dropped (or replaced by `sep`), entities decoded."""
    return html.unescape(re.sub(r"<[^>]+>", sep, fragment))


def resolves(source, href):
    """A local href names a file, or a directory GitHub Pages serves through its index.html."""
    target = (ROOT / source).parent / href.partition("#")[0]
    return target.is_file() or (target / "index.html").is_file()


class SiteStructureTest(unittest.TestCase):
    def test_expected_pages_and_relays_exist(self):
        for name in ALL_PAGES + tuple(RELAYS):
            with self.subTest(name=name):
                self.assertTrue((ROOT / name).is_file())

    def test_the_retired_pages_are_gone(self):
        for name in RETIRED:
            with self.subTest(name=name):
                self.assertFalse((ROOT / name).exists())

    def test_every_page_exposes_the_global_navigation_in_order(self):
        for name in ALL_PAGES:
            menu = between(text_of(name), '<ul id="menu-principal">', "</ul>")
            items = [(label, href) for href, label in re.findall(r'<a\b[^>]*\bhref="([^"]+)"[^>]*>([^<]+)</a>', menu)]
            with self.subTest(name=name):
                self.assertEqual(list(TARGET_NAV), items)

    def test_the_light_pill_is_the_try_link(self):
        for name in ALL_PAGES:
            menu = between(text_of(name), '<ul id="menu-principal">', "</ul>")
            pills = re.findall(r'<a class="btn btn-lumiere nav-contact" href="([^"]+)"', menu)
            with self.subTest(name=name):
                self.assertEqual(["essai.html"], pills)

    def test_mobile_menu_contract_is_present(self):
        for name in ALL_PAGES:
            page = load_page(name)
            menu_buttons = [b for b in page.buttons if b.get("aria-controls") == "menu-principal"]
            with self.subTest(name=name):
                self.assertEqual(1, len(menu_buttons))
                self.assertEqual("false", menu_buttons[0].get("aria-expanded"))
                self.assertEqual(1, len(page.menu_lists))

    def test_mobile_menu_script_supports_keyboard_close(self):
        script = text_of("site.js")
        self.assertIn('event.key === "Escape"', script)
        self.assertIn('setAttribute("aria-expanded"', script)

    def test_each_page_marks_its_own_link_as_current(self):
        current = {
            "index.html": ["index.html"],
            "essai.html": ["essai.html"],
            "offre.html": ["offre.html"],
            "architecture.html": ["architecture.html"],
            "pourquoi.html": [],
            "mentions.html": [],
            "dossier.html": [],
        }
        for name, expected in current.items():
            with self.subTest(name=name):
                self.assertEqual(expected, load_page(name).current_links)

    def test_every_page_has_unique_metadata(self):
        titles, descriptions = [], []
        for name in PAGES:
            page = load_page(name)
            title = "".join(page.title_parts).strip()
            with self.subTest(name=name):
                self.assertEqual(1, page.title_count)
                self.assertTrue(title)
                self.assertEqual(1, page.description_count)
                self.assertTrue(page.description.strip())
                self.assertEqual(title, page.open_graph.get("og:title"))
                # The meta description is written for a search result, the Open Graph one for
                # a social card: they may differ.
                self.assertTrue(page.open_graph.get("og:description", "").strip())
                self.assertEqual(page.canonical, page.open_graph.get("og:url"))
            titles.append(title)
            descriptions.append(page.description)
        self.assertEqual(len(PAGES), len(set(titles)))
        self.assertEqual(len(PAGES), len(set(descriptions)))

    def test_every_page_has_its_canonical_url(self):
        for name in PAGES + ("dossier.html",):
            expected = "https://lumnik.fr/" + ("" if name == "index.html" else name)
            page = load_page(name)
            with self.subTest(name=name):
                self.assertEqual(1, page.canonical_count)
                self.assertEqual(expected, page.canonical)

    def test_every_page_has_one_h1_and_a_working_skip_link(self):
        for name in ALL_PAGES:
            page = load_page(name)
            with self.subTest(name=name):
                self.assertEqual(1, page.h1_count)
                self.assertIn("contenu", page.ids)
                self.assertIn("#contenu", page.links)

    def test_local_links_and_fragments_resolve(self):
        for name in ALL_PAGES:
            for href in load_page(name).links:
                if href.startswith(("http://", "https://", "mailto:")):
                    continue
                target, _, fragment = href.partition("#")
                target = target or name
                with self.subTest(name=name, href=href):
                    self.assertTrue(resolves(name, target))
                    if fragment:
                        self.assertIn(fragment, load_page(target).ids)

    def test_no_page_links_a_relay_or_a_retired_page(self):
        for name in ALL_PAGES:
            for href in load_page(name).links:
                with self.subTest(name=name, href=href):
                    self.assertNotIn(href.partition("#")[0], tuple(RELAYS) + RETIRED)

    def test_no_page_links_the_dossier(self):
        """The proposal questionnaire stays served, linked from nowhere (Sergey, 2026-10-25)."""
        for name in ALL_PAGES:
            for href in load_page(name).links:
                with self.subTest(name=name, href=href):
                    self.assertNotEqual("dossier.html", href.partition("#")[0])

    def test_only_the_homepage_announces_language_alternates(self):
        home = text_of("index.html")
        for lang in ('hreflang="fr"', 'hreflang="en"', 'hreflang="x-default"'):
            self.assertIn(lang, home)
        for name in ALL_PAGES[1:]:
            with self.subTest(name=name):
                self.assertNotIn("hreflang=", text_of(name))

    def test_every_footer_leads_to_the_scenarios_the_try_page_and_the_why(self):
        for name in ALL_PAGES:
            footer = between(text_of(name), "<footer>", "</footer>")
            for href in ("scenarios/", "essai.html", "pourquoi.html", "mentions.html"):
                with self.subTest(name=name, href=href):
                    self.assertIn(f'href="{href}"', footer)

    def test_fragment_destinations_clear_the_sticky_navigation(self):
        """Anchor geometry is one calculation, not three independent numbers.

        A fragment inside a .reveal is scrolled to while the reveal still holds its content
        down; the class lands a moment later and lifts everything. Without reserving that lift
        in the scroll-margin, the heading rises under the sticky bar.
        """
        styles = text_of("styles.css")
        self.assertIn("--nav-h: 64px;", styles)
        self.assertIn("--anchor-gap: 20px;", styles)
        self.assertIn("--reveal-lift: 30px;", styles)
        self.assertIn("[id] { scroll-margin-top: calc(var(--nav-h) + var(--anchor-gap)); }", styles)
        self.assertIn(
            ".reveal [id] { scroll-margin-top: "
            "calc(var(--nav-h) + var(--anchor-gap) + var(--reveal-lift)); }",
            styles,
        )
        self.assertIn("height: var(--nav-h);", styles)
        self.assertIn("transform: translateY(var(--reveal-lift));", styles)
        reduced = styles.split("@media (prefers-reduced-motion: reduce) {", 1)[1]
        self.assertIn(":root { --reveal-lift: 0px; }", reduced)

    def test_the_pill_keeps_dark_text_on_its_own_page(self):
        """The pill now points at essai.html, which can be the current page.

        `nav a[aria-current="page"]` paints the light yellow and outranks `nav .nav-contact`
        on specificity: on essai.html the pill would read yellow on yellow. lumnik.io met it
        on contact.html; the same rule, after the current-page one, keeps the text dark.
        """
        styles = text_of("styles.css")
        self.assertIn('nav .nav-contact,\nnav a.nav-contact[aria-current="page"] { color: var(--nuit); }', styles)
        self.assertLess(
            styles.index('nav a[aria-current="page"] {'),
            styles.index('nav a.nav-contact[aria-current="page"]'),
        )

    def test_the_copy_avoids_the_ruled_out_wordings(self):
        for name in ALL_PAGES:
            page_text = text_of(name)
            for word in PAGE_FORBIDDEN:
                with self.subTest(name=name, word=word):
                    self.assertNotIn(word, page_text)

    def test_french_punctuation_never_follows_a_plain_space(self):
        """U+00A0 before `:`, U+202F before `;` `!` `?` — a plain space lets the sign wrap alone onto
        the next line, in the page and in a search snippet."""
        for name in PAGES:
            for line_no, line in enumerate(text_of(name).splitlines(), 1):
                for match in re.finditer(r"[\w»)] [:;!?]", line):
                    with self.subTest(name=name, line=line_no):
                        self.fail(f"plain space before punctuation: {match.group(0)!r}")

    def test_the_directory_is_sold_with_enterprise_only(self):
        """The identity directory is an Enterprise promise on the offer page; a "Pro adds" list that
        also names it would leave a buyer asking which tier to choose."""
        self.assertIn("annuaire", between(text_of("offre.html"), "<h3>Enterprise</h3>", "</ul>"))
        for name, part in (("index.html", section("index.html", "essayer")), ("essai.html", text_of("essai.html"))):
            with self.subTest(name=name):
                self.assertNotIn("annuaire", part)

    def test_the_dossier_page_has_its_metadata_and_exactly_its_two_scripts(self):
        page = load_page("dossier.html")
        self.assertEqual(1, page.title_count)
        self.assertEqual("https://lumnik.fr/dossier.html", page.canonical)
        self.assertEqual(page.canonical, page.open_graph.get("og:url"))
        self.assertIn("dossier-app", page.ids)
        tags = re.findall(r"<script\b[^>]*>", text_of("dossier.html"))
        self.assertEqual(2, len(tags), tags)
        sources = [re.search(r'\bsrc="([^"]+)"', tag) for tag in tags]
        self.assertTrue(all(sources), f"an inline script: {tags}")
        self.assertEqual(["site.js", "proposal/page.mjs"], [m.group(1) for m in sources])
        self.assertEqual(["proposal/page.mjs"],
                         [m.group(1) for tag, m in zip(tags, sources) if re.search(r'\btype="module"', tag)])


class HomepageTest(unittest.TestCase):
    def home(self):
        return text_of("index.html")

    def hero(self):
        return between(self.home(), '<header class="heros">', "</header>")

    def test_the_sections_follow_the_journey(self):
        after_hero = self.home().split("</header>", 1)[1]
        self.assertEqual(list(HOME_SECTIONS), re.findall(r'<section[^>]*\bid="([^"]+)"', after_hero))

    def test_the_hero_says_why_and_opens_both_doors(self):
        hero = self.hero()
        self.assertIn(HERO_H1, hero)
        ctas = between(hero, '<div class="heros-ctas">', "</div>")
        self.assertIn('href="scenarios/"', ctas)
        self.assertIn('href="essai.html"', ctas)

    def test_the_hero_record_is_the_demo_desk_p1008(self):
        """The record is the demo desk's P-1008 as lumnik fuses it (docs/entities.md): the ERP
        and the CRM agree on the name, disagree on the city, and only the CRM has the email."""
        record = between(self.hero(), "<!-- fiche:debut -->", "<!-- fiche:fin -->")
        erp, crm = FICHE["sources"]["t_acme_desk_erp"], FICHE["sources"]["t_acme_desk_crm"]
        for value in (erp["code"], erp["name"], erp["city"], erp["segment"], crm["town"], crm["email"]):
            with self.subTest(value=value):
                self.assertIn(value, record)
        self.assertIn("fictives", record)
        self.assertIn(DOCS + "entities/", record)

    def test_the_featured_scenarios_are_published_and_titled_as_served(self):
        cards = dict(re.findall(r'<a class="porte scenario" href="scenarios/([a-z0-9-]+)/">(.*?)</a>',
                                section("index.html", "situations"), re.S))
        self.assertEqual(sorted(FEATURED), sorted(cards))
        for slug in FEATURED:
            card, served = cards[slug], CATALOGUE[slug]
            with self.subTest(slug=slug):
                self.assertTrue(resolves("index.html", f"scenarios/{slug}/"))
                self.assertEqual(served["title"], visible(between(card, "<h3>", "</h3>")))
                self.assertIn(f'<span class="edition">{served["edition"].capitalize()}</span>', card)

    def test_the_situations_lead_to_the_whole_catalogue(self):
        self.assertIn('<a class="btn btn-givre" href="scenarios/">', section("index.html", "situations"))

    def test_the_repair_move_is_scoped_to_an_export(self):
        repair = between(section("index.html", "comment"), 'id="sens"', "</div>")
        self.assertIn("export", repair)

    def test_the_five_moves_answer_the_old_product_fragments(self):
        how = section("index.html", "comment")
        for verb in ("Lire", "Réparer", "Rassembler", "Surveiller", "Servir"):
            with self.subTest(verb=verb):
                self.assertIn(f"<h3>{verb}</h3>", how)
        for fragment in ("faits", "sens", "temps"):
            with self.subTest(fragment=fragment):
                self.assertIn(f'id="{fragment}"', how)

    def test_the_no_write_promise_names_the_software_not_the_premises(self):
        """lumnik writes into its own PostgreSQL, installed on the client's machines: a promise of
        no write on the premises would contradict "installed on your machines". It is about the
        client's software."""
        heading = visible(between(section("index.html", "comment"), "<h2>", "</h2>"))
        self.assertNotIn("chez vous", heading)
        self.assertIn("dans vos logiciels", heading)

    def test_the_try_section_shows_the_real_install(self):
        try_section = visible(section("index.html", "essayer"))
        for line in (CLONE, UP, HEALTHY):
            with self.subTest(line=line):
                self.assertIn(line, try_section)
        self.assertIn('href="essai.html"', section("index.html", "essayer"))

    def test_trust_links_to_its_sources_and_opens_three_doors(self):
        trust = section("index.html", "confiance")
        for href in (DOCS + "security/", DOCS + "where-lumnik-stands/", DOCS + "integration-as-code/",
                     "https://github.com/icreated/lumnik-open", "scenarios/", "architecture.html"):
            with self.subTest(href=href):
                self.assertIn(f'href="{href}"', trust)
        for door in ("direction", "dsi", "integrateurs"):
            with self.subTest(door=door):
                self.assertIn(f'id="{door}"', trust)


class TryPageTest(unittest.TestCase):
    def test_the_try_page_walks_the_real_install(self):
        page = text_of("essai.html")
        for line in (CLONE, UP, HEALTHY):
            with self.subTest(line=line):
                self.assertIn(line, visible(page))
        for href in ("https://github.com/icreated/lumnik-open/releases/latest",
                     DOCS + "quickstart/prerequisites/", DOCS + "quickstart/installer/", DOCS + "wow/",
                     "scenarios/", "offre.html"):
            with self.subTest(href=href):
                self.assertIn(f'href="{href}"', page)

    def test_the_try_page_asks_for_nothing(self):
        self.assertNotIn("<form", text_of("essai.html"))


class OfferPageTest(unittest.TestCase):
    def test_three_tiers_then_the_contact_form(self):
        offre = text_of("offre.html")
        self.assertEqual(3, offre.count('<div class="tier'))
        self.assertIn('action="https://formspree.io/f/xqpzpwow"', offre)
        self.assertIn('id="contact"', offre)
        hub = re.search(r'<div class="tier">(.*?)<div class="tier pro">', offre, re.S).group(1)
        self.assertIn('href="essai.html"', hub)


class SecurityPageTest(unittest.TestCase):
    def test_the_guarantees_a_dsi_can_check(self):
        page = text_of("architecture.html")
        self.assertIn('class="garanties"', page)
        # The audit trail cannot be rewritten by the application, and a retention purge trims it:
        # the page says both (the theses found "ne s'efface pas" false).
        self.assertIn("365 jours", page)
        for href in (DOCS + "security/", DOCS + "reversibility/", DOCS + "where-lumnik-stands/",
                     "https://github.com/icreated/lumnik-open"):
            with self.subTest(href=href):
                self.assertIn(f'href="{href}"', page)


class RelayTest(unittest.TestCase):
    def test_each_relay_sends_its_visitor_on_with_the_fragment(self):
        for old, (target, _) in RELAYS.items():
            text = text_of(old)
            with self.subTest(old=old):
                self.assertIn(f'<meta http-equiv="refresh" content="0; url={target}">', text)
                canonical = "https://lumnik.fr/" + ("" if target == "index.html" else target)
                self.assertIn(f'<link rel="canonical" href="{canonical}">', text)
                self.assertIn('<meta name="robots" content="noindex">', text)
                self.assertIn(f'location.replace("{target}" + location.hash)', text)
                self.assertIn(f'href="{target}"', text)
                self.assertTrue(resolves(old, target))

    def test_every_kept_fragment_lands_on_its_section(self):
        for old, (target, anchors) in RELAYS.items():
            for anchor in anchors:
                with self.subTest(old=f"{old}#{anchor}"):
                    self.assertIn(anchor, load_page(target).ids)


# --- scenarios/: replayed scenarios, a publication artefact of lumnik-scenario -------------------
#
# Written only by lumnik-scenario's tools/scenario-site/publish.sh; the site checks what it serves
# with the same rules as its own pages.

SCENARIO_PAGES = sorted(p.relative_to(ROOT).as_posix() for p in (ROOT / "scenarios").rglob("*.html"))


class ScenarioPagesTest(unittest.TestCase):
    def test_every_published_scenario_has_its_page(self):
        for slug in CATALOGUE:
            with self.subTest(slug=slug):
                self.assertIn(f"scenarios/{slug}/index.html", SCENARIO_PAGES)

    def test_local_links_resolve(self):
        for name in SCENARIO_PAGES:
            hrefs = load_page(name).links + re.findall(r'<(?:script|link)[^>]+(?:src|href)="([^"]+)"', text_of(name))
            for href in hrefs:
                if href.startswith(("http://", "https://", "mailto:", "#")):
                    continue
                with self.subTest(name=name, href=href):
                    self.assertTrue(resolves(name, href))

    def test_the_copy_avoids_the_words_the_theses_ruled_out(self):
        for name in SCENARIO_PAGES:
            text = visible(text_of(name), " ").lower()
            for word in SITE_FORBIDDEN:
                with self.subTest(name=name, word=word):
                    self.assertNotIn(word.lower(), text)


if __name__ == "__main__":
    unittest.main()
