// The units the tool knows, each with its dimension and its size in the base unit of that dimension. Two units of one
// dimension can be compared, and a measurement in another unit of the dimension of its target is converted to the unit
// of the target (0.6 GiB against a target in MiB is 614.4 MiB). Two units of different dimensions cannot be compared.
// A unit is named by its symbol or by one of its other names, compared with the letters A to Z lowered and runs of white
// space made one space, so "MB", "mb" and "megabytes" are one unit. The unitAliases key of the configuration adds names.
//
// The count units are one unit with many names: a count of defects and a count of issues are both a number of things.

import { asciiLower } from './words.js';

export const UNITS = [
  { symbol: 'ns', dimension: 'time', size: 1e-9, names: ['nanosecond', 'nanoseconds'] },
  { symbol: 'us', dimension: 'time', size: 1e-6, names: ['microsecond', 'microseconds', String.fromCharCode(0xb5, 0x73)] },
  { symbol: 'ms', dimension: 'time', size: 1e-3, names: ['msec', 'millisecond', 'milliseconds'] },
  { symbol: 's', dimension: 'time', size: 1, names: ['sec', 'secs', 'second', 'seconds'] },
  { symbol: 'min', dimension: 'time', size: 60, names: ['mins', 'minute', 'minutes'] },
  { symbol: 'h', dimension: 'time', size: 3600, names: ['hr', 'hrs', 'hour', 'hours'] },
  { symbol: 'd', dimension: 'time', size: 86400, names: ['day', 'days'] },
  { symbol: '%', dimension: 'percentage', size: 1, names: ['percent', 'pct', 'percentage'] },
  { symbol: 'B', dimension: 'data size', size: 1, names: ['byte', 'bytes'] },
  { symbol: 'KB', dimension: 'data size', size: 1e3, names: ['kilobyte', 'kilobytes'] },
  { symbol: 'MB', dimension: 'data size', size: 1e6, names: ['megabyte', 'megabytes'] },
  { symbol: 'GB', dimension: 'data size', size: 1e9, names: ['gigabyte', 'gigabytes'] },
  { symbol: 'TB', dimension: 'data size', size: 1e12, names: ['terabyte', 'terabytes'] },
  { symbol: 'KiB', dimension: 'data size', size: 1024, names: ['kibibyte', 'kibibytes'] },
  { symbol: 'MiB', dimension: 'data size', size: 1024 ** 2, names: ['mebibyte', 'mebibytes'] },
  { symbol: 'GiB', dimension: 'data size', size: 1024 ** 3, names: ['gibibyte', 'gibibytes'] },
  { symbol: 'TiB', dimension: 'data size', size: 1024 ** 4, names: ['tebibyte', 'tebibytes'] },
  { symbol: 'rps', dimension: 'rate', size: 1, names: ['/s', 'per second', 'req/s', 'requests/s', 'requests per second', 'ops/s', 'tps', 'qps'] },
  { symbol: 'rpm', dimension: 'rate', size: 1 / 60, names: ['/min', 'per minute', 'req/min', 'requests/min', 'requests per minute'] },
  { symbol: 'rph', dimension: 'rate', size: 1 / 3600, names: ['/h', 'per hour', 'req/h', 'requests/h', 'requests per hour'] },
  { symbol: 'count', dimension: 'count', size: 1, names: ['items', 'defects', 'bugs', 'issues', 'incidents', 'failures', 'errors', 'vulnerabilities', 'findings', 'tests', 'users', 'requests', 'steps', 'clicks'] },
  { symbol: 'score', dimension: 'score', size: 1, names: ['points'] }
];

// The form a unit is compared in: trimmed, the letters A to Z lowered and runs of white space made one space.
export const unitForm = (text) => asciiLower(String(text).trim()).replace(/\s+/g, ' ');

// Every name of a unit in its compared form, with the unit.
export const UNIT_NAMES = new Map(UNITS.flatMap((u) => [u.symbol, ...u.names].map((n) => [unitForm(n), u])));

// The unit a name stands for, under the aliases of the configuration (compared form to symbol), or null.
export function unitOf(text, aliases = {}) {
  const form = unitForm(text);
  if (UNIT_NAMES.has(form)) return UNIT_NAMES.get(form);
  if (Object.hasOwn(aliases, form)) return UNIT_NAMES.get(unitForm(aliases[form])) ?? null;
  return null;
}

// A number as the reports show it: at most twelve significant digits, so 99.9 - 99.5 is 0.4 and not 0.40000000000000568,
// with a point for the decimals and no grouping of digits, whatever the locale.
export function formatNumber(n) {
  const v = Number(Number(n).toPrecision(12));
  return Object.is(v, -0) ? '0' : String(v);
}

// A value converted from one unit to another of the same dimension.
export const convert = (value, from, to) => Number(((value * from.size) / to.size).toPrecision(12));
