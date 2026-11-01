#!/usr/bin/env bash
# Zero Trust end-to-end test on a real cluster: kind + Cilium.
#
# Expects the image $IMAGE in the local Docker daemon (built by the workflow or `make image`).
#   scripts/ci/zero-trust-e2e.sh all          # up, deploy, test, load, evidence
#   scripts/ci/zero-trust-e2e.sh up|deploy|test|load|evidence|diagnostics|down
#
# Every check that matters fails the script: the site must answer the gateway, the L7
# policy must refuse anything but GET/HEAD, and every other pod (or the site itself,
# trying to reach the internet) must be dropped.
set -euo pipefail

CLUSTER="${CLUSTER:-zero-trust}"
KIND_NODE_IMAGE="${KIND_NODE_IMAGE:-kindest/node:v1.36.4@sha256:099e049362a1526b2db71494e1947aae99bd16290d7c895f2b7ea312e3cbfaed}"
CILIUM_VERSION="${CILIUM_VERSION:-1.20.4}"
IMAGE="${IMAGE:-localhost/portfolio:e2e}"
CURL_IMAGE="${CURL_IMAGE:-curlimages/curl:8.17.0}"
SUMMARY="${GITHUB_STEP_SUMMARY:-/dev/null}"
SITE="http://portfolio.portfolio.svc.cluster.local"
RESULTS="$(mktemp)"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

up() {
  log "kind cluster '$CLUSTER' without a default CNI ($KIND_NODE_IMAGE)"
  kind create cluster --name "$CLUSTER" --config deploy/kind/cluster.yaml --image "$KIND_NODE_IMAGE"
  log "Cilium $CILIUM_VERSION (Helm), Hubble on"
  helm repo add cilium https://helm.cilium.io --force-update >/dev/null
  helm upgrade --install cilium cilium/cilium --version "$CILIUM_VERSION" --namespace kube-system \
    --set image.pullPolicy=IfNotPresent \
    --set ipam.mode=kubernetes \
    --set operator.replicas=1 \
    --set hubble.enabled=true \
    --wait --timeout 10m
  cilium status --wait --wait-duration 6m
  kubectl wait --for=condition=Ready nodes --all --timeout=180s
}

client() { # namespace name label
  kubectl -n "$1" run "$2" --image="$CURL_IMAGE" --labels="$3" --restart=Never --command -- sleep 86400
}

deploy() {
  log "Loading $IMAGE into kind"
  kind load docker-image "$IMAGE" --name "$CLUSTER"
  log "Deploying deploy/k8s/overlays/kind"
  kubectl apply -k deploy/k8s/overlays/kind
  kubectl -n portfolio rollout status deployment/portfolio --timeout=180s
  log "Test clients: edge/gateway (allowed), edge/visitor (same namespace, no identity), rogue/intruder"
  kubectl create namespace edge --dry-run=client -o yaml | kubectl apply -f -
  kubectl create namespace rogue --dry-run=client -o yaml | kubectl apply -f -
  client edge gateway app.kubernetes.io/name=gateway
  client edge visitor app.kubernetes.io/name=visitor
  client rogue intruder app.kubernetes.io/name=intruder
  kubectl -n edge wait --for=condition=Ready pod/gateway pod/visitor --timeout=180s
  kubectl -n rogue wait --for=condition=Ready pod/intruder --timeout=180s
}

# Prints the HTTP status seen by a client pod, or 000 when the connection is dropped.
status_from() { # namespace pod method path
  local flags=(-s -o /dev/null -w '%{http_code}' --max-time 6)
  if [[ "$3" == HEAD ]]; then flags+=(-I); else flags+=(-X "$3"); fi
  kubectl -n "$1" exec "$2" -- curl "${flags[@]}" "$SITE$4" 2>/dev/null || true
}

record() { # description expected actual
  local verdict="pass"
  [[ "$2" == "$3" ]] || verdict="FAIL"
  # shellcheck disable=SC2016 # the backticks are Markdown, not command substitution
  printf '| %s | `%s` | `%s` | %s |\n' "$1" "$2" "$3" "$verdict" >>"$RESULTS"
  printf '  %-62s expected %-8s got %-8s %s\n' "$1" "$2" "$3" "$verdict"
}

