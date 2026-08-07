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
