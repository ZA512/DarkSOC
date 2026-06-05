# Dark SOC — Spécification d’implémentation pour agent IA

Version : 0.1
Langue principale : français
Objectif : créer un jeu web textuel / incremental / gestion cyber inspiré du rythme de *A Dark Room*, mais avec un design original centré sur le rôle de RSSI.

---

# 1. Objectif du projet

Créer un jeu web solo, jouable dans navigateur, sans backend obligatoire, dans lequel le joueur incarne un RSSI qui doit faire progresser la maturité cyber d’une entreprise en croissance.

Le jeu doit être textuel, minimaliste, progressif, avec une interface sobre et une visualisation latérale de l’infrastructure sous forme de constellation lumineuse.

Le joueur doit gérer des ressources cyber, débloquer des capacités, affecter des profils, découvrir l’infrastructure, répondre à des incidents, arbitrer avec le business et faire évoluer la maturité de sécurité.

Le jeu ne doit pas être une simulation complète d’entreprise. Le joueur ne gère pas toute la société ; il gère la sécurité d’une entreprise qui grossit autour de lui.

Phrase de conception centrale :

> Le joueur ne gagne pas parce qu’il a tout sécurisé. Il gagne parce qu’il a compris quoi protéger, quoi accepter, quoi prouver, et quand dire non.

---

# 2. Stack technique imposée

Utiliser la stack suivante :

* Vite
* TypeScript strict
* Svelte
* CSS natif
* SVG pour la visualisation de l’infrastructure
* localStorage pour la sauvegarde automatique MVP
* Export/import JSON enveloppé pour les sauvegardes
* i18n maison simple via fichiers JSON
* Vitest pour les tests unitaires du moteur de jeu
* ESLint + Prettier

Ne pas utiliser de backend dans le MVP.

Ne pas utiliser React.

Ne pas utiliser Phaser pour le MVP.

Ne pas utiliser de cookies pour la sauvegarde principale.

Ne pas coder les textes visibles en dur dans les composants. Tous les textes affichés à l’utilisateur doivent passer par le système i18n.

---

# 3. Structure de dépôt attendue

Créer la structure suivante :

```text
/
  AGENTS.md
  package.json
  vite.config.ts
  tsconfig.json
  eslint.config.js
  prettier.config.js
  index.html

  docs/
    SPECIFICATION.md
    BALANCING.md
    SAVE_FORMAT.md
    I18N.md

  src/
    main.ts
    app/
      App.svelte
      components/
        ActionButton.svelte
        ResourcePanel.svelte
        NarrativeLog.svelte
        InfrastructureMap.svelte
        TechPanel.svelte
        EmployeePanel.svelte
        SavePanel.svelte
        SettingsPanel.svelte

    game/
      engine/
        reducer.ts
        actions.ts
        selectors.ts
        gameLoop.ts
        attacks.ts
        technologies.ts
        employees.ts
        assets.ts
        balancing.ts
        random.ts
        validation.ts

      model/
        GameState.ts
        Resource.ts
        Technology.ts
        Employee.ts
        Asset.ts
        Attack.ts
        Event.ts
        SaveGame.ts
        Settings.ts

    data/
      gameplay/
        resources.json
        technologies.json
        employees.json
        attacks.json
        events.json
        businessStages.json
        balancing.json

      i18n/
        fr/
          common.json
          resources.json
          actions.json
          technologies.json
          employees.json
          attacks.json
          events.json
        en/
          common.json
          resources.json
          actions.json
          technologies.json
          employees.json
          attacks.json
          events.json

    i18n/
      i18n.ts

    persistence/
      storage.ts
      saveCodec.ts
      migrations.ts
      exportImport.ts
      validation.ts

    ui/
      accessibility.ts
      animationSettings.ts
```

Le moteur de jeu doit être indépendant de Svelte.

Les composants Svelte ne doivent jamais modifier directement le `GameState`.

Toute modification du jeu doit passer par une action typée et par le reducer.

---

# 4. Fichier AGENTS.md attendu

Créer un fichier `AGENTS.md` à la racine avec le contenu suivant :

````markdown
# Instructions pour agent IA — Dark SOC

Ce dépôt contient un jeu web solo textuel / incremental / cyber nommé Dark SOC.

## Règles générales

