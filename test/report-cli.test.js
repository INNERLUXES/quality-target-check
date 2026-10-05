import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { KIND_NAMES, NOTICE, USAGE, VERSION, escapeData, escapeProperty, parseArgs, toGithub, toJson, toText } from '../src/index.js';
import { HEADER, checkOf, cli, columnOf, lineOf, measurementsCsv, measurementsJson, reportOf, run, targetsCsv, targetsJson, withFiles } from './helpers.js';

const NONE = { 'c.json': '{"required": []}' };
const CLEAN = { 't.csv': targetsCsv({}, { metric: 'p95', unit: 'ms', target: '<= 300', subCharacteristic: '' }), 'm.csv': measurementsCsv({}, { metric: 'p95', value: '0.25', unit: 's' }), ...NONE };
const WARN = { ...CLEAN, 't.csv': targetsCsv({ owner: '' }) };
const MISSED = { ...CLEAN, 'm.csv': measurementsCsv({ value: '98' }, { metric: 'p95', value: '420', unit: 'ms' }) };
const BROKEN = { 't.csv': 'characteristic,metric,target\n"open\n', ...NONE };
const ARGS = ['t.csv', '--measurements', 'm.csv', '--config', 'c.json'];

test('cli: exit 0 below the fail-on level, 1 at or above it, from the flag or the configuration', async () => {
  const clean = await run(CLEAN, ARGS);
  assert.equal(clean.code, 0, clean.err);
  assert.match(clean.out, /^quality-target-check: targets t\.csv; measurements m\.csv\ninput: targets t\.csv \(1 file: 1 CSV file; 2 records\); measurements m\.csv \(1 file: 1 CSV file; 2 records\)\nconfig: c\.json: 0 required characteristics, require all off; 4 characteristic aliases, 0 unit aliases; minimum severity info; fail on error\nrules: missing-characteristic \(warning\); /);
  assert.match(clean.out, /\ntargets: 2 targets: 2 met, 0 missed, 0 unverified; 2 measurements, 0 with no target\nfindings: 0\n/);
  assert.match(clean.out, /RESULT: PASS - no finding at or above error\n$/);
  assert.equal(clean.err, '');
  const warn = await run(WARN, ARGS);
  assert.equal(warn.code, 0, 'a warning does not fail the run by default');
  assert.equal((await run(WARN, [...ARGS, '--fail-on', 'warning'])).code, 1);
  assert.equal((await run(CLEAN, [...ARGS, '--fail-on', 'info'])).code, 0, 'nothing at all to report');
  const configured = await run({ ...WARN, 'c.json': '{"required": [], "failOn": "warning"}' }, ARGS);
  assert.equal(configured.code, 1);
  assert.match(configured.out, /RESULT: FAIL - 1 finding at or above warning \(1 warning, 1 info\)\n$/);
  assert.equal((await run({ ...WARN, 'c.json': '{"required": [], "failOn": "warning"}' }, [...ARGS, '--fail-on', 'error'])).code, 0, 'the flag wins over the configuration');
  const missed = await run(MISSED, ARGS);
  assert.equal(missed.code, 1);
  assert.match(missed.out, /RESULT: FAIL - 2 findings at or above error \(2 error\)\n$/);
  const broken = await run(BROKEN, ['t.csv', '--config', 'c.json']);
  assert.equal(broken.code, 1, 'a file that cannot be parsed fails the run at the default level');
  assert.match(broken.out, /ERROR {4}unparsable-file +t\.csv:2\n {11}line 2, column 1: a quoted field that is not closed; a field that starts with a double quote must end with one; nothing in the file is read/);
});

