import attacksData from '../../data/gameplay/attacks.json';
import type { Attack, AttackImpact, AttackOutcome } from '../model/Attack';
import type { GameState } from '../model/GameState';
import type { EffectiveStats, TechnologyStatId } from '../model/Technology';
import { getBusinessStageLevel } from './business';
import { getEffectiveStats } from './selectors';

export const ATTACKS = attacksData as Attack[];

const attacksById = new Map(ATTACKS.map((attack) => [attack.id, attack]));

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getRelevantDefenseValue(
  state: GameState,
  stats: EffectiveStats,
  defenseId: string,
): number {
  switch (defenseId) {
    case 'proofs':
      return state.resources.proofs;

    case 'visibility':
      return state.resources.visibility;

    case 'resilience':
      return state.resources.resilience;

    default:
      return (stats[defenseId as TechnologyStatId] ?? 0) as number;
  }
}

export function getAttackById(id: string): Attack | undefined {
  return attacksById.get(id);
}

export function getAvailableAttacks(state: GameState): Attack[] {
  const businessStageLevel = getBusinessStageLevel(state);

  return ATTACKS.filter((attack) => {
    switch (attack.id) {
      case 'phishing_basic':
        return true;

      case 'client_audit':
        return state.resources.trust >= 15 || state.resources.visibility >= 10;

      case 'vulnerable_web_app':
        return state.resources.exposure >= 20 || state.resources.knownDebt >= 10;

      case 'ransomware_minor':
        return state.resources.knownDebt >= 20 || businessStageLevel >= 2;

      default:
        return false;
    }
  });
}

export function selectAttackForState(state: GameState): Attack | undefined {
  const availableAttacks = getAvailableAttacks(state);

  if (availableAttacks.length === 0) {
    return undefined;
  }

  const selectedIndex = hashString(`${state.randomSeed}|attack-select|${state.turn}`) % availableAttacks.length;

  return availableAttacks[selectedIndex];
}

export function getAttackPower(state: GameState, attack: Attack): number {
  return (
    attack.basePower +
    state.resources.exposure * (attack.scaling.exposure ?? 0) +
    state.resources.knownDebt * (attack.scaling.knownDebt ?? 0) +
    state.resources.unknownDebt * (attack.scaling.unknownDebt ?? 0) +
    getBusinessStageLevel(state) * (attack.scaling.businessSize ?? 0) +
    state.resources.fatigue * (attack.scaling.fatigue ?? 0) +
    state.resources.alertNoise * (attack.scaling.alertNoise ?? 0)
  );
}

export function getDefensePower(state: GameState, attack: Attack): number {
  const stats = getEffectiveStats(state);
  const relevantDefenseTotal = attack.relevantDefenses.reduce(
    (total, defenseId) => total + getRelevantDefenseValue(state, stats, defenseId),
    0,
  );
  let defensePower =
    relevantDefenseTotal +
    state.resources.visibility * 0.2 +
    state.resources.resilience * 0.15 -
    state.resources.fatigue * 0.25 -
    state.resources.alertNoise * 0.2;

  switch (attack.family) {
    case 'phishing':
      defensePower +=
        stats.phishingDefense +
        stats.mfa +
        stats.identitySecurity +
        stats.detection * 0.4 +
        state.resources.visibility * 0.1 -
        state.resources.fatigue * 0.2;
      break;

    case 'ransomware':
      defensePower +=
        stats.edr +
        stats.backup +
        stats.segmentation +
        stats.incidentResponse +
        state.resources.resilience +
        stats.detection * 0.3 -
        state.resources.fatigue * 0.3;
      break;

    case 'web':
      defensePower +=
        stats.appsec +
        stats.waf +
        stats.patching +
        stats.detection * 0.3 +
        state.resources.visibility * 0.2 -
        state.resources.knownDebt * 0.1;
      break;
  }

  return defensePower;
}

export function resolveAttack(
  state: GameState,
  attack: Attack,
): {
  outcome: AttackOutcome;
  attackPower: number;
  defensePower: number;
  impact: AttackImpact;
} {
  const attackPower = getAttackPower(state, attack);
  const defensePower = getDefensePower(state, attack);
  const margin = defensePower - attackPower;
  const outcome: AttackOutcome = margin >= 20 ? 'blocked' : margin >= -10 ? 'partial' : 'major';

  return {
    outcome,
    attackPower,
    defensePower,
    impact: attack.impacts[outcome],
  };
}