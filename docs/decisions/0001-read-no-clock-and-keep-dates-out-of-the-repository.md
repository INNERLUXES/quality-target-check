# 1. Read no clock, and keep dates out of the repository

## Status

Accepted

## Context

A check of quality targets is tempting to tie to the calendar: a measurement that is too old to count, a target with a
review date that turns into an error when it passes, a report that says how many days a target has been missed. Each
of these would make the same files give a different result on a different day, so a pipeline that passed yesterday
could fail today with no change to the repository, and two people checking the same commit could see two reports. The
output could never be saved and compared.

The checks do not need a date. Whether a target names a characteristic, a unit, an owner and a method, and whether a
measurement meets it, can all be read from the files as they are. Whether a measurement is recent enough is a question
for the pipeline that produces it: a pipeline that measures on every change hands the tool fresh results every time.

## Decision

1. The tool reads no clock, no time zone and no locale. The same targets, measurements and configuration give the same
   output on every machine and on every day.
2. A unit of time such as `d` or `h` is a unit of a measured value, converted and compared like any other unit, never
   compared with today. The targets, the measurements and the configuration have no key or column that holds a date. A
   team that wants a deadline raises `failOn` or a rule in a commit of its own, where the change can be reviewed.
3. No file of this repository holds a date or a number that reads like a year: not the licence, not the changelog, not
   the examples, not the documents, not the comments of the code. `npm run check` and a test fail on any number that
   reads like a year. Version numbers such as Node 22, RFC 4180 or 1.0.0 and the numbers of standards such as ISO/IEC
   25010 are not years and are fine; the publication years of the editions of the standard are left out.

## Consequences

- The output of a run can be saved in the repository (`examples/output`) and compared on every change, because it
  does not move with the calendar.
- The editions of ISO/IEC 25010 are named as the current edition and the first edition, with the catalogue pages of
  ISO, never by the years of their texts. A reader checks the current page.
- The example values are chosen so that no measured number or gap reads like a year.
