import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, atOrAbove, checkTargets, decide, defaultConfig, ruleById } from '../src/index.js';
import { checkOf, findingsOf, reportOf, rulesOf, sortedRules, targetsCsv, measurementsCsv } from './helpers.js';

// Every rule with the form that is reported and the form next to it that is not. Each test changes only the fields
// of the good target and measurement it is about (test/helpers.js).

const only = (r) => sortedRules(r);

test('the good target and measurement give no finding', () => {
  const r = checkOf([{}]);
  assert.deepEqual(rulesOf(r), []);
  assert.deepEqual(r.summary.totals, { targets: 1, met: 1, missed: 0, unverified: 0, measurements: 1, untargeted: 0 });
  assert.deepEqual(r.results.map((x) => x.status), ['met']);
});

test('missing-characteristic: a required characteristic that no target names, warning by default', () => {
  const r = checkOf([{}], [{}], { required: ['reliability', 'security', 'safety'] });
  assert.deepEqual(findingsOf(r, 'missing-characteristic').map((f) => [f.level, f.found, f.at, f.column]), [
    ['warning', 'no target names security, a characteristic of the required list', 't.csv:1', 1],
    ['warning', 'no target names safety, a characteristic of the required list', 't.csv:1', 1]
  ]);
  assert.equal(checkOf([{}], [{}], { required: ['reliability'] }).findings.length, 0, 'a required characteristic with a target');
  assert.equal(checkOf([{}], [{}], { required: [] }).findings.length, 0, 'an empty list requires nothing');
  assert.equal(findingsOf(checkOf([{}], [{}], null), 'missing-characteristic').length, 8, 'all nine are required by default');
});

test('missing-characteristic: an older name counts for its characteristic, and a target that cannot be read still counts', () => {
  assert.equal(checkOf([{ characteristic: 'Usability', subCharacteristic: '' }], [{}], { required: ['interaction capability'] }).findings.length, 0);
  assert.equal(checkOf([{ characteristic: 'portability', subCharacteristic: 'scalability' }], [{}], { required: ['flexibility'] }).findings.length, 0);
  assert.deepEqual(rulesOf(checkOf([{ target: 'fast' }], [{}], { required: ['reliability'] })), ['invalid-record']);
});

test('missing-characteristic: an error with requireAll, whatever the level of the rule', () => {
  const r = checkOf([{}], [{}], { required: ['security'], requireAll: true, rules: { missingCharacteristic: 'off' } });
  assert.deepEqual(findingsOf(r, 'missing-characteristic').map((f) => f.level), ['error']);
  assert.equal(r.result.pass, false);
  assert.equal(findingsOf(checkOf([{}], [{}], { required: ['security'], rules: { missingCharacteristic: 'off' } }), 'missing-characteristic').length, 0);
});

test('unknown-characteristic: a name that is none of the nine, with a near name suggested and never used', () => {
  const r = checkOf([{ characteristic: 'Reliabilty' }]);
  assert.deepEqual(findingsOf(r, 'unknown-characteristic').map((f) => f.found), ['the target "uptime" has the characteristic "Reliabilty", which is not one of the nine of ISO/IEC 25010 or a known alias, did you mean "reliability"?']);
  assert.deepEqual(r.results.map((x) => [x.status, x.characteristic]), [['met', 'Reliabilty']], 'the target is still compared');
  assert.deepEqual(r.summary.characteristics.at(-1), { characteristic: 'Reliabilty', known: false, required: false, targets: 1, met: 1, missed: 0, unverified: 0 });
  assert.match(findingsOf(checkOf([{ characteristic: 'speed' }]), 'unknown-characteristic')[0].found, /alias$/, 'no suggestion when no name is near');
  assert.match(findingsOf(checkOf([{ characteristic: 'n/a' }]), 'unknown-characteristic')[0].found, /^the target "uptime" names no characteristic$/);
  for (const ok of ['RELIABILITY', 'reliability ', 'Performance-Efficiency', 'efficiency', 'functionality', 'usability', 'portability']) assert.equal(findingsOf(checkOf([{ characteristic: ok }]), 'unknown-characteristic').length, 0, ok);
});

