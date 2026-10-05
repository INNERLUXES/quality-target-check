import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, fieldOf, readRecords, unreadableFile } from '../src/index.js';
import { HEADER, MHEADER, columnOf, lineOf, measurementsCsv, measurementsJson, targetsCsv, targetsJson } from './helpers.js';

// The two kinds of records: targets and measurements, from CSV and JSON, with the names of their columns and keys, and
// the records and files that cannot be read.

const targets = (text, file = 't.csv') => readRecords(text, file, 'targets', file.endsWith('.csv') ? 'csv' : 'json');
const measurements = (text, file = 'm.csv') => readRecords(text, file, 'measurements', file.endsWith('.csv') ? 'csv' : 'json');

test('records: the columns of a targets file by name in any case and form, and of a measurements file', () => {
  for (const [name, field] of [['Characteristic', 'characteristic'], ['Quality characteristic', 'characteristic'], ['Sub-characteristic', 'subCharacteristic'], ['sub_characteristic', 'subCharacteristic'], ['Metric name', 'metric'], ['measure', 'metric'], ['Units', 'unit'], ['operator', 'comparison'], ['Threshold', 'target'], ['goal', 'target'], ['Target value', 'target'], ['owner', 'owner'], ['How it is measured', 'method'], ['measured_by', 'method'], ['Measurement method', 'method']]) assert.equal(fieldOf(name, 'targets'), field, name);
  for (const [name, field] of [['metric', 'metric'], ['Measured value', 'value'], ['result', 'value'], ['actual', 'value'], ['tool', 'source'], ['Source', 'source'], ['UNIT', 'unit']]) assert.equal(fieldOf(name, 'measurements'), field, name);
  for (const name of ['value', 'source', 'notes', '__proto__', 'toString']) assert.equal(fieldOf(name, 'targets'), null, name);
  for (const name of ['target', 'owner', 'method', 'measured by', 'constructor']) assert.equal(fieldOf(name, 'measurements'), null, name);
  assert.deepEqual(ROLES.targets.required, ['characteristic', 'metric', 'target']);
  assert.deepEqual(ROLES.measurements.required, ['metric', 'value']);
});

test('records: a CSV targets file, every value trimmed, with the line and column of each field', () => {
  const text = `${HEADER}\n reliability , availability, uptime ,%,,>= 99,team,probe\n`;
  const r = targets(text);
  assert.equal(r.read, true);
  assert.equal(r.rows, 1);
  assert.deepEqual(r.problems, []);
  const t = r.records[0];
  assert.deepEqual([t.characteristic, t.subCharacteristic, t.metric, t.unit, t.comparison, t.target, t.owner, t.method], ['reliability', 'availability', 'uptime', '%', '', '>= 99', 'team', 'probe']);
  assert.deepEqual([t.line, t.at.target.line, t.at.target.column], [2, 2, columnOf(text, '>= 99')]);
});

test('records: columns in any order, columns the tool does not read named, and empty rows skipped', () => {
  const text = 'Target,notes,Metric,Characteristic,\n<= 3 s,x,load,performance efficiency,\n\n,,,,\n';
  const r = targets(text);
  assert.equal(r.records.length, 1);
  assert.deepEqual(r.ignored, ['notes', '(column 5, no name)']);
  assert.deepEqual([r.records[0].metric, r.records[0].target, r.records[0].owner], ['load', '<= 3 s', '']);
});

test('records: a CSV header without a column the role needs, or with a column named twice, is a file that cannot be read', () => {
  assert.match(targets('metric,target\nx,<= 1\n').problems[0].found, /^the header line of a targets file names no characteristic column \(it names "metric", "target"\); nothing in the file is read$/);
  assert.match(targets('characteristic\nx\n').problems[0].found, /names no metric or target column/);
  assert.match(measurements('metric,source\nx,y\n').problems[0].found, /the header line of a measurements file names no value column/);
  const header = 'characteristic,metric,target,threshold\n';
  const twice = targets(header);
  assert.equal(twice.problems[0].rule, 'unparsable-file');
  assert.match(twice.problems[0].found, /the header names the target twice, as "target" and "threshold"/);
  assert.equal(twice.problems[0].column, columnOf(header, 'threshold'));
  assert.match(targets('').problems[0].found, /the file is empty; a header line that names the characteristic, metric, target columns was expected/);
  assert.match(measurements('').problems[0].found, /names the metric, value columns was expected/);
});

test('records: a CSV row with the wrong number of fields or no metric is a record that cannot be read', () => {
  const text = `${HEADER}\nreliability,availability\n${targetsCsv({ metric: '' }).split('\n')[1]}\n${targetsCsv({}).split('\n')[1]}\n`;
  const r = targets(text);
  assert.equal(r.records.length, 1);
  assert.equal(r.rows, 3);
  assert.deepEqual(r.problems.map((p) => [p.rule, p.line, p.found]), [
    ['invalid-record', 2, 'this row has 2 fields and the header has 8; the row is not checked'],
    ['invalid-record', 3, 'this row names no metric; the target is not checked']
  ]);
  assert.match(measurements(`${MHEADER}\n,1,ms,x\n`).problems[0].found, /this row names no metric; the measurement is not checked/);
});

