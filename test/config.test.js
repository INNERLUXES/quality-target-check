import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_LIMITS, ConfigError, DEFAULT_CHARACTERISTIC_ALIASES, DEFAULT_FAIL_ON, DEFAULT_MIN_SEVERITY, DEFAULT_REQUIRED, DEFAULT_REQUIRE_ALL, DEFAULT_RULES, DEFAULT_UNIT_ALIASES, KEYS, RULES, defaultConfig, defaultsAsConfig, distance, isObject, kindOf, readConfig, suggestion, validateConfig } from '../src/index.js';

// The configuration file: every key with a good value and a bad one, the suggestions, and the defaults.

const problems = (text) => {
  try {
    readConfig(text, 'c.json');
  } catch (error) {
    assert.ok(error instanceof ConfigError, error.message);
    return error.problems;
  }
  return assert.fail('not refused');
};

test('config: the defaults, and --print-defaults read back gives them', () => {
  const d = defaultConfig();
  assert.deepEqual(d.rules, DEFAULT_RULES);
  assert.deepEqual(d.required, DEFAULT_REQUIRED);
  assert.equal(d.required.length, 9);
  assert.equal(d.requireAll, DEFAULT_REQUIRE_ALL);
  assert.equal(DEFAULT_REQUIRE_ALL, false);
  assert.deepEqual(d.characteristicAliases, DEFAULT_CHARACTERISTIC_ALIASES);
  assert.deepEqual(d.unitAliases, DEFAULT_UNIT_ALIASES);
  assert.deepEqual([d.minSeverity, d.failOn], [DEFAULT_MIN_SEVERITY, DEFAULT_FAIL_ON]);
  const back = readConfig(JSON.stringify(defaultsAsConfig()), 'd.json');
  assert.deepEqual({ ...back, file: null, name: null }, d);
  assert.deepEqual(Object.keys(defaultsAsConfig()), ['name', ...Object.keys(KEYS).filter((k) => k !== 'name')]);
  for (const r of RULES.filter((x) => x.key)) assert.ok(Object.hasOwn(DEFAULT_RULES, r.key), r.key);
});

test('config: every key with a good value', () => {
  const c = readConfig(JSON.stringify({ name: 'Team targets', rules: { targetMissed: 'warning', untargetedMeasurement: 'off' }, required: ['Reliability', 'usability', 'SECURITY'], requireAll: true, characteristicAliases: { Speed: 'Performance Efficiency', efficiency: 'off' }, unitAliases: { 'Req/Sec': 'requests per second', millis: 'ms' }, minSeverity: 'warning', failOn: 'warning' }), 'c.json');
  assert.equal(c.file, 'c.json');
  assert.equal(c.name, 'Team targets');
  assert.equal(c.rules.targetMissed, 'warning');
  assert.equal(c.rules.untargetedMeasurement, 'off');
  assert.deepEqual(c.required, ['interaction capability', 'reliability', 'security'], 'in the order of the model');
  assert.equal(c.requireAll, true);
  assert.equal(c.characteristicAliases.speed, 'performance efficiency');
  assert.ok(!Object.hasOwn(c.characteristicAliases, 'efficiency'));
  assert.deepEqual(c.unitAliases, { 'req/sec': 'rps', millis: 'ms' });
  assert.deepEqual([c.minSeverity, c.failOn], ['warning', 'warning']);
  assert.deepEqual(readConfig('{"required": []}', 'c.json').required, []);
  assert.deepEqual(readConfig('{"required": ["speedy"], "characteristicAliases": {"speedy": "performance efficiency"}}', 'c.json').required, ['performance efficiency'], 'the list is read with the aliases');
});

test('config: an unknown key is an error with its line and a suggestion', () => {
  assert.deepEqual(problems('{\n  "failOm": "info",\n  "rules": {\n    "targetMised": "off"\n  }\n}'), ['c.json: line 2: "failOm" is not a key of the configuration; did you mean "failOn"?', 'c.json: line 4: "targetMised" is not a key of rules; did you mean "targetMissed"?']);
  assert.deepEqual(problems('{"requireAl": true}'), ['c.json: line 1: "requireAl" is not a key of the configuration; did you mean "requireAll"?']);
  assert.deepEqual(problems('{"colour": 1}'), ['c.json: line 1: "colour" is not a key of the configuration']);
});

