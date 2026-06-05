# Dark SOC — SAVE_FORMAT.md

Version : 0.1
Statut : spécification initiale
Objectif : définir le format de sauvegarde, l’export/import, la reprise automatique, les migrations et la détection raisonnable des modifications.

---

# 1. Objectif du système de sauvegarde

Le jeu Dark SOC est un jeu web solo, sans backend dans le MVP.

La sauvegarde doit permettre :

* la reprise automatique dans le même navigateur ;
* l’export manuel d’une partie ;
* l’import manuel d’une partie ;
* la détection simple d’une sauvegarde modifiée ;
* la compatibilité future via migrations ;
* la protection contre les imports invalides ;
* la possibilité future d’avoir plusieurs slots.

Le système ne doit pas utiliser de cookies comme mécanisme principal.

Le MVP doit utiliser :

```text
localStorage
```

Pour une version ultérieure, IndexedDB pourra être envisagé si le jeu ajoute :

* plusieurs slots ;
* historique de parties ;
* journal narratif long ;
* statistiques détaillées ;
* replay déterministe ;
* scénarios personnalisés.

---

# 2. Principes de sécurité

Le jeu étant local et sans serveur, il est impossible d’empêcher totalement la triche.

Objectif réaliste :

```text
empêcher la modification triviale du JSON
détecter les modifications simples
protéger le jeu contre les imports invalides
marquer une partie comme modifiée si nécessaire
```

Ne pas chercher à créer un anti-cheat inviolable côté navigateur.

Ne pas ajouter de chiffrement lourd dans le MVP.

Ne pas bloquer le joueur de manière agressive si une sauvegarde est modifiée. Proposer plutôt :

```text
refuser l’import
ou
importer en mode modifié
```

---

# 3. Clés localStorage

Clé principale MVP :

```text
dark-soc-save-main
```

Clé des paramètres utilisateur :

```text
dark-soc-settings
```

Clé éventuelle de debug en développement :

```text
dark-soc-debug-state
```

Ne pas multiplier les clés sans nécessité.

---

# 4. Format général de sauvegarde

Une sauvegarde exportée doit être une enveloppe, pas directement le `GameState`.

Type attendu :

```typescript
type SaveGameEnvelope = {
  format: "dark-soc-save";
  saveVersion: number;
  gameVersion: string;
  createdAt: string;
  updatedAt: string;
  slotName: string;
  payloadEncoding: "json" | "base64";
  payload: string;
  checksum: string;
  modified?: boolean;
};
```

Exemple :

```json
{
  "format": "dark-soc-save",
  "saveVersion": 1,
  "gameVersion": "0.1.0",
  "createdAt": "2026-06-05T20:00:00.000Z",
  "updatedAt": "2026-06-05T20:42:00.000Z",
  "slotName": "Partie principale",
  "payloadEncoding": "base64",
  "payload": "eyJ0dXJuIjoxMiwicmVzb3VyY2VzIjp7ImxvZ3MiOjQyMH19",
  "checksum": "sha256:example"
}
```

---

# 5. Format du payload

Le `payload` contient le `GameState`.

Type attendu :

```typescript
type SavePayloadV1 = {
  state: GameState;
};
```

Le payload ne doit pas contenir :

* de fonction ;
* de classe sérialisée ;
* d’objet DOM ;
* de référence circulaire ;
* de donnée temporaire UI pure ;
* de donnée dérivable trop volumineuse si elle peut être recalculée.

---

# 6. GameState sauvegardé

Le `GameState` sauvegardé doit contenir au minimum :

```typescript
type GameState = {
  turn: number;
  createdAt: string;
  updatedAt: string;
  randomSeed: string;

  resources: Record<ResourceId, number>;

  unlockedTechnologyIds: string[];
  availableTechnologyIds: string[];

  employees: Employee[];
  assets: InfrastructureAsset[];

  activeIncidentIds: string[];
  resolvedIncidentIds: string[];

  businessStageId: string;

  narrativeLog: NarrativeLogEntry[];

  flags: Record<string, boolean>;

  settings: GameSettings;

  modified?: boolean;
};
```

Règle :

* `randomSeed` doit être sauvegardé dès la création de partie ;
* `turn` doit être sauvegardé ;
* `modified` doit être conservé si une partie a été importée en mode modifié ;
* les settings peuvent être sauvegardés à part, mais le `GameState` peut aussi contenir un snapshot.

---

# 7. Encodage du payload

MVP recommandé :

```text
JSON.stringify(GameState)
puis Base64
```

Donc :

