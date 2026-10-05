// A targets file or a measurements file read into records. A CSV file has a header line that names its columns; a JSON
// file is a list of records, or an object whose "targets" key (in a targets file) or "measurements" key (in a
// measurements file) holds that list. The names of the columns and keys are compared in one form (src/words.js
// fieldForm), so "Sub-characteristic", "sub_characteristic" and "subCharacteristic" all name the sub-characteristic.
// Columns and keys the tool does not read are kept out and named in a note. Every value is trimmed of white space at
// both ends. A record that cannot be read (a CSV row with a different number of fields than the header, a JSON record
// that is not an object or names a field twice, a record with no metric) is an invalid-record finding and is not
// checked; a file that cannot be read at all is an unreadable-file or unparsable-file finding.

import { CsvError, csvProblem, parseCsv } from './csv.js';
import { JsonError, jsonProblem, parseJson } from './json.js';
import { fieldForm } from './words.js';

export const RECORD_LIMITS = { maxRecords: 200000, maxValues: 5000000, maxStringLength: 65536 };

// The two roles of a file: the fields of its records in the order the reports show them, the names of a column or key
// that give each field in the form they are compared in, the columns a CSV header must name, and the key of the list in
// a JSON object.
export const ROLES = {
  targets: {
    fields: ['characteristic', 'subCharacteristic', 'metric', 'unit', 'comparison', 'target', 'owner', 'method'],
    names: {
      characteristic: 'characteristic',
      qualitycharacteristic: 'characteristic',
      subcharacteristic: 'subCharacteristic',
      qualitysubcharacteristic: 'subCharacteristic',
      metric: 'metric',
      metricname: 'metric',
      measure: 'metric',
      name: 'metric',
      unit: 'unit',
      units: 'unit',
      comparison: 'comparison',
      operator: 'comparison',
      comparator: 'comparison',
      target: 'target',
      targetvalue: 'target',
      threshold: 'target',
      goal: 'target',
      owner: 'owner',
      targetowner: 'owner',
      method: 'method',
      measurementmethod: 'method',
      measuredby: 'method',
      howmeasured: 'method',
      howitismeasured: 'method'
    },
    required: ['characteristic', 'metric', 'target'],
    list: 'targets',
    what: 'target'
  },
  measurements: {
    fields: ['metric', 'value', 'unit', 'source'],
    names: {
      metric: 'metric',
      metricname: 'metric',
      measure: 'metric',
      name: 'metric',
      value: 'value',
      measuredvalue: 'value',
      measured: 'value',
      result: 'value',
      actual: 'value',
      unit: 'unit',
      units: 'unit',
      source: 'source',
      tool: 'source',
      run: 'source'
    },
    required: ['metric', 'value'],
    list: 'measurements',
    what: 'measurement'
  }
};

// The field a column or key names in a file of a role, or null.
export function fieldOf(name, role) {
  const names = ROLES[role].names;
  const form = fieldForm(name);
  return Object.hasOwn(names, form) ? names[form] : null;
}

const blank = (role) => Object.fromEntries(ROLES[role].fields.map((f) => [f, '']));

// A file that could not be read: one finding of rule, and no record.
export function unreadableFile(file, role, kind, rule, line, column, found) {
  return { file, role, kind, read: false, rows: 0, records: [], problems: [{ rule, file, line, column, found, metric: '' }], ignored: [] };
}

const COLUMN_NAMES = { characteristic: 'characteristic', metric: 'metric', target: 'target', value: 'value' };

function fromCsv(text, file, role, limits) {
  const spec = ROLES[role];
  let rows;
  try {
    rows = parseCsv(text, { maxRecords: limits.maxRecords + 1, maxFieldLength: limits.maxStringLength });
  } catch (error) {
    if (!(error instanceof CsvError)) throw error;
    // The reader counts the header as a record; the limit is on the records after it.
    if (/^more than [\d,]+ records$/.test(error.reason)) return unreadableFile(file, role, 'csv', 'unparsable-file', 1, 1, `more than ${limits.maxRecords.toLocaleString('en-US')} records; nothing in the file is read`);
    const p = csvProblem(error, text);
    return unreadableFile(file, role, 'csv', 'unparsable-file', p.line, p.column, `${p.text}; nothing in the file is read`);
  }
  const needed = spec.required.map((f) => COLUMN_NAMES[f]).join(', ');
  if (!rows.length) return unreadableFile(file, role, 'csv', 'unparsable-file', 1, 1, `the file is empty; a header line that names the ${needed} columns was expected; nothing in the file is read`);
  const header = rows[0];
  const columns = [];
  const ignored = [];
  const taken = new Map();
  for (const [i, f] of header.fields.entries()) {
    const name = f.value.trim();
    const field = fieldOf(name, role);
    if (field === null) {
      ignored.push(name === '' ? `(column ${i + 1}, no name)` : name);
      columns.push(null);
    } else if (taken.has(field)) {
      return unreadableFile(file, role, 'csv', 'unparsable-file', f.line, f.column, `the header names the ${field} twice, as "${taken.get(field)}" and "${name}"; nothing in the file is read`);
    } else {
      taken.set(field, name);
      columns.push(field);
    }
  }
  const missing = spec.required.filter((f) => !taken.has(f));
  if (missing.length) {
    return unreadableFile(file, role, 'csv', 'unparsable-file', header.line, header.column, `the header line of a ${role} file names no ${missing.map((f) => COLUMN_NAMES[f]).join(' or ')} column (it names ${header.fields.map((f) => `"${f.value.trim()}"`).join(', ')}); nothing in the file is read`);
  }
  const records = [];
  const problems = [];
  let count = 0;
  for (const row of rows.slice(1)) {
    if (row.fields.every((f) => f.value.trim() === '')) continue;
    count += 1;
    if (row.fields.length !== columns.length) {
      problems.push({ rule: 'invalid-record', file, line: row.line, column: row.column, found: `this row has ${row.fields.length} ${row.fields.length === 1 ? 'field' : 'fields'} and the header has ${columns.length}; the row is not checked`, metric: '' });
      continue;
    }
    const r = { ...blank(role), file, line: row.line, column: row.column, at: {}, record: count };
    for (const [i, f] of row.fields.entries()) {
      const field = columns[i];
      if (field === null) continue;
      r.at[field] = { line: f.line, column: f.column };
      r[field] = f.value.trim();
    }
    if (!r.metric) {
      problems.push({ rule: 'invalid-record', file, line: r.at.metric.line, column: r.at.metric.column, found: `this row names no metric; the ${spec.what} is not checked`, metric: '' });
      continue;
    }
    records.push(r);
  }
  return { file, role, kind: 'csv', read: true, rows: count, records, problems, ignored };
}

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'a list' : typeof v === 'object' ? 'an object' : `a ${typeof v}`);

