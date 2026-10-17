import { describe, expect, it } from 'vitest';
import type { VacancyMatch } from '@workbridge/catalog';
import type { MatchDecision } from '@workbridge/solver';
import { orderMatchesByDecision } from '../../components/exploration/utils';

function match(jobId: string): VacancyMatch {
  return { vacancy: { jobId } } as VacancyMatch;
}

function decision(vacancyId: string, score: number): MatchDecision {
  return { vacancyId, score } as MatchDecision;
}

describe('orderMatchesByDecision', () => {
  it('keeps exploration order while decisions load', () => {
    const matches = [match('first'), match('second')];
    expect(orderMatchesByDecision(matches, [decision('second', 99), decision('first', 10)], true)).toEqual(matches);
  });

  it('orders by solver score after decisions load', () => {
    const matches = [match('first'), match('second')];
    expect(orderMatchesByDecision(matches, [decision('second', 99), decision('first', 10)], false).map((item) => item.vacancy.jobId)).toEqual(['second', 'first']);
  });
});
