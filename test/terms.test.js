import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERISTICS, CHARACTERISTIC_NAMES, COMPARISONS, DEFAULT_CHARACTERISTIC_ALIASES, SUBS, SUB_ALIASES, UNITS, UNIT_NAMES, characteristicOf, convert, formatNumber, gapOf, meets, parseQuantity, parseTarget, quantityText, subOf, termForm, unitForm, unitOf } from '../src/index.js';

// The values read from the text of a target and a measurement: characteristics, sub-characteristics, comparisons,
// numbers and units, each with the form next to it that must not match.

test('model: the nine characteristics in the order of the pages, each with its sub-characteristics', () => {
  assert.deepEqual(CHARACTERISTIC_NAMES, ['functional suitability', 'performance efficiency', 'compatibility', 'interaction capability', 'reliability', 'security', 'maintainability', 'flexibility', 'safety']);
  assert.deepEqual(CHARACTERISTICS.map((c) => c.subs.length), [3, 3, 2, 8, 4, 6, 5, 4, 5]);
  assert.equal(SUBS.size, 40, 'no sub-characteristic name is used twice');
  assert.equal(SUBS.get('time behaviour').characteristic, 'performance efficiency');
  assert.equal(SUBS.get('co existence').name, 'co-existence');
  assert.equal(SUBS.get('fail safe').characteristic, 'safety');
});

test('characteristics: by name in any case and spacing, by an alias, and nothing near', () => {
  const aliases = DEFAULT_CHARACTERISTIC_ALIASES;
  assert.deepEqual(characteristicOf('Performance-Efficiency', aliases), { name: 'performance efficiency', alias: false });
  assert.deepEqual(characteristicOf(' RELIABILITY ', aliases), { name: 'reliability', alias: false });
  assert.deepEqual(characteristicOf('Usability', aliases), { name: 'interaction capability', alias: true });
  assert.deepEqual(characteristicOf('portability', aliases), { name: 'flexibility', alias: true });
  assert.deepEqual(characteristicOf('functionality', aliases), { name: 'functional suitability', alias: true });
  assert.deepEqual(characteristicOf('efficiency', aliases), { name: 'performance efficiency', alias: true });
  for (const near of ['reliabilty', 'performance', 'usable', 'secure', 'safety first', '']) assert.equal(characteristicOf(near, aliases), null, near);
  assert.equal(characteristicOf('usability', {}), null, 'an alias taken away is not read');
  assert.equal(characteristicOf('__proto__', aliases), null);
});

test('sub-characteristics: by name, by an older name or spelling, and nothing near', () => {
  assert.deepEqual(subOf('Time Behavior'), { name: 'time behaviour', characteristic: 'performance efficiency', alias: true });
  assert.deepEqual(subOf('time behaviour'), { name: 'time behaviour', characteristic: 'performance efficiency', alias: false });
  assert.deepEqual(subOf('Maturity'), { name: 'faultlessness', characteristic: 'reliability', alias: true });
  assert.deepEqual(subOf('user interface aesthetics'), { name: 'user engagement', characteristic: 'interaction capability', alias: true });
  assert.deepEqual(subOf('accessibility'), { name: 'inclusivity', characteristic: 'interaction capability', alias: true });
  assert.deepEqual(subOf('coexistence').name, 'co-existence');
  assert.deepEqual(subOf('Co-Existence').name, 'co-existence');
  assert.deepEqual(subOf('non repudiation').name, 'non-repudiation');
  for (const near of ['interoperabilty', 'time', 'uptime', 'constructor', '']) assert.equal(subOf(near), null, near);
  for (const [k, v] of Object.entries(SUB_ALIASES)) {
    assert.equal(k, termForm(k), `${k} is written in its term form`);
    assert.ok(SUBS.has(termForm(v)), `${k} stands for a sub-characteristic`);
    assert.ok(!SUBS.has(k), `${k} is not already a name`);
  }
});

test('comparisons: the five of a target, with = read as ==', () => {
  assert.deepEqual(Object.keys(COMPARISONS), ['<=', '>=', '<', '>', '==']);
  assert.deepEqual(parseTarget('<= 300 ms'), { comparison: '<=', number: 300, unit: 'ms' });
  assert.deepEqual(parseTarget('>=99.9%'), { comparison: '>=', number: 99.9, unit: '%' });
  assert.deepEqual(parseTarget('< 2.5 s'), { comparison: '<', number: 2.5, unit: 's' });
  assert.deepEqual(parseTarget('> 0'), { comparison: '>', number: 0, unit: '' });
  assert.deepEqual(parseTarget('== 0 count'), { comparison: '==', number: 0, unit: 'count' });
  assert.deepEqual(parseTarget('= 4'), { comparison: '==', number: 4, unit: '' });
  assert.deepEqual(parseTarget('300', '<='), { comparison: '<=', number: 300, unit: '' });
  assert.deepEqual(parseTarget('<= 300', '<='), { comparison: '<=', number: 300, unit: '' }, 'the same comparison twice is fine');
  assert.deepEqual(parseTarget('-5', '>='), { comparison: '>=', number: -5, unit: '' });
});

