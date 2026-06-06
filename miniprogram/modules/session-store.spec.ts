import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ChatMessage, ItemData, SessionResult, ConfidenceStats } from '../types';

// Reset module state between tests
let mod: typeof import('./session-store');

async function fresh() {
  // Dynamic import gives cached module, so we need to call clearSession
  mod = await import('./session-store');
  mod.clearSession();
  return mod;
}

describe('session-store', () => {
  beforeEach(async () => {
    mod = await fresh();
  });

  it('starts with IDLE state', () => {
    const s = mod.getState();
    expect(s.sessionId).toBeNull();
    expect(s.messages).toEqual([]);
    expect(s.currentQuestions).toEqual([]);
    expect(s.currentQuestionIndex).toBe(0);
    expect(s.isWaitingAnswer).toBe(false);
    expect(s.isLoading).toBe(false);
    expect(s.isColdStart).toBe(false);
    expect(s.sessionResult).toBeNull();
    expect(s.error).toBeNull();
  });

  it('clearSession resets everything', () => {
    mod.setSessionId('s1');
    mod.addMessage({ id: '1', role: 'system', content: 'hi', timestamp: '' });
    mod.setLoading(true, 'generating');
    mod.setColdStart(true);

    mod.clearSession();

    const s = mod.getState();
    expect(s.sessionId).toBeNull();
    expect(s.messages).toEqual([]);
    expect(s.isLoading).toBe(false);
    expect(s.isColdStart).toBe(false);
  });

  it('addMessage appends to messages array', () => {
    const msg: ChatMessage = { id: 'm1', role: 'system', content: 'hello', timestamp: '' };
    mod.addMessage(msg);
    expect(mod.getState().messages).toHaveLength(1);
    expect(mod.getState().messages[0]).toEqual(msg);
  });

  it('setLoading updates isLoading and loadingPhase', () => {
    mod.setLoading(true, 'judging');
    expect(mod.getState().isLoading).toBe(true);
    expect(mod.getState().loadingPhase).toBe('judging');

    mod.setLoading(false, 'generating');
    expect(mod.getState().isLoading).toBe(false);
  });

  it('setWaitingAnswer toggles flag', () => {
    mod.setWaitingAnswer(true);
    expect(mod.getState().isWaitingAnswer).toBe(true);
    mod.setWaitingAnswer(false);
    expect(mod.getState().isWaitingAnswer).toBe(false);
  });

  it('setError stores and clears error', () => {
    mod.setError('something wrong');
    expect(mod.getState().error).toBe('something wrong');
    mod.setError(null);
    expect(mod.getState().error).toBeNull();
  });

  it('setResult stores session result', () => {
    const result: SessionResult = {
      total_items: 10,
      average_score: 85,
      improved_areas: ['grammar'],
      regressed_areas: [],
      next_focus: ['reading'],
    };
    mod.setResult(result);
    expect(mod.getState().sessionResult).toEqual(result);
  });

  it('setColdStart toggles flag', () => {
    mod.setColdStart(true);
    expect(mod.getState().isColdStart).toBe(true);
    mod.setColdStart(false);
    expect(mod.getState().isColdStart).toBe(false);
  });

  it('setQuestions stores question batch', () => {
    const questions: ItemData[] = [
      { question_type: 'multiple_choice', question_text: 'Q1', scene: '', grammar_focus: '', target_level: '' },
      { question_type: 'true_false', question_text: 'Q2', scene: '', grammar_focus: '', target_level: '' },
    ];
    mod.setQuestions(questions);
    expect(mod.getState().currentQuestions).toHaveLength(2);
    expect(mod.getState().currentQuestionIndex).toBe(0);
  });

  it('notifies subscribers on state change', () => {
    const fn = vi.fn();
    const unsub = mod.subscribe(fn);
    mod.setSessionId('s1');
    expect(fn).toHaveBeenCalledTimes(1);

    mod.addMessage({ id: '1', role: 'system', content: 'hi', timestamp: '' });
    expect(fn).toHaveBeenCalledTimes(2);

    unsub();
    mod.setLoading(true, 'generating');
    // Should not have been called again after unsubscribe
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('subscribe returns different unsubscribe functions', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const unsub1 = mod.subscribe(fn1);
    const unsub2 = mod.subscribe(fn2);

    mod.setSessionId('s1');
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);

    unsub1();
    mod.addMessage({ id: '1', role: 'system', content: 'hi', timestamp: '' });
    expect(fn1).toHaveBeenCalledTimes(1); // not called again
    expect(fn2).toHaveBeenCalledTimes(2); // still subscribed
  });

  it('setSessionId stores session id', () => {
    mod.setSessionId('session-abc');
    expect(mod.getState().sessionId).toBe('session-abc');
    mod.setSessionId(null);
    expect(mod.getState().sessionId).toBeNull();
  });
});
