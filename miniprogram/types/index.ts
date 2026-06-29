export type QuestionType =
  | "multiple_choice"
  | "multiple_select"
  | "true_false"
  | "fill_in_blank"
  | "reading_comprehension"
  | "listening"
  | "listening_comprehension"
  | "speaking"
  | "speaking_response"
  | "unknown";

export type ResponseMode =
  | "choice"
  | "text"
  | "speech"
  | "handwriting"
  | "upload";

export interface MediaAsset {
  id: string;
  type: "image" | "audio" | "video";
  role: "prompt" | "option" | "reference";
  source: "prepared" | "generated";
  url: string;
  mime_type?: string;
  alt?: string;
  descriptor?: string;
  tags?: string[];
  provider?: string;
  license?: string;
  attribution?: string;
  project_url?: string;
}

export interface QuestionOption {
  index: string;
  text?: string;
  media_id?: string;
  answer_behavior?: "skip_modality" | string;
  modality?: "listening" | "speaking" | string;
}

export interface SubQuestion {
  sub_id: string;
  question_text: string;
  answer_format: string;
}

export interface ItemData {
  question_type: QuestionType;
  response_mode?: ResponseMode;
  media?: MediaAsset[];
  scene: string;
  grammar_focus: string;
  target_level: string;
  question_text: string;
  options?: QuestionOption[];
  correct_answer?: string | string[] | boolean;
  reading_passage?: string;
  sub_questions?: SubQuestion[];
  blank_count?: number;
  expected_duration_seconds?: number;
  skill_dimension?:
    | "vocabulary"
    | "grammar"
    | "reading"
    | "listening"
    | "speaking";
  batch_id?: string;
  batch_index?: number;
  batch_total?: number;
  modality?: "listening" | "speaking" | string;
}

export interface ChatMessage {
  id: string;
  role: "system" | "user" | "question" | "feedback" | "cold_start";
  source?: "llm" | "system" | "user";
  content: string;
  item_data?: ItemData;
  batch_questions?: ItemData[];
  cold_start_data?: {
    round: number;
    label: string;
    labelKey?: string;
    questionKey?: string;
  };
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
  dimension_rounds: {
    vocabulary: number;
    grammar: number;
    reading: number;
    listening?: number;
    speaking?: number;
  };
}

export interface UserProfileData {
  user_id: string;
  hsk_level: number;
  skill_levels: {
    hsk: number;
    vocabulary: number;
    grammar: number;
    reading: number;
    listening?: number;
    speaking?: number;
  };
  native_language: string | null;
  stubborn_errors: string[];
  strengths: string[];
  next_focus: string[];
  updated_at: string | null;
}

export interface BatchAnswerPayload {
  question_index: number;
  answer: string;
  response_mode?: ResponseMode;
  response_asset_ids?: string[];
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
