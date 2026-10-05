// The checks: every target read, with its characteristic, sub-characteristic, comparison, number and unit; every
// measurement read, with its number and unit; each measurement compared with every target of its metric; the findings
// of the rules; the result of each comparison; and the summary per characteristic.
//
// Targets and measurements are checked in the order of the files and of the records in each. A measurement belongs to
// a target when their metrics are the same in their term form. A target with an unknown characteristic is still
// compared, so a typo in one column cannot hide a missed target.

import { suggestion } from './config.js';
import { CHARACTERISTIC_NAMES, SUBS, subOf } from './model.js';
import { COMPARISONS, characteristicOf, gapOf, meets, parseQuantity, parseTarget } from './terms.js';
import { UNIT_NAMES, convert, formatNumber, unitForm, unitOf } from './units.js';
import { isBlank, termForm } from './words.js';

export const COMPARE_LIMITS = { maxSuggestions: 100 };

// The place of a field of a record, or of the record itself when the field is not in its file.
const placeOf = (r, field) => r.at[field] ?? { line: r.line, column: r.column };

// The sub-characteristics of a characteristic, as the pages write them, for a suggestion.
const subsOf = (name) => [...SUBS.values()].filter((s) => s.characteristic === name).map((s) => s.name);

// A number with its unit, as the reports show it: "420 ms", "99.5%", or the number alone with no unit.
export function quantityText(number, unit) {
  const n = formatNumber(number);
  if (!unit) return n;
  return unit === '%' ? `${n}%` : `${n} ${unit}`;
}

// True when a unit column says nothing: a blank word that is not also a unit, so % is a unit and n/a is not.
const noUnit = (text, aliases) => isBlank(text) && unitOf(text, aliases) === null;

// The unit of a target or a measurement: the unit column, else the text after the number. { text, unit, problem }
// where unit is the unit the text names, null when there is none or it is not known, and problem says what is wrong.
function unitIn(column, inline, aliases) {
  const col = noUnit(column, aliases) ? '' : column;
  if (col !== '' && inline !== '') {
    const a = unitOf(col, aliases);
    const b = unitOf(inline, aliases);
    if (unitForm(col) !== unitForm(inline) && (a === null || a !== b)) return { text: col, unit: null, problem: `names two units, "${col}" in the unit column and "${inline}" after the number` };
  }
  const text = col !== '' ? col : inline;
  if (text === '') return { text, unit: null, problem: null };
  const unit = unitOf(text, aliases);
  return { text, unit, problem: unit === null ? 'unknown' : null };
}

