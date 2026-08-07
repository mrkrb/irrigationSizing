import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveState, loadState, resetState, isStorageAvailable } from '../../js/storage.js';

// Mock localStorage for Node.js test environment
function createMockStorage() {
  let store = {};
  return {
    getItem: vi.fn((key) => (key in store ? store[key] : null)),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get _store() { return store; },
  };
}

describe('storage.js', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = createMockStorage();
    global.localStorage = mockStorage;
  });

  describe('isStorageAvailable', () => {
    it('should return true when localStorage is functional', () => {
      expect(isStorageAvailable()).toBe(true);
    });

    it('should return false when localStorage throws on setItem', () => {
      mockStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      expect(isStorageAvailable()).toBe(false);
    });

    it('should return false when localStorage is undefined', () => {
      delete global.localStorage;
      // isStorageAvailable references localStorage which would throw ReferenceError
      // We simulate by setting it to something that throws
      global.localStorage = {
        setItem: () => { throw new Error('not available'); },
        getItem: () => { throw new Error('not available'); },
        removeItem: () => { throw new Error('not available'); },
      };
      expect(isStorageAvailable()).toBe(false);
    });
  });

  describe('saveState', () => {
    it('should save a valid state to localStorage', () => {
      const state = {
        pots: [],
        dropFactor: 20,
        mode: 'verifica',
        timeMinutes: 15,
        theme: 'light',
        desiredLiters: {},
      };

      const result = saveState(state);

      expect(result).toEqual({ success: true });
      const stored = JSON.parse(mockStorage._store['irrigationSizing_config']);
      expect(stored.version).toBe(1);
      expect(stored.pots).toEqual([]);
      expect(stored.dropFactor).toBe(20);
    });

    it('should include version field in saved data', () => {
      const state = { pots: [], dropFactor: 20, mode: 'verifica', timeMinutes: 0, theme: 'light', desiredLiters: {} };
      saveState(state);

      const stored = JSON.parse(mockStorage._store['irrigationSizing_config']);
      expect(stored.version).toBe(1);
    });

    it('should return failure when localStorage is unavailable', () => {
      mockStorage.setItem.mockImplementation(() => { throw new Error('QuotaExceededError'); });

      const state = { pots: [], dropFactor: 20, mode: 'verifica', timeMinutes: 0, theme: 'light', desiredLiters: {} };
      const result = saveState(state);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should preserve pot data with drippers', () => {
      const state = {
        pots: [
          {
            id: 'pot-1',
            name: 'Geranio',
            uniformFlow: true,
            uniformValue: 2.5,
            uniformUnit: 'l/min',
            nonUniformWeights: false,
            weights: [1, 1],
            drippers: [
              { id: 'd-1', flowRate: 2.5, unit: 'l/min' },
              { id: 'd-2', flowRate: 2.5, unit: 'l/min' },
            ],
          },
        ],
        dropFactor: 20,
        mode: 'verifica',
        timeMinutes: 10,
        theme: 'dark',
        desiredLiters: { 'pot-1': 5 },
      };

      saveState(state);
      const stored = JSON.parse(mockStorage._store['irrigationSizing_config']);

      expect(stored.pots[0].name).toBe('Geranio');
      expect(stored.pots[0].drippers).toHaveLength(2);
      expect(stored.desiredLiters['pot-1']).toBe(5);
    });
  });

  describe('loadState', () => {
    it('should load a previously saved valid state', () => {
      const state = {
        version: 1,
        pots: [{ id: 'pot-1', name: 'Rosa', drippers: [], uniformFlow: true, uniformValue: null, uniformUnit: 'l/min', nonUniformWeights: false, weights: [] }],
        dropFactor: 25,
        mode: 'taratura',
        timeMinutes: 30,
        theme: 'dark',
        desiredLiters: {},
      };
      mockStorage._store['irrigationSizing_config'] = JSON.stringify(state);

      const result = loadState();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(state);
    });

    it('should return failure when no data is stored', () => {
      const result = loadState();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return failure for invalid JSON', () => {
      mockStorage._store['irrigationSizing_config'] = '{not valid json!!!';

      const result = loadState();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return failure when version is missing', () => {
      mockStorage._store['irrigationSizing_config'] = JSON.stringify({
        pots: [],
        dropFactor: 20,
      });

      const result = loadState();

      expect(result.success).toBe(false);
      expect(result.error).toContain('versione');
    });

    it('should return failure when pots is not an array', () => {
      mockStorage._store['irrigationSizing_config'] = JSON.stringify({
        version: 1,
        pots: 'not an array',
        dropFactor: 20,
      });

      const result = loadState();

      expect(result.success).toBe(false);
      expect(result.error).toContain('vasi');
    });

    it('should return failure when dropFactor is not a number', () => {
      mockStorage._store['irrigationSizing_config'] = JSON.stringify({
        version: 1,
        pots: [],
        dropFactor: 'twenty',
      });

      const result = loadState();

      expect(result.success).toBe(false);
      expect(result.error).toContain('fattore');
    });

    it('should handle empty string in storage gracefully', () => {
      mockStorage._store['irrigationSizing_config'] = '';

      const result = loadState();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle null stored value gracefully', () => {
      mockStorage._store['irrigationSizing_config'] = 'null';

      const result = loadState();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should not throw for any corrupt data', () => {
      const corruptValues = [
        '[]',
        '123',
        '"string"',
        'true',
        'undefined',
        '{{{',
        '<html>',
      ];

      for (const value of corruptValues) {
        mockStorage._store['irrigationSizing_config'] = value;
        expect(() => loadState()).not.toThrow();
        const result = loadState();
        expect(result.success).toBe(false);
      }
    });
  });

  describe('resetState', () => {
    it('should remove the storage key', () => {
      mockStorage._store['irrigationSizing_config'] = JSON.stringify({ version: 1, pots: [], dropFactor: 20 });

      resetState();

      expect(mockStorage._store['irrigationSizing_config']).toBeUndefined();
    });

    it('should not throw if nothing is stored', () => {
      expect(() => resetState()).not.toThrow();
    });
  });
});
