# Limits

The tool reads quality targets and measured results as they are written: CSV or JSON files that list targets with
their characteristic, metric, unit, comparison, owner and method, and measurements with their metric, value and
source. It is a check of the files, not a certification. It runs no measurement, does not look at the application,
connect to a monitoring system, a test runner or a dashboard, or ask anyone anything. A finding points at something in
a file; a run without findings says only that the files hold none of the problems of docs/method.md. Every report ends
with a sentence that says so.

## What it cannot see

- **Whether the application conforms to ISO/IEC 25010.** The standard defines a model, not a pass mark. The tool checks
  that each target names a characteristic of the model and that the measurements meet the targets; it does not judge
  whether the targets are the right ones, whether they cover what the users need, or whether a characteristic is
  covered well by one target. It is not a certification, and an evaluation under ISO/IEC 25040 needs people.
- **Whether a measurement is true.** The tool runs no measurement. A value in the measurements file is taken as
  measured; the tool cannot tell whether the load test ran against the right build, whether the probe was up, or
  whether the value was copied from an old run.
- **Whether a measurement is recent.** The tool reads no clock and no dates
  ([decision 1](decisions/0001-read-no-clock-and-keep-dates-out-of-the-repository.md)); a pipeline that measures on
  every change and passes the fresh results is what keeps them recent.
- **Whether a method measures the metric.** Any text is a method and any text is an owner.
- **Whether a metric is the one its target means.** A measurement belongs to a target when their metrics are the same
  in their term form. `p95 latency` and `latency p95` are two metrics, and a measurement of the wrong metric with the
  right name is compared.
- **Statistics.** Each measurement is one number compared with one target. The tool does not compute a percentile, an
  average or a trend from raw samples; give it the value the target names, such as the p95 the load test reports.
- **Units it does not know.** src/units.js lists the units; a unit that is not there, bits included, is reported and
  not compared until it is named with `unitAliases` or converted. Because the letters of a unit are lowered, `Mb` is a
  megabyte. The count units are one unit: a count of defects and a count of tests can be compared.
- **Numbers written in another style.** A number has a point for the decimals and no grouping of digits; `1,500` and
  `2,5` are reported as values with no number.
- **Sub-characteristics in depth.** A sub-characteristic is optional; the tool checks only that it belongs to the
  characteristic of its target. It does not ask for a target for every sub-characteristic.
- **Quality in use and data quality.** The tool reads the product quality model of ISO/IEC 25010 only; the quality in
  use model and the data quality model of ISO/IEC 25012 are not read.
- **Names that differ by more than case and punctuation.** Characteristics, sub-characteristics, units and metrics are
  read by name, never matched to a near one; a near characteristic, sub-characteristic or unit is only suggested.
- **Spreadsheet files.** A sheet saved as `.xlsx` or `.ods` is not read; export it as UTF-8 CSV. A CSV file in another
  encoding, or saved as UTF-16, is an `unreadable-file` finding. The separator is always the comma.

## The readers

- The CSV reader follows RFC 4180, accepts LF and a lone CR as line ends too, keeps white space inside a field (the
  record reader trims it afterwards), and refuses a quoted field that is not closed, a character after a closing
  quote, and a double quote inside an unquoted field. It reads no other separator, no comment lines and no escapes with
  a backslash.
- The JSON reader follows RFC 8259 and refuses comments, trailing commas, single quotes and a name given twice in one
  object.

## Size limits

Past a limit, the input is refused with exit code `2` and no result, the file is an error finding, or, where the limit
is on the work and not the input, the report says so in a note.

| What | Limit |
| --- | --- |
| a targets or measurements file | 32 MB; a larger file is an `unreadable-file` finding |
| all the files of a run | 256 MB |
| files on the command line | 100, targets and measurements together |
| records in a file | 200,000; more is an `unparsable-file` finding |
| a CSV field or a JSON string | 65,536 characters |
| CSV fields in a record | 1,000 |
| JSON values in a file | 5,000,000, nested 32 deep |
| configuration file | 1 MB; nesting 32 deep; 500 aliases of each kind of up to 100 characters |
| suggestions of a near name | the first 100 unknown names of a run |
| findings of one rule | 500 listed; the rest are counted in a note and still count for the result |
| problems of the input | 20 listed; the rest are counted |

The tests check a hundred thousand targets with a hundred thousand measurements and every check to run, three thousand
names the tool does not know, values of sixty thousand characters for every pattern, and runs of hundreds of thousands
of quotes, commas, line breaks and brackets, each with a time check.