test('unknown-characteristic: an alias of the configuration is read, and an older name set off is not', () => {
  assert.equal(checkOf([{ characteristic: 'speed', subCharacteristic: 'capacity' }], [{}], { required: [], characteristicAliases: { speed: 'performance efficiency' } }).findings.length, 0);
  assert.equal(findingsOf(checkOf([{ characteristic: 'usability' }], [{}], { required: [], characteristicAliases: { usability: 'off' } }), 'unknown-characteristic').length, 1);
});

test('unknown-sub-characteristic: a name that is not one of the model, or that belongs to another characteristic', () => {
  const r = checkOf([{ subCharacteristic: 'availabilty' }, { metric: 'b', subCharacteristic: 'scalability' }], [{}, { metric: 'b' }]);
  assert.deepEqual(findingsOf(r, 'unknown-sub-characteristic').map((f) => [f.level, f.found]), [
    ['warning', 'the target "uptime" of reliability has the sub-characteristic "availabilty", which is not one of ISO/IEC 25010, did you mean "availability"?'],
    ['warning', 'the target "b" of reliability has the sub-characteristic "scalability", which belongs to flexibility']
  ]);
  for (const ok of ['', 'n/a', 'Availability', 'maturity', 'Fault-Tolerance', 'recoverability']) assert.equal(checkOf([{ subCharacteristic: ok }]).findings.length, 0, ok);
  assert.equal(checkOf([{ characteristic: 'performance efficiency', subCharacteristic: 'time behavior' }]).findings.length, 0);
  assert.equal(findingsOf(checkOf([{ characteristic: 'speedy', subCharacteristic: 'time behaviour' }]), 'unknown-sub-characteristic').length, 0, 'any sub-characteristic of the model, when the characteristic is unknown');
  assert.equal(checkOf([{ subCharacteristic: 'x' }]).results[0].subcharacteristic, 'x');
  assert.equal(checkOf([{ subCharacteristic: 'Maturity' }]).results[0].subcharacteristic, 'faultlessness');
});

test('missing-method and missing-owner: empty or a blank word, and any other text counts', () => {
  const r = checkOf([{ method: '', owner: 'tbd' }]);
  assert.deepEqual(r.findings.map((f) => [f.rule, f.level, f.found]), [
    ['missing-owner', 'warning', 'the target "uptime" of reliability has no owner'],
    ['missing-method', 'warning', 'the target "uptime" of reliability names no measurement method']
  ]);
  assert.equal(checkOf([{ method: 'x', owner: 'y' }]).findings.length, 0);
  const noColumns = reportOf({ targets: { 't.csv': 'characteristic,metric,unit,target\nreliability,uptime,%,>= 99\n' }, measurements: { 'm.csv': measurementsCsv({}) } }, { required: [] });
  assert.deepEqual(sortedRules(noColumns), ['missing-method', 'missing-owner']);
  assert.ok(noColumns.findings.every((f) => f.line === 2));
});

test('unknown-unit: a target with no unit, a unit the tool does not know, or two units, is not compared', () => {
  const r = checkOf([{ unit: '' }, { metric: 'b', unit: 'milisecond', target: '<= 3' }, { metric: 'c', unit: 'ms', target: '<= 3 s' }], [{}, { metric: 'b', value: '1' }, { metric: 'c', value: '1' }]);
  assert.deepEqual(findingsOf(r, 'unknown-unit').map((f) => f.found), [
    'the target "uptime" of reliability has no unit; the target is not compared',
    'the target "b" of reliability has the unit "milisecond", which is not one the tool knows, did you mean "millisecond"?; the target is not compared',
    'the target "c" of reliability names two units, "ms" in the unit column and "s" after the number; the target is not compared'
  ]);
  assert.deepEqual(r.results.map((x) => x.status), ['unverified', 'unverified', 'unverified']);
  assert.equal(checkOf([{ unit: '', target: '>= 99 %' }]).findings.length, 0, 'the unit after the number');
  assert.equal(checkOf([{ unit: 'percent', target: '>= 99%' }]).findings.length, 0, 'two names of one unit');
  assert.equal(checkOf([{ unit: 'n/a', target: '>= 99%' }]).findings.length, 0, 'a blank unit column and the unit after the number');
});

