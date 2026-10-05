import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdir, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CsvError, FILE_LIMITS, JsonError, LIMITS, MAX_PROBLEMS, characteristicOf, parseCsv, parseJson, parseQuantity, parseTarget, subOf, unitOf } from '../src/index.js';
import { HEADER, MHEADER, cli, measurementsCsv, measurementsJson, reportOf, rulesOf, run, targetsCsv, withFiles } from './helpers.js';

// Hostile input: files built to exhaust the memory or the time, to make the tool follow a link, to rewrite the
// terminal, to start a second workflow command, to slip a formula into a spreadsheet or to change how objects behave.
// Each heavy test also checks the time, because work that grows faster than the input is a failure even when the
// answer is right. Tests that need a symbolic link, a device or file permissions are guarded with process.platform,
// and none of them asserts a line: lines are asserted in the tests that run everywhere.

const LIMIT = { timeout: 180000 };
// Coverage counting slows every line of the tool several times over, so a run with --experimental-test-coverage gets a
// wider time limit. A plain `npm test` keeps the tight one, and that is the run that guards against slow growth.
// The runner sets NODE_V8_COVERAGE for its test processes only when coverage is on.
const COVERAGE = Boolean(process.env.NODE_V8_COVERAGE);
const fast = async (fn, ms = 5000) => {
  const limit = COVERAGE ? ms * 4 : ms;
  const start = Date.now();
  const result = await fn();
  assert.ok(Date.now() - start < limit, `took ${Date.now() - start} ms`);
  return result;
};

const NONE = { 'c.json': '{"required": []}' };
const GOOD = { 't.csv': targetsCsv({}), 'm.csv': measurementsCsv({}), ...NONE };

test('hostile: a file over its size limit is an error finding, a configuration over its limit stops the run', LIMIT, async () => {
  const big = await fast(() => run({ ...GOOD, 'big.csv': `${MHEADER}\n${' '.repeat(FILE_LIMITS.maxFileBytes)}` }, ['t.csv', '--measurements', 'm.csv', '--measurements', 'big.csv', '--config', 'c.json']));
  assert.equal(big.code, 1);
  assert.match(big.out, /big\.csv:1\n {11}the file cannot be read: [\d,]+ bytes is over the 32 MB limit; nothing in it is checked/);
  const config = await run({ ...GOOD, 'c.json': ' '.repeat(FILE_LIMITS.maxConfigBytes + 1) }, ['t.csv', '--config', 'c.json']);
  assert.equal(config.code, 2);
  assert.match(config.err, /c\.json: [\d,]+ bytes is over the 1 MB limit/);
});

test('hostile: a hundred thousand targets and measurements, each with every check to run, are checked in seconds', LIMIT, async () => {
  const n = 100000;
  const targets = Array.from({ length: n }, (_, i) => ({ characteristic: i % 3 ? 'performance efficiency' : 'Reliabilty', subCharacteristic: i % 2 ? 'time behaviour' : 'scalability', metric: `m${i}`, unit: 'ms', target: '<= 300', owner: '', method: 'k6' }));
  const measurements = Array.from({ length: n }, (_, i) => ({ metric: `m${i}`, value: `${i % 2 ? '0.42' : '0.2'}`, unit: 's', source: 'k6' }));
  const r = await fast(() => reportOf({ targets: { 't.csv': targetsCsv(...targets) }, measurements: { 'm.csv': measurementsCsv(...measurements) } }, { required: [] }), 30000);
  assert.equal(r.summary.totals.targets, n);
  assert.equal(r.summary.totals.missed, n / 2);
  assert.equal(r.findings.length, LIMITS.maxFindingsPerRule * 4, 'unknown characteristic, sub-characteristic, owner and missed target findings, each at the limit');
  assert.ok(r.totals.findings > n);
  assert.equal(r.results.length, n);
});

