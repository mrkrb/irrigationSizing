/**
 * App Controller — orchestrates user interactions, delegates to
 * calculation and storage modules, manages application state.
 */

import { toLitersPerMinute, fromLitersPerMinute, calculateVerification, calculateCalibration, calculateWeightedCalibration, suggestAlternativeTime, validateFlowRate } from './calc.js';
import { saveState, loadState, resetState, isStorageAvailable } from './storage.js';
import { exportConfig, importConfig } from './io.js';

// ─── Application State ───────────────────────────────────────────────────────

let state = {
  pots: [],
  dropFactor: 20,
  mode: 'verifica',
  timeMinutes: 0,
  theme: 'light',
  desiredLiters: {}
};

let storageAvailable = true;
let saveTimer = null;

// ─── Toast Notification ──────────────────────────────────────────────────────

/**
 * Shows a toast notification with the given message and type.
 * @param {string} message - Text to display
 * @param {'info'|'error'|'success'} type - Toast type for styling
 */
export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger visibility after a microtask for CSS transition
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  // Remove after 4 seconds
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 4000);
}

// ─── Debounced Save ──────────────────────────────────────────────────────────

/**
 * Saves the current state to localStorage after a 1000ms debounce.
 */
export function debouncedSave() {
  if (!storageAvailable) return;
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveState(state);
    saveTimer = null;
  }, 1000);
}

// ─── Render ──────────────────────────────────────────────────────────────────

/**
 * Renders the pot list and calculation results based on current state and mode.
 */
export function render() {
  const potList = document.getElementById('pot-list');
  if (!potList) return;

  const addBtn = potList.querySelector('#add-pot');

  // Clear existing pot cards (keep the add button)
  const existingCards = potList.querySelectorAll('.pot-card');
  existingCards.forEach(card => card.remove());

  if (state.pots.length === 0) {
    // Show empty state message
    let emptyMsg = potList.querySelector('.empty-state');
    if (!emptyMsg) {
      emptyMsg = document.createElement('p');
      emptyMsg.className = 'empty-state';
      emptyMsg.textContent = 'Nessun vaso configurato. Aggiungi il primo vaso per iniziare.';
      potList.insertBefore(emptyMsg, addBtn);
    }
  } else {
    // Remove empty state message if present
    const emptyMsg = potList.querySelector('.empty-state');
    if (emptyMsg) emptyMsg.remove();

    // Render each pot card
    state.pots.forEach(pot => {
      const card = renderPotCard(pot);
      potList.insertBefore(card, addBtn);
    });
  }

  // Update totals
  updateTotals();

  // Update time slider display
  const timeValue = document.getElementById('time-value');
  if (timeValue) {
    timeValue.textContent = state.timeMinutes;
  }
  const timeSlider = document.getElementById('time-slider');
  if (timeSlider) {
    timeSlider.value = state.timeMinutes;
  }

  // Update drop factor input
  const dropFactorInput = document.getElementById('drop-factor');
  if (dropFactorInput) {
    dropFactorInput.value = state.dropFactor;
  }

  // Update mode tabs
  document.querySelectorAll('.mode-tab').forEach(tab => {
    const isActive = tab.dataset.mode === state.mode;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-pressed', String(isActive));
  });
}

/**
 * Renders a single pot card element.
 * @param {object} pot - Pot data object
 * @returns {HTMLElement}
 */
