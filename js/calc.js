/**
 * Calculation Engine — pure functions for flow rate conversion,
 * verification, and calibration calculations.
 */

/**
 * Converts a flow rate from any supported unit to l/min.
 * @param {number} value - The flow rate value
 * @param {'l/min'|'l/h'|'gocce/min'} unit - Source unit
 * @param {number} dropFactor - Drops per ml (default 20)
 * @returns {number} Flow rate in l/min
 */
export function toLitersPerMinute(value, unit, dropFactor = 20) {
  switch (unit) {
    case 'l/min':
      return value;
    case 'l/h':
      return value / 60;
    case 'gocce/min':
      return value / (dropFactor * 1000);
    default:
      return value;
  }
}

/**
 * Converts a flow rate from l/min to the target unit.
 * @param {number} lpm - Flow rate in l/min
 * @param {'l/min'|'l/h'|'gocce/min'} targetUnit - Target unit
 * @param {number} dropFactor - Drops per ml (default 20)
 * @returns {number} Flow rate in target unit
 */
export function fromLitersPerMinute(lpm, targetUnit, dropFactor = 20) {
  switch (targetUnit) {
    case 'l/min':
      return lpm;
    case 'l/h':
      return lpm * 60;
    case 'gocce/min':
      return lpm * dropFactor * 1000;
    default:
      return lpm;
  }
}

/**
 * Calculates total liters delivered per pot (Verification mode).
 * @param {Array<{flowRate: number, unit: string}>} drippers - Array of dripper configs
 * @param {number} timeMinutes - Activation time in minutes
 * @param {number} dropFactor - Drops per ml
 * @returns {number} Total liters (2 decimal precision)
 */
export function calculateVerification(drippers, timeMinutes, dropFactor) {
  const totalFlowLpm = drippers.reduce((sum, dripper) => {
    const rate = dripper.flowRate;
    if (rate == null || rate === 0 || typeof rate !== 'number' || isNaN(rate)) {
      return sum;
    }
    return sum + toLitersPerMinute(rate, dripper.unit, dropFactor);
  }, 0);
  const totalLiters = totalFlowLpm * timeMinutes;
  return Math.round(totalLiters * 100) / 100;
}

/**
 * Calculates required flow rate per dripper (Calibration mode, uniform).
 * @param {number} desiredLiters - Target liters for the pot
 * @param {number} timeMinutes - Activation time in minutes
 * @param {number} dripperCount - Number of drippers
 * @returns {number} Required flow rate in l/min
 */
export function calculateCalibration(desiredLiters, timeMinutes, dripperCount) {
  return desiredLiters / timeMinutes / dripperCount;
}

/**
 * Calculates required flow rates with non-uniform weights.
 * @param {number} desiredLiters - Target liters for the pot
 * @param {number} timeMinutes - Activation time in minutes
 * @param {number[]} weights - Weight per dripper
 * @returns {number[]} Required flow rate per dripper in l/min
 */
export function calculateWeightedCalibration(desiredLiters, timeMinutes, weights) {
  const totalFlow = desiredLiters / timeMinutes;
  const sumWeights = weights.reduce((sum, w) => sum + w, 0);
  return weights.map(w => (w / sumWeights) * totalFlow);
}

/**
 * Calculates suggested alternative time when flow is out of range.
 * @param {number} desiredLiters - Target liters
 * @param {number} dripperCount - Number of drippers
 * @param {'min'|'max'} bound - Which bound was exceeded
 * @returns {number} Suggested time in minutes (rounded to nearest 0.5)
 */
export function suggestAlternativeTime(desiredLiters, dripperCount, bound) {
  // 'min' means flow was below minimum (1 l/min) → use 1 l/min to get longer time
  // 'max' means flow exceeded maximum (8 l/min) → use 8 l/min to get shorter time
  const boundaryFlow = bound === 'max' ? 8 : 1;
  const time = desiredLiters / (dripperCount * boundaryFlow);
  // Round to nearest 0.5 for slider compatibility (step 0.5)
  return Math.round(time * 2) / 2;
}

/**
 * Validates a flow rate value against the 1-8 l/min range.
 * @param {number} valueLpm - Value in l/min
 * @returns {{valid: boolean, message?: string}}
 */
export function validateFlowRate(valueLpm) {
  // TODO: implement
}
