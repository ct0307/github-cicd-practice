#!/usr/bin/env bash
set -euo pipefail
[[ $(id -u) == 0 && $(uname -m) == x86_64 ]] || { echo '需要x86_64 Ubuntu的root用户'; exit 2; }
DEPLOY_PUBLIC_KEY=${1:?请提供部署专用SSH公钥}
[[ "$DEPLOY_PUBLIC_KEY" == ssh-ed25519\ * && "$DEPLOY_PUBLIC_KEY" != *$'\n'* ]] || exit 2
CONFIG_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
[[ ! -e /srv/cicd-demo/current ]] || { echo '已有部署，请人工核对后升级配置'; exit 2; }
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y nginx curl rsync xz-utils ca-certificates

# 使用Node.js官方发布与SHA256校验表，不执行远程安装脚本。
DOWNLOAD_DIR=$(mktemp -d /var/tmp/cicd-node-XXXXXX)
cd "$DOWNLOAD_DIR"
curl -fSL --retry 2 --connect-timeout 20 -o SHASUMS256.txt https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt
NODE_ARCHIVE=$(awk '$2 ~ /^node-v22\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$/ {print $2}' SHASUMS256.txt)
[[ "$NODE_ARCHIVE" =~ ^node-v22\.[0-9]+\.[0-9]+-linux-x64.tar.xz$ ]] || exit 2
curl -fSL --retry 2 --connect-timeout 20 -o "$NODE_ARCHIVE" "https://nodejs.org/dist/latest-v22.x/$NODE_ARCHIVE"
grep -F "  $NODE_ARCHIVE" SHASUMS256.txt | sha256sum -c -
tar -xJf "$NODE_ARCHIVE" -C /opt
NODE_DIR="/opt/${NODE_ARCHIVE%.tar.xz}"
for program in node npm npx; do ln -sfn "$NODE_DIR/bin/$program" "/usr/local/bin/$program"; done
/usr/local/bin/node --version
/usr/local/bin/npm --version

id deploy >/dev/null 2>&1 || useradd -m -s /bin/bash deploy
id cicdapp >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin cicdapp
install -d -m 755 -o deploy -g deploy /srv/cicd-demo /srv/cicd-demo/releases
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
printf 'restrict %s\n' "$DEPLOY_PUBLIC_KEY" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
printf '%s\n' 'deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart cicd-demo.service' > /etc/sudoers.d/cicd-deploy
chmod 440 /etc/sudoers.d/cicd-deploy
visudo -cf /etc/sudoers.d/cicd-deploy
cat > /etc/ssh/sshd_config.d/60-cicd-deploy.conf <<'SSH_CONFIG'
Match User deploy
    PasswordAuthentication no
    KbdInteractiveAuthentication no
    AuthenticationMethods publickey
    AllowTcpForwarding no
    X11Forwarding no
    PermitTTY no
Match all
SSH_CONFIG
sshd -t
systemctl reload ssh

install -m 644 "$CONFIG_DIR/cicd-demo.service" /etc/systemd/system/cicd-demo.service
install -m 644 "$CONFIG_DIR/nginx.conf" /etc/nginx/sites-available/cicd-demo
# 默认站点移为备份，保留原文件供恢复。
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  mv /etc/nginx/sites-enabled/default /etc/nginx/cicd-default-site.backup
fi
ln -sfn /etc/nginx/sites-available/cicd-demo /etc/nginx/sites-enabled/cicd-demo
nginx -t
systemctl daemon-reload
systemctl enable cicd-demo.service
systemctl enable --now nginx
systemctl reload nginx
echo '初始化完成；首次发布前后端服务尚未启动，页面暂时不可用。'