test('cli: --require-all makes a missing characteristic an error, and the built-in list requires all nine', async () => {
  const files = { 't.csv': targetsCsv({}), 'm.csv': measurementsCsv({}) };
  const plain = await run(files, ['t.csv', '--measurements', 'm.csv']);
  assert.equal(plain.code, 0);
  assert.match(plain.out, /findings: 8 \(8 warning\)/);
  assert.match(plain.out, /no target names functional suitability, a characteristic of the required list/);
  const strict = await run(files, ['t.csv', '--measurements', 'm.csv', '--require-all', '--explain']);
  assert.equal(strict.code, 1);
  assert.match(strict.out, /require all on/);
  assert.match(strict.out, /findings: 8 \(8 error\)/);
  assert.match(strict.out, /, an error because requireAll is on/);
  assert.equal((await run({ ...files, 'c.json': '{"requireAll": true}' }, ['t.csv', '--measurements', 'm.csv', '--config', 'c.json'])).code, 1);
});

test('cli: several targets and measurements files, CSV and JSON, are read together', async () => {
  const files = { 'a.csv': targetsCsv({}), 'b.json': targetsJson({ characteristic: 'security', metric: 'cves', unit: 'count', target: '== 0', owner: 's', method: 'scan' }), 'm1.json': measurementsJson({ metric: 'cves', value: 0 }), 'm2.csv': measurementsCsv({}), ...NONE };
  const r = await run(files, ['a.csv', 'b.json', '--measurements', 'm1.json', '--measurements', 'm2.csv', '--config', 'c.json', '--json']);
  assert.equal(r.code, 0, r.err);
  const out = JSON.parse(r.out);
  assert.deepEqual(out.input.targets.paths, ['a.csv', 'b.json']);
  assert.deepEqual(out.input.measurements.files, [{ file: 'm1.json', kind: 'json', read: true, rows: 1, records: 1 }, { file: 'm2.csv', kind: 'csv', read: true, rows: 1, records: 1 }]);
  assert.deepEqual(out.input.targets.byKind, { csv: 1, json: 1 });
  assert.deepEqual(out.summary.characteristics.filter((c) => c.targets).map((c) => [c.characteristic, c.met]), [['reliability', 1], ['security', 1]]);
});

test('cli: with no measurements file every target is unverified, and a note says so', async () => {
  const r = await run({ 't.csv': targetsCsv({}), ...NONE }, ['t.csv', '--config', 'c.json']);
  assert.equal(r.code, 0);
  assert.match(r.out, /input: targets t\.csv \(1 file: 1 CSV file; 1 record\); measurements none\n/);
  assert.match(r.out, /note: no measurements file was given, so every target is unverified; name one with --measurements\n/);
  assert.match(r.out, /WARNING {2}unverified-target/);
});

test('cli: exit 2 for usage errors, with the usage and nothing on standard output', async () => {
  for (const [args, message] of [
    [[], /give the targets to check: one or more \.csv or \.json files/],
    [['--measurements', 'm.csv'], /give the targets to check/],
    [['t.csv', 't.csv'], /t\.csv is named twice/],
    [['t.csv', '--measurements', 't.csv'], /t\.csv is named twice/],
    [['t.csv', '--bogus'], /unknown argument --bogus/],
    [['t.csv', '--format', 'xml'], /unknown format xml \(text, json, csv or github\)/],
    [['t.csv', '--format', 'json', '--format', 'text'], /--format was given twice/],
    [['t.csv', '--json', '--format', 'csv'], /--json and --format csv ask for two formats; give one/],
    [['t.csv', '--min-severity', 'notice'], /--min-severity: unknown level notice \(info, warning, error\)/],
    [['t.csv', '--fail-on', 'fatal'], /--fail-on: unknown level fatal/],
    [['t.csv', '--fail-on', 'error', '--fail-on', 'info'], /--fail-on was given twice/],
    [['t.csv', '--config'], /--config needs a value/],
    [['t.csv', '--measurements'], /--measurements needs a value/],
    [['t.csv', '--config', '--json'], /--config needs a value/],
    [['t.csv', '--explain', '--format', 'github'], /--explain adds the sources of each finding to the text and JSON reports; the github format has no place for them/],
    [['t.csv', '--explain', '--format', 'csv'], /the csv format has no place for them/],
    [['-'], /reading from standard input is not supported/],
    [['t.csv', '--measurements', '-'], /reading from standard input is not supported/],
    [['https://example.com/t.csv'], /give a local path; the tool never fetches a URL/],
    [['t.csv', '--measurements', 'file://m.csv'], /give a local path/]
  ]) {
    const r = await run(CLEAN, args);
    assert.equal(r.code, 2, args.join(' '));
    assert.match(r.err, message, args.join(' '));
    assert.ok(r.err.includes('Usage: quality-target-check'), args.join(' '));
    assert.equal(r.out, '');
  }
  assert.throws(() => parseArgs(Array.from({ length: 101 }, (_, i) => `p${i}.csv`)), /more than 100 files/);
  assert.throws(() => parseArgs(['t.csv', ...Array.from({ length: 100 }, (_, i) => ['--measurements', `m${i}.csv`]).flat()]), /more than 100 files/);
});