```typescript
payloadEncoding = "base64"
```

Objectif :

* éviter l’édition directe triviale ;
* garder un format simple ;
* permettre le debug si nécessaire.

Ne pas compresser en gzip dans le MVP sauf besoin réel.

Version future possible :

```text
base64+gzip
```

Mais ne pas l’implémenter tant que la taille des sauvegardes reste raisonnable.

---

# 8. Checksum

Le checksum sert à détecter une modification simple.

Format :

```text
sha256:<hash>
```

Calcul recommandé MVP :

```text
checksum = sha256(payload + "|" + saveVersion + "|" + gameVersion + "|" + pepper)
```

Le `pepper` est une constante locale du jeu.

Exemple :

```typescript
const SAVE_CHECKSUM_PEPPER = "dark-soc-local-save-v1";
```

Attention :

* ce pepper est visible dans le code client ;
* il ne protège pas contre un joueur motivé ;
* il suffit pour empêcher la modification triviale via éditeur texte.

Le checksum doit être recalculé à l’import.

---

# 9. Comportement à l’import

Lors d’un import :

1. lire le fichier ;
2. parser le JSON de l’enveloppe ;
3. vérifier `format`;
4. vérifier `saveVersion`;
5. vérifier `payloadEncoding`;
6. vérifier le checksum ;
7. décoder le payload ;
8. valider le `GameState`;
9. migrer si nécessaire ;
10. charger ou proposer le mode modifié.

Pseudo-code :

```typescript
function importSave(raw: string): ImportResult {
  const envelope = parseEnvelope(raw);

  if (envelope.format !== "dark-soc-save") {
    return { ok: false, reason: "invalid_format" };
  }

  const checksumValid = verifyChecksum(envelope);

  const payload = decodePayload(envelope);

  const migrationResult = migratePayloadIfNeeded(payload, envelope.saveVersion);

  const validation = validateGameState(migrationResult.state);

  if (!validation.ok) {
    return { ok: false, reason: "invalid_state", errors: validation.errors };
  }

  if (!checksumValid) {
    return {
      ok: true,
      modified: true,
      state: {
        ...migrationResult.state,
        modified: true
      }
    };
  }

  return {
    ok: true,
    modified: false,
    state: migrationResult.state
  };
}
```

---

# 10. Résultats d’import

Type attendu :

```typescript
type ImportResult =
  | {
      ok: true;
      modified: boolean;
      state: GameState;
      warnings?: string[];
    }
  | {
      ok: false;
      reason: ImportErrorReason;
      errors?: string[];
    };
```

Erreurs possibles :

```typescript
type ImportErrorReason =
  | "invalid_json"
  | "invalid_format"
  | "unsupported_version"
  | "invalid_encoding"
  | "invalid_checksum"
  | "invalid_payload"
  | "invalid_state"
  | "migration_failed";
```

Règle MVP :

* un checksum invalide ne doit pas forcément bloquer ;
* un état invalide doit bloquer ;
* un format inconnu doit bloquer ;
* une version future inconnue doit bloquer.

---

# 11. Mode modifié

Si une sauvegarde a un checksum invalide mais un état valide :

Afficher :

```text
Sauvegarde modifiée détectée.
Cette partie peut être chargée en mode modifié.
Les succès et scores officiels seront désactivés.
```

Options :

```text
[Annuler]
[Importer en mode modifié]
```

Effets du mode modifié :

```typescript
state.modified = true;
```

Conséquences :

* succès désactivés ;
* score officiel désactivé ;
* badge discret dans l’interface ;
* export futur conserve `modified: true`.

Ne pas empêcher le joueur de continuer.

---

# 12. Validation du GameState

Créer une fonction :

```typescript
function validateGameState(state: unknown): ValidationResult<GameState>
```

Elle doit vérifier :

## 12.1 Champs obligatoires

* `turn` existe et est un nombre entier positif ou nul ;
* `resources` existe ;
* `randomSeed` existe ;
* `unlockedTechnologyIds` est un tableau ;
* `availableTechnologyIds` est un tableau ;
* `assets` est un tableau ;
* `narrativeLog` est un tableau ;
* `businessStageId` existe.

## 12.2 Ressources

Pour chaque ressource :

* la valeur doit être un nombre fini ;
* aucune valeur ne doit être `NaN`;
* les ressources consommables ne doivent pas être négatives ;
* les ressources bornées doivent être clampées ou rejetées selon la gravité.

Ressources bornées :

```text
trust
visibility
fatigue
resilience
alertNoise
```

