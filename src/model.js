// The product quality model of ISO/IEC 25010, as the two pages of iso25000.com on the standard describe it: nine
// characteristics, each with its sub-characteristics, in the order of the pages. This is a documented data file: a
// change to it is checked against those pages first (CONTRIBUTING.md). Check the pages before you rely on it; the
// standard is revised from time to time, and research/sources.md says what each page holds.
//
// Names are written as the pages write them and compared in their term form (src/words.js), so "Co-existence",
// "co existence" and "CO_EXISTENCE" are one name.

import { termForm } from './words.js';

export const CHARACTERISTICS = [
  { name: 'functional suitability', subs: ['functional completeness', 'functional correctness', 'functional appropriateness'] },
  { name: 'performance efficiency', subs: ['time behaviour', 'resource utilization', 'capacity'] },
  { name: 'compatibility', subs: ['co-existence', 'interoperability'] },
  { name: 'interaction capability', subs: ['appropriateness recognizability', 'learnability', 'operability', 'user error protection', 'user engagement', 'inclusivity', 'user assistance', 'self-descriptiveness'] },
  { name: 'reliability', subs: ['faultlessness', 'availability', 'fault tolerance', 'recoverability'] },
  { name: 'security', subs: ['confidentiality', 'integrity', 'non-repudiation', 'accountability', 'authenticity', 'resistance'] },
  { name: 'maintainability', subs: ['modularity', 'reusability', 'analysability', 'modifiability', 'testability'] },
  { name: 'flexibility', subs: ['adaptability', 'scalability', 'installability', 'replaceability'] },
  { name: 'safety', subs: ['operational constraint', 'risk identification', 'fail safe', 'hazard warning', 'safe integration'] }
];

export const CHARACTERISTIC_NAMES = CHARACTERISTICS.map((c) => c.name);

// Other names of sub-characteristics, in their term form, with the current name each stands for: the older names of
// the first edition of ISO/IEC 25010 and of ISO/IEC 9126, and the other spellings of a name (behavior and behaviour).
// Each is read under the characteristic of the name it stands for. Accessibility stands for inclusivity, the tool's own
// choice: the current model has inclusivity and user assistance where the first edition had accessibility.
export const SUB_ALIASES = {
  maturity: 'faultlessness',
  'user interface aesthetics': 'user engagement',
  accessibility: 'inclusivity',
  'time behavior': 'time behaviour',
  'resource utilisation': 'resource utilization',
  'appropriateness recognisability': 'appropriateness recognizability',
  analyzability: 'analysability',
  coexistence: 'co-existence',
  nonrepudiation: 'non-repudiation',
  'fail safety': 'fail safe',
  'operational constraints': 'operational constraint'
};

// Every sub-characteristic in its term form, with the characteristic it belongs to and its name as the pages write it.
export const SUBS = new Map(CHARACTERISTICS.flatMap((c) => c.subs.map((s) => [termForm(s), { name: s, characteristic: c.name }])));

// The sub-characteristic a name stands for, or null: { name, characteristic, alias } where alias is true for another
// name of SUB_ALIASES.
export function subOf(text) {
  const form = termForm(text);
  if (SUBS.has(form)) return { ...SUBS.get(form), alias: false };
  if (Object.hasOwn(SUB_ALIASES, form)) return { ...SUBS.get(termForm(SUB_ALIASES[form])), alias: true };
  return null;
}
