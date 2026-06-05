# Dark SOC — BALANCING.md

Version : 0.1
Statut : base d’équilibrage initiale
Objectif : définir les valeurs de gameplay du MVP et les règles d’ajustement du jeu.

---

# 1. Rôle de ce document

Ce document contient les valeurs d’équilibrage du jeu Dark SOC.

Il doit servir de référence pour :

* les ressources initiales ;
* les gains des actions manuelles ;
* les coûts des technologies ;
* les effets des technologies ;
* la progression de la taille d’entreprise ;
* la fréquence des incidents ;
* la puissance des attaques ;
* les impacts des incidents ;
* les seuils de difficulté ;
* les règles de tuning.

Les valeurs de gameplay ne doivent pas être codées en dur dans les composants UI.

Les valeurs doivent être centralisées dans :

```text
src/data/gameplay/balancing.json
src/data/gameplay/technologies.json
src/data/gameplay/attacks.json
src/data/gameplay/businessStages.json
```

Le code peut contenir des constantes techniques, mais pas de valeurs d’équilibrage cachées.

---

# 2. Principe général d’équilibrage

Dark SOC n’est pas un jeu où le joueur devient invincible.

Le principe central est :

```text
La croissance business augmente l’exposition.
La maturité cyber réduit les impacts.
La sécurité ne supprime pas le risque ; elle transforme un désastre en incident maîtrisable.
```

Le joueur doit ressentir trois tensions :

1. il manque de visibilité ;
2. il manque de ressources ;
3. l’entreprise grossit plus vite que la sécurité si elle n’est pas maîtrisée.

Le jeu doit éviter deux extrêmes :

```text
Trop facile : chaque outil réduit simplement les attaques et le joueur devient intouchable.

Trop dur : les incidents tombent au hasard sans signes avant-coureurs et le joueur subit sans comprendre.
```

Chaque progression doit apporter un avantage et parfois une nouvelle contrainte.

Exemples :

```text
SIEM minimal :
+ détection
+ centralisation
- bruit d’alertes
- fatigue si non supervisé
```

```text
Scanner de vulnérabilités :
+ visibilité
+ constats
- dette connue augmente
- pression COMEX possible
```

```text
MDR :
+ détection 24/7
+ réponse incident
- coût élevé
- nécessite une équipe interne pour traiter les recommandations
```

---

# 3. Échelle de rythme cible

Le rythme doit reprendre l’idée du jeu incremental :

```text
clic manuel faible → premier outil → automatisation → spécialisation → industrialisation → crise majeure
```

Échelle de coût ressentie :

| Niveau |              Type d’achat | Effort cible                                |
| ------ | ------------------------: | ------------------------------------------- |
| 0      |           Action manuelle | immédiat                                    |
| 1      |          Petit dispositif | 5 à 15 actions                              |
| 2      | Premier outil structurant | 20 à 50 actions                             |
| 3      |        Capacité organisée | 80 à 150 actions                            |
| 4      |          Capacité avancée | 200 à 350 actions                           |
| 5      |      Maturité stratégique | 500+ actions ou plusieurs chaînes complètes |

Le MVP doit viser une première session jouable de 20 à 40 minutes.

Le joueur doit pouvoir débloquer les premières technologies en quelques minutes, mais ne doit pas atteindre SOC/MDR immédiatement.

---

# 4. Ressources

## 4.1 Ressources du MVP

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

## 4.2 Bornes recommandées

| Ressource   | Minimum |  Maximum | Notes                                   |
| ----------- | ------: | -------: | --------------------------------------- |
| logs        |       0 | illimité | Ressource consommable                   |
| findings    |       0 | illimité | Constats techniques ou organisationnels |
| proofs      |       0 | illimité | Preuves pour COMEX, audits, assurance   |
| budget      |       0 | illimité | Ressource d’achat                       |
| trust       |       0 |      100 | Confiance COMEX                         |
| visibility  |       0 |      100 | Pourcentage du SI connu                 |
| knownDebt   |       0 | illimité | Dette connue                            |
| unknownDebt |       0 | illimité | Dette inconnue                          |
| fatigue     |       0 |      100 | Fatigue équipe                          |
| exposure    |       0 | illimité | Surface d’attaque                       |
| resilience  |       0 |      100 | Capacité à encaisser                    |
| alertNoise  |       0 |      100 | Bruit d’alertes                         |

## 4.3 État initial

```json
{
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
}
```

Justification :

* le joueur démarre presque aveugle ;
* la dette connue est nulle car rien n’a encore été regardé ;
* la dette inconnue est déjà élevée ;
* la confiance COMEX existe mais reste basse ;
* l’exposition existe déjà car l’entreprise a au moins un SI en ligne.

---

# 5. Actions manuelles initiales

Les actions manuelles servent à lancer la partie et à créer les premières ressources.

## 5.1 collect_logs

Libellé FR : Collecter des logs

Coût :

```json
{}
```

Effet :

```json
{
  "logs": 10
}
```

Règle :

