import { describe, it, expect } from 'vitest';
import type { ChatMessage, ItemData } from '../../types';

function makeBatchMessage(questions: ItemData[]): ChatMessage {
  return {
    id: 'msg-1',
    role: 'question',
    content: '',
    batch_questions: questions,
    timestamp: new Date().toISOString(),
  };
}

function collectBatchAnswers(
  questions: ItemData[],
  answers: Record<number, string>,
): Array<{ question_index: number; answer: string }> {
  return questions.map((_q, i) => ({
    question_index: i,
    answer: answers[i] || '',
  }));
}

function canSubmitBatch(questions: ItemData[], filledCount: number): boolean {
  return filledCount >= questions.length;
}

describe('message-bubble batch answer logic', () => {
  const mockQuestions: ItemData[] = [
    { question_type: 'multiple_choice', question_text: 'Q1', scene: '', grammar_focus: '', target_level: '' },
    { question_type: 'true_false', question_text: 'Q2', scene: '', grammar_focus: '', target_level: '' },
    { question_type: 'fill_in_blank', question_text: 'Q3', scene: '', grammar_focus: '', target_level: '' },
  ];

  it('submit disabled when no answers', () => {
    expect(canSubmitBatch(mockQuestions, 0)).toBe(false);
  });

  it('submit disabled when partial answers', () => {
    expect(canSubmitBatch(mockQuestions, 2)).toBe(false);
  });

  it('submit enabled when all answered', () => {
    expect(canSubmitBatch(mockQuestions, 3)).toBe(true);
  });

  it('collectBatchAnswers maps indices correctly', () => {
    const answers: Record<number, string> = { 0: 'A', 1: 'true', 2: 'hello' };
    const result = collectBatchAnswers(mockQuestions, answers);
    expect(result).toEqual([
      { question_index: 0, answer: 'A' },
      { question_index: 1, answer: 'true' },
      { question_index: 2, answer: 'hello' },
    ]);
  });

  it('empty batch returns empty array', () => {
    expect(collectBatchAnswers([], {})).toEqual([]);
  });

  it('message with batch_questions is identified correctly', () => {
    const msg = makeBatchMessage(mockQuestions);
    expect(msg.batch_questions).toHaveLength(3);
    expect(msg.role).toBe('question');
  });
});
