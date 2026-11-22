# Carrousel narratif de la page d’accueil — Design

**Date :** 2026-11-22  
**Statut :** soumis à validation

## Intention

La page d’entrée doit faire comprendre Lumnik avant la lecture des sections longues : les
applications existantes restent utiles, Lumnik rassemble leurs données en entités par métier,
des manifests déclaratifs construisent la tuyauterie, puis ces entités servent les personnes et
les systèmes.

## Approches considérées

1. **Grand carrousel sous un héros raccourci — retenu.** Le texte HTML garde la promesse et les
   actions ; les visuels utilisent toute la largeur nécessaire à leurs détails.
2. **Carrousel comme héros avec texte superposé.** Plus spectaculaire, mais le texte se bat avec
   les diagrammes déjà denses.
3. **Carrousel dans la colonne droite actuelle.** Changement plus petit, mais les manifests et les
   attributs deviennent illisibles.

## Composition

Le héros devient une colonne unique : surtitre, titre resserré, courte phrase, preuves et CTA,
puis un carrousel pleine largeur dans le `wrap`. La fiche client actuelle quitte le héros ; les
sections suivantes restent inchangées.

Les trois slides FR retenus sont :

1. `slide-01-entites-metier-v2.png` — sources legacy et Kafka vers des entités du métier
   Maintenance ;
2. `slide-02-kinds-tuyauterie-v3.png` — manifests Kubernetes-style vers connecteurs, entités,
   app métier, chat IA et recherche ;
3. `slide-03-metier-plusieurs-sorties-v2.png` — PWA, décision métier, API REST, exports,
   Text-to-SQL et recherche d’identités.

Chaque slide reçoit une légende HTML courte. L’image porte la démonstration ; la légende rend le
sens disponible aux lecteurs d’écran et reste utile si l’image ne charge pas.

## Comportement

- Premier slide visible dès le chargement ; les deux suivants sont chargés paresseusement.
- Flèches précédent/suivant, trois indicateurs cliquables et navigation au clavier.
- Rotation automatique toutes les 8 secondes, interrompue dès que le carrousel reçoit le survol,
  le focus ou une interaction. Elle ne reprend pas après une action volontaire.
- `prefers-reduced-motion: reduce` désactive la rotation et les transitions animées.
- Sur mobile, les images restent entières dans leur ratio 16:9 ; le geste horizontal change de
  slide. Aucun recadrage ne peut couper les libellés.
- Sans JavaScript, le premier slide et sa légende restent visibles.

## Direction visuelle

Le carrousel reprend les couleurs des images et du site sans ajouter un cadre SaaS générique :
fond prune, filet discret, coins cohérents avec les visuels. Les contrôles restent petits, très
contrastés et extérieurs à l’information importante. La typographie existante est conservée :
Fraunces pour la promesse, Archivo pour le texte, IBM Plex Mono pour les repères techniques.

## Contraintes et non-objectifs

- HTML, CSS et JavaScript natifs ; aucune dépendance Bootstrap.
- Conserver les CTA, les preuves et toutes les sections après le héros.
- Accessibilité clavier, focus visible, états ARIA et réduction des animations.
- Ne pas intégrer encore les versions anglaises et ne pas modifier le site EN.
- Ne pas réécrire les images pendant l’intégration.

## Vérification

- Tests structurels existants du site.
- Tests JavaScript ciblés du carrousel si le comportement peut être isolé proprement.
- Contrôle visuel desktop et mobile, avec et sans JavaScript, puis avec réduction des animations.
- Vérification qu’aucun texte des PNG n’est coupé et que le premier écran explique Lumnik.
