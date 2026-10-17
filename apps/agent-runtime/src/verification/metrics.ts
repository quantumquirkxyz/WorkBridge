import type { VerificationStatus } from "./status";

export interface ConfusionRow {
  groundTruth: VerificationStatus;
  predicted: VerificationStatus;
  usedFallback: boolean;
}

export interface ConfusionMatrix {
  tp: number;
  tn: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  fallbackRate: number;
}

export function confusionMatrix(rows: ConfusionRow[]): ConfusionMatrix {
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;
  let fallbacks = 0;

  for (const row of rows) {
    const actual = row.groundTruth === "verified";
    const predicted = row.predicted === "verified";
    if (actual && predicted) tp += 1;
    else if (!actual && !predicted) tn += 1;
    else if (!actual && predicted) fp += 1;
    else fn += 1;
    if (row.usedFallback) fallbacks += 1;
  }

  return {
    tp,
    tn,
    fp,
    fn,
    precision: ratio(tp, tp + fp),
    recall: ratio(tp, tp + fn),
    falsePositiveRate: ratio(fp, fp + tn),
    falseNegativeRate: ratio(fn, fn + tp),
    fallbackRate: ratio(fallbacks, rows.length),
  };
}

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}
