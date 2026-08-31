import { describe, expect, it } from "vitest";
import { borrowFactor, dynamicLimit, normalizePreferenceWeights, simulatePolicy } from "./policyMath";
import { endpoints, policies } from "./mockData";

describe("optimistic rate limit math", () => {
  it("keeps the full borrow factor below the 60% waterline", () => {
    expect(borrowFactor(0.4)).toBe(1);
    expect(dynamicLimit(100, 3, 0.4, true)).toBe(300);
  });

  it("smoothly returns borrowed capacity between 60% and 85%", () => {
    expect(borrowFactor(0.725)).toBeCloseTo(0.5, 5);
    expect(dynamicLimit(100, 3, 0.725, true)).toBe(200);
  });

  it("applies a custom M value to the same dynamic quota curve", () => {
    expect(dynamicLimit(100, 4.5, 0.6, true)).toBe(450);
    expect(dynamicLimit(100, 4.5, 0.725, true)).toBe(275);
  });

  it("normalizes raw channel preference weights within the candidate set", () => {
    expect(normalizePreferenceWeights([50, 50, 100])).toEqual([0.25, 0.25, 0.5]);
    const policy = {
      ...policies[0],
      preferences: policies[0].preferences.map((preference, index) => ({ ...preference, weight: index === 0 ? 100 : 50 })),
    };
    const result = simulatePolicy(policy, endpoints, 0.72);
    const first = result.endpoints.find((row) => row.endpoint.id === policies[0].preferences[0].epId);
    expect(first?.preferenceWeight).toBe(100);
    expect(first?.normalizedPreference).toBeCloseTo(0.4, 5);
  });

  it("uses policy-level scoring weights instead of preset defaults", () => {
    const policy = {
      ...policies[0],
      scoringWeights: { cost: 1, performance: 0, health: 0, hunger: 0 },
    };
    const result = simulatePolicy(policy, endpoints, 0.72);
    const passed = result.endpoints.filter((row) => row.passed);
    expect(passed.length).toBeGreaterThan(0);
    passed.forEach((row) => expect(row.scores.weighted).toBeCloseTo(row.scores.cost, 5));
  });

  it("treats endpoint allow and deny selections as hard filters", () => {
    const selectedEndpoint = endpoints.find((endpoint) => endpoint.modelIds.includes(policies[0].scope.modelId));
    expect(selectedEndpoint).toBeDefined();
    const policy = {
      ...policies[0],
      constraints: {
        ...policies[0].constraints,
        allowEndpointIds: [selectedEndpoint!.id],
        denyEndpointIds: [],
      },
    };
    const result = simulatePolicy(policy, endpoints, 0.72);
    const passed = result.endpoints.filter((row) => row.passed);
    expect(passed.map((row) => row.endpoint.id)).toEqual([selectedEndpoint!.id]);
  });

  it("does not borrow after the 85% waterline or when disabled", () => {
    expect(borrowFactor(0.9)).toBe(0);
    expect(dynamicLimit(100, 3, 0.9, true)).toBe(100);
    expect(dynamicLimit(100, 3, 0.4, false)).toBe(100);
  });

  it("keeps hard filters separate from score and probability", () => {
    const policy = policies[1];
    const result = simulatePolicy(policy, endpoints, 0.72);
    const passed = result.endpoints.filter((row) => row.passed);
    expect(passed.every((row) => row.endpoint.origin === "internal")).toBe(true);
    expect(passed.reduce((sum, row) => sum + row.probability, 0)).toBeCloseTo(1, 5);
    expect(result.endpoints.some((row) => !row.passed && row.filteredBy.length > 0)).toBe(true);
  });
});