- Toujours lire `docs/SPECIFICATION.md` avant de modifier le code.
- Ne jamais ajouter de backend sans demande explicite.
- Ne jamais ajouter de framework non demandé.
- Ne jamais coder de texte visible utilisateur directement dans les composants.
- Tous les textes visibles doivent passer par `src/data/i18n`.
- Ne jamais modifier directement le `GameState` depuis un composant Svelte.
- Toute évolution du jeu doit passer par des actions typées et par `game/engine/reducer.ts`.
- Les données de gameplay doivent rester data-driven dans `src/data/gameplay`.
- Les coûts, effets, prérequis et paliers ne doivent pas être dispersés dans le code.
- Le moteur de jeu doit rester testable sans navigateur.
- Toute nouvelle mécanique doit être accompagnée d’au moins un test unitaire si elle touche le moteur.
- Préférer du code simple, explicite et fortement typé.
- Ne pas créer d’abstraction prématurée.
- Ne pas refactorer massivement sans nécessité.
- Ne pas changer la stack technique sans accord explicite.

## Stack imposée

- Vite
- TypeScript strict
- Svelte
- CSS natif
- SVG pour la carte infrastructure
- localStorage pour autosave MVP
- Export/import JSON
- Vitest pour les tests moteur

## Commandes attendues

L’agent doit maintenir ces commandes :

```bash
npm run dev
npm run build
npm run test
npm run lint
npm run format
````

## Qualité attendue

Avant de considérer une tâche terminée :

1. Vérifier que TypeScript compile.
2. Lancer les tests.
3. Vérifier que le build fonctionne.
4. Ne pas laisser de TODO bloquant.
5. Documenter les décisions importantes dans `docs/`.

## Architecture

Le moteur de jeu est pur TypeScript.

Les composants Svelte affichent l’état et déclenchent des actions.

Le stockage local est isolé dans `src/persistence`.

Les traductions sont isolées dans `src/data/i18n`.

Les données de gameplay sont isolées dans `src/data/gameplay`.

## Interdictions

* Pas de cookies pour la sauvegarde principale.
* Pas de backend.
* Pas de React.
* Pas de Phaser.
* Pas de texte en dur dans l’UI.
* Pas de logique de gameplay dans les composants UI.
* Pas de valeurs d’équilibrage cachées dans les composants.

````

---

# 5. Concept de gameplay

Le jeu commence dans une salle noire.

Au début, le joueur voit très peu de choses :

- quelques logs ;
- une alerte ;
- un serveur inconnu ;
- une confiance COMEX basse ;
- une visibilité quasi nulle.

Le joueur doit progressivement :

1. collecter des logs ;
2. analyser des alertes ;
3. auditer manuellement le SI ;
4. découvrir des actifs ;
5. obtenir des constats ;
6. produire des preuves ;
7. obtenir du budget ;
8. acheter ou débloquer des capacités ;
9. affecter des employés ;
10. réduire la dette cyber ;
11. survivre à des incidents ;
12. gérer la croissance de l’entreprise.

Le gameplay repose sur cette boucle :

```text
observer → découvrir → prioriser → investir → se défendre → subir → apprendre
````

---

# 6. Ressources du MVP

Implémenter les ressources suivantes :

```typescript
type ResourceId =
  | "logs"
  | "findings"
  | "proofs"
  | "budget"
  | "trust"
  | "visibility"
  | "knownDebt"
  | "unknownDebt"
  | "fatigue"
  | "exposure"
  | "resilience"
  | "alertNoise";
```

Description :

* `logs` : matière brute pour détecter et analyser.
* `findings` : constats issus d’audits, scans, pentests ou incidents.
* `proofs` : preuves utilisables pour COMEX, audit, assurance, conformité.
* `budget` : ressource d’achat.
* `trust` : confiance COMEX.
* `visibility` : pourcentage du SI connu.
* `knownDebt` : dette cyber connue.
* `unknownDebt` : dette cyber non découverte.
* `fatigue` : surcharge équipe.
* `exposure` : surface d’attaque business.
* `resilience` : capacité à encaisser et restaurer.
* `alertNoise` : bruit d’alertes.

Contraintes :

* Les ressources numériques ne doivent jamais devenir `NaN`.
* Les ressources négatives impossibles doivent être bornées à zéro.
* `trust`, `visibility`, `fatigue`, `resilience` et `alertNoise` doivent être bornées entre 0 et 100.
* `exposure`, `knownDebt` et `unknownDebt` peuvent dépasser 100.
* Toute modification de ressource doit passer par une fonction utilitaire centralisée.

---

# 7. Actions initiales du joueur

Au démarrage, seules ces actions sont disponibles :

## collect_logs

Libellé FR : Collecter des logs
Effet :

```json
{
  "logs": 10
}
```

Cooldown MVP : aucun ou très court.

