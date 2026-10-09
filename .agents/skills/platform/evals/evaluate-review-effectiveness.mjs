#!/usr/bin/env node
// evaluate-review-effectiveness.mjs — measures review quality
// Usage: node evaluate-review-effectiveness.mjs <review-artifact> [--json]

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

async function loadArtifact(artifactPath) {
  const absolute = path.isAbsolute(artifactPath) ? artifactPath : path.join(ROOT, artifactPath);
  const content = await fs.readFile(absolute, 'utf8');
  return JSON.parse(content);
}

function evaluateReview(review) {
  const standards = review.output?.standardsFindings || [];
  const spec = review.output?.specFindings || [];
  const total = standards.length + spec.length;

  const actionableStandards = standards.filter(f => f.suggestedFix && f.location);
  const actionableSpec = spec.filter(f => f.suggestedFix && f.location);

  const noiseRate = total > 0 ? ((total - actionableStandards.length - actionableSpec.length) / total) * 100 : 100;

  const severityDistribution = { info: 0, warning: 0, high: 0, critical: 0 };
  for (const f of [...standards, ...spec]) {
    const sev = (f.severity || 'info').toLowerCase();
    if (sev in severityDistribution) severityDistribution[sev]++;
  }

  const hasSummary = !!(review.output?.summary);
  const hasWorstStandard = !!(review.output?.summary?.worstStandard);
  const hasWorstSpec = !!(review.output?.summary?.worstSpec);

  const scoreComponents = {
    actionability: Math.max(0, 100 - noiseRate),
    coverage: total > 0 ? 100 : 50,
    severityBalance: severityDistribution.critical + severityDistribution.high > 0 ? 100 : 70,
    summaryQuality: (hasSummary && hasWorstStandard && hasWorstSpec) ? 100 : 50,
  };

  const score = Math.round(
    scoreComponents.actionability * 0.4 +
    scoreComponents.coverage * 0.2 +
    scoreComponents.severityBalance * 0.2 +
    scoreComponents.summaryQuality * 0.2
  );

  return {
    score,
    passed: score >= 75 && total > 0,
    totalFindings: total,
    standardsCount: standards.length,
    specCount: spec.length,
    actionableStandards: actionableStandards.length,
    actionableSpec: actionableSpec.length,
    noiseRate: Math.round(noiseRate),
    severityDistribution,
    summaryQuality: { hasSummary, hasWorstStandard, hasWorstSpec },
    components: scoreComponents,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const artifactPath = args.find(a => !a.startsWith('--'));
  const json = args.includes('--json');

  if (!artifactPath) {
    console.error('Usage: node evaluate-review-effectiveness.mjs <review-artifact> [--json]');
    process.exit(1);
  }

  const review = await loadArtifact(artifactPath);
  const result = evaluateReview(review);

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\nReview Effectiveness Evaluation`);
    console.log(`Score: ${result.score}/100 — ${result.passed ? 'PASS' : 'FAIL'}`);
    console.log(`Findings: ${result.totalFindings} (Standards: ${result.standardsCount}, Spec: ${result.specCount})`);
    console.log(`Actionable: ${result.actionableStandards + result.actionableSpec}/${result.totalFindings}`);
    console.log(`Noise rate: ${result.noiseRate}%`);
  }

  process.exit(result.passed ? 0 : 1);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