Bornes :

```text
0 à 100
```

## 12.3 Technologies

Vérifier :

* chaque technologie débloquée existe dans les données de gameplay ;
* pas de doublon ;
* les prérequis sont cohérents si possible.

Si une technologie inconnue est trouvée :

* rejeter la sauvegarde en mode strict ;
* ou ignorer la technologie avec warning en mode permissif.

MVP recommandé :

```text
rejet strict
```

## 12.4 Assets

Vérifier :

* chaque asset a un `id`;
* chaque asset a un `status` valide ;
* `x` et `y` sont des nombres ;
* `criticality` est un nombre ;
* `connections` est un tableau d’IDs.

## 12.5 NarrativeLog

Vérifier :

* taille maximale raisonnable ;
* entrées valides ;
* clés i18n valides si possible.

Limite MVP recommandée :

```text
200 entrées maximum
```

Si le journal dépasse la limite :

```text
garder les 200 dernières entrées
```

---

# 13. Normalisation après import

Après validation, appeler :

```typescript
normalizeGameState(state): GameState
```

Cette fonction doit :

* borner les ressources ;
* supprimer les doublons ;
* trier éventuellement les listes ;
* recalculer les technologies disponibles ;
* vérifier les actifs visibles ;
* vérifier le stage business courant ;
* préserver `modified`.

Règle :

```text
validation = vérifier que l’état est acceptable
normalisation = corriger les petits écarts acceptables
```

Ne pas utiliser la normalisation pour masquer un état gravement corrompu.

---

# 14. Sauvegarde automatique

MVP :

* autosave toutes les 5 secondes ;
* autosave après chaque action importante ;
* sauvegarde avant fermeture si possible.

Valeur :

```json
{
  "autosaveIntervalMs": 5000
}
```

Actions importantes :

* achat de technologie ;
* import de sauvegarde ;
* reset de partie ;
* changement de stage business ;
* incident majeur ;
* changement de settings ;
* fin de saison.

---

# 15. Export manuel

L’export doit générer un fichier JSON.

Nom recommandé :

```text
dark-soc-save-YYYY-MM-DD-HH-mm.json
```

Exemple :

```text
dark-soc-save-2026-06-05-21-42.json
```

L’export doit utiliser le même format que localStorage.

Fonction attendue :

```typescript
function exportSave(state: GameState): SaveGameEnvelope
```

La UI doit proposer un bouton :

```text
Exporter la sauvegarde
```

---

# 16. Import manuel

L’import doit accepter uniquement un fichier JSON.

La UI doit proposer :

```text
Importer une sauvegarde
```

Comportements :

* si import valide : remplacer la partie courante après confirmation ;
* si import modifié : demander confirmation du mode modifié ;
* si import invalide : afficher une erreur claire ;
* ne jamais écraser la sauvegarde locale avant validation complète.

Message avant remplacement :

```text
Importer cette sauvegarde remplacera la partie locale actuelle.
```

Options :

```text
[Annuler]
[Importer]
```

---

# 17. Nouvelle partie

La nouvelle partie doit :

1. demander confirmation ;
2. supprimer ou archiver la sauvegarde actuelle ;
3. créer un nouvel état initial ;
4. générer un nouveau `randomSeed`;
5. sauvegarder immédiatement.

Message :

```text
Démarrer une nouvelle partie remplacera la sauvegarde locale actuelle.
```

Options :

```text
[Annuler]
[Nouvelle partie]
```

---

# 18. Reset local

Prévoir une action de debug ou option avancée :

```text
Réinitialiser la sauvegarde locale
```

Effet :

* supprime `dark-soc-save-main`;
* ne supprime pas forcément les paramètres utilisateur ;
* demande confirmation.

Cette option peut être cachée dans les paramètres avancés.

---

# 19. Migrations

Le format doit être versionné.

Version initiale :

```text
saveVersion = 1
```

Créer un fichier :

```text
src/persistence/migrations.ts
```

Fonction attendue :

```typescript
function migrateSavePayload(payload: unknown, fromVersion: number): MigrationResult
```

Type :

```typescript
type MigrationResult =
  | {
      ok: true;
      saveVersion: number;
      payload: SavePayloadV1;
      warnings?: string[];
    }
  | {
      ok: false;
      reason: "migration_failed" | "unsupported_version";
      errors?: string[];
    };
```

Règles :

* si `fromVersion === currentSaveVersion`, retourner le payload validé ;
* si `fromVersion < currentSaveVersion`, appliquer les migrations dans l’ordre ;
* si `fromVersion > currentSaveVersion`, refuser ;
* ne jamais migrer silencieusement une version future.