## analyze_alert

Libellé FR : Analyser une alerte
Coût :

```json
{
  "logs": 10
}
```

Effet :

```json
{
  "findings": 5,
  "fatigue": 1
}
```

## manual_audit

Libellé FR : Faire un audit manuel
Effet :

```json
{
  "findings": 5,
  "proofs": 3,
  "unknownDebt": -5,
  "knownDebt": 4,
  "fatigue": 1
}
```

## write_comex_report

Libellé FR : Préparer un rapport COMEX
Coût :

```json
{
  "findings": 20,
  "proofs": 20
}
```

Effet :

```json
{
  "trust": 5,
  "budget": 50
}
```

---

# 8. Technologies du MVP

Les technologies doivent être définies dans `src/data/gameplay/technologies.json`.

Chaque technologie doit avoir cette structure :

```typescript
type Technology = {
  id: string;
  category: TechnologyCategory;
  cost: Partial<Record<ResourceId, number>>;
  requires: string[];
  effects: Partial<Record<StatId, number>>;
  unlocks?: string[];
  repeatable?: boolean;
};
```

Catégories :

```typescript
type TechnologyCategory =
  | "detection"
  | "governance"
  | "identity"
  | "resilience"
  | "risk_reduction"
  | "appsec"
  | "cloud"
  | "third_party";
```

Technologies minimales à implémenter :

## asset_register

Nom FR : Registre des actifs
Catégorie : governance
Coût :

```json
{
  "logs": 80,
  "findings": 30
}
```

Effets :

```json
{
  "visibilityGain": 10,
  "unknownDebtReduction": 10,
  "knownDebtIncrease": 8
}
```

Débloque :

```json
["basic_log_collector", "basic_vulnerability_scanner"]
```

## basic_log_collector

Nom FR : Collecteur de logs basique
Catégorie : detection
Coût :

```json
{
  "logs": 100,
  "budget": 50
}
```

Effets :

```json
{
  "logsPerTick": 2
}
```

## basic_vulnerability_scanner

Nom FR : Scanner de vulnérabilités basique
Catégorie : risk_reduction
Coût :

```json
{
  "findings": 120,
  "budget": 80
}
```

Effets :

```json
{
  "knownDebtIncrease": 15,
  "unknownDebtReduction": 20,
  "findingsPerTick": 1
}
```

Débloque :

```json
["patch_management_v1"]
```

## incident_procedure_v0

Nom FR : Procédure incident v0
Catégorie : resilience
Coût :

```json
{
  "proofs": 60,
  "findings": 40
}
```

Effets :

```json
{
  "resilience": 10
}
```

## phishing_awareness_v0

Nom FR : Sensibilisation phishing v0
Catégorie : governance
Coût :

```json
{
  "proofs": 80,
  "budget": 50
}
```

Effets :

```json
{
  "phishingDefense": 10
}
```

## centralized_logs

Nom FR : Centralisation des logs
Catégorie : detection
Prérequis :

```json
["basic_log_collector"]
```

Coût :

```json
{
  "budget": 300,
  "logs": 300
}
```

Effets :

```json
{
  "logsPerTick": 5,
  "detection": 10,
  "alertNoise": 10
}
```

Débloque :

```json
["minimal_siem"]
```

## minimal_siem

Nom FR : SIEM minimal
Catégorie : detection
Prérequis :

```json
["centralized_logs"]
```

Coût :

```json
{
  "budget": 800,
  "logs": 600,
  "proofs": 150
}
```

Effets :

```json
{
  "detection": 20,
  "alertNoise": 25
}
```

Débloque :

```json
["siem_analyst"]
```

## siem_analyst

Nom FR : Expert SIEM
Catégorie : detection
Prérequis :

```json
["minimal_siem"]
```

Coût :

```json
{
  "budget": 300,
  "trust": 40
}
```

Effets :

```json
{
  "detection": 15,
  "alertNoise": -20,
  "fatigue": -5
}
```

Débloque :

```json
["business_hours_soc"]
```

## business_hours_soc

Nom FR : SOC heures ouvrées
Catégorie : detection
Prérequis :

```json
["minimal_siem", "siem_analyst"]
```

Coût :

```json
{
  "budget": 2000,
  "proofs": 300
}
```

Effets :

```json
{
  "detection": 30,
  "incidentResponse": 15,
  "fatigue": -10
}
```

Débloque :

```json
["mdr"]
```

## mdr

Nom FR : MDR
Catégorie : detection
Prérequis :

```json
["business_hours_soc"]
```

Coût :