test('config: a value of the wrong kind for every key', () => {
  assert.deepEqual(problems('[]'), ['c.json: line 1: the configuration must be a JSON object, not a list']);
  assert.match(problems('{"name": ""}')[0], /name must be a text of 1 to 120 characters/);
  assert.match(problems('{"rules": []}')[0], /rules must be an object, not a list/);
  assert.match(problems('{"rules": {"missingOwner": "fatal"}}')[0], /rules\.missingOwner must be one of info, warning, error, off, not "fatal"/);
  assert.match(problems('{"rules": {"missingOwner": 1}}')[0], /not a number/);
  assert.match(problems('{"required": "safety"}')[0], /required must be a list of characteristics, not a string/);
  assert.match(problems('{"required": [1]}')[0], /required\[0\] must be the name of a characteristic, not a number/);
  assert.match(problems('{"required": ["safty"]}')[0], /"safty" is not a characteristic of ISO\/IEC 25010; did you mean "safety"\?/);
  assert.match(problems('{"required": ["safety", "Safety"]}')[0], /"Safety" names safety, which the list already holds/);
  assert.match(problems('{"requireAll": "yes"}')[0], /requireAll must be true or false, not a string/);
  assert.match(problems('{"minSeverity": "fatal"}')[0], /minSeverity must be one of info, warning, error/);
  assert.match(problems('{"failOn": null}')[0], /failOn must be one of info, warning, error/);
});

test('config: characteristic aliases that cannot be used', () => {
  assert.match(problems('{"characteristicAliases": []}')[0], /characteristicAliases must be an object of names to characteristics, not a list/);
  assert.match(problems('{"characteristicAliases": {"Reliability": "safety"}}')[0], /"Reliability" is already the name of a characteristic/);
  assert.match(problems('{"characteristicAliases": {"speed": "fast"}}')[0], /characteristicAliases\.speed must be one of functional suitability, .+, or off, not "fast"/);
  assert.match(problems('{"characteristicAliases": {"speed": "relability"}}')[0], /did you mean "reliability"\?/);
  assert.match(problems('{"characteristicAliases": {"speed": "safety", "SPEED": "safety"}}')[0], /"SPEED" is the same name as "speed" once compared \(speed\)/);
  assert.match(problems('{"characteristicAliases": {"speed": "off"}}')[0], /"speed" is not a built-in alias, so it cannot be set off/);
  assert.match(problems('{"characteristicAliases": {"--": "safety"}}')[0], /"--" must hold 1 to 100 characters with a letter or a digit/);
  const many = Object.fromEntries(Array.from({ length: CONFIG_LIMITS.maxAliases + 1 }, (_, i) => [`n${i}`, 'safety']));
  assert.match(problems(JSON.stringify({ characteristicAliases: many }))[0], /holds more than 500 names/);
});

test('config: unit aliases that cannot be used', () => {
  assert.match(problems('{"unitAliases": "ms"}')[0], /unitAliases must be an object of names to units, not a string/);
  assert.match(problems('{"unitAliases": {"MS": "s"}}')[0], /"MS" is already the name of a unit \(ms\)/);
  assert.match(problems('{"unitAliases": {"lightyear": "ly"}}')[0], /unitAliases\.lightyear must be a unit the tool knows, such as ns, us, ms, s, min, h, d, % \(docs\/inputs\.md lists them\), not "ly"/);
  assert.match(problems('{"unitAliases": {"millis": "mss"}}')[0], /did you mean "ms"\?/);
  assert.match(problems('{"unitAliases": {"Ab": "ms", "ab": "ms"}}')[0], /"ab" is the same name as "Ab" once compared/);
  assert.match(problems('{"unitAliases": {" ": "ms"}}')[0], /must hold 1 to 100 characters/);
  assert.match(problems('{"unitAliases": {"x": 1}}')[0], /not a number/);
});

test('config: a repeated name and JSON that does not parse are refused, and the problems are in the order of their lines', () => {
  assert.match(problems('{"failOn": "info", "failOn": "error"}')[0], /^c\.json: line 1, column 20: the name "failOn" appears twice/);
  assert.match(problems('{"failOn": "info",}')[0], /^c\.json: line 1, column 19: a comma before the closing brace/);
  assert.deepEqual(problems('{\n"failOn": 1,\n"minSeverity": 2,\n"zz": 3\n}').map((p) => p.split(':')[1].trim()), ['line 2', 'line 3', 'line 4']);
});

test('config: suggestions, edit distance and the kinds of values', () => {
  assert.equal(distance('nmae', 'name'), 1);
  assert.equal(distance('', 'abc'), 3);
  assert.equal(distance('kitten', 'sitting'), 3);
  assert.equal(suggestion('relability', ['reliability', 'safety']), '; did you mean "reliability"?');
  assert.equal(suggestion('x', ['reliability']), '');
  assert.equal(suggestion('y'.repeat(65), ['reliability']), '');
  assert.equal(kindOf(null), 'null');
  assert.equal(kindOf([]), 'a list');
  assert.equal(kindOf({}), 'an object');
  assert.equal(kindOf(1), 'a number');
  assert.equal(isObject({}), true);
  assert.equal(isObject([]), false);
  assert.throws(() => validateConfig(1), /the configuration must be a JSON object, not a number/);
  assert.deepEqual(validateConfig({}).rules, DEFAULT_RULES);
});