* toujours disponible ;
* ne doit pas suffire à elle seule pour gagner ;
* doit être progressivement remplacée par des collecteurs automatiques.

## 5.2 analyze_alert

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

Règle :

* transforme des logs en constats ;
* augmente légèrement la fatigue ;
* doit devenir plus efficace avec analyste ou SIEM.

## 5.3 manual_audit

Libellé FR : Faire un audit manuel

Coût :

```json
{}
```

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

Règle :

* révèle la dette ;
* donne l’impression que la situation empire ;
* doit être la porte d’entrée vers la gouvernance et la cartographie.

## 5.4 write_comex_report

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

Règle :

* convertit constats + preuves en confiance et budget ;
* doit rendre la gouvernance utile dès le début ;
* ne doit pas être spammable si les ressources manquent.

---

# 6. Production passive

## 6.1 Tick de jeu

Valeur recommandée MVP :

```json
{
  "tickDurationMs": 1000
}
```

Un tick correspond à une unité abstraite de temps.

Le tick ne doit pas représenter une seconde réelle dans la fiction. C’est seulement une cadence de jeu.

## 6.2 Production passive initiale

Au démarrage :

```json
{
  "logsPerTick": 0,
  "findingsPerTick": 0,
  "proofsPerTick": 0,
  "budgetPerTick": 0
}
```

La production passive est débloquée via technologies ou employés.

## 6.3 Normalisation par tick

À chaque tick :

```text
1. appliquer production passive ;
2. appliquer effets récurrents des employés ;
3. appliquer effets récurrents des technologies ;
4. tester éventuels événements ;
5. tester éventuelles attaques ;
6. normaliser les ressources ;
7. autosave si intervalle atteint.
```

---

# 7. Statistiques dérivées

Certaines statistiques ne sont pas des ressources directes. Elles sont dérivées des technologies, employés et ressources.

```typescript
type StatId =
  | "detection"
  | "incidentResponse"
  | "phishingDefense"
  | "mfa"
  | "patching"
  | "edr"
  | "backup"
  | "appsec"
  | "waf"
  | "cloudSecurity"
  | "thirdPartyManagement"
  | "governance"
  | "identitySecurity"
  | "privilegedAccessSecurity"
  | "segmentation"
  | "logsPerTick"
  | "findingsPerTick"
  | "proofsPerTick"
  | "budgetPerTick"
  | "visibilityGain"
  | "knownDebtReduction"
  | "knownDebtIncrease"
  | "unknownDebtReduction";
```

Ces statistiques doivent être calculées via selector, pas stockées partout.

Exemple :

```typescript
getEffectiveDetection(state): number
```

Doit prendre en compte :

* technologies de détection ;
* employés analystes ;
* bruit d’alertes ;
* fatigue ;
* visibilité.

---

# 8. Formules générales

## 8.1 Score de maturité cyber

Le score de maturité cyber est une valeur calculée.

Formule initiale recommandée :

```text
maturity =
  detection * 0.18
+ incidentResponse * 0.14
+ resilience * 0.14
+ governance * 0.12
+ identitySecurity * 0.12
+ patching * 0.10
+ appsec * 0.08
+ cloudSecurity * 0.06
+ thirdPartyManagement * 0.06
- fatigue * 0.08
- alertNoise * 0.05
```

Bornage :

```text
maturity = clamp(maturity, 0, 100)
```

Cette formule peut évoluer.

## 8.2 Pression de menace

```text
threatPressure =
  businessStage.level * 10
+ exposure * 0.6
+ knownDebt * 0.2
+ unknownDebt * 0.15
+ alertNoise * 0.1
- maturity * 0.25
```

Bornage :

```text
threatPressure = max(0, threatPressure)
```

## 8.3 Puissance d’attaque

```text
attackPower =
  basePower
+ exposure * scaling.exposure
+ knownDebt * scaling.knownDebt
+ unknownDebt * scaling.unknownDebt
+ businessStage.level * scaling.businessSize
+ fatigue * scaling.fatigue
+ alertNoise * scaling.alertNoise
```

## 8.4 Puissance de défense

La défense dépend de la famille d’attaque.

Formule générique :

```text
defensePower =
  sum(relevantDefenses)
+ visibility * 0.2
+ resilience * 0.15
- fatigue * 0.25
- alertNoise * 0.2
```

Puis appliquer un bonus/malus selon la famille.

Exemple phishing :

```text
phishingDefensePower =
  phishingDefense
+ mfa
+ identitySecurity
+ detection * 0.4
+ visibility * 0.1
- fatigue * 0.2
```

Exemple ransomware :

```text
ransomwareDefensePower =
  edr
+ backup
+ segmentation
+ incidentResponse
+ resilience
+ detection * 0.3
- fatigue * 0.3
```

Exemple web :

```text
webDefensePower =
  appsec
+ waf
+ patching
+ detection * 0.3
+ visibility * 0.2
- knownDebt * 0.1
```

---

# 9. Résolution d’attaque

Calcul :

