import crisisActionsData from '../../data/gameplay/crisisActions.json';
import type { CrisisAction, CrisisCause, CrisisLevel, CrisisState } from '../model/Crisis';
import type { GameState } from '../model/GameState';
import { applyResourceDelta, type ResourceId } from '../model/Resource';
import { normalizeBusinessMomentum } from './business';
import { getThreatPressureBase } from './threat';

const WATCH_TRUST_THRESHOLD = 7;
const ACTIVE_TRUST_THRESHOLD = 3;
const SEVERE_TRUST_THRESHOLD = 0;

const WATCH_FATIGUE_THRESHOLD = 70;
const ACTIVE_FATIGUE_THRESHOLD = 90;
const SEVERE_FATIGUE_THRESHOLD = 100;

const WATCH_THREAT_THRESHOLD = 80;
const ACTIVE_THREAT_THRESHOLD = 100;
const SEVERE_THREAT_THRESHOLD = 130;

const ACTIVE_BUDGET_THRESHOLD = 60;
const WATCH_KNOWN_DEBT_THRESHOLD = 120;
const HIGH_BUSINESS_MOMENTUM_THRESHOLD = 80;
const SUSTAINED_BUDGET_CRISIS_TURN_THRESHOLD = 90;

const CRISIS_RESOLVED_TRUST_THRESHOLD = 15;
const CRISIS_RESOLVED_FATIGUE_THRESHOLD = 40;

const CRISIS_TICK_EFFECTS: Record<Exclude<CrisisLevel, 'none'>, Partial<Record<ResourceId | 'businessMomentum', number>>> = {
  watch: {
    fatigue: 0.02,
    businessMomentum: -0.02,
  },
  active: {
    fatigue: 0.05,
    businessMomentum: -0.08,
    trust: -0.02,
  },
  severe: {
    fatigue: 0.08,
    businessMomentum: -0.15,
    trust: -0.05,
    budget: -0.2,
  },
  recovery: {
    fatigue: -0.06,
    businessMomentum: -0.05,
  },
};

export const CRISIS_ACTIONS = crisisActionsData as CrisisAction[];

const crisisActionsById = new Map(CRISIS_ACTIONS.map((action) => [action.id, action]));

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function appendNarrativeEntry(state: GameState, messageKey: string, key: string): GameState {
  return {
    ...state,
    narrativeLog: [
      ...state.narrativeLog,
      {
        id: `${key}_${state.turn}_${state.narrativeLog.length}`,
        messageKey,
      },
    ],
  };
}

function getTriggeredCrisisLevel(state: GameState): CrisisLevel {
  const threatPressure = getThreatPressureBase(state);
  const hasSustainedBudgetCrisis =
    state.resources.budget <= 0 &&
    state.turn >= SUSTAINED_BUDGET_CRISIS_TURN_THRESHOLD &&
    state.businessStageId !== 'small_company';

  if (
    state.resources.trust <= SEVERE_TRUST_THRESHOLD ||
    state.resources.fatigue >= SEVERE_FATIGUE_THRESHOLD ||
    state.activeIncidentIds.length >= 2 ||
    threatPressure >= SEVERE_THREAT_THRESHOLD
  ) {
    return 'severe';
  }

  if (
    state.resources.trust <= ACTIVE_TRUST_THRESHOLD ||
    state.resources.fatigue >= ACTIVE_FATIGUE_THRESHOLD ||
    state.activeIncidentIds.length >= 1 ||
    (hasSustainedBudgetCrisis && state.resources.budget <= ACTIVE_BUDGET_THRESHOLD) ||
    threatPressure >= ACTIVE_THREAT_THRESHOLD
  ) {
    return 'active';
  }

  if (
    state.resources.trust <= WATCH_TRUST_THRESHOLD ||
    state.resources.fatigue >= WATCH_FATIGUE_THRESHOLD ||
    threatPressure >= WATCH_THREAT_THRESHOLD ||
    state.businessMomentum >= HIGH_BUSINESS_MOMENTUM_THRESHOLD ||
    state.resources.knownDebt >= WATCH_KNOWN_DEBT_THRESHOLD
  ) {
    return 'watch';
  }

  return 'none';
}

