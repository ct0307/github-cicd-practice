import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => vi.unstubAllGlobals());

describe('前后端请求状态', () => {
  it('初始状态说明尚未请求，点击后显示真实消息', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Hello from backend' })));
    vi.stubGlobal('fetch', request);
    render(<App />);
    expect(screen.getByText('尚未请求后端')).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '请求后端接口' }));
    expect(await screen.findByText('Hello from backend')).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith('/api/hello', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('请求过程中显示加载状态并禁止重复点击', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '请求后端接口' }));
    expect(screen.getByText('正在请求…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '正在请求…' })).toBeDisabled();
  });

  it('请求失败后显示错误，并允许重试恢复', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: '恢复成功' }))));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '请求后端接口' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('无法连接后端');
    fireEvent.click(screen.getByRole('button', { name: '重试请求' }));
    expect(await screen.findByText('恢复成功')).toBeInTheDocument();
  });

  it('服务返回 HTTP 503 时不误报成功', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 })));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '请求后端接口' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('503');
  });

  it('消息为空时显示空状态', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: '' }))));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '请求后端接口' }));
    expect(await screen.findByText('后端返回了空消息')).toBeInTheDocument();
  });

  it('请求超时后显示错误，并重新启用按钮', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError')));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '请求后端接口' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('请求超时');
    expect(screen.getByRole('button', { name: '重试请求' })).toBeEnabled();
  });
});
