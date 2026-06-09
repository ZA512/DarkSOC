export type ManualActionId =
  | 'collect_logs'
  | 'analyze_alert'
  | 'manual_audit'
  | 'write_comex_report';

export type RunningAction = {
  id: ManualActionId;
  startedAtTurn: number;
  remainingMs: number;
  durationMs: number;
};