```json
{
  "budget": 3500,
  "proofs": 500
}
```

Effets :

```json
{
  "detection": 35,
  "incidentResponse": 25,
  "fatigue": -10
}
```

---

# 9. Arbre technologique cible

Implémenter progressivement cet arbre. Pour le MVP, seules les premières branches doivent fonctionner.

```text
DÉPART
 |
 |-- Collecter logs
 |     |
 |     |-- Collecteur logs
 |     |     |
 |     |     |-- Centralisation logs
 |     |            |
 |     |            |-- SIEM minimal
 |     |                   |
 |     |                   |-- Expert SIEM
 |     |                          |
 |     |                          |-- SOC heures ouvrées
 |     |                                 |
 |     |                                 |-- MDR
 |     |                                        |
 |     |                                        |-- SOAR
 |
 |-- Audit manuel
 |     |
 |     |-- Registre actifs
 |     |     |
 |     |     |-- Cartographie SI
 |     |            |
 |     |            |-- Cartographie cloud
 |     |            |      |
 |     |            |      |-- CNAPP
 |     |            |
 |     |            |-- Segmentation
 |
 |-- Procédure incident
 |     |
 |     |-- Sauvegardes testées
 |            |
 |            |-- Exercice de crise
 |                   |
 |                   |-- PRA/PCA
 |
 |-- Rapport COMEX
 |     |
 |     |-- Comité sécurité
 |            |
 |            |-- PSSI
 |                   |
 |                   |-- Gestion tiers
 |                          |
 |                          |-- NIS2 / cyberassurance
```

---

# 10. Employés

Les employés ne sont pas obligatoires dans la toute première itération, mais l’architecture doit les prévoir.

Type attendu :

```typescript
type Employee = {
  id: string;
  role: EmployeeRole;
  assignedTaskId?: string;
  fatigue: number;
  unlocked: boolean;
};
```

Rôles :

```typescript
type EmployeeRole =
  | "admin"
  | "analyst"
  | "auditor"
  | "secops"
  | "governance"
  | "pentester"
  | "appsec"
  | "cloudsec";
```

Rôles initiaux :

## admin

Nom FR : Admin volontaire
Production possible :

* logs
* corrections mineures
* inventaire

## analyst

Nom FR : Analyste sécurité junior
Production possible :

* logs qualifiés
* réduction du bruit d’alertes
* détection

## auditor

Nom FR : Auditeur junior
Production possible :

* constats
* preuves
* visibilité

## secops

Nom FR : SecOps
Production possible :

* réduction dette cyber connue
* patching
* durcissement

## governance

Nom FR : Gouvernance
Production possible :

* preuves
* confiance COMEX
* politiques
* gestion tiers

---

# 11. Actifs et carte infrastructure

Créer une visualisation latérale nommée `InfrastructureMap`.

Cette visualisation doit utiliser SVG.

Elle représente l’infrastructure sous forme de constellation lumineuse.

Chaque nœud représente un actif, groupe d’actifs ou zone SI.

Type attendu :

```typescript
type AssetStatus =
  | "unknown"
  | "known"
  | "stable"
  | "debt"
  | "incident"
  | "critical";

type InfrastructureAsset = {
  id: string;
  labelKey: string;
  x: number;
  y: number;
  status: AssetStatus;
  criticality: number;
  discovered: boolean;
  connections: string[];
};
```

Règles d’affichage :

* Au début, afficher un seul point lumineux.
* Plus la visibilité augmente, plus des points apparaissent.
* Plus l’exposition augmente, plus la constellation s’étend.
* Plus la dette connue augmente, plus certains points deviennent orange ou instables.
* En cas d’incident, un ou plusieurs points deviennent rouges avec un halo doux.
* Ne jamais utiliser de clignotement violent.
* Utiliser une variation douce d’opacité ou de luminosité.
* Cycle d’animation recommandé : 3 à 5 secondes.
* Prévoir une option pour réduire ou désactiver les animations.
* Respecter `prefers-reduced-motion`.

États visuels suggérés :

```text
known     : point clair doux
stable    : point clair stable
debt      : point orange doux
incident  : point rouge avec halo
critical  : point plus gros ou halo léger
unknown   : non affiché ou très faible
```

Ne pas créer une carte interactive complexe dans le MVP. La carte doit d’abord être un indicateur visuel de progression.

---

# 12. Attaques et incidents

Créer un système d’attaques simple mais extensible.

Type attendu :

