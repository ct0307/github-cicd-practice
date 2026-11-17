import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT 必须是 1 至 65535 的整数');
}
const version = process.env.APP_VERSION ?? '1.0.0';
const app = createApp({ version, healthy: process.env.HEALTH_FAIL !== '1' });
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`后端已启动：127.0.0.1:${port}，版本：${version}`);
});
server.on('error', error => {
  console.error(`后端启动失败：${error.message}`);
  process.exitCode = 1;
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8000).unref();
});