test('hostile: many names the tool does not know get a limited number of suggestions, and each rule lists at most its limit', LIMIT, async () => {
  const rows = Array.from({ length: 3000 }, (_, i) => ({ characteristic: `quality-${i}`, metric: `m${i}`, owner: '' }));
  const r = await fast(() => reportOf({ targets: { 't.csv': targetsCsv(...rows) } }, { required: [] }), 20000);
  assert.equal(r.findings.filter((f) => f.rule === 'unknown-characteristic').length, LIMITS.maxFindingsPerRule);
  assert.ok(r.notes.some((x) => /findings past the limit of 500 per rule are counted but not listed/.test(x)));
  assert.ok(r.notes.some((x) => /2,900 unknown names got no suggestion of a near name, past the limit of 100 suggestions/.test(x)));
});

test('hostile: long values for the patterns of targets, quantities, units and names are read in one pass', LIMIT, async () => {
  const long = (s) => s.repeat(Math.floor(60000 / s.length));
  for (const text of [long('9'), long('9.'), long('<='), `<= ${long('1')}`, long('1e'), long('- '), `1 ${long('m')}`]) {
    await fast(() => {
      parseQuantity(text);
      parseTarget(text, '<=');
      parseTarget(text);
      unitOf(text);
      characteristicOf(text);
      subOf(text);
    });
  }
  const r = await fast(() => reportOf({ targets: { 't.csv': targetsCsv({ characteristic: long('reliability '), subCharacteristic: long('x'), unit: long('ms '), target: '>= 9' }) }, measurements: { 'm.csv': measurementsCsv({ value: long('9'), unit: long('%') }) } }, { required: [] }));
  assert.deepEqual(rulesOf(r).sort(), ['invalid-record', 'unknown-characteristic', 'unknown-sub-characteristic', 'unknown-unit', 'unverified-target']);
});

test('hostile: long runs of quotes, commas, line breaks, brackets and escapes are read or refused in one pass', LIMIT, async () => {
  for (const text of [
    '"'.repeat(500001),
    `"${'""'.repeat(30000)}"`,
    ','.repeat(999),
    '\n'.repeat(500000),
    '\r'.repeat(500000),
    `a${'"'.repeat(500000)}`,
    `"a"${'x'.repeat(500000)}`
  ]) {
    await fast(() => {
      try {
        parseCsv(text);
      } catch (error) {
        assert.ok(error instanceof CsvError, error.message);
      }
    });
  }
  for (const text of ['['.repeat(500000), `[${'1,'.repeat(200000)}1]`, `"${'\\"'.repeat(200000)}"`, `{${'"a":1,'.repeat(10)}`, '{"a":'.repeat(100000)]) {
    await fast(() => {
      try {
        parseJson(text, { maxValues: 5000000, maxStringLength: 1000000 });
      } catch (error) {
        assert.ok(error instanceof JsonError, error.message);
      }
    });
  }
});

test('hostile: a set of a hundred files of no kind the tool reads lists twenty problems and a count', LIMIT, async () => {
  const files = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`f${String(i).padStart(3, '0')}.txt`, 'x']));
  const r = await fast(() => run(files, Object.keys(files)));
  assert.equal(r.code, 2);
  assert.match(r.err, /the input has problems:/);
  assert.match(r.err, /\n {2}and 80 more\n$/);
  assert.equal(r.err.split('\n').filter((l) => l.startsWith('  f')).length, MAX_PROBLEMS);
});

test('hostile: CRLF, CR and a byte order mark give the same report as LF', async () => {
  const files = {
    't.csv': `${HEADER}\nreliability,availability,uptime,%,,>= 99.9,team,"probe\nevery minute"\nsecurity,,cves,count,,== 0,,scan\n`,
    'm.json': '{\n  "measurements": [\n    {"metric": "uptime", "value": "99.5%", "source": "probe"},\n    {"metric": "cves", "value": 2}\n  ]\n}\n',
    ...NONE
  };
  const lf = await run(files, ['t.csv', '--measurements', 'm.json', '--config', 'c.json', '--json']);
  assert.equal(lf.code, 1, lf.err);
  assert.equal(JSON.parse(lf.out).totals.findings, 3);
  for (const eol of ['\r\n', '\r']) {
    const changed = Object.fromEntries(Object.entries(files).map(([k, v]) => [k, k === 'c.json' ? v : `${String.fromCharCode(0xfeff)}${v.split('\n').join(eol)}`]));
    const r = await run(changed, ['t.csv', '--measurements', 'm.json', '--config', 'c.json', '--json']);
    assert.equal(r.out, lf.out, JSON.stringify(eol));
  }
});

