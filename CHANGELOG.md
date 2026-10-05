# Changes

## 1.0.0

First release.

- Checks the quality targets of an application against measured results: one or more targets files and measurements
  files, as CSV (RFC 4180) or JSON (RFC 8259), with the columns and keys matched by name in any case and order. A target
  has a characteristic, an optional sub-characteristic, a metric, a unit, a target with a comparison (`<=`, `>=`, `<`,
  `>`, `==`), an owner and a measurement method; a measurement has a metric, a value with an optional unit and a
  source.
- The nine characteristics of the ISO/IEC 25010 product quality model and their sub-characteristics, as the
  iso25000.com pages describe them, kept as a documented data file (`src/model.js`), with the older names usability,
  portability, functionality and efficiency read as aliases, and older names and spellings of sub-characteristics.
- Units of time, percentage, data size, rate, count and score (`src/units.js`); a measurement in another unit of the
  same dimension is converted to the unit of its target, and numbers are compared with twelve significant digits.
- Eleven rules in three levels: a required characteristic with no target (`missing-characteristic`, an error with
  `--require-all`), an unknown characteristic or sub-characteristic with a near name suggested
  (`unknown-characteristic`, `unknown-sub-characteristic`), no method or owner (`missing-method`, `missing-owner`), an
  unknown unit or units of two dimensions (`unknown-unit`, `unit-mismatch`), the same metric and comparison twice
  (`duplicate-target`), a target with no measurement (`unverified-target`), a measurement that misses its target with
  the gap (`target-missed`), and a measurement with no target (`untargeted-measurement`); and three rules of input
  problems that cannot be lowered (`invalid-record`, `unreadable-file`, `unparsable-file`).
- A summary per characteristic (required, targets, met, missed and unverified) and a table of the targets missed.
- A configuration file in strict JSON over documented defaults: the level of every rule, the required characteristics,
  `requireAll`, aliases for characteristics and units, the minimum severity and the level that fails the run; a key the
  tool does not know is an error with its line and a suggestion, and a key named twice is refused.
- Reports as text, JSON, a CSV result list (`--format csv`) and GitHub workflow commands (`--format github`) that show
  each finding as an annotation; `--min-severity`, `--fail-on`, `--require-all`, `--explain` with the rule and the
  sources of each finding, and `--print-defaults`. Exit code `0` when no finding is at or above the fail-on level, `1`
  when one is, `2` for a usage or input error, with no result.
- Reads no clock, follows no symbolic link, fetches nothing, runs nothing, writes nothing to disk, reports binary,
  UTF-16 and invalid UTF-8 input as errors, neutralizes formulas in the CSV result list, and has a size limit on every
  input.
- A check of the files, not a certification: every report says so.
- Release packages come with a CycloneDX SBOM, SHA-256 checksums and a build provenance attestation, after the SSDF gate
  of the repository.
