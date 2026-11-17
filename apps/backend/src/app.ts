import express from 'express';

interface AppOptions {
  version?: string;
  healthy?: boolean;
}

export function createApp({ version = '1.0.0', healthy = true }: AppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/hello', (_req, res) => res.json({ message: 'Hello from ECS backend' }));
  app.get('/health', (_req, res) => res.status(healthy ? 200 : 503).type('text').send(healthy ? 'ok' : 'unhealthy'));
  app.get('/api/version', (_req, res) => res.type('text').send(version));
  app.use((_req, res) => res.status(404).json({ error: '接口不存在' }));
  return app;
}
