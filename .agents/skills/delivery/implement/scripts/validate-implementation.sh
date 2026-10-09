#!/usr/bin/env bash
set -euo pipefail

# validate-implementation.sh — post-implementation validation harness
# Usage: ./scripts/validate-implementation.sh <issue-id> <branch-name>

ISSUE_ID="${1:?issue-id required}"
BRANCH="${2:?branch-name required}"
ARTIFACT_DIR=".agents/skills/platform/artifacts/implement"
ARTIFACT_FILE="${ARTIFACT_DIR}/${ISSUE_ID}.json"

echo "=== Validate Implementation ==="
echo "Issue:   ${ISSUE_ID}"
echo "Branch:  ${BRANCH}"
echo ""

if [[ ! -f "${ARTIFACT_FILE}" ]]; then
  echo "FAIL: artifact missing: ${ARTIFACT_FILE}"
  exit 1
fi

if ! jq empty "${ARTIFACT_FILE}" 2>/dev/null; then
  echo "FAIL: artifact is not valid JSON"
  exit 1
fi

echo "PASS: artifact present and valid JSON"

STATUS=$(jq -r '.status' "${ARTIFACT_FILE}")
NEXT=$(jq -r '.nextConsumer' "${ARTIFACT_FILE}")

if [[ "${STATUS}" == "null" || -z "${STATUS}" ]]; then
  echo "FAIL: status is required"
  exit 1
fi

if [[ "${NEXT}" == "null" || -z "${NEXT}" ]]; then
  echo "FAIL: nextConsumer is required"
  exit 1
fi

echo "PASS: required fields present"

GATE_CI=$(jq -r '.qualityGateResults.gateCI // "unknown"' "${ARTIFACT_FILE}")
if [[ "${GATE_CI}" != "passed" ]]; then
  echo "FAIL: gate-ci must pass (current: ${GATE_CI})"
  exit 1
fi

echo "PASS: gate-ci passed"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "${CURRENT_BRANCH}" != "${BRANCH}" ]]; then
  echo "FAIL: on branch '${CURRENT_BRANCH}', expected '${BRANCH}'"
  exit 1
fi

echo "PASS: branch matches"

echo ""
echo "All validation checks passed."
