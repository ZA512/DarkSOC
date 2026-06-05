import { describe, expect, it } from 'vitest';
import { normalizeResources } from './Resource';

describe('normalizeResources', () => {
  it('clamps bounded resources at 100', () => {
    const resources = normalizeResources({
      trust: 120,
      visibility: 150,
      fatigue: 200,
      resilience: 101,
      alertNoise: 999,
    });

    expect(resources.trust).toBe(100);
    expect(resources.visibility).toBe(100);
    expect(resources.fatigue).toBe(100);
    expect(resources.resilience).toBe(100);
    expect(resources.alertNoise).toBe(100);
  });

  it('brings impossible negative resources back to zero', () => {
    const resources = normalizeResources({
      logs: -1,
      findings: -1,
      proofs: -1,
      budget: -1,
      knownDebt: -1,
      unknownDebt: -1,
      exposure: -1,
    });

    expect(resources.logs).toBe(0);
    expect(resources.findings).toBe(0);
    expect(resources.proofs).toBe(0);
    expect(resources.budget).toBe(0);
    expect(resources.knownDebt).toBe(0);
    expect(resources.unknownDebt).toBe(0);
    expect(resources.exposure).toBe(0);
  });

  it('converts NaN resources to zero', () => {
    const resources = normalizeResources({
      logs: Number.NaN,
      trust: Number.NaN,
    });

    expect(resources.logs).toBe(0);
    expect(resources.trust).toBe(0);
  });
});
