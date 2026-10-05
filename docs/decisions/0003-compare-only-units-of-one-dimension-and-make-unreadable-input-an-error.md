# 3. Compare only units of one dimension, and make unreadable input an error

## Status

Accepted

## Context

Targets and measurements come from different hands: a target in a requirements sheet says `<= 300 ms`, the load test
reports `0.42` in seconds, a memory target is in MiB and the container metrics in GiB, a coverage target is a
percentage and a script writes a count of lines. Some files are exported from a sheet, saved as UTF-16 or cut short.

A checker could compare the numbers as they are, which reads 0.42 s as meeting a target of 300 ms. It could guess a
unit, and read a value with no unit as seconds or milliseconds by its size. It could skip a row it cannot read. Each of
these makes a run pass, or fail, for a reason nobody can see in the files.

## Decision

1. A target needs a unit that src/units.js or the `unitAliases` of the configuration names. Each unit has a dimension
   and a size; a measurement in another unit of the same dimension is converted to the unit of the target before it is
   compared, and the report shows the value both ways.
2. A measurement with no unit takes the unit of its target; that is the one place the tool assumes a unit, and
   docs/method.md says so. A unit the tool does not know is an `unknown-unit` finding, and a measurement in a unit of
   another dimension is a `unit-mismatch` finding; neither is compared, and the target counts as unverified unless
   another measurement is compared.
3. Two numbers are compared with twelve significant digits, so a value converted from another unit compares as the
   number it stands for, and a gap is shown without floating point noise.
4. A record that cannot be read (no metric, the wrong number of fields, a target or value with no number the tool can
   read) is an `invalid-record` finding and is not checked; a file that cannot be read or parsed is an
   `unreadable-file` or `unparsable-file` finding. These three rules are always errors and have no key in the
   configuration, so a run never passes because a part of the input was passed over.
5. A column or key the tool does not read is named in a note, so a column called `Target value (ms)` that the tool did
   not recognize is visible.

## Consequences

- A clean run means every target names a unit the tool knows and every measurement that was compared was compared in
  the unit of its target.
- A file with many problems gives a long report on the first run; `--min-severity error` and the levels of the rules
  let a team work through it in steps.
- A finding is something a reader can check in one cell of a file.
