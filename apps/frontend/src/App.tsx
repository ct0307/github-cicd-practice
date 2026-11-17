import { useState } from 'react';

type RequestState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export default function App() {
  const [state, setState] = useState<RequestState>('idle');
  const [message, setMessage] = useState('');

  async function requestHello() {
    setState('loading');
    try {
      const response = await fetch('/api/hello', { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`后端请求失败（HTTP ${response.status}）`);
      const data: { message?: unknown } = await response.json();
      if (typeof data.message !== 'string') throw new Error('后端响应格式不正确');
      setMessage(data.message);
      setState(data.message.trim() ? 'success' : 'empty');
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === 'TimeoutError'
        ? '请求超时，请稍后重试'
        : error instanceof TypeError
          ? '无法连接后端，请确认服务可访问后重试'
          : error instanceof Error ? error.message : '请求失败，请重试');
      setState('error');
    }
  }

  return (
    <main className="experiment">
      <header>
        <p className="course">CI/CD 实验三</p>
        <h1>React + Node 联调实验</h1>
        <p className="intro">从页面发起请求，观察后端接口的真实响应。</p>
      </header>
      <section className="request-panel" aria-labelledby="request-title">
        <div className="panel-heading">
          <h2 id="request-title">后端消息</h2>
          <code>GET /api/hello</code>
        </div>
        <div className={`result result-${state}`} aria-live="polite">
          {state === 'idle' && <p>尚未请求后端</p>}
          {state === 'loading' && <p>等待后端响应</p>}
          {state === 'success' && <p>{message}</p>}
          {state === 'empty' && <p>后端返回了空消息</p>}
          {state === 'error' && <p role="alert">{message}</p>}
        </div>
        <button onClick={requestHello} disabled={state === 'loading'}>
          {state === 'loading' ? '正在请求…' : state === 'error' ? '重试请求' : '请求后端接口'}
        </button>
      </section>
      <section className="reference" aria-labelledby="reference-title">
        <h2 id="reference-title">接口说明</h2>
        <dl>
          <div><dt><code>/api/hello</code></dt><dd>返回 JSON 问候消息</dd></div>
          <div><dt><code>/health</code></dt><dd>服务健康检查，预期返回 ok</dd></div>
          <div><dt><code>/api/version</code></dt><dd>返回后端当前版本</dd></div>
        </dl>
        <p>GitHub Pages 仅提供静态页面。未部署后端时，请求接口会显示失败。</p>
      </section>
      <footer>实验版本 1.0.1 · ECS 自动部署验证 · React / Vite / Express</footer>
    </main>
  );
}
