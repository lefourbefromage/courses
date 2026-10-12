# Courses — menu de la semaine et liste de courses

Petit site privé, utilisable au téléphone pendant les courses.
Le menu se remplit sur l'ordinateur, la liste se coche au supermarché : les deux
appareils voient la même chose parce que tout est enregistré en ligne.

## Les trois onglets

| Onglet | À quoi ça sert |
| --- | --- |
| **Menu** | Une semaine à la fois : une carte par jour, avec le midi et le soir. Chaque case a deux boutons : 🔗 pour garder le lien de la recette, ♻ pour dire que ce repas reprend un plat déjà cuisiné. C'est le seul onglet où l'on change de semaine. |
| **Ingrédients** | Tous les plats de la **semaine en cours et des semaines à venir**, chacun avec ses ingrédients et leurs quantités. Chaque semaine a aussi sa zone **Hors menu** : le sopalin, l'eau, les chips — ce qui n'appartient à aucune recette. |
| **Courses** | La liste complète de **cette semaine et de tout ce qui vient**, regroupée par rayon, à cocher au magasin. |

Les onglets Ingrédients et Courses n'ont pas de navigation par semaine : ils
regardent toujours en avant. Écrire le menu de la semaine prochaine, ou être à
cheval sur deux semaines, remplit donc la même liste de courses — rien ne se
perd et rien ne s'affiche en double. Les semaines passées, elles, ne polluent
plus la liste : seul l'onglet Menu permet d'y retourner.

### Les restes

