import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateStatic } from '../scripts/check-static.mjs';

test('存在有效入口时允许发布，入口缺失时阻止发布', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'cicd-static-'));
  try {
    assert.equal((await validateStatic(fixture)).ok, false);
    await writeFile(join(fixture, 'index.html'), '<!doctype html><html lang="zh-CN"><title>实验</title><h1>实验一</h1></html>');
    assert.equal((await validateStatic(fixture)).ok, true);
  } finally {
    await rm(fixture, { recursive: true });
  }
});
