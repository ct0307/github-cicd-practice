import { createApp } from './server.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';
const server = createApp().listen(port, host, () => {
  console.log(`后端服务已启动：http://${host}:${port}`);
});
server.on('error', error => {
  console.error(`后端启动失败：${error.message}`);
  process.exitCode = 1;
});
