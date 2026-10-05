# Method

This document says exactly what the tool reads, how it reads each value, what each rule looks at and cannot see, and
how the report is built. The names used here are the defaults; docs/inputs.md says how the configuration changes them.
The tool is a check of the files, not a certification: it checks that the targets are written against the ISO/IEC
25010 product quality model in a form it can read, and compares them with the measurements it is given. It runs no
measurement and never decides whether a target suits the application.

## What is read

The input is one or more targets files, any number of measurements files and, if given, a configuration file. Each
file named on the command line is read once, in the order named; a folder is not walked. A name ending in `.csv` is
read as CSV and a name ending in `.json` as JSON. Each file is read as UTF-8, with or without a byte order mark, with
LF, CR LF or CR line ends.

A CSV file starts with a header line. Its columns are matched to the fields by name, in any order, with the letters A
to Z lowered and spaces, hyphens and underscores taken out, so `Sub-characteristic`, `sub_characteristic` and
`subCharacteristic` are the same column. A JSON file is a list of records, or an object with a `targets` or
`measurements` list; the keys of a record are matched the same way. Columns and keys the tool does not read are named
in a note. Every value is trimmed of white space at both ends. docs/inputs.md lists the fields.

All the targets files of a run make one list of targets, and all the measurements files one list of measurements, in
the order of the files and of the records in each.

## How a target is read

1. **Blank values.** A value that is empty, a dash, a question mark or a blank word such as `none`, `n/a` or `tbd`
   counts as empty (docs/inputs.md lists the words). In a unit column, `%` is a unit.
2. **The characteristic.** It is compared in its term form (the letters A to Z lowered, every run of other characters
   made one space) with the nine characteristics of src/model.js and the aliases. A name that is neither is reported,
   with the nearest known name suggested when one is within a third of its length; the suggestion is never used.
3. **The sub-characteristic.** When there is one, it is compared in its term form with the sub-characteristics of
   src/model.js and their other names, and must belong to the characteristic of the target.
4. **The target.** A comparison (`<=`, `>=`, `<`, `>` or `==`, with `=` read as `==`), in front of the number or in the
   comparison column, and a number written with a point for the decimals, no grouping and an optional exponent.
5. **The unit.** The unit column, or the text after the number. Both may be given when they name the same unit. The
   unit is compared with the letters A to Z lowered and runs of white space made one space with the units of
   src/units.js and the aliases; each unit has a dimension (time, percentage, data size, rate, count or score) and a
   size in the base unit of its dimension.

## How a measurement is read

The value is a number with an optional unit after it, read like the number of a target; the unit is the unit column,
or the text after the number. A measurement with no unit takes the unit of its target. The metric is compared in its
term form, so `P95 Latency` and `p95-latency` are one metric.

## How a target is checked

Each target is checked on its own, in the order of the files and of the records in each: its characteristic, its
sub-characteristic, its owner, its method, its target and its unit. Then every measurement of its metric is compared
with it:

1. A measurement whose unit, or whose target's unit, the tool does not know is not compared.
2. A measurement whose unit has another dimension than the unit of the target is not compared.
3. Any other measurement is converted to the unit of the target (value times the size of its unit, divided by the size
   of the unit of the target) and compared with the target, both rounded to twelve significant digits, so a value such
   as 0.3 s compares as exactly 300 ms.

A comparison that holds is met; one that does not is missed, and the gap is the distance between the measurement and
the target, in the unit of the target. The status of a target is missed when one of its measurements misses it, met
when at least one measurement was compared and none missed, and unverified otherwise: with no measurement, or with no
measurement that could be compared.

The same targets, measurements and configuration always give the same report: no clock, no random number, no locale,
and no order taken from a hash.

## Rules

Each finding has a rule, a level, the file, the line and column of the field it is about (or of the record when the
file has no such column), the characteristic and the metric, what was found and what to change. `--explain` adds the
rule, the points of the public pages it rests on, and the tool's own choice. docs/rules-and-sources.md lists the
points.

### `missing-characteristic`

A characteristic of the required list (all nine by default) that no target names, by its name or an alias. A target
row counts for its characteristic whether or not its target can be read. One finding per characteristic, at line 1 of
the first targets file. A warning, or an error with `--require-all` or `requireAll`, which then wins over the level of
the rule, also over `off`.

### `unknown-characteristic`

A target whose characteristic is empty, a blank word, or none of the nine and none of the aliases once compared. One
finding per target, at the characteristic, with a near name when there is one. The target is still checked and
compared, and the summary lists it under its name as written, marked unknown.