function canResolveCrisis(state: GameState): boolean {
  return (
    state.resources.trust >= CRISIS_RESOLVED_TRUST_THRESHOLD &&
    state.resources.fatigue <= CRISIS_RESOLVED_FATIGUE_THRESHOLD &&
    state.activeIncidentIds.length === 0
  );
}

export function normalizeRecoveryProgress(value: number): number {
  return clamp(Number.isFinite(value) ? value : 0, 0, 100);
}

export function getCrisisActionDefinition(crisisActionId: string): CrisisAction | undefined {
  return crisisActionsById.get(crisisActionId);
}

export function getCrisisCauses(state: GameState): CrisisCause[] {
  const causes: CrisisCause[] = [];
  const hasSustainedBudgetCrisis =
    state.resources.budget <= 0 &&
    state.turn >= SUSTAINED_BUDGET_CRISIS_TURN_THRESHOLD &&
    state.businessStageId !== 'small_company';

  if (state.resources.trust <= 10) {
    causes.push('trust_collapse');
  }

  if (state.resources.fatigue >= ACTIVE_FATIGUE_THRESHOLD) {
    causes.push('team_exhaustion');
  }

  if (state.activeIncidentIds.length > 0) {
    causes.push('major_incident');
  }

  if (hasSustainedBudgetCrisis) {
    causes.push('budget_collapse');
  }

  if (
    state.businessMomentum >= HIGH_BUSINESS_MOMENTUM_THRESHOLD ||
    state.resources.knownDebt >= WATCH_KNOWN_DEBT_THRESHOLD
  ) {
    causes.push('business_overexposure');
  }

  if (state.flags.audit_failure === true) {
    causes.push('audit_failure');
  }

  return [...new Set(causes)];
}

export function evaluateCrisisState(state: GameState): CrisisState {
  const triggeredLevel = getTriggeredCrisisLevel(state);
  const currentCrisis = state.crisis;
  let nextLevel: CrisisLevel;

  if (currentCrisis.level === 'recovery') {
    nextLevel = canResolveCrisis(state) ? 'none' : 'recovery';
  } else if (
    (currentCrisis.level === 'active' || currentCrisis.level === 'severe') &&
    currentCrisis.recoveryProgress >= 100
  ) {
    nextLevel = 'recovery';
  } else if (currentCrisis.level === 'active' || currentCrisis.level === 'severe') {
    nextLevel = triggeredLevel === 'severe' ? 'severe' : 'active';
  } else {
    nextLevel = triggeredLevel;
  }

  if (nextLevel === 'none') {
    return {
      level: 'none',
      causes: [],
      recoveryProgress: 0,
    };
  }

  return {
    level: nextLevel,
    causes: getCrisisCauses(state),
    startedAtTurn: currentCrisis.level === 'none' ? state.turn : currentCrisis.startedAtTurn ?? state.turn,
    lastEscalationTurn:
      currentCrisis.level !== nextLevel ? state.turn : currentCrisis.lastEscalationTurn,
    recoveryProgress: normalizeRecoveryProgress(currentCrisis.recoveryProgress),
  };
}

export function synchronizeCrisisState(state: GameState): GameState {
  const nextCrisis = evaluateCrisisState(state);

  if (
    nextCrisis.level === state.crisis.level &&
    nextCrisis.recoveryProgress === state.crisis.recoveryProgress &&
    nextCrisis.startedAtTurn === state.crisis.startedAtTurn &&
    nextCrisis.lastEscalationTurn === state.crisis.lastEscalationTurn &&
    nextCrisis.causes.length === state.crisis.causes.length &&
    nextCrisis.causes.every((cause, index) => cause === state.crisis.causes[index])
  ) {
    return state;
  }

  return {
    ...state,
    crisis: nextCrisis,
  };
}