```typescript
type Attack = {
  id: string;
  family: AttackFamily;
  basePower: number;
  scaling: {
    exposure?: number;
    knownDebt?: number;
    unknownDebt?: number;
    businessSize?: number;
    alertNoise?: number;
    fatigue?: number;
  };
  relevantDefenses: string[];
  possibleImpacts: AttackImpact[];
};
```

Familles :

```typescript
type AttackFamily =
  | "phishing"
  | "ransomware"
  | "web"
  | "cloud"
  | "third_party"
  | "audit";
```

Implémenter au minimum :

## phishing_basic

* Famille : phishing
* Puissance de base : 20
* Défenses utiles : phishingDefense, mfa, detection
* Impact possible : fatigue +5, trust -5, findings +5

## ransomware_minor

* Famille : ransomware
* Puissance de base : 35
* Défenses utiles : edr, resilience, backup, incidentResponse
* Impact possible : budget -100, fatigue +15, trust -10, findings +20

## vulnerable_web_app

* Famille : web
* Puissance de base : 30
* Défenses utiles : appsec, waf, patching, detection
* Impact possible : trust -10, exposure +5, findings +15

## client_audit

* Famille : audit
* Puissance de base : 25
* Défenses utiles : proofs, governance, thirdPartyManagement
* Impact possible : trust -10 si échec, budget +100 si réussite

Résolution :

```text
attackPower = basePower + scaling factors
defensePower = useful defenses + visibility + resilience - fatigue - alertNoise
```

Résultat :

```text
si defensePower >= attackPower + 20 :
    attaque bloquée ou audit réussi
sinon si defensePower >= attackPower - 10 :
    incident partiel
sinon :
    incident majeur
```

Même en cas d’échec, le joueur peut gagner des constats car une crise révèle des faiblesses.

---

# 13. Croissance de l’entreprise

Le jeu doit gérer une taille d’entreprise abstraite.

Type attendu :

```typescript
type BusinessStage = {
  id: string;
  level: number;
  minTurns: number;
  effects: Partial<Record<ResourceId, number>>;
  attackPressureModifier: number;
};
```

Paliers :

## stage_1_small_company

Nom FR : Petite entreprise
Effets :

* budget faible
* exposition faible
* attaques simples

## stage_2_visible_pme

Nom FR : PME visible
Effets :

* exposition augmente
* phishing plus fréquent
* premiers audits clients

## stage_3_known_ecommerce

Nom FR : E-commerce connu
Effets :

* credential stuffing
* vulnérabilités web
* données clients plus sensibles

## stage_4_international_group

Nom FR : Groupe international
Effets :

* supply chain
* NIS2
* audit client
* cloud plus complexe

## stage_5_major_target

Nom FR : Cible majeure
Effets :

* ransomware sérieux
* attaques ciblées
* presse
* régulateur
* assureur

Le MVP peut implémenter seulement les deux premiers paliers, mais le modèle doit prévoir les cinq.

---

# 14. Dette cyber connue et inconnue

Implémenter deux notions :

* `unknownDebt`
* `knownDebt`

Au début :

```json
{
  "unknownDebt": 80,
  "knownDebt": 0
}
```

Quand le joueur audite ou améliore la visibilité :

* `unknownDebt` baisse ;
* `knownDebt` augmente ;
* `findings` augmente ;
* `proofs` augmente parfois.

Cela doit donner l’impression que la situation empire quand on regarde mieux.

C’est volontaire.

Exemple :

```text
Avant, tout allait bien parce que personne ne regardait.
```

La remédiation doit réduire `knownDebt`, mais coûter du budget, des constats ou de la capacité.

---

# 15. Sauvegarde

La sauvegarde automatique MVP doit utiliser `localStorage`.

Clé recommandée :

```text
dark-soc-save-main
```

Créer un type :

```typescript
type SaveGame = {
  format: "dark-soc-save";
  saveVersion: number;
  gameVersion: string;
  createdAt: string;
  updatedAt: string;
  payloadEncoding: "json" | "base64";
  payload: string;
  checksum: string;
  modified?: boolean;
};
```

Le `payload` contient le `GameState`.

Pour le MVP :

* encoder le payload en JSON string ou base64 ;
* calculer un checksum SHA-256 ;
* vérifier le checksum à l’import ;
* si le checksum ne correspond pas, refuser ou marquer la partie comme modifiée.

Comportement attendu :

* autosave toutes les 5 secondes ;
* autosave après chaque action importante ;
* bouton continuer ;
* bouton nouvelle partie ;
* bouton exporter sauvegarde ;
* bouton importer sauvegarde ;
* bouton réinitialiser sauvegarde locale.

