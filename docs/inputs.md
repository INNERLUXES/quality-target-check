# Inputs

## The files

```
quality-target-check <targets>... [--measurements <file>]... [--config <file>] [options]
```

One or more targets files, then any number of measurements files, each named with `--measurements`; up to 100 files in
all. Each is a CSV file (a name ending in `.csv`) or a JSON file (a name ending in `.json`), compared without regard to
case. The targets files are read in the order they are named and checked together, and so are the measurements files:
a target in one file is compared with a measurement in another, and a duplicate target is found across files. Each file
may be named once. A folder is not walked; name the files. With no measurements file every target is unverified, and
the report says so in a note.

```
quality-target-check targets.csv --measurements results.json
quality-target-check web.csv api.json --measurements k6.csv --measurements probes.json --fail-on warning
quality-target-check targets.csv --measurements results.csv --config quality.json --format github
```

### The fields of a target

Only `characteristic`, `metric` and `target` are required; a field that is missing is empty.

| Field | Column or key names (any case; spaces, hyphens and underscores ignored) | Value |
| --- | --- | --- |
| `characteristic` | `characteristic`, `quality characteristic` | one of the nine characteristics of ISO/IEC 25010, or an alias |
| `subCharacteristic` | `sub-characteristic`, `quality sub-characteristic` | a sub-characteristic of the characteristic, optional |
| `metric` | `metric`, `metric name`, `measure`, `name` | the name of the metric, such as p95 checkout latency |
| `unit` | `unit`, `units` | the unit of the target, such as ms or %; it may also follow the number in the target |
| `comparison` | `comparison`, `operator`, `comparator` | `<=`, `>=`, `<`, `>` or `==`; it may also stand in front of the number in the target |
| `target` | `target`, `target value`, `threshold`, `goal` | the target, such as `<= 300 ms`, `>= 99.9%` or `== 0` |
| `owner` | `owner`, `target owner` | the person or team who answers for the target |
| `method` | `method`, `measurement method`, `measured by`, `how measured`, `how it is measured` | how the metric is measured |

### The fields of a measurement

Only `metric` and `value` are required.

| Field | Column or key names | Value |
| --- | --- | --- |
| `metric` | `metric`, `metric name`, `measure`, `name` | the name of the metric, as its target writes it |
| `value` | `value`, `measured value`, `measured`, `result`, `actual` | the measured number, with or without a unit after it, such as `420`, `420 ms` or `99.5%` |
| `unit` | `unit`, `units` | the unit of the value; with none, the unit of the target is taken |
| `source` | `source`, `tool`, `run` | where the value comes from, such as the load test or the probe |

Every value is trimmed of white space at both ends. A column or key that is none of these is left out and named in a
note. A value that is empty, a dash, a question mark, or one of the words `none`, `n/a`, `na`, `nil`, `tbd`, `tbc`,
`todo`, `to do`, `unknown`, `not known` and `not set` (in any case) counts as empty; in a unit column, `%` is a unit and
not a blank word.

A metric is compared in its term form: the letters A to Z lowered and every run of other characters made one space, so
`P95 Latency`, `p95-latency` and `p95_latency` are one metric.

### CSV

A header line names the columns, in any order, and every later line is a record. The file is read as RFC 4180
describes it, with LF, CRLF or a lone CR as line ends and a byte order mark skipped. A field that holds a comma, a
double quote or a line break is put in double quotes, with a double quote inside it written twice.

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

A line with no text in any field is skipped. A line with a different number of fields than the header, or with no
metric, is an `invalid-record` finding and is not checked. A file with no header, a header that lacks a column the file
needs (`characteristic`, `metric` and `target` in a targets file, `metric` and `value` in a measurements file) or names
one field twice, or a quote that breaks the format is an `unparsable-file` finding.

### JSON

A list of record objects, or an object whose `targets` key (in a targets file) or `measurements` key (in a
measurements file) holds that list; other keys of that object are left out and named in a note. The file is read
strictly as RFC 8259 writes JSON: no comments, no trailing comma, and no name given twice in one object.