test('unknown-unit: a measurement with a unit the tool does not know is not compared; one with no unit takes the unit of its target', () => {
  const r = checkOf([{}], [{ unit: 'pct.' }]);
  assert.deepEqual(r.findings.map((f) => [f.rule, f.found, f.file]), [['unknown-unit', 'the measurement of "uptime" has the unit "pct.", which is not one the tool knows, did you mean "pct"?; it is not compared', 'm.csv']]);
  assert.deepEqual(r.results.map((x) => [x.status, x.measured]), [['unverified', '99.5 pct.']]);
  assert.deepEqual(checkOf([{}], [{ unit: '' }]).results.map((x) => [x.status, x.measured]), [['met', '99.5%']]);
  assert.match(checkOf([{}], [{ unit: 'ms', value: '1 s' }]).findings[0].found, /names two units, "ms" in the unit column and "s" after the number/);
  assert.equal(checkOf([{ unit: 'parsec' }], [{}], { required: [], unitAliases: { parsec: '%' } }).findings.length, 0, 'an alias of the configuration');
});

test('unit-mismatch: a measurement in a unit of another dimension, at the measurement', () => {
  const r = checkOf([{ unit: 'min', target: '<= 15' }], [{ value: '12', unit: 'MB' }]);
  assert.deepEqual(r.findings.map((f) => [f.rule, f.level, f.found, f.at]), [['unit-mismatch', 'error', 'the measurement of "uptime" is in MB (data size) and its target at t.csv:2 is in min (time); it is not compared', 'm.csv:2']]);
  assert.deepEqual(r.results.map((x) => x.status), ['unverified']);
  assert.equal(checkOf([{ unit: 'min', target: '<= 15' }], [{ value: '0.2', unit: 'h' }]).findings.length, 0, 'another unit of the same dimension');
  assert.equal(findingsOf(checkOf([{ unit: '%', target: '<= 1' }], [{ value: '3', unit: 'count' }]), 'unit-mismatch').length, 1, 'a percentage is not a count');
  assert.equal(findingsOf(checkOf([{ unit: 's', target: '<= 1' }], [{ value: '3', unit: 'rps' }]), 'unit-mismatch').length, 1, 'a time is not a rate');
});

test('duplicate-target: the same metric and comparison twice, and a lower and an upper limit are not duplicates', () => {
  const r = checkOf([{}, { target: '>= 99.5' }, { target: '<= 100' }, { metric: 'UPTIME', target: '>= 90' }]);
  assert.deepEqual(findingsOf(r, 'duplicate-target').map((f) => [f.line, f.found]), [
    [3, 'the target "uptime" of reliability has the comparison >= a second time; the first target is at t.csv:2'],
    [5, 'the target "UPTIME" of reliability has the comparison >= a second time; the first target is at t.csv:2']
  ]);
  assert.equal(r.summary.totals.targets, 4, 'every duplicate is still checked');
  assert.equal(checkOf([{}, { target: '> 99' }]).findings.length, 0, '>= and > are two comparisons');
});

test('unverified-target: a target whose metric has no measurement', () => {
  const r = checkOf([{}, { metric: 'p95', unit: 'ms', target: '<= 300' }]);
  assert.deepEqual(r.findings.map((f) => [f.rule, f.level, f.found, f.line]), [['unverified-target', 'warning', 'the target "p95" of reliability (<= 300 ms) has no measurement', 3]]);
  assert.deepEqual(r.summary.totals, { targets: 2, met: 1, missed: 0, unverified: 1, measurements: 1, untargeted: 0 });
  assert.equal(checkOf([{ metric: 'P95 Latency' }], [{ metric: 'p95-latency' }]).findings.length, 0, 'metrics are compared in their term form');
});