test('hostile: control, escape and direction characters in file names and values never reach the reports', async () => {
  const esc = String.fromCharCode(27);
  const rlo = String.fromCharCode(0x202e);
  const ls = String.fromCharCode(0x2028);
  const name = `p${rlo}.csv`;
  const files = { [name]: `${HEADER}\nRel${esc}[2J,av${rlo},up${ls}time,${esc}%,,>= 99,,pro${rlo}be\n`, 'm.csv': `${MHEADER}\nup${ls}time,9${esc}8,%,pr${esc}obe\n`, ...NONE };
  for (const format of ['text', 'json', 'csv', 'github']) {
    const r = await run(files, [name, '--measurements', 'm.csv', '--config', 'c.json', '--format', format, ...(format === 'text' || format === 'json' ? ['--explain'] : [])]);
    assert.equal(r.code, 1, r.err);
    for (const c of [esc, rlo, ls]) assert.ok(!r.out.includes(c) && !r.err.includes(c), `${format}: ${c.charCodeAt(0)}`);
  }
  const bad = await run({ [`bad${rlo}.txt`]: 'x' }, [`bad${rlo}.txt`]);
  assert.equal(bad.code, 2);
  assert.ok(!bad.err.includes(rlo));
});

test('hostile: a text cannot start a second workflow command', async () => {
  const r = await run({ 't.csv': `${HEADER}\n"%0A::error::x",st,"f\n::error file=x::y",%,,>= 99,,\n`, ...NONE }, ['t.csv', '--config', 'c.json', '--format', 'github']);
  const lines = r.out.trimEnd().split('\n');
  assert.ok(lines.every((l) => l.startsWith('::error ') || l.startsWith('::warning ') || l.startsWith('quality-target-check: ')), r.out);
  assert.ok(r.out.includes('%250A::error::x'));
  assert.equal(lines.length, 6, 'five findings and the summary line');
});

test('hostile: a value that starts with a formula character is not a formula in the CSV result list', async () => {
  const r = await run({ 't.csv': `${HEADER}\nreliability,,"=HYPERLINK(""x"")",%,,>= 99,+team,probe\n`, 'm.csv': `${MHEADER}\n"=HYPERLINK(""x"")",99.5,%,@src\n`, ...NONE }, ['t.csv', '--measurements', 'm.csv', '--config', 'c.json', '--format', 'csv']);
  assert.equal(r.code, 0, r.err);
  const row = r.out.split('\r\n')[1];
  assert.equal(row, `met,reliability,,"'=HYPERLINK(""x"")",>= 99%,99.5%,,'@src,'+team,t.csv,2,m.csv:2`);
});

test('hostile: constructor, toString and __proto__ as values, columns, keys and aliases are only data', async () => {
  const r = reportOf({
    targets: { 'a.csv': 'metric,__proto__,constructor,characteristic,sub-characteristic,unit,target\n__proto__,x,y,toString,constructor,hasOwnProperty,<= 1\nconstructor,x,y,reliability,__proto__,valueOf,<= 1\n' },
    measurements: { 'b.json': measurementsJson({ metric: 'valueOf', value: 1, __proto__: 'x', unit: 'toString' }) }
  }, { required: [] });
  assert.deepEqual(rulesOf(r).sort().filter((x) => !['missing-owner', 'missing-method'].includes(x)), ['unknown-characteristic', 'unknown-sub-characteristic', 'unknown-sub-characteristic', 'unknown-unit', 'unknown-unit', 'unknown-unit', 'untargeted-measurement', 'unverified-target', 'unverified-target']);
  assert.equal(Object.getPrototypeOf({}), Object.prototype);
  assert.equal({}.x, undefined);
  const cfg = await run({ ...GOOD, 'c.json': '{"rules": {"toString": "off"}, "characteristicAliases": {"__proto__": "x"}, "unitAliases": {"constructor": "valueOf"}}' }, ['t.csv', '--config', 'c.json']);
  assert.equal(cfg.code, 2);
  assert.match(cfg.err, /"toString" is not a key of rules/);
  assert.match(cfg.err, /characteristicAliases\.__proto__ must be one of functional suitability/);
  assert.match(cfg.err, /unitAliases\.constructor must be a unit the tool knows/);
});

