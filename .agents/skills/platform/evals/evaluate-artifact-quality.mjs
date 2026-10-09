#!/usr/bin/env node
// evaluate-artifact-quality.mjs — LLM-as-judge for quality bar compliance
// Usage: node evaluate-artifact-quality.mjs <artifact-path> [--json]

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

const QUALITY_BAR_QUESTIONS = [
  'What is the source of truth?',
  'What is in scope?',
  'What is explicitly out of scope?',
  'Who or what consumes this artifact afterward?',
  'What evidence proves it is done?',
  'What risk remains?',
];

async function loadArtifact(artifactPath) {
  const absolute = path.isAbsolute(artifactPath) ? artifactPath : path.join(ROOT, artifactPath);
  const content = await fs.readFile(absolute, 'utf8');
  return JSON.parse(content);
}

function scoreQualityBar(artifact) {
  const provenance = artifact.provenance || {};
  const scores = {};
  let total = 0;

  for (const question of QUALITY_BAR_QUESTIONS) {
    let answer = '';
    const questionLower = question.toLowerCase();
    if (questionLower.includes('source of truth')) answer = provenance.sourceOfTruth || '';
    else if (questionLower.includes('in scope')) answer = provenance.scope ? JSON.stringify(provenance.scope) : '';
    else if (questionLower.includes('out of scope')) answer = provenance.outOfScope ? JSON.stringify(provenance.outOfScope) : '';
    else if (questionLower.includes('consumes')) answer = provenance.nextConsumer || '';
    else if (questionLower.includes('evidence')) answer = provenance.evidence || '';
    else if (questionLower.includes('risk')) answer = provenance.riskRemaining || '';

    const hasAnswer = answer && answer.length > 10 && !answer.toLowerCase().includes('tbd') && !answer.toLowerCase().includes('todo');
    scores[question] = {
      answered: hasAnswer,
      answer: answer.slice(0, 200),
      score: hasAnswer ? 100 : 0,
    };
    total += hasAnswer ? 100 : 0;
  }

  return {
    totalScore: Math.round(total / QUALITY_BAR_QUESTIONS.length),
    passed: total / QUALITY_BAR_QUESTIONS.length >= 80,
    questions: scores,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const artifactPath = args.find(a => !a.startsWith('--'));
  const json = args.includes('--json');

  if (!artifactPath) {
    console.error('Usage: node evaluate-artifact-quality.mjs <artifact-path> [--json]');
    process.exit(1);
  }

  const artifact = await loadArtifact(artifactPath);
  const result = scoreQualityBar(artifact);

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\nArtifact Quality Bar Evaluation`);
    console.log(`Overall: ${result.totalScore}% — ${result.passed ? 'PASS' : 'FAIL'}`);
    for (const [question, qResult] of Object.entries(result.questions)) {
      console.log(`  [${qResult.score}%] ${question}`);
      if (!qResult.answered) console.log(`         MISSING or insufficient answer`);
    }
  }

  process.exit(result.passed ? 0 : 1);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
