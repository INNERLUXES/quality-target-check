# 2. Read older names of the model as aliases, and never guess a near name

## Status

Accepted

## Context

Quality targets are written by many teams over a long time. A list started under the first edition of ISO/IEC 25010
says usability and portability; one that goes back to ISO/IEC 9126 says functionality and efficiency; the current
edition says interaction capability and flexibility. Sub-characteristics moved too: maturity became faultlessness, and
user interface aesthetics and accessibility gave way to user engagement, inclusivity and user assistance. Names are
also written in many forms (`Performance-Efficiency`, `time behavior`) and with typos (`Reliabilty`).

A checker could refuse every name that is not the current one, which turns every old list into a wall of errors that
says nothing about quality. It could guess, and read `Reliabilty` or `perf` as the nearest name, which makes a list
look complete when nobody decided what a name means. Or it could read the names whose meaning is documented and
report the rest.

## Decision

1. src/model.js holds the nine characteristics of the current model and their sub-characteristics, as the
   iso25000.com pages describe them, as a documented data file.
2. The older names of the characteristics (usability, portability, functionality, efficiency) are built-in aliases in
   the configuration, where `--print-defaults` shows them and a team can set one `off` or add its own. Older names and
   other spellings of sub-characteristics are fixed in src/model.js. Accessibility is read as inclusivity; that mapping
   is the tool's own choice, and docs/rules-and-sources.md says so.
3. Names are compared in their term form, so case, spaces, hyphens and underscores never matter.
4. A name that is neither a name nor an alias is an `unknown-characteristic` or `unknown-sub-characteristic` finding.
   A near name may be suggested in the finding; it is never used. The target is still compared with its measurements,
   so a typo in one column cannot hide a missed target.

## Consequences

- A list written for an older model passes without being rewritten, and the summary counts each older name under the
  current characteristic it stands for.
- A typo is one finding with a suggestion, fixed in one cell.
- When the standard is revised again, src/model.js and the aliases change in a reviewed commit, checked against the
  pages first (CONTRIBUTING.md).
