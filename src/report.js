// The reports: text for a terminal, JSON for other tools, and GitHub workflow commands that turn each finding into an
// annotation on the file, line and column. The CSV result list is in src/csv.js. Every text from the input (a file
// name, a characteristic, a metric or any other value) was cleaned by safeText before it reached the report object. The
// GitHub commands also escape the characters a command gives a meaning to, so a text in the input cannot end a command
// early or start another one.

import { KINDS } from './kinds.js';
import { grouped, plural } from './size.js';
import { safeText } from './text.js';

const clean = (t, max = 200) => safeText(t, max);

// The kinds of files as the report names them, one and many.
export const KIND_NAMES = { csv: ['CSV file', 'CSV files'], json: ['JSON file', 'JSON files'] };

const pathsText = (r) => [`targets ${r.input.targets.paths.join(', ')}`, ...(r.input.measurements.paths.length ? [`measurements ${r.input.measurements.paths.join(', ')}`] : [])].join('; ');

function filesLine(part) {
  const n = part.byKind;
  const kinds = KINDS.filter((k) => n[k]).map((k) => `${grouped(n[k])} ${KIND_NAMES[k][n[k] === 1 ? 0 : 1]}`).join(', ');
  const rows = part.files.reduce((a, f) => a + f.rows, 0);
  return `${part.paths.join(', ')} (${plural(part.files.length, 'file')}${kinds ? `: ${kinds}` : ''}; ${plural(rows, 'record')})`;
}

const inputLine = (r) => `targets ${filesLine(r.input.targets)}; measurements ${r.input.measurements.files.length ? filesLine(r.input.measurements) : 'none'}`;

function configLine(r) {
  const c = r.config;
  const where = c.file ? `${c.file}${c.name ? ` (${clean(c.name, 120)})` : ''}` : 'built-in defaults';
  const count = (o) => Object.keys(o).length;
  return `${where}: ${plural(c.required.length, 'required characteristic')}, require all ${c.requireAll ? 'on' : 'off'}; ${plural(count(c.characteristicAliases), 'characteristic alias', 'characteristic aliases')}, ${plural(count(c.unitAliases), 'unit alias', 'unit aliases')}; minimum severity ${c.minSeverity}; fail on ${c.failOn}`;
}

const rulesLine = (r) => r.config.rules.map((x) => `${x.id} (${x.level})`).join('; ');

function targetsLine(r) {
  const t = r.summary.totals;
  return `${plural(t.targets, 'target')}: ${grouped(t.met)} met, ${grouped(t.missed)} missed, ${grouped(t.unverified)} unverified; ${plural(t.measurements, 'measurement')}, ${grouped(t.untargeted)} with no target`;
}

function findingsLine(r) {
  const b = r.totals.byLevel;
  const parts = ['error', 'warning', 'info'].filter((l) => b[l]).map((l) => `${grouped(b[l])} ${l}`);
  return `${grouped(r.totals.findings)}${parts.length ? ` (${parts.join(', ')})` : ''}${r.totals.hidden ? `; ${grouped(r.totals.hidden)} below ${r.config.minSeverity} not shown` : ''}`;
}

// A table with a header row and its columns padded to the widest cell.
function table(head, rows, indent = '  ') {
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const line = (cells) => `${indent}${cells.map((c, i) => (i === cells.length - 1 ? c : c.padEnd(widths[i]))).join('  ')}`.trimEnd();
  return [line(head), ...rows.map(line)];
}

const cell = (t, max = 40) => (t === '' || t === null || t === undefined ? '-' : clean(t, max));

function characteristicLines(r) {
  const rows = r.summary.characteristics.map((c) => [c.known ? c.characteristic : `${cell(c.characteristic)} (unknown)`, c.required ? 'yes' : 'no', grouped(c.targets), grouped(c.met), grouped(c.missed), grouped(c.unverified)]);
  return [...table(['characteristic', 'required', 'targets', 'met', 'missed', 'unverified'], rows), ''];
}

function missedLines(r) {
  const missed = r.results.filter((x) => x.status === 'missed');
  if (!missed.length) return ['  none', ''];
  const rows = missed.map((x) => [cell(x.characteristic, 30), cell(x.metric, 30), cell(x.target, 30), cell(x.measured, 40), cell(x.gap, 20), `${x.file}:${x.line}`]);
  return [...table(['characteristic', 'metric', 'target', 'measured', 'gap', 'at'], rows), ''];
}

export function toText(r, { explain = false } = {}) {
  const out = [];
  out.push(`quality-target-check: ${pathsText(r)}`);
  out.push(`input: ${inputLine(r)}`);
  out.push(`config: ${configLine(r)}`);
  out.push(`rules: ${rulesLine(r)}`);
  out.push(`targets: ${targetsLine(r)}`);
  out.push(`findings: ${findingsLine(r)}`);
  out.push('', `Characteristics (${grouped(r.summary.characteristics.length)})`, '');
  out.push(...characteristicLines(r));
  out.push(`Targets missed (${grouped(r.results.filter((x) => x.status === 'missed').length)})`, '');
  out.push(...missedLines(r));
  out.push(`Findings (${grouped(r.findings.length)})`, '');
  if (!r.findings.length) out.push('  none', '');
  const width = Math.max(...r.config.rules.map((x) => x.id.length));
  const pad = ' '.repeat(11);
  for (const f of r.findings) {
    out.push(`  ${f.level.toUpperCase().padEnd(8)} ${f.rule.padEnd(width)}  ${f.at}`);
    out.push(`${pad}${f.found}`);
    out.push(`${pad}fix: ${f.fix}`);
    if (explain) {
      out.push(`${pad}rule: ${r.config.rules.find((x) => x.id === f.rule).rule}`);
      for (const b of f.basis) out.push(`${pad}basis: ${b.text} (${b.source}, ${b.url})`);
      if (f.own) out.push(`${pad}the tool's own choice: ${f.own}`);
    }
    out.push('');
  }
  for (const n of r.notes) out.push(`note: ${n}`);
  if (r.notes.length) out.push('');
  out.push(r.notice, '');
  out.push(`RESULT: ${r.result.text}`);
  return `${out.join('\n')}\n`;
}

export function toJson(r, { explain = false } = {}) {
  const out = { ...r, findings: r.findings.map((f) => (explain ? f : { ...f, basis: undefined, own: undefined })) };
  return `${JSON.stringify(out, null, 2)}\n`;
}

// The message of a workflow command: %, CR and LF escaped.
export const escapeData = (t) => String(t).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');

// A property of a workflow command: also : and , escaped.
export const escapeProperty = (t) => escapeData(t).replace(/:/g, '%3A').replace(/,/g, '%2C');

const COMMANDS = { error: 'error', warning: 'warning', info: 'notice' };

export function toGithub(r) {
  const out = [];
  for (const f of r.findings) {
    const props = [`file=${escapeProperty(f.file)}`, `line=${f.line}`, ...(f.column ? [`col=${f.column}`] : []), `title=${escapeProperty(`quality-target-check ${f.rule}`)}`];
    out.push(`::${COMMANDS[f.level]} ${props.join(',')}::${escapeData(`${f.found}; fix: ${f.fix}`)}`);
  }
  const t = r.summary.totals;
  out.push(`quality-target-check: ${plural(t.targets, 'target')} (${grouped(t.met)} met, ${grouped(t.missed)} missed, ${grouped(t.unverified)} unverified), ${grouped(r.totals.findings)} ${r.totals.findings === 1 ? 'finding' : 'findings'}; RESULT: ${r.result.text}`);
  return `${out.join('\n')}\n`;
}

