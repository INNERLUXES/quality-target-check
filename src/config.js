// The configuration file: the settings of the tool, in one strict JSON object over the built-in defaults. Every key the
// tool does not know is an error with its line and a suggestion, so a typo cannot leave a default in place unnoticed;
// the JSON reader refuses a name given twice in one object. The configuration is optional: with none, the defaults
// apply.

import { LEVELS } from './data.js';
import { DEFAULT_CHARACTERISTIC_ALIASES, DEFAULT_FAIL_ON, DEFAULT_MIN_SEVERITY, DEFAULT_REQUIRED, DEFAULT_REQUIRE_ALL, DEFAULT_RULES, DEFAULT_UNIT_ALIASES } from './defaults.js';
import { JsonError, jsonProblem, parseJson } from './json.js';
import { CHARACTERISTIC_NAMES } from './model.js';
import { characteristicOf } from './terms.js';
import { UNITS, UNIT_NAMES, unitForm } from './units.js';
import { asciiLower, termForm } from './words.js';

export const CONFIG_LIMITS = { maxAliases: 500, maxAliasLength: 100 };

// Every key of the configuration file, with the kind of its value. docs/inputs.md describes each of them.
export const KEYS = {
  name: 'text',
  rules: Object.fromEntries(Object.keys(DEFAULT_RULES).map((k) => [k, 'level or off'])),
  required: 'list of characteristics',
  requireAll: 'true or false',
  characteristicAliases: 'object of texts to characteristics',
  unitAliases: 'object of texts to units',
  minSeverity: 'level',
  failOn: 'level'
};

export class ConfigError extends Error {
  constructor(problems) {
    super(problems.join('; '));
    this.problems = problems;
  }
}

// The edit distance of two short names, for a suggestion: an insertion, a deletion, a change or two neighbours swapped
// ("nmae" for "name") each count one.
export function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// The closest of the known names, when it is close enough to be a typo: '; did you mean "..."?' or nothing. A name that
// differs in length from a known name by more than three characters, or that is longer than 64 characters, is not
// compared with it.
export function suggestion(name, known) {
  if (name.length > 64) return '';
  let best = null;
  for (const k of known) {
    if (Math.abs(name.length - k.length) > 3 || k.length > 64) continue;
    const d = distance(asciiLower(name), asciiLower(k));
    if (d <= Math.max(1, Math.floor(k.length / 3)) && (!best || d < best.d)) best = { k, d };
  }
  return best ? `; did you mean "${best.k}"?` : '';
}

export function kindOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'a list';
  if (typeof value === 'object') return 'an object';
  return `a ${typeof value}`;
}

export const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// The built-in configuration, as the checks use it.
export function defaultConfig() {
  return {
    file: null,
    name: null,
    rules: { ...DEFAULT_RULES },
    required: [...DEFAULT_REQUIRED],
    requireAll: DEFAULT_REQUIRE_ALL,
    characteristicAliases: { ...DEFAULT_CHARACTERISTIC_ALIASES },
    unitAliases: { ...DEFAULT_UNIT_ALIASES },
    minSeverity: DEFAULT_MIN_SEVERITY,
    failOn: DEFAULT_FAIL_ON
  };
}

// The built-in configuration written as a configuration file, for --print-defaults. Read back, it gives the defaults.
export function defaultsAsConfig() {
  const d = defaultConfig();
  return { name: 'built-in defaults', rules: d.rules, required: d.required, requireAll: d.requireAll, characteristicAliases: d.characteristicAliases, unitAliases: d.unitAliases, minSeverity: d.minSeverity, failOn: d.failOn };
}

const UNIT_SYMBOLS = UNITS.map((u) => u.symbol);

