#!/usr/bin/env bash
# Installs pinned CLI tools, verifying each download against a SHA-256 recorded here.
# A tag or a URL can be repointed; a checksum cannot. Update both together.
#
#   scripts/ci/install-tools.sh actionlint hadolint kubeconform kustomize
#   TOOLS_DIR=/usr/local/bin scripts/ci/install-tools.sh kind cilium k6
set -euo pipefail

TOOLS_DIR="${TOOLS_DIR:-$HOME/.local/bin}"
mkdir -p "$TOOLS_DIR"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# name | version | url | sha256 | path of the binary inside the archive ("-" for a bare binary)
manifest() {
  case "$1" in
    actionlint) echo "1.7.12|https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_linux_amd64.tar.gz|8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8|actionlint" ;;
    hadolint) echo "2.15.1|https://github.com/hadolint/hadolint/releases/download/v2.15.1/hadolint-linux-x86_64|c7187db94eeeeca956519a6af171adc31453941a1e777961f6e680f697c8c507|-" ;;
    kubeconform) echo "0.8.0|https://github.com/yannh/kubeconform/releases/download/v0.8.0/kubeconform-linux-amd64.tar.gz|9bc2bffbf71f261128533edaf912153948b7ff238f9a531ae6d34466ec287883|kubeconform" ;;
    kustomize) echo "5.8.3|https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.8.3/kustomize_v5.8.3_linux_amd64.tar.gz|cb9e31198d3f63b44848bd0afc4c8efc56e6cfef9c93a4a39a211940e6decd61|kustomize" ;;
    kind) echo "0.33.0|https://github.com/kubernetes-sigs/kind/releases/download/v0.33.0/kind-linux-amd64|aee6151561422756b764a4ae28e7f44cda5af5a9eead3cc9985112b1de8d8e0d|-" ;;
    cilium) echo "0.20.2|https://github.com/cilium/cilium-cli/releases/download/v0.20.2/cilium-linux-amd64.tar.gz|b7224a62bfed0e84f1a84567d274fefc5017df76a936e067c42012bb7fc30856|cilium" ;;
    k6) echo "2.3.0|https://github.com/grafana/k6/releases/download/v2.3.0/k6-v2.3.0-linux-amd64.tar.gz|39c3117b6af817592dcd0ce4242105c0a7af10948c2a425306f0be8f7a8a8ab1|k6-v2.3.0-linux-amd64/k6" ;;
    *) return 1 ;;
  esac
}

install_tool() {
  local name="$1" entry version url sha member file
  entry="$(manifest "$name")" || { echo "unknown tool: $name" >&2; exit 2; }
  IFS='|' read -r version url sha member <<<"$entry"
  file="$WORK/$(basename "${url//%2F/_}")"
  curl --fail --silent --show-error --location --retry 3 --retry-delay 2 --output "$file" "$url"
  if ! echo "$sha  $file" | sha256sum --check --status; then
    echo "::error::checksum mismatch for $name $version ($url)" >&2
    exit 1
  fi
  if [[ "$member" == "-" ]]; then
    install -m 0755 "$file" "$TOOLS_DIR/$name"
  else
    tar -xzf "$file" -C "$WORK" "$member"
    install -m 0755 "$WORK/$member" "$TOOLS_DIR/$name"
  fi
  echo "installed $name $version -> $TOOLS_DIR/$name (sha256 verified)"
}

for tool in "$@"; do install_tool "$tool"; done

if [[ -n "${GITHUB_PATH:-}" ]]; then echo "$TOOLS_DIR" >>"$GITHUB_PATH"; fi
