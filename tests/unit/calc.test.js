import { describe, it, expect } from 'vitest';
import {
  toLitersPerMinute,
  fromLitersPerMinute,
  calculateVerification,
  calculateCalibration,
  calculateWeightedCalibration,
  suggestAlternativeTime,
  validateFlowRate,
  toLitersPerHour,
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

  it('should export toLitersPerHour as a function', () => {
    expect(typeof toLitersPerHour).toBe('function');
  });
});

describe('toLitersPerHour', () => {
  it('should convert l/min to l/h by multiplying by 60', () => {
    expect(toLitersPerHour(1)).toBe(60);
    expect(toLitersPerHour(0.5)).toBe(30);
    expect(toLitersPerHour(2)).toBe(120);
  });
});

describe('suggestAlternativeTime', () => {
  it('should suggest longer time when flow is below minimum (bound=min)', () => {
    // 10 liters, 2 drippers, boundary = 1 l/h = 1/60 l/min
    // time = 10 / (2 * 1/60) = 10 * 60 / 2 = 300 → capped at 60
    expect(suggestAlternativeTime(10, 2, 'min')).toBe(60);
  });

  it('should suggest shorter time when flow exceeds maximum (bound=max)', () => {
    // 10 liters, 2 drippers, boundary = 8 l/h = 8/60 l/min
    // time = 10 / (2 * 8/60) = 10 * 60 / 16 = 37.5 → rounded to 38
    expect(suggestAlternativeTime(10, 2, 'max')).toBe(38);
  });

  it('should round result to nearest whole minute (slider step)', () => {
    // 3 liters, 1 dripper, bound=max → time = 3 / (1 * 8/60) = 3 * 60/8 = 22.5 → 23
    expect(suggestAlternativeTime(3, 1, 'max')).toBe(23);
    // 7 liters, 1 dripper, bound=max → time = 7 / (8/60) = 7 * 60/8 = 52.5 → 53
    expect(suggestAlternativeTime(7, 1, 'max')).toBe(53);
  });

  it('should handle single dripper correctly', () => {
    // 4 liters, 1 dripper, bound=min → time = 4 / (1/60) = 240 → capped at 60
    expect(suggestAlternativeTime(4, 1, 'min')).toBe(60);
    // 4 liters, 1 dripper, bound=max → time = 4 / (8/60) = 4 * 60/8 = 30
    expect(suggestAlternativeTime(4, 1, 'max')).toBe(30);
  });

  it('should handle multiple drippers', () => {
    // 24 liters, 3 drippers, bound=max → time = 24 / (3 * 8/60) = 24 * 60 / 24 = 60
    expect(suggestAlternativeTime(24, 3, 'max')).toBe(60);
    // 24 liters, 3 drippers, bound=min → time = 24 / (3 * 1/60) = 24 * 60 / 3 = 480 → capped at 60
    expect(suggestAlternativeTime(24, 3, 'min')).toBe(60);
  });

  it('should cap at 60 minutes (slider max)', () => {
    // Large volume that would require > 60 min
    expect(suggestAlternativeTime(100, 1, 'max')).toBe(60);
  });
});

describe('validateFlowRate', () => {
  it('should return valid for values within [1, 8] l/h', () => {
    expect(validateFlowRate(1)).toEqual({ valid: true });
    expect(validateFlowRate(4.5)).toEqual({ valid: true });
    expect(validateFlowRate(8)).toEqual({ valid: true });
  });

  it('should return valid at exact boundaries', () => {
    expect(validateFlowRate(1)).toEqual({ valid: true });
    expect(validateFlowRate(8)).toEqual({ valid: true });
  });

  it('should return invalid with message for values below 1 l/h', () => {
    const result = validateFlowRate(0.5);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('l/h');
  });

  it('should return invalid with message for values above 8 l/h', () => {
    const result = validateFlowRate(9);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('l/h');
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
