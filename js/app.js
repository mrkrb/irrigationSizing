/**
 * App Controller — orchestrates user interactions, delegates to
 * calculation and storage modules, manages application state.
 */

import { toLitersPerMinute, fromLitersPerMinute, calculateVerification, calculateCalibration, calculateWeightedCalibration, suggestAlternativeTime, validateFlowRate, toLitersPerHour } from './calc.js';
import { saveState, loadState, resetState, isStorageAvailable } from './storage.js';
import { exportConfig, importConfig } from './io.js';
import { APP_VERSION } from './version.js';

// ─── Flow Display Helper ─────────────────────────────────────────────────────

/**
 * Formats a flow rate value for display, rounding to integer for gocce/min.
 * @param {number} valueLpm - Flow rate in l/min
 * @param {string} displayUnit - Target display unit
 * @param {number} dropFactor - Drops per ml
 * @returns {string} Formatted string
 */
function formatFlowForDisplay(valueLpm, displayUnit, dropFactor) {
  const converted = fromLitersPerMinute(valueLpm, displayUnit, dropFactor);
  if (displayUnit === 'gocce/min') {
    return Math.round(converted).toString();
  }
  return converted.toFixed(2);
}

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
let validationTimers = {}; // per-dripper debounce timers for flow rate validation

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

  // Remove the add-pot form if present (e.g. after confirm)
  const addPotForm = potList.querySelector('.add-pot-form');
  if (addPotForm) addPotForm.remove();

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
  updateTotalsVisibility();

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
 * Renders a single pot card element with collapsible support.
 * @param {object} pot - Pot data object
 * @returns {HTMLElement}
 */
