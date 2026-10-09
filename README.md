# lumnik.fr — site vitrine

Site statique, zéro framework, zéro build : huit pages HTML, une feuille de style,
un script. Se déploie sur n'importe quel hébergeur statique.

## Structure

```
index.html      l'accueil : la fiche P-1008 de section en section
produit.html    faits · sens · temps — la fusion, la réponse qui montre sa requête, l'immobilité
situations.html les situations reconnaissables, les cas concrets, l'adaptateur, la comparaison
pour-qui.html   direction, DSI, intégrateurs
architecture.html l'architecture et ses garde-fous
offre.html      l'offre (Hub · Pro · Enterprise) et le formulaire de contact
essai.html      inscription à l'essai cloud (bac à sable — ouverture prochaine)
pourquoi.html   le manifeste : gel → dégel → mouvement, et le nom (lié depuis le pied de page)
gel.html, degel.html, mouvement.html   relais vers les nouvelles pages, ancre comprise (#15)
mentions.html   mentions légales, hébergeur, données personnelles (RGPD)
dossier.html    le questionnaire guidé : un dossier de proposition à télécharger (client seul)
heros-a.html    variante A du premier écran, pour le test des cinq secondes (#13) — non indexée, liée nulle part
heros-b.html    variante B (retenue, provisoirement) — son héros est recopié tel quel dans index.html
donnees/        p1008.json : la fiche de démonstration et sa provenance — seule source des valeurs de l'accueil
proposal/       les modules ES du questionnaire (.mjs, zéro build) ; page.mjs est le seul code DOM
catalogue/      les catalogues publiés (<version>.json) — ARTEFACTS DE PUBLICATION
catalogue-index.json  les versions servies et leurs empreintes — ARTEFACT DE PUBLICATION
tests/js/       tests node:test — `node --test 'tests/js/*.test.mjs'` (forme glob, sans npm)
tests/fixtures/ le corpus de dossiers vendu depuis le monorepo — ARTEFACT DE PUBLICATION
styles.css      « la lumière dans le congélateur » — nuit glaciaire + jaune de lumière
site.js         barre de dégel (progression) + révélation au défilement
```

## Artefacts de publication — ne jamais les éditer ici

`catalogue/`, `catalogue-index.json` et `tests/fixtures/` viennent du monorepo
`lumnik` et sont écrits **uniquement** par `scripts/publish-proposal-catalogue.sh`
(une branche + une PR ; un push sur `main` déploie). Une fixture modifiée à la main
fait échouer `tests/js/corpus.test.mjs` : republiez au lieu d'éditer.

L'empreinte d'une version dans `catalogue-index.json` n'est **pas** le SHA-256 des octets
du fichier : c'est le SHA-256 de son **JSON canonique** (clés triées par point de code,
séparateurs `,` et `:` sans espace, UTF-8), la même définition que le `catalogue.lock.json`
du monorepo. Le questionnaire la recalcule dans le navigateur (WebCrypto) et vérifie
d'abord, par un parseur strict, qu'aucune clé n'est répétée — ce que l'empreinte canonique
ne verrait pas.

## Direction visuelle

- **Métaphore** : la donnée gelée (nuit glaciaire, givre, texture grain) traversée par
  UNE lumière chaude — le jaune `#ffd24a`, traité comme de la vraie lumière (halo du
  héros, mots en fusion, CTA, barre de dégel).
- **Typo** : Fraunces (titres, éditorial chaleureux) · Archivo (texte) ·
  IBM Plex Mono (étiquettes techniques). Chargées via Google Fonts.
- Respecte `prefers-reduced-motion`.

## À faire avant la mise en ligne

1. ~~**Formulaire** : créer un formulaire sur formspree.io et remplacer
   l'ID de formulaire placeholder.~~ Fait — les deux pages à formulaire
   (`offre.html`, `essai.html`) postent vers le formulaire Formspree réel.
2. ~~**Email**~~ Décision : le formulaire reste l'unique canal de contact sur les
   pages marketing (`offre.html`, `essai.html`) ; l'adresse email légale
   n'apparaît que sur `mentions.html`, comme contact de l'éditeur.
3. ~~Page mentions légales~~ Fait — `mentions.html`, liée depuis le pied des
   pages marketing.
4. **Essai cloud** : quand le bac à sable existera, `essai.html` accueillera le lien
   d'accès à la place du badge « ouverture prochaine ».
5. **Mise en ligne** : `CNAME` (`lumnik.fr`) → GitHub Pages, DNS (4×A + `www` CNAME),
   HTTPS enforcement — hors périmètre de ce dépôt de contenu, traité au moment de
   la publication.
6. Éventuel : favicon fichier (actuellement un data-URI), plausible.io pour la
   mesure d'audience sans cookies.

## Déploiement

GitHub Pages sert directement `main`, à la racine : zéro build, zéro workflow —
un `push` sur `main` est déployé tel quel. Le fichier `CNAME` (`lumnik.fr`) fixe
le domaine apex ; côté DNS, 4 enregistrements A vers les IP GitHub Pages plus un
CNAME `www` → `<compte>.github.io`.

Test local : `python3 -m http.server 8000` puis http://localhost:8000

## Ce que le site ne dit volontairement pas

Pas de pile technique interne (framework serveur, bibliothèques IA), pas de tarifs
chiffrés (hypothèses en cours de validation), pas de détails d'implémentation des
garde-fous. Le site vend le *quoi* et le *pourquoi* ; le *comment* profond reste
dans la maison.