Exemple futur :

```typescript
const migrations = {
  1: migrateV1ToV2,
  2: migrateV2ToV3
};
```

---

# 20. Sauvegarde locale vs export

La sauvegarde localStorage et l’export doivent utiliser le même format d’enveloppe.

Avantage :

* moins de code ;
* mêmes validations ;
* mêmes migrations ;
* mêmes tests.

Différence possible :

* localStorage peut utiliser `slotName: "autosave"`;
* export peut utiliser `slotName: "Partie principale"`.

---

# 21. Paramètres utilisateur

Les paramètres peuvent être sauvegardés séparément dans :

```text
dark-soc-settings
```

Type :

```typescript
type PersistedSettings = {
  locale: "fr" | "en";
  animationMode: "normal" | "reduced" | "off";
  contrastMode: "normal" | "high";
};
```

Règle :

* les settings doivent pouvoir survivre à une nouvelle partie ;
* une sauvegarde importée peut contenir des settings, mais ne doit pas écraser les préférences locales sans confirmation ;
* MVP : les settings dans la sauvegarde peuvent être ignorés au profit des settings locaux.

---

# 22. Tests attendus

Créer des tests unitaires pour :

## 22.1 Création de sauvegarde

* `exportSave()` retourne une enveloppe valide ;
* `format` vaut `dark-soc-save`;
* `saveVersion` vaut `1`;
* `checksum` est présent ;
* le payload peut être décodé.

## 22.2 Import valide

* une sauvegarde exportée est réimportable ;
* l’état importé correspond à l’état initial ;
* `modified` est false ou absent.

## 22.3 Checksum invalide

* modifier le payload provoque une détection ;
* l’import retourne `modified: true` si l’état reste valide ;
* l’import ne plante pas.

## 22.4 Format invalide

* un JSON sans `format` est refusé ;
* un format inconnu est refusé ;
* une version future est refusée.

## 22.5 État invalide

* une ressource `NaN` est refusée ;
* un `turn` invalide est refusé ;
* une technologie inconnue est refusée ;
* un asset sans id est refusé.

## 22.6 Migration

* une sauvegarde v1 est acceptée ;
* une sauvegarde de version future est refusée ;
* les migrations futures devront être testées.

---

# 23. Fonctions à implémenter

Fichier :

```text
src/persistence/saveCodec.ts
```

Fonctions :

```typescript
export function encodePayload(payload: SavePayloadV1): string;

export function decodePayload(payload: string, encoding: SaveGameEnvelope["payloadEncoding"]): SavePayloadV1;

export function computeChecksum(envelopeWithoutChecksum: Omit<SaveGameEnvelope, "checksum">): string;

export function verifyChecksum(envelope: SaveGameEnvelope): boolean;
```

Fichier :

```text
src/persistence/exportImport.ts
```

Fonctions :

```typescript
export function createSaveEnvelope(state: GameState): SaveGameEnvelope;

export function importSaveEnvelope(raw: string): ImportResult;

export function downloadSaveFile(state: GameState): void;
```

Fichier :

```text
src/persistence/storage.ts
```

Fonctions :

```typescript
export function loadLocalSave(): ImportResult | null;

export function writeLocalSave(state: GameState): void;

export function clearLocalSave(): void;

export function hasLocalSave(): boolean;
```

Fichier :

```text
src/persistence/validation.ts
```

Fonctions :

```typescript
export function validateSaveEnvelope(value: unknown): ValidationResult<SaveGameEnvelope>;

export function validateGameState(value: unknown): ValidationResult<GameState>;

export function normalizeGameState(state: GameState): GameState;
```

---

# 24. Messages i18n nécessaires

Ajouter les clés FR suivantes :

