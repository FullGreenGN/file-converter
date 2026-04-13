import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const cliEntrypoint = path.join(repoRoot, 'dist/index.js');

function runCli(args) {
  return spawnSync(process.execPath, [cliEntrypoint, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

test('returns clear error when input does not exist', () => {
  const result = runCli(['./missing-file.heic']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Input file not found/i);
});

test('rejects unsupported extensions with a clear error', () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'fg-converter-'));
  const unsupportedFile = path.join(tempDir, 'sample.txt');
  writeFileSync(unsupportedFile, 'hello', 'utf8');

  const result = runCli([unsupportedFile]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unsupported input format/i);
});

test('recognizes audio files and reaches file existence validation', () => {
  const result = runCli(['./missing-track.mp3']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Input file not found/i);
});