test('target-missed: each comparison with the gap in the unit of the target', () => {
  const cases = [
    [{ unit: 'ms', target: '<= 300' }, { value: '420', unit: 'ms' }, '(<= 300 ms) is missed: measured 420 ms at m.csv:2 (source: probe), 120 ms over it'],
    [{ unit: '%', target: '>= 99.9' }, { value: '99.5' }, '(>= 99.9%) is missed: measured 99.5% at m.csv:2 (source: probe), 0.4% under it'],
    [{ unit: 'count', target: '== 0' }, { value: '2', unit: '' }, '(== 0 count) is missed: measured 2 count at m.csv:2 (source: probe), 2 count off it'],
    [{ unit: 's', target: '< 2.5' }, { value: '2.5', unit: 's' }, '(< 2.5 s) is missed: measured 2.5 s at m.csv:2 (source: probe), at the limit, which < does not allow'],
    [{ unit: 'rps', target: '> 500' }, { value: '30000', unit: 'rpm' }, '(> 500 rps) is missed: measured 500 rps (30000 rpm as measured) at m.csv:2 (source: probe), at the limit, which > does not allow'],
    [{ unit: 'MiB', target: '<= 512' }, { value: '0.6', unit: 'GiB', source: '' }, '(<= 512 MiB) is missed: measured 614.4 MiB (0.6 GiB as measured) at m.csv:2, 102.4 MiB over it']
  ];
  for (const [t, m, found] of cases) {
    const r = checkOf([t], [m]);
    assert.deepEqual(rulesOf(r), ['target-missed'], found);
    assert.equal(r.findings[0].found, `the target "uptime" of reliability ${found}`);
    assert.equal(r.findings[0].level, 'error');
    assert.equal(r.findings[0].at, 't.csv:2', 'the finding is at the target');
    assert.equal(r.results[0].status, 'missed');
  }
});

test('target-missed: each comparison met on the edge it allows', () => {
  for (const [t, m] of [[{ unit: 'ms', target: '<= 300' }, { value: '0.3', unit: 's' }], [{ unit: '%', target: '>= 99.9' }, { value: '99.9' }], [{ unit: 'count', target: '== 0' }, { value: '0', unit: 'items' }], [{ unit: 's', target: '< 2.5' }, { value: '2499', unit: 'ms' }], [{ unit: 'rps', target: '> 500' }, { value: '30060', unit: 'rpm' }], [{ unit: 'min', target: '<= 30' }, { value: '0.4', unit: 'h' }]]) {
    const r = checkOf([t], [m]);
    assert.deepEqual(rulesOf(r), [], JSON.stringify([t, m]));
    assert.equal(r.results[0].status, 'met');
  }
});

test('target-missed: every measurement of a metric is compared, and one miss misses the target', () => {
  const r = checkOf([{}], [{ value: '99.5', source: 'probe a' }, { value: '98', source: 'probe b' }, { value: '99.9', source: 'probe c' }]);
  assert.deepEqual(r.results.map((x) => [x.status, x.source]), [['met', 'probe a'], ['missed', 'probe b'], ['met', 'probe c']]);
  assert.deepEqual(findingsOf(r, 'target-missed').map((f) => f.found), ['the target "uptime" of reliability (>= 99%) is missed: measured 98% at m.csv:3 (source: probe b), 1% under it']);
  assert.deepEqual(r.summary.totals, { targets: 1, met: 0, missed: 1, unverified: 0, measurements: 3, untargeted: 0 });
  const two = checkOf([{}, { target: '<= 99.6' }], [{ value: '99.8' }]);
  assert.deepEqual(two.results.map((x) => x.status), ['met', 'missed'], 'one measurement for a lower and an upper limit');
});

test('untargeted-measurement: a measurement whose metric no target names, info by default', () => {
  const r = checkOf([{}], [{}, { metric: 'error budget burn', value: '0.7', unit: 'score', source: 'slo export' }, { metric: 'x', value: '1', unit: '', source: '' }]);
  assert.deepEqual(findingsOf(r, 'untargeted-measurement').map((f) => [f.level, f.found]), [
    ['info', 'the measurement of "error budget burn", 0.7 score from slo export, names a metric that no target has'],
    ['info', 'the measurement of "x", 1, names a metric that no target has']
  ]);
  assert.equal(r.summary.totals.untargeted, 2);
  assert.equal(checkOf([{ target: 'fast' }], [{}]).findings.filter((f) => f.rule === 'untargeted-measurement').length, 0, 'a target that cannot be read still names its metric');
});