test('hostile: empty files of both kinds are reported as files the readers refuse, without a crash', async () => {
  const r = await run({ 'a.csv': '', 'b.json': '', 'c.csv': '\n\n', ...NONE }, ['a.csv', 'b.json', '--measurements', 'c.csv', '--config', 'c.json']);
  assert.equal(r.code, 1, r.err);
  assert.match(r.out, /input: targets a\.csv, b\.json \(2 files: 1 CSV file, 1 JSON file; 0 records\); measurements c\.csv \(1 file: 1 CSV file; 0 records\)/);
  assert.match(r.out, /the file is empty; a header line that names the characteristic, metric, target columns was expected/);
  assert.match(r.out, /line 1, column 1: the text ends where a value was expected; nothing in the file is read/);
  assert.match(r.out, /the header line of a measurements file names no metric or value column \(it names ""\)/);
});

test('hostile: a file named through a symbolic link is refused, and so is a configuration', async (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows needs extra rights to make a symbolic link');
    return;
  }
  await withFiles({ 'real/t.csv': targetsCsv({}), 'c.json': '{}' }, async (dir) => {
    await symlink(resolve(dir, 'real/t.csv'), resolve(dir, 'linked.csv'));
    await symlink(resolve(dir, 'c.json'), resolve(dir, 'c-link.json'));
    await mkdir(resolve(dir, 'via'));
    await symlink(resolve(dir, 'real'), resolve(dir, 'via/dir'));
    const r = await cli(['linked.csv'], dir);
    assert.equal(r.code, 2);
    assert.match(r.err, /linked\.csv: is a symbolic link, which is not followed/);
    const m = await cli(['real/t.csv', '--measurements', 'linked.csv'], dir);
    assert.equal(m.code, 2);
    assert.match(m.err, /linked\.csv: is a symbolic link/);
    const c = await cli(['real/t.csv', '--config', 'c-link.json'], dir);
    assert.equal(c.code, 2);
    assert.match(c.err, /c-link\.json: is a symbolic link/);
    const d = await cli(['via/dir'], dir);
    assert.equal(d.code, 2);
    assert.match(d.err, /is a symbolic link, which is not followed/);
  });
});

test('hostile: a device named as targets, measurements or the configuration is refused', LIMIT, async (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows has no /dev/zero to name as an input');
    return;
  }
  await withFiles(GOOD, async (dir) => {
    const config = await fast(() => cli(['t.csv', '--config', '/dev/zero'], dir));
    assert.equal(config.code, 2);
    assert.match(config.err, /is not a regular file/);
    const input = await fast(() => cli(['/dev/zero'], dir));
    assert.equal(input.code, 2);
    assert.match(input.err, /is not a regular file|not a kind of file/);
    const measured = await fast(() => cli(['t.csv', '--measurements', '/dev/zero'], dir));
    assert.equal(measured.code, 2);
  });
});

test('hostile: a file without read access is an error finding, and the rest is still checked', async (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows does not take away read access with chmod');
    return;
  }
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    t.skip('the root user can read a file without read access');
    return;
  }
  await withFiles({ ...GOOD, 'n.csv': measurementsCsv({}) }, async (dir) => {
    await chmod(resolve(dir, 'n.csv'), 0o000);
    try {
      const r = await cli(['t.csv', '--measurements', 'n.csv', '--measurements', 'm.csv', '--config', 'c.json'], dir);
      assert.equal(r.code, 1);
      assert.match(r.out, /the file cannot be read: cannot be read \(EACCES\)/);
      assert.match(r.out, /targets: 1 target: 1 met/);
    } finally {
      await chmod(resolve(dir, 'n.csv'), 0o644);
    }
  });
});
