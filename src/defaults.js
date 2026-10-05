// The built-in configuration: the level of every rule, the characteristics that need a target, whether a missing one is
// an error, the other names of the characteristics and of the units, the lowest level shown and the level that fails
// the run. docs/inputs.md describes every key, and --print-defaults writes all of this out.

import { CHARACTERISTIC_NAMES } from './model.js';

// The level of every rule that the configuration can set. The three rules of input problems are always errors.
export const DEFAULT_RULES = {
  missingCharacteristic: 'warning',
  unknownCharacteristic: 'error',
  unknownSubCharacteristic: 'warning',
  missingMethod: 'warning',
  missingOwner: 'warning',
  unknownUnit: 'error',
  unitMismatch: 'error',
  duplicateTarget: 'warning',
  unverifiedTarget: 'warning',
  targetMissed: 'error',
  untargetedMeasurement: 'info'
};

// The characteristics that need at least one target: all nine of the model.
export const DEFAULT_REQUIRED = [...CHARACTERISTIC_NAMES];

// Whether a required characteristic with no target is an error, whatever the level of rules.missingCharacteristic.
export const DEFAULT_REQUIRE_ALL = false;

// Other names of the characteristics, in the form they are compared in (src/words.js termForm): the names of the first
// edition of ISO/IEC 25010 and of ISO/IEC 9126 before it.
export const DEFAULT_CHARACTERISTIC_ALIASES = {
  usability: 'interaction capability',
  portability: 'flexibility',
  functionality: 'functional suitability',
  efficiency: 'performance efficiency'
};

// Other names of units, in their compared form (src/units.js unitForm), with the symbol of the unit each stands for.
// None is built in beyond the names of src/units.js.
export const DEFAULT_UNIT_ALIASES = {};

// The lowest level of a finding that is shown.
export const DEFAULT_MIN_SEVERITY = 'info';

// The lowest level of a finding that fails the run.
export const DEFAULT_FAIL_ON = 'error';
