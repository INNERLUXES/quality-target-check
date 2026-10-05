# Sources

The public pages the checks of this tool are based on, each with a short note in this project's own words on what the
page says and which parts of the tool lean on it. Nothing here is a copy of a page: read the page itself for its exact
wording. src/data.js holds the pages and the points the reports show, src/model.js holds the quality model taken from
the first two pages, and test/data.test.js checks that every page in src/data.js is listed here.
Each page was fetched and read before it was listed.

The tool is a check of the files it is given, not a certification. These notes say what the pages say so a reader can
follow a finding back to its source; they are not an interpretation of the standard for any one product.

## The quality model

The ISO/IEC 25010 standard itself is sold by ISO and is not quoted here. The tool takes the names of the
characteristics and sub-characteristics from the public pages of iso25000.com, a portal on the ISO/IEC 25000 series
that describes the model one characteristic at a time, and checks them against the public pages of ISO.

### ISO/IEC 25010, the product quality model, page 1 (iso25000.com)

https://iso25000.com/index.php/en/iso-25000-standards/iso-25010

The page calls the quality model the cornerstone of an evaluation of product quality: the model decides which quality
characteristics are looked at when the properties of a software product are evaluated. It describes the quality of a
system as how far the system meets the stated and implied needs of its stakeholders, and says those needs
(functionality, performance, security, maintainability and so on) are what the model represents, sorted into
characteristics and sub-characteristics. It names the nine characteristics of the product quality model and describes
the first four with their sub-characteristics: functional suitability (functional completeness, functional
correctness, functional appropriateness), performance efficiency (time behaviour, resource utilization, capacity),
compatibility (co-existence, interoperability) and interaction capability (appropriateness recognizability,
learnability, operability, user error protection, user engagement, inclusivity, user assistance,
self-descriptiveness). `missing-characteristic`, `unknown-characteristic`, `unknown-sub-characteristic`,
`missing-owner`, `target-missed` and `untargeted-measurement` lean on it, and src/model.js takes its names from it.

### ISO/IEC 25010, the product quality model, page 2 (iso25000.com)

https://iso25000.com/index.php/en/iso-25000-standards/iso-25010?start=5

The second page of the same article describes the other five characteristics with their sub-characteristics:
reliability (faultlessness, availability, fault tolerance, recoverability), security (confidentiality, integrity,
non-repudiation, accountability, authenticity, resistance), maintainability (modularity, reusability, analysability,
modifiability, testability), flexibility (adaptability, scalability, installability, replaceability) and safety
(operational constraint, risk identification, fail safe, hazard warning, safe integration). src/model.js takes these
names from it, and `unknown-sub-characteristic` leans on it.

### The ISO/IEC 25000 series of standards, page 1 (iso25000.com)

https://iso25000.com/index.php/en/iso-25000-standards

The overview of the series, also called SQuaRE, which grew out of ISO/IEC 9126 and ISO/IEC 14598. It lists the
divisions of the series. The quality model division holds ISO/IEC 25010 and the data quality model of ISO/IEC 25012.
The quality measurement division holds a reference model and guide for measurement (ISO/IEC 25020), quality measure
elements (ISO/IEC 25021) and measures of quality in use, of system and software product quality (ISO/IEC 25023) and of
data quality. `missing-method`, `unknown-unit` and `unit-mismatch` lean on it: a target is only useful with a defined
way to measure it.

### The ISO/IEC 25000 series of standards, page 2 (iso25000.com)

https://iso25000.com/index.php/en/iso-25000-standards?start=5

The second page of the overview describes the quality evaluation division: ISO/IEC 25040, the reference model and
guide for evaluation with the general requirements for specifying and evaluating software quality, ISO/IEC 25041 for
developers, acquirers and independent evaluators, ISO/IEC 25042 on evaluation modules and ISO/IEC 25045 on an
evaluation module for recoverability. `unverified-target` and `target-missed` lean on it: an evaluation compares
measured values with what was specified.

### ISO/IEC 25010, Product quality model, second edition (ISO)

