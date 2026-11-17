# ECS 实验部署

本目录用于 Ubuntu 24.04 x86_64 实验机。`bootstrap.sh` 只在首次初始化时以 root 运行，需要传入专用 ED25519 公钥；不要传入私钥。

初始化安装 Ubuntu 仓库的 Nginx、curl、rsync、xz-utils 和 ca-certificates，从 nodejs.org 获取最新 Node.js 22 官方二进制并校验官方 SHA256。新增 deploy 发布用户、cicdapp 运行用户、专用 SSH 公钥、限定服务重启 sudo 权限，以及 Nginx/systemd 配置。

GitHub Secrets：ECS_HOST、ECS_USER（deploy）、ECS_SSH_PRIVATE_KEY、ECS_SSH_KNOWN_HOSTS。主机公钥必须先通过云助手等可信途径核对指纹。私钥只存放本地受限文件及 GitHub Secrets，不提交仓库，不写日志。

工作流对 main push 执行检查、测试、编译、打包，通过 SSH + rsync 上传到 `/srv/cicd-demo/releases/<SHA>`。生产依赖安装成功才原子切换 current；重启后同时检查 `/health`、`/api/version` 与前端首页。失败恢复上一目录并复核版本，工作流仍返回失败。首次发布无旧版本时如实报告不能回滚。

`health-fail` 默认是 0。仅在此独立实验机将其改为 1 并 push，进行健康失败和回滚演练，随后必须恢复为 0 再发布。

安全组需要允许公网 HTTP 80 和部署所需 SSH 22，不开放后端3000。GitHub 托管 Runner 的出口地址会变化；如实验中暂时开放公网22，deploy 用户强制公钥认证、禁止终端和转发、只允许重启实验服务，正式使用应进一步限制管理来源或使用固定出口。

这是单机替换发布，会有短暂服务重启，未实现多实例滚动或蓝绿发布。当前使用公网IP和HTTP；正式项目应配置域名、备案要求及HTTPS。云服务和公网流量以试用规则计费。
