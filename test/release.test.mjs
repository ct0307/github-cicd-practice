import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('发布包包含编译后端与独立生产锁文件，拒绝覆盖已有制品', async () => {
  const { makeRelease } = await import('../scripts/make-release.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'cicd-release-'));
  const output = join(dir, 'artifact');
  const sha = 'a'.repeat(40);
  await makeRelease({ root: process.cwd(), output, sha });
  await access(join(output, 'backend/dist/server.js'));
  await access(join(output, 'frontend/index.html'));
  const pkg = JSON.parse(await readFile(join(output, 'backend/package.json'), 'utf8'));
  const lock = JSON.parse(await readFile(join(output, 'backend/package-lock.json'), 'utf8'));
  assert.deepEqual(pkg.dependencies, lock.packages[''].dependencies);
  assert.ok(lock.packages['node_modules/express'].integrity);
  assert.equal(lock.packages['node_modules/react'], undefined);
  assert.equal(lock.packages['node_modules/typescript'], undefined);
  assert.ok(Object.keys(lock.packages).every(p => p === '' || p.startsWith('node_modules/')));
  assert.match(await readFile(join(output, 'backend/release.env'), 'utf8'), new RegExp(`APP_VERSION=${sha}`));
  await assert.rejects(makeRelease({ root: process.cwd(), output, sha }), /已存在/);
});

test('非法提交号不能用于生成发布目录', async () => {
  const { makeRelease } = await import('../scripts/make-release.mjs');
  await assert.rejects(makeRelease({ root: process.cwd(), output: 'unused', sha: '../bad' }), /SHA/);
});