```json
{
  "save.continue": "Continuer",
  "save.newGame": "Nouvelle partie",
  "save.export": "Exporter la sauvegarde",
  "save.import": "Importer une sauvegarde",
  "save.reset": "Réinitialiser la sauvegarde locale",

  "save.import.replaceWarning": "Importer cette sauvegarde remplacera la partie locale actuelle.",
  "save.newGame.warning": "Démarrer une nouvelle partie remplacera la sauvegarde locale actuelle.",
  "save.modifiedDetected.title": "Sauvegarde modifiée détectée",
  "save.modifiedDetected.body": "Cette partie peut être chargée en mode modifié. Les succès et scores officiels seront désactivés.",
  "save.modifiedDetected.cancel": "Annuler",
  "save.modifiedDetected.importModified": "Importer en mode modifié",

  "save.error.invalidJson": "Le fichier n’est pas un JSON valide.",
  "save.error.invalidFormat": "Ce fichier n’est pas une sauvegarde Dark SOC valide.",
  "save.error.unsupportedVersion": "Cette version de sauvegarde n’est pas compatible.",
  "save.error.invalidPayload": "Le contenu de la sauvegarde est invalide.",
  "save.error.invalidState": "L’état de jeu contenu dans la sauvegarde est invalide.",
  "save.error.migrationFailed": "La migration de la sauvegarde a échoué.",

  "save.status.autosaved": "Partie sauvegardée automatiquement.",
  "save.status.imported": "Sauvegarde importée.",
  "save.status.exported": "Sauvegarde exportée.",
  "save.status.reset": "Sauvegarde locale réinitialisée.",
  "save.status.modifiedMode": "Partie modifiée"
}
```

---

# 25. Hors périmètre MVP

Ne pas implémenter dans le MVP :

* chiffrement AES ;
* signature serveur ;
* sauvegarde cloud ;
* compte utilisateur ;
* synchronisation multi-appareil ;
* plusieurs slots avancés ;
* replay complet par journal d’actions ;
* compression gzip obligatoire ;
* anti-cheat complexe ;
* IndexedDB sauf besoin réel.

---

# 26. Évolution V2 possible

Pour une version ultérieure :

## 26.1 Journal d’actions

Ajouter :

```typescript
type ActionLogEntry = {
  turn: number;
  action: GameAction;
  timestamp: string;
};
```

Objectif :

* rejouer une partie ;
* détecter une incohérence entre état final et actions ;
* améliorer la robustesse anti-triche ;
* produire des statistiques.

## 26.2 Replay déterministe

Nécessite :

* `randomSeed`;
* générateur pseudo-aléatoire déterministe ;
* ordre strict des ticks ;
* journal d’actions ;
* versionnement stable des règles.

## 26.3 Plusieurs slots

Migrer vers IndexedDB si nécessaire.

Slots :

```typescript
type SaveSlot = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  envelope: SaveGameEnvelope;
};
```

---

# 27. Critères d’acceptation MVP

Le système de sauvegarde est acceptable si :

1. Le jeu sauvegarde automatiquement dans le navigateur.
2. Le rechargement de la page permet de continuer.
3. Le joueur peut exporter sa sauvegarde.
4. Le joueur peut importer une sauvegarde valide.
5. Une sauvegarde modifiée est détectée.
6. Une sauvegarde invalide est refusée proprement.
7. Une version future est refusée proprement.
8. Les ressources sont validées.
9. Les ressources bornées sont normalisées.
10. Le système est testé avec Vitest.
11. Aucun cookie n’est utilisé pour la sauvegarde principale.
12. Le code de persistance est isolé dans `src/persistence`.
13. L’UI ne parse pas directement les sauvegardes.
14. Le mode modifié est conservé après réexport.

---

# 28. Prompt Codex conseillé pour implémenter la sauvegarde

```text
Lis AGENTS.md, docs/SPECIFICATION.md, docs/BALANCING.md et docs/SAVE_FORMAT.md.

Implémente uniquement la Phase 4 : sauvegarde locale, export et import.

Objectif :
- créer les types SaveGameEnvelope, SavePayloadV1, ImportResult ;
- créer src/persistence/saveCodec.ts ;
- créer src/persistence/storage.ts ;
- créer src/persistence/exportImport.ts ;
- créer src/persistence/validation.ts si nécessaire ;
- sauvegarder automatiquement dans localStorage avec la clé dark-soc-save-main ;
- charger automatiquement la sauvegarde locale si elle existe ;
- ajouter export manuel JSON ;
- ajouter import manuel JSON ;
- calculer et vérifier un checksum SHA-256 simple ;
- détecter une sauvegarde modifiée ;
- refuser une sauvegarde invalide ;
- préserver state.modified si une partie est importée en mode modifié.

Contraintes :
- ne pas utiliser de cookies ;
- ne pas ajouter de backend ;
- ne pas ajouter IndexedDB dans cette phase ;
- ne pas ajouter de chiffrement lourd ;
- ne pas mettre de logique de persistance dans les composants Svelte ;
- ne pas casser les tests existants ;
- ajouter des tests Vitest pour export/import/checksum/validation.

À la fin :
- lancer npm run test ;
- lancer npm run build ;
- résumer les fichiers modifiés et les choix techniques.
```

---
