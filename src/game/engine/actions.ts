import type { ManualActionId } from '../model/ManualAction';
import type { GameSettings } from '../model/Settings';

export type GameAction =
	| { type: 'START_MANUAL_ACTION'; actionId: ManualActionId }
	| { type: 'BUY_TECHNOLOGY'; technologyId: string }
	| { type: 'CHOOSE_BUSINESS_OPTION'; eventId: string; choiceId: string }
	| { type: 'EXECUTE_CRISIS_ACTION'; crisisActionId: string }
	| { type: 'DISMISS_ONBOARDING' }
	| { type: 'DISMISS_SEASON_SUMMARY' }
	| { type: 'ASSIGN_EMPLOYEE_TASK'; employeeId: string; taskId: string }
	| { type: 'UNASSIGN_EMPLOYEE'; employeeId: string }
	| { type: 'COMPLETE_RUNNING_ACTION'; actionId: ManualActionId }
	| { type: 'UPDATE_SETTINGS'; settings: Partial<GameSettings> }
	| { type: 'TICK'; deltaMs: number }
	| { type: 'RESET_GAME' };
