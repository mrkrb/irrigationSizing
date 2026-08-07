/**
 * Import/Export — handles JSON file operations
 * for configuration backup and sharing.
 */

const VALID_UNITS = ['l/min', 'l/h', 'gocce/min'];

/**
 * Exports current configuration as a downloadable JSON file.
 * @param {object} state - Current app state
 * @returns {void} - Triggers file download
 */
export function exportConfig(state) {
  const exportData = { ...state, version: 1 };
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const filename = `irrigazione-config-${yyyy}-${mm}-${dd}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Reads and validates an imported JSON file.
 * @param {File} file - Selected file from input
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function importConfig(file) {
  try {
    const text = await file.text();
    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return { success: false, error: 'Il file non contiene JSON valido' };
    }

    const validation = validateConfig(parsed);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join('; ') };
    }

    return { success: true, data: parsed };
  } catch (e) {
    return { success: false, error: 'Errore durante la lettura del file' };
  }
}

/**
 * Validates a parsed config object against the expected schema.
 * @param {object} obj - Parsed JSON object
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateConfig(obj) {
  const errors = [];

  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    errors.push('Il file non contiene un oggetto di configurazione valido');
    return { valid: false, errors };
  }

  if (typeof obj.version !== 'number') {
    errors.push('Campo "version" mancante o non numerico');
  }

  if (!Array.isArray(obj.pots)) {
    errors.push('Campo "pots" mancante o non è un array');
  }

  if (typeof obj.dropFactor !== 'number') {
    errors.push('Campo "dropFactor" mancante o non numerico');
  } else if (obj.dropFactor < 1 || obj.dropFactor > 100) {
    errors.push('Il valore di "dropFactor" deve essere compreso tra 1 e 100');
  }

  // If pots is not an array, we can't validate further
  if (!Array.isArray(obj.pots)) {
    return { valid: false, errors };
  }

  for (let i = 0; i < obj.pots.length; i++) {
    const pot = obj.pots[i];
    const prefix = `Vaso ${i + 1}`;

    if (pot === null || typeof pot !== 'object' || Array.isArray(pot)) {
      errors.push(`${prefix}: non è un oggetto valido`);
      continue;
    }

    if (typeof pot.id !== 'string' || pot.id.length === 0) {
      errors.push(`${prefix}: campo "id" mancante o non valido`);
    }

    if (typeof pot.name !== 'string' || pot.name.length === 0) {
      errors.push(`${prefix}: campo "name" mancante o non valido`);
    }

    if (!Array.isArray(pot.drippers)) {
      errors.push(`${prefix}: campo "drippers" mancante o non è un array`);
      continue;
    }

    if (pot.drippers.length === 0) {
      errors.push(`${prefix}: deve avere almeno un gocciolatore`);
    }

    for (let j = 0; j < pot.drippers.length; j++) {
      const dripper = pot.drippers[j];
      const dPrefix = `${prefix}, gocciolatore ${j + 1}`;

      if (dripper === null || typeof dripper !== 'object' || Array.isArray(dripper)) {
        errors.push(`${dPrefix}: non è un oggetto valido`);
        continue;
      }

      if (typeof dripper.id !== 'string' || dripper.id.length === 0) {
        errors.push(`${dPrefix}: campo "id" mancante o non valido`);
      }

      if (dripper.flowRate !== null && typeof dripper.flowRate !== 'number') {
        errors.push(`${dPrefix}: campo "flowRate" deve essere un numero o null`);
      }

      if (!VALID_UNITS.includes(dripper.unit)) {
        errors.push(`${dPrefix}: campo "unit" deve essere uno tra: ${VALID_UNITS.join(', ')}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
