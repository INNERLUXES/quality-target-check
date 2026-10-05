// Runs the README examples, checks that they report what the README shows, and writes the reports of the two made-up
// applications to examples/output. CI runs it and then fails if those files changed, so the example output in the
// repository is always the real output.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../src/index.js';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');

// The arguments of the examples; every path is relative to the root of the repository.
export const MISSED = ['examples/missed/targets.csv', '--measurements', 'examples/missed/measurements.json', '--config', 'examples/config.json'];
export const CLEAN = ['examples/clean/targets.json', '--measurements', 'examples/clean/measurements.csv'];

// Runs the tool on files of the repository; the paths shown in the report are relative to the root of the repository.
export async function run(argv, base = root) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, base);
  return { code, out, err };
}

// What the README says of the application whose targets are partly missed: the counts, one finding of every rule that
// fires, the notes and the result.
export const EXPECTED = [
  'input: targets examples/missed/targets.csv (1 file: 1 CSV file; 16 records); measurements examples/missed/measurements.json (1 file: 1 JSON file; 14 records)',
  'config: examples/config.json (Quillmoor quality targets): 6 required characteristics, require all off; 4 characteristic aliases, 1 unit alias; minimum severity info; fail on error',
  'targets: 15 targets: 8 met, 4 missed, 3 unverified; 14 measurements, 1 with no target',
  'findings: 16 (8 error, 7 warning, 1 info)',
  '  Reliabilty (unknown)    no        1        1    0       0',
  'the target "p95 checkout latency" of performance efficiency (<= 300 ms) is missed: measured 420 ms at examples/missed/measurements.json:4 (source: k6 run on staging), 120 ms over it',
  'measured 614.4 MiB (0.6 GiB as measured) at examples/missed/measurements.json:5 (source: container metrics), 102.4 MiB over it',
  'the target "monthly availability" of reliability (>= 99.9%) is missed: measured 99.5%',
  '0.4% under it',
  'the target "critical vulnerabilities" of security (== 0 count) is missed: measured 2 count',
  'has the characteristic "Reliabilty", which is not one of the nine of ISO/IEC 25010 or a known alias, did you mean "reliability"?',
  'has the unit "milisecond", which is not one the tool knows, did you mean "millisecond"?; the target is not compared',
  'the target "fast" has no comparison',
  'the measurement of "installation time" is in MB (data size) and its target at examples/missed/targets.csv:14 is in min (time); it is not compared',
  'no target names functional suitability, a characteristic of the required list',
  'no target names safety, a characteristic of the required list',
  'the target "open admin endpoints" of security (== 0 count) has no measurement',
  'the target "open admin endpoints" of security has no owner',
  'the target "open admin endpoints" of security names no measurement method',
  'has the sub-characteristic "interoperabilty", which is not one of ISO/IEC 25010, did you mean "interoperability"?',
  'the target "monthly availability" of reliability has the comparison >= a second time; the first target is at examples/missed/targets.csv:5',
  'the measurement of "error budget burn", 0.7 score from slo dashboard export, names a metric that no target has',
  'note: examples/missed/targets.csv: 1 column the tool does not read was left out: "notes"',
  'note: examples/missed/measurements.json: 1 key the tool does not read was left out: "app"',
  'does not certify conformance to ISO/IEC 25010',
  'RESULT: FAIL - 8 findings at or above error (8 error, 7 warning, 1 info)'
];
// The older name usability, a throughput measured in an alias of the configuration, a time to restore measured in
// hours against minutes, a target met by its looser duplicate, and the targets that are met are not reported as
// problems.
export const UNWANTED = ['RESULT: PASS', 'usability"', '"task completion rate" of interaction capability (', '"peak bookings throughput" of performance efficiency (', '"mean time to restore"', '(>= 99.5%) is missed', '"line coverage"', '"cyclic module dependencies"'];