test('invalid-record: a target with no value, no comparison or no number, and a measurement with no number', () => {
  const r = checkOf([{ target: '' }, { metric: 'b', target: '300' }, { metric: 'c', target: '<= fast' }, { metric: 'd', comparison: '=>', target: '3' }], [{ metric: 'e', value: '' }, { metric: 'f', value: 'slow' }, { metric: 'g', value: '1,500' }]);
  assert.deepEqual(findingsOf(r, 'invalid-record').map((f) => [f.file, f.found]), [
    ['t.csv', 'the target "uptime" of reliability has no target value; the target is not checked'],
    ['t.csv', 'the target "b" of reliability: the target "300" has no comparison; write one of <=, >=, <, >, == in front of the number or in the comparison column; the target is not checked'],
    ['t.csv', 'the target "c" of reliability: the target "<= fast" holds no number the tool can read; write it with a point for the decimals and no grouping, such as 99.9 or 1500; the target is not checked'],
    ['t.csv', 'the target "d" of reliability: the comparison "=>" is not one of <=, >=, <, >, ==; the target is not checked'],
    ['m.csv', 'the measurement of "e" has no value; it is not compared'],
    ['m.csv', 'the measurement of "f" has the value "slow", which holds no number the tool can read; it is not compared'],
    ['m.csv', 'the measurement of "g" has the value "1,500", which holds no number the tool can read; it is not compared']
  ]);
  assert.equal(r.summary.totals.targets, 0, 'a target that cannot be read is not counted');
  assert.equal(checkOf([{ comparison: '>=', target: '99' }]).findings.length, 0, 'the comparison in its own column');
  assert.equal(checkOf([{ comparison: '=', target: '99.5' }]).findings.length, 0, '= is read as ==');
});

test('the levels of the rules come from the configuration, and a rule set off reports nothing', () => {
  const r = checkOf([{ owner: '' }], [{}], { required: [], rules: { missingOwner: 'error' } });
  assert.deepEqual(r.findings.map((f) => f.level), ['error']);
  const off = checkOf([{ owner: '' }], [{}], { required: [], rules: { missingOwner: 'off' } });
  assert.equal(off.findings.length, 0);
  assert.ok(off.notes.includes('1 rule is off: missing-owner'));
  const info = checkOf([{}], [{}, { metric: 'z', value: '1' }], { required: [], rules: { untargetedMeasurement: 'error' } });
  assert.equal(info.result.pass, false);
});

test('rules: atOrAbove and the result of a run', () => {
  assert.equal(atOrAbove('error', 'warning'), true);
  assert.equal(atOrAbove('info', 'warning'), false);
  assert.deepEqual(decide([], 'error'), { pass: true, failOn: 'error', failing: 0, byLevel: { error: 0, warning: 0, info: 0 }, text: 'PASS - no finding at or above error' });
  assert.equal(decide([{ level: 'warning' }, { level: 'info' }], 'warning').text, 'FAIL - 1 finding at or above warning (1 warning, 1 info)');
  assert.equal(ruleById('target-missed').key, 'targetMissed');
  assert.deepEqual(RULES.filter((r) => r.key === null).map((r) => r.id), ['invalid-record', 'unreadable-file', 'unparsable-file']);
});

test('the findings are sorted by level, file, line, column and rule; the summary lists the nine first', () => {
  const r = reportOf({ targets: { 'b.csv': targetsCsv({ owner: '' }), 'a.csv': targetsCsv({ metric: 'x', unit: 'zz' }) }, measurements: { 'm.csv': measurementsCsv({}) } }, { required: [] });
  assert.deepEqual(r.findings.map((f) => [f.level, f.rule, f.file]), [['error', 'unknown-unit', 'a.csv'], ['warning', 'missing-owner', 'b.csv'], ['warning', 'unverified-target', 'a.csv']]);
  assert.deepEqual(r.summary.characteristics.map((c) => c.characteristic).slice(0, 3), ['functional suitability', 'performance efficiency', 'compatibility']);
  assert.equal(r.summary.characteristics.length, 9);
});

test('checkTargets: no targets file gives no missing-characteristic finding and an empty summary', () => {
  const out = checkTargets([], [], { ...defaultConfig(), required: ['safety'] });
  assert.deepEqual(out.findings, []);
  assert.equal(out.summary.totals.targets, 0);
});