function renderPotCard(pot) {
  const card = document.createElement('article');
  card.className = `pot-card${pot.collapsed ? ' collapsed' : ''}`;
  card.dataset.potId = pot.id;

  // Header (always visible, clickable to toggle)
  const header = document.createElement('div');
  header.className = 'pot-card__header';

  const chevron = document.createElement('span');
  chevron.className = 'pot-card__chevron';
  chevron.textContent = pot.collapsed ? '\u25B6' : '\u25BC';

  const nameEl = document.createElement('h3');
  nameEl.className = 'pot-card__name';
  nameEl.textContent = pot.name;

  const summary = document.createElement('span');
  summary.className = 'pot-card__summary';
  summary.innerHTML = getCollapsedSummaryHTML(pot);

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
  removeBtn.className = 'btn-remove remove-btn';
  removeBtn.dataset.action = 'remove-pot';
  removeBtn.dataset.potId = pot.id;
  removeBtn.textContent = 'Rimuovi';

  actions.appendChild(dupBtn);
  actions.appendChild(removeBtn);
  header.appendChild(chevron);
  header.appendChild(nameEl);
  header.appendChild(summary);
  header.appendChild(actions);
  card.appendChild(header);

  // Body (hidden when collapsed)
  const body = document.createElement('div');
  body.className = 'pot-card__body';

  // Uniform/differentiated toggle section
  const toggleSection = document.createElement('div');
  toggleSection.className = 'toggle-group';

  const uniformBtn = document.createElement('button');
  uniformBtn.type = 'button';
  uniformBtn.className = `toggle-btn${pot.uniformFlow ? ' active' : ''}`;
  uniformBtn.dataset.action = 'set-uniform';
  uniformBtn.dataset.potId = pot.id;
  uniformBtn.textContent = 'Stessa portata';

  const diffBtn = document.createElement('button');
  diffBtn.type = 'button';
  diffBtn.className = `toggle-btn${!pot.uniformFlow ? ' active' : ''}`;
  diffBtn.dataset.action = 'set-differentiated';
  diffBtn.dataset.potId = pot.id;
  diffBtn.textContent = 'Portate differenziate';

  toggleSection.appendChild(uniformBtn);
  toggleSection.appendChild(diffBtn);
  body.appendChild(toggleSection);

  // Drippers section
  const drippersSection = document.createElement('div');
  drippersSection.className = 'pot-card__drippers';

  if (pot.uniformFlow) {
    // Uniform mode: show a single flow rate input + unit selector
    const uniformRow = document.createElement('div');
    uniformRow.className = 'dripper-row dripper-row--uniform';

    const label = document.createElement('label');
    label.textContent = 'Portata per tutti:';

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'dripper-flow uniform-flow';
    input.dataset.potId = pot.id;
    input.dataset.field = 'uniformValue';
    input.value = pot.uniformValue != null ? pot.uniformValue : '';
    input.placeholder = 'Portata';
    input.min = '0';
    input.step = pot.uniformUnit === 'gocce/min' ? '1' : '0.01';

    const unitSelect = document.createElement('select');
    unitSelect.className = 'dripper-unit uniform-unit';
    unitSelect.dataset.potId = pot.id;
    unitSelect.dataset.field = 'uniformUnit';

    const units = ['l/min', 'l/h', 'gocce/min'];
    units.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = u;
      if (pot.uniformUnit === u) opt.selected = true;
      unitSelect.appendChild(opt);
    });

    uniformRow.appendChild(label);
    uniformRow.appendChild(input);
    uniformRow.appendChild(unitSelect);

    // Error message placeholder for uniform input
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.dataset.validationFor = `uniform-${pot.id}`;
    errorEl.style.display = 'none';

    drippersSection.appendChild(uniformRow);
    drippersSection.appendChild(errorEl);

    // Editable dripper count row in uniform mode
    const dripperCountRow = document.createElement('div');
    dripperCountRow.className = 'dripper-count-row';

    const countLabel = document.createElement('label');
    countLabel.textContent = 'Gocciolatori:';

    const countInput = document.createElement('input');
    countInput.type = 'number';
    countInput.className = 'dripper-count-input';
    countInput.dataset.potId = pot.id;
    countInput.min = '1';
    countInput.max = '20';
    countInput.step = '1';
    countInput.value = pot.drippers.length;

    dripperCountRow.appendChild(countLabel);
    dripperCountRow.appendChild(countInput);
    drippersSection.appendChild(dripperCountRow);
  } else {
    // Differentiated mode: show individual inputs per dripper
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
      input.step = dripper.unit === 'gocce/min' ? '1' : '0.01';

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

      const removeDripperBtn = document.createElement('button');
      removeDripperBtn.type = 'button';
      removeDripperBtn.className = 'btn-remove-dripper';
      removeDripperBtn.dataset.action = 'remove-dripper';
      removeDripperBtn.dataset.potId = pot.id;
      removeDripperBtn.dataset.dripperId = dripper.id;
      removeDripperBtn.textContent = 'Rimuovi';
      if (pot.drippers.length <= 1) {
        removeDripperBtn.disabled = true;
        removeDripperBtn.title = 'Un vaso deve contenere almeno 1 gocciolatore';
      }
      dripperRow.appendChild(removeDripperBtn);

      drippersSection.appendChild(dripperRow);

      // Error message placeholder per dripper
      const errorEl = document.createElement('div');
      errorEl.className = 'error-message';
      errorEl.dataset.validationFor = dripper.id;
      errorEl.style.display = 'none';
      drippersSection.appendChild(errorEl);
    });

    // Add dripper button (only if fewer than 20 drippers)
    if (pot.drippers.length < 20) {
      const addDripperBtn = document.createElement('button');
      addDripperBtn.type = 'button';
      addDripperBtn.className = 'btn-add-dripper';
      addDripperBtn.dataset.action = 'add-dripper';
      addDripperBtn.dataset.potId = pot.id;
      addDripperBtn.textContent = 'Aggiungi gocciolatore';
      drippersSection.appendChild(addDripperBtn);
    }
  }

  body.appendChild(drippersSection);

  // Calibration mode: desired liters input + non-uniform toggle + weight inputs
  if (state.mode === 'taratura') {
    const calibSection = document.createElement('div');
    calibSection.className = 'pot-card__calibration';

    // Desired liters input
    const desiredRow = document.createElement('div');
    desiredRow.className = 'desired-liters-row';

    const desiredLabel = document.createElement('label');
    desiredLabel.textContent = 'Litri desiderati:';

    const desiredInput = document.createElement('input');
    desiredInput.type = 'number';
    desiredInput.className = 'desired-liters';
    desiredInput.dataset.potId = pot.id;
    desiredInput.min = '0.01';
    desiredInput.max = '999.99';
    desiredInput.step = '0.01';
    desiredInput.placeholder = 'Litri';
    desiredInput.value = state.desiredLiters[pot.id] || '';

    desiredRow.appendChild(desiredLabel);
    desiredRow.appendChild(desiredInput);
    calibSection.appendChild(desiredRow);

    // Non-uniform weights toggle
    const toggleRow = document.createElement('div');
    toggleRow.className = 'nonuniform-toggle-row';

    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'nonuniform-label';

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.className = 'nonuniform-toggle';
    toggleInput.dataset.potId = pot.id;
    toggleInput.checked = !!pot.nonUniformWeights;

    const toggleText = document.createTextNode(' Ripartizione non uniforme');
    toggleLabel.appendChild(toggleInput);
    toggleLabel.appendChild(toggleText);
    toggleRow.appendChild(toggleLabel);
    calibSection.appendChild(toggleRow);

    // Weight inputs (shown when non-uniform is enabled)
    if (pot.nonUniformWeights) {
      const weightsSection = document.createElement('div');
      weightsSection.className = 'pot-card__weights';

      pot.drippers.forEach((dripper, index) => {
        const weightRow = document.createElement('div');
        weightRow.className = 'weight-row';

        const weightLabel = document.createElement('label');
        weightLabel.textContent = `Peso G${index + 1}:`;

        const weightInput = document.createElement('input');
        weightInput.type = 'number';
        weightInput.className = 'dripper-weight';
        weightInput.dataset.potId = pot.id;
        weightInput.dataset.dripperIndex = String(index);
        weightInput.min = '1';
        weightInput.max = '10';
        weightInput.step = '0.1';
        weightInput.placeholder = 'Peso';
        weightInput.value = (pot.weights && pot.weights[index] != null) ? pot.weights[index] : 1;

        weightRow.appendChild(weightLabel);
        weightRow.appendChild(weightInput);
        weightsSection.appendChild(weightRow);
      });

      calibSection.appendChild(weightsSection);
    }

    body.appendChild(calibSection);
  }

  // Result display (shown only when expanded)
  const resultEl = document.createElement('div');
  resultEl.className = 'pot-card__result';
  resultEl.innerHTML = getExpandedResultHTML(pot);

  body.appendChild(resultEl);
  card.appendChild(body);

  return card;
}

