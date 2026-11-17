#!/usr/bin/env bash
set -Eeuo pipefail
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
DEPLOY_SHA=${1:-}
[[ "$DEPLOY_SHA" =~ ^[a-f0-9]{40}$ ]] || { echo '提交号不合法'; exit 2; }
BASE_DIR=${CICD_ROOT:-/srv/cicd-demo}
RELEASE="$BASE_DIR/releases/$DEPLOY_SHA"
[[ -f "$RELEASE/backend/dist/server.js" && -f "$RELEASE/frontend/index.html" ]] || exit 2
[[ "$(cat "$RELEASE/commit.txt")" == "$DEPLOY_SHA" ]] || exit 2
exec 9>"$BASE_DIR/deployment.lock"
flock -n 9 || { echo '已有发布正在执行'; exit 3; }
previous=$(readlink -f "$BASE_DIR/current" || true)
if [[ -n "$previous" && ! -d "$previous" ]]; then previous=''; fi
if [[ -n "$previous" && "$previous" != "$BASE_DIR/releases/"* ]]; then exit 2; fi

event() { printf 'EVENT %s %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "$2"; }
verify() {
  local expected=$1
  for attempt in {1..20}; do
    if [[ "$(curl -fsS --max-time 2 http://127.0.0.1/health 2>/dev/null)" == ok ]] &&
       [[ "$(curl -fsS --max-time 2 http://127.0.0.1/api/version 2>/dev/null)" == "$expected" ]] &&
       curl -fsS --max-time 2 http://127.0.0.1/ >/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}
switch_to() {
  ln -s "$1" "$BASE_DIR/.current-$DEPLOY_SHA-$$"
  mv -Tf "$BASE_DIR/.current-$DEPLOY_SHA-$$" "$BASE_DIR/current"
}
rollback() {
  trap - ERR
  set +e
  event deployment_failed "$DEPLOY_SHA"
  if [[ -n "$previous" ]]; then
    switch_to "$previous"
    if sudo -n /usr/bin/systemctl restart cicd-demo.service && verify "$(cat "$previous/commit.txt")"; then
      event rollback_recovered "$(cat "$previous/commit.txt")"
    else
      event rollback_failed "$previous"
    fi
  else
    event rollback_unavailable '首次发布没有上一版本'
  fi
  exit 1
}

# 安装失败发生在切换前，现有服务不受影响。
cd "$RELEASE/backend"
npm ci --omit=dev --ignore-scripts --no-audit --no-fund
trap rollback ERR
event deployment_started "$DEPLOY_SHA"
switch_to "$RELEASE"
sudo -n /usr/bin/systemctl restart cicd-demo.service
verify "$DEPLOY_SHA"
event deployment_succeeded "$DEPLOY_SHA"
