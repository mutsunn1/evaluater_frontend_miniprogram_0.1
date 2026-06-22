import type { ThinkingStep, ConfidenceStats, SessionResult } from "../types";

export function toThinkingSteps(
  entries: { agent: string; label: string; output: string }[]
): ThinkingStep[] {
  return entries.map((s) => ({
    agent: s.label || s.agent,
    agent_key: s.agent,
    output: s.output,
  }));
}

export function buildSessionResult(
  summary: Record<string, unknown> | undefined,
  confidence: ConfidenceStats
): SessionResult {
  return {
    total_items: (summary?.total_items as number) ?? confidence.sample_size,
    average_score: confidence.accuracy,
    improved_areas: (summary?.interest_areas as string[]) ?? [],
    regressed_areas: (summary?.stubborn_errors as string[]) ?? [],
    next_focus: (summary?.next_focus as string[]) ?? [],
    notable_sentences: (summary?.notable_sentences as string[]) ?? [],
    stubborn_errors: (summary?.stubborn_errors as string[]) ?? [],
    interest_areas: (summary?.interest_areas as string[]) ?? [],
    hsk_adjustment: (summary?.hsk_adjustment as string) ?? "",
    summary: (summary?.summary as string) ?? "",
  };
}

export function createDefaultConfidence(): ConfidenceStats {
  return {
    accuracy: 0,
    ci_lower: 0,
    ci_upper: 0,
    confidence: 0,
    sample_size: 0,
    should_stop: false,
    stop_reason: "",
    remaining: 18,
    total_rounds: 0,
    min_rounds: 8,
    max_rounds: 18,
    dimension_rounds: {
      vocabulary: 0,
      grammar: 0,
      reading: 0,
      listening: 0,
      speaking: 0,
    },
  };
}