function renderPotCard(pot) {
  const card = document.createElement('article');
  card.className = 'pot-card';
  card.dataset.potId = pot.id;

  const header = document.createElement('div');
  header.className = 'pot-card__header';

  const nameEl = document.createElement('h3');
  nameEl.className = 'pot-card__name';
  nameEl.textContent = pot.name;

  const actions = document.createElement('div');
  actions.className = 'pot-card__actions';

  const dupBtn = document.createElement('button');
  dupBtn.type = 'button';
  dupBtn.className = 'btn-duplicate';
  dupBtn.dataset.action = 'duplicate-pot';
  dupBtn.dataset.potId = pot.id;
  dupBtn.textContent = 'Duplica';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-remove';
  removeBtn.dataset.action = 'remove-pot';
  removeBtn.dataset.potId = pot.id;
  removeBtn.textContent = 'Rimuovi';

  actions.appendChild(dupBtn);
  actions.appendChild(removeBtn);
  header.appendChild(nameEl);
  header.appendChild(actions);
  card.appendChild(header);

  // Drippers section
  const drippersSection = document.createElement('div');
  drippersSection.className = 'pot-card__drippers';

  pot.drippers.forEach((dripper, index) => {
    const dripperRow = document.createElement('div');
    dripperRow.className = 'dripper-row';
    dripperRow.dataset.dripperId = dripper.id;

    const label = document.createElement('label');
    label.textContent = `Gocciolatore ${index + 1}:`;

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'dripper-flow';
    input.dataset.potId = pot.id;
    input.dataset.dripperId = dripper.id;
    input.dataset.field = 'flowRate';
    input.value = dripper.flowRate != null ? dripper.flowRate : '';
    input.placeholder = 'Portata';
    input.min = '0';
    input.step = '0.01';

    const unitSelect = document.createElement('select');
    unitSelect.className = 'dripper-unit';
    unitSelect.dataset.potId = pot.id;
    unitSelect.dataset.dripperId = dripper.id;
    unitSelect.dataset.field = 'unit';

    const units = ['l/min', 'l/h', 'gocce/min'];
    units.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = u;
      if (dripper.unit === u) opt.selected = true;
      unitSelect.appendChild(opt);
    });

    dripperRow.appendChild(label);
    dripperRow.appendChild(input);
    dripperRow.appendChild(unitSelect);
    drippersSection.appendChild(dripperRow);
  });

  card.appendChild(drippersSection);

  // Result display
  const resultEl = document.createElement('div');
  resultEl.className = 'pot-card__result';

  if (state.mode === 'verifica') {
    if (state.timeMinutes > 0) {
      const liters = calculateVerification(pot.drippers, state.timeMinutes, state.dropFactor);
      resultEl.textContent = `Acqua erogata: ${liters.toFixed(2)} l`;
    } else {
      resultEl.textContent = 'Impostare tempo > 0 per il calcolo';
      resultEl.classList.add('pot-card__result--warning');
    }
  } else {
    // Taratura mode
    const desiredLiters = state.desiredLiters[pot.id] || 0;
    if (state.timeMinutes > 0 && desiredLiters > 0 && pot.drippers.length > 0) {
      const requiredFlow = calculateCalibration(desiredLiters, state.timeMinutes, pot.drippers.length);
      resultEl.textContent = `Portata necessaria: ${requiredFlow.toFixed(2)} l/min per gocciolatore`;
    } else {
      resultEl.textContent = state.timeMinutes === 0 ? 'Impostare tempo > 0 per il calcolo' : '';
    }
  }

  card.appendChild(resultEl);

  return card;
}

/**
 * Updates the total liters display.
 */
function updateTotals() {
  const totalEl = document.getElementById('total-liters');
  if (!totalEl) return;

  if (state.mode === 'verifica' && state.timeMinutes > 0) {
    const total = state.pots.reduce((sum, pot) => {
      return sum + calculateVerification(pot.drippers, state.timeMinutes, state.dropFactor);
    }, 0);
    totalEl.textContent = total.toFixed(2);
  } else {
    totalEl.textContent = '0.00';
  }
}

// ─── Theme Detection ─────────────────────────────────────────────────────────

/**
 * Detects and applies the theme preference.
 * Priority: localStorage saved theme > system preference > 'light'
 */
function detectAndApplyTheme() {
  let theme = 'light';

  // Check localStorage for saved theme
  if (storageAvailable) {
    try {
      const savedTheme = localStorage.getItem('irrigationSizing_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        theme = savedTheme;
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        theme = 'dark';
      }
    } catch (e) {
      // Fall through to system preference check
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        theme = 'dark';
      }
    }
  } else {
    // No storage, use system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark';
    }
  }

  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
}

// ─── Event Delegation ────────────────────────────────────────────────────────

/**
 * Sets up event delegation on the main element and header.
 */
function setupEventDelegation() {
  const main = document.querySelector('main');
  const header = document.querySelector('header');

  if (main) {
    // Click events
    main.addEventListener('click', handleMainClick);

    // Change/input events
    main.addEventListener('input', handleMainInput);
    main.addEventListener('change', handleMainChange);
  }

  if (header) {
    header.addEventListener('click', handleHeaderClick);
  }

  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', handleThemeToggle);
  }
}