test('records: a quote that breaks CSV stops the reading of the file, with its place', () => {
  const r = targets(`${HEADER}\n"open,x\n`);
  assert.equal(r.read, false);
  assert.deepEqual([r.problems[0].rule, r.problems[0].line, r.problems[0].column], ['unparsable-file', 2, 1]);
  assert.match(r.problems[0].found, /a quoted field that is not closed; .*; nothing in the file is read$/);
});

test('records: a JSON list, or an object with a targets or measurements list, keys matched like columns', () => {
  const a = targets('[{"Characteristic": "security", "Metric": "x", "Target": "== 0", "Unit": "count"}]', 't.json');
  assert.deepEqual([a.records[0].characteristic, a.records[0].metric, a.records[0].target], ['security', 'x', '== 0']);
  const b = targets(targetsJson({ characteristic: 'safety', metric: 'y', target: 0, comparison: '==', notes: 'z' }), 't.json');
  assert.deepEqual([b.records[0].target, b.records[0].comparison], ['0', '==']);
  assert.deepEqual(b.ignored, ['notes']);
  const m = measurements(measurementsJson({ metric: 'y', value: 0.25, unit: 's' }, { metric: 'z', value: '420 ms' }), 'm.json');
  assert.deepEqual(m.records.map((x) => [x.metric, x.value, x.unit]), [['y', '0.25', 's'], ['z', '420 ms', '']]);
  const extra = measurements('{"app": "x", "measurements": []}', 'm.json');
  assert.deepEqual(extra.ignored, ['app']);
  assert.equal(extra.rows, 0);
});

test('records: JSON that is not a list of records, or a record that is not an object, cannot be read', () => {
  assert.match(targets('{"records": []}', 't.json').problems[0].found, /the file holds an object; a list of targets, or an object with a "targets" list, was expected/);
  assert.match(measurements('{"targets": []}', 'm.json').problems[0].found, /an object with a "measurements" list, was expected/);
  assert.match(targets('"x"', 't.json').problems[0].found, /the file holds a string/);
  const text = '{"targets": [1, null, ["a"], {"metric": "x", "Metric": "y"}, {"characteristic": "safety"}]}';
  const r = targets(text, 't.json');
  assert.deepEqual(r.problems.map((p) => p.found), [
    'targets[0] is a number, not an object; the target is not checked',
    'targets[1] is null, not an object; the target is not checked',
    'targets[2] is a list, not an object; the target is not checked',
    'targets[3] names the metric twice, as "metric" and "Metric"; the target is not checked',
    'targets[4] names no metric; the target is not checked'
  ]);
  assert.deepEqual(r.problems.map((p) => p.column), [columnOf(text, '1,'), columnOf(text, 'null'), columnOf(text, '["a"]'), columnOf(text, '"y"'), columnOf(text, '{"characteristic"')]);
});

test('records: a JSON value of the wrong kind is taken as empty, and a repeated name stops the reading of the file', () => {
  const r = targets('[{"metric": "x", "owner": ["a"], "method": {"b": 1}, "unit": true, "target": "<= 1"}]', 't.json');
  assert.deepEqual(r.problems.map((p) => p.found), ['[0].owner is a list, not a text or a number; it is taken as empty', '[0].method is an object, not a text or a number; it is taken as empty', '[0].unit is a boolean, not a text or a number; it is taken as empty']);
  assert.deepEqual([r.records[0].owner, r.records[0].method, r.records[0].unit], ['', '', '']);
  const repeated = '[{"metric": "x", "metric": "y"}]';
  const twice = targets(repeated, 't.json');
  assert.equal(twice.problems[0].rule, 'unparsable-file');
  assert.ok(twice.problems[0].found.startsWith(`line 1, column ${columnOf(repeated, '"metric": "y"')}: the name "metric" appears twice in one object`));
  const broken = measurements('[{"metric": "x",}]', 'm.json');
  assert.match(broken.problems[0].found, /a comma before the closing brace/);
});

test('records: the limit of records in a file', () => {
  const many = targets(targetsCsv({}, {}, {}), 't.csv');
  assert.equal(many.records.length, 3);
  const over = readRecords(targetsCsv({}, {}, {}), 't.csv', 'targets', 'csv', { maxRecords: 2 });
  assert.equal(over.problems[0].rule, 'unparsable-file');
  assert.match(over.problems[0].found, /more than 2 records/);
  const overJson = readRecords(measurementsJson({ metric: 'a', value: 1 }, { metric: 'b', value: 2 }), 'm.json', 'measurements', 'json', { maxRecords: 1 });
  assert.match(overJson.problems[0].found, /^more than 1 records; nothing in the file is read$/);
  assert.equal(lineOf(measurementsCsv({}), 'uptime'), 2);
  const u = unreadableFile('x.csv', 'targets', 'csv', 'unreadable-file', 1, 1, 'why');
  assert.deepEqual([u.read, u.records.length, u.problems[0].rule], [false, 0, 'unreadable-file']);
});
