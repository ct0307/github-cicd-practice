# CI/CD 实验一至三

本项目对应静态网页发布、GitHub Actions 基础工作流和 React + Node 全栈 CI/CD。

## 环境与安装

推荐使用当前受支持的 Node.js 22 LTS 补丁版本；当前 jsdom 31 要求 Node.js `^22.22.2 || ^24.15.0 || >=26`。
在仓库根目录执行：

```powershell
npm ci --ignore-scripts
```

本项目使用 npm workspaces，前后端共享根目录的 `package-lock.json`。不需要分别在子目录生成锁文件。

## 本地运行

分别打开两个终端，在项目根目录运行：

```powershell
npm run dev:backend
```

```powershell
npm run dev:frontend
```

打开 http://127.0.0.1:5173，点击“请求后端接口”。前端开发代理将 `/api/hello` 转发到本机 3000 端口。三个接口：

```powershell
curl.exe -i http://127.0.0.1:3000/health
curl.exe -i http://127.0.0.1:3000/api/hello
curl.exe -i http://127.0.0.1:3000/api/version
```

前端提供初始、加载、成功、空消息、请求失败和重试状态。8 秒未获得响应时提示超时。

## 验证

```powershell
npm run check:static
npm run lint
npm test
npm run build
npm audit
```

后端使用 Node 内置测试，通过真实本地 HTTP 连接验证 200、JSON、版本和 404；前端使用 Vitest + Testing Library 验证用户操作和请求状态。后端在本实验中为 JavaScript，build 执行语法检查，不声称进行了 TypeScript 编译。

## GitHub Actions

- `hello-world.yml`：main 分支 push 后打印 Hello World、日期与目录。
- `ci.yml`：push / pull_request 时安装锁定依赖，执行静态校验、lint、测试和构建，保存前端制品。
- `static.yml`：仅在同仓库 main 分支的 CI 成功后，从对应提交下载制品并发布 `gh-pages`。

首次推送并生成 `gh-pages` 后，在仓库 Settings → Pages 选择 Deploy from a branch，分支 `gh-pages`，目录 `/ (root)`。

- 实验一地址：`https://<账号>.github.io/<仓库>/`
- 实验三地址：`https://<账号>.github.io/<仓库>/demo/`

静态入口和 React 制品使用同一个发布任务，避免两个工作流相互覆盖。前端使用相对资源路径，支持 Pages 仓库子路径。

## 范围说明

GitHub Pages 不运行 Node 后端，线上 React 页面未接入后端托管时会如实显示接口请求失败。Heroku 部署需要另外提供账号、应用和授权；本项目不默认开通付费资源。实验四不包含在本次交付范围内。

如果需要在 Heroku 部署后端，请使用 `HOST=0.0.0.0`，并由平台提供 `PORT`，启动 `npm start --workspace @cicd/backend`。