Ne pas utiliser de cookies pour stocker la partie.

---

# 16. Gestion anti-triche raisonnable

Le jeu étant local et sans serveur, ne pas chercher une sécurité inviolable.

Objectif :

* empêcher la modification triviale du JSON ;
* détecter une sauvegarde modifiée ;
* protéger le jeu contre les imports invalides ;
* permettre éventuellement un mode “modifié”.

Comportement recommandé :

Si sauvegarde importée valide :

```text
chargement normal
```

Si sauvegarde modifiée détectée :

```text
afficher : "Sauvegarde modifiée détectée."
proposer :
- refuser l’import
- importer en mode modifié
```

En mode modifié :

* désactiver les succès futurs ;
* afficher un badge discret “partie modifiée” ;
* ne pas bloquer le joueur.

Ne pas implémenter de chiffrement lourd côté client dans le MVP.

---

# 17. Multilangue

Prévoir le multilangue dès le départ.

Langue principale : français.

Langue secondaire prévue : anglais.

Créer un système i18n simple :

```typescript
type Locale = "fr" | "en";

function t(key: string, params?: Record<string, string | number>): string;
```

Tous les textes visibles doivent venir des fichiers JSON sous :

```text
src/data/i18n/fr/
src/data/i18n/en/
```

Si une clé est manquante :

* afficher la clé entre crochets ;
* logger un warning en mode dev.

Exemple :

```json
{
  "actions.collect_logs.label": "Collecter des logs",
  "actions.collect_logs.description": "Récupère quelques signaux dans le bruit ambiant."
}
```

Ne pas coder de texte visible dans les composants.

Exception autorisée : messages techniques de console en développement.

---

# 18. Interface utilisateur MVP

Créer une interface en trois zones :

```text
+---------------------------------------------------+-------------------------+
| Zone narrative principale                          | Constellation SI        |
|                                                   |                         |
| Texte d’ambiance                                   | Points lumineux         |
| Journal d’événements                               | Taille infra            |
| Actions disponibles                                | Visibilité              |
|                                                   | Incidents actifs        |
+---------------------------------------------------+-------------------------+
| Ressources / technologies / sauvegarde / options                           |
+---------------------------------------------------------------------------+
```

Composants attendus :

## NarrativeLog.svelte

Affiche les messages narratifs récents.

## ActionButton.svelte

Affiche une action possible avec :

* libellé ;
* description ;
* coût éventuel ;
* état disponible / indisponible.

## ResourcePanel.svelte

Affiche les ressources actuellement visibles.

Les ressources ne sont pas toutes visibles dès le départ.

## TechPanel.svelte

Affiche les technologies disponibles à l’achat.

## InfrastructureMap.svelte

Affiche la constellation SVG.

## SavePanel.svelte

Permet :

* continuer ;
* nouvelle partie ;
* export ;
* import ;
* reset.

## SettingsPanel.svelte

Permet :

* langue ;
* animations normales/réduites/désactivées ;
* contraste normal/élevé.

---

# 19. Accessibilité

Implémenter dès le départ :

* support de `prefers-reduced-motion`;
* option pour réduire/désactiver les animations ;
* pas de flash brutal ;
* animations de points sur 3 à 5 secondes ;
* contraste lisible ;
* boutons utilisables au clavier ;
* textes lisibles sans dépendre uniquement de la couleur.

Les points de la constellation ne doivent pas clignoter on/off.

Utiliser une pulsation douce :

```text
opacité 0.6 → 1.0 → 0.6
```

ou pour les alertes :

```text
opacité 0.4 → 1.0 → 0.4
```

Jamais de stroboscope.

---

# 20. État initial du jeu

Créer une fonction :

```typescript
createInitialGameState(seed?: string): GameState
```

État initial recommandé :

```json
{
  "turn": 0,
  "resources": {
    "logs": 0,
    "findings": 0,
    "proofs": 0,
    "budget": 0,
    "trust": 10,
    "visibility": 1,
    "knownDebt": 0,
    "unknownDebt": 80,
    "fatigue": 0,
    "exposure": 10,
    "resilience": 0,
    "alertNoise": 0
  },
  "unlockedTechnologyIds": [],
  "availableTechnologyIds": [],
  "employees": [],
  "assets": [
    {
      "id": "unknown_server_1",
      "labelKey": "assets.unknown_server_1.name",
      "x": 50,
      "y": 50,
      "status": "known",
      "criticality": 1,
      "discovered": true,
      "connections": []
    }
  ],
  "narrativeLog": [
    "events.intro.dark_room"
  ],
  "settings": {
    "locale": "fr",
    "animationMode": "normal"
  }
}
```