test('cli: exit 2 for input errors, with the problems and no result', async () => {
  for (const [files, args, message] of [
    [CLEAN, ['missing.csv'], /missing\.csv: no such file/],
    [CLEAN, ['t.csv', '--measurements', 'gone.json'], /gone\.json: no such file/],
    [{ ...CLEAN, 'dir/x.csv': 'metric\n' }, ['dir'], /dir: is a folder; give the file itself/],
    [{ 't.txt': 'metric\n' }, ['t.txt'], /t\.txt: not a kind of file the tool reads \(a name ending in \.csv or \.json\)/],
    [{ '.csv': 'metric\n' }, ['.csv'], /\.csv: not a kind of file the tool reads/],
    [CLEAN, ['t.csv', './t.csv'], /t\.csv: is named twice/],
    [CLEAN, ['t.csv', '--measurements', './t.csv'], /t\.csv: is named twice/],
    [{ ...CLEAN, 'c.json': '{"failOm": "info"}' }, ['t.csv', '--config', 'c.json'], /c\.json: line 1: "failOm" is not a key of the configuration; did you mean "failOn"\?/],
    [CLEAN, ['t.csv', '--config', 'nope.json'], /nope\.json: no such file/],
    [{ ...CLEAN, 'd/c.json': '{}' }, ['t.csv', '--config', 'd'], /d: is a folder; give the file itself/]
  ]) {
    const r = await run(files, args);
    assert.equal(r.code, 2, `${args.join(' ')}: ${r.err}`);
    assert.match(r.err, /^quality-target-check: no result, the input has (?:a problem|problems):\n/);
    assert.match(r.err, message);
    assert.equal(r.out, '');
  }
});

test('cli: a binary, UTF-16 or invalid UTF-8 file, or one over its limit, is an error finding, and the rest is still read', async () => {
  const r = await run({ ...WARN, 'j.csv': Buffer.from([0x66, 0, 0x64]), 'k.json': Buffer.from([0xff, 0xfe, 0x5b, 0]), 'l.csv': Buffer.from([0x66, 0x64, 0xe9, 0x0a]) }, ['t.csv', 'j.csv', '--measurements', 'k.json', '--measurements', 'l.csv', '--measurements', 'm.csv', '--config', 'c.json']);
  assert.equal(r.code, 1);
  assert.match(r.out, /j\.csv:1\n {11}the file cannot be read: holds binary data \(a null byte\); only text is read; export the sheet as CSV; nothing in it is checked/);
  assert.match(r.out, /the file cannot be read: is UTF-16; only UTF-8 is read/);
  assert.match(r.out, /the file cannot be read: is not valid UTF-8; only UTF-8 text is read/);
  assert.match(r.out, /the target "uptime" of reliability has no owner/);
  const big = await run(CLEAN, ARGS, { maxFileBytes: 10 });
  assert.match(big.out, /t\.csv:1\n {11}the file cannot be read: \d+ bytes is over the 10 byte limit/);
  const one = CLEAN['t.csv'].length;
  const total = await run({ 'x.csv': CLEAN['t.csv'], 'y.csv': CLEAN['t.csv'] }, ['x.csv', 'y.csv'], { maxTotalBytes: one });
  assert.equal(total.code, 2);
  assert.match(total.err, /y\.csv: the files read so far hold more than [\d,]+ bytes, the limit of one run/);
  const measured = await run({ 'x.csv': CLEAN['t.csv'], 'y.csv': CLEAN['m.csv'] }, ['x.csv', '--measurements', 'y.csv'], { maxTotalBytes: one });
  assert.equal(measured.code, 2, 'the measurements count toward the limit of a run');
});

