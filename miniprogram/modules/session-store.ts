import type { ChatMessage, ItemData, SessionResult } from '../types';

export interface SessionState {
  sessionId: string | null;
  messages: ChatMessage[];
  currentQuestions: ItemData[];
  currentQuestionIndex: number;
  isWaitingAnswer: boolean;
  isLoading: boolean;
  loadingPhase: 'generating' | 'judging' | 'cold_start';
  sessionResult: SessionResult | null;
  error: string | null;
  isColdStart: boolean;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function createDefaultState(): SessionState {
  return {
    sessionId: null,
    messages: [],
    currentQuestions: [],
    currentQuestionIndex: 0,
    isWaitingAnswer: false,
    isLoading: false,
    loadingPhase: 'generating',
    sessionResult: null,
    error: null,
    isColdStart: false,
  };
}

let _state: SessionState = createDefaultState();

function notify() {
  for (const fn of listeners) {
    try { fn(); } catch { /* don't let one broken listener break others */ }
  }
}

export function getState(): Readonly<SessionState> {
  return _state;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function setSessionId(id: string | null): void {
  _state.sessionId = id;
  notify();
}

export function addMessage(msg: ChatMessage): void {
  _state.messages.push(msg);
  notify();
}

export function setQuestions(questions: ItemData[]): void {
  _state.currentQuestions = questions;
  _state.currentQuestionIndex = 0;
  notify();
}

export function setLoading(loading: boolean, phase?: SessionState['loadingPhase']): void {
  _state.isLoading = loading;
  if (phase) _state.loadingPhase = phase;
  notify();
}

export function setWaitingAnswer(waiting: boolean): void {
  _state.isWaitingAnswer = waiting;
  notify();
}

export function setError(error: string | null): void {
  _state.error = error;
  notify();
}

export function setResult(result: SessionResult | null): void {
  _state.sessionResult = result;
  notify();
}

export function setColdStart(cold: boolean): void {
  _state.isColdStart = cold;
  notify();
}

export function clearSession(): void {
  _state = createDefaultState();
  notify();
}