Texte intro FR :

```text
La salle est calme. Trop calme.
Un serveur clignote dans l’obscurité.
Personne ne sait vraiment à quoi il sert.
```

---

# 21. Actions et reducer

Créer un système d’actions typées.

Exemple :

```typescript
type GameAction =
  | { type: "COLLECT_LOGS" }
  | { type: "ANALYZE_ALERT" }
  | { type: "MANUAL_AUDIT" }
  | { type: "WRITE_COMEX_REPORT" }
  | { type: "BUY_TECHNOLOGY"; technologyId: string }
  | { type: "TICK" }
  | { type: "IMPORT_SAVE"; save: SaveGame }
  | { type: "RESET_GAME" };
```

Créer :

```typescript
function applyAction(state: GameState, action: GameAction): GameState
```

Règles :

* `applyAction` ne doit pas muter l’état d’entrée.
* `applyAction` doit retourner un nouvel état.
* Si une action est impossible, elle doit retourner l’état inchangé avec un message d’erreur ou un événement système.
* Les coûts doivent être vérifiés avant achat.
* Les prérequis doivent être vérifiés avant achat.
* Les ressources doivent être normalisées après chaque action.

---

# 22. Tests attendus MVP

Créer des tests Vitest pour le moteur.

Tests minimum :

## createInitialGameState

* crée un état valide ;
* contient les ressources attendues ;
* contient un actif initial ;
* contient le message d’intro.

## collect logs

* augmente `logs` de 10 ;
* ne modifie pas les autres ressources inutilement.

## manual audit

* augmente `findings` ;
* augmente `proofs` ;
* baisse `unknownDebt` ;
* augmente `knownDebt` ;
* augmente `fatigue`.

## buy technology

* refuse si ressources insuffisantes ;
* accepte si ressources suffisantes ;
* consomme les ressources ;
* ajoute la technologie à `unlockedTechnologyIds`;
* applique les effets.

## save validation

* accepte une sauvegarde valide ;
* refuse ou marque une sauvegarde avec checksum invalide ;
* refuse une sauvegarde de format inconnu.

## i18n

* retourne une traduction existante ;
* retourne une clé visible ou fallback en cas de traduction manquante.

---

# 23. Phasage d’implémentation demandé

Ne pas tout implémenter en une seule passe.

Procéder par phases.

## Phase 1 — Scaffold technique

Objectif :

* créer projet Vite + Svelte + TypeScript ;
* configurer ESLint, Prettier, Vitest ;
* créer structure de dossiers ;
* créer état initial ;
* afficher l’écran principal ;
* afficher ressources initiales ;
* afficher actions de base.

Critère d’acceptation :

* `npm run dev` fonctionne ;
* `npm run build` fonctionne ;
* `npm run test` fonctionne ;
* le joueur peut collecter des logs.

## Phase 2 — Moteur de ressources et actions

Objectif :

* implémenter reducer ;
* implémenter actions initiales ;
* implémenter normalisation des ressources ;
* implémenter journal narratif.

Critère d’acceptation :

* les actions modifient correctement l’état ;
* le journal affiche les événements ;
* les tests moteur passent.

## Phase 3 — Technologies data-driven

Objectif :

* charger technologies depuis JSON ;
* afficher technologies achetables ;
* vérifier coûts et prérequis ;
* appliquer effets.

Critère d’acceptation :

* le joueur peut acheter `asset_register`;
* le joueur peut débloquer `basic_log_collector`;
* le joueur ne peut pas acheter une technologie sans prérequis.

## Phase 4 — Sauvegarde locale

Objectif :

* autosave localStorage ;
* continuer partie ;
* nouvelle partie ;
* export JSON ;
* import JSON ;
* checksum simple.

Critère d’acceptation :

* rechargement navigateur conserve la partie ;
* export/import fonctionne ;
* sauvegarde modifiée détectée.

## Phase 5 — i18n

Objectif :

* brancher système de traduction ;
* déplacer tous les textes visibles dans JSON FR ;
* prévoir structure EN.

Critère d’acceptation :

* aucun texte visible utilisateur majeur n’est codé en dur ;
* le changement de langue est techniquement possible.

## Phase 6 — Constellation SI

Objectif :

* créer `InfrastructureMap.svelte`;
* afficher les actifs en SVG ;
* ajouter pulsation douce ;
* respecter option animation réduite ;
* faire apparaître plus de points avec la visibilité.

