import { describe, it, expect } from 'vitest';
import {
  toLitersPerMinute,
  fromLitersPerMinute,
  calculateVerification,
  calculateCalibration,
  calculateWeightedCalibration,
  suggestAlternativeTime,
  validateFlowRate,
} from '../../js/calc.js';

describe('calc.js smoke test', () => {
  it('should export toLitersPerMinute as a function', () => {
    expect(typeof toLitersPerMinute).toBe('function');
  });

  it('should export fromLitersPerMinute as a function', () => {
    expect(typeof fromLitersPerMinute).toBe('function');
  });

  it('should export calculateVerification as a function', () => {
    expect(typeof calculateVerification).toBe('function');
  });

  it('should export calculateCalibration as a function', () => {
    expect(typeof calculateCalibration).toBe('function');
  });

  it('should export calculateWeightedCalibration as a function', () => {
    expect(typeof calculateWeightedCalibration).toBe('function');
  });

  it('should export suggestAlternativeTime as a function', () => {
    expect(typeof suggestAlternativeTime).toBe('function');
  });

  it('should export validateFlowRate as a function', () => {
    expect(typeof validateFlowRate).toBe('function');
  });
});

describe('suggestAlternativeTime', () => {
  it('should suggest longer time when flow is below minimum (bound=min)', () => {
    // 10 liters, 2 drippers, flow below 1 l/min → time = 10 / (2 * 1) = 5 min
    expect(suggestAlternativeTime(10, 2, 'min')).toBe(5);
  });

  it('should suggest shorter time when flow exceeds maximum (bound=max)', () => {
    // 10 liters, 2 drippers, flow above 8 l/min → time = 10 / (2 * 8) = 0.625 → rounds to 0.5
    expect(suggestAlternativeTime(10, 2, 'max')).toBe(0.5);
  });

  it('should round result to nearest 0.5 (slider step)', () => {
    // 3 liters, 1 dripper, bound=max → time = 3 / (1 * 8) = 0.375 → rounds to 0.5
    expect(suggestAlternativeTime(3, 1, 'max')).toBe(0.5);
    // 7 liters, 1 dripper, bound=max → time = 7 / 8 = 0.875 → rounds to 1.0
    expect(suggestAlternativeTime(7, 1, 'max')).toBe(1);
  });

  it('should handle single dripper correctly', () => {
    // 4 liters, 1 dripper, bound=min → time = 4 / (1 * 1) = 4 min
    expect(suggestAlternativeTime(4, 1, 'min')).toBe(4);
    // 4 liters, 1 dripper, bound=max → time = 4 / (1 * 8) = 0.5 min
    expect(suggestAlternativeTime(4, 1, 'max')).toBe(0.5);
  });

  it('should handle multiple drippers', () => {
    // 24 liters, 3 drippers, bound=max → time = 24 / (3 * 8) = 1 min
    expect(suggestAlternativeTime(24, 3, 'max')).toBe(1);
    // 24 liters, 3 drippers, bound=min → time = 24 / (3 * 1) = 8 min
    expect(suggestAlternativeTime(24, 3, 'min')).toBe(8);
  });
});

describe('validateFlowRate', () => {
  it('should return valid for values within [1, 8]', () => {
    expect(validateFlowRate(1)).toEqual({ valid: true });
    expect(validateFlowRate(4.5)).toEqual({ valid: true });
    expect(validateFlowRate(8)).toEqual({ valid: true });
  });

  it('should return valid at exact boundaries', () => {
    expect(validateFlowRate(1)).toEqual({ valid: true });
    expect(validateFlowRate(8)).toEqual({ valid: true });
  });

  it('should return invalid with message for values below 1', () => {
    const result = validateFlowRate(0.5);
    expect(result.valid).toBe(false);
    expect(result.message).toBeDefined();
  });

  it('should return invalid with message for values above 8', () => {
    const result = validateFlowRate(9);
    expect(result.valid).toBe(false);
    expect(result.message).toBeDefined();
  });

  it('should return invalid for zero', () => {
    const result = validateFlowRate(0);
    expect(result.valid).toBe(false);
  });

  it('should return invalid for negative values', () => {
    const result = validateFlowRate(-1);
    expect(result.valid).toBe(false);
  });
});
