# Rules and sources

Every rule rests on points of public pages, written in this project's own words; this document lists them, with the
choices that are the tool's own and what to change. The same points are in src/data.js and are shown by `--explain`;
research/sources.md has a longer note on each page. The tool is a check of the files, not a certification: a point
says what a page says, and a finding says what the targets and measurements hold, not whether the application
conforms to ISO/IEC 25010.

## The characteristics

The nine characteristics of the product quality model of ISO/IEC 25010, in the order of the iso25000.com pages, with
their sub-characteristics. src/model.js holds the same list.

| Characteristic | Sub-characteristics |
| --- | --- |
| `functional suitability` | functional completeness, functional correctness, functional appropriateness |
| `performance efficiency` | time behaviour, resource utilization, capacity |
| `compatibility` | co-existence, interoperability |
| `interaction capability` | appropriateness recognizability, learnability, operability, user error protection, user engagement, inclusivity, user assistance, self-descriptiveness |
| `reliability` | faultlessness, availability, fault tolerance, recoverability |
| `security` | confidentiality, integrity, non-repudiation, accountability, authenticity, resistance |
| `maintainability` | modularity, reusability, analysability, modifiability, testability |
| `flexibility` | adaptability, scalability, installability, replaceability |
| `safety` | operational constraint, risk identification, fail safe, hazard warning, safe integration |

Sources: ISO/IEC 25010, the product quality model, pages 1 and 2 (iso25000.com),
https://iso25000.com/index.php/en/iso-25000-standards/iso-25010 and
https://iso25000.com/index.php/en/iso-25000-standards/iso-25010?start=5

## Older names

| Older name | Read as | Source |
| --- | --- | --- |
| `usability` | characteristic interaction capability | arc42 Quality Model |
| `portability` | characteristic flexibility | arc42 Quality Model |
| `functionality` | characteristic functional suitability | ISO/IEC 9126 (Wikipedia) |
| `efficiency` | characteristic performance efficiency | ISO/IEC 9126 (Wikipedia) |
| `maturity` | sub-characteristic faultlessness | ISO/IEC 9126 (Wikipedia) |
| `user interface aesthetics` | sub-characteristic user engagement | ISO/IEC 9126 (Wikipedia) |
| `accessibility` | sub-characteristic inclusivity | ISO/IEC 9126 (Wikipedia); the mapping to inclusivity is the tool's own choice |

## The units

| Dimension | Units |
| --- | --- |
| time | `ns`, `us`, `ms`, `s`, `min`, `h`, `d` |
| percentage | `%` |
| data size | `B`, `KB`, `MB`, `GB`, `TB`, `KiB`, `MiB`, `GiB`, `TiB` |
| rate | `rps`, `rpm`, `rph` |
| count | `count` |
| score | `score` |

The units are the tool's own list; no page above defines them. docs/inputs.md gives every other name of each unit.

## The rules

| Rule | Default level | Points |
| --- | --- | --- |
| `missing-characteristic` | warning (error with requireAll) | `nineCharacteristics`, `currentEdition`, `qualityModel` |
| `unknown-characteristic` | error | `nineCharacteristics`, `formerNames`, `olderModel`, `firstEdition` |
| `unknown-sub-characteristic` | warning | `firstSubCharacteristics`, `nextSubCharacteristics`, `olderModel` |
| `missing-method` | warning | `measurementDivision`, `acceptanceCriteria` |
| `missing-owner` | warning | `stakeholderNeeds` |
| `unknown-unit` | error | `measurementDivision` |
| `unit-mismatch` | error | `measurementDivision`, `acceptanceCriteria` |
| `duplicate-target` | warning | `acceptanceCriteria` |
| `unverified-target` | warning | `acceptanceCriteria`, `evaluationDivision` |
| `target-missed` | error | `acceptanceCriteria`, `evaluationDivision`, `stakeholderNeeds` |
| `untargeted-measurement` | info | `qualityModel` |
| `invalid-record` | error, always | `csvSameFields`, `acceptanceCriteria` |
| `unreadable-file` | error, always | `jsonUtf8`, `csvRecords` |
| `unparsable-file` | error, always | `csvRecords`, `jsonRepeatedNames` |