```json
{
  "targets": [
    { "characteristic": "performance efficiency", "metric": "p95 catalogue search", "unit": "ms",
      "comparison": "<=", "target": 250, "owner": "search-team", "method": "load test of the search endpoint" }
  ]
}
```

A value is a text, or a number read as the text JavaScript writes for it (`0.25`, `250`). A value of another kind is
an `invalid-record` finding and is taken as empty; a record that is not an object, has no metric, or names one field
with two keys is an `invalid-record` finding and is not checked.

### Characteristics

A characteristic is compared in its term form with the nine names of `src/model.js`, a documented data file taken from
the iso25000.com pages on ISO/IEC 25010: `functional suitability`, `performance efficiency`, `compatibility`,
`interaction capability`, `reliability`, `security`, `maintainability`, `flexibility` and `safety`. The built-in
aliases are the older names:

| Alias | Characteristic | Where the name comes from |
| --- | --- | --- |
| `usability` | interaction capability | the first edition of ISO/IEC 25010 |
| `portability` | flexibility | the first edition of ISO/IEC 25010 |
| `functionality` | functional suitability | ISO/IEC 9126 |
| `efficiency` | performance efficiency | ISO/IEC 9126 |

A name that is neither is an `unknown-characteristic` finding, with a near name suggested, never used
([decision 2](decisions/0002-read-older-names-of-the-model-as-aliases-and-never-guess-a-near-name.md)).

### Sub-characteristics

A sub-characteristic is optional. When one is written, it is compared in its term form with the sub-characteristics
of `src/model.js` (docs/rules-and-sources.md lists them) and with these other names: `maturity` (faultlessness),
`user interface aesthetics` (user engagement), `accessibility` (inclusivity), `time behavior`,
`resource utilisation`, `appropriateness recognisability`, `analyzability`, `coexistence`, `nonrepudiation`,
`fail safety` and `operational constraints`. It must belong to the characteristic of the target; when the
characteristic is unknown, any sub-characteristic of the model is accepted.

### Targets

A target is a comparison and a number, with an optional unit after the number: `<= 300 ms`, `>=99.9%`, `< 2.5 s`,
`== 0`. The comparison may instead be in the comparison column, with the number alone in the target; when both hold
one, they must be the same. `=` is read as `==`. The number is written with a point for the decimals and no grouping
of digits (`1500`, not `1,500`), and may have an exponent (`1e3`).

### Units

A unit is compared with the letters A to Z lowered and runs of white space made one space, with the names of
`src/units.js`:

| Unit | Dimension | Other names |
| --- | --- | --- |
| `ns` | time | nanosecond, nanoseconds |
| `us` | time | microsecond, microseconds, the micro sign followed by s |
| `ms` | time | msec, millisecond, milliseconds |
| `s` | time | sec, secs, second, seconds |
| `min` | time | mins, minute, minutes |
| `h` | time | hr, hrs, hour, hours |
| `d` | time | day, days |
| `%` | percentage | percent, pct, percentage |
| `B` | data size | byte, bytes |
| `KB`, `MB`, `GB`, `TB` | data size, in powers of 1000 | kilobyte(s), megabyte(s), gigabyte(s), terabyte(s) |
| `KiB`, `MiB`, `GiB`, `TiB` | data size, in powers of 1024 | kibibyte(s), mebibyte(s), gibibyte(s), tebibyte(s) |
| `rps` | rate | /s, per second, req/s, requests/s, requests per second, ops/s, tps, qps |
| `rpm` | rate | /min, per minute, req/min, requests/min, requests per minute |
| `rph` | rate | /h, per hour, req/h, requests/h, requests per hour |
| `count` | count | items, defects, bugs, issues, incidents, failures, errors, vulnerabilities, findings, tests, users, requests, steps, clicks |
| `score` | score | points |

Because the letters are lowered, `mb` and `Mb` are megabytes; the tool knows no unit of bits, so convert a value in
bits to bytes before it is checked. A target needs a unit; a measurement with no unit takes the
unit of its target. A measurement in another unit of the same dimension is converted to the unit of the target before
it is compared; a measurement in a unit of another dimension is a `unit-mismatch` finding.

## Options