```text
margin = defensePower - attackPower
```

Résultat :

|           Marge | Résultat         |
| --------------: | ---------------- |
|           >= 20 | attaque bloquée  |
| entre -10 et 19 | incident partiel |
|           < -10 | incident majeur  |

## 9.1 Attaque bloquée

Effets génériques :

```json
{
  "findings": 5,
  "proofs": 2,
  "fatigue": 1
}
```

Narration :

```text
L’attaque est détectée et contenue. Elle laisse quelques traces utiles.
```

## 9.2 Incident partiel

Effets génériques :

```json
{
  "budget": -50,
  "trust": -5,
  "fatigue": 8,
  "findings": 10,
  "knownDebt": 3
}
```

Narration :

```text
L’incident est contenu, mais pas sans dégâts.
```

## 9.3 Incident majeur

Effets génériques :

```json
{
  "budget": -150,
  "trust": -12,
  "fatigue": 20,
  "findings": 25,
  "knownDebt": 8,
  "resilience": -5
}
```

Narration :

```text
L’incident déborde. L’entreprise découvre que certains plans étaient surtout des fichiers PowerPoint.
```

---

# 10. Fréquence des attaques

## 10.1 Cadence MVP

Ne pas déclencher d’attaque pendant les 30 premiers ticks.

```json
{
  "initialGraceTicks": 30
}
```

Après la période de grâce :

```text
attackChancePerTick = baseChance + threatPressure * 0.001
```

Valeur recommandée :

```json
{
  "baseAttackChancePerTick": 0.01
}
```

Exemple :

```text
base 0.01 + threatPressure 40 * 0.001 = 0.05
=> 5% de chance par tick
```

Si c’est trop agressif en test, réduire à :

```json
{
  "baseAttackChancePerTick": 0.004,
  "threatPressureMultiplier": 0.0006
}
```

## 10.2 Cooldown d’attaque

Pour éviter les rafales injustes :

```json
{
  "minimumTicksBetweenAttacks": 20
}
```

## 10.3 Avertissements avant attaque

Certaines attaques doivent être précédées par un signal faible.

Exemple :

```text
Des scans répétés ciblent le portail client.
```

Puis plus tard :

```text
Une tentative d’exploitation vise le portail client.
```

Règle :

* 50 % des attaques majeures doivent avoir au moins un avertissement.
* Les attaques mineures peuvent arriver sans avertissement.
* Les avertissements doivent être stockés dans le journal narratif.

---

# 11. Technologies MVP

## 11.1 Registre des actifs

ID :

```text
asset_register
```

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
  "visibility": 10,
  "unknownDebt": -10,
  "knownDebt": 8
}
```

Débloque :

```json
[
  "basic_log_collector",
  "basic_vulnerability_scanner"
]
```

Note :

* doit être l’un des premiers achats structurants ;
* révèle que le SI est plus grand que prévu.

## 11.2 Collecteur de logs basique

ID :

```text
basic_log_collector
```

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

Note :

* première automatisation ;
* doit réduire le besoin de clic manuel ;
* ne donne pas encore une vraie détection.

## 11.3 Scanner de vulnérabilités basique

ID :

```text
basic_vulnerability_scanner
```

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
  "findingsPerTick": 1,
  "unknownDebt": -20,
  "knownDebt": 15
}
```

Débloque :

```json
[
  "patch_management_v1"
]
```

Note :

* fait monter la dette connue ;
* doit créer une tension psychologique.

## 11.4 Procédure incident v0

ID :

```text
incident_procedure_v0
```

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
  "resilience": 10,
  "incidentResponse": 5
}
```

Note :

* réduit les dégâts des premiers incidents ;
* ne remplace pas le PRA.

## 11.5 Sensibilisation phishing v0

ID :

```text
phishing_awareness_v0
```

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
  "phishingDefense": 10,
  "governance": 5
}
```

Note :

* utile contre phishing basique ;
* effet modéré, pas magique.

## 11.6 Centralisation des logs

ID :

```text
centralized_logs
```

Prérequis :

```json
[
  "basic_log_collector"
]
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
[
  "minimal_siem"
]
```

Note :

* augmente la visibilité technique ;
* augmente aussi le bruit.

## 11.7 SIEM minimal

ID :

```text
minimal_siem
```

Prérequis :

```json
[
  "centralized_logs"
]
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
[
  "siem_analyst"
]
```

Note :

* ne doit pas être uniquement positif ;
* sans expert SIEM, le bruit doit devenir visible.

## 11.8 Expert SIEM

ID :

```text
siem_analyst
```

Prérequis :

```json
[
  "minimal_siem"
]
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
[
  "business_hours_soc"
]
```

Note :

* transforme le SIEM en capacité exploitable.

## 11.9 Patch management v1

ID :

```text
patch_management_v1
```

Prérequis :

```json
[
  "basic_vulnerability_scanner"
]
```

Coût :

```json
{
  "budget": 400,
  "findings": 200
}
```

Effets :

