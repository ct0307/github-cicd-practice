import { access, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve, posix } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function makeRelease({ root, output, sha }) {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('SHA 必须是40位十六进制提交号');
  try {
    await access(output);
    throw new Error('发布目录已存在，禁止覆盖制品');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const readJson = async file => JSON.parse(await readFile(join(root, file), 'utf8'));
  const source = await readJson('apps/backend/package.json');
  const lock = await readJson('package-lock.json');
  const pkg = {
    name: 'cicd-ecs-backend', version: source.version, private: true,
    type: 'module', scripts: { start: 'node dist/server.js' }, dependencies: source.dependencies,
  };
  const packages = { '': { name: pkg.name, version: pkg.version, dependencies: pkg.dependencies } };
  // 从根锁解析后端可达依赖，保留每个包的版本和完整性校验值。
  function collect(name, parent = '') {
    let scope = parent;
    let key;
    while (true) {
      const candidate = scope ? `${scope}/node_modules/${name}` : `node_modules/${name}`;
      if (lock.packages[candidate]) { key = candidate; break; }
      if (!scope) throw new Error(`锁文件缺少运行依赖：${name}`);
      scope = posix.dirname(scope);
      if (scope === '.' || scope === 'node_modules') scope = '';
    }
    if (packages[key]) return;
    const entry = { ...lock.packages[key] };
    if (entry.link) throw new Error('发布包不支持工作区符号链接依赖');
    delete entry.dev;
    delete entry.devOptional;
    packages[key] = entry;
    for (const dependency of Object.keys(entry.dependencies ?? {})) collect(dependency, key);
  }
  for (const name of Object.keys(pkg.dependencies)) collect(name);
  const healthFail = (await readFile(join(root, 'deploy/health-fail'), 'utf8')).trim();
  if (!['0', '1'].includes(healthFail)) throw new Error('健康演练开关必须为0或1');
  await access(join(root, 'apps/backend/dist/server.js'));
  await access(join(root, 'apps/frontend/dist/index.html'));
  await mkdir(join(output, 'backend'), { recursive: true });
  await cp(join(root, 'apps/backend/dist'), join(output, 'backend/dist'), { recursive: true });
  await cp(join(root, 'apps/frontend/dist'), join(output, 'frontend'), { recursive: true });
  await writeFile(join(output, 'backend/package.json'), JSON.stringify(pkg, null, 2) + '\n');
  await writeFile(join(output, 'backend/package-lock.json'), JSON.stringify({
    name: pkg.name, version: pkg.version, lockfileVersion: 3, requires: true, packages,
  }, null, 2) + '\n');
  await writeFile(join(output, 'backend/release.env'), `APP_VERSION=${sha}\nPORT=3000\nHEALTH_FAIL=${healthFail}\n`);
  await writeFile(join(output, 'commit.txt'), sha + '\n');
  console.log(`已生成发布包：${output}，后端运行依赖${Object.keys(packages).length - 1}个`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const sha = process.argv[2];
  await makeRelease({ root: process.cwd(), output: resolve('release', sha ?? 'invalid'), sha });
}