function handleMainClick(e) {
  const target = e.target;

  // Add pot button
  if (target.id === 'add-pot' || target.closest('#add-pot')) {
    handleAddPot();
    return;
  }

  // Remove pot
  if (target.dataset.action === 'remove-pot') {
    handleRemovePot(target.dataset.potId);
    return;
  }

  // Duplicate pot
  if (target.dataset.action === 'duplicate-pot') {
    handleDuplicatePot(target.dataset.potId);
    return;
  }

  // Export button
  if (target.id === 'export-btn' || target.closest('#export-btn')) {
    handleExport();
    return;
  }

  // Reset button
  if (target.id === 'reset-btn' || target.closest('#reset-btn')) {
    handleReset();
    return;
  }
}

function handleMainInput(e) {
  const target = e.target;

  // Time slider
  if (target.id === 'time-slider') {
    handleTimeChange(parseFloat(target.value));
    return;
  }

  // Dripper flow rate
  if (target.classList.contains('dripper-flow')) {
    const potId = target.dataset.potId;
    const dripperId = target.dataset.dripperId;
    const value = target.value === '' ? null : parseFloat(target.value);
    handleDripperChange(potId, dripperId, 'flowRate', value);
    return;
  }

  // Drop factor
  if (target.id === 'drop-factor') {
    const val = parseInt(target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 100) {
      state.dropFactor = val;
      debouncedSave();
      render();
    }
    return;
  }
}

function handleMainChange(e) {
  const target = e.target;

  // Dripper unit select
  if (target.classList.contains('dripper-unit')) {
    const potId = target.dataset.potId;
    const dripperId = target.dataset.dripperId;
    handleDripperChange(potId, dripperId, 'unit', target.value);
    return;
  }

  // Import file
  if (target.id === 'import-file') {
    if (target.files && target.files[0]) {
      handleImport(target.files[0]);
    }
    return;
  }
}

function handleHeaderClick(e) {
  const target = e.target;

  // Mode tabs
  if (target.classList.contains('mode-tab')) {
    handleModeSwitch(target.dataset.mode);
    return;
  }
}

// ─── Event Handlers ──────────────────────────────────────────────────────────

function handleAddPot() {
  const nextId = `pot-${Date.now()}`;
  const name = generateDefaultName();
  const newPot = {
    id: nextId,
    name: name,
    uniformFlow: true,
    uniformValue: null,
    uniformUnit: 'l/min',
    nonUniformWeights: false,
    weights: [1],
    drippers: [{ id: `d-${Date.now()}`, flowRate: null, unit: 'l/min' }]
  };
  state.pots.push(newPot);
  debouncedSave();
  render();
}

function handleRemovePot(potId) {
  if (!confirm('Sei sicuro di voler rimuovere questo vaso?')) return;
  state.pots = state.pots.filter(p => p.id !== potId);
  delete state.desiredLiters[potId];
  debouncedSave();
  render();
}

function handleDuplicatePot(potId) {
  const original = state.pots.find(p => p.id === potId);
  if (!original) return;

  const newId = `pot-${Date.now()}`;
  const dupName = generateDuplicateName(original.name);
  const duplicate = JSON.parse(JSON.stringify(original));
  duplicate.id = newId;
  duplicate.name = dupName;
  // Generate new dripper IDs
  duplicate.drippers = duplicate.drippers.map((d, i) => ({
    ...d,
    id: `d-${Date.now()}-${i}`
  }));

  state.pots.push(duplicate);
  debouncedSave();
  render();
}

function handleDripperChange(potId, dripperId, field, value) {
  const pot = state.pots.find(p => p.id === potId);
  if (!pot) return;
  const dripper = pot.drippers.find(d => d.id === dripperId);
  if (!dripper) return;

  dripper[field] = value;
  debouncedSave();
  render();
}

function handleModeSwitch(mode) {
  if (mode === state.mode) return;
  state.mode = mode;
  debouncedSave();
  render();
}