```json
{
  "patching": 15,
  "knownDebt": -15,
  "fatigue": 3
}
```

Débloque :

```json
[
  "vulnerability_management"
]
```

Note :

* réduit la dette connue ;
* ajoute un peu de fatigue opérationnelle.

## 11.10 SOC heures ouvrées

ID :

```text
business_hours_soc
```

Prérequis :

```json
[
  "minimal_siem",
  "siem_analyst"
]
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
  "fatigue": -10,
  "alertNoise": -10
}
```

Débloque :

```json
[
  "mdr"
]
```

Note :

* premier vrai changement de posture ;
* doit être cher pour le MVP.

## 11.11 MDR

ID :

```text
mdr
```

Prérequis :

```json
[
  "business_hours_soc"
]
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

Note :

* ne doit pas rendre invincible ;
* augmente éventuellement les demandes de traitement dans une version future.

---

# 12. Technologies V1 non MVP

Ces technologies doivent être prévues dans l’arbre mais pas forcément implémentées en MVP.

| ID                     | Nom FR              | Branche          |                          Coût cible | Effet cible                          |
| ---------------------- | ------------------- | ---------------- | ----------------------------------: | ------------------------------------ |
| cartography_v1         | Cartographie SI v1  | gouvernance      |           300 proofs + 200 findings | visibility +20                       |
| mfa_vip                | MFA VIP             | identité         |             500 budget + 100 proofs | mfa +15                              |
| mfa_global             | MFA global          | identité         | 1800 budget + 250 proofs + 60 trust | mfa +35                              |
| iam_lifecycle          | Cycle de vie IAM    | identité         |          1600 budget + 300 findings | identitySecurity +25                 |
| pam                    | PAM                 | identité         |                   2800 budget + IAM | privilegedAccessSecurity +35         |
| edr_pilot              | EDR pilote          | réduction risque |           700 budget + 150 findings | edr +15                              |
| edr_global             | EDR généralisé      | réduction risque |          2500 budget + 400 findings | edr +35                              |
| backups_tested         | Sauvegardes testées | résilience       |            1200 budget + 250 proofs | backup +25, resilience +15           |
| crisis_exercise        | Exercice de crise   | résilience       |             800 budget + 300 proofs | incidentResponse +20                 |
| pca_pra                | PCA/PRA testé       | résilience       |               3000 budget + backups | resilience +30                       |
| appsec_v1              | AppSec v1           | appsec           |          1400 budget + 300 findings | appsec +20                           |
| sast_sca               | SAST / SCA          | appsec           |          1700 budget + 400 findings | appsec +25, knownDebt +10            |
| waf                    | WAF                 | appsec           |          1000 budget + 200 findings | waf +25                              |
| third_party_management | Gestion tiers       | tiers            |             900 budget + 300 proofs | thirdPartyManagement +25             |
| cnapp                  | CNAPP / CSPM        | cloud            |    2800 budget + cartographie cloud | cloudSecurity +35                    |
| segmentation           | Segmentation        | réduction risque |         3200 budget + visibility 70 | segmentation +35                     |
| cyber_insurance        | Cyberassurance      | gouvernance      |              1000 proofs + 80 trust | réduit pertes budget majeures        |
| soar                   | SOAR                | détection        |                   5000 budget + MDR | incidentResponse +35, alertNoise -15 |

---

# 13. Employés

Les employés doivent amplifier ou automatiser des productions, mais ne doivent pas rendre les actions manuelles inutiles trop vite.

## 13.1 Règles générales

* Un employé peut être affecté à une tâche.
* Une tâche produit à chaque tick.
* Un employé augmente sa fatigue selon la tâche.
* À fatigue élevée, sa production baisse.
* À fatigue critique, il peut devenir indisponible temporairement.

## 13.2 Seuils de fatigue employés

| Fatigue | État                | Effet            |
| ------: | ------------------- | ---------------- |
|    0-39 | Normal              | production 100 % |
|   40-69 | Fatigué             | production 75 %  |
|   70-89 | Surcharge           | production 50 %  |
|  90-100 | Burn-out temporaire | indisponible     |

MVP : la fatigue globale peut suffire. La fatigue individuelle peut être implémentée en V1.

## 13.3 Rôles et productions

### Admin volontaire

Déblocage : début ou événement précoce.

Tâches :

```json
{
  "collect_logs": {
    "logsPerTick": 1,
    "fatiguePerTick": 0.05
  },
  "inventory": {
    "findingsPerTick": 0.5,
    "visibilityPerTick": 0.05,
    "fatiguePerTick": 0.05
  },
  "minor_fixes": {
    "knownDebtPerTick": -0.2,
    "fatiguePerTick": 0.08
  }
}
```

### Analyste sécurité junior

Déblocage : après centralisation logs ou événement.

Tâches :

```json
{
  "alert_triage": {
    "detection": 5,
    "alertNoisePerTick": -0.1,
    "findingsPerTick": 0.5,
    "fatiguePerTick": 0.08
  },
  "siem_tuning": {
    "detection": 3,
    "alertNoisePerTick": -0.2,
    "fatiguePerTick": 0.06
  }
}
```

### Auditeur junior

Tâches :

```json
{
  "manual_audit": {
    "findingsPerTick": 0.8,
    "proofsPerTick": 0.5,
    "unknownDebtPerTick": -0.2,
    "knownDebtPerTick": 0.15,
    "fatiguePerTick": 0.04
  }
}
```

### SecOps

Tâches :

```json
{
  "remediation": {
    "knownDebtPerTick": -0.5,
    "budgetPerTick": -0.2,
    "fatiguePerTick": 0.08
  },
  "hardening": {
    "patching": 5,
    "knownDebtPerTick": -0.2,
    "fatiguePerTick": 0.06
  }
}
```

### Gouvernance

Tâches :

```json
{
  "prepare_proofs": {
    "proofsPerTick": 0.8,
    "fatiguePerTick": 0.03
  },
  "comex_alignment": {
    "trustPerTick": 0.05,
    "proofsPerTick": 0.3,
    "fatiguePerTick": 0.04
  }
}
```

### Pentester

Tâches :

```json
{
  "targeted_pentest": {
    "findingsPerTick": 1.2,
    "knownDebtPerTick": 0.4,
    "unknownDebtPerTick": -0.5,
    "fatiguePerTick": 0.08
  }
}
```

Note :

* le pentester révèle beaucoup de problèmes ;
* il ne corrige rien ;
* il peut faire baisser la confiance si la dette connue explose.

---

# 14. Croissance business

## 14.1 Paliers

| Stage | ID                  | Nom FR               | Exposition de base | Budget bonus | Menaces                                        |
| ----: | ------------------- | -------------------- | -----------------: | -----------: | ---------------------------------------------- |
|     1 | small_company       | Petite entreprise    |                 10 |            0 | phishing basique, scan                         |
|     2 | visible_pme         | PME visible          |                 25 |         +100 | phishing, vuln web, audit client               |
|     3 | known_ecommerce     | E-commerce connu     |                 50 |         +300 | credential stuffing, ransomware, fuite web     |
|     4 | international_group | Groupe international |                 80 |         +600 | supply chain, cloud, NIS2                      |
|     5 | major_target        | Cible majeure        |                120 |        +1000 | ransomware sérieux, attaque ciblée, régulateur |

## 14.2 Progression automatique

Le business ne doit pas progresser trop vite au début.

```json
{
  "stageProgression": {
    "small_company": {
      "minimumTicks": 0
    },
    "visible_pme": {
      "minimumTicks": 120,
      "minimumTrust": 15
    },
    "known_ecommerce": {
      "minimumTicks": 300,
      "minimumTrust": 30
    },
    "international_group": {
      "minimumTicks": 600,
      "minimumTrust": 45
    },
    "major_target": {
      "minimumTicks": 1000,
      "minimumTrust": 60
    }
  }
}
```

La progression peut être automatique ou déclenchée par événement narratif.

## 14.3 Choix business

Certains événements doivent proposer des arbitrages.

Exemple :

```text
L’entreprise veut lancer une marketplace.
```

Options :

### Accepter sans condition

```json
{
  "budget": 300,
  "exposure": 35,
  "unknownDebt": 20,
  "trust": 5
}
```

### Demander une phase sécurité

```json
{
  "budget": 150,
  "exposure": 15,
  "unknownDebt": 10,
  "trust": -3,
  "findings": 20
}
```

### Bloquer temporairement

```json
{
  "budget": 0,
  "exposure": 0,
  "trust": -15,
  "fatigue": 3
}
```

Règle :

* aucun choix ne doit être parfait ;
* les choix doivent faire sentir l’arbitrage RSSI.

---

# 15. Attaques MVP

## 15.1 phishing_basic

Famille :

```text
phishing
```

Base power :

```json
{
  "basePower": 20
}
```

Scaling :

```json
{
  "exposure": 0.2,
  "fatigue": 0.2,
  "businessSize": 4
}
```

Défenses utiles :

```json
[
  "phishingDefense",
  "mfa",
  "identitySecurity",
  "detection"
]
```

Impacts bloqué :

```json
{
  "findings": 3,
  "proofs": 1,
  "fatigue": 1
}
```

Impacts partiel :

```json
{
  "findings": 8,
  "fatigue": 6,
  "trust": -4,
  "budget": -30
}
```

Impacts majeur :

```json
{
  "findings": 15,
  "fatigue": 15,
  "trust": -10,
  "budget": -120,
  "knownDebt": 5
}
```

## 15.2 ransomware_minor

Famille :

```text
ransomware
```

Base power :

```json
{
  "basePower": 35
}
```

Scaling :

```json
{
  "knownDebt": 0.2,
  "unknownDebt": 0.15,
  "fatigue": 0.25,
  "businessSize": 5
}
```

Défenses utiles :

```json
[
  "edr",
  "backup",
  "segmentation",
  "incidentResponse",
  "resilience",
  "detection"
]
```

Impacts bloqué :

```json
{
  "findings": 5,
  "proofs": 2,
  "fatigue": 2
}
```

Impacts partiel :

```json
{
  "budget": -100,
  "trust": -8,
  "fatigue": 15,
  "findings": 20,
  "knownDebt": 5
}
```

Impacts majeur :

```json
{
  "budget": -300,
  "trust": -18,
  "fatigue": 30,
  "findings": 40,
  "knownDebt": 10,
  "resilience": -10
}
```

## 15.3 vulnerable_web_app

Famille :

```text
web
```

Base power :

```json
{
  "basePower": 30
}
```

Scaling :

```json
{
  "exposure": 0.3,
  "knownDebt": 0.2,
  "businessSize": 5
}
```

Défenses utiles :

```json
[
  "appsec",
  "waf",
  "patching",
  "detection"
]
```

Impacts bloqué :

```json
{
  "findings": 5,
  "proofs": 1
}
```

Impacts partiel :

```json
{
  "trust": -6,
  "budget": -80,
  "findings": 15,
  "knownDebt": 5
}
```

Impacts majeur :

```json
{
  "trust": -15,
  "budget": -250,
  "findings": 35,
  "knownDebt": 10,
  "exposure": 5,
  "fatigue": 12
}
```

## 15.4 client_audit

Famille :

```text
audit
```

Base power :

```json
{
  "basePower": 25
}
```

Scaling :

```json
{
  "businessSize": 6,
  "knownDebt": 0.1
}
```

Défenses utiles :

```json
[
  "proofs",
  "governance",
  "thirdPartyManagement",
  "visibility"
]
```

Résultat réussi :

```json
{
  "trust": 8,
  "budget": 100,
  "proofs": -20
}
```

Résultat partiel :

```json
{
  "trust": -4,
  "findings": 10,
  "proofs": -10
}
```

Résultat échec :

```json
{
  "trust": -12,
  "budget": -100,
  "findings": 20,
  "fatigue": 8
}
```

Note :

* un audit n’est pas une attaque cyber ;
* il teste la maturité documentaire et la capacité à prouver.

---

# 16. Incidents spéciaux V1

Prévoir sans forcément implémenter en MVP.

## 16.1 compte_admin_compromis

Déclencheur probable :

```text
mfa faible + identitySecurity faible + privilegedAccessSecurity faible
```

Impacts :

```json
{
  "trust": -20,
  "budget": -300,
  "fatigue": 25,
  "knownDebt": 15,
  "findings": 50
}
```

## 16.2 fournisseur_compromis

Déclencheur probable :

```text
thirdPartyManagement faible + businessStage >= 3
```

Impacts :

```json
{
  "trust": -15,
  "budget": -250,
  "fatigue": 20,
  "findings": 40,
  "exposure": 10
}
```

## 16.3 fuite_donnees_client

Déclencheur probable :

```text
webDefense faible + appsec faible + exposure élevée
```

Impacts :

```json
{
  "trust": -25,
  "budget": -500,
  "fatigue": 35,
  "findings": 60,
  "knownDebt": 20
}
```

## 16.4 audit_nis2_rate

Déclencheur probable :

```text
governance faible + proofs faibles + businessStage >= 4
```

Impacts :

```json
{
  "trust": -20,
  "budget": -400,
  "fatigue": 20,
  "findings": 40
}
```

---

# 17. Seuils narratifs

Certains messages doivent être déclenchés par seuil.

## 17.1 Dette connue

| Seuil | Message                                                                 |
| ----: | ----------------------------------------------------------------------- |
|    20 | Les premiers constats confirment que le SI a une mémoire sélective.     |
|    50 | La dette cyber connue commence à ressembler à un programme pluriannuel. |
|   100 | Le rapport d’audit pourrait probablement être utilisé comme cale-porte. |

## 17.2 Visibilité

| Seuil | Message                                                                                     |
| ----: | ------------------------------------------------------------------------------------------- |
|    10 | L’inventaire révèle plus de systèmes que prévu. Étonnant, non.                              |
|    30 | Des dépendances apparaissent entre applications, équipes et prestataires.                   |
|    60 | Le SI ressemble maintenant à une constellation. Belle, complexe, et légèrement inquiétante. |
|    90 | Il reste encore des zones d’ombre, mais elles ont au moins un nom.                          |

## 17.3 Fatigue

| Seuil | Message                                                       |
| ----: | ------------------------------------------------------------- |
|    30 | L’équipe commence à répondre aux alertes avec moins d’humour. |
|    60 | La fatigue devient un risque opérationnel.                    |
|    85 | Un café de plus ne résoudra probablement pas le problème.     |

## 17.4 Confiance COMEX

| Seuil | Message                                                                           |
| ----: | --------------------------------------------------------------------------------- |
|    20 | Le COMEX écoute poliment. C’est déjà ça.                                          |
|    50 | La sécurité commence à être perçue comme un sujet de pilotage.                    |
|    80 | Le COMEX demande des indicateurs avant de demander des miracles. Progrès notable. |

---

# 18. Constellation infrastructure

## 18.1 Nombre de points visibles

Formule simple MVP :

```text
visibleNodes = 1 + floor(visibility / 5) + floor(exposure / 25)
```

Bornage MVP :

```text
visibleNodes = clamp(visibleNodes, 1, 40)
```

Exemples :

| Visibilité | Exposition | Points visibles |
| ---------: | ---------: | --------------: |
|          1 |         10 |               1 |
|         10 |         10 |               3 |
|         30 |         25 |               8 |
|         60 |         50 |              15 |
|         90 |        100 |              23 |

## 18.2 Statut des points

Répartition recommandée :

```text
ratioDebtNodes = knownDebt / (knownDebt + 100)
ratioIncidentNodes = incidentsActifs > 0 ? 1 à 3 points : 0
ratioStableNodes = maturity / 100
```

Règles :

* plus la dette connue est haute, plus il y a de points orange ;
* plus la maturité est haute, plus il y a de points stables ;
* un incident colore temporairement un ou plusieurs points en rouge ;
* les points ne doivent jamais clignoter brutalement.

## 18.3 Animation

```json
{
  "normalPulseDurationMs": 4000,
  "unstablePulseDurationMs": 3500,
  "incidentPulseDurationMs": 2500,
  "minOpacity": 0.45,
  "maxOpacity": 1.0
}
```

Accessibilité :

* respecter `prefers-reduced-motion`;
* option jeu : normal / réduit / désactivé ;
* pas de flash on/off ;
* pas de cycle inférieur à 2 secondes pour les alertes.

---

# 19. Difficulté

Prévoir trois niveaux, même si seul “normal” est utilisé au MVP.

## 19.1 Facile

```json
{
  "resourceGainMultiplier": 1.2,
  "attackPowerMultiplier": 0.85,
  "attackFrequencyMultiplier": 0.8,
  "incidentImpactMultiplier": 0.8,
  "startingTrust": 20
}
```

## 19.2 Normal

```json
{
  "resourceGainMultiplier": 1.0,
  "attackPowerMultiplier": 1.0,
  "attackFrequencyMultiplier": 1.0,
  "incidentImpactMultiplier": 1.0,
  "startingTrust": 10
}
```

## 19.3 Difficile

```json
{
  "resourceGainMultiplier": 0.9,
  "attackPowerMultiplier": 1.15,
  "attackFrequencyMultiplier": 1.2,
  "incidentImpactMultiplier": 1.2,
  "startingTrust": 5
}
```

MVP :

* implémenter uniquement normal ;
* garder la structure pour ajouter facile/difficile.

---

# 20. Règles de tuning

## 20.1 Si le jeu est trop lent

Ajuster dans cet ordre :

1. augmenter les gains des actions manuelles de 10 à 20 % ;
2. réduire les coûts des premières technologies ;
3. augmenter `logsPerTick` du collecteur basique ;
4. réduire les prérequis des premiers déblocages.

Ne pas baisser tout de suite les attaques.

## 20.2 Si le jeu est trop facile

Ajuster dans cet ordre :

1. augmenter l’exposition liée à la croissance business ;
2. augmenter le bruit des outils de détection non supervisés ;
3. augmenter les impacts partiels ;
4. augmenter le coût des technologies avancées ;
5. augmenter la fréquence des incidents.

Ne pas rendre les premières minutes punitives.

## 20.3 Si le jeu est frustrant

Vérifier :

* les attaques ont-elles été annoncées par des signaux faibles ?
* le joueur comprend-il pourquoi il a perdu ?
* les coûts sont-ils lisibles ?
* les prérequis sont-ils affichés ?
* les conséquences sont-elles expliquées ?
* le joueur a-t-il au moins une réponse possible ?

Le jeu peut être dur, mais il ne doit pas être opaque.

## 20.4 Si le joueur attend trop

Ajouter :

* production passive ;
* nouveaux choix narratifs ;
* événements intermédiaires ;
* affectation d’employés ;
* micro-objectifs visibles.

Ne pas résoudre l’attente uniquement par des boutons à cliquer.

---

# 21. Objectifs de rythme MVP

## 21.1 Première minute

Le joueur doit :

* lire l’intro ;
* collecter des logs ;
* analyser une alerte ;
* voir les premières ressources bouger.

## 21.2 Cinq premières minutes

Le joueur doit pouvoir :

* faire un audit manuel ;
* obtenir des constats ;
* obtenir des preuves ;
* comprendre la dette connue/inconnue ;
* viser le registre des actifs.

## 21.3 Dix premières minutes

Le joueur doit pouvoir :

* acheter le registre des actifs ;
* débloquer au moins deux technologies ;
* voir la constellation évoluer ;
* subir ou voir venir un premier événement de menace.

## 21.4 Vingt premières minutes

Le joueur doit pouvoir :

* obtenir une production passive de logs ;
* centraliser les logs ou préparer la procédure incident ;
* voir apparaître le besoin de budget ;
* comprendre que le COMEX est une ressource stratégique.

## 21.5 Trente à quarante minutes

Le joueur doit pouvoir :

* viser le SIEM minimal ;
* subir un incident partiel ;
* constater que les outils sans humains créent du bruit ;
* comprendre l’intérêt de l’expert SIEM ou du SOC.

---

# 22. Conditions de perte MVP

Ne pas implémenter de game over brutal au début.

À la place, utiliser un état de crise.

Déclenchement crise :

```text
trust <= 0
ou fatigue >= 100
ou budget < 0 pendant plusieurs ticks
ou incident majeur critique
```

Effet :

```text
mode crise
certaines actions deviennent indisponibles
priorité à la récupération
business ralenti
```

Actions de récupération possibles :

```text
demander arbitrage COMEX
geler projets risqués
mobiliser cellule crise
réduire dette urgente
externaliser temporairement
```

Le game over définitif peut être prévu plus tard, mais le MVP doit privilégier l’apprentissage.

---

# 23. Conditions de succès MVP

Le MVP peut avoir un objectif de première saison.

Succès de saison 1 :

```text
atteindre visibility >= 30
et trust >= 30
et resilience >= 10
et avoir au moins 4 technologies débloquées
et survivre à au moins 1 incident
```

Message :

```text
L’entreprise n’est pas sécurisée.
Mais elle n’est plus complètement aveugle.
C’est déjà une rupture culturelle.
```

---

# 24. Données à placer dans balancing.json

Structure recommandée :

```json
{
  "version": 1,
  "tick": {
    "tickDurationMs": 1000,
    "autosaveIntervalMs": 5000
  },
  "initialResources": {
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
  "manualActions": {
    "collect_logs": {
      "cost": {},
      "effect": {
        "logs": 10
      }
    },
    "analyze_alert": {
      "cost": {
        "logs": 10
      },
      "effect": {
        "findings": 5,
        "fatigue": 1
      }
    },
    "manual_audit": {
      "cost": {},
      "effect": {
        "findings": 5,
        "proofs": 3,
        "unknownDebt": -5,
        "knownDebt": 4,
        "fatigue": 1
      }
    },
    "write_comex_report": {
      "cost": {
        "findings": 20,
        "proofs": 20
      },
      "effect": {
        "trust": 5,
        "budget": 50
      }
    }
  },
  "attacks": {
    "initialGraceTicks": 30,
    "baseAttackChancePerTick": 0.01,
    "threatPressureMultiplier": 0.001,
    "minimumTicksBetweenAttacks": 20,
    "blockedMargin": 20,
    "partialMargin": -10
  },
  "infrastructureMap": {
    "maxVisibleNodesMvp": 40,
    "normalPulseDurationMs": 4000,
    "unstablePulseDurationMs": 3500,
    "incidentPulseDurationMs": 2500,
    "minOpacity": 0.45,
    "maxOpacity": 1.0
  },
  "difficulty": {
    "normal": {
      "resourceGainMultiplier": 1.0,
      "attackPowerMultiplier": 1.0,
      "attackFrequencyMultiplier": 1.0,
      "incidentImpactMultiplier": 1.0,
      "startingTrust": 10
    }
  }
}
```

---

# 25. Tests d’équilibrage attendus

Créer ou prévoir des tests simples.

## 25.1 Test de coût

Vérifier qu’une technologie :

* ne peut pas être achetée sans ressources ;
* peut être achetée avec ressources ;
* consomme le bon montant ;
* applique le bon effet.

## 25.2 Test de bornes

Vérifier que :

* fatigue ne dépasse pas 100 ;
* trust ne dépasse pas 100 ;
* visibility ne dépasse pas 100 ;
* aucune ressource ne devient NaN ;
* les ressources consommables ne deviennent pas négatives.

## 25.3 Test d’attaque

Créer un test où :

* attackPower > defensePower ;
* l’incident majeur est appliqué.

Créer un test où :

* defensePower > attackPower + 20 ;
* l’attaque est bloquée.

## 25.4 Test de progression

Créer un test simulant les premières actions :

```text
collect_logs x 8
manual_audit x 6
buy asset_register
```

Vérifier que :

* asset_register est achetable ;
* visibility augmente ;
* knownDebt augmente ;
* unknownDebt baisse.

---

# 26. Règle importante pour Codex

Quand Codex ajoute une mécanique :

1. ajouter ou modifier les valeurs dans les fichiers de données ;
2. ajouter ou modifier les types si nécessaire ;
3. ajouter ou modifier les selectors ;
4. ajouter ou modifier les tests ;
5. ne pas mettre les chiffres dans les composants Svelte ;
6. documenter le changement dans ce fichier si l’équilibrage change.

Ne pas optimiser l’équilibrage prématurément.

La priorité du MVP est :

```text
lisibilité > jouabilité > équilibrage fin > exhaustivité cyber
```

Le jeu doit d’abord être compréhensible et agréable à tester.

---
