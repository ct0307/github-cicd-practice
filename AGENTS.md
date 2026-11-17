# 实验项目说明

## 技术栈
Node.js 22.12 及以上；npm workspaces；React + TypeScript + Vite；Express；ESLint；Vitest 和 Node 内置测试。

## 常用命令
- 安装：在仓库根目录执行 `npm ci`。
- 后端：`npm run dev:backend`，默认 127.0.0.1:3000。
- 前端：`npm run dev:frontend`，默认 127.0.0.1:5173。
- 检查：`npm run lint`、`npm test`、`npm run build`。

## 目录
- `dist/`：实验一的静态源文件，需要提交到 Git。
- `apps/frontend/`：实验三前端；该目录下 dist 是生成产物。
- `apps/backend/`：保留实验三JS入口；实验四使用TS入口，编译至dist/server.js。
- `deploy/`：ECS初始化、Nginx/systemd配置及健康检查回滚脚本。
- `.github/workflows/`：基础工作流、CI 和 Pages 发布。

## 环境变量
后端支持 `PORT`、`HOST`、`APP_VERSION`；默认 3000、127.0.0.1、1.0.0。
实验四固定监听127.0.0.1，支持PORT、APP_VERSION和HEALTH_FAIL；HEALTH_FAIL=1仅用于独立实验机的回滚演练。
Pages 仅部署静态文件，不包含后端进程。

## 限制
只使用中文说明和代码注释。不得提交密钥、账号凭据、node_modules 或测试时伪造的成功结果。部署前必须通过静态校验、lint、测试与构建；只有 main 分支可发布。