function fromJson(text, file, role, limits) {
  const spec = ROLES[role];
  let parsed;
  try {
    parsed = parseJson(text, { maxDepth: 32, maxValues: limits.maxValues, maxStringLength: limits.maxStringLength, linesUpTo: 3 });
  } catch (error) {
    if (!(error instanceof JsonError)) throw error;
    const p = jsonProblem(error, text);
    const [, line, column] = /^line (\d+), column (\d+)/.exec(p);
    return unreadableFile(file, role, 'json', 'unparsable-file', Number(line), Number(column), `${p}; nothing in the file is read`);
  }
  const { value, lines, columns } = parsed;
  const ignored = [];
  let list;
  let prefix;
  if (Array.isArray(value)) {
    list = value;
    prefix = '';
  } else if (value !== null && typeof value === 'object' && Array.isArray(value[spec.list])) {
    list = value[spec.list];
    prefix = spec.list;
    for (const k of Object.keys(value)) if (k !== spec.list) ignored.push(k);
  } else {
    return unreadableFile(file, role, 'json', 'unparsable-file', 1, 1, `the file holds ${typeOf(value)}; a list of ${role}, or an object with a "${spec.list}" list, was expected; nothing in the file is read`);
  }
  if (list.length > limits.maxRecords) return unreadableFile(file, role, 'json', 'unparsable-file', lines.get(prefix) ?? 1, columns.get(prefix) ?? 1, `more than ${limits.maxRecords.toLocaleString('en-US')} records; nothing in the file is read`);
  const records = [];
  const problems = [];
  const where = (path) => ({ line: lines.get(path) ?? 1, column: columns.get(path) ?? 1 });
  for (const [i, item] of list.entries()) {
    const path = `${prefix}[${i}]`;
    const at = where(path);
    const bad = (found, place = at) => problems.push({ rule: 'invalid-record', file, line: place.line, column: place.column, found, metric: '' });
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      bad(`${path} is ${typeOf(item)}, not an object; the ${spec.what} is not checked`);
      continue;
    }
    const r = { ...blank(role), file, line: at.line, column: at.column, at: {}, record: i + 1 };
    const taken = new Map();
    let refused = false;
    for (const key of Object.keys(item)) {
      const field = fieldOf(key, role);
      if (field === null) {
        if (!ignored.includes(key)) ignored.push(key);
        continue;
      }
      const kp = `${path}.${key}`;
      const place = where(kp);
      if (taken.has(field)) {
        bad(`${path} names the ${field} twice, as "${taken.get(field)}" and "${key}"; the ${spec.what} is not checked`, place);
        refused = true;
        break;
      }
      taken.set(field, key);
      r.at[field] = place;
      const v = item[key];
      // A text, or a number read as the text JavaScript writes for it.
      if (typeof v === 'string') r[field] = v.trim();
      else if (typeof v === 'number') r[field] = String(v);
      else if (v !== null) bad(`${kp} is ${typeOf(v)}, not a text or a number; it is taken as empty`, place);
    }
    if (refused) continue;
    if (!r.metric) {
      bad(`${path} names no metric; the ${spec.what} is not checked`, r.at.metric ?? at);
      continue;
    }
    records.push(r);
  }
  return { file, role, kind: 'json', read: true, rows: list.length, records, problems, ignored };
}

// Reads the text of a file of a role and a kind: { file, role, kind, read, rows, records, problems, ignored }.
export function readRecords(text, file, role, kind, limits = RECORD_LIMITS) {
  const lim = { ...RECORD_LIMITS, ...limits };
  return kind === 'csv' ? fromCsv(text, file, role, lim) : fromJson(text, file, role, lim);
}