// Checks a parsed configuration and builds the configuration the checks use, or throws ConfigError with every problem.
export function validateConfig(value, lines = new Map(), file = 'config') {
  const problems = [];
  const lineOf = (path) => {
    for (let p = path, prev = null; p && p !== prev; prev = p, p = p.replace(/(?:\.[^.[]+|\[\d+\])$/, '')) if (lines.has(p)) return lines.get(p);
    return 1;
  };
  const fail = (path, message) => problems.push({ line: lineOf(path), text: `${file}: line ${lineOf(path)}: ${message}` });
  const config = defaultConfig();
  config.file = file;
  if (!isObject(value)) throw new ConfigError([`${file}: line 1: the configuration must be a JSON object, not ${kindOf(value)}`]);
  const show = (v) => (typeof v === 'string' ? `"${v.slice(0, 40)}"` : kindOf(v));

  const top = Object.keys(KEYS);
  for (const k of Object.keys(value)) if (!top.includes(k)) fail(k, `"${k.slice(0, 60)}" is not a key of the configuration${suggestion(k, top)}`);

  if (Object.hasOwn(value, 'name')) {
    if (typeof value.name !== 'string' || value.name.length === 0 || value.name.length > 120) fail('name', 'name must be a text of 1 to 120 characters');
    else config.name = value.name;
  }

  if (Object.hasOwn(value, 'rules')) {
    const v = value.rules;
    const keys = Object.keys(DEFAULT_RULES);
    if (!isObject(v)) fail('rules', `rules must be an object, not ${kindOf(v)}`);
    else {
      for (const k of Object.keys(v)) {
        const path = `rules.${k}`;
        if (!keys.includes(k)) fail(path, `"${k.slice(0, 60)}" is not a key of rules${suggestion(k, keys)}`);
        else if (typeof v[k] !== 'string' || ![...LEVELS, 'off'].includes(v[k])) fail(path, `${path} must be one of ${[...LEVELS, 'off'].join(', ')}, not ${show(v[k])}`);
        else config.rules[k] = v[k];
      }
    }
  }

  // The other names of the characteristics: each name is compared in its term form; its value adds the name or
  // changes it, and "off" takes a built-in name away.
  if (Object.hasOwn(value, 'characteristicAliases')) {
    const v = value.characteristicAliases;
    if (!isObject(v)) fail('characteristicAliases', `characteristicAliases must be an object of names to characteristics, not ${kindOf(v)}`);
    else if (Object.keys(v).length > CONFIG_LIMITS.maxAliases) fail('characteristicAliases', `characteristicAliases holds more than ${CONFIG_LIMITS.maxAliases} names`);
    else {
      const seen = new Map();
      for (const k of Object.keys(v)) {
        const path = `characteristicAliases.${k}`;
        const form = termForm(k);
        const target = typeof v[k] === 'string' ? termForm(v[k]) : null;
        if (form === '' || k.length > CONFIG_LIMITS.maxAliasLength) fail(path, `"${k.slice(0, 60)}" must hold 1 to ${CONFIG_LIMITS.maxAliasLength} characters with a letter or a digit`);
        else if (CHARACTERISTIC_NAMES.includes(form)) fail(path, `"${k.slice(0, 60)}" is already the name of a characteristic`);
        else if (seen.has(form)) fail(path, `"${k.slice(0, 60)}" is the same name as "${seen.get(form)}" once compared (${form})`);
        else if (v[k] !== 'off' && !CHARACTERISTIC_NAMES.includes(target)) fail(path, `${path} must be one of ${CHARACTERISTIC_NAMES.join(', ')}, or off, not ${show(v[k])}${typeof v[k] === 'string' ? suggestion(target, CHARACTERISTIC_NAMES) : ''}`);
        else if (v[k] === 'off' && !Object.hasOwn(config.characteristicAliases, form)) fail(path, `"${k.slice(0, 60)}" is not a built-in alias, so it cannot be set off`);
        else {
          seen.set(form, k);
          if (v[k] === 'off') delete config.characteristicAliases[form];
          else config.characteristicAliases[form] = target;
        }
      }
    }
  }

  // The other names of units: each name is compared in its unit form, and its value is a unit the tool knows.
  if (Object.hasOwn(value, 'unitAliases')) {
    const v = value.unitAliases;
    if (!isObject(v)) fail('unitAliases', `unitAliases must be an object of names to units, not ${kindOf(v)}`);
    else if (Object.keys(v).length > CONFIG_LIMITS.maxAliases) fail('unitAliases', `unitAliases holds more than ${CONFIG_LIMITS.maxAliases} names`);
    else {
      const seen = new Map();
      for (const k of Object.keys(v)) {
        const path = `unitAliases.${k}`;
        const form = unitForm(k);
        if (form === '' || k.length > CONFIG_LIMITS.maxAliasLength) fail(path, `"${k.slice(0, 60)}" must hold 1 to ${CONFIG_LIMITS.maxAliasLength} characters`);
        else if (UNIT_NAMES.has(form)) fail(path, `"${k.slice(0, 60)}" is already the name of a unit (${UNIT_NAMES.get(form).symbol})`);
        else if (seen.has(form)) fail(path, `"${k.slice(0, 60)}" is the same name as "${seen.get(form)}" once compared (${form})`);
        else if (typeof v[k] !== 'string' || !UNIT_NAMES.has(unitForm(v[k]))) fail(path, `${path} must be a unit the tool knows, such as ${UNIT_SYMBOLS.slice(0, 8).join(', ')} (docs/inputs.md lists them), not ${show(v[k])}${typeof v[k] === 'string' ? suggestion(v[k], UNIT_SYMBOLS) : ''}`);
        else {
          seen.set(form, k);
          config.unitAliases[form] = UNIT_NAMES.get(unitForm(v[k])).symbol;
        }
      }
    }
  }

  // The characteristics that need a target, read with the aliases set above.
  if (Object.hasOwn(value, 'required')) {
    const v = value.required;
    if (!Array.isArray(v)) fail('required', `required must be a list of characteristics, not ${kindOf(v)}`);
    else {
      const names = [];
      for (const [i, item] of v.entries()) {
        const path = `required[${i}]`;
        const c = typeof item === 'string' ? characteristicOf(item, config.characteristicAliases) : null;
        if (typeof item !== 'string') fail(path, `${path} must be the name of a characteristic, not ${kindOf(item)}`);
        else if (c === null) fail(path, `"${item.slice(0, 60)}" is not a characteristic of ISO/IEC 25010${suggestion(termForm(item), [...CHARACTERISTIC_NAMES, ...Object.keys(config.characteristicAliases)])}`);
        else if (names.includes(c.name)) fail(path, `"${item.slice(0, 60)}" names ${c.name}, which the list already holds`);
        else names.push(c.name);
      }
      config.required = CHARACTERISTIC_NAMES.filter((n) => names.includes(n));
    }
  }

  if (Object.hasOwn(value, 'requireAll')) {
    if (typeof value.requireAll !== 'boolean') fail('requireAll', `requireAll must be true or false, not ${kindOf(value.requireAll)}`);
    else config.requireAll = value.requireAll;
  }

  for (const key of ['minSeverity', 'failOn']) {
    if (!Object.hasOwn(value, key)) continue;
    if (!LEVELS.includes(value[key])) fail(key, `${key} must be one of ${LEVELS.join(', ')}`);
    else config[key] = value[key];
  }
  // The problems in the order of their lines, so the list reads like the file.
  if (problems.length) throw new ConfigError(problems.sort((a, b) => a.line - b.line).map((p) => p.text));
  return config;
}

// Reads the text of a configuration file.
export function readConfig(text, file) {
  let parsed;
  try {
    parsed = parseJson(text, { linesUpTo: 3 });
  } catch (error) {
    if (error instanceof JsonError) throw new ConfigError([`${file}: ${jsonProblem(error, text)}`]);
    throw error;
  }
  return validateConfig(parsed.value, parsed.lines, file);
}
