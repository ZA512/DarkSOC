import type { ManualActionId } from '../model/ManualAction';
import type { GameSettings } from '../model/Settings';

export type GameAction =
	| { type: 'START_MANUAL_ACTION'; actionId: ManualActionId }
	| { type: 'BUY_TECHNOLOGY'; technologyId: string }
	| { type: 'ASSIGN_EMPLOYEE_TASK'; employeeId: string; taskId: string }
	| { type: 'UNASSIGN_EMPLOYEE'; employeeId: string }
	| { type: 'COMPLETE_RUNNING_ACTION' }
	| { type: 'UPDATE_SETTINGS'; settings: Partial<GameSettings> }
	| { type: 'TICK'; deltaMs: number }
	| { type: 'RESET_GAME' };
