import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/server.js';

let server;
let origin;

before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test('健康检查返回 HTTP 200 和 ok', async () => {
  const response = await fetch(`${origin}/health`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'ok');
});

test('问候接口返回约定的 JSON 消息', async () => {
  const response = await fetch(`${origin}/api/hello`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await response.json(), { message: 'Hello from backend' });
});

test('版本接口返回可追踪版本', async () => {
  const response = await fetch(`${origin}/api/version`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '1.0.0');
});

test('不存在的接口返回 404 JSON', async () => {
  const response = await fetch(`${origin}/api/not-found`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: '接口不存在' });
});
