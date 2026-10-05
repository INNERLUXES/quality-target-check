# Fernhollow library app: every target met

A made-up library application with one target for each of the nine characteristics of ISO/IEC 25010 in
`targets.json`, and a measurement for each in `measurements.csv`. A search time measured in seconds against a target
in milliseconds and a time to diagnose measured in minutes against a target in hours are converted before they are
compared. The run passes with no finding.

```
node bin/quality-target-check.js examples/clean/targets.json --measurements examples/clean/measurements.csv
```