/**
 * Generates the collapsed summary HTML for a pot card header.
 * @param {object} pot
 * @returns {string} HTML string
 */
function getCollapsedSummaryHTML(pot) {
  if (state.mode === 'verifica') {
    if (state.timeMinutes > 0) {
      const liters = calculateVerification(pot.drippers, state.timeMinutes, state.dropFactor);
      return `${liters.toFixed(2)} l`;
    }
    return '\u2014';
  }
  // Taratura mode
  const desiredLiters = state.desiredLiters[pot.id] || 0;
  if (state.timeMinutes === 0 || desiredLiters <= 0 || pot.drippers.length === 0) return '\u2014';
  if (pot.nonUniformWeights || !pot.uniformFlow) return '...';
  const requiredFlow = calculateCalibration(desiredLiters, state.timeMinutes, pot.drippers.length);
  const displayUnit = pot.resultDisplayUnit || pot.uniformUnit || 'l/h';
  const displayValue = formatFlowForDisplay(requiredFlow, displayUnit, state.dropFactor);
  return `${displayValue} ${buildInlineUnitSelectHTML(displayUnit, pot.id, null)}`;
}

/**
 * Generates the expanded result HTML for a pot card.
 * @param {object} pot
 * @returns {string} HTML string
 */
function getExpandedResultHTML(pot) {
  if (state.mode === 'verifica') {
    if (state.timeMinutes > 0) {
      const liters = calculateVerification(pot.drippers, state.timeMinutes, state.dropFactor);
      return `Acqua erogata: ${liters.toFixed(2)} l`;
    }
    return 'Impostare tempo > 0 per il calcolo';
  }
  // Taratura mode
  const desiredLiters = state.desiredLiters[pot.id] || 0;
  if (state.timeMinutes === 0) return 'Impostare tempo > 0 per il calcolo';
  if (desiredLiters > 0 && pot.drippers.length > 0) {
    if (pot.nonUniformWeights) {
      const weightsValid = areWeightsValid(pot);
      if (!weightsValid) return 'Pesi non validi. Inserire valori tra 1 e 10.';
      const weights = pot.weights.slice(0, pot.drippers.length);
      const flowRates = calculateWeightedCalibration(desiredLiters, state.timeMinutes, weights);
      const flowTexts = flowRates.map((f, i) => {
        const dripper = pot.drippers[i];
        const displayUnit = (dripper && dripper.resultDisplayUnit) || (dripper && dripper.unit) || 'l/h';
        const displayVal = formatFlowForDisplay(f, displayUnit, state.dropFactor);
        return `G${i + 1}: ${displayVal} ${buildInlineUnitSelectHTML(displayUnit, pot.id, dripper.id)}`;
      });
      let html = `Portate: ${flowTexts.join(', ')}`;
      const anyOutOfRange = flowRates.some(f => !validateFlowRate(f * 60).valid);
      if (anyOutOfRange) {
        const avgFlow = flowRates.reduce((s, f) => s + f, 0) / flowRates.length;
        const bound = avgFlow * 60 < 1 ? 'min' : 'max';
        const suggestedTime = suggestAlternativeTime(desiredLiters, pot.drippers.length, bound);
        html += ` \u2014 Portata fuori range. Tempo suggerito: ${suggestedTime} min`;
      }
      return html;
    } else {
      const requiredFlow = calculateCalibration(desiredLiters, state.timeMinutes, pot.drippers.length);
      const displayUnit = pot.resultDisplayUnit || pot.uniformUnit || 'l/h';
      const displayValue = formatFlowForDisplay(requiredFlow, displayUnit, state.dropFactor);
      let html = `Portata necessaria: ${displayValue} ${buildInlineUnitSelectHTML(displayUnit, pot.id, null)} per gocciolatore`;
      const validation = validateFlowRate(requiredFlow * 60);
      if (!validation.valid) {
        const bound = requiredFlow * 60 < 1 ? 'min' : 'max';
        const suggestedTime = suggestAlternativeTime(desiredLiters, pot.drippers.length, bound);
        html += ` \u2014 Portata fuori range. Tempo suggerito: ${suggestedTime} min`;
      }
      return html;
    }
  }
  return '';
}

