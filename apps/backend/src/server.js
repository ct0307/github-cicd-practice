import express from 'express';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.get('/api/hello', (_req, res) => res.json({ message: 'Hello from backend' }));
  app.get('/health', (_req, res) => res.status(200).type('text').send('ok'));
  app.get('/api/version', (_req, res) => res.type('text').send(process.env.APP_VERSION ?? '1.0.0'));
  app.use((_req, res) => res.status(404).json({ error: '接口不存在' }));
  return app;
}
