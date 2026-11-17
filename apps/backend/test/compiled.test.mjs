import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { once } from 'node:events';

test('TypeScript 编译后的服务提供真实 HTTP 接口和发布版本', async t => {
  assert.ok(existsSync(new URL('../dist/server.js', import.meta.url)), '缺少编译后的 dist/server.js');
  const { createApp } = await import('../dist/app.js');
  const server = createApp({ version: 'test-release-123' }).listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => server.close(resolve)));
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${origin}/health`);
  assert.equal(health.status, 200);
  assert.equal(await health.text(), 'ok');
  const hello = await fetch(`${origin}/api/hello`);
  assert.deepEqual(await hello.json(), { message: 'Hello from ECS backend' });
  assert.equal(hello.headers.get('x-powered-by'), null);
  const version = await fetch(`${origin}/api/version`);
  assert.equal(await version.text(), 'test-release-123');
  assert.match(version.headers.get('cache-control'), /no-store/);
  const missing = await fetch(`${origin}/api/not-found`);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: '接口不存在' });
});

test('演练版本健康检查失败时返回 503，便于发布脚本触发回滚', async t => {
  assert.ok(existsSync(new URL('../dist/app.js', import.meta.url)), '缺少编译后的 dist/app.js');
  const { createApp } = await import('../dist/app.js');
  const server = createApp({ version: 'failed-release', healthy: false }).listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => server.close(resolve)));
  await once(server, 'listening');
  const response = await fetch(`http://127.0.0.1:${server.address().port}/health`);
  assert.equal(response.status, 503);
});