/**
 * Builds an inline <select> HTML string for the unit selector.
 * @param {string} currentUnit
 * @param {string} potId
 * @param {string|null} dripperId
 * @returns {string}
 */
function buildInlineUnitSelectHTML(currentUnit, potId, dripperId) {
  const units = ['l/h', 'l/min', 'gocce/min'];
  const dripperAttr = dripperId ? ` data-dripper-id="${dripperId}"` : '';
  const options = units.map(u =>
    `<option value="${u}"${u === currentUnit ? ' selected' : ''}>${u}</option>`
  ).join('');
  return `<select class="inline-unit-select" data-pot-id="${potId}"${dripperAttr}>${options}</select>`;
}

/**
 * Checks if all weights for a pot are valid (between 1 and 10, numeric, positive).
 * @param {object} pot - Pot data object
 * @returns {boolean}
 */
function areWeightsValid(pot) {
  if (!pot.weights || pot.weights.length < pot.drippers.length) return false;
  const weights = pot.weights.slice(0, pot.drippers.length);
  return weights.every(w => typeof w === 'number' && !isNaN(w) && w >= 1 && w <= 10);
}

/**
 * Updates the total liters display.
 */
function updateTotals() {
  const totalEl = document.getElementById('total-liters');
  const labelEl = document.getElementById('totals-label');
  if (!totalEl) return;

  if (state.mode === 'verifica') {
    if (labelEl) labelEl.textContent = 'Totale acqua erogata';
    if (state.timeMinutes > 0) {
      const total = state.pots.reduce((sum, pot) => {
        return sum + calculateVerification(pot.drippers, state.timeMinutes, state.dropFactor);
      }, 0);
      totalEl.textContent = total.toFixed(2);
    } else {
      totalEl.textContent = '0.00';
    }
  } else {
    if (labelEl) labelEl.textContent = 'Totale acqua erogata';
    const total = state.pots.reduce((sum, pot) => {
      return sum + (state.desiredLiters[pot.id] || 0);
    }, 0);
    totalEl.textContent = total.toFixed(2);
  }
}

/**
 * Shows the #totals section (visible in both modes).
 */
function updateTotalsVisibility() {
  const totalsSection = document.getElementById('totals');
  if (!totalsSection) return;
  totalsSection.style.display = '';
}

/**
 * Updates the result display for a specific pot without full re-render.
 */