test('comparisons: no comparison, two comparisons, an unknown one, or no number are problems', () => {
  assert.match(parseTarget('300 ms').problem, /^the target "300 ms" has no comparison; write one of <=, >=, <, >, ==/);
  assert.match(parseTarget('fast').problem, /has no comparison/);
  assert.match(parseTarget('<= 300', '>=').problem, /holds the comparison <= and the comparison column holds >=/);
  assert.match(parseTarget('300', '=>').problem, /the comparison "=>" is not one of <=, >=, <, >, ==/);
  assert.match(parseTarget('300', 'at most').problem, /the comparison "at most" is not one/);
  assert.match(parseTarget('<= fast').problem, /holds no number the tool can read/);
  assert.match(parseTarget('<= 1,500 ms').problem, /holds no number/, 'no grouping of digits');
  assert.match(parseTarget('<= 2,5 s').problem, /holds no number/, 'no comma for the decimals');
  assert.match(parseTarget('<=').problem, /holds no number/);
  assert.match(parseTarget('=< 3').problem, /holds no number/);
});

test('quantities: a number with an optional unit after it, and nothing else', () => {
  assert.deepEqual(parseQuantity('420 ms'), { number: 420, unit: 'ms' });
  assert.deepEqual(parseQuantity('99.5%'), { number: 99.5, unit: '%' });
  assert.deepEqual(parseQuantity(' .5 '), { number: 0.5, unit: '' });
  assert.deepEqual(parseQuantity('1e3 rps'), { number: 1000, unit: 'rps' });
  assert.deepEqual(parseQuantity('+3'), { number: 3, unit: '' });
  assert.deepEqual(parseQuantity('5.'), { number: 5, unit: '' });
  for (const bad of ['', 'ms', 'abc 4', '1,000', '1.2.3', '1e999', 'NaN', 'Infinity', '- 3']) assert.equal(parseQuantity(bad), null, bad);
});

test('meets: each comparison on both sides of its limit, with twelve significant digits', () => {
  assert.equal(meets(300, '<=', 300), true);
  assert.equal(meets(300.0001, '<=', 300), false);
  assert.equal(meets(300, '<', 300), false);
  assert.equal(meets(299.9, '<', 300), true);
  assert.equal(meets(99.9, '>=', 99.9), true);
  assert.equal(meets(99.89, '>=', 99.9), false);
  assert.equal(meets(99.9, '>', 99.9), false);
  assert.equal(meets(100, '>', 99.9), true);
  assert.equal(meets(0, '==', 0), true);
  assert.equal(meets(1, '==', 0), false);
  assert.equal(meets(0.1 + 0.2, '==', 0.3), true, 'a value converted from another unit compares as the number it stands for');
  assert.equal(meets(convert(0.3, UNIT_NAMES.get('s'), UNIT_NAMES.get('ms')), '<=', 300), true);
});

test('gaps: never negative, in the unit of the target, with no floating point noise', () => {
  assert.equal(gapOf(420, 300), 120);
  assert.equal(gapOf(99.5, 99.9), 0.4);
  assert.equal(gapOf(2, 0), 2);
  assert.equal(gapOf(300, 300), 0);
});

test('units: every name of a unit in any case, the aliases of the configuration, and nothing near', () => {
  assert.equal(unitOf('MS').symbol, 'ms');
  assert.equal(unitOf(' milliseconds ').symbol, 'ms');
  assert.equal(unitOf('mb').symbol, 'MB');
  assert.equal(unitOf('MiB').symbol, 'MiB');
  assert.equal(unitOf('requests  per second').symbol, 'rps');
  assert.equal(unitOf('%').symbol, '%');
  assert.equal(unitOf('percent').symbol, '%');
  assert.equal(unitOf('vulnerabilities').symbol, 'count');
  assert.equal(unitOf(`${String.fromCharCode(0xb5)}s`).symbol, 'us');
  assert.equal(unitOf('req/sec', { 'req/sec': 'rps' }).symbol, 'rps');
  for (const near of ['milisecond', 'msecs', 'mbit', 'percents', '', 'constructor']) assert.equal(unitOf(near), null, near);
  assert.equal(unitOf('req/sec'), null);
  assert.equal(unitForm(' Req /  S '), 'req / s');
  assert.equal(new Set(UNITS.map((u) => u.symbol)).size, UNITS.length);
  let names = 0;
  for (const u of UNITS) names += 1 + u.names.length;
  assert.equal(UNIT_NAMES.size, names, 'no name stands for two units');
});

test('units: conversion within a dimension, and numbers as the reports show them', () => {
  const u = (s) => UNIT_NAMES.get(unitForm(s));
  assert.equal(convert(0.6, u('GiB'), u('MiB')), 614.4);
  assert.equal(convert(0.4, u('h'), u('min')), 24);
  assert.equal(convert(36000, u('rpm'), u('rps')), 600);
  assert.equal(convert(1.5, u('s'), u('ms')), 1500);
  assert.equal(convert(250, u('KB'), u('MB')), 0.25);
  assert.equal(formatNumber(0.1 + 0.2), '0.3');
  assert.equal(formatNumber(-0), '0');
  assert.equal(formatNumber(1234567), '1234567', 'no grouping of digits');
  assert.equal(quantityText(99.5, '%'), '99.5%');
  assert.equal(quantityText(420, 'ms'), '420 ms');
  assert.equal(quantityText(3, ''), '3');
});
