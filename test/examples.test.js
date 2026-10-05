import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLEAN, EXPECTED, MISSED, UNWANTED, run } from '../tools/example.mjs';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const saved = (name) => readFile(resolve(root, 'examples/output', name), 'utf8');

test('examples: the targets that are partly missed fail with the report that is saved in examples/output', async () => {
  const r = await run(MISSED);
  assert.equal(r.code, 1);
  assert.equal(r.err, '');
  assert.equal(r.out, await saved('missed.txt'));
  for (const e of EXPECTED) assert.ok(r.out.includes(e), e);
  for (const u of UNWANTED) assert.ok(!r.out.includes(u), u);
});

test('examples: the clean targets pass with the report that is saved', async () => {
  const r = await run(CLEAN);
  assert.equal(r.code, 0);
  assert.equal(r.out, await saved('clean.txt'));
  assert.match(r.out, /\nfindings: 0\n/);
  assert.equal((await run([...CLEAN, '--fail-on', 'info'])).code, 0);
  assert.equal((await run([...CLEAN, '--require-all', '--fail-on', 'info'])).code, 0, 'every characteristic has a target');
  assert.equal((await run([...CLEAN, '--config', 'examples/config.json', '--fail-on', 'info'])).code, 0, 'the clean targets pass the configuration of the other example too');
});

test('examples: --explain, JSON, CSV, the GitHub commands and the defaults are the reports that are saved', async () => {
  assert.equal((await run([...MISSED, '--explain'])).out, await saved('missed-explain.txt'));
  assert.equal((await run([...MISSED, '--json', '--explain'])).out, await saved('missed.json'));
  assert.equal((await run([...MISSED, '--format', 'csv'])).out, await saved('missed-results.csv'));
  assert.equal((await run([...MISSED, '--format', 'github'])).out, await saved('missed-github.txt'));
  assert.equal((await run(['--print-defaults'])).out, await saved('defaults.json'));
});

test('examples: the rules that fire on the missed targets, each on the line built for it', async () => {
  const report = JSON.parse((await run([...MISSED, '--json'])).out);
  const targets = (await readFile(resolve(root, 'examples/missed/targets.csv'), 'utf8')).split('\n');
  const measurements = (await readFile(resolve(root, 'examples/missed/measurements.json'), 'utf8')).split('\n');
  // The line of the first target, or measurement, of this metric.
  const t = (metric, n = 1) => `examples/missed/targets.csv:${targets.map((l, i) => [l.split(',')[2], i + 1]).filter(([m]) => m === metric)[n - 1][1]}`;
  const m = (metric) => `examples/missed/measurements.json:${measurements.findIndex((l) => l.includes(`"metric": "${metric}"`)) + 1}`;
  const byRule = {};
  for (const f of report.findings) (byRule[f.rule] ??= []).push(f.at);
  assert.deepEqual(byRule, {
    'target-missed': [t('p95 checkout latency'), t('api memory'), t('monthly availability'), t('critical vulnerabilities')],
    'unknown-characteristic': [t('failed request rate')],
    'unknown-unit': [t('search response time')],
    'invalid-record': [t('first contentful paint')],
    'unit-mismatch': [m('installation time')],
    'missing-characteristic': ['examples/missed/targets.csv:1', 'examples/missed/targets.csv:1'],
    'unverified-target': [t('open admin endpoints')],
    'missing-owner': [t('open admin endpoints')],
    'missing-method': [t('open admin endpoints')],
    'unknown-sub-characteristic': [t('contract test pass rate')],
    'duplicate-target': [t('monthly availability', 2)],
    'untargeted-measurement': [m('error budget burn')]
  });
  assert.deepEqual(report.results.map((x) => x.status), ['missed', 'missed', 'met', 'missed', 'met', 'met', 'missed', 'unverified', 'met', 'met', 'met', 'met', 'unverified', 'met', 'unverified']);
});

test('examples: the same files written with CRLF line ends give the same output', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'quality-target-check-crlf-'));
  try {
    await cp(resolve(root, 'examples'), resolve(dir, 'examples'), { recursive: true });
    const walk = async (sub) => {
      for (const e of await readdir(resolve(dir, sub), { withFileTypes: true })) {
        const rel = `${sub}/${e.name}`;
        if (e.isDirectory()) {
          if (e.name !== 'output') await walk(rel);
        } else if (!e.name.endsWith('.md')) {
          const text = (await readFile(resolve(dir, rel), 'utf8')).split('\r\n').join('\n');
          await writeFile(resolve(dir, rel), text.split('\n').join('\r\n'));
        }
      }
    };
    await walk('examples');
    assert.equal((await run([...MISSED, '--explain'], dir)).out, await saved('missed-explain.txt'));
    assert.equal((await run(CLEAN, dir)).out, await saved('clean.txt'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