test_policies() {
  log "Waiting for the gateway to be allowed (policy regeneration can take a few seconds)"
  local code=""
  for _ in $(seq 1 30); do
    code="$(status_from edge gateway GET /)"
    [[ "$code" == 200 ]] && break
    sleep 2
  done

  log "Zero Trust checks"
  record "gateway GET /" 200 "$code"
  record "gateway HEAD /" 200 "$(status_from edge gateway HEAD /)"
  record "gateway GET /healthz" 200 "$(status_from edge gateway GET /healthz)"
  record "gateway POST / (L7: only GET and HEAD are allowed)" 403 "$(status_from edge gateway POST /)"
  record "gateway DELETE /index.html (L7)" 403 "$(status_from edge gateway DELETE /index.html)"
  record "visitor, same namespace, no gateway identity (L3/L4)" 000 "$(status_from edge visitor GET /)"
  record "intruder from another namespace (L3/L4)" 000 "$(status_from rogue intruder GET /)"

  local egress="blocked"
  if kubectl -n portfolio exec deploy/portfolio -- wget -q -T 4 -O /dev/null http://1.1.1.1/ >/dev/null 2>&1; then egress="open"; fi
  record "site pod calling the internet (egress default deny)" blocked "$egress"

  local headers
  headers="$(kubectl -n edge exec gateway -- curl -sI --max-time 6 "$SITE/" 2>/dev/null | tr -d '\r' | tr '[:upper:]' '[:lower:]' || true)"
  local csp="missing"
  grep -q '^content-security-policy: default-src' <<<"$headers" && csp="present"
  record "Content-Security-Policy header" present "$csp"

  record "container user id" 101 "$(kubectl -n portfolio exec deploy/portfolio -- id -u 2>/dev/null | tr -d '\r' || true)"
  local rofs="read-only"
  if kubectl -n portfolio exec deploy/portfolio -- sh -c 'touch /usr/share/nginx/html/pwned' >/dev/null 2>&1; then rofs="writable"; fi
  record "root filesystem" read-only "$rofs"
  local token="absent"
  if kubectl -n portfolio exec deploy/portfolio -- ls /var/run/secrets/kubernetes.io/serviceaccount >/dev/null 2>&1; then token="mounted"; fi
  record "service account token" absent "$token"

  log "Latency through Cilium's L7 proxy (50 sequential GETs from the gateway)"
  local timings p50 p95
  timings="$(kubectl -n edge exec gateway -- sh -c "for i in \$(seq 1 50); do curl -s -o /dev/null -w '%{time_total}\n' $SITE/; done" | sort -n)"
  p50="$(awk '{a[NR]=$1} END {printf "%.1f", a[int(NR*0.50)]*1000}' <<<"$timings")"
  p95="$(awk '{a[NR]=$1} END {printf "%.1f", a[int(NR*0.95)]*1000}' <<<"$timings")"
  echo "  p50 ${p50} ms, p95 ${p95} ms"

  {
    echo "## Zero Trust on kind + Cilium ${CILIUM_VERSION}"
    echo
    echo "| Check | Expected | Got | Result |"
    echo "| --- | --- | --- | --- |"
    cat "$RESULTS"
    echo
    echo "Latency through the L7 proxy (gateway, 50 requests): p50 **${p50} ms**, p95 **${p95} ms**."
    echo
  } >>"$SUMMARY"

  if grep -q '| FAIL |' "$RESULTS"; then
    echo "::error::Zero Trust checks failed"
    return 1
  fi
}

load() {
  log "k6 load test (port-forward to the Service)"
  kubectl -n portfolio port-forward service/portfolio 18080:80 >/tmp/port-forward.log 2>&1 &
  local pf=$!
  trap 'kill "$pf" 2>/dev/null || true' RETURN
  for _ in $(seq 1 20); do curl -sf http://127.0.0.1:18080/healthz >/dev/null && break; sleep 1; done
  k6 run --quiet -e BASE_URL=http://127.0.0.1:18080 tests/load/smoke.js
  { echo "### k6"; echo; cat k6-summary.md; echo; } >>"$SUMMARY"
}

evidence() {
  log "Hubble: flows dropped by policy during the test"
  local flows
  flows="$(kubectl -n kube-system exec ds/cilium -c cilium-agent -- hubble observe --namespace portfolio --verdict DROPPED --last 25 -o compact 2>/dev/null || true)"
  echo "$flows"
  {
    echo "### Hubble: dropped flows"
    echo
    echo '```'
    echo "${flows:-no flows captured}"
    echo '```'
  } >>"$SUMMARY"
}

diagnostics() {
  log "Diagnostics"
  kubectl get nodes -o wide || true
  kubectl get pods -A -o wide || true
  kubectl -n portfolio describe pods || true
  kubectl get cnp,netpol -A || true
  cilium status || true
  kubectl get events -A --sort-by=.lastTimestamp | tail -40 || true
  kubectl -n kube-system exec ds/cilium -c cilium-agent -- hubble observe --last 60 -o compact || true
}

down() { kind delete cluster --name "$CLUSTER"; }

case "${1:-all}" in
  up) up ;;
  deploy) deploy ;;
  test) test_policies ;;
  load) load ;;
  evidence) evidence ;;
  diagnostics) diagnostics ;;
  down) down ;;
  all) up && deploy && test_policies && load && evidence ;;
  *) echo "usage: $0 [all|up|deploy|test|load|evidence|diagnostics|down]" >&2; exit 2 ;;
esac