Une case du Menu peut être marquée comme les **restes** d'un autre repas de la
semaine (bouton ♻, puis on choisit le plat d'origine). Ce repas-là n'a alors
aucun ingrédient à saisir et **n'ajoute rien à la liste de courses** : on ne
rachète pas deux fois de quoi faire des lasagnes.

Un repas en restes ne peut pas servir de source à d'autres restes, ni pointer
vers un repas d'une autre semaine — l'app refuse ces cas.

Remplir le menu est plus confortable sur ordinateur, où les sept jours tiennent
côte à côte ; la liste de courses est faite pour le téléphone.

### Le lien de la recette

Le bouton 🔗 d'une case enregistre l'adresse de la recette (vidéo Instagram,
YouTube, page de blog). Le bouton devient vert quand un lien existe, et l'ouvre
dans un nouvel onglet. Seules les adresses `http` et `https` sont acceptées, et
un lien collé sans `https://` est complété automatiquement.

### Remplir le menu à deux

L'app se rafraîchit toutes les 3 secondes tant que l'onglet est visible. Une
case en cours de modification par quelqu'un d'autre s'entoure de sa couleur, et
un bandeau signale sa présence.

Ce qu'on est en train de taper n'est **jamais** écrasé par cette
synchronisation : la case où se trouve le curseur, celles dont l'enregistrement
est programmé et celles dont la requête est encore en vol gardent la valeur
locale (`mergeFresh` dans `components/App.tsx`).

### Faire les courses à deux

Rien à activer : les cases cochées vivent dans la base, pas dans le téléphone.
Chaque appareil interroge la base toutes les trois secondes, et n'écrase jamais
ce qui vient d'être coché en local — un cochage part au serveur tout de suite,
et tant qu'il n'est pas confirmé il gagne contre ce qui arrive du réseau.

Côté code : la table `checks` (une ligne par article coché), la route
`app/api/checks/route.ts`, et la file d'attente `pendingChecks` dans
`components/App.tsx`.

### Ce que l'onglet Courses fait tout seul

- **Regroupe les doublons.** « Carottes » dans un repas et « Carotte » dans un
  autre donnent une seule ligne, `Carottes ×2`.
- **Additionne les quantités** par unité : `250 g` + `250 g` → `500 g`.
  Deux unités différentes ne sont jamais converties de force : `2 + 500 g`.
- **Comprend les quantités écrites dans le nom** : `Roquette x2`,
  `250g porc haché`, `4 cuisses de poulet`, `2 boîtes de tomates`.
- **Corrige l'orthographe** avec un dictionnaire de ~375 produits :
  `yahourt grec` → `Yaourt grec`, `Mozza` → `Mozzarella`, `Patates` → `Pommes de terre`.
- **Range par rayon** dans l'ordre où on traverse un magasin. Un produit inconnu
  va dans « Autres » : appui long sur la ligne pour lui donner le bon rayon,
  et l'app s'en souviendra.
- **Mélange repas et hors menu** dans la même liste : un article venant du hors
  menu est simplement noté « Hors menu » quand on appuie longuement dessus.
- **Partage les cases cochées** entre les appareils : à deux dans le magasin,
  ce que l'un coche apparaît chez l'autre en deux ou trois secondes. Elles sont
  aussi gardées dans la mémoire du téléphone, donc rafraîchir la page ne perd
  rien — et dans un rayon sans réseau, un cochage n'est pas perdu : il part
  tout seul dès que la connexion revient (un message le signale en attendant).

### Les deux boutons en haut de la liste

- **Resynchroniser** — recharge le menu (utile si quelqu'un l'a modifié pendant
  que tu fais les courses). Ce qui est déjà coché reste coché ; un article dont
  la quantité a **augmenté** est décoché pour que tu y retournes.
- **Tout décocher** — repart d'une liste vierge. Comme les cases sont
  partagées, cela décoche **aussi chez l'autre personne**.

## Installer sur l'écran d'accueil du téléphone

1. Ouvrir l'adresse du site dans Safari (iPhone) ou Chrome (Android).
2. Bouton Partager → « Sur l'écran d'accueil ».
3. L'app s'ouvre alors en plein écran, comme une vraie application.

## Changer le code d'accès

Dans le tableau de bord Vercel : projet **menu-semaine** → onglet **Settings** →
**Environment Variables** → modifier `APP_ACCESS_CODE` → puis onglet
**Deployments** → « ⋯ » sur le déploiement le plus récent → **Redeploy**.
Chaque appareil devra ressaisir le nouveau code.

## Le style

Un seul thème, clair : papier crème, encre presque noire, un vert profond pour
le volet de navigation, et du corail pour ce qui compte. Deux polices, servies
depuis le site (aucun appel à Google, 84 Ko en tout) : **Instrument Serif** pour
les titres, **DM Sans** pour tout le reste.

**Deux mises en page, pas une seule étirée.** Sous 1000 px, on a la pile
classique du téléphone : un en-tête, le contenu, la barre d'onglets en bas.
Au-delà, un volet vert fixe à gauche tient la navigation et les cartes se
rangent en plusieurs colonnes. Dans le Menu, les sept jours passent de un à
deux, trois, puis sept par ligne selon la largeur.

**Chaque rayon a sa couleur.** Elle habille le bandeau de la carte, la pastille
de l'icône et le badge de quantité. Dans l'onglet Ingrédients, chaque plat prend
la teinte de son jour. Ces couleurs tiennent dans deux variables par rayon, en
bas de `app/globals.css` :

```css
[data-cat="fruits-legumes"] { --cat-soft: #e4f0dd; --cat-ink: #2c5a34; }
```

**Les illustrations** sont dans `components/Illustration.tsx` : la marmite, le
carnet de recettes, le panier vide et le panier fêté, l'étal de légumes. Elles
sont dessinées à la main en SVG ; leur contour suit la couleur du texte et
leurs aplats passent par `--il-a` … `--il-d`, ce qui leur permet d'être posées
aussi bien sur le papier crème que sur le vert du volet.

Les icônes, elles, sont au trait dans `components/Icon.tsx` et héritent la
couleur du texte. Pour en ajouter une : un chemin dans `PATHS`, puis son nom
dans `lib/categories.ts`.

## Pour les curieux : comment c'est fait

- **Next.js** (React) déployé sur **Vercel**, base **Neon Postgres**.
- Les tables sont créées automatiquement au premier lancement
  (`lib/db.ts`) : aucune commande de migration à lancer.
- Le classement et la correction des produits sont dans `lib/products.ts`
  (le dictionnaire) et `lib/normalize.ts` (quantités et correction floue).
- Pour ajouter des produits au dictionnaire, éditer `lib/products.ts` :
  une ligne par produit, `"Nom affiché|synonyme1,synonyme2"`.

### Commandes utiles

```bash
npm run dev                      # tester sur cet ordinateur
npx tsx scripts/test-engine.ts   # vérifier le classement d'une liste d'exemple
npx vercel --prod                # remettre en ligne après une modification
```