const problems = [];
function expect(name, result, code, expected, unwanted, stream = 'out') {
  const text = result[stream];
  const missing = expected.filter((e) => !text.includes(e));
  const wrong = unwanted.filter((e) => text.includes(e));
  if (result.code !== code || missing.length || wrong.length) {
    problems.push(`${name}: unexpected report (exit code ${result.code}, expected ${code}; missing: ${missing.join(' / ') || 'none'}; should not appear: ${wrong.join(' / ') || 'none'})${result.err ? `\n${result.err}` : ''}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const missed = await run(MISSED);
  process.stdout.write(missed.out);
  expect('targets partly missed', missed, 1, EXPECTED, UNWANTED);

  const clean = await run(CLEAN);
  expect('clean targets', clean, 0, ['input: targets examples/clean/targets.json (1 file: 1 JSON file; 9 records); measurements examples/clean/measurements.csv (1 file: 1 CSV file; 9 records)', 'targets: 9 targets: 9 met, 0 missed, 0 unverified; 9 measurements, 0 with no target', 'findings: 0', 'note: examples/clean/targets.json: 1 key the tool does not read was left out: "app"', 'RESULT: PASS - no finding at or above error'], ['  WARNING  ', '  ERROR  ', 'RESULT: FAIL']);

  // Without the configuration every characteristic is required, the throughput unit is not known, and only errors
  // fail the run.
  expect('missed, built-in configuration', await run(MISSED.slice(0, 3)), 1, ['config: built-in defaults: 9 required characteristics', 'has the unit "req/sec", which is not one the tool knows', 'no target names functional suitability'], ['no target names compatibility']);
  // A missing characteristic is an error with --require-all.
  expect('missed, require all', await run([...MISSED, '--require-all', '--min-severity', 'error']), 1, ['require all on', 'ERROR    missing-characteristic', 'RESULT: FAIL - 10 findings at or above error'], ['WARNING  ']);
  // The clean targets pass when every level fails the run.
  expect('clean, fail on info', await run([...CLEAN, '--fail-on', 'info']), 0, ['RESULT: PASS - no finding at or above info'], []);
  // With no measurements file every target is unverified.
  expect('clean, no measurements', await run(['examples/clean/targets.json']), 0, ['measurements none', 'targets: 9 targets: 0 met, 0 missed, 9 unverified', 'note: no measurements file was given'], []);
  // A file of no kind the tool reads stops the run.
  expect('missed, a README named', await run(['examples/missed/README.md']), 2, ['examples/missed/README.md: not a kind of file the tool reads'], [], 'err');

  // The README shows the whole report of the missed targets, the --explain lines of one finding, the GitHub annotations
  // of two findings, the start of the CSV result list and the report of the clean targets.
  const readme = (await readFile(resolve(root, 'README.md'), 'utf8')).split('\r\n').join('\n');
  if (!readme.includes(missed.out)) problems.push('README: the sample output of the missed targets differs from a real run');
  if (!readme.includes(clean.out)) problems.push('README: the sample output of the clean targets differs from a real run');

  await mkdir(resolve(root, 'examples/output'), { recursive: true });
  await writeFile(resolve(root, 'examples/output/missed.txt'), missed.out);
  await writeFile(resolve(root, 'examples/output/clean.txt'), clean.out);
  const explain = await run([...MISSED, '--explain']);
  if (explain.code !== 1) problems.push(`explain: exit code ${explain.code}, expected 1`);
  const lines = explain.out.split('\n');
  const at = lines.findIndex((l) => l.includes('target-missed') && l.includes('targets.csv:3'));
  const sample = lines.slice(at, at + 8).join('\n');
  if (at < 0 || !readme.includes(sample)) problems.push('README: the --explain sample of the missed memory target differs from a real run');
  await writeFile(resolve(root, 'examples/output/missed-explain.txt'), explain.out);
  const github = await run([...MISSED, '--format', 'github']);
  if (github.code !== 1) problems.push(`github: exit code ${github.code}, expected 1`);
  const picked = github.out.split('\n').filter((x) => (x.includes('title=quality-target-check target-missed::') && x.includes('p95 checkout latency')) || x.includes('title=quality-target-check unverified-target::'));
  if (picked.length !== 2) problems.push('github: the sample lines are not in the output');
  for (const l of picked) if (!readme.includes(l)) problems.push('README: the GitHub sample differs from a real run');
  await writeFile(resolve(root, 'examples/output/missed-github.txt'), github.out);
  const csv = await run([...MISSED, '--format', 'csv']);
  if (csv.code !== 1) problems.push(`csv: exit code ${csv.code}, expected 1`);
  const head = csv.out.split('\r\n').slice(0, 4).join('\n');
  if (!readme.includes(head)) problems.push('README: the CSV sample differs from a real run');
  await writeFile(resolve(root, 'examples/output/missed-results.csv'), csv.out);
  const json = await run([...MISSED, '--json', '--explain']);
  if (json.code !== 1) problems.push(`json: exit code ${json.code}, expected 1`);
  await writeFile(resolve(root, 'examples/output/missed.json'), json.out);
  const defaults = await run(['--print-defaults']);
  if (defaults.code !== 0) problems.push(`--print-defaults: exit code ${defaults.code}, expected 0`);
  await writeFile(resolve(root, 'examples/output/defaults.json'), defaults.out);

  if (problems.length) {
    for (const p of problems) console.error(`example: ${p}`);
    process.exit(1);
  }
}
