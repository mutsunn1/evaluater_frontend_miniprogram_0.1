import { describe, it, expect } from 'vitest';
import type { ConfidenceStats } from '../../types';

function makeConfidence(overrides: Partial<ConfidenceStats> = {}): ConfidenceStats {
  return {
    accuracy: 0,
    confidence: 0,
    sample_size: 0,
    should_stop: false,
    stop_reason: '',
    total_rounds: 0,
    min_rounds: 8,
    max_rounds: 18,
    dimension_rounds: { vocabulary: 0, grammar: 0, reading: 0 },
    ci_lower: 0,
    ci_upper: 0,
    remaining: 18,
    ...overrides,
  };
}

function isVisible(c: ConfidenceStats): boolean {
  return c.total_rounds > 0 || c.sample_size > 0;
}

function progressPct(c: ConfidenceStats): number {
  return Math.min(100, (c.total_rounds / (c.max_rounds || 18)) * 100);
}

function progressColor(c: ConfidenceStats): string {
  if (c.total_rounds >= (c.max_rounds || 18)) return 'blue';
  if (c.total_rounds >= (c.min_rounds || 8)) return 'green';
  return 'yellow';
}

describe('confidence-bar logic', () => {
  it('hidden when no rounds and no sample', () => {
    expect(isVisible(makeConfidence())).toBe(false);
  });

  it('visible when rounds > 0', () => {
    expect(isVisible(makeConfidence({ total_rounds: 1 }))).toBe(true);
  });

  it('visible when sample > 0', () => {
    expect(isVisible(makeConfidence({ sample_size: 1 }))).toBe(true);
  });

  it('progress 0% at start', () => {
    expect(progressPct(makeConfidence({ total_rounds: 0, max_rounds: 18 }))).toBe(0);
  });

  it('progress 50% mid-way', () => {
    expect(progressPct(makeConfidence({ total_rounds: 9, max_rounds: 18 }))).toBe(50);
  });

  it('progress capped at 100%', () => {
    expect(progressPct(makeConfidence({ total_rounds: 20, max_rounds: 18 }))).toBe(100);
  });

  it('yellow when below min_rounds', () => {
    expect(progressColor(makeConfidence({ total_rounds: 5, min_rounds: 8, max_rounds: 18 }))).toBe('yellow');
  });

  it('green when between min and max', () => {
    expect(progressColor(makeConfidence({ total_rounds: 10, min_rounds: 8, max_rounds: 18 }))).toBe('green');
  });

  it('blue when at max_rounds', () => {
    expect(progressColor(makeConfidence({ total_rounds: 18, min_rounds: 8, max_rounds: 18 }))).toBe('blue');
  });

  it('accuracy and confidence rounded to integer', () => {
    const c = makeConfidence({ accuracy: 0.876, confidence: 0.912 });
    expect(Math.round(c.accuracy * 100)).toBe(88);
    expect(Math.round(c.confidence * 100)).toBe(91);
  });
});
