// The rules and the result. Each rule names the points of the public pages it rests on (src/data.js), says where it is
// the tool's own choice, and what to change. docs/method.md says exactly what each rule looks at and what it cannot see.
// The checks themselves are in src/records.js and src/compare.js.

import { LEVELS } from './data.js';
import { grouped, listText, plural } from './size.js';

export const RULES = [
  {
    id: 'missing-characteristic',
    key: 'missingCharacteristic',
    title: 'a required characteristic has no target',
    basis: ['nineCharacteristics', 'currentEdition', 'qualityModel'],
    own: 'which characteristics need a target is the tool\'s own choice, set by the required list of the configuration (all nine by default); a target row with the characteristic counts, whether or not its target can be read; a warning, or an error with --require-all or requireAll, which then win over the level of the rule',
    rule: (config) => (config.required.length ? `a characteristic of the required list (${listText(config.required, 9)}) that no target names${config.requireAll ? ', an error because requireAll is on' : ''}` : 'a characteristic of the required list that no target names; the list is empty, so the rule does not report'),
    fix: 'add a target for the characteristic with a metric, a unit, a target value and an owner, or take the characteristic out of the required list of the configuration'
  },
  {
    id: 'unknown-characteristic',
    key: 'unknownCharacteristic',
    title: 'a characteristic is not one of ISO/IEC 25010',
    basis: ['nineCharacteristics', 'formerNames', 'olderModel', 'firstEdition'],
    own: 'a characteristic is compared with the letters A to Z lowered and every other character made a space, with the nine names and the aliases (the older names usability, portability, functionality and efficiency are built in); a near name is suggested, never used; the target is still compared with its measurements',
    rule: (config) => `a target whose characteristic is none of the nine of ISO/IEC 25010 and none of the ${plural(Object.keys(config.characteristicAliases).length, 'alias', 'aliases')} of the configuration, or is empty`,
    fix: 'write one of the nine characteristics, such as performance efficiency or reliability, or add the name your team uses to characteristicAliases in the configuration'
  },
  {
    id: 'unknown-sub-characteristic',
    key: 'unknownSubCharacteristic',
    title: 'a sub-characteristic is not one of its characteristic',
    basis: ['firstSubCharacteristics', 'nextSubCharacteristics', 'olderModel'],
    own: 'a sub-characteristic is optional; when one is written it must be a sub-characteristic of the characteristic of the target, by its name or by an older name or spelling of src/model.js; a warning, because the target can still be checked',
    rule: () => 'a target with a sub-characteristic that is not one of src/model.js, or that belongs to another characteristic',
    fix: 'write a sub-characteristic of the characteristic, such as time behaviour for performance efficiency or availability for reliability, or leave the column empty'
  },
  {
    id: 'missing-method',
    key: 'missingMethod',
    title: 'a target has no measurement method',
    basis: ['measurementDivision', 'acceptanceCriteria'],
    own: 'a method that is empty or a blank word such as none, n/a or tbd; any other text counts as a method, the tool cannot tell whether it measures the metric',
    rule: () => 'a target with an empty measurement method, or a targets file with no method column',
    fix: 'write how the metric is measured: the tool, the test or the query, and where it runs'
  },
  {
    id: 'missing-owner',
    key: 'missingOwner',
    title: 'a target has no owner',
    basis: ['stakeholderNeeds'],
    own: 'an owner per target is the tool\'s own choice: a target that nobody answers for is not kept up to date when the application changes; any text counts as an owner',
    rule: () => 'a target with an empty owner, or a targets file with no owner column',
    fix: 'name the person or team who answers for the target and acts when it is missed'
  },
  {
    id: 'unknown-unit',
    key: 'unknownUnit',
    title: 'a unit is not one the tool knows',
    basis: ['measurementDivision'],
    own: 'a target needs a unit from src/units.js or the unitAliases of the configuration (count and score stand for a number with no other unit); a measurement with no unit takes the unit of its target; a target or measurement with a unit the tool does not know is not compared, and its target counts as unverified',
    rule: (config) => `a target with no unit, or a target or measurement whose unit is none of the units of src/units.js${Object.keys(config.unitAliases).length ? ` and the ${plural(Object.keys(config.unitAliases).length, 'alias', 'aliases')} of the configuration` : ''}, or that names two different units`,
    fix: 'write the unit as one the tool knows, such as ms, s, %, MB, MiB, rps or count, or add the name your team uses to unitAliases in the configuration'
  },
  {
    id: 'unit-mismatch',
    key: 'unitMismatch',
    title: 'a measurement is in a unit that cannot be compared with its target',
    basis: ['measurementDivision', 'acceptanceCriteria'],
    own: 'two units can be compared when they measure the same dimension (time, percentage, data size, rate, count or score), and the measurement is then converted to the unit of the target; a percentage is never read as a count, and a time never as a rate',
    rule: () => 'a measurement whose unit measures another dimension than the unit of its target',
    fix: 'measure the metric in the unit of the target, or correct the unit of the target or of the measurement'
  },
  {
    id: 'duplicate-target',
    key: 'duplicateTarget',
    title: 'a metric has the same comparison twice',
    basis: ['acceptanceCriteria'],
    own: 'two targets with the same metric, compared in their term form, and the same comparison; both are still checked, so the stricter one decides; a lower and an upper limit of one metric are not duplicates',
    rule: () => 'a target whose metric and comparison an earlier target already has',
    fix: 'keep one target per metric and comparison, or name the metrics apart'
  },
  {
    id: 'unverified-target',
    key: 'unverifiedTarget',
    title: 'a target has no measurement',
    basis: ['acceptanceCriteria', 'evaluationDivision'],
    own: 'a measurement belongs to a target when their metrics are the same in their term form; a warning, because a target with no result says nothing about the application yet',
    rule: () => 'a target whose metric has no measurement in the measurements files',
    fix: 'add a measurement of the metric, from the method the target names, to the measurements file'
  },
  {
    id: 'target-missed',
    key: 'targetMissed',
    title: 'a measurement misses its target',
    basis: ['acceptanceCriteria', 'evaluationDivision', 'stakeholderNeeds'],
    own: 'every measurement of a metric is compared with every target of the metric, after conversion to the unit of the target and with twelve significant digits; a target is missed when one of its measurements misses it, and the gap is shown in the unit of the target',
    rule: () => 'a measurement that does not meet the comparison of its target',
    fix: 'improve the application until the measurement meets the target, or change the target in a reviewed commit when the need has changed'
  },
  {
    id: 'untargeted-measurement',
    key: 'untargetedMeasurement',
    title: 'a measurement has no target',
    basis: ['qualityModel'],
    own: 'info by default: a measured value with no target may be a target that was forgotten or a metric written two ways, such as p95 latency and latency p95',
    rule: () => 'a measurement whose metric no target names',
    fix: 'add a target for the metric, or write the metric as its target writes it'
  },
  {
    id: 'invalid-record',
    key: null,
    title: 'a record that cannot be read',
    basis: ['csvSameFields', 'acceptanceCriteria'],
    own: 'a record with no metric, a CSV row with a different number of fields than the header, a JSON record that is not an object or names a field twice, a target with no comparison or no number, and a measurement with no number are not checked; a value of the wrong kind is taken as empty; this rule cannot be set lower or off',
    rule: () => 'a target or measurement with no metric, the wrong number of fields, no target or value the tool can read, or a value of the wrong kind',
    fix: 'correct the record at the line named'
  },
  {
    id: 'unreadable-file',
    key: null,
    title: 'a file that cannot be read',
    basis: ['jsonUtf8', 'csvRecords'],
    own: 'a file that is over its size limit, binary, UTF-16, not valid UTF-8 or not there to open is an error and nothing in it is checked; this rule cannot be set lower or off',
    rule: () => 'a targets or measurements file that the tool could not read as UTF-8 text',
    fix: 'export the file as UTF-8 CSV or JSON'
  },
  {
    id: 'unparsable-file',
    key: null,
    title: 'a file that is not CSV or JSON the readers accept, or not a list of targets or measurements',
    basis: ['csvRecords', 'jsonRepeatedNames'],
    own: 'a quoted CSV field that is not closed, a stray double quote, a header that lacks a column the file needs or names one twice, JSON that does not parse or repeats a name, or JSON that is not a list of records stops the reading of the file, and nothing in it is checked; this rule cannot be set lower or off',
    rule: () => 'a targets or measurements file that the CSV or JSON reader refuses, or whose header or shape is not that of its role',
    fix: 'correct the file at the line and column named'
  }
];

export const ruleById = (id) => RULES.find((r) => r.id === id);

// True when a level is at or above another.
export const atOrAbove = (level, min) => LEVELS.indexOf(level) >= LEVELS.indexOf(min);

// The result: the run fails when a finding is at or above the level failOn. { pass, failOn, failing, byLevel, text }.
export function decide(findings, failOn) {
  const byLevel = { error: 0, warning: 0, info: 0 };
  for (const f of findings) byLevel[f.level] += 1;
  const failing = findings.filter((f) => atOrAbove(f.level, failOn)).length;
  const counts = ['error', 'warning', 'info'].filter((l) => byLevel[l]).map((l) => `${grouped(byLevel[l])} ${l}`);
  const text = failing
    ? `FAIL - ${plural(failing, 'finding')} at or above ${failOn}${counts.length ? ` (${counts.join(', ')})` : ''}`
    : `PASS - no finding at or above ${failOn}${counts.length ? ` (${counts.join(', ')})` : ''}`;
  return { pass: failing === 0, failOn, failing, byLevel, text };
}
