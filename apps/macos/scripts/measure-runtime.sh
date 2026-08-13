#!/usr/bin/env bash

set -euo pipefail

sample_count="${1:-10}"
sample_interval="${2:-1}"

if ! [[ "$sample_count" =~ ^[1-9][0-9]*$ ]]; then
  echo "sample count must be a positive integer" >&2
  exit 2
fi

if ! [[ "$sample_interval" =~ ^[1-9][0-9]*$ ]]; then
  echo "sample interval must be a positive integer" >&2
  exit 2
fi

swift build -c release >/dev/null

binary_path=".build/release/AntiAIDesktop"
log_path="$(mktemp -t anti-ai-desktop-runtime.XXXXXX.log)"
sample_path="$(mktemp -t anti-ai-desktop-runtime.XXXXXX.samples)"
app_pid=""

cleanup() {
  if [[ -n "$app_pid" ]] && kill -0 "$app_pid" 2>/dev/null; then
    kill -TERM "$app_pid" 2>/dev/null || true
    wait "$app_pid" 2>/dev/null || true
  fi
  rm -f "$log_path" "$sample_path"
}
trap cleanup EXIT

"$binary_path" >"$log_path" 2>&1 &
app_pid="$!"

window_count="0"
for _ in $(seq 1 20); do
  if ! kill -0 "$app_pid" 2>/dev/null; then
    echo "desktop process exited before creating a window" >&2
    cat "$log_path" >&2
    exit 1
  fi
  window_count="$(swift scripts/window-count.swift "$app_pid")"
  if [[ "$window_count" -gt 0 ]]; then
    break
  fi
  sleep 0.25
done

if [[ "$window_count" -eq 0 ]]; then
  echo "desktop process created no visible window" >&2
  exit 1
fi

# Exclude launch, resource loading, and first-frame setup from steady-state samples.
sleep 5

for _ in $(seq 1 "$sample_count"); do
  ps -p "$app_pid" -o %cpu=,rss= >>"$sample_path"
  sleep "$sample_interval"
done

kill -TERM "$app_pid"
terminated_pid="$app_pid"
wait "$app_pid" 2>/dev/null || true
app_pid=""

awk '
  {
    cpu[NR] = $1;
    rss[NR] = $2;
    cpuTotal += $1;
    rssTotal += $2;
  }
  END {
    if (NR == 0) exit 1;
    printf "samples=%d\n", NR;
    printf "cpu_average_percent=%.3f\n", cpuTotal / NR;
    printf "rss_average_mib=%.2f\n", rssTotal / NR / 1024;
    printf "rss_last_mib=%.2f\n", rss[NR] / 1024;
  }
' "$sample_path"

printf 'binary_bytes=%s\n' "$(stat -f%z "$binary_path")"
printf 'visible_windows=%s\n' "$window_count"

if kill -0 "$terminated_pid" 2>/dev/null; then
  echo "residual_process=true"
  exit 1
fi

echo "residual_process=false"
