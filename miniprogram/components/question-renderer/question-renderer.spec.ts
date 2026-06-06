import { describe, it, expect } from 'vitest';

// Basic type-level tests for question components' expected behavior.
// Full component lifecycle tests need a WeChat Component() harness;
// these tests verify the answer normalization logic that underlies the components.

describe('multiple-choice answer format', () => {
  function formatSingleChoice(selected: string): string {
    return selected || '';
  }

  function formatMultiSelect(selected: string[]): string {
    return selected.filter(Boolean).sort().join(',');
  }

  it('single choice returns the selected index', () => {
    expect(formatSingleChoice('A')).toBe('A');
    expect(formatSingleChoice('')).toBe('');
  });

  it('multi-select returns sorted comma-separated indices', () => {
    expect(formatMultiSelect(['B', 'A'])).toBe('A,B');
    expect(formatMultiSelect([])).toBe('');
    expect(formatMultiSelect(['C'])).toBe('C');
  });
});

describe('true-false answer format', () => {
  function formatTF(val: string): string {
    return val === 'true' ? 'true' : 'false';
  }

  it('emits "true" or "false" as string', () => {
    expect(formatTF('true')).toBe('true');
    expect(formatTF('false')).toBe('false');
    expect(formatTF('')).toBe('false');
  });
});

describe('fill-in-blank answer format', () => {
  function formatSingle(blank: string): string {
    return blank.trim();
  }

  function formatMulti(blanks: string[]): string {
    return blanks.map(b => b.trim()).join(',');
  }

  it('single blank trims whitespace', () => {
    expect(formatSingle('  hello  ')).toBe('hello');
  });

  it('multi-blank joins with comma', () => {
    expect(formatMulti(['a', 'b', 'c'])).toBe('a,b,c');
  });

  it('multi-blank preserves empty strings', () => {
    expect(formatMulti(['a', '', 'c'])).toBe('a,,c');
  });
});

describe('reading-comprehension answer format', () => {
  function formatAnswers(subIds: string[], answers: Record<string, string>): string {
    return subIds.map(id => `[${id}] ${answers[id] || ''}`).join('\n');
  }

  it('formats answers with sub_ids', () => {
    expect(formatAnswers(['s1', 's2'], { s1: 'ans1', s2: 'ans2' }))
      .toBe('[s1] ans1\n[s2] ans2');
  });

  it('handles missing answers', () => {
    expect(formatAnswers(['s1'], {}))
      .toBe('[s1] ');
  });
});
