# Quillmoor Bookings: targets partly missed

A made-up booking application. `targets.csv` holds its quality targets and `measurements.json` the results of its
last load test, probes, scans and reviews. Some targets are missed and the files hold one problem of each other kind:

- a p95 checkout latency over its target, API memory measured in GiB over a target in MiB, a monthly availability
  under its target and two critical vulnerabilities where none are allowed;
- a characteristic written as Reliabilty, a sub-characteristic written as interoperabilty, a unit written as
  milisecond, a target written as fast, and an installation time measured in MB;
- a target with no owner, no method and no measurement, the same metric and comparison twice, and a measurement of an
  error budget burn that no target names;
- no target for functional suitability or safety, which `../config.json` requires.

The files also hold what must not be reported: the older name usability, a throughput measured in `req/sec`, which the
configuration names as rps, a time to restore measured in hours against a target in minutes, and the looser of two
availability targets, which the measurement meets.

```
node bin/quality-target-check.js examples/missed/targets.csv --measurements examples/missed/measurements.json --config examples/config.json
```
