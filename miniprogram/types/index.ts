export type QuestionType = 'multiple_choice' | 'multiple_select' | 'true_false' | 'fill_in_blank' | 'reading_comprehension' | 'unknown';

export interface SubQuestion {
  sub_id: string;
  question_text: string;
  answer_format: string;
}

export interface ItemData {
  question_type: QuestionType;
  scene: string;
  grammar_focus: string;
  target_level: string;
  question_text: string;
  options?: { index: string; text: string }[];
  correct_answer?: string | string[] | boolean;
  reading_passage?: string;
  sub_questions?: SubQuestion[];
  blank_count?: number;
  expected_duration_seconds?: number;
  skill_dimension?: 'vocabulary' | 'grammar' | 'reading';
  batch_id?: string;
  batch_index?: number;
  batch_total?: number;
}

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'question' | 'feedback' | 'cold_start';
  content: string;
  item_data?: ItemData;
  batch_questions?: ItemData[];
  cold_start_data?: { round: number; label: string };
  timestamp: string;
  thinking_steps?: ThinkingStep[];
}

export interface ThinkingStep {
  agent: string;
  agent_key: string;
  output: string;
}

export interface ConfidenceStats {
  accuracy: number;
  ci_lower: number;
  ci_upper: number;
  confidence: number;
  sample_size: number;
  should_stop: boolean;
  stop_reason: string;
  remaining: number;
  total_rounds: number;
  min_rounds: number;
  max_rounds: number;
  dimension_rounds: { vocabulary: number; grammar: number; reading: number };
}

export interface UserProfileData {
  user_id: string;
  hsk_level: number;
  skill_levels: { hsk: number; vocabulary: number; grammar: number; reading: number };
  native_language: string | null;
  stubborn_errors: string[];
  strengths: string[];
  next_focus: string[];
  updated_at: string | null;
}

export interface ColdStartQuestion {
  cold_start: true;
  round: number;
  label: string;
  question: string;
}

export interface SessionResult {
  total_items: number;
  average_score: number;
  improved_areas: string[];
  regressed_areas: string[];
  level_change?: { from: string; to: string; promoted: boolean };
  next_focus: string[];
  notable_sentences?: string[];
  stubborn_errors?: string[];
  interest_areas?: string[];
  hsk_adjustment?: string;
  summary?: string;
}
