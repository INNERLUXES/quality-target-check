// The values of a target and of a measurement, read from their text: the characteristic, the comparison, the number and
// the unit. Every pattern here is fixed and anchored; none is built from the input.

import { CHARACTERISTIC_NAMES } from './model.js';
import { termForm } from './words.js';

// The characteristic a name stands for, under the aliases of the configuration (term form to name), or null:
// { name, alias } where alias is true when the name is another name of the characteristic.
export function characteristicOf(text, aliases = {}) {
  const form = termForm(text);
  if (CHARACTERISTIC_NAMES.includes(form)) return { name: form, alias: false };
  if (Object.hasOwn(aliases, form)) return { name: aliases[form], alias: true };
  return null;
}

// The comparisons of a target, with the words a finding uses for each.
export const COMPARISONS = {
  '<=': { text: 'at most', side: 'over' },
  '>=': { text: 'at least', side: 'under' },
  '<': { text: 'below', side: 'over' },
  '>': { text: 'above', side: 'under' },
  '==': { text: 'exactly', side: 'off' }
};

// A number with a point for the decimals and an exponent, and nothing else: no grouping of digits, no comma for the
// decimals, no locale. A unit after it starts with a character that cannot continue a number, so 1,500 is refused
// and not read as 1 with the unit ",500".
const QUANTITY = /^([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?)(?:[ \t]*([^\s\d.,+-].*))?$/s;
const OPERATOR = /^(<=|>=|==|=|<|>)[ \t]*(.*)$/s;

// A number with an optional unit after it ("420 ms", "99.5%", "3"): { number, unit } or null. unit is the text after
// the number, trimmed, or '' when there is none.
export function parseQuantity(text) {
  const m = QUANTITY.exec(String(text).trim());
  if (!m) return null;
  const number = Number(m[1]);
  if (!Number.isFinite(number)) return null;
  return { number, unit: (m[2] ?? '').trim() };
}

// A target: a comparison and a number with an optional unit, such as "<= 300 ms", or a number alone when the
// comparison is given on its own. "=" is read as "==". Returns { comparison, number, unit } or { problem } with what is
// wrong.
export function parseTarget(text, comparisonText = '') {
  const value = String(text).trim();
  const given = String(comparisonText).trim();
  let comparison = null;
  let rest = value;
  const op = OPERATOR.exec(value);
  if (op) {
    comparison = op[1] === '=' ? '==' : op[1];
    rest = op[2];
  }
  if (given !== '') {
    const g = given === '=' ? '==' : given;
    if (!Object.hasOwn(COMPARISONS, g)) return { problem: `the comparison "${given}" is not one of <=, >=, <, >, ==` };
    if (comparison !== null && comparison !== g) return { problem: `the target "${value}" holds the comparison ${comparison} and the comparison column holds ${g}` };
    comparison = g;
  }
  if (comparison === null) return { problem: `the target "${value}" has no comparison; write one of <=, >=, <, >, == in front of the number or in the comparison column` };
  const q = parseQuantity(rest);
  if (q === null) return { problem: `the target "${value}" holds no number the tool can read; write it with a point for the decimals and no grouping, such as 99.9 or 1500` };
  return { comparison, number: q.number, unit: q.unit };
}

// The form two numbers are compared in: twelve significant digits, so a value converted from another unit compares as
// the same number it stands for.
const round = (n) => Number(n.toPrecision(12));

// True when a value meets a target: value comparison target.
export function meets(value, comparison, target) {
  const a = round(value);
  const b = round(target);
  if (comparison === '<=') return a <= b;
  if (comparison === '>=') return a >= b;
  if (comparison === '<') return a < b;
  if (comparison === '>') return a > b;
  return a === b;
}

// How far a value that misses its target is from it, in the unit of the target: never negative.
export function gapOf(value, target) {
  return Math.abs(round(round(value) - round(target)));
}