### `unknown-sub-characteristic`

A target with a sub-characteristic that is none of the names of src/model.js, or that belongs to another
characteristic than the one of the target. One finding per target, at the sub-characteristic. A warning: the
sub-characteristic is optional and the target can still be checked. When the characteristic is unknown, any
sub-characteristic of the model is accepted.

### `missing-method`

A target whose method is empty or a blank word, or a targets file with no method column. One finding per target, at
the method. Any other text is a method; the tool cannot tell whether it measures the metric.

### `missing-owner`

A target whose owner is empty or a blank word, or a targets file with no owner column. One finding per target, at the
owner. Any other text is an owner.

### `unknown-unit`

A target with no unit; a target or measurement whose unit is none of the units of src/units.js and none of the
aliases; or a target or measurement whose unit column and the text after its number name two different units. One
finding per target or measurement, at the unit, or at the target or value when the unit is written there. The target
is not compared, or the measurement is not compared, and the target counts as unverified unless another measurement
is compared.

### `unit-mismatch`

A measurement whose unit has another dimension than the unit of its target: a percentage against a count, a time
against a rate, a data size against a time. One finding per measurement and target, at the unit of the measurement,
or at its value when it has no unit column. The measurement is not compared with that target.

### `duplicate-target`

A target whose metric, in its term form, and comparison an earlier target already has, in the order of the files and
of the records in each. One finding at the later target, naming the first. Both are still checked, so the stricter one
decides. A lower and an upper limit of one metric (`>= 10` and `<= 90`) are two comparisons and not duplicates.

### `unverified-target`

A target that can be read and whose metric no measurement names. One finding per target, at the target. A target
whose measurements cannot be compared is not reported by this rule, because `unknown-unit` or `unit-mismatch` already
says why; it still counts as unverified in the summary.

### `target-missed`

A measurement that does not meet the comparison of its target. One finding per measurement and target, at the target,
naming the measurement with its file and line, its source, the value in the unit of the target (and as measured when
the unit differs) and the gap: over the target for `<=` and `<`, under it for `>=` and `>`, off it for `==`. A value
equal to the limit of `<` or `>` is at the limit, which the comparison does not allow.

### `untargeted-measurement`

A measurement that can be read and whose metric no target names, also a target that cannot be read. One finding per
measurement, at the metric. Info by default.

### `invalid-record`

A record that cannot be read: a CSV row with a different number of fields than the header, a record with no metric, a
JSON record that is not an object or names one field with two keys, a target with no target value, no comparison, two
different comparisons, an unknown comparison or no number the tool can read, and a measurement with no value or no
number. The record is not checked. A JSON value of the wrong kind (an object, a list, a boolean) is also reported and
is taken as empty. Always an error.

### `unreadable-file`

A file that cannot be read as UTF-8 text: over its size limit, holding a null byte, UTF-16, not valid UTF-8, or not
there to open when it is read. Nothing in it is checked. Always an error.

### `unparsable-file`

A file that the readers refuse: a CSV file that is empty, has a quoted field that is not closed, a character after a
closing quote or a double quote inside an unquoted field, a header that lacks a column the file needs or names one
field twice, or more records than the limit; a JSON file that does not parse, repeats a name in an object, or is not a
list of records or an object with the list of its role. Nothing in it is checked. Always an error, with the line and
column.

## Input problems

A path named on the command line that is missing, a symbolic link, a folder, a device or a pipe, a file whose name does
not end in `.csv` or `.json`, a file named twice, a configuration with a problem, and input past the limit of a run
(256 MB) stop the run with exit code `2` and no result. The problems are listed on standard error, the first twenty and
then a count.

## The report

The text report shows what was read, the configuration, the rules with their levels, the targets in one line (met,
missed and unverified, with the measurements and those with no target) and the count of findings; then the summary per
characteristic, the nine in the order of the model and then the unknown names, each with whether it is required and
its targets, met, missed and unverified; then the targets missed with the measured value and the gap; then the
findings, errors first, then by file, line, column and rule; then the notes, the notice and the result. The JSON report
holds the same data and every result. The CSV report is the result list: one record per target and measurement of its
metric (met, missed, or unverified when the two could not be compared), and one record per target with no measurement.
The GitHub report is one workflow command per finding.

The result counts every finding at or above the minimum severity, also the ones past the limit of 500 listed per rule.
