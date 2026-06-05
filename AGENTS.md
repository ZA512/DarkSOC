# AGENTS.md — Instructions pour Codex

Ce dépôt contient le jeu **Dark SOC**, un jeu web solo, textuel, incremental et orienté cybersécurité/RSSI.

Le joueur incarne un RSSI qui doit faire progresser la maturité cyber d’une entreprise en croissance, avec peu de visibilité, peu de budget, une dette cyber importante, des incidents, des audits, de la pression COMEX et une infrastructure qui se révèle progressivement.

---

# 1. Documents à lire avant toute modification

Avant de modifier le code, toujours lire :

```text
docs/SPECIFICATION.md
docs/BALANCING.md
docs/SAVE_FORMAT.md
```

Ces documents définissent :

* l’architecture cible ;
* les mécaniques de jeu ;
* les ressources ;
* les technologies ;
* les coûts ;
* les règles d’équilibrage ;
* le format de sauvegarde ;
* les contraintes d’implémentation.

Ne pas inventer une architecture différente si les documents projet donnent déjà une réponse.

---

# 2. Stack technique imposée

Utiliser uniquement la stack suivante pour le MVP :

```text
Vite
TypeScript strict
Svelte
CSS natif
SVG pour la constellation infrastructure
localStorage pour la sauvegarde automatique
Export/import JSON pour les sauvegardes
i18n maison via fichiers JSON
Vitest pour les tests unitaires du moteur
ESLint
Prettier
```

Ne pas ajouter de backend.

Ne pas ajouter React.

Ne pas ajouter Phaser.

Ne pas ajouter Electron.

Ne pas ajouter Tauri.

Ne pas ajouter IndexedDB dans le MVP sauf demande explicite.

Ne pas utiliser de cookies pour sauvegarder la partie.

---

# 3. Commandes à maintenir

Le projet doit fournir et maintenir ces commandes :

```bash
npm run dev
npm run build
npm run test
npm run lint
npm run format
```

À chaque tâche significative, vérifier au minimum :

```bash
npm run test
npm run build
```

Si une commande échoue, corriger ou expliquer clairement pourquoi elle échoue.

---

# 4. Architecture attendue

Le projet doit séparer clairement :

```text
UI Svelte
moteur de jeu TypeScript
données de gameplay JSON
traductions JSON
persistance/sauvegarde
tests
documentation
```

Structure cible :

```text
src/
  app/
    App.svelte
    components/

  game/
    engine/
    model/

  data/
    gameplay/
    i18n/

  i18n/

  persistence/

  ui/
```

Le moteur de jeu doit rester indépendant de Svelte.

Les composants Svelte affichent l’état et déclenchent des actions.

Les composants Svelte ne doivent pas contenir la logique métier du jeu.

---

# 5. Règles de modification du GameState

Ne jamais modifier directement le `GameState` depuis un composant Svelte.

Toute modification du jeu doit passer par :

```text
GameAction
applyAction()
reducer.ts
```

Le reducer doit être pur autant que possible :

```text
état actuel + action => nouvel état
```

Ne pas muter l’état d’entrée.

Ne pas disperser la logique de modification de ressources dans plusieurs composants.

---

# 6. Données de gameplay

Les éléments suivants doivent être data-driven autant que possible :

* technologies ;
* coûts ;
* effets ;
* prérequis ;
* attaques ;
* employés ;
* événements ;
* paliers business ;
* valeurs d’équilibrage.

Les valeurs doivent être placées dans :

```text
src/data/gameplay/resources.json
src/data/gameplay/technologies.json
src/data/gameplay/employees.json
src/data/gameplay/attacks.json
src/data/gameplay/events.json
src/data/gameplay/businessStages.json
src/data/gameplay/balancing.json
```

Ne pas cacher de chiffres d’équilibrage dans les composants Svelte.

Ne pas coder en dur les coûts d’une technologie dans l’UI.

---

# 7. Internationalisation

Tous les textes visibles par le joueur doivent passer par le système i18n.

Langue principale :

```text
fr
```

Langue secondaire prévue :

```text
en
```

