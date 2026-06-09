import { describe, expect, it } from 'vitest';
import { getTechnologyDefinition, TECHNOLOGIES } from './technologies';

describe('technology data', () => {
  it('loads technologies and includes asset_register', () => {
    expect(TECHNOLOGIES.length).toBeGreaterThan(0);
    expect(getTechnologyDefinition('asset_register')?.id).toBe('asset_register');
  });

  it('uses unique technology ids', () => {
    const ids = TECHNOLOGIES.map((technology) => technology.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('defines valid costs for each technology', () => {
    for (const technology of TECHNOLOGIES) {
      for (const amount of Object.values(technology.cost)) {
        expect(Number.isFinite(amount)).toBe(true);
        expect(amount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('points each prerequisite to an existing technology', () => {
    const technologyIds = new Set(TECHNOLOGIES.map((technology) => technology.id));

    for (const technology of TECHNOLOGIES) {
      for (const requiredTechnologyId of technology.requires) {
        expect(technologyIds.has(requiredTechnologyId)).toBe(true);
      }
    }
  });
});