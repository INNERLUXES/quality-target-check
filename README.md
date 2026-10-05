# quality-target-check

Application quality target check for engineering teams. Give it the quality targets of your application, organized by
the ISO/IEC 25010 product quality model (each with a characteristic, an optional sub-characteristic, a metric, a unit,
a target with a comparison, an owner and the way it is measured) and the results of your load tests, probes, scans
and reviews, as CSV or JSON, and it reports what a set of quality targets must not have: a required characteristic
with no target, a target with no method or no owner, a characteristic or unit it does not know, a target with no
measurement, a measurement that misses its target, with the gap, and a measurement with no target. It sums up each
characteristic and exits with a code a pipeline can act on.

**It is a check of the files, not a certification.** It reads what the targets and measurements say and compares
them. It runs no measurement, does not judge whether a target is the right one for the application, and does not
certify conformance to ISO/IEC 25010 or any other standard.

Quality targets (the non-functional requirements, SLOs and budgets of an application) usually live in a sheet that
product owners, engineers and operations all edit, and the results live somewhere else: a load test report, an uptime
probe, a dependency scan. They drift apart: a target is set and never measured, a test reports seconds against a
target in milliseconds, a characteristic such as safety or compatibility has no target at all, an owner leaves. The
ISO/IEC 25010 product quality model (https://iso25000.com/index.php/en/iso-25000-standards/iso-25010) gives the nine
characteristics a set of targets can be checked against for coverage. This tool reads the targets and the results on
every change and says which targets are missed, which are not measured and which are not written in a form that can be
checked.

- **Organized by ISO/IEC 25010.** The nine characteristics of the product quality model and their
  sub-characteristics, read by name in any case and spacing, with the older names usability, portability,
  functionality and efficiency read as aliases.
- **Units that convert.** Time, percentage, data size, rate, count and score: a measurement in seconds against a
  target in milliseconds, or in GiB against MiB, is converted before it is compared, and units of two dimensions are
  never compared.
- **The gap.** A missed target shows the measured value in the unit of the target and how far it is over or under.
- **Honest about input.** A file, a record or a target it cannot read is an error finding with its line, never passed
  over; a name it does not know is reported with a near name suggested, never used.
  [docs/limits.md](docs/limits.md) says what the files cannot show.
- Reports as text, JSON, a CSV result list and GitHub workflow annotations, with an exit code for a pipeline: `0` no
  finding at or above the `--fail-on` level, `1` a finding at or above it, `2` usage or input error.
- Plain JavaScript, no dependencies, no clock and no network; the same files always give the same report.

```
npm test
```

```
tests 133
pass 130
fail 0
skipped 3
```

These are the summary lines that `npm test` prints at the end on Windows. The skipped tests are the ones that need a
symbolic link, a device or file permissions (a targets file, a measurements file, a folder and a configuration named
through a symbolic link, `/dev/zero` named as an input, and a file with no read access); they are guarded with
`process.platform`, run on Linux and macOS, and none of them asserts a line. `npm run test:coverage` runs the same
tests with coverage; their time limits are four times wider when coverage is on.

## Quick start

Requires Node 22 or newer. There is nothing to install.

```
git clone https://github.com/INNERLUXES/quality-target-check.git
cd quality-target-check
node bin/quality-target-check.js examples/missed/targets.csv --measurements examples/missed/measurements.json --config examples/config.json
```

Or without a clone, on your own files:

```
npx --yes github:INNERLUXES/quality-target-check targets.csv --measurements results.json
```

`examples/` holds two made-up applications. `examples/missed/` is a booking application whose targets are partly
missed: a p95 checkout latency over its target, API memory measured in GiB over a target in MiB, a monthly
availability under its target and two critical vulnerabilities, with a characteristic written as Reliabilty, a
sub-characteristic written as interoperabilty, a unit written as milisecond, a target written as fast, an installation
time measured in MB, a target with no owner, no method and no measurement, the same target twice, a measurement with no
target, and no target for functional suitability or safety. It also holds what must not be reported: the older name
usability, a throughput in `req/sec`, which `examples/config.json` names as rps, and a time to restore measured in
hours against minutes. `examples/clean/` is a library application with one target for each of the nine
characteristics, all met. `examples/config.json` requires six characteristics and adds the unit alias.

## Usage

```
quality-target-check <targets>... [--measurements <file>]... [--config <file>] [options]
```

```
--measurements <file>     a CSV or JSON file of measured results; give it more than once for several files
--config <file>           settings in strict JSON: rules, required, requireAll, characteristicAliases, unitAliases,
                          minSeverity and failOn (--print-defaults shows them)
--require-all             a required characteristic with no target is an error, not a warning
--format <name>           text, json, csv or github (default: text); csv writes the results, github writes
                          workflow commands that GitHub shows as annotations
--json                    the same as --format json
--min-severity <level>    the lowest level of a finding that is shown: info, warning, error (default: minSeverity of
                          the configuration, else info)
--fail-on <level>         the lowest level of a finding that fails the run: info, warning, error (default: failOn of
                          the configuration, else error)
--explain                 show the rule, the public sources and the tool's own choice behind each finding
--print-defaults          print the built-in configuration and exit
--help                    show the usage
--version                 show the version
```

The targets files are read in the order named and checked as one list, and so are the measurements files. The path in
the report is relative to the folder you run the command in, with forward slashes on every system, followed by the
line.

The report of the missed example starts with what was read, the configuration, the rules, the targets in one line and
the count of findings; then a table per characteristic; then the targets missed with the measured value and the gap;
then the findings, errors first, each with what to change:

```
quality-target-check: targets examples/missed/targets.csv; measurements examples/missed/measurements.json
input: targets examples/missed/targets.csv (1 file: 1 CSV file; 16 records); measurements examples/missed/measurements.json (1 file: 1 JSON file; 14 records)
config: examples/config.json (Quillmoor quality targets): 6 required characteristics, require all off; 4 characteristic aliases, 1 unit alias; minimum severity info; fail on error
rules: missing-characteristic (warning); unknown-characteristic (error); unknown-sub-characteristic (warning); missing-method (warning); missing-owner (warning); unknown-unit (error); unit-mismatch (error); duplicate-target (warning); unverified-target (warning); target-missed (error); untargeted-measurement (info); invalid-record (error); unreadable-file (error); unparsable-file (error)
targets: 15 targets: 8 met, 4 missed, 3 unverified; 14 measurements, 1 with no target
findings: 16 (8 error, 7 warning, 1 info)

Characteristics (10)

  characteristic          required  targets  met  missed  unverified
  functional suitability  yes       0        0    0       0
  performance efficiency  yes       4        1    2       1
  compatibility           no        1        1    0       0
  interaction capability  no        1        1    0       0
  reliability             yes       3        2    1       0
  security                yes       2        0    1       1
  maintainability         yes       2        2    0       0
  flexibility             no        1        0    0       1
  safety                  yes       0        0    0       0
  Reliabilty (unknown)    no        1        1    0       0

Targets missed (4)

  characteristic          metric                    target      measured                         gap        at
  performance efficiency  p95 checkout latency      <= 300 ms   420 ms                           120 ms     examples/missed/targets.csv:2
  performance efficiency  api memory                <= 512 MiB  614.4 MiB (0.6 GiB as measured)  102.4 MiB  examples/missed/targets.csv:3
  reliability             monthly availability      >= 99.9%    99.5%                            0.4%       examples/missed/targets.csv:5
  security                critical vulnerabilities  == 0 count  2 count                          2 count    examples/missed/targets.csv:8

Findings (16)

  ERROR    target-missed               examples/missed/targets.csv:2
           the target "p95 checkout latency" of performance efficiency (<= 300 ms) is missed: measured 420 ms at examples/missed/measurements.json:4 (source: k6 run on staging), 120 ms over it
           fix: improve the application until the measurement meets the target, or change the target in a reviewed commit when the need has changed

  ERROR    target-missed               examples/missed/targets.csv:3
           the target "api memory" of performance efficiency (<= 512 MiB) is missed: measured 614.4 MiB (0.6 GiB as measured) at examples/missed/measurements.json:5 (source: container metrics), 102.4 MiB over it
           fix: improve the application until the measurement meets the target, or change the target in a reviewed commit when the need has changed

  ERROR    target-missed               examples/missed/targets.csv:5
           the target "monthly availability" of reliability (>= 99.9%) is missed: measured 99.5% at examples/missed/measurements.json:7 (source: uptime probe), 0.4% under it
           fix: improve the application until the measurement meets the target, or change the target in a reviewed commit when the need has changed

  ERROR    unknown-characteristic      examples/missed/targets.csv:7
           the target "failed request rate" has the characteristic "Reliabilty", which is not one of the nine of ISO/IEC 25010 or a known alias, did you mean "reliability"?
           fix: write one of the nine characteristics, such as performance efficiency or reliability, or add the name your team uses to characteristicAliases in the configuration

  ERROR    target-missed               examples/missed/targets.csv:8
           the target "critical vulnerabilities" of security (== 0 count) is missed: measured 2 count at examples/missed/measurements.json:10 (source: dependency scan), 2 count off it
           fix: improve the application until the measurement meets the target, or change the target in a reviewed commit when the need has changed

  ERROR    unknown-unit                examples/missed/targets.csv:16
           the target "search response time" of performance efficiency has the unit "milisecond", which is not one the tool knows, did you mean "millisecond"?; the target is not compared
           fix: write the unit as one the tool knows, such as ms, s, %, MB, MiB, rps or count, or add the name your team uses to unitAliases in the configuration

  ERROR    invalid-record              examples/missed/targets.csv:17
           the target "first contentful paint" of performance efficiency: the target "fast" has no comparison; write one of <=, >=, <, >, == in front of the number or in the comparison column; the target is not checked
           fix: correct the record at the line named

  ERROR    unit-mismatch               examples/missed/measurements.json:15
           the measurement of "installation time" is in MB (data size) and its target at examples/missed/targets.csv:14 is in min (time); it is not compared
           fix: measure the metric in the unit of the target, or correct the unit of the target or of the measurement

  WARNING  missing-characteristic      examples/missed/targets.csv:1
           no target names functional suitability, a characteristic of the required list
           fix: add a target for the characteristic with a metric, a unit, a target value and an owner, or take the characteristic out of the required list of the configuration

  WARNING  missing-characteristic      examples/missed/targets.csv:1
           no target names safety, a characteristic of the required list
           fix: add a target for the characteristic with a metric, a unit, a target value and an owner, or take the characteristic out of the required list of the configuration

  WARNING  unverified-target           examples/missed/targets.csv:9
           the target "open admin endpoints" of security (== 0 count) has no measurement
           fix: add a measurement of the metric, from the method the target names, to the measurements file

  WARNING  missing-owner               examples/missed/targets.csv:9
           the target "open admin endpoints" of security has no owner
           fix: name the person or team who answers for the target and acts when it is missed

  WARNING  missing-method              examples/missed/targets.csv:9
           the target "open admin endpoints" of security names no measurement method
           fix: write how the metric is measured: the tool, the test or the query, and where it runs

  WARNING  unknown-sub-characteristic  examples/missed/targets.csv:13
           the target "contract test pass rate" of compatibility has the sub-characteristic "interoperabilty", which is not one of ISO/IEC 25010, did you mean "interoperability"?
           fix: write a sub-characteristic of the characteristic, such as time behaviour for performance efficiency or availability for reliability, or leave the column empty

  WARNING  duplicate-target            examples/missed/targets.csv:15
           the target "monthly availability" of reliability has the comparison >= a second time; the first target is at examples/missed/targets.csv:5
           fix: keep one target per metric and comparison, or name the metrics apart

  INFO     untargeted-measurement      examples/missed/measurements.json:17
           the measurement of "error budget burn", 0.7 score from slo dashboard export, names a metric that no target has
           fix: add a target for the metric, or write the metric as its target writes it

note: examples/missed/targets.csv: 1 column the tool does not read was left out: "notes"
note: examples/missed/measurements.json: 1 key the tool does not read was left out: "app"

This check compares the targets with the measurements as they are written. It runs no measurement, does not judge whether a target or a method suits the application, and does not certify conformance to ISO/IEC 25010 or any other standard (docs/limits.md).

RESULT: FAIL - 8 findings at or above error (8 error, 7 warning, 1 info)
```

With `--explain`, each finding also shows the rule, the points of the public pages it rests on and the tool's own
choice:

```
  ERROR    target-missed               examples/missed/targets.csv:3
           the target "api memory" of performance efficiency (<= 512 MiB) is missed: measured 614.4 MiB (0.6 GiB as measured) at examples/missed/measurements.json:5 (source: container metrics), 102.4 MiB over it
           fix: improve the application until the measurement meets the target, or change the target in a reviewed commit when the need has changed
           rule: a measurement that does not meet the comparison of its target
           basis: the uses of the model include identifying acceptance criteria for a product and establishing measures of its quality characteristics (ISO/IEC 25010, Product quality model, second edition (ISO), https://www.iso.org/standard/78176.html)
           basis: the ISO/IEC 2504n division gives the requirements and guidance for evaluating a product, with ISO/IEC 25040 as the reference model for specifying and evaluating software quality (The ISO/IEC 25000 series of standards, page 2 (iso25000.com), https://iso25000.com/index.php/en/iso-25000-standards?start=5)
           basis: the quality of a system is how far it meets the stated and implied needs of its stakeholders, such as functionality, performance, security and maintainability, and those needs are what the model represents (ISO/IEC 25010, the product quality model, page 1 (iso25000.com), https://iso25000.com/index.php/en/iso-25000-standards/iso-25010)
           the tool's own choice: every measurement of a metric is compared with every target of the metric, after conversion to the unit of the target and with twelve significant digits; a target is missed when one of its measurements misses it, and the gap is shown in the unit of the target
```

The clean example passes:

```
quality-target-check: targets examples/clean/targets.json; measurements examples/clean/measurements.csv
input: targets examples/clean/targets.json (1 file: 1 JSON file; 9 records); measurements examples/clean/measurements.csv (1 file: 1 CSV file; 9 records)
config: built-in defaults: 9 required characteristics, require all off; 4 characteristic aliases, 0 unit aliases; minimum severity info; fail on error
rules: missing-characteristic (warning); unknown-characteristic (error); unknown-sub-characteristic (warning); missing-method (warning); missing-owner (warning); unknown-unit (error); unit-mismatch (error); duplicate-target (warning); unverified-target (warning); target-missed (error); untargeted-measurement (info); invalid-record (error); unreadable-file (error); unparsable-file (error)
targets: 9 targets: 9 met, 0 missed, 0 unverified; 9 measurements, 0 with no target
findings: 0

Characteristics (9)

  characteristic          required  targets  met  missed  unverified
  functional suitability  yes       1        1    0       0
  performance efficiency  yes       1        1    0       0
  compatibility           yes       1        1    0       0
  interaction capability  yes       1        1    0       0
  reliability             yes       1        1    0       0
  security                yes       1        1    0       0
  maintainability         yes       1        1    0       0
  flexibility             yes       1        1    0       0
  safety                  yes       1        1    0       0

Targets missed (0)

  none

Findings (0)

  none

note: examples/clean/targets.json: 1 key the tool does not read was left out: "app"

This check compares the targets with the measurements as they are written. It runs no measurement, does not judge whether a target or a method suits the application, and does not certify conformance to ISO/IEC 25010 or any other standard (docs/limits.md).

RESULT: PASS - no finding at or above error
```

## How a target is checked

1. Every value is trimmed, and an empty value, a dash or a blank word such as `none`, `n/a` or `tbd` counts as empty.
2. The characteristic is compared with the nine of ISO/IEC 25010 and their aliases, and the sub-characteristic, when
   there is one, with the sub-characteristics of that characteristic.
3. The target is a comparison (`<=`, `>=`, `<`, `>` or `==`) and a number, with the unit in its own column or after
   the number: `<= 300 ms`, `>= 99.9%`, `== 0`.
4. Every measurement of the metric, compared in its term form so `P95 Latency` and `p95-latency` are one metric, is
   converted to the unit of the target and compared with it. A measurement with no unit takes the unit of its target;
   a unit of another dimension is never compared.
5. A target is missed when one of its measurements misses it, met when at least one was compared and none missed, and
   unverified otherwise. A characteristic of the required list with no target is reported.

[docs/method.md](docs/method.md) gives the details, and
[decision 3](docs/decisions/0003-compare-only-units-of-one-dimension-and-make-unreadable-input-an-error.md) says why
units of two dimensions are never compared.

## What it reports

| Rule | Key | Default level | Finds |
| --- | --- | --- | --- |
| `missing-characteristic` | `rules.missingCharacteristic` | warning | a characteristic of the required list with no target; an error with `--require-all` |
| `unknown-characteristic` | `rules.unknownCharacteristic` | error | a characteristic that is not one of ISO/IEC 25010 or an alias, with a near name suggested |
| `unknown-sub-characteristic` | `rules.unknownSubCharacteristic` | warning | a sub-characteristic that is not one of the model, or belongs to another characteristic |
| `missing-method` | `rules.missingMethod` | warning | a target with no measurement method |
| `missing-owner` | `rules.missingOwner` | warning | a target with no owner |
| `unknown-unit` | `rules.unknownUnit` | error | a target with no unit, or a unit the tool does not know |
| `unit-mismatch` | `rules.unitMismatch` | error | a measurement in a unit of another dimension than its target |
| `duplicate-target` | `rules.duplicateTarget` | warning | the same metric and comparison twice |
| `unverified-target` | `rules.unverifiedTarget` | warning | a target with no measurement |
| `target-missed` | `rules.targetMissed` | error | a measurement that misses its target, with the gap |
| `untargeted-measurement` | `rules.untargetedMeasurement` | info | a measurement whose metric has no target |
| `invalid-record` | none | error | a record with no metric, the wrong number of fields, or no target or value the tool can read |
| `unreadable-file` | none | error | a file that cannot be read as UTF-8 text |
| `unparsable-file` | none | error | a file the CSV or JSON reader refuses, or that lacks a column its role needs |

The three rules of input problems are always errors. [docs/method.md](docs/method.md) says exactly what each rule looks
at and what it cannot see, and [docs/rules-and-sources.md](docs/rules-and-sources.md) gives the points of the public
pages each rule rests on.

## The quality model

The nine characteristics of the ISO/IEC 25010 product quality model, in the order of the iso25000.com pages:

| Characteristic | Sub-characteristics | Older name read as an alias |
| --- | --- | --- |
| `functional suitability` | functional completeness, functional correctness, functional appropriateness | `functionality` |
| `performance efficiency` | time behaviour, resource utilization, capacity | `efficiency` |
| `compatibility` | co-existence, interoperability |  |
| `interaction capability` | appropriateness recognizability, learnability, operability, user error protection, user engagement, inclusivity, user assistance, self-descriptiveness | `usability` |
| `reliability` | faultlessness, availability, fault tolerance, recoverability |  |
| `security` | confidentiality, integrity, non-repudiation, accountability, authenticity, resistance |  |
| `maintainability` | modularity, reusability, analysability, modifiability, testability |  |
| `flexibility` | adaptability, scalability, installability, replaceability | `portability` |
| `safety` | operational constraint, risk identification, fail safe, hazard warning, safe integration |  |

The older names of sub-characteristics `maturity` (faultlessness), `user interface aesthetics` (user engagement) and
`accessibility` (inclusivity) are read too, with other spellings such as `time behavior`. The list lives in
`src/model.js`; the standard is revised from time to time, so check the pages.

The units are `ns`, `us`, `ms`, `s`, `min`, `h`, `d`, `%`, `B`, `KB`, `MB`, `GB`, `TB`, `KiB`, `MiB`, `GiB`, `TiB`, `rps`, `rpm`, `rph`, `count` and `score`, each with other names such as `milliseconds`, `percent` or `req/s` (docs/inputs.md lists
them). A unit has a dimension (time, percentage, data size, rate, count or score), and a measurement in another unit of
the same dimension is converted. The `characteristicAliases` and `unitAliases` keys of the configuration add your
team's own words.

## What is not checked

The tool reads what the files say and never guesses. It does not:

- run a measurement, look at the application or read a monitoring system, a test report or a dashboard;
- judge whether a target is the right one, whether the targets cover what the users need, or whether the application
  conforms to ISO/IEC 25010: it is not a certification;
- tell whether a measurement is recent or came from the method its target names;
- compute a percentile or an average from raw samples: give it the value the target names;
- read the quality in use model or the data quality model;
- read a spreadsheet file (`.xlsx`, `.ods`): export it as UTF-8 CSV.

So a clean run means the files hold none of the problems the rules look for, and every report says so.

## The targets and the measurements

```
characteristic,sub-characteristic,metric,unit,target,owner,how it is measured
performance efficiency,time behaviour,p95 checkout latency,ms,<= 300,perf-team,k6 load test against staging
reliability,availability,monthly availability,%,>= 99.9,sre-team,uptime probe every minute
```

```
metric,value,unit,source
p95 checkout latency,420,ms,k6 run on staging
monthly availability,99.5,%,uptime probe
```

A CSV file has a header line; a JSON file is a list of records, or an object with a `targets` or `measurements` list.
A targets file needs `characteristic`, `metric` and `target`, a measurements file `metric` and `value`. Columns and
keys are matched by name in any case and order, with spaces, hyphens and underscores ignored, so `sub-characteristic`,
`sub_characteristic` and `subCharacteristic` all name the sub-characteristic, and `how it is measured`, `method` and
`measured by` the method. The comparison may be in its own column. Columns the tool does not read are named in a note.
[docs/inputs.md](docs/inputs.md) describes every field.

## The configuration file

```json
{
  "name": "Quillmoor quality targets",
  "required": ["functional suitability", "performance efficiency", "reliability", "security", "maintainability", "safety"],
  "unitAliases": { "req/sec": "rps" }
}
```

Every key is optional, and without `--config` the defaults apply. `rules` sets the level of each rule (`info`,
`warning`, `error` or `off`), `required` lists the characteristics that need a target (all nine by default),
`requireAll` makes a missing one an error, `characteristicAliases` and `unitAliases` add other names or take a
built-in one away with `off`, `minSeverity` sets the lowest level shown and `failOn` the lowest level that fails the
run. A key the tool does not know is an error with its line and a suggestion, and a key named twice is refused.
[docs/inputs.md](docs/inputs.md) describes every key, and `--print-defaults` writes the whole default configuration
out.

## Formats

- `text`: for a terminal: what was read, the configuration, the rules, the targets in one line, a table per
  characteristic, the targets missed, the findings with the file and line and what to change, the notes, the notice
  and the result. With `--explain` also the rule, the points of the public pages and the tool's own choice behind each
  finding.
- `json` (or `--json`): the whole report: the input, the configuration, the summary per characteristic, every result,
  every finding with its file, line, column, characteristic and metric, the totals, the result, the notes and the
  notice.
- `csv`: the results, one record per target and measurement of its metric and one per target with no measurement,
  ready for a sheet: the status (met, missed or unverified), the characteristic, sub-characteristic and metric, the
  target, the measured value in the unit of the target, the gap, the source, the owner, the file and line of the target
  and the place of the measurement, with CRLF line ends as RFC 4180 writes. A field that a spreadsheet could read as a
  formula, a target of `== 0` included, gets a single quote in front. The start of the missed example:

```
status,characteristic,subcharacteristic,metric,target,measured,gap,source,owner,file,line,measurement
missed,performance efficiency,time behaviour,p95 checkout latency,<= 300 ms,420 ms,120 ms,k6 run on staging,perf-team,examples/missed/targets.csv,2,examples/missed/measurements.json:4
missed,performance efficiency,resource utilization,api memory,<= 512 MiB,614.4 MiB (0.6 GiB as measured),102.4 MiB,container metrics,perf-team,examples/missed/targets.csv,3,examples/missed/measurements.json:5
met,performance efficiency,capacity,peak bookings throughput,>= 500 rps,610 rps,,k6 run on staging,perf-team,examples/missed/targets.csv,4,examples/missed/measurements.json:6
```

- `github`: one workflow command per finding, `::error`, `::warning` or `::notice` (for info) with the file, line and
  column, which GitHub shows as an annotation in the pull request, then a summary line. The characters a command gives
  a meaning to are escaped. Two findings of the missed example:

```
::error file=examples/missed/targets.csv,line=2,col=63,title=quality-target-check target-missed::the target "p95 checkout latency" of performance efficiency (<= 300 ms) is missed: measured 420 ms at examples/missed/measurements.json:4 (source: k6 run on staging), 120 ms over it; fix: improve the application until the measurement meets the target, or change the target in a reviewed commit when the need has changed
::warning file=examples/missed/targets.csv,line=9,col=38,title=quality-target-check unverified-target::the target "open admin endpoints" of security (== 0 count) has no measurement; fix: add a measurement of the metric, from the method the target names, to the measurements file
```

## Exit codes

`0`: no finding at or above the fail-on level (`error` by default). `1`: at least one finding at or above it; with the
default, a missed target, an unknown characteristic or unit, units of two dimensions, or a file or record the tool
could not read; with `--fail-on warning`, required characteristics with no target, unknown sub-characteristics,
targets with no method, owner or measurement, and duplicate targets too; with `--require-all`, a required
characteristic with no target at any level. `2`: a usage or input error: no targets file, an unknown option, an option
given twice, `--explain` with the csv or github format, a URL in place of a path, a path that cannot be read, a
symbolic link or a folder named on the command line, a file whose name does not end in `.csv` or `.json`, input past
the limit of a run, or a configuration with an unknown key, a key named twice or a value of the wrong kind. With exit
code `2` the tool gives no result and prints the problems on standard error.

## Limits

The tool reads files; it does not run the application, measure it, or track time. A run reports what the files hold
in the forms of docs/method.md. [docs/limits.md](docs/limits.md) lists what it cannot see, with the size limits: 32 MB
for a file, 256 MB for a run, 200,000 records in a file, 500 findings listed per rule.
[docs/threat-model.md](docs/threat-model.md) lists the risks of reading targets and measurements from a pull request
and their controls, and [docs/secure-defaults.md](docs/secure-defaults.md) the defaults and how to run the tool in a
pipeline.

## Architecture

Plain ES modules in `src/`, with no dependencies.

| File | Job |
| --- | --- |
| `src/cli.js` | the command line, the usage and the exit codes |
| `src/check.js` | reads the configuration, the targets and the measurements, and builds the report of the run |
| `src/files.js`, `src/kinds.js` | the bounded reading of files with no link followed, and the kind of each file |
| `src/csv.js`, `src/json.js` | the CSV reader and the CSV result list, and the strict JSON reader |
| `src/records.js` | the fields of a target or measurement from a CSV header or JSON keys, and the records that cannot be read |
| `src/model.js` | the characteristics and sub-characteristics of ISO/IEC 25010, as a documented data file |
| `src/units.js` | the units, their dimensions and sizes, and the conversion between them |
| `src/terms.js` | characteristics, comparisons, numbers and units read from the values, and the comparison of a value with a target |
| `src/compare.js` | the checks of every target and measurement, the results and the summary per characteristic |
| `src/config.js`, `src/defaults.js` | the configuration file over the defaults |
| `src/rules.js` | the rules, their levels and the result |
| `src/report.js`, `src/text.js`, `src/size.js`, `src/words.js` | the text, JSON and GitHub output, the cleaning of text from the input, number formats and compared words |
| `src/data.js` | the public pages and the points the rules rest on, in this project's own words |
| `tools/check.mjs`, `tools/example.mjs` | the repository checks, and the examples with their real output |

## Where the facts come from

| Fact | Source |
| --- | --- |
| The nine characteristics and their sub-characteristics | ISO/IEC 25010 on iso25000.com, https://iso25000.com/index.php/en/iso-25000-standards/iso-25010 and https://iso25000.com/index.php/en/iso-25000-standards/iso-25010?start=5 |
| The measurement and evaluation divisions of the series | The ISO/IEC 25000 series on iso25000.com, https://iso25000.com/index.php/en/iso-25000-standards and https://iso25000.com/index.php/en/iso-25000-standards?start=5 |
| The current edition, its nine characteristics and its uses, such as acceptance criteria | ISO, https://www.iso.org/standard/78176.html |
| The first edition and its eight characteristics | ISO, https://www.iso.org/standard/35733.html |
| Usability and portability as the former names of interaction capability and flexibility | arc42 Quality Model, https://quality.arc42.org/standards/iso-25010 |
| The names of ISO/IEC 9126 and what changed in ISO/IEC 25010 | Wikipedia, https://en.wikipedia.org/wiki/ISO/IEC_9126 |
| The CSV format | RFC 4180, https://www.rfc-editor.org/rfc/rfc4180 |
| Repeated names in a JSON object, and UTF-8 | RFC 8259, https://www.rfc-editor.org/rfc/rfc8259 |
| Formulas hidden in CSV files | OWASP, https://community.owasp.org/attacks/CSV_Injection |
| Annotations from workflow commands | GitHub Docs, https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands |

[research/sources.md](research/sources.md) has a note on each page, in this project's own words.

## Background

Quality targets are part of the requirements of an application: how fast it answers, how often it is up, how quickly
it recovers, how it is kept secure and changed. Written down once and checked by hand, they fall behind the code. A
check that reads them next to the code on every change, with the results of the same build, finds the target that
slipped, the one nobody measures and the characteristic nobody set a target for while they are still one line in a
file. How quality targets are built into an application from the start is described on the page
[Application Development Services](https://innerluxes.dev/application/development).

## License

MIT