test('cli: --help, --version and --print-defaults', async () => {
  const help = await cli(['--help'], '.');
  assert.equal(help.code, 0);
  assert.equal(help.out, USAGE);
  for (const s of ['--measurements', '--require-all', '--fail-on', '--min-severity', '--format', 'github', 'csv', 'missing-owner (rules.missingOwner)', 'unparsable-file (always error)', 'ISO/IEC 25010', 'Exit codes: 0 no finding at or above the fail-on level']) assert.ok(USAGE.includes(s), s);
  const version = await cli(['--version'], '.');
  assert.equal(version.out, `${VERSION}\n`);
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
  const defaults = await cli(['--print-defaults'], '.');
  assert.equal(defaults.code, 0);
  assert.deepEqual(Object.keys(JSON.parse(defaults.out)), ['name', 'rules', 'required', 'requireAll', 'characteristicAliases', 'unitAliases', 'minSeverity', 'failOn']);
});

test('text: the characteristics, the targets missed, the findings with the fix, and --explain', () => {
  const r = checkOf([{}, { characteristic: 'performance efficiency', subCharacteristic: 'time behaviour', metric: 'p95', unit: 'ms', target: '<= 300' }, { characteristic: 'speedy', metric: 'x', unit: 'count', target: '== 0' }], [{ value: '98' }, { metric: 'p95', value: '420', unit: 'ms' }, { metric: 'x', value: '0', unit: '' }]);
  const out = toText(r);
  assert.ok(out.includes('Characteristics (10)\n\n  characteristic          required  targets  met  missed  unverified\n  functional suitability  no        0        0    0       0\n  performance efficiency  no        1        0    1       0\n'));
  assert.ok(out.includes('  speedy (unknown)        no        1        1    0       0\n\n'));
  assert.ok(out.includes('Targets missed (2)\n\n  characteristic          metric  target     measured  gap     at\n  reliability             uptime  >= 99%     98%       1%      t.csv:2\n  performance efficiency  p95     <= 300 ms  420 ms    120 ms  t.csv:3\n\n'));
  assert.match(out, /\n {2}ERROR {4}target-missed {15}t\.csv:2\n {11}the target "uptime" of reliability \(>= 99%\) is missed: measured 98% at m\.csv:2 \(source: probe\), 1% under it\n {11}fix: improve the application/);
  assert.ok(out.includes(NOTICE));
  assert.ok(!out.includes('basis:'));
  const explained = toText(r, { explain: true });
  assert.match(explained, /\n {11}rule: a measurement that does not meet the comparison of its target\n {11}basis: the uses of the model include identifying acceptance criteria .+ \(ISO\/IEC 25010, Product quality model, second edition \(ISO\), https:\/\/www\.iso\.org\/standard\/78176\.html\)\n/);
  assert.match(explained, /the tool's own choice: every measurement of a metric is compared/);
  const empty = toText(reportOf({ targets: { 'x.csv': 'characteristic,metric,target\n' } }, { required: [] }));
  assert.ok(empty.includes('Targets missed (0)\n\n  none\n'));
  assert.ok(empty.includes('Findings (0)\n\n  none\n'));
  assert.ok(empty.includes('targets: 0 targets: 0 met, 0 missed, 0 unverified; 0 measurements, 0 with no target\n'));
  assert.deepEqual(KIND_NAMES.json, ['JSON file', 'JSON files']);
});

test('json: the whole report, without the sources unless --explain', () => {
  const r = checkOf([{ owner: '' }, { metric: 'p95', unit: 'ms', target: '<= 300' }], [{}, { metric: 'p95', value: '0.2', unit: 's' }]);
  const out = JSON.parse(toJson(r));
  assert.deepEqual(Object.keys(out), ['tool', 'version', 'input', 'config', 'summary', 'results', 'findings', 'totals', 'result', 'notes', 'notice']);
  assert.deepEqual(Object.keys(out.findings[0]), ['rule', 'level', 'file', 'line', 'column', 'at', 'characteristic', 'metric', 'found', 'fix']);
  assert.deepEqual(Object.keys(out.summary), ['characteristics', 'totals']);
  assert.deepEqual(out.results[1], { status: 'met', characteristic: 'reliability', subcharacteristic: 'availability', metric: 'p95', target: '<= 300 ms', owner: 'team', file: 't.csv', line: 3, source: 'probe', measurement: 'm.csv:3', measured: '200 ms (0.2 s as measured)', gap: '' });
  assert.ok(JSON.parse(toJson(r, { explain: true })).findings[0].basis.length > 0);
  assert.deepEqual(out.result, { pass: true, failOn: 'error', failing: 0, byLevel: { error: 0, warning: 1, info: 0 }, text: 'PASS - no finding at or above error (1 warning)' });
  assert.equal(out.tool, 'quality-target-check');
});

test('github: one workflow command per finding, with its properties and message escaped, then a summary line', () => {
  const line = 'reliability,availability,"100%\n::error",%,,>= 99,team,probe';
  const text = `${HEADER}\n${line}\n`;
  const r = reportOf({ targets: { 'a,b:c.csv': text }, measurements: { 'm.csv': measurementsCsv({ metric: '100%\n::error', value: '98' }) } }, { required: [] });
  const lines = toGithub(r).trimEnd().split('\n');
  assert.equal(lines.length, 2, 'the line break in the metric starts no command');
  assert.equal(lines[0], `::error file=a%2Cb%3Ac.csv,line=${lineOf(text, '>= 99')},col=${columnOf(text, '>= 99')},title=quality-target-check target-missed::the target "100%25 ::error" of reliability (>= 99%25) is missed: measured 98%25 at m.csv:2 (source: probe), 1%25 under it; fix: improve the application until the measurement meets the target, or change the target in a reviewed commit when the need has changed`);
  assert.equal(lines[1], 'quality-target-check: 1 target (0 met, 1 missed, 0 unverified), 1 finding; RESULT: FAIL - 1 finding at or above error (1 error)');
  const info = toGithub(checkOf([{}], [{}, { metric: 'z', value: '1' }]));
  assert.match(info, /^::notice file=m\.csv,line=3,col=1,title=quality-target-check untargeted-measurement::/);
  assert.match(toGithub(checkOf([{ owner: '' }])), /^::warning file=t\.csv,line=2,col=\d+,title=quality-target-check missing-owner::/);
  assert.equal(escapeData('a%\r\nb'), 'a%25%0D%0Ab');
  assert.equal(escapeProperty('a:b,c'), 'a%3Ab%2Cc');
});

test('cli: a run writes nothing to disk', async () => {
  await withFiles(WARN, async (dir) => {
    const before = await readdir(resolve(dir), { recursive: true });
    for (const format of ['text', 'json', 'csv', 'github']) assert.equal((await cli([...ARGS, '--format', format], dir)).code, 0);
    assert.deepEqual(await readdir(resolve(dir), { recursive: true }), before);
  });
});
