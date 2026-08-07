/**
 * Storage Manager — handles all localStorage interactions
 * with validation and error handling.
 */

const STORAGE_KEY = 'irrigationSizing_config';
const CURRENT_VERSION = 1;

/**
 * Saves the full application state to localStorage.
 * @param {object} state - Complete application state
 * @returns {{success: boolean, error?: string}}
 */
export function saveState(state) {
  if (!isStorageAvailable()) {
    return { success: false, error: 'localStorage non disponibile' };
  }

  try {
    const dataToStore = { ...state, version: CURRENT_VERSION };
    const json = JSON.stringify(dataToStore);
    localStorage.setItem(STORAGE_KEY, json);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || 'Errore durante il salvataggio' };
  }
}

/**
 * Loads application state from localStorage.
 * @returns {{success: boolean, data?: object, error?: string}}
 */
export function loadState() {
  if (!isStorageAvailable()) {
    return { success: false, error: 'localStorage non disponibile' };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw === null) {
      return { success: false, error: 'Nessun dato trovato' };
    }

    const parsed = JSON.parse(raw);

    const validationError = validateStoredState(parsed);
    if (validationError) {
      return { success: false, error: validationError };
    }

    return { success: true, data: parsed };
  } catch (e) {
    return { success: false, error: e.message || 'Errore durante il caricamento' };
  }
}

/**
 * Resets localStorage to empty state.
 */
export function resetState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // Silently ignore — if storage isn't accessible, there's nothing to reset
  }
}

/**
 * Checks if localStorage is available and has quota.
 * @returns {boolean}
 */
export function isStorageAvailable() {
  const testKey = '__storage_test__';
  try {
    localStorage.setItem(testKey, 'test');
    const retrieved = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    return retrieved === 'test';
  } catch (e) {
    return false;
  }
}

/**
 * Validates the structure of a parsed state object.
 * @param {*} obj - Parsed object to validate
 * @returns {string|null} Error message if invalid, null if valid
 */
function validateStoredState(obj) {
  if (obj === null || typeof obj !== 'object') {
    return 'Dati non validi: formato non riconosciuto';
  }

  if (typeof obj.version !== 'number') {
    return 'Dati non validi: versione mancante o non numerica';
  }

  if (!Array.isArray(obj.pots)) {
    return 'Dati non validi: elenco vasi mancante o non valido';
  }

  if (typeof obj.dropFactor !== 'number') {
    return 'Dati non validi: fattore di conversione mancante o non numerico';
  }

  return null;
}
