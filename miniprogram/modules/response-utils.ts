import type { BatchAnswerPayload, ItemData, ResponseMode } from "../types";

/**
 * Resolve the effective response mode for a question.
 *
 * If the backend provides an explicit response_mode, use it.
 * Otherwise, infer from question_type:
 *   - multiple_choice / multiple_select / true_false → "choice"
 *   - everything else → "text"
 *
 * This fixes the legacy bug where questions without response_mode
 * would incorrectly fall into the text-input branch.
 */
export function resolveResponseMode(q: ItemData): ResponseMode {
  if (q.response_mode) return q.response_mode;

  if (
    q.question_type === "multiple_choice" ||
    q.question_type === "multiple_select" ||
    q.question_type === "true_false"
  ) {
    return "choice";
  }

  return "text";
}

/**
 * Resolve a display label for multimodal placeholder submissions.
 * Used to show user-friendly "已提交XX占位" instead of empty answer text.
 */
export function placeholderAnswerLabel(mode: string): string {
  if (mode === "speech") return "已提交语音占位";
  if (mode === "handwriting") return "已提交手写占位";
  if (mode === "upload") return "已提交上传占位";
  return "";
}

/**
 * Build batch answer payloads from questions and user answers.
 *
 * For placeholder response modes (speech, handwriting, upload),
 * submits empty answer with the response_mode and empty asset_ids.
 * For choice/text modes, submits the actual user answer.
 *
 * The payload question_index always uses local array position (i).
 * The UI layer passes answers keyed by local qi (not batch_index),
 * so the mapping is consistent regardless of backend batch_index values.
 */
export function buildBatchAnswerPayload(
  questions: ItemData[],
  answers: Record<number, string>
): BatchAnswerPayload[] {
  return questions.map((q, i) => {
    const mode = resolveResponseMode(q);

    if (mode === "choice") {
      return { question_index: i, answer: answers[i] || "" };
    }

    // text, speech, handwriting, upload — all include response_mode and asset_ids
    return {
      question_index: i,
      answer: mode === "text" ? answers[i] || "" : answers[i] || "",
      response_mode: mode,
      response_asset_ids: [],
    };
  });
}