Critère d’acceptation :

* un point initial est visible ;
* de nouveaux points apparaissent avec `visibility`;
* pas de clignotement violent ;
* `prefers-reduced-motion` est respecté.

## Phase 7 — Attaques MVP

Objectif :

* créer système d’attaque ;
* déclencher attaque simple périodiquement ;
* résoudre selon défense vs puissance ;
* appliquer impacts ;
* écrire événements narratifs.

Critère d’acceptation :

* une attaque phishing basique peut arriver ;
* les défenses réduisent l’impact ;
* un incident peut augmenter fatigue, réduire confiance et générer des constats.

---

# 24. Hors périmètre MVP

Ne pas implémenter dans le MVP :

* backend ;
* comptes utilisateurs ;
* classement en ligne ;
* sauvegarde cloud ;
* paiement ;
* éditeur de scénario ;
* multijoueur ;
* Phaser ;
* Electron ;
* Tauri ;
* PWA complète ;
* graphismes lourds ;
* son ;
* IA générative dans le jeu ;
* simulation détaillée de l’entreprise ;
* gestion financière complète ;
* gestion RH complète.

---

# 25. Ton narratif

Le ton du jeu doit être :

* sobre ;
* un peu sarcastique ;
* réaliste ;
* compréhensible par un public cyber ;
* pas trop caricatural ;
* pas professoral.

Exemples de phrases acceptables :

```text
Un serveur répond encore. Personne ne sait vraiment à quoi il sert.
```

```text
L’inventaire révèle douze applications. Trois n’ont pas de propriétaire. Une a probablement été oubliée par quelqu’un qui a quitté l’entreprise en 2019.
```

```text
Le SIEM fonctionne. Il parle beaucoup. Trop.
```

```text
Le COMEX demande si le risque est maîtrisé. La bonne réponse dépend du niveau de courage disponible.
```

Éviter :

* blagues trop longues ;
* private jokes incompréhensibles ;
* jargon excessif ;
* texte trop bavard ;
* vulgarité gratuite.

---

# 26. Critères généraux d’acceptation

Le MVP est acceptable si :

1. Le projet démarre avec `npm run dev`.
2. Le build fonctionne.
3. Les tests moteur passent.
4. Le joueur peut effectuer les actions de base.
5. Les ressources évoluent correctement.
6. Au moins quatre technologies sont achetables.
7. Les coûts et prérequis sont respectés.
8. La sauvegarde locale fonctionne.
9. L’export/import fonctionne.
10. Une sauvegarde modifiée est détectée.
11. La constellation affiche au moins un actif.
12. Les animations sont douces et désactivables.
13. Le système i18n existe.
14. Le moteur de jeu est séparé de l’UI.
15. Aucun backend n’est nécessaire.

---

# 27. Prompt initial conseillé pour Codex

Utiliser ce prompt pour la première tâche Codex :

```text
Lis AGENTS.md et docs/SPECIFICATION.md.

Implémente uniquement la Phase 1 du projet Dark SOC.

Objectif :
- créer le scaffold Vite + Svelte + TypeScript ;
- configurer ESLint, Prettier et Vitest ;
- créer la structure de dossiers demandée ;
- créer les types minimaux GameState, Resource, Settings ;
- créer createInitialGameState() ;
- afficher une interface MVP avec :
  - texte narratif d’introduction ;
  - panneau de ressources ;
  - boutons d’actions initiales ;
  - zone placeholder pour la constellation SI ;
- implémenter l’action COLLECT_LOGS via reducer ;
- ajouter au moins un test Vitest sur createInitialGameState et COLLECT_LOGS.

Contraintes :
- pas de backend ;
- pas de React ;
- pas de Phaser ;
- pas de cookies ;
- pas de logique gameplay dans les composants Svelte ;
- pas de texte utilisateur en dur si le système i18n minimal est déjà simple à poser, sinon créer une TODO documentée pour la Phase 5.

À la fin :
- lancer npm run build ;
- lancer npm run test ;
- résumer les fichiers créés et les commandes exécutées.
```

---

# 28. Règle de travail pour les prochaines tâches Codex

Chaque tâche Codex doit être petite.

Ne pas demander :

```text
Implémente tout le jeu.
```

Demander plutôt :

```text
Implémente la Phase 2 uniquement.
```

ou :

```text
Ajoute l’achat des technologies data-driven sans toucher à la sauvegarde.
```

ou :

```text
Ajoute l’export/import de sauvegarde sans modifier le système d’attaque.
```

Cela évite que l’agent mélange toutes les responsabilités.