// Checks the targets and the measurements read: { summary, results, findings, unsuggested }. Each finding is
// { rule, file, line, column, found, metric, characteristic }.
export function checkTargets(targetFiles, measurementFiles, config, limits = COMPARE_LIMITS) {
  const lim = { ...COMPARE_LIMITS, ...limits };
  const findings = [];
  const add = (rule, r, field, found, characteristic = '') => {
    const p = placeOf(r, field);
    findings.push({ rule, file: r.file, line: p.line, column: p.column, found, metric: r.metric, characteristic });
  };
  let suggested = 0;
  let unsuggested = 0;
  // A near name for a name the tool does not know, within the limit of suggestions.
  const hint = (text, known) => {
    if (termForm(text).length < 3) return '';
    if (suggested >= lim.maxSuggestions) {
      unsuggested += 1;
      return '';
    }
    suggested += 1;
    return suggestion(termForm(text), known).replace('; did you mean', ', did you mean');
  };
  const characteristicNames = [...CHARACTERISTIC_NAMES, ...Object.keys(config.characteristicAliases)];
  const subNames = [...SUBS.values()].map((s) => s.name);
  const unitNames = [...UNIT_NAMES.keys(), ...Object.keys(config.unitAliases)];

  // The targets.
  const targets = [];
  const rowsOf = new Map(CHARACTERISTIC_NAMES.map((n) => [n, 0]));
  const seen = new Map();
  const targetMetrics = new Set();
  for (const r of targetFiles.flatMap((f) => f.records)) {
    targetMetrics.add(termForm(r.metric));
    const label = `the target "${r.metric}"`;
    const c = isBlank(r.characteristic) ? null : characteristicOf(r.characteristic, config.characteristicAliases);
    const shown = c ? c.name : isBlank(r.characteristic) ? '' : r.characteristic;
    if (c === null) {
      add('unknown-characteristic', r, 'characteristic', isBlank(r.characteristic) ? `${label} names no characteristic` : `${label} has the characteristic "${r.characteristic}", which is not one of the nine of ISO/IEC 25010 or a known alias${hint(r.characteristic, characteristicNames)}`, shown);
    } else rowsOf.set(c.name, rowsOf.get(c.name) + 1);
    const of = c ? `${label} of ${c.name}` : label;

    let sub = isBlank(r.subCharacteristic) ? '' : r.subCharacteristic;
    if (sub !== '') {
      const s = subOf(sub);
      if (s === null) add('unknown-sub-characteristic', r, 'subCharacteristic', `${of} has the sub-characteristic "${sub}", which is not one of ISO/IEC 25010${hint(sub, c ? subsOf(c.name) : subNames)}`, shown);
      else if (c && s.characteristic !== c.name) add('unknown-sub-characteristic', r, 'subCharacteristic', `${of} has the sub-characteristic "${sub}", which belongs to ${s.characteristic}`, shown);
      else sub = s.name;
    }

    if (isBlank(r.method)) add('missing-method', r, 'method', `${of} names no measurement method`, shown);
    if (isBlank(r.owner)) add('missing-owner', r, 'owner', `${of} has no owner`, shown);

    if (isBlank(r.target)) {
      add('invalid-record', r, 'target', `${of} has no target value; the target is not checked`, shown);
      continue;
    }
    const t = parseTarget(r.target, /[<>=]/.test(r.comparison) || !isBlank(r.comparison) ? r.comparison : '');
    if (t.problem) {
      add('invalid-record', r, 'target', `${of}: ${t.problem}; the target is not checked`, shown);
      continue;
    }
    const u = unitIn(r.unit, t.unit, config.unitAliases);
    if (u.problem === 'unknown') add('unknown-unit', r, noUnit(r.unit, config.unitAliases) ? 'target' : 'unit', `${of} has the unit "${u.text}", which is not one the tool knows${hint(u.text, unitNames)}; the target is not compared`, shown);
    else if (u.problem) add('unknown-unit', r, 'unit', `${of} ${u.problem}; the target is not compared`, shown);
    else if (u.text === '') add('unknown-unit', r, r.at.unit ? 'unit' : 'target', `${of} has no unit; the target is not compared`, shown);

    const key = `${termForm(r.metric)}\u0000${t.comparison}`;
    const first = seen.get(key);
    if (first) add('duplicate-target', r, 'metric', `${of} has the comparison ${t.comparison} a second time; the first target is at ${first.file}:${first.line}`, shown);
    else seen.set(key, r);

    targets.push({ r, label: of, characteristic: shown, known: c !== null, sub, comparison: t.comparison, number: t.number, unitText: u.text, unit: u.problem || u.text === '' ? null : u.unit, text: `${t.comparison} ${quantityText(t.number, u.text)}` });
  }

  // The measurements.
  const byMetric = new Map();
  let measurements = 0;
  let untargeted = 0;
  for (const m of measurementFiles.flatMap((f) => f.records)) {
    measurements += 1;
    const label = `the measurement of "${m.metric}"`;
    if (isBlank(m.value)) {
      add('invalid-record', m, 'value', `${label} has no value; it is not compared`);
      continue;
    }
    const q = parseQuantity(m.value);
    if (q === null) {
      add('invalid-record', m, 'value', `${label} has the value "${m.value}", which holds no number the tool can read; it is not compared`);
      continue;
    }
    const u = unitIn(m.unit, q.unit, config.unitAliases);
    if (u.problem === 'unknown') add('unknown-unit', m, noUnit(m.unit, config.unitAliases) ? 'value' : 'unit', `${label} has the unit "${u.text}", which is not one the tool knows${hint(u.text, unitNames)}; it is not compared`);
    else if (u.problem) add('unknown-unit', m, 'unit', `${label} ${u.problem}; it is not compared`);
    const form = termForm(m.metric);
    if (!byMetric.has(form)) byMetric.set(form, []);
    byMetric.get(form).push({ m, number: q.number, unitText: u.text, unit: u.unit, bad: u.problem !== null });
    if (!targetMetrics.has(form)) {
      untargeted += 1;
      add('untargeted-measurement', m, 'metric', `${label}, ${quantityText(q.number, u.text)}${isBlank(m.source) ? '' : ` from ${m.source}`}, names a metric that no target has`);
    }
  }

  // Each target with its measurements.
  const results = [];
  const status = new Map();
  for (const t of targets) {
    const base = { characteristic: t.characteristic, subcharacteristic: t.sub, metric: t.r.metric, target: t.text, owner: t.r.owner, file: t.r.file, line: t.r.line };
    const ms = byMetric.get(termForm(t.r.metric)) ?? [];
    if (!ms.length) {
      add('unverified-target', t.r, 'target', `${t.label} (${t.text}) has no measurement`, t.characteristic);
      results.push({ status: 'unverified', ...base, measured: '', gap: '', source: '', measurement: '' });
      status.set(t, 'unverified');
      continue;
    }
    let compared = 0;
    let missed = 0;
    for (const e of ms) {
      const at = `${e.m.file}:${e.m.line}`;
      const row = { ...base, source: e.m.source, measurement: at };
      if (t.unit === null || e.bad) {
        results.push({ status: 'unverified', ...row, measured: quantityText(e.number, e.unitText), gap: '' });
        continue;
      }
      const mu = e.unit ?? t.unit;
      if (mu.dimension !== t.unit.dimension) {
        add('unit-mismatch', e.m, noUnit(e.m.unit, config.unitAliases) ? 'value' : 'unit', `the measurement of "${e.m.metric}" is in ${e.unitText} (${mu.dimension}) and its target at ${t.r.file}:${t.r.line} is in ${t.unitText} (${t.unit.dimension}); it is not compared`, t.characteristic);
        results.push({ status: 'unverified', ...row, measured: quantityText(e.number, e.unitText), gap: '' });
        continue;
      }
      compared += 1;
      const value = convert(e.number, mu, t.unit);
      const measured = `${quantityText(value, t.unitText)}${mu === t.unit ? '' : ` (${quantityText(e.number, e.unitText)} as measured)`}`;
      if (meets(value, t.comparison, t.number)) {
        results.push({ status: 'met', ...row, measured, gap: '' });
        continue;
      }
      missed += 1;
      const gap = gapOf(value, t.number);
      const gapText = quantityText(gap, t.unitText);
      const from = isBlank(e.m.source) ? '' : ` (source: ${e.m.source})`;
      const how = gap === 0 ? `, at the limit, which ${t.comparison} does not allow` : `, ${gapText} ${COMPARISONS[t.comparison].side} it`;
      add('target-missed', t.r, 'target', `${t.label} (${t.text}) is missed: measured ${measured} at ${at}${from}${how}`, t.characteristic);
      results.push({ status: 'missed', ...row, measured, gap: gapText });
    }
    status.set(t, missed ? 'missed' : compared ? 'met' : 'unverified');
  }

  // Required characteristics with no target.
  const first = targetFiles[0];
  if (first) {
    for (const name of config.required) {
      if (rowsOf.get(name) === 0) findings.push({ rule: 'missing-characteristic', file: first.file, line: 1, column: 1, found: `no target names ${name}, a characteristic of the required list`, metric: '', characteristic: name });
    }
  }

  // The summary per characteristic: the nine in the order of the model, then the names the tool does not know, in
  // the order they first appear.
  const rows = new Map(CHARACTERISTIC_NAMES.map((n) => [n, { characteristic: n, known: true, required: config.required.includes(n), targets: 0, met: 0, missed: 0, unverified: 0 }]));
  for (const t of targets) {
    const key = t.known ? t.characteristic : `\u0000${termForm(t.characteristic)}`;
    if (!rows.has(key)) rows.set(key, { characteristic: t.characteristic, known: false, required: false, targets: 0, met: 0, missed: 0, unverified: 0 });
    const row = rows.get(key);
    row.targets += 1;
    row[status.get(t)] += 1;
  }
  const characteristics = [...rows.values()];
  const totals = { targets: targets.length, met: 0, missed: 0, unverified: 0, measurements, untargeted };
  for (const t of targets) totals[status.get(t)] += 1;
  return { summary: { characteristics, totals }, results, findings, unsuggested };
}