function handleTimeChange(value) {
  state.timeMinutes = value;
  const timeValue = document.getElementById('time-value');
  if (timeValue) {
    timeValue.textContent = value;
  }
  debouncedSave();
  // Update results directly without full re-render for responsiveness
  updateTotals();
  document.querySelectorAll('.pot-card__result').forEach(el => {
    const card = el.closest('.pot-card');
    if (!card) return;
    const potId = card.dataset.potId;
    const pot = state.pots.find(p => p.id === potId);
    if (!pot) return;

    if (state.mode === 'verifica') {
      if (state.timeMinutes > 0) {
        const liters = calculateVerification(pot.drippers, state.timeMinutes, state.dropFactor);
        el.textContent = `Acqua erogata: ${liters.toFixed(2)} l`;
        el.classList.remove('pot-card__result--warning');
      } else {
        el.textContent = 'Impostare tempo > 0 per il calcolo';
        el.classList.add('pot-card__result--warning');
      }
    }
  });
}

function handleThemeToggle() {
  const newTheme = state.theme === 'dark' ? 'light' : 'dark';
  state.theme = newTheme;
  document.documentElement.setAttribute('data-theme', newTheme);
  if (storageAvailable) {
    try {
      localStorage.setItem('irrigationSizing_theme', newTheme);
    } catch (e) {
      // Silently ignore storage failure for theme
    }
  }
}

function handleExport() {
  exportConfig(state);
}

async function handleImport(file) {
  const result = await importConfig(file);
  if (result.success) {
    if (!confirm('Importare questa configurazione? La configurazione attuale verrà sovrascritta.')) return;
    const data = result.data;
    state.pots = data.pots || [];
    state.dropFactor = data.dropFactor || 20;
    state.mode = data.mode || 'verifica';
    state.timeMinutes = data.timeMinutes || 0;
    state.desiredLiters = data.desiredLiters || {};
    if (data.theme) state.theme = data.theme;
    debouncedSave();
    render();
    showToast('Configurazione importata con successo.', 'success');
  } else {
    showToast(`Errore importazione: ${result.error}`, 'error');
  }
}

function handleReset() {
  if (!confirm('Sei sicuro di voler resettare tutta la configurazione?')) return;
  resetState();
  state = {
    pots: [],
    dropFactor: 20,
    mode: 'verifica',
    timeMinutes: 0,
    theme: state.theme,
    desiredLiters: {}
  };
  render();
  showToast('Configurazione resettata.', 'info');
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Generates a default pot name "Vaso N" where N is smallest unused integer.
 */
function generateDefaultName() {
  const usedNumbers = state.pots
    .map(p => p.name)
    .filter(n => /^Vaso \d+$/.test(n))
    .map(n => parseInt(n.replace('Vaso ', ''), 10));

  let n = 1;
  while (usedNumbers.includes(n)) {
    n++;
  }
  return `Vaso ${n}`;
}

/**
 * Generates a duplicate name with incremental suffix.
 * @param {string} originalName
 * @returns {string}
 */
function generateDuplicateName(originalName) {
  const existingNames = state.pots.map(p => p.name);
  let suffix = 2;
  let candidate = `${originalName} (${suffix})`;
  while (existingNames.includes(candidate)) {
    suffix++;
    candidate = `${originalName} (${suffix})`;
  }
  return candidate;
}

// ─── Initialization ──────────────────────────────────────────────────────────

/**
 * Initializes the application: loads state, sets up event listeners, renders UI.
 */
export function init() {
  // 1. Check localStorage availability
  storageAvailable = isStorageAvailable();
  if (!storageAvailable) {
    showToast('Archiviazione locale non disponibile. Le modifiche non saranno salvate.', 'info');
  }

  // 2. Try to load saved state
  if (storageAvailable) {
    const result = loadState();
    if (result.success && result.data) {
      // Successfully loaded — apply saved state
      state.pots = result.data.pots || [];
      state.dropFactor = result.data.dropFactor || 20;
      state.mode = result.data.mode || 'verifica';
      state.timeMinutes = result.data.timeMinutes || 0;
      state.desiredLiters = result.data.desiredLiters || {};
      if (result.data.theme) {
        state.theme = result.data.theme;
      }
    } else if (result.error && result.error !== 'Nessun dato trovato') {
      // Data existed but was corrupt
      showToast('Impossibile caricare la configurazione salvata. Avvio con stato iniziale.', 'error');
    }
    // If error is 'Nessun dato trovato', it's just first access — no notification needed
  }

  // 3. Detect and apply theme
  detectAndApplyTheme();

  // 4. Set up event delegation
  setupEventDelegation();

  // 5. Render initial UI
  render();
}

// Auto-initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', init);
