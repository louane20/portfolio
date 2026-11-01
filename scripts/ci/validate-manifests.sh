#!/usr/bin/env bash
# Renders every kustomize overlay and validates the result, CRDs included, with kubeconform.
#
# Gotcha worth knowing: the published JSON schemas for Cilium CRDs use ECMAScript
# "\uXXXX" escapes in regex patterns. Go's regexp rejects them, and kubeconform then
# silently treats the schema as missing ("could not find schema"). We download the
# schemas we need and rewrite those escapes to Go's "\x{XXXX}" syntax first.
set -euo pipefail

K8S_VERSION="${K8S_VERSION:-1.36.4}"
CATALOG="https://raw.githubusercontent.com/datreeio/CRDs-catalog/main"
SCHEMAS="$(mktemp -d)"
trap 'rm -rf "$SCHEMAS"' EXIT

for crd in cilium.io/ciliumnetworkpolicy_v2 argoproj.io/application_v1alpha1; do
  mkdir -p "$SCHEMAS/$(dirname "$crd")"
  curl --fail --silent --show-error --location --retry 3 --output "$SCHEMAS/$crd.json" "$CATALOG/$crd.json"
  sed -i 's/\\\\u\([0-9a-fA-F]\{4\}\)/\\\\x{\1}/g' "$SCHEMAS/$crd.json"
done

validate() {
  kubeconform -strict -summary -output text \
    -kubernetes-version "$K8S_VERSION" \
    -schema-location default \
    -schema-location "$SCHEMAS/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json" \
    "$@"
}

status=0
for overlay in deploy/k8s/overlays/*/; do
  echo "--- $overlay"
  kustomize build "$overlay" | validate - || status=1
done
echo "--- deploy/argocd"
validate deploy/argocd/ || status=1
echo "--- deploy/kind (kind's own config format is not a Kubernetes resource; checked by kind itself)"
exit "$status"
