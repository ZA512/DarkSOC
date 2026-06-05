# Dark SOC

Dark SOC est un jeu web solo, textuel et incremental orienté cybersécurité. Le joueur incarne un RSSI qui doit faire progresser la maturité cyber d'une entreprise en croissance avec peu de visibilité, peu de budget et une dette cyber déjà présente.

Le projet vise une expérience sobre, progressive et lisible : observer, découvrir, prioriser, investir, se défendre, subir, apprendre.

## Concept

Le principe central du jeu est simple : la sécurité ne supprime pas le risque, elle transforme un désastre en incident maîtrisable.

Le joueur ne gagne pas parce que tout est sécurisé. Il gagne parce qu'il comprend quoi protéger, quoi accepter, quoi prouver, et quand dire non.

## État actuel

Le dépôt contient aujourd'hui un prototype jouable centré sur les bases du moteur et de l'interface :

- une boucle initiale avec l'action manuelle de collecte de logs ;
- un état de jeu strictement typé en TypeScript ;
- un reducer pur pour appliquer les actions ;
- un journal narratif ;
- une carte d'infrastructure en SVG ;
- une interface Svelte minimaliste ;
- une i18n maison en JSON avec le français comme langue principale ;
- des tests unitaires Vitest sur le moteur et les modèles.

Certaines briques décrites dans la documentation projet sont encore prévues mais pas entièrement implémentées à ce stade : technologies, employés, incidents avancés, persistance complète, export/import de sauvegarde et gameplay data-driven complet.

## Stack imposée

Le MVP repose sur la stack suivante :

- Vite
- TypeScript strict
- Svelte
- CSS natif
- SVG pour la visualisation de l'infrastructure
- localStorage pour la sauvegarde automatique
- export/import JSON pour les sauvegardes
- i18n maison via fichiers JSON
- Vitest pour les tests unitaires
- ESLint et Prettier

Le projet n'utilise pas de backend pour le MVP.

## Principes d'architecture

Le dépôt suit quelques règles non négociables :

- le moteur de jeu reste indépendant de Svelte ;
- les composants Svelte affichent l'état et déclenchent des actions, ils ne modifient jamais directement le GameState ;
- toute évolution du jeu passe par des actions typées et par le reducer ;
- les textes visibles par le joueur passent par l'i18n ;
- les données de gameplay doivent rester data-driven autant que possible ;
- les valeurs d'équilibrage ne doivent pas être dispersées dans l'UI.

## Structure du projet

```text
.
├─ docs/
│  ├─ SPECIFICATION.md
│  ├─ BALANCING.md
│  └─ SAVE_FORMAT.md
├─ src/
│  ├─ app/
│  │  ├─ App.svelte
│  │  └─ components/
│  ├─ data/
│  │  └─ i18n/
│  ├─ game/
│  │  ├─ engine/
│  │  └─ model/
│  ├─ i18n/
│  └─ main.ts
├─ AGENTS.md
└─ package.json
```

## Installation

```bash
npm install
```

## Commandes

Le projet doit maintenir les commandes suivantes :

```bash
npm run dev
npm run build
npm run test
npm run lint
npm run format
```

## Démarrage rapide

Pour lancer le prototype en local :

```bash
npm run dev
```

Pour vérifier la qualité minimale après une modification significative :

```bash
npm run test
npm run build
```


## Vision produit

Dark SOC n'est pas une simulation exhaustive d'entreprise. Le jeu cherche plutôt à faire ressentir les tensions d'un RSSI en environnement contraint : manque de visibilité, manque de ressources, arbitrages permanents, pression du business, dette cyber et incidents.

L'interface doit rester minimaliste, lisible et réaliste, avec une tonalité sobre, légèrement sarcastique, sans surcharger le joueur d'effets inutiles.