### `missing-characteristic`

A required characteristic has no target: a characteristic of the required list (functional suitability, performance efficiency, compatibility, interaction capability, reliability, security, maintainability, flexibility and safety) that no target names.

Points:

- `nineCharacteristics`: the product quality model has nine characteristics: functional suitability, performance efficiency, compatibility, interaction capability, reliability, security, maintainability, flexibility and safety (ISO/IEC 25010, the product quality model, page 1 (iso25000.com), https://iso25000.com/index.php/en/iso-25000-standards/iso-25010)
- `currentEdition`: the current edition defines a product quality model of nine characteristics, divided into sub-characteristics, as a reference for specifying, measuring and evaluating the quality of a product (ISO/IEC 25010, Product quality model, second edition (ISO), https://www.iso.org/standard/78176.html)
- `qualityModel`: the quality model decides which quality characteristics are taken into account when the properties of a software product are evaluated, and it sorts product quality into characteristics and sub-characteristics (ISO/IEC 25010, the product quality model, page 1 (iso25000.com), https://iso25000.com/index.php/en/iso-25000-standards/iso-25010)

The tool's own choice: which characteristics need a target is the tool's own choice, set by the required list of the configuration (all nine by default); a target row with the characteristic counts, whether or not its target can be read; a warning, or an error with --require-all or requireAll, which then win over the level of the rule.

What to change: add a target for the characteristic with a metric, a unit, a target value and an owner, or take the characteristic out of the required list of the configuration.

### `unknown-characteristic`

A characteristic is not one of ISO/IEC 25010: a target whose characteristic is none of the nine of ISO/IEC 25010 and none of the 4 aliases of the configuration, or is empty.

Points:

- `nineCharacteristics`: the product quality model has nine characteristics: functional suitability, performance efficiency, compatibility, interaction capability, reliability, security, maintainability, flexibility and safety (ISO/IEC 25010, the product quality model, page 1 (iso25000.com), https://iso25000.com/index.php/en/iso-25000-standards/iso-25010)
- `formerNames`: interaction capability was formerly called usability, and flexibility was formerly called portability (ISO/IEC 25010, Systems and Software Quality (arc42 Quality Model), https://quality.arc42.org/standards/iso-25010)
- `olderModel`: ISO/IEC 9126, the model before ISO/IEC 25010, named functionality and efficiency where ISO/IEC 25010 names functional suitability and performance efficiency, and had maturity under reliability (ISO/IEC 9126 (Wikipedia), https://en.wikipedia.org/wiki/ISO/IEC_9126)
- `firstEdition`: the first edition, now withdrawn, had a product quality model of eight characteristics (ISO/IEC 25010, System and software quality models, first edition, withdrawn (ISO), https://www.iso.org/standard/35733.html)

The tool's own choice: a characteristic is compared with the letters A to Z lowered and every other character made a space, with the nine names and the aliases (the older names usability, portability, functionality and efficiency are built in); a near name is suggested, never used; the target is still compared with its measurements.

What to change: write one of the nine characteristics, such as performance efficiency or reliability, or add the name your team uses to characteristicAliases in the configuration.

### `unknown-sub-characteristic`

A sub-characteristic is not one of its characteristic: a target with a sub-characteristic that is not one of src/model.js, or that belongs to another characteristic.

Points:

- `firstSubCharacteristics`: each characteristic is made of sub-characteristics, such as time behaviour, resource utilization and capacity for performance efficiency, or learnability, operability and inclusivity for interaction capability (ISO/IEC 25010, the product quality model, page 1 (iso25000.com), https://iso25000.com/index.php/en/iso-25000-standards/iso-25010)
- `nextSubCharacteristics`: reliability, security, maintainability, flexibility and safety have sub-characteristics of their own, such as faultlessness and availability, confidentiality and resistance, testability, scalability, and fail safe (ISO/IEC 25010, the product quality model, page 2 (iso25000.com), https://iso25000.com/index.php/en/iso-25000-standards/iso-25010?start=5)
- `olderModel`: ISO/IEC 9126, the model before ISO/IEC 25010, named functionality and efficiency where ISO/IEC 25010 names functional suitability and performance efficiency, and had maturity under reliability (ISO/IEC 9126 (Wikipedia), https://en.wikipedia.org/wiki/ISO/IEC_9126)

The tool's own choice: a sub-characteristic is optional; when one is written it must be a sub-characteristic of the characteristic of the target, by its name or by an older name or spelling of src/model.js; a warning, because the target can still be checked.

What to change: write a sub-characteristic of the characteristic, such as time behaviour for performance efficiency or availability for reliability, or leave the column empty.

### `missing-method`

A target has no measurement method: a target with an empty measurement method, or a targets file with no method column.

Points:

- `measurementDivision`: the ISO/IEC 2502n division of the series gives a reference model for measurement, defined quality measures and guidance on applying them, with ISO/IEC 25023 for measures of system and software product quality (The ISO/IEC 25000 series of standards, page 1 (iso25000.com), https://iso25000.com/index.php/en/iso-25000-standards)
- `acceptanceCriteria`: the uses of the model include identifying acceptance criteria for a product and establishing measures of its quality characteristics (ISO/IEC 25010, Product quality model, second edition (ISO), https://www.iso.org/standard/78176.html)

The tool's own choice: a method that is empty or a blank word such as none, n/a or tbd; any other text counts as a method, the tool cannot tell whether it measures the metric.

What to change: write how the metric is measured: the tool, the test or the query, and where it runs.

### `missing-owner`

A target has no owner: a target with an empty owner, or a targets file with no owner column.

Points:

- `stakeholderNeeds`: the quality of a system is how far it meets the stated and implied needs of its stakeholders, such as functionality, performance, security and maintainability, and those needs are what the model represents (ISO/IEC 25010, the product quality model, page 1 (iso25000.com), https://iso25000.com/index.php/en/iso-25000-standards/iso-25010)

The tool's own choice: an owner per target is the tool's own choice: a target that nobody answers for is not kept up to date when the application changes; any text counts as an owner.

What to change: name the person or team who answers for the target and acts when it is missed.

### `unknown-unit`

A unit is not one the tool knows: a target with no unit, or a target or measurement whose unit is none of the units of src/units.js, or that names two different units.

Points:

- `measurementDivision`: the ISO/IEC 2502n division of the series gives a reference model for measurement, defined quality measures and guidance on applying them, with ISO/IEC 25023 for measures of system and software product quality (The ISO/IEC 25000 series of standards, page 1 (iso25000.com), https://iso25000.com/index.php/en/iso-25000-standards)

The tool's own choice: a target needs a unit from src/units.js or the unitAliases of the configuration (count and score stand for a number with no other unit); a measurement with no unit takes the unit of its target; a target or measurement with a unit the tool does not know is not compared, and its target counts as unverified.

What to change: write the unit as one the tool knows, such as ms, s, %, MB, MiB, rps or count, or add the name your team uses to unitAliases in the configuration.

### `unit-mismatch`

A measurement is in a unit that cannot be compared with its target: a measurement whose unit measures another dimension than the unit of its target.

Points:

- `measurementDivision`: the ISO/IEC 2502n division of the series gives a reference model for measurement, defined quality measures and guidance on applying them, with ISO/IEC 25023 for measures of system and software product quality (The ISO/IEC 25000 series of standards, page 1 (iso25000.com), https://iso25000.com/index.php/en/iso-25000-standards)
- `acceptanceCriteria`: the uses of the model include identifying acceptance criteria for a product and establishing measures of its quality characteristics (ISO/IEC 25010, Product quality model, second edition (ISO), https://www.iso.org/standard/78176.html)

The tool's own choice: two units can be compared when they measure the same dimension (time, percentage, data size, rate, count or score), and the measurement is then converted to the unit of the target; a percentage is never read as a count, and a time never as a rate.

What to change: measure the metric in the unit of the target, or correct the unit of the target or of the measurement.

### `duplicate-target`

A metric has the same comparison twice: a target whose metric and comparison an earlier target already has.

Points:

- `acceptanceCriteria`: the uses of the model include identifying acceptance criteria for a product and establishing measures of its quality characteristics (ISO/IEC 25010, Product quality model, second edition (ISO), https://www.iso.org/standard/78176.html)

The tool's own choice: two targets with the same metric, compared in their term form, and the same comparison; both are still checked, so the stricter one decides; a lower and an upper limit of one metric are not duplicates.

What to change: keep one target per metric and comparison, or name the metrics apart.

### `unverified-target`

A target has no measurement: a target whose metric has no measurement in the measurements files.

Points:

- `acceptanceCriteria`: the uses of the model include identifying acceptance criteria for a product and establishing measures of its quality characteristics (ISO/IEC 25010, Product quality model, second edition (ISO), https://www.iso.org/standard/78176.html)
- `evaluationDivision`: the ISO/IEC 2504n division gives the requirements and guidance for evaluating a product, with ISO/IEC 25040 as the reference model for specifying and evaluating software quality (The ISO/IEC 25000 series of standards, page 2 (iso25000.com), https://iso25000.com/index.php/en/iso-25000-standards?start=5)

The tool's own choice: a measurement belongs to a target when their metrics are the same in their term form; a warning, because a target with no result says nothing about the application yet.

What to change: add a measurement of the metric, from the method the target names, to the measurements file.

### `target-missed`

A measurement misses its target: a measurement that does not meet the comparison of its target.

Points:

- `acceptanceCriteria`: the uses of the model include identifying acceptance criteria for a product and establishing measures of its quality characteristics (ISO/IEC 25010, Product quality model, second edition (ISO), https://www.iso.org/standard/78176.html)
- `evaluationDivision`: the ISO/IEC 2504n division gives the requirements and guidance for evaluating a product, with ISO/IEC 25040 as the reference model for specifying and evaluating software quality (The ISO/IEC 25000 series of standards, page 2 (iso25000.com), https://iso25000.com/index.php/en/iso-25000-standards?start=5)
- `stakeholderNeeds`: the quality of a system is how far it meets the stated and implied needs of its stakeholders, such as functionality, performance, security and maintainability, and those needs are what the model represents (ISO/IEC 25010, the product quality model, page 1 (iso25000.com), https://iso25000.com/index.php/en/iso-25000-standards/iso-25010)

The tool's own choice: every measurement of a metric is compared with every target of the metric, after conversion to the unit of the target and with twelve significant digits; a target is missed when one of its measurements misses it, and the gap is shown in the unit of the target.

What to change: improve the application until the measurement meets the target, or change the target in a reviewed commit when the need has changed.

### `untargeted-measurement`

A measurement has no target: a measurement whose metric no target names.

Points:

- `qualityModel`: the quality model decides which quality characteristics are taken into account when the properties of a software product are evaluated, and it sorts product quality into characteristics and sub-characteristics (ISO/IEC 25010, the product quality model, page 1 (iso25000.com), https://iso25000.com/index.php/en/iso-25000-standards/iso-25010)

The tool's own choice: info by default: a measured value with no target may be a target that was forgotten or a metric written two ways, such as p95 latency and latency p95.

What to change: add a target for the metric, or write the metric as its target writes it.

### `invalid-record`

A record that cannot be read: a target or measurement with no metric, the wrong number of fields, no target or value the tool can read, or a value of the wrong kind.

Points:

- `csvSameFields`: every line of a CSV file should hold the same number of fields (RFC 4180, Common Format and MIME Type for Comma-Separated Values (CSV) Files, https://www.rfc-editor.org/rfc/rfc4180)
- `acceptanceCriteria`: the uses of the model include identifying acceptance criteria for a product and establishing measures of its quality characteristics (ISO/IEC 25010, Product quality model, second edition (ISO), https://www.iso.org/standard/78176.html)

The tool's own choice: a record with no metric, a CSV row with a different number of fields than the header, a JSON record that is not an object or names a field twice, a target with no comparison or no number, and a measurement with no number are not checked; a value of the wrong kind is taken as empty; this rule cannot be set lower or off.

What to change: correct the record at the line named.

### `unreadable-file`

A file that cannot be read: a targets or measurements file that the tool could not read as UTF-8 text.

Points:

- `jsonUtf8`: JSON text exchanged between systems must be UTF-8, and a reader may ignore a byte order mark at the start (RFC 8259, The JSON Data Interchange Format, https://www.rfc-editor.org/rfc/rfc8259)
- `csvRecords`: each record of a CSV file is on its own line, ended by CRLF, the first line may be a header, and a field that holds a comma, a double quote or a line break is put in double quotes, with a double quote inside it written twice (RFC 4180, Common Format and MIME Type for Comma-Separated Values (CSV) Files, https://www.rfc-editor.org/rfc/rfc4180)

The tool's own choice: a file that is over its size limit, binary, UTF-16, not valid UTF-8 or not there to open is an error and nothing in it is checked; this rule cannot be set lower or off.

What to change: export the file as UTF-8 CSV or JSON.

### `unparsable-file`

A file that is not CSV or JSON the readers accept, or not a list of targets or measurements: a targets or measurements file that the CSV or JSON reader refuses, or whose header or shape is not that of its role.

Points:

- `csvRecords`: each record of a CSV file is on its own line, ended by CRLF, the first line may be a header, and a field that holds a comma, a double quote or a line break is put in double quotes, with a double quote inside it written twice (RFC 4180, Common Format and MIME Type for Comma-Separated Values (CSV) Files, https://www.rfc-editor.org/rfc/rfc4180)
- `jsonRepeatedNames`: when an object repeats a name the behavior of the software that reads it cannot be predicted, so the reader of this tool refuses a repeated name (RFC 8259, The JSON Data Interchange Format, https://www.rfc-editor.org/rfc/rfc8259)

The tool's own choice: a quoted CSV field that is not closed, a stray double quote, a header that lacks a column the file needs or names one twice, JSON that does not parse or repeats a name, or JSON that is not a list of records stops the reading of the file, and nothing in it is checked; this rule cannot be set lower or off.

What to change: correct the file at the line and column named.

## Points that no rule rests on

- `csvInjection`: a spreadsheet may read a cell that starts with =, +, -, @, a tab or a line break as a formula, and no one escape is safe in every program that opens the file (CSV Injection (OWASP), https://community.owasp.org/attacks/CSV_Injection). Behind the formula guard of `--format csv`.
- `githubAnnotations`: a line of output such as ::warning file=...,line=...::message becomes an annotation on that file and line in the run (Workflow commands for GitHub Actions (GitHub Docs), https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands). Behind `--format github`.

## The pages

- ISO/IEC 25010, the product quality model, page 1 (iso25000.com): https://iso25000.com/index.php/en/iso-25000-standards/iso-25010
- ISO/IEC 25010, the product quality model, page 2 (iso25000.com): https://iso25000.com/index.php/en/iso-25000-standards/iso-25010?start=5
- The ISO/IEC 25000 series of standards, page 1 (iso25000.com): https://iso25000.com/index.php/en/iso-25000-standards
- The ISO/IEC 25000 series of standards, page 2 (iso25000.com): https://iso25000.com/index.php/en/iso-25000-standards?start=5
- ISO/IEC 25010, Product quality model, second edition (ISO): https://www.iso.org/standard/78176.html
- ISO/IEC 25010, System and software quality models, first edition, withdrawn (ISO): https://www.iso.org/standard/35733.html
- ISO/IEC 25010, Systems and Software Quality (arc42 Quality Model): https://quality.arc42.org/standards/iso-25010
- ISO/IEC 9126 (Wikipedia): https://en.wikipedia.org/wiki/ISO/IEC_9126
- RFC 4180, Common Format and MIME Type for Comma-Separated Values (CSV) Files: https://www.rfc-editor.org/rfc/rfc4180
- RFC 8259, The JSON Data Interchange Format: https://www.rfc-editor.org/rfc/rfc8259
- CSV Injection (OWASP): https://community.owasp.org/attacks/CSV_Injection
- Workflow commands for GitHub Actions (GitHub Docs): https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