| Option | Value |
| --- | --- |
| `--measurements <file>` | a measurements file; give it once for each file |
| `--config <file>` | the configuration file below; without it the defaults apply |
| `--require-all` | a required characteristic with no target is an error; the same as `"requireAll": true` |
| `--format <name>` | `text` (the default), `json`, `csv` or `github` |
| `--json` | the same as `--format json` |
| `--min-severity <level>` | `info`, `warning` or `error`: the lowest level of a finding that is shown; it wins over `minSeverity` of the configuration |
| `--fail-on <level>` | `info`, `warning` or `error`: the lowest level of a finding that fails the run; it wins over `failOn` of the configuration |
| `--explain` | each finding also shows its rule, the points of the public pages it rests on and the tool's own choice; with `--format csv` or `--format github` it is a usage error |
| `--print-defaults` | prints the built-in configuration as a configuration file and exits |
| `--help`, `--version` | the usage, the version |

A path that looks like a web address, an option given twice (other than `--measurements`), `-` for standard input and
an unknown option are usage errors with exit code `2`.

## The configuration file

The configuration is one JSON object, read strictly as RFC 8259 writes JSON: no comments, no trailing comma, and no
name given twice in one object. Every key is optional. A key the tool does not know is an error with its line and, when
it is close to a known key, a suggestion; a run never goes on with a typo left in place.

```json
{
  "name": "Quillmoor quality targets",
  "rules": { "missingOwner": "error", "untargetedMeasurement": "warning" },
  "required": ["performance efficiency", "reliability", "security", "maintainability"],
  "requireAll": true,
  "characteristicAliases": { "speed": "performance efficiency" },
  "unitAliases": { "req/sec": "rps" },
  "minSeverity": "info",
  "failOn": "warning"
}
```

### `name`

A name for the configuration, 1 to 120 characters, shown in the report next to the file.

### `rules`

The level of each rule: `info`, `warning`, `error` or `off`. A rule set to `off` is not reported, and the report names
it in a note. The keys and their defaults:

| Key | Rule | Default |
| --- | --- | --- |
| `rules.missingCharacteristic` | `missing-characteristic` | warning; error with `requireAll` |
| `rules.unknownCharacteristic` | `unknown-characteristic` | error |
| `rules.unknownSubCharacteristic` | `unknown-sub-characteristic` | warning |
| `rules.missingMethod` | `missing-method` | warning |
| `rules.missingOwner` | `missing-owner` | warning |
| `rules.unknownUnit` | `unknown-unit` | error |
| `rules.unitMismatch` | `unit-mismatch` | error |
| `rules.duplicateTarget` | `duplicate-target` | warning |
| `rules.unverifiedTarget` | `unverified-target` | warning |
| `rules.targetMissed` | `target-missed` | error |
| `rules.untargetedMeasurement` | `untargeted-measurement` | info |

`invalid-record`, `unreadable-file` and `unparsable-file` are always errors and have no key.

### `required`

The characteristics that need at least one target, as a list of names or aliases; all nine by default. A name that is
not a characteristic is an error with a suggestion, and a characteristic named twice is an error. An empty list
requires nothing. The list is read after `characteristicAliases`, so it may use an alias the configuration adds.

### `requireAll`

`true` or `false` (the default). With `true`, a required characteristic with no target is an error, whatever the level
of `rules.missingCharacteristic`. `--require-all` does the same.

### `characteristicAliases`

An object of other names for the characteristics. Each name is compared in its term form; its value is one of the nine
characteristics, which adds the name, or `off`, which takes a built-in alias away. A name that is one of the nine, a
name given twice once compared, and `off` for a name that is not a built-in alias are errors. At most 500 names of up
to 100 characters.

### `unitAliases`

An object of other names for units, compared like units. Its value is a unit the tool knows, by its symbol or another
name. A name that is already a unit is an error. The same limits apply.

### `minSeverity`

The lowest level of a finding that is shown: `info` (the default), `warning` or `error`. The findings below it are
counted in a note and do not fail the run.

### `failOn`

The lowest level of a finding that fails the run: `info`, `warning` or `error` (the default).

`--print-defaults` writes the whole default configuration; read back, it gives the defaults.