function updatePotResult(potId) {
  const card = document.querySelector(`.pot-card[data-pot-id="${potId}"]`);
  if (!card) return;
  const resultEl = card.querySelector('.pot-card__result');
  if (!resultEl) return;
  const pot = state.pots.find(p => p.id === potId);
  if (!pot) return;

  if (state.mode === 'verifica') {
    resultEl.classList.remove('pot-card__result--warning');
    if (state.timeMinutes > 0) {
      const liters = calculateVerification(pot.drippers, state.timeMinutes, state.dropFactor);
      resultEl.innerHTML = `Acqua erogata: ${liters.toFixed(2)} l`;
    } else {
      resultEl.innerHTML = 'Impostare tempo > 0 per il calcolo';
      resultEl.classList.add('pot-card__result--warning');
    }
  } else {
    updateCalibrationResult(resultEl, pot);
  }

  // Also update the collapsed summary
  const summaryEl = card.querySelector('.pot-card__summary');
  if (summaryEl) {
    summaryEl.innerHTML = getCollapsedSummaryHTML(pot);
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

  // Settings panel toggle
  const settingsToggle = document.getElementById('settings-toggle');
  if (settingsToggle) {
    settingsToggle.addEventListener('click', () => {
      const panel = document.getElementById('settings-panel');
      if (panel) panel.hidden = false;
    });
  }

  const closeSettings = document.getElementById('close-settings');
  if (closeSettings) {
    closeSettings.addEventListener('click', () => {
      const panel = document.getElementById('settings-panel');
      if (panel) panel.hidden = true;
    });
  }

  const settingsPanel = document.getElementById('settings-panel');
  if (settingsPanel) {
    // Close when clicking overlay background
    settingsPanel.addEventListener('click', (e) => {
      if (e.target === settingsPanel) settingsPanel.hidden = true;
    });
    // Delegate input/change/click events within settings panel
    settingsPanel.addEventListener('click', handleSettingsPanelClick);
    settingsPanel.addEventListener('input', handleSettingsPanelInput);
    settingsPanel.addEventListener('change', handleSettingsPanelChange);
  }
}

function handleMainClick(e) {
  const target = e.target;

  // Toggle pot collapse (click on header, but not buttons/selects inside)
  const potHeader = target.closest('.pot-card__header');
  if (potHeader && !target.closest('button') && !target.closest('select')) {
    const potId = potHeader.closest('.pot-card').dataset.potId;
    handleToggleCollapse(potId);
    return;
  }

  // Add pot button
  if (target.id === 'add-pot' || target.closest('#add-pot')) {
    handleAddPot();
    return;
  }

  // Confirm add pot form
  if (target.dataset.action === 'confirm-add-pot') {
    handleConfirmAddPot();
    return;
  }

  // Cancel add pot form
  if (target.dataset.action === 'cancel-add-pot') {
    handleCancelAddPot();
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

  // Add dripper to pot
  if (target.dataset.action === 'add-dripper') {
    handleAddDripper(target.dataset.potId);
    return;
  }

  // Remove dripper from pot
  if (target.dataset.action === 'remove-dripper') {
    handleRemoveDripper(target.dataset.potId, target.dataset.dripperId);
    return;
  }

  // Set uniform flow mode
  if (target.dataset.action === 'set-uniform') {
    handleSetUniform(target.dataset.potId);
    return;
  }

  // Set differentiated flow mode
  if (target.dataset.action === 'set-differentiated') {
    handleSetDifferentiated(target.dataset.potId);
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

  // Dripper count input (uniform mode)
  if (target.classList.contains('dripper-count-input')) {
    const potId = target.dataset.potId;
    const newCount = parseInt(target.value, 10);
    if (!isNaN(newCount) && newCount >= 1 && newCount <= 20 && Number.isInteger(newCount)) {
      handleDripperCountChange(potId, newCount);
    }
    return;
  }

  // Dripper flow rate (differentiated mode)
  if (target.classList.contains('dripper-flow') && !target.classList.contains('uniform-flow')) {
    const potId = target.dataset.potId;
    const dripperId = target.dataset.dripperId;
    const value = target.value === '' ? null : parseFloat(target.value);
    handleDripperChange(potId, dripperId, 'flowRate', value);
    return;
  }

  // Uniform flow rate input
  if (target.classList.contains('uniform-flow')) {
    const potId = target.dataset.potId;
    const value = target.value === '' ? null : parseFloat(target.value);
    handleUniformValueChange(potId, value);
    return;
  }

  // Desired liters input (calibration mode)
  if (target.classList.contains('desired-liters')) {
    const potId = target.dataset.potId;
    const value = target.value === '' ? 0 : parseFloat(target.value);
    handleDesiredLitersChange(potId, value);
    return;
  }

  // Dripper weight input (calibration mode, non-uniform)
  if (target.classList.contains('dripper-weight')) {
    const potId = target.dataset.potId;
    const index = parseInt(target.dataset.dripperIndex, 10);
    const value = target.value === '' ? null : parseFloat(target.value);
    handleWeightChange(potId, index, value);
    return;
  }
}

function handleMainChange(e) {
  const target = e.target;

  // Inline unit selector (per-pot or per-dripper)
  if (target.classList.contains('inline-unit-select')) {
    const potId = target.dataset.potId;
    const dripperId = target.dataset.dripperId;
    if (dripperId) {
      const pot = state.pots.find(p => p.id === potId);
      const dripper = pot && pot.drippers.find(d => d.id === dripperId);
      if (dripper) dripper.resultDisplayUnit = target.value;
    } else {
      const pot = state.pots.find(p => p.id === potId);
      if (pot) pot.resultDisplayUnit = target.value;
    }
    debouncedSave();
    render();
    return;
  }

  // Dripper unit select (differentiated mode)
  if (target.classList.contains('dripper-unit') && !target.classList.contains('uniform-unit')) {
    const potId = target.dataset.potId;
    const dripperId = target.dataset.dripperId;
    handleDripperChange(potId, dripperId, 'unit', target.value);
    return;
  }

  // Uniform unit select
  if (target.classList.contains('uniform-unit')) {
    const potId = target.dataset.potId;
    handleUniformUnitChange(potId, target.value);
    return;
  }

  // Non-uniform weights toggle (calibration mode)
  if (target.classList.contains('nonuniform-toggle')) {
    const potId = target.dataset.potId;
    handleNonUniformToggle(potId, target.checked);
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

function handleSettingsPanelClick(e) {
  const target = e.target;

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

function handleSettingsPanelInput(e) {
  const target = e.target;

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

function handleSettingsPanelChange(e) {
  const target = e.target;

  // Import file
  if (target.id === 'import-file') {
    if (target.files && target.files[0]) {
      handleImport(target.files[0]);
    }
    return;
  }
}

// ─── Event Handlers ──────────────────────────────────────────────────────────

function handleAddPot() {
  // If form already visible, do nothing
  const potList = document.getElementById('pot-list');
  if (potList && potList.querySelector('.add-pot-form')) return;

  const form = document.createElement('div');
  form.className = 'add-pot-form';

  const defaultName = generateDefaultName();

  form.innerHTML = `
    <div class="add-pot-form__field">
      <label for="new-pot-name">Nome (max 40 caratteri):</label>
      <input type="text" id="new-pot-name" maxlength="40" placeholder="${defaultName}" value="">
    </div>
    <div class="add-pot-form__field">
      <label for="new-pot-drippers">Numero gocciolatori (1–20):</label>
      <input type="number" id="new-pot-drippers" min="1" max="20" step="1" value="1">
      <span class="add-pot-form__error" id="new-pot-drippers-error"></span>
    </div>
    <div class="add-pot-form__actions">
      <button type="button" data-action="confirm-add-pot">Conferma</button>
      <button type="button" data-action="cancel-add-pot">Annulla</button>
    </div>
  `;

  const addBtn = potList.querySelector('#add-pot');
  potList.insertBefore(form, addBtn);

  // Focus the name input
  const nameInput = form.querySelector('#new-pot-name');
  if (nameInput) nameInput.focus();
}

function handleConfirmAddPot() {
  const nameInput = document.getElementById('new-pot-name');
  const drippersInput = document.getElementById('new-pot-drippers');
  const errorEl = document.getElementById('new-pot-drippers-error');

  if (!nameInput || !drippersInput) return;

  // Validate dripper count
  const dripperCount = parseInt(drippersInput.value, 10);
  if (isNaN(dripperCount) || dripperCount < 1 || dripperCount > 20 || !Number.isInteger(parseFloat(drippersInput.value))) {
    if (errorEl) {
      errorEl.textContent = 'Inserire un numero intero tra 1 e 20';
    }
    drippersInput.classList.add('input-error');
    return;
  }

  // Get name (use default if empty)
  let name = nameInput.value.trim();
  if (!name) {
    name = generateDefaultName();
  }
  // Enforce max 40 chars
  name = name.substring(0, 40);

  const nextId = `pot-${Date.now()}`;
  const drippers = [];
  for (let i = 0; i < dripperCount; i++) {
    drippers.push({ id: `d-${Date.now()}-${i}`, flowRate: null, unit: 'l/min' });
  }

  const newPot = {
    id: nextId,
    name: name,
    uniformFlow: true,
    uniformValue: null,
    uniformUnit: 'l/min',
    nonUniformWeights: false,
    weights: Array(dripperCount).fill(1),
    drippers: drippers,
    collapsed: false,
    resultDisplayUnit: 'l/h'
  };
  state.pots.push(newPot);
  debouncedSave();
  render();
}

function handleCancelAddPot() {
  const form = document.querySelector('.add-pot-form');
  if (form) form.remove();
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
  duplicate.collapsed = false;
  // Generate new dripper IDs
  duplicate.drippers = duplicate.drippers.map((d, i) => ({
    ...d,
    id: `d-${Date.now()}-${i}`
  }));

  state.pots.push(duplicate);
  debouncedSave();
  render();
}

function handleAddDripper(potId) {
  const pot = state.pots.find(p => p.id === potId);
  if (!pot) return;
  if (pot.drippers.length >= 20) return;

  pot.drippers.push({ id: `d-${Date.now()}`, flowRate: null, unit: 'l/min' });
  pot.weights = pot.drippers.map((_, i) => pot.weights[i] || 1);
  debouncedSave();
  render();
}

function handleRemoveDripper(potId, dripperId) {
  const pot = state.pots.find(p => p.id === potId);
  if (!pot) return;
  if (pot.drippers.length <= 1) return;

  pot.drippers = pot.drippers.filter(d => d.id !== dripperId);
  pot.weights = pot.drippers.map((_, i) => pot.weights[i] || 1);
  debouncedSave();
  render();
}

function handleDripperCountChange(potId, newCount) {
  const pot = state.pots.find(p => p.id === potId);
  if (!pot) return;

  const currentCount = pot.drippers.length;
  if (newCount === currentCount) return;

  if (newCount > currentCount) {
    // Add drippers with uniform value/unit
    for (let i = currentCount; i < newCount; i++) {
      pot.drippers.push({
        id: `d-${Date.now()}-${i}`,
        flowRate: pot.uniformValue,
        unit: pot.uniformUnit
      });
    }
  } else {
    // Remove drippers from the end
    pot.drippers = pot.drippers.slice(0, newCount);
  }

  // Update weights array
  pot.weights = pot.drippers.map((_, i) => (pot.weights && pot.weights[i]) || 1);

  debouncedSave();
  render();
}

function handleDripperChange(potId, dripperId, field, value) {
  const pot = state.pots.find(p => p.id === potId);
  if (!pot) return;
  const dripper = pot.drippers.find(d => d.id === dripperId);
  if (!dripper) return;

  dripper[field] = value;

  // Sync uniform value from drippers if in uniform mode
  if (pot.uniformFlow) {
    pot.uniformValue = dripper.flowRate;
    pot.uniformUnit = dripper.unit;
  }

  debouncedSave();
  updateTotals();
  updatePotResult(potId);

  // Trigger debounced validation for flow rate changes
  if (field === 'flowRate' || field === 'unit') {
    debouncedValidateDripper(potId, dripperId);
  }
}

/**
 * Handles uniform value change — updates uniformValue and all drippers.
 */
function handleUniformValueChange(potId, value) {
  const pot = state.pots.find(p => p.id === potId);
  if (!pot) return;

  pot.uniformValue = value;
  // Apply to all drippers
  pot.drippers.forEach(d => { d.flowRate = value; });

  debouncedSave();
  updateTotals();
  updatePotResult(potId);

  // Trigger debounced validation for the uniform input
  debouncedValidateUniform(potId);
}

/**
 * Handles uniform unit change — updates uniformUnit and all dripper units.
 */
function handleUniformUnitChange(potId, unit) {
  const pot = state.pots.find(p => p.id === potId);
  if (!pot) return;

  pot.uniformUnit = unit;
  // Apply unit to all drippers
  pot.drippers.forEach(d => { d.unit = unit; });

  debouncedSave();
  updateTotals();
  updatePotResult(potId);

  // Trigger debounced validation
  debouncedValidateUniform(potId);
}

/**
 * Switches a pot to uniform mode.
 * If all drippers have same value AND same unit, use that; otherwise use first dripper's value/unit.
 */
function handleSetUniform(potId) {
  const pot = state.pots.find(p => p.id === potId);
  if (!pot || pot.uniformFlow) return;

  pot.uniformFlow = true;

  if (pot.drippers.length > 0) {
    const firstValue = pot.drippers[0].flowRate;
    const firstUnit = pot.drippers[0].unit;
    const allSame = pot.drippers.every(d => d.flowRate === firstValue && d.unit === firstUnit);

    pot.uniformValue = firstValue;
    pot.uniformUnit = firstUnit;

    if (!allSame) {
      showToast('Valori differenti trovati: utilizzato il valore del primo gocciolatore.', 'info');
    }
  }

  debouncedSave();
  render();
}

/**
 * Switches a pot to differentiated mode.
 * Copies uniformValue and uniformUnit to each dripper.
 */
function handleSetDifferentiated(potId) {
  const pot = state.pots.find(p => p.id === potId);
  if (!pot || !pot.uniformFlow) return;

  pot.uniformFlow = false;

  // Copy uniform value to all drippers
  pot.drippers.forEach(d => {
    d.flowRate = pot.uniformValue;
    d.unit = pot.uniformUnit;
  });

  debouncedSave();
  render();
}

/**
 * Toggles the collapsed state of a pot card.
 */
function handleToggleCollapse(potId) {
  const pot = state.pots.find(p => p.id === potId);
  if (!pot) return;
  pot.collapsed = !pot.collapsed;
  debouncedSave();
  render();
}

// ─── Flow Rate Validation (500ms debounce) ───────────────────────────────────

/**
 * Debounced validation for a specific dripper's flow rate.
 */
function debouncedValidateDripper(potId, dripperId) {
  const timerKey = `${potId}-${dripperId}`;
  if (validationTimers[timerKey]) {
    clearTimeout(validationTimers[timerKey]);
  }
  validationTimers[timerKey] = setTimeout(() => {
    validateAndShowDripperError(potId, dripperId);
    delete validationTimers[timerKey];
  }, 500);
}

/**
 * Debounced validation for a uniform flow input.
 */
function debouncedValidateUniform(potId) {
  const timerKey = `uniform-${potId}`;
  if (validationTimers[timerKey]) {
    clearTimeout(validationTimers[timerKey]);
  }
  validationTimers[timerKey] = setTimeout(() => {
    validateAndShowUniformError(potId);
    delete validationTimers[timerKey];
  }, 500);
}

/**
 * Validates a dripper's flow rate and shows/hides error UI.
 */
function validateAndShowDripperError(potId, dripperId) {
  const pot = state.pots.find(p => p.id === potId);
  if (!pot) return;
  const dripper = pot.drippers.find(d => d.id === dripperId);
  if (!dripper) return;

  const input = document.querySelector(`.dripper-flow[data-pot-id="${potId}"][data-dripper-id="${dripperId}"]`);
  const errorEl = document.querySelector(`.error-message[data-validation-for="${dripperId}"]`);
  if (!input || !errorEl) return;

  const value = dripper.flowRate;

  // Exclude empty/zero/non-numeric values — no warning shown
  if (value == null || value === 0 || typeof value !== 'number' || isNaN(value)) {
    input.classList.remove('error');
    errorEl.style.display = 'none';
    errorEl.textContent = '';
    return;
  }

  const lpm = toLitersPerMinute(value, dripper.unit, state.dropFactor);
  const lph = toLitersPerHour(lpm);
  const result = validateFlowRate(lph);

  if (!result.valid) {
    input.classList.add('error');
    errorEl.style.display = 'block';
    errorEl.textContent = `Portata fuori range: ${lph.toFixed(2)} l/h. Range consentito: 1–8 l/h`;
  } else {
    input.classList.remove('error');
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }
}

/**
 * Validates the uniform flow input and shows/hides error UI.
 */
function validateAndShowUniformError(potId) {
  const pot = state.pots.find(p => p.id === potId);
  if (!pot) return;

  const input = document.querySelector(`.uniform-flow[data-pot-id="${potId}"]`);
  const errorEl = document.querySelector(`.error-message[data-validation-for="uniform-${potId}"]`);
  if (!input || !errorEl) return;

  const value = pot.uniformValue;

  // Exclude empty/zero/non-numeric values — no warning shown
  if (value == null || value === 0 || typeof value !== 'number' || isNaN(value)) {
    input.classList.remove('error');
    errorEl.style.display = 'none';
    errorEl.textContent = '';
    return;
  }

  const lpm = toLitersPerMinute(value, pot.uniformUnit, state.dropFactor);
  const lph = toLitersPerHour(lpm);
  const result = validateFlowRate(lph);

  if (!result.valid) {
    input.classList.add('error');
    errorEl.style.display = 'block';
    errorEl.textContent = `Portata fuori range: ${lph.toFixed(2)} l/h. Range consentito: 1–8 l/h`;
  } else {
    input.classList.remove('error');
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }
}

function handleModeSwitch(mode) {
  if (mode === state.mode) return;
  state.mode = mode;
  debouncedSave();
  render();
}

/**
 * Handles desired liters input change in calibration mode.
 * @param {string} potId
 * @param {number} value
 */
function handleDesiredLitersChange(potId, value) {
  if (!isNaN(value) && value >= 0) {
    state.desiredLiters[potId] = value;
  } else {
    state.desiredLiters[potId] = 0;
  }
  debouncedSave();
  // Update result for this pot without full re-render
  const card = document.querySelector(`.pot-card[data-pot-id="${potId}"]`);
  if (card) {
    const resultEl = card.querySelector('.pot-card__result');
    const pot = state.pots.find(p => p.id === potId);
    if (resultEl && pot) {
      updateCalibrationResult(resultEl, pot);
    }
  }
}

/**
 * Handles weight input change for non-uniform calibration.
 * @param {string} potId
 * @param {number} index - dripper index
 * @param {number|null} value
 */
function handleWeightChange(potId, index, value) {
  const pot = state.pots.find(p => p.id === potId);
  if (!pot) return;

  if (!pot.weights) {
    pot.weights = pot.drippers.map(() => 1);
  }

  pot.weights[index] = value;
  debouncedSave();

  // Update result for this pot without full re-render
  const card = document.querySelector(`.pot-card[data-pot-id="${potId}"]`);
  if (card) {
    const resultEl = card.querySelector('.pot-card__result');
    if (resultEl) {
      updateCalibrationResult(resultEl, pot);
    }
  }
}

/**
 * Handles non-uniform weights toggle.
 * @param {string} potId
 * @param {boolean} checked
 */
function handleNonUniformToggle(potId, checked) {
  const pot = state.pots.find(p => p.id === potId);
  if (!pot) return;

  pot.nonUniformWeights = checked;

  // Initialize weights array if needed
  if (checked && (!pot.weights || pot.weights.length < pot.drippers.length)) {
    pot.weights = pot.drippers.map((_, i) => (pot.weights && pot.weights[i]) || 1);
  }

  debouncedSave();
  render();
}

/**
 * Updates the calibration result display for a single pot card.
 * @param {HTMLElement} resultEl - the .pot-card__result element
 * @param {object} pot - the pot data
 */
function updateCalibrationResult(resultEl, pot) {
  const desiredLiters = state.desiredLiters[pot.id] || 0;
  resultEl.classList.remove('pot-card__result--warning');

  if (state.timeMinutes === 0) {
    resultEl.innerHTML = 'Impostare tempo > 0 per il calcolo';
    resultEl.classList.add('pot-card__result--warning');
  } else if (desiredLiters > 0 && pot.drippers.length > 0) {
    resultEl.innerHTML = getExpandedResultHTML(pot);
  } else {
    resultEl.innerHTML = '';
  }
}

function handleTimeChange(value) {
  state.timeMinutes = value;
  const timeValue = document.getElementById('time-value');
  if (timeValue) {
    timeValue.textContent = value;
  }
  debouncedSave();
  // Full re-render for simplicity (inline selects use innerHTML)
  render();
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

  // 6. Display version
  const versionEl = document.getElementById('app-version');
  if (versionEl) versionEl.textContent = `v${APP_VERSION}`;

  // 7. Register service worker for PWA/offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then((registration) => {
      // Check for updates every time the page loads
      registration.update();

      // When a new service worker takes over, reload to get fresh content
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }).catch(() => {});
  }
}

// Auto-initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', init);
