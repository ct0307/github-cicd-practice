import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function validateStatic(directory = 'dist') {
  try {
    const html = await readFile(resolve(directory, 'index.html'), 'utf8');
    const ok = /<!doctype html>/i.test(html) && /<html\b/i.test(html) && /<h1\b/i.test(html);
    return { ok, message: ok ? 'dist/index.html 文件存在，HTML 入口校验通过' : 'index.html 缺少 HTML 结构或主标题' };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { ok: false, message: 'dist/index.html 文件缺失，阻止发布' };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await validateStatic(process.argv[2]);
  console.log(result.message);
  process.exitCode = result.ok ? 0 : 1;
}
