import businessStagesData from '../../data/gameplay/businessStages.json';
import type { BusinessStage } from '../model/BusinessStage';
import type { GameState } from '../model/GameState';
import { getEffectiveStats } from './selectors';

export const THREAT_RULES = {
  initialGraceTicks: 30,
  baseAttackChancePerTick: 0.01,
  threatPressureMultiplier: 0.001,
  minimumTicksBetweenAttacks: 20,
} as const;

const BUSINESS_STAGES = businessStagesData as BusinessStage[];
const businessStagesById = new Map(BUSINESS_STAGES.map((stage) => [stage.id, stage]));

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getBusinessStage(state: GameState): BusinessStage {
  return businessStagesById.get(state.businessStageId) ?? BUSINESS_STAGES[0];
}

export function getBusinessStageLevel(state: GameState): number {
  return getBusinessStage(state).level;
}

export function getCyberMaturity(state: GameState): number {
  const stats = getEffectiveStats(state);
  const maturity =
    stats.detection * 0.18 +
    stats.incidentResponse * 0.14 +
    state.resources.resilience * 0.14 +
    stats.governance * 0.12 +
    stats.identitySecurity * 0.12 +
    stats.patching * 0.1 +
    stats.appsec * 0.08 +
    stats.cloudSecurity * 0.06 +
    stats.thirdPartyManagement * 0.06 -
    state.resources.fatigue * 0.08 -
    state.resources.alertNoise * 0.05;

  return clamp(maturity, 0, 100);
}

export function getThreatPressure(state: GameState): number {
  const businessStageLevel = getBusinessStageLevel(state);
  const maturity = getCyberMaturity(state);
  const threatPressure =
    businessStageLevel * 10 +
    state.resources.exposure * 0.6 +
    state.resources.knownDebt * 0.2 +
    state.resources.unknownDebt * 0.15 +
    state.resources.alertNoise * 0.1 -
    maturity * 0.25;

  return Math.max(0, threatPressure);
}

export function getAttackChance(state: GameState): number {
  return THREAT_RULES.baseAttackChancePerTick +
    getThreatPressure(state) * THREAT_RULES.threatPressureMultiplier;
}

export function shouldTriggerAttack(state: GameState, randomValue: number): boolean {
  if (state.turn < THREAT_RULES.initialGraceTicks) {
    return false;
  }

  if (
    typeof state.lastAttackTurn === 'number' &&
    state.turn - state.lastAttackTurn < THREAT_RULES.minimumTicksBetweenAttacks
  ) {
    return false;
  }

  return randomValue < getAttackChance(state);
}

export function getDeterministicThreatRoll(state: GameState, salt: string): number {
  return (hashString(`${state.randomSeed}|${state.turn}|${state.lastAttackTurn ?? 'none'}|${salt}`) % 10000) / 10000;
}