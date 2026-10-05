import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CSV_COLUMNS, CsvError, csvField, csvProblem, parseCsv, toCsv } from '../src/index.js';
import { checkOf, reportOf } from './helpers.js';

// The CSV reader as RFC 4180 writes the format, every form closed and left open, and the CSV result list.

const values = (text) => parseCsv(text).map((r) => r.fields.map((f) => f.value));
const refused = (text) => {
  try {
    parseCsv(text);
  } catch (error) {
    assert.ok(error instanceof CsvError, error.message);
    return csvProblem(error, text).text;
  }
  return assert.fail('not refused');
};

test('csv: records end at CRLF, LF or a lone CR, the last line break is optional, and fields are separated by commas', () => {
  assert.deepEqual(values('a,b\r\nc,d\r\n'), [['a', 'b'], ['c', 'd']]);
  assert.deepEqual(values('a,b\nc,d'), [['a', 'b'], ['c', 'd']]);
  assert.deepEqual(values('a,b\rc,d\r'), [['a', 'b'], ['c', 'd']]);
  assert.deepEqual(values('a,,c,\n'), [['a', '', 'c', '']]);
  assert.deepEqual(values(''), []);
  assert.deepEqual(values('\n'), [['']]);
});

test('csv: a quoted field holds commas, line breaks and double quotes written twice; white space is kept', () => {
  assert.deepEqual(values('"a,b","line\none","say ""hi""", x \n'), [['a,b', 'line\none', 'say "hi"', ' x ']]);
  assert.deepEqual(values('"",""""\n'), [['', '"']]);
  assert.deepEqual(values('"a\r\nb",c\r\n'), [['a\r\nb', 'c']]);
});

test('csv: a byte order mark is skipped, and every field has its line and column', () => {
  const records = parseCsv(`${String.fromCharCode(0xfeff)}id,name\n"x\ny",z\nw,v\n`);
  assert.deepEqual(records[0].fields[0].value, 'id');
  assert.deepEqual(records.map((r) => [r.line, r.column]), [[1, 2], [2, 1], [4, 1]]);
  assert.deepEqual(records[1].fields.map((f) => [f.line, f.column]), [[2, 1], [3, 4]]);
});

test('csv: a quoted field that is not closed, a character after a closing quote and a stray quote are refused with their place', () => {
  assert.equal(refused('id\n"open,field\n'), 'line 2, column 1: a quoted field that is not closed; a field that starts with a double quote must end with one');
  assert.equal(refused('id,x\n"a"b,c\n'), 'line 2, column 4: a character after the closing double quote of a field; a double quote inside a quoted field is written twice');
  assert.equal(refused('id,x\nab"c,d\n'), 'line 2, column 3: a double quote inside a field that does not start with one; put the field in double quotes and write the quote twice');
  assert.equal(refused('"a" ,b'), 'line 1, column 4: a character after the closing double quote of a field; a double quote inside a quoted field is written twice');
});

test('csv: the limits of a field, a record and a file', () => {
  assert.throws(() => parseCsv(`${'x'.repeat(11)}\n`, { maxFieldLength: 10 }), /a field longer than 10 characters/);
  assert.throws(() => parseCsv(`"${'x'.repeat(11)}"\n`, { maxFieldLength: 10 }), /a field longer than 10 characters/);
  assert.throws(() => parseCsv(`"${'""'.repeat(11)}"\n`, { maxFieldLength: 10 }), /a field longer than 10 characters/);
  assert.throws(() => parseCsv(`${','.repeat(5)}\n`, { maxFields: 5 }), /a record with more than 5 fields/);
  assert.throws(() => parseCsv('a\nb\nc\n', { maxRecords: 2 }), /more than 2 records/);
  assert.equal(parseCsv('a\nb\n', { maxRecords: 2 }).length, 2);
});

test('csv field: quoted when it holds a comma, a quote or a line break, and a leading formula character neutralized', () => {
  assert.equal(csvField('plain'), 'plain');
  assert.equal(csvField('a,b'), '"a,b"');
  assert.equal(csvField('say "x"'), '"say ""x"""');
  assert.equal(csvField('two\nlines'), '"two\nlines"');
  assert.equal(csvField('=1+2'), "'=1+2");
  assert.equal(csvField('+x'), "'+x");
  assert.equal(csvField('-x'), "'-x");
  assert.equal(csvField('@x'), "'@x");
  assert.equal(csvField('=a,b'), '"\'=a,b"');
  assert.equal(csvField(null), '');
  assert.equal(csvField(3), '3');
});

test('csv result list: one record per target and measurement compared, in the order of the targets, with CRLF line ends and == guarded as a formula', () => {
  const r = checkOf([{}, { metric: 'p95', unit: 'ms', target: '<= 300' }, { metric: 'errors', unit: 'count', target: '== 0' }], [{}, { metric: 'p95', value: '0.42', unit: 's', source: 'k6' }]);
  const out = toCsv(r);
  assert.ok(out.endsWith('\r\n'));
  assert.ok(!out.replace(/\r\n/g, '').includes('\n'));
  const rows = out.trimEnd().split('\r\n');
  assert.equal(rows[0], CSV_COLUMNS.join(','));
  assert.equal(rows[0], 'status,characteristic,subcharacteristic,metric,target,measured,gap,source,owner,file,line,measurement');
  assert.deepEqual(rows.slice(1), [
    'met,reliability,availability,uptime,>= 99%,99.5%,,probe,team,t.csv,2,m.csv:2',
    'missed,reliability,availability,p95,<= 300 ms,420 ms (0.42 s as measured),120 ms,k6,team,t.csv,3,m.csv:3',
    "unverified,reliability,availability,errors,'== 0 count,,,,team,t.csv,4,"
  ]);
});

test('csv result list: a header only with no target, and a name that starts with a formula character or holds a comma is written safely', () => {
  const empty = reportOf({ targets: { 't.csv': 'characteristic,metric,target\n' } }, { required: [] });
  assert.equal(toCsv(empty), `${CSV_COLUMNS.join(',')}\r\n`);
  const rows = toCsv(checkOf([{ metric: '=cmd', owner: '@x,y' }], [{ metric: '=cmd', source: '-s' }])).trimEnd().split('\r\n');
  assert.equal(rows[1], "met,reliability,availability,'=cmd,>= 99%,99.5%,,'-s,\"'@x,y\",t.csv,2,m.csv:2");
});
