#!/usr/bin/env bash
# ============================================================
# ShuleHub — SESSION CHECK (run kwenye sandbox mwanzo wa session)
# Hupima: 1) Neon connection  2) GitHub clone  3) file parity
# ============================================================
set -e
NEON='postgresql://neondb_owner:npg_q6pNKkW2jBQi@ep-winter-water-ayvokh3c-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require'
REPO_URL='https://github.com/Hidra123/school-management-system'

echo "== 1/3 Neon connection =="
psql "$NEON" -c "SELECT (SELECT count(*) FROM users) users, (SELECT count(*) FROM students) students, (SELECT count(*) FROM classes) classes, (SELECT count(*) FROM exams) exams;" 2>&1 | head -6

echo "== 2/3 Clone GitHub (latest) =="
rm -rf /tmp/shulehub && git clone --depth 1 -q "$REPO_URL" /tmp/shulehub && echo "cloned OK — $(find /tmp/shulehub/src -type f | wc -l) files in repo"

echo "== 3/3 Diff src/ sandbox vs GitHub =="
D=$(diff -rq /tmp/shulehub/src ./src 2>/dev/null || true)
if [ -z "$D" ]; then
  echo "✅ src/ SAWA kabisa na GitHub — kila kitu iko synchronize"
else
  echo "⚠️ Tofauti zimepatikana (hizi zinahitaji ku-sync):"
  echo "$D"
fi

echo "== DONE =="