Les textes doivent être placés dans :

```text
src/data/i18n/fr/
src/data/i18n/en/
```

Ne pas écrire directement dans les composants des textes visibles comme :

```text
Collecter des logs
Préparer un rapport COMEX
Sauvegarde modifiée détectée
```

Utiliser une clé i18n.

Exception tolérée :

* messages techniques temporaires en développement ;
* logs console non visibles par le joueur.

---

# 8. Sauvegarde

Le MVP doit utiliser :

```text
localStorage
```

Clé principale :

```text
dark-soc-save-main
```

Ne pas utiliser de cookies pour sauvegarder la partie.

Le système de sauvegarde doit être isolé dans :

```text
src/persistence/
```

La sauvegarde doit prévoir :

* autosave ;
* export JSON ;
* import JSON ;
* enveloppe de sauvegarde versionnée ;
* checksum SHA-256 simple ;
* détection de sauvegarde modifiée ;
* validation du GameState ;
* migrations futures.

Ne pas implémenter de chiffrement lourd dans le MVP.

Ne pas ajouter de sauvegarde cloud.

---

# 9. Interface et accessibilité

La zone infrastructure doit être en SVG.

Elle représente le SI sous forme de constellation lumineuse.

Règles :

* pas de clignotement violent ;
* pas de flash on/off ;
* variation douce d’opacité ou de luminosité ;
* cycle conseillé : 3 à 5 secondes ;
* respecter `prefers-reduced-motion` ;
* prévoir une option animations normales/réduites/désactivées ;
* ne pas dépendre uniquement de la couleur pour transmettre une information critique.

---

# 10. Ton narratif

Le ton doit être :

* sobre ;
* réaliste ;
* légèrement sarcastique ;
* compréhensible par un public cyber ;
* pas professoral ;
* pas trop bavard.

Exemples de ton attendu :

```text
La salle est calme. Trop calme.
Un serveur clignote dans l’obscurité.
Personne ne sait vraiment à quoi il sert.
```

```text
Le SIEM fonctionne. Il parle beaucoup. Trop.
```

```text
Le COMEX demande si le risque est maîtrisé. La bonne réponse dépend du niveau de courage disponible.
```

Éviter :

* blagues longues ;
* private jokes incompréhensibles ;
* jargon excessif ;
* vulgarité gratuite ;
* texte inutilement explicatif.

---

# 11. Tests

Toute mécanique de moteur doit avoir des tests Vitest.

Tests prioritaires :

* état initial ;
* actions manuelles ;
* achat de technologie ;
* coûts et prérequis ;
* bornage des ressources ;
* sauvegarde/import/export ;
* checksum ;
* validation du GameState ;
* résolution d’attaque.

Ne pas considérer une tâche terminée si les tests liés au moteur ne sont pas mis à jour.

---

# 12. Interdictions

Ne pas faire :

```text
backend
authentification
compte utilisateur
classement en ligne
sauvegarde cloud
React
Phaser
Electron
Tauri
cookies pour sauvegarde
logique gameplay dans les composants UI
texte visible codé en dur
valeurs d’équilibrage dispersées dans le code
refactor massif non demandé
```

---

# 13. Méthode de travail attendue

Pour chaque tâche :

1. lire les documents utiles ;
2. identifier le périmètre exact ;
3. faire le minimum nécessaire ;
4. éviter les refactors non demandés ;
5. ajouter ou mettre à jour les tests ;
6. lancer les commandes nécessaires ;
7. résumer les changements.

Ne pas implémenter plusieurs phases à la fois si la demande porte sur une phase précise.

Ne pas anticiper des fonctionnalités hors périmètre.

---

# 14. Priorité projet

Priorité d’implémentation :

```text
lisibilité
séparation moteur/UI
testabilité
jouabilité
équilibrage
esthétique
optimisation
```

La première version doit être simple, propre et extensible.

Ne pas chercher à faire un jeu complet immédiatement.

Le MVP doit d’abord prouver que la boucle suivante est agréable :

```text
observer → découvrir → prioriser → investir → se défendre → subir → apprendre
```
