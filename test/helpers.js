// Shared test helpers: targets and measurements built inline, checked in memory or written into a temporary folder that
// is removed after the test. Paths are built with resolve() from forward-slash names, so the same test runs on Linux,
// macOS and Windows. The line a test expects is found with lineOf(), which counts lines the way the tool does, so a
// test never holds a line number worked out by hand for one system only. No test reads the clock, the time zone or
// the locale.

import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { ROLES, buildReport, defaultConfig, fileKind, lineStarts, main, positionOf, readConfig, readRecords } from '../src/index.js';

export async function withFiles(files, fn) {
  const dir = await mkdtemp(resolve(tmpdir(), 'quality-target-check-'));
  try {
    for (const [rel, content] of Object.entries(files)) {
      await mkdir(dirname(resolve(dir, rel)), { recursive: true });
      await writeFile(resolve(dir, rel), content);
    }
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function offsetOf(text, needle, n) {
  let at = -1;
  for (let i = 0; i < n; i += 1) {
    at = text.indexOf(needle, at + 1);
    if (at < 0) throw new Error(`${needle} is not in the text ${n} times`);
  }
  return at;
}

// The line (from 1) of the n-th place where needle starts in text.
export const lineOf = (text, needle, n = 1) => positionOf(lineStarts(text), offsetOf(text, needle, n)).line;

// The column (from 1) of the n-th place where needle starts in text.
export const columnOf = (text, needle, n = 1) => positionOf(lineStarts(text), offsetOf(text, needle, n)).column;

// The configuration of a configuration object, through the real reader, or the defaults.
export const configOf = (object = null) => (object === null ? defaultConfig() : readConfig(JSON.stringify(object), 'config.json'));

// The header every targets file of the tests uses, one column per field in the order of ROLES.targets.fields.
export const HEADER = 'characteristic,sub-characteristic,metric,unit,comparison,target,owner,method';

// The header every measurements file of the tests uses.
export const MHEADER = 'metric,value,unit,source';

// A target with nothing to report when it is measured with GOOD_MEASUREMENT: every test changes only the fields it is
// about.
export const GOOD = { characteristic: 'reliability', subCharacteristic: 'availability', metric: 'uptime', unit: '%', comparison: '', target: '>= 99', owner: 'team', method: 'probe' };

// A measurement that meets the good target.
export const GOOD_MEASUREMENT = { metric: 'uptime', value: '99.5', unit: '%', source: 'probe' };

// A field as RFC 4180 writes it, with no guard against formulas, so a target such as == 0 is written as it is.
export const quote = (v) => (/[",\r\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

const rowOf = (role, base) => (changes = {}) => ROLES[role].fields.map((f) => quote({ ...base, ...changes }[f])).join(',');

// One CSV row of a target: the good target with these fields changed.
export const row = rowOf('targets', GOOD);

// One CSV row of a measurement: the good measurement with these fields changed.
export const mrow = rowOf('measurements', GOOD_MEASUREMENT);

// A CSV targets file with the header and one row per object of changes.
export const targetsCsv = (...records) => `${HEADER}\n${records.map(row).join('\n')}\n`;

// A CSV measurements file with the header and one row per object of changes.
export const measurementsCsv = (...records) => `${MHEADER}\n${records.map(mrow).join('\n')}\n`;

// A JSON targets file of these records.
export const targetsJson = (...records) => `${JSON.stringify({ targets: records }, null, 2)}\n`;

// A JSON measurements file of these records.
export const measurementsJson = (...records) => `${JSON.stringify({ measurements: records }, null, 2)}\n`;

// The report object of files checked in memory: objects of path to text for the targets and the measurements, with a
// configuration object or none.
export function reportOf({ targets, measurements = {} }, config = null, { minSeverity = 'info', failOn = 'error' } = {}) {
  const cfg = configOf(config);
  const read = (sources, role) => Object.entries(sources).map(([file, text]) => readRecords(text, file, role, fileKind(file)));
  return buildReport({ targets: read(targets, 'targets'), measurements: read(measurements, 'measurements'), config: cfg, minSeverity, failOn, version: 'test' });
}

// The report object of one CSV targets file and one CSV measurements file, each record written as an object of changes
// to the good one. No characteristic is required unless the configuration says so, so a test sees only its own rule.
export const checkOf = (targets, measurements = [{}], config = { required: [] }, options = {}) => reportOf({ targets: { 't.csv': targetsCsv(...targets) }, measurements: { 'm.csv': measurementsCsv(...measurements) } }, config, options);

// The findings of a report, of one rule or of all.
export const findingsOf = (r, rule) => r.findings.filter((f) => !rule || f.rule === rule);

// The rule ids of the findings of a report, in order.
export const rulesOf = (r) => r.findings.map((f) => f.rule);

// The rule ids of the findings of a report, sorted.
export const sortedRules = (r) => rulesOf(r).sort();

// Writes the files and runs the command line with these arguments (paths relative to the folder).
export async function run(files, args = [], limits) {
  return withFiles(files, async (dir) => {
    let out = '';
    let err = '';
    const code = await main(args, { out: (t) => { out += t; }, err: (t) => { err += t; } }, limits, dir);
    return { code, out, err, dir };
  });
}

// Runs the command line with exactly these arguments, in a folder.
export async function cli(argv, dir) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, dir);
  return { code, out, err };
}
