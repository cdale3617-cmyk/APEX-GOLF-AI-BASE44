/** Unit display helpers. Every stored number stays in yards, °F, mph and feet. */

const YARD_TO_M = 0.9144;

export const isMetric = (units) => units === 'metric';

export const toDisplayDistance = (yards, units) =>
  Math.round((Number(yards) || 0) * (isMetric(units) ? YARD_TO_M : 1));

export const fromDisplayDistance = (value, units) =>
  Math.round((Number(value) || 0) / (isMetric(units) ? YARD_TO_M : 1));

export const distanceUnit = (units) => (isMetric(units) ? 'm' : 'yds');
export const distanceUnitLong = (units) => (isMetric(units) ? 'Metres' : 'Yards');
export const distanceUnitSpoken = (units) => (isMetric(units) ? 'metres' : 'yards');

export const toDisplayTemp = (f, units) =>
  Math.round(isMetric(units) ? ((Number(f) - 32) * 5) / 9 : Number(f) || 0);

export const fromDisplayTemp = (value, units) =>
  Math.round(isMetric(units) ? ((Number(value) || 0) * 9) / 5 + 32 : Number(value) || 0);

export const tempUnit = (units) => (isMetric(units) ? '°C' : '°F');

export const toDisplayWind = (mph, units) =>
  Math.round(isMetric(units) ? (Number(mph) || 0) * 1.60934 : Number(mph) || 0);

export const fromDisplayWind = (value, units) =>
  Math.round(isMetric(units) ? (Number(value) || 0) / 1.60934 : Number(value) || 0);

export const windUnit = (units) => (isMetric(units) ? 'km/h' : 'mph');

export const toDisplayElev = (ft, units) =>
  Math.round(isMetric(units) ? (Number(ft) || 0) * 0.3048 : Number(ft) || 0);

export const fromDisplayElev = (value, units) =>
  Math.round(isMetric(units) ? (Number(value) || 0) / 0.3048 : Number(value) || 0);

export const elevUnit = (units) => (isMetric(units) ? 'm' : 'ft');