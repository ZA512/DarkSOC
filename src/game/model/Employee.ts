import employeesData from '../../data/gameplay/employees.json';

export type EmployeeRole =
  | 'admin'
  | 'analyst'
  | 'auditor'
  | 'secops'
  | 'governance'
  | 'pentester'
  | 'appsec'
  | 'cloudsec';

export type EmployeeStatus = 'available' | 'assigned' | 'exhausted' | 'locked';

export type Employee = {
  id: string;
  role: EmployeeRole;
  nameKey: string;
  descriptionKey: string;
  unlocked: boolean;
  assignedTaskId?: string;
  fatigue: number;
};

export const EMPLOYEE_DEFINITIONS = employeesData as Employee[];

const employeeDefinitionsById = new Map(EMPLOYEE_DEFINITIONS.map((employee) => [employee.id, employee]));

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeEmployeeFatigue(fatigue: number): number {
  return clamp(Number.isFinite(fatigue) ? fatigue : 0, 0, 100);
}

export function getEmployeeDefinition(id: string): Employee | undefined {
  return employeeDefinitionsById.get(id);
}

export function normalizeEmployee(employee: Partial<Employee>, fallback: Employee): Employee {
  return {
    ...fallback,
    ...employee,
    id: fallback.id,
    role: fallback.role,
    nameKey: fallback.nameKey,
    descriptionKey: fallback.descriptionKey,
    unlocked: typeof employee.unlocked === 'boolean' ? employee.unlocked : fallback.unlocked,
    assignedTaskId: typeof employee.assignedTaskId === 'string' ? employee.assignedTaskId : undefined,
    fatigue: normalizeEmployeeFatigue(employee.fatigue ?? fallback.fatigue),
  };
}

export function createInitialEmployees(): Employee[] {
  return EMPLOYEE_DEFINITIONS.map((employee) => normalizeEmployee(employee, employee));
}

export function normalizeEmployeeRoster(employees: Partial<Employee>[]): Employee[] {
  const employeesById = new Map(employees.map((employee) => [employee.id, employee]));

  return EMPLOYEE_DEFINITIONS.map((employee) => normalizeEmployee(employeesById.get(employee.id) ?? {}, employee));
}