https://www.iso.org/standard/78176.html

The catalogue page of the current edition. Its abstract says the document defines a product quality model of nine
characteristics, divided into sub-characteristics, for ICT products and software products, as a reference for
specifying, measuring and evaluating the quality of a product. It lists uses of the model, among them identifying
acceptance criteria for a product and establishing measures of its quality characteristics. The tool reads the nine
characteristics as the current model, and `missing-characteristic`, `missing-method`, `unit-mismatch`,
`duplicate-target`, `unverified-target`, `target-missed` and `invalid-record` lean on it.

### ISO/IEC 25010, System and software quality models, first edition, withdrawn (ISO)

https://www.iso.org/standard/35733.html

The catalogue page of the first edition, now withdrawn. Its abstract says it defined a quality in use model and a
product quality model of eight characteristics. Targets written for that edition use its names, so the tool reads
them as aliases (`unknown-characteristic`).

### ISO/IEC 25010, Systems and Software Quality (arc42 Quality Model)

https://quality.arc42.org/standards/iso-25010

A page of the arc42 quality model that lists the nine characteristics of the current edition with their
sub-characteristics, and notes that interaction capability was formerly called usability and flexibility was formerly
called portability. The built-in aliases usability and portability rest on it (`unknown-characteristic`).

### ISO/IEC 9126 (Wikipedia)

https://en.wikipedia.org/wiki/ISO/IEC_9126

The article on ISO/IEC 9126, the quality model that ISO/IEC 25010 replaced. It lists the characteristics of that
model, among them functionality, efficiency, usability and portability, with maturity under reliability, and
describes what changed in ISO/IEC 25010: functionality became functional suitability, efficiency became performance
efficiency, compatibility and security were added, attractiveness became user interface aesthetics, and accessibility
was added under usability. The built-in aliases functionality and efficiency and the older sub-characteristic names
maturity, user interface aesthetics and accessibility rest on it (`unknown-characteristic`,
`unknown-sub-characteristic`).

## Formats

### RFC 4180, Common Format and MIME Type for Comma-Separated Values (CSV) Files

https://www.rfc-editor.org/rfc/rfc4180

The memo that describes CSV: each record on its own line, ended by CRLF, the last line break optional, an optional
header line first, fields separated by commas, spaces kept as part of a field, and every line with the same number of
fields. A field that holds a comma, a double quote or a line break is put in double quotes, and a double quote inside
such a field is written twice. The reader of the tool follows it, accepts LF and a lone CR as line ends too, and refuses
a quoted field that is not closed or a double quote in a field that does not start with one (`unparsable-file`); a row
with a different number of fields than the header is an `invalid-record` finding. `--format csv` writes the result
list this way, with CRLF line ends.

### RFC 8259, The JSON Data Interchange Format

https://www.rfc-editor.org/rfc/rfc8259

The JSON standard. Its section on objects notes that when the names in an object are not unique, programs that read it
behave in different ways; the reader of the tool refuses a repeated name instead of keeping one of the values, so a
target or a setting never depends on which value a library would keep. Its section on encoding asks for UTF-8 between
systems and lets a reader ignore a byte order mark; the tool reads UTF-8 only, skips a byte order mark, and reports a
UTF-16 file as an `unreadable-file` finding.

### CSV Injection (OWASP)

https://community.owasp.org/attacks/CSV_Injection

The page on formulas hidden in CSV files. A spreadsheet may treat a cell that starts with `=`, `+`, `-`, `@`, a tab or
a line break as a formula, and the page warns that no single escape is safe in every program and for every later
reader. The CSV format of the tool puts a single quote in front of such a field, a target of `== 0` included, and
docs/threat-model.md says why that is a help and not a guarantee.

### Workflow commands for GitHub Actions (GitHub Docs)

https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands

The page that describes the `::notice`, `::warning` and `::error` commands with their `file`, `line`, `col` and
`title` properties, which turn a line of output into an annotation on a file. `--format github` writes one such command
per finding, info as a notice, and escapes the characters a command gives a meaning to.
