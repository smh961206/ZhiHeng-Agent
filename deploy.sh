#!/usr/bin/env bash
set -Eeuo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
umask 077
mkdir -p .deploy backups
exec 9>.deploy/operation.lock
flock -n 9 || { echo '已有部署或备份操作正在运行'; exit 1; }
command -v docker >/dev/null || { echo '请先安装 Docker Engine 和 Compose v2'; exit 1; }
docker compose version >/dev/null
if [[ ! -f .env.production ]]; then
  cp .env.production.example .env.production
  echo '已生成 .env.production，请填写模型配置后重新运行。'
  exit 1
fi
export APP_IMAGE="$(cat .deploy/current-image 2>/dev/null || echo zhiheng-agent:local)"
dc() { docker compose --env-file .env.production -f compose.production.yaml "$@"; }
maintenance=0
on_error() {
  local code=$?
  trap - ERR
  if [[ "$maintenance" == 1 ]]; then dc stop app || true; fi
  echo '操作失败。检查日志：bash deploy.sh logs；备份保存在 backups/。进入维护阶段后失败会保持应用停止，不会自动恢复旧数据库。' >&2
  exit "$code"
}
trap on_error ERR
backup() {
  local container old_image
  container="$(dc ps -a -q app)"
  old_image=''
  was_running=false
  if [[ -n "$container" ]]; then
    old_image="$(docker inspect --format '{{.Image}}' "$container")"
    was_running="$(docker inspect --format '{{.State.Running}}' "$container")"
  fi
  dc stop app
  maintenance=1
  BACKUP="backups/$(date -u +%Y%m%dT%H%M%SZ)-${RANDOM}.archive.gz"
  dc exec -T mongodb mongodump --db zhiheng_agent --archive --gzip > "$BACKUP.partial"
  test -s "$BACKUP.partial"
  mv -- "$BACKUP.partial" "$BACKUP"
  if [[ -n "$old_image" ]]; then
    local retained="zhiheng-agent:backup-$(basename "$BACKUP" .archive.gz)"
    docker tag "$old_image" "$retained"
    printf '%s\n' "$retained" > "$BACKUP.image"
  fi
  sha256sum "$BACKUP" > "$BACKUP.sha256"
  echo "数据库备份：$BACKUP"
}
case "${1:-up}" in
  up|upgrade)
    # Build first so a failed build does not interrupt the running service.
    export APP_IMAGE="zhiheng-agent:release-$(date -u +%Y%m%dT%H%M%SZ)-${RANDOM}"
    dc config --quiet
    dc build app
    dc up -d --wait mongodb
    backup
    dc run --rm --no-deps app node scripts/migrate-mongodb.mjs
    dc up -d --no-deps --wait --wait-timeout 180 app
    printf '%s\n' "$APP_IMAGE" > .deploy/current-image
    maintenance=0
    echo '部署完成。使用 bash deploy.sh status 查看服务状态。'
    ;;
  backup)
    dc up -d --wait mongodb
    backup
    if [[ "$was_running" == true ]]; then dc up -d --no-recreate --no-deps --wait --wait-timeout 180 app; fi
    maintenance=0
    ;;
  rollback)
    [[ $# -eq 3 && "$3" == '--confirm-data-loss' ]] || { echo '用法：bash deploy.sh rollback backups/文件.archive.gz --confirm-data-loss（覆盖当前数据库，丢弃备份之后的数据）'; exit 1; }
    file="$2"
    [[ "$file" =~ ^backups/[A-Za-z0-9_-]+\.archive\.gz$ && -s "$file" && -s "$file.image" ]] || { echo '备份或配套镜像记录不存在'; exit 1; }
    sha256sum -c "$file.sha256"
    export APP_IMAGE="$(cat "$file.image")"
    docker image inspect "$APP_IMAGE" >/dev/null
    dc up -d --wait mongodb
    backup
    dc exec -T mongodb mongosh --quiet --eval 'db.getSiblingDB("zhiheng_agent").dropDatabase()'
    dc exec -T mongodb mongorestore --archive --gzip --stopOnError < "$file"
    dc up -d --no-deps --wait --wait-timeout 180 app
    printf '%s\n' "$APP_IMAGE" > .deploy/current-image
    maintenance=0
    echo '代码和数据库已恢复。'
    ;;
  status) dc ps ;;
  logs) dc logs --tail=100 app ;;
  stop) dc stop app ;;
  *) echo '用法：bash deploy.sh {up|upgrade|backup|rollback|status|logs|stop}'; exit 1 ;;
esac
