# lumnik.fr — site vitrine

Site statique, zéro framework, zéro build : deux pages HTML, une feuille de style,
un script de 30 lignes. Se déploie sur n'importe quel hébergeur statique.

## Structure

```
index.html    la vitrine (héros, problème, 3 gestes, cas français, architecture,
              comparaison, personas, offre, contact)
essai.html    inscription à l'essai cloud (bac à sable — ouverture prochaine)
styles.css    « la lumière dans le congélateur » — nuit glaciaire + jaune de lumière
site.js       barre de dégel (progression) + révélation au défilement
```

## Direction visuelle

- **Métaphore** : la donnée gelée (nuit glaciaire, givre, texture grain) traversée par
  UNE lumière chaude — le jaune `#ffd24a`, traité comme de la vraie lumière (halo du
  héros, mots en fusion, CTA, barre de dégel).
- **Typo** : Fraunces (titres, éditorial chaleureux) · Archivo (texte) ·
  IBM Plex Mono (étiquettes techniques). Chargées via Google Fonts.
- Respecte `prefers-reduced-motion`.

## À faire avant la mise en ligne

1. ~~**Formulaire** : créer un formulaire sur formspree.io et remplacer
   `VOTRE_ID_FORMSPREE`.~~ Fait — les deux pages postent vers le formulaire
   Formspree réel.
2. ~~**Email**~~ Décision : pas d'email affiché, le formulaire est l'unique canal
   de contact (l'adresse email retirée des deux pages).
3. ~~Page mentions légales~~ Fait — `mentions.html`, liée depuis le pied des deux pages.
4. **Essai cloud** : quand le bac à sable existera, `essai.html` accueillera le lien
   d'accès à la place du badge « ouverture prochaine ».
5. **Mise en ligne** : `CNAME` (`lumnik.fr`) → GitHub Pages, DNS (4×A + `www` CNAME),
   HTTPS enforcement — hors périmètre de ce dépôt de contenu, traité au moment de
   la publication.
6. Éventuel : favicon fichier (actuellement un data-URI), plausible.io pour la
   mesure d'audience sans cookies.

## Déploiement

N'importe quel hébergeur statique fait l'affaire — exemples :

```bash
# Netlify / Vercel : glisser-déposer le dossier, pointer lumnik.fr dessus.
# Ou n'importe quel serveur :
rsync -av --exclude .git ./ votre-serveur:/var/www/lumnik.fr/
```

Test local : `python3 -m http.server 8000` puis http://localhost:8000

## Ce que le site ne dit volontairement pas

Pas de pile technique interne (framework serveur, bibliothèques IA), pas de tarifs
chiffrés (hypothèses en cours de validation — voir la réflexion pricing privée),
pas de détails d'implémentation des garde-fous. Le site vend le *quoi* et le
*pourquoi* ; le *comment* profond reste dans la maison.
