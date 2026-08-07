import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { importConfig, validateConfig } from '../../js/io.js';

describe('validateConfig', () => {
  it('returns valid for a correct minimal config', () => {
    const config = {
      version: 1,
      dropFactor: 20,
      pots: [
        {
          id: 'pot-1',
          name: 'Geranio',
          drippers: [
            { id: 'd-1', flowRate: 2.5, unit: 'l/min' }
          ]
        }
      ]
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid when flowRate is null', () => {
    const config = {
      version: 1,
      dropFactor: 20,
      pots: [
        {
          id: 'pot-1',
          name: 'Vaso 1',
          drippers: [
            { id: 'd-1', flowRate: null, unit: 'l/h' }
          ]
        }
      ]
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it('rejects non-object input', () => {
    expect(validateConfig(null).valid).toBe(false);
    expect(validateConfig('string').valid).toBe(false);
    expect(validateConfig(42).valid).toBe(false);
    expect(validateConfig([]).valid).toBe(false);
  });

  it('rejects missing version field', () => {
    const config = { dropFactor: 20, pots: [] };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('version'))).toBe(true);
  });

  it('rejects missing pots field', () => {
    const config = { version: 1, dropFactor: 20 };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('pots'))).toBe(true);
  });

  it('rejects missing dropFactor', () => {
    const config = { version: 1, pots: [] };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('dropFactor'))).toBe(true);
  });

  it('rejects dropFactor out of range', () => {
    const config = { version: 1, dropFactor: 0, pots: [] };
    expect(validateConfig(config).valid).toBe(false);

    const config2 = { version: 1, dropFactor: 101, pots: [] };
    expect(validateConfig(config2).valid).toBe(false);
  });

  it('accepts dropFactor at boundaries', () => {
    const config1 = { version: 1, dropFactor: 1, pots: [] };
    expect(validateConfig(config1).valid).toBe(true);

    const config2 = { version: 1, dropFactor: 100, pots: [] };
    expect(validateConfig(config2).valid).toBe(true);
  });

  it('rejects pot without id', () => {
    const config = {
      version: 1,
      dropFactor: 20,
      pots: [{ name: 'Test', drippers: [{ id: 'd-1', flowRate: 1, unit: 'l/min' }] }]
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('id'))).toBe(true);
  });

  it('rejects pot without name', () => {
    const config = {
      version: 1,
      dropFactor: 20,
      pots: [{ id: 'p-1', drippers: [{ id: 'd-1', flowRate: 1, unit: 'l/min' }] }]
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('name'))).toBe(true);
  });

  it('rejects pot without drippers array', () => {
    const config = {
      version: 1,
      dropFactor: 20,
      pots: [{ id: 'p-1', name: 'Test' }]
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('drippers'))).toBe(true);
  });

  it('rejects pot with empty drippers array', () => {
    const config = {
      version: 1,
      dropFactor: 20,
      pots: [{ id: 'p-1', name: 'Test', drippers: [] }]
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('gocciolatore'))).toBe(true);
  });

  it('rejects dripper without id', () => {
    const config = {
      version: 1,
      dropFactor: 20,
      pots: [{ id: 'p-1', name: 'Test', drippers: [{ flowRate: 2, unit: 'l/min' }] }]
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
  });

  it('rejects dripper with invalid unit', () => {
    const config = {
      version: 1,
      dropFactor: 20,
      pots: [{ id: 'p-1', name: 'Test', drippers: [{ id: 'd-1', flowRate: 2, unit: 'gallons' }] }]
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('unit'))).toBe(true);
  });

  it('rejects dripper with non-numeric flowRate (not null)', () => {
    const config = {
      version: 1,
      dropFactor: 20,
      pots: [{ id: 'p-1', name: 'Test', drippers: [{ id: 'd-1', flowRate: 'abc', unit: 'l/min' }] }]
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('flowRate'))).toBe(true);
  });

  it('accepts config with multiple pots and drippers', () => {
    const config = {
      version: 1,
      dropFactor: 20,
      pots: [
        {
          id: 'p-1',
          name: 'Geranio',
          drippers: [
            { id: 'd-1', flowRate: 2.5, unit: 'l/min' },
            { id: 'd-2', flowRate: 120, unit: 'l/h' }
          ]
        },
        {
          id: 'p-2',
          name: 'Basilico',
          drippers: [
            { id: 'd-3', flowRate: null, unit: 'gocce/min' }
          ]
        }
      ]
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it('accepts empty pots array', () => {
    const config = { version: 1, dropFactor: 20, pots: [] };
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });
});

describe('importConfig', () => {
  // Helper: create a mock file-like object with .text() method
  function createMockFile(content) {
    return {
      text: () => Promise.resolve(content)
    };
  }

  it('returns success for a valid JSON file', async () => {
    const validState = {
      version: 1,
      dropFactor: 20,
      pots: [
        {
          id: 'p-1',
          name: 'Vaso 1',
          drippers: [{ id: 'd-1', flowRate: 3, unit: 'l/min' }]
        }
      ]
    };
    const file = createMockFile(JSON.stringify(validState));

    const result = await importConfig(file);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(validState);
  });

  it('returns error for invalid JSON', async () => {
    const file = createMockFile('not valid json{{{');

    const result = await importConfig(file);
    expect(result.success).toBe(false);
    expect(result.error).toContain('JSON valido');
  });

  it('returns error for valid JSON with invalid schema', async () => {
    const file = createMockFile(JSON.stringify({ foo: 'bar' }));

    const result = await importConfig(file);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns error when file reading fails', async () => {
    const file = {
      text: () => Promise.reject(new Error('read error'))
    };

    const result = await importConfig(file);
    expect(result.success).toBe(false);
    expect(result.error).toContain('lettura del file');
  });

  it('returns all validation errors joined', async () => {
    const file = createMockFile(JSON.stringify({ version: 'x', pots: 'not-array' }));

    const result = await importConfig(file);
    expect(result.success).toBe(false);
    // Multiple errors should be joined with '; '
    expect(result.error).toContain(';');
  });
});

describe('exportConfig', () => {
  let originalDocument;
  let originalURL;

  beforeEach(() => {
    // Save originals
    originalDocument = global.document;
    originalURL = global.URL;

    // Mock document
    const mockAnchor = { href: '', download: '', click: vi.fn() };
    global.document = {
      createElement: vi.fn(() => mockAnchor),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      }
    };

    // Mock URL
    global.URL = {
      createObjectURL: vi.fn(() => 'blob:http://localhost/fake-url'),
      revokeObjectURL: vi.fn()
    };
  });

  afterEach(() => {
    global.document = originalDocument;
    global.URL = originalURL;
    vi.restoreAllMocks();
  });

  it('creates a Blob with correct JSON content and version', async () => {
    // Re-import the module to pick up our mocked globals
    const { exportConfig: exportFn } = await import('../../js/io.js');
    const state = {
      dropFactor: 20,
      pots: [{ id: 'p-1', name: 'Test', drippers: [{ id: 'd-1', flowRate: 2, unit: 'l/min' }] }]
    };

    exportFn(state);

    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = global.URL.createObjectURL.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe('application/json');

    // Check that blob content has version field
    const text = await blobArg.text();
    const parsed = JSON.parse(text);
    expect(parsed.version).toBe(1);
    expect(parsed.dropFactor).toBe(20);
    expect(parsed.pots).toHaveLength(1);
  });

  it('triggers download and cleans up the object URL', async () => {
    const { exportConfig: exportFn } = await import('../../js/io.js');
    const state = { dropFactor: 20, pots: [] };

    exportFn(state);

    const mockAnchor = global.document.createElement.mock.results[0].value;
    expect(mockAnchor.click).toHaveBeenCalledTimes(1);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/fake-url');
    expect(global.document.body.appendChild).toHaveBeenCalled();
    expect(global.document.body.removeChild).toHaveBeenCalled();
  });

  it('uses correct filename format irrigazione-config-YYYY-MM-DD.json', async () => {
    const { exportConfig: exportFn } = await import('../../js/io.js');
    const state = { dropFactor: 20, pots: [] };

    exportFn(state);

    const mockAnchor = global.document.createElement.mock.results[0].value;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    expect(mockAnchor.download).toBe(`irrigazione-config-${yyyy}-${mm}-${dd}.json`);
  });
});