export function getCrisisTransitionMessageKey(previousLevel: CrisisLevel, nextLevel: CrisisLevel): string | undefined {
  if (previousLevel === nextLevel) {
    return undefined;
  }

  if (previousLevel === 'recovery' && nextLevel === 'none') {
    return 'events.crisis.resolved';
  }

  if (nextLevel === 'none') {
    return undefined;
  }

  return `events.crisis.${nextLevel}.entered`;
}

export function applyCrisisTransitionNarrative(state: GameState, previousLevel: CrisisLevel): GameState {
  const messageKey = getCrisisTransitionMessageKey(previousLevel, state.crisis.level);

  if (!messageKey) {
    return state;
  }

  return appendNarrativeEntry(state, messageKey, `crisis_${state.crisis.level}`);
}

export function applyCrisisTick(state: GameState, deltaMs: number): GameState {
  if (deltaMs <= 0 || state.crisis.level === 'none') {
    return state;
  }

  const factor = deltaMs / 1000;
  const perSecondEffects = CRISIS_TICK_EFFECTS[state.crisis.level];
  const resourceDelta: Partial<Record<ResourceId, number>> = {};

  for (const [effectId, amount] of Object.entries(perSecondEffects)) {
    if (effectId !== 'businessMomentum') {
      resourceDelta[effectId as ResourceId] = amount * factor;
    }
  }

  return {
    ...state,
    resources: applyResourceDelta(state.resources, resourceDelta),
    businessMomentum: normalizeBusinessMomentum(
      state.businessMomentum + ((perSecondEffects.businessMomentum ?? 0) * factor),
    ),
  };
}

export function isCrisisActionAvailableForLevel(level: CrisisLevel, crisisActionId: string): boolean {
  const crisisAction = getCrisisActionDefinition(crisisActionId);

  return Boolean(crisisAction && crisisAction.availableInLevels.includes(level));
}

export function canExecuteCrisisAction(state: GameState, crisisActionId: string): boolean {
  const crisisAction = getCrisisActionDefinition(crisisActionId);

  if (!crisisAction || state.crisis.level === 'none') {
    return false;
  }

  if (!crisisAction.availableInLevels.includes(state.crisis.level)) {
    return false;
  }

  if (
    crisisAction.requiresTechnologyIds?.some(
      (technologyId) => !state.unlockedTechnologyIds.includes(technologyId),
    )
  ) {
    return false;
  }

  return Object.entries(crisisAction.cost).every(
    ([resourceId, amount]) => state.resources[resourceId as ResourceId] >= amount,
  );
}

export function executeCrisisAction(state: GameState, crisisActionId: string): GameState {
  const crisisAction = getCrisisActionDefinition(crisisActionId);

  if (!crisisAction || !canExecuteCrisisAction(state, crisisActionId)) {
    return state;
  }

  const resourceDelta: Partial<Record<ResourceId, number>> = {};

  for (const [resourceId, amount] of Object.entries(crisisAction.cost) as Array<[ResourceId, number]>) {
    resourceDelta[resourceId] = (resourceDelta[resourceId] ?? 0) - amount;
  }

  for (const [effectId, amount] of Object.entries(crisisAction.effects)) {
    if (effectId !== 'businessMomentum' && effectId !== 'recoveryProgress') {
      const resourceId = effectId as ResourceId;

      resourceDelta[resourceId] = (resourceDelta[resourceId] ?? 0) + amount;
    }
  }

  const nextState = {
    ...state,
    resources: applyResourceDelta(state.resources, resourceDelta),
    businessMomentum: normalizeBusinessMomentum(
      state.businessMomentum + (crisisAction.effects.businessMomentum ?? 0),
    ),
    crisis: {
      ...state.crisis,
      recoveryProgress: normalizeRecoveryProgress(
        state.crisis.recoveryProgress + (crisisAction.effects.recoveryProgress ?? 0),
      ),
    },
  };

  return appendNarrativeEntry(nextState, crisisAction.narrativeKey, `crisis_action_${crisisActionId}`);
}