#!/usr/bin/env bash
# End-to-end API verification suite — the exact curl checks from the
# challenge's "Testing" / "Final Verification" requirements, run against the
# live deployment by default.
#
# Usage:
#   scripts/api_check.sh                  # against https://mit.creations.ren
#   BASE_URL=http://localhost scripts/api_check.sh
set -u

BASE_URL="${BASE_URL:-https://mit.creations.ren}"
PASS=0
FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS + 1))
    echo "ok    $name"
  else
    FAIL=$((FAIL + 1))
    echo "FAIL  $name (expected '$expected', got '$actual')"
  fi
}

json_field() {
  # Reads a JSON string on stdin and prints the value at $1 (top-level key).
  python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('$1',''))" 2>/dev/null
}

echo "== Round 1: health =="
BODY="$(curl -sf "$BASE_URL/health")"
check "GET /health status field"     "ready"        "$(echo "$BODY" | json_field status)"
check "GET /health database field"   "connected"    "$(echo "$BODY" | json_field database)"
check "GET /health total_records"    "14999896"     "$(echo "$BODY" | json_field total_records)"

echo "== Round 2: search =="
BODY="$(curl -sf "$BASE_URL/api/health")"
check "GET /api/health ok" "True" "$(echo "$BODY" | json_field ok)"

BODY="$(curl -sf "$BASE_URL/api/search?q=damentasembiring2611@gmail.com&type=email&limit=5")"
check "email search type echo"    "email" "$(echo "$BODY" | json_field type)"
check "email search returns rows" "True"  "$(python3 -c "
import json,sys; d=json.load(sys.stdin); print(len(d['results'])>0)" <<<"$BODY")"

BODY="$(curl -sf "$BASE_URL/api/search?q=628112870550&type=phone&limit=5")"
check "phone search returns rows" "True" "$(python3 -c "
import json,sys; d=json.load(sys.stdin); print(len(d['results'])>0)" <<<"$BODY")"

BODY="$(curl -sf "$BASE_URL/api/search?q=21003474&type=user_id")"
check "user_id search returns the row" "21003474" "$(echo "$BODY" | json_field results >/dev/null; python3 -c "
import json,sys; d=json.load(sys.stdin); print(d['results'][0]['user_id'])" <<<"$BODY")"

BODY="$(curl -sf "$BASE_URL/api/search?q=customer&type=name&limit=5")"
check "name fuzzy search returns rows" "True" "$(python3 -c "
import json,sys; d=json.load(sys.stdin); print(len(d['results'])>0)" <<<"$BODY")"

echo "== Round 3: quality & metrics =="
# The background quality snapshot takes ~2-3 minutes to compute its first
# pass after a backend restart; poll for readiness instead of failing.
BODY=""
for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
  BODY="$(curl -sf "$BASE_URL/api/quality")" && break
  sleep 10
done
check "quality total_records" "14999896" "$(echo "$BODY" | json_field total_records)"

BODY="$(curl -sf "$BASE_URL/api/metrics")"
check "metrics duplicates present" "True" "$(python3 -c "
import json,sys; d=json.load(sys.stdin); print(isinstance(d['duplicates'],int) and d['duplicates']>0)" <<<"$BODY")"
check "metrics quality_score present" "True" "$(python3 -c "
import json,sys; d=json.load(sys.stdin); print(isinstance(d['quality_score'],(int,float)))" <<<"$BODY")"

echo "== Analytics =="
BODY=""
for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
  BODY="$(curl -sf "$BASE_URL/api/analytics")" && break
  sleep 10
done
check "analytics registrations array" "True" "$(python3 -c "
import json,sys; d=json.load(sys.stdin); print(isinstance(d.get('registrations'),list) and len(d['registrations'])>0)" <<<"$BODY")"
check "analytics heatmap cells" "True" "$(python3 -c "
import json,sys; d=json.load(sys.stdin); h=d.get('activity_heatmap',{}); print(len(h.get('cells',[]))==7 and all(len(r)==24 for r in h['cells']))" <<<"$BODY")"

echo "== Profile join & duplicate find =="
BODY="$(curl -sf "$BASE_URL/api/user-profile/21136836")"
check "profile returns user_id" "21136836" "$(echo "$BODY" | json_field user_id)"
check "profile has order_count" "True" "$(python3 -c "
import json,sys; d=json.load(sys.stdin); print(isinstance(d.get('order_count'),int))" <<<"$BODY")"
check "profile has activity_logs" "True" "$(python3 -c "
import json,sys; d=json.load(sys.stdin); print(isinstance(d.get('activity_logs'),list))" <<<"$BODY")"

BODY="$(curl -sf "$BASE_URL/api/duplicates/find?method=ip_address&limit=50")"
check "find ip_address returns pairs" "True" "$(python3 -c "
import json,sys; d=json.load(sys.stdin); print(isinstance(d.get('duplicates'),list) and len(d['duplicates'])>0)" <<<"$BODY")"

echo "== Round 4: duplicates =="
BODY="$(curl -sf "$BASE_URL/api/duplicates/21003474?threshold=0.5&limit=10")"
check "GET duplicates returns user_id" "21003474" "$(echo "$BODY" | json_field user_id)"
check "GET duplicates has possible_duplicates" "True" "$(python3 -c "
import json,sys; d=json.load(sys.stdin); print(isinstance(d['possible_duplicates'],list))" <<<"$BODY")"

BODY="$(curl -sf -X POST "$BASE_URL/api/duplicates" -H 'Content-Type: application/json' -d '{}')"
check "POST duplicates returns count" "True" "$(python3 -c "
import json,sys; d=json.load(sys.stdin); print(isinstance(d['count'],int))" <<<"$BODY")"

BODY="$(curl -sf -X POST "$BASE_URL/api/duplicates" -H 'Content-Type: application/json' -d '{"user_id": 21003474}')"
check "POST duplicates scoped lookup" "True" "$(python3 -c "
import json,sys; d=json.load(sys.stdin); print(isinstance(d['duplicates'],list))" <<<"$BODY")"

echo "== Docs =="
check "GET /api/openapi.json is JSON" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/openapi.json")"
check "GET /api/docs serves HTML" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/docs")"
check "GET /api/docs swagger css" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/docs/assets/swagger-ui.css")"
check "GET /api/docs swagger js" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/docs/assets/swagger-ui-bundle.js")"

echo
echo "== $PASS passed, $FAIL failed =="
[ "$FAIL" -eq 0 ]
