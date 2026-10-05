# Secure defaults

The default run is the safe run. Nothing in the first section needs a flag, and none of it can be switched off. The rest
of the document is about what the tool cannot do for you: which files you give it, where the output goes, and who may
change the targets and the configuration. The tool is a check of the files, not a certification; a passing run is a
set of targets in good order that the measurements meet, not a finding that the application conforms to a standard.

## How the tool behaves by default

- **Reads, never follows.** The tool reads the files it is given and the configuration named with `--config`. It
  walks no folder, follows no symbolic link, fetches no web address, refuses an argument that looks like an address,
  evaluates nothing, starts no program and writes nothing to disk.
- **Every rule on from the first run.** The gaps that make a comparison wrong or impossible are errors (an unknown
  characteristic, an unknown unit, units of two dimensions, a missed target), and the ones that need a decision are
  warnings (a required characteristic with no target, an unknown sub-characteristic, no method, no owner, a duplicate
  target, a target with no measurement). A measurement with no target is information.
- **All nine characteristics required.** The built-in `required` list holds the nine characteristics of the model, so
  a characteristic nobody set a target for shows up on the first run.
- **Fail closed on what it cannot read.** A file that cannot be read, a file the readers refuse and a record that
  cannot be read are error findings that fail the run at the default `failOn` of `error`; these three rules have no key
  and cannot be lowered or set off. A path that cannot be used stops the run with exit code `2` and no result.
- **Unknown means not compared.** A target whose unit the tool does not know is never counted as met, and a
  measurement in a unit of another dimension is never compared
  ([decision 3](decisions/0003-compare-only-units-of-one-dimension-and-make-unreadable-input-an-error.md)).
- **No guesses.** An unknown characteristic, sub-characteristic or unit is reported, not matched to a near one; a near
  name is only suggested
  ([decision 2](decisions/0002-read-older-names-of-the-model-as-aliases-and-never-guess-a-near-name.md)).
- **Unknown keys are errors.** A key in the configuration that the tool does not know stops the run, with its line and
  a suggestion, so a typo such as `requireAl` cannot leave a default in place. A key named twice stops the run.
- **No regular expression from the input.** No pattern is built from the targets, the measurements or the
  configuration.
- **No prototype tricks.** Objects are built with own properties and names are looked up with `Object.hasOwn` or in
  maps, so `__proto__` is only a name.
- **Clean output.** Text from the input, file names included, has control characters, line separators and direction
  controls removed and its length capped before it reaches a report or an error message. The GitHub format escapes
  `%`, CR and LF in a message and also `:` and `,` in a property, so a text cannot end a workflow command early or
  start another one. The CSV format puts a single quote in front of a field that a spreadsheet could read as a formula.
- **The same input gives the same output.** No clock, no zone, no locale and no random number
  ([decision 1](decisions/0001-read-no-clock-and-keep-dates-out-of-the-repository.md)).
- **No dependencies.** Node 22 or newer and nothing else.

## Settings that make the check stricter

- **`--require-all` or `"requireAll": true`.** A required characteristic with no target fails the run.
- **`"failOn": "warning"`.** Targets with no method, no owner or no measurement, unknown sub-characteristics and
  duplicate targets fail the run too. Use it once the errors are fixed.
- **`"rules": { "untargetedMeasurement": "warning" }`.** A measured metric with no target needs a decision.
- **Keep the aliases short.** Every alias is a name the check accepts as a characteristic or a unit. A unit alias
  decides how a value is converted, and a characteristic alias decides where a target is counted; review each one.

## Running it in a pipeline

```yaml
permissions:
  contents: read
steps:
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
  - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
    with:
      node-version: 22
  # The steps that measure the application write results.json here.
  - name: Quality target check
    run: npx --yes github:INNERLUXES/quality-target-check quality/targets.csv --measurements results.json --config quality/check.json --format github
```

- Give the job read access to the contents and nothing more. The tool needs no secret.
- Pin every action to a full commit, as above, and pin the tool to a release commit or a tag you have read, because
  `npx` runs what it downloads.
- Do not hide the exit code with a trailing `|| true`. To list the findings without failing, keep `failOn` at `error`
  and keep the JSON report or the CSV result list as an artifact of the job.
- Write the measurements in the same job that checks them, from the methods the targets name, so the values are the
  ones of the commit under review.
- Treat a CSV result list built from files you do not trust as untrusted data: open it with formulas off.

## Protecting the targets and the configuration

The targets decide what the application must meet, and the configuration decides which rules report, which
characteristics are required, how units are named and what fails the run. Keep both in the repository, put their
paths in `CODEOWNERS` with the people who own the quality of the application, and require their review in branch
protection. Review a change that loosens a target, removes one, sets a rule to off or lower, empties the required list,
adds an alias or raises `failOn` like a change to code: each of them can hide a gap.

## SSDF

The repository is checked against NIST SP 800-218 (SSDF) in its own pipeline and before every release, with
`ssdf-repo-check` pinned to its release commit. The evidence it looks for is in these files:

| Practice | Evidence in this repository |
| --- | --- |
| PO.1 Define security requirements | CONTRIBUTING.md, docs/secure-defaults.md |
| PO.2 Roles and responsibilities | .github/CODEOWNERS |
| PO.3 Toolchain | .github/workflows/ci.yml, codeql.yml, release.yml |
| PO.4 Criteria for security checks | CodeQL with the security-extended queries, the SSDF gate in ci.yml and release.yml |
| PO.5 Secure environments | a `permissions:` block in every workflow, actions pinned to commits |
| PS.1 Protect the code | .gitignore for keys and `.env`, `npm run check` for committed secrets |
| PS.2 Integrity of releases | SHA-256 checksums and a build provenance attestation in release.yml |
| PS.3 Archive and provenance | a CycloneDX SBOM and the CHANGELOG with every release |
| PW.1 Design for security | docs/threat-model.md |
| PW.2 Review the design | docs/decisions |
| PW.4 Reuse secure components | no runtime dependencies, a lock file, Dependabot |
| PW.5 Secure coding | CONTRIBUTING.md, `npm run check` |
| PW.6 Build settings | `npm ci` from the lock file |
| PW.7 Code review | the pull request template and CODEOWNERS |
| PW.8 Testing | `npm test` on Linux, Windows and macOS with Node 22 and 24, `npm run test:coverage`, hostile input tests |
| PW.9 Secure defaults | this document |
| RV.1 Find vulnerabilities | SECURITY.md, Dependabot |
| RV.2 Respond to vulnerabilities | SECURITY.md |
