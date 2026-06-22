import type { BatchAnswerPayload, ItemData, ResponseMode } from "../types";

const VALID_RESPONSE_MODES = new Set([
  "choice",
  "text",
  "speech",
  "handwriting",
  "upload",
]);

const CHOICE_RESPONSE_ALIASES = new Set([
  "single",
  "multiple",
  "select",
  "multiple_choice",
  "multiple_select",
  "true_false",
  "listening",
  "listening_comprehension",
]);

const TEXT_RESPONSE_ALIASES = new Set([
  "blank",
  "fill",
  "fill_in_blank",
  "reading",
  "reading_comprehension",
  "free_text",
]);

export function getSkipModalityOption(q: ItemData) {
  return (q.options || []).find(
    (opt) => opt.answer_behavior === "skip_modality"
  );
}

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
  const explicit = String(q.response_mode || "").trim();
  if (VALID_RESPONSE_MODES.has(explicit)) return explicit as ResponseMode;
  if (CHOICE_RESPONSE_ALIASES.has(explicit)) return "choice";
  if (TEXT_RESPONSE_ALIASES.has(explicit)) return "text";

  if (
    q.question_type === "multiple_choice" ||
    q.question_type === "multiple_select" ||
    q.question_type === "true_false" ||
    q.question_type === "listening" ||
    q.question_type === "listening_comprehension"
  ) {
    return "choice";
  }

  if (q.question_type === "speaking_response") {
    return "speech";
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

    // text, handwriting, upload — answer value in `answer`, no asset_ids.
    // speech — distinguish two cases that both land in answers[i]:
    //   (a) the learner tapped the "现在先不做口语题" skip option → the value
    //       is the skip option's index (e.g. "Z"); it must travel in `answer`
    //       so the backend grader detects the skip via answer text.
    //   (b) the learner recorded and uploaded audio → the value is the asset
    //       id; it must travel in response_asset_ids (the backend grader only
    //       consults that field, so putting it in `answer` = "录音无声").
    if (mode === "speech") {
      const value = (answers[i] || "").trim();
      const skipOption = getSkipModalityOption(q);
      const isSkipAnswer =
        skipOption &&
        typeof skipOption.index === "string" &&
        skipOption.index === value;
      if (value && !isSkipAnswer) {
        return {
          question_index: i,
          answer: "",
          response_mode: mode,
          response_asset_ids: [value],
        };
      }
      return {
        question_index: i,
        answer: value,
        response_mode: mode,
        response_asset_ids: [],
      };
    }

    return {
      question_index: i,
      answer: answers[i] || "",
      response_mode: mode,
      response_asset_ids: [],
    };
  });
}
