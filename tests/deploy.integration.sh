#!/usr/bin/env bash
# Run on Linux with Docker + Compose. Uses an isolated project and disposable test data.
set -Eeuo pipefail
source_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
work="$(mktemp -d)"
project="zhiheng-deploy-test-$(date +%s)-$$"
cp "$source_dir"/{Dockerfile,.dockerignore,package.json,pnpm-lock.yaml,pnpm-workspace.yaml,index.html,vite.config.js,jsconfig.json,compose.production.yaml,deploy.sh,.env.production.example} "$work/"
cp -r "$source_dir"/{src,public,server,shared,scripts,knowledge} "$work/"
cd "$work"
sed -i "s/^name: zhiheng-production/name: $project/" compose.production.yaml
cp .env.production.example .env.production
printf '\nAPP_PORT=0\n' >> .env.production
dc() { docker compose --env-file .env.production -f compose.production.yaml "$@"; }
cleanup() {
  dc down -v --remove-orphans
  # Only the mktemp directory created above is removed.
  rm -rf -- "$work"
}
trap cleanup EXIT
bash -n deploy.sh
bash deploy.sh up
dc exec -T app node -e "fetch('http://127.0.0.1:3001/').then(async r=>{if(!r.ok||!(await r.text()).includes('<html'))process.exit(1)})"
dc exec -T mongodb mongosh zhiheng_agent --quiet --eval 'db.deployment_probe.insertOne({_id:"original",value:1})'
cat >> server/schema-migrations.mjs <<'MIGRATION'

migrations.push({version:2,name:'deployment_test_v2',async up(db){await db.collection('deployment_probe').updateMany({added:{$exists:false}},{$set:{added:true}});}});
MIGRATION
bash deploy.sh upgrade
archive="$(find backups -name '*.image' | head -n 1)"
archive="${archive%.image}"
test -s "$archive"
dc exec -T mongodb mongosh zhiheng_agent --quiet --eval 'if(db.deployment_probe.findOne({_id:"original"}).value!==1 || !db.deployment_probe.findOne({_id:"original"}).added || db.schema_migrations.countDocuments()!==2)quit(1);db.deployment_probe.updateOne({_id:"original"},{$set:{value:2}});db.only_after_upgrade.insertOne({x:1})'
bash deploy.sh rollback "$archive" --confirm-data-loss
dc exec -T mongodb mongosh zhiheng_agent --quiet --eval 'if(db.deployment_probe.findOne({_id:"original"}).value!==1 || db.only_after_upgrade.countDocuments()!==0 || db.schema_migrations.countDocuments()!==1)quit(1)'
bash deploy.sh backup
bash deploy.sh stop
bash deploy.sh backup
test -z "$(dc ps -q app)"
dc up -d --no-recreate --no-deps --wait --wait-timeout 180 app
printf '\nRUN false\n' >> Dockerfile
if bash deploy.sh upgrade; then echo 'Expected a build failure'; exit 1; fi
test -n "$(dc ps -q app)"
cp "$source_dir/Dockerfile" Dockerfile
previous_image="$(cat .deploy/current-image)"
printf '\nthrow new Error("injected migration failure");\n' >> scripts/migrate-mongodb.mjs
if bash deploy.sh upgrade; then echo 'Expected a migration failure'; exit 1; fi
test -z "$(dc ps -q app)"
test "$(cat .deploy/current-image)" = "$previous_image"
echo 'PASS: Linux deploy, upgrade, persistent data, backup, rollback, health checks, stopped backup, build failure, migration failure'
