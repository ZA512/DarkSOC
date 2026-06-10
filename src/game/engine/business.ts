import businessEventsData from '../../data/gameplay/businessEvents.json';
import businessStagesData from '../../data/gameplay/businessStages.json';
import type { BusinessEvent, BusinessEventChoice, BusinessStage, BusinessStageId } from '../model/Business';
import type { GameState } from '../model/GameState';
import { applyResourceDelta } from '../model/Resource';

const STAGE_GROWTH_MOMENTUM = 10;

export const BUSINESS_STAGES = businessStagesData as BusinessStage[];
export const BUSINESS_EVENTS = businessEventsData as BusinessEvent[];

const businessStagesById = new Map<BusinessStageId, BusinessStage>(
  BUSINESS_STAGES.map((stage) => [stage.id, stage]),
);
const businessEventsById = new Map(BUSINESS_EVENTS.map((event) => [event.id, event]));

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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function getBusinessEventChoice(event: BusinessEvent, choiceId: string): BusinessEventChoice | undefined {
  return event.choices.find((choice) => choice.id === choiceId);
}

function canAdvanceToBusinessStage(state: GameState, stage: BusinessStage): boolean {
  return state.turn >= stage.minimumTurn && state.resources.trust >= stage.minimumTrust;
}

function canTriggerBusinessEvent(state: GameState, event: BusinessEvent): boolean {
  const minimumStage = getBusinessStageDefinition(event.minimumStageId);

  if (!minimumStage) {
    return false;
  }

  if (getBusinessStageLevel(state) < minimumStage.level) {
    return false;
  }

  if (state.turn < event.minimumTurn || state.resources.trust < event.minimumTrust) {
    return false;
  }

  if (event.triggersOnce !== false && state.businessEventHistory.includes(event.id)) {
    return false;
  }

  return true;
}

export function normalizeBusinessMomentum(value: number): number {
  return clamp(Number.isFinite(value) ? value : 0, 0, 100);
}

export function getBusinessStageDefinition(id: string): BusinessStage | undefined {
  return businessStagesById.get(id as BusinessStageId);
}

export function getBusinessStage(state: Pick<GameState, 'businessStageId'>): BusinessStage {
  return getBusinessStageDefinition(state.businessStageId) ?? BUSINESS_STAGES[0];
}

export function getBusinessStageLevel(state: Pick<GameState, 'businessStageId'>): number {
  return getBusinessStage(state).level;
}

export function getNextBusinessStage(state: Pick<GameState, 'businessStageId'>): BusinessStage | undefined {
  const currentStage = getBusinessStage(state);

  return BUSINESS_STAGES.find((stage) => stage.level === currentStage.level + 1);
}

export function getBusinessEventDefinition(id: string): BusinessEvent | undefined {
  return businessEventsById.get(id);
}

export function getPendingBusinessEvent(
  state: Pick<GameState, 'pendingBusinessEventId'>,
): BusinessEvent | undefined {
  return state.pendingBusinessEventId ? getBusinessEventDefinition(state.pendingBusinessEventId) : undefined;
}

export function processBusinessTurn(state: GameState): GameState {
  if (state.pendingBusinessEventId) {
    return state;
  }

  let nextState = state;
  let nextStage = getNextBusinessStage(nextState);

  while (nextStage && canAdvanceToBusinessStage(nextState, nextStage)) {
    const exposureDelta = Math.max(0, nextStage.baseExposure - nextState.resources.exposure);

    nextState = appendNarrativeEntry(
      {
        ...nextState,
        businessStageId: nextStage.id,
        businessMomentum: normalizeBusinessMomentum(nextState.businessMomentum + STAGE_GROWTH_MOMENTUM),
        resources: applyResourceDelta(nextState.resources, {
          budget: nextStage.budgetBonus,
          exposure: exposureDelta,
        }),
      },
      `events.business.stage.${nextStage.id}`,
      `business_stage_${nextStage.id}`,
    );

    nextStage = getNextBusinessStage(nextState);
  }

  if (
    nextState.crisis.level === 'active' ||
    nextState.crisis.level === 'severe' ||
    nextState.crisis.level === 'recovery'
  ) {
    return nextState;
  }

  const eventToQueue = BUSINESS_EVENTS.find((event) => canTriggerBusinessEvent(nextState, event));

  if (!eventToQueue) {
    return nextState;
  }

  return appendNarrativeEntry(
    {
      ...nextState,
      pendingBusinessEventId: eventToQueue.id,
    },
    `events.business.${eventToQueue.id}.pending`,
    `business_event_${eventToQueue.id}`,
  );
}

export function applyBusinessChoice(state: GameState, eventId: string, choiceId: string): GameState {
  if (
    state.crisis.level === 'active' ||
    state.crisis.level === 'severe' ||
    state.crisis.level === 'recovery'
  ) {
    return state;
  }

  if (state.pendingBusinessEventId !== eventId) {
    return state;
  }

  const event = getBusinessEventDefinition(eventId);

  if (!event) {
    return state;
  }

  const choice = getBusinessEventChoice(event, choiceId);

  if (!choice) {
    return state;
  }

  return appendNarrativeEntry(
    {
      ...state,
      resources: applyResourceDelta(state.resources, choice.effects),
      businessEventHistory: [...new Set([...state.businessEventHistory, event.id])],
      pendingBusinessEventId: undefined,
      businessMomentum: normalizeBusinessMomentum(state.businessMomentum + (choice.momentumDelta ?? 0)),
    },
    `events.business.${event.id}.${choice.id}`,
    `business_choice_${event.id}_${choice.id}`,
  );
}