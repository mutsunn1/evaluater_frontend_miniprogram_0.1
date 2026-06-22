import { startSseRequest } from "./sse-parser";
import { toThinkingSteps } from "./session-utils";
import { API_BASE_URL } from "./config";
import type {
  ItemData,
  ThinkingStep,
  ConfidenceStats,
  UserProfileData,
  QuestionOption,
  MediaAsset,
} from "../types";

const BASE_URL = API_BASE_URL;

// ---- wx.request Promise wrapper for non-streaming calls ----

function request<T>(opts: {
  url: string;
  method?: string;
  data?: unknown;
}): Promise<T> {
  return new Promise((resolve, reject) => {
    const wx = (globalThis as Record<string, unknown>).wx as
      | {
          request: (o: Record<string, unknown>) => { abort(): void };
        }
      | undefined;
    if (!wx?.request) {
      reject(new Error("wx.request is not available"));
      return;
    }
    wx.request({
      url: opts.url,
      method: opts.method || "GET",
      data: opts.data,
      header: { "Content-Type": "application/json" },
      success(res: { statusCode: number; data: T }) {
        if (res.statusCode >= 400) {
          reject(new Error(`Request failed with status ${res.statusCode}`));
        } else {
          resolve(res.data);
        }
      },
      fail(err: { errMsg: string }) {
        reject(new Error(err.errMsg || "request failed"));
      },
    });
  });
}

// ---- Non-streaming API functions ----

export function createSession(userId: string): Promise<{
  session_id: string;
  user_id: string;
  hsk_level: number;
  needs_cold_start?: boolean;
}> {
  return request({
    url: `${BASE_URL}/api/v1/sessions?user_id=${encodeURIComponent(userId)}`,
    method: "POST",
  });
}

export function endSession(sessionId: string): Promise<{
  session_id: string;
  summary: Record<string, unknown>;
}> {
  return request({
    url: `${BASE_URL}/api/v1/sessions/${encodeURIComponent(sessionId)}/end`,
    method: "POST",
  });
}

export function getConfidence(sessionId: string): Promise<ConfidenceStats> {
  return request({
    url: `${BASE_URL}/api/v1/sessions/${encodeURIComponent(sessionId)}/confidence`,
  });
}

export function getUserProfile(userId: string): Promise<UserProfileData> {
  return request({
    url: `${BASE_URL}/api/v1/users/${encodeURIComponent(userId)}/profile`,
  });
}

// ---- Multipart upload (speech recording) ----

export interface SpeechUploadResult {
  asset_id: string;
  status: "uploaded" | "transcribed" | "failed";
  transcript: string;
  duration_ms?: number;
  error?: string;
}

export function uploadSpeechRecording(
  sessionId: string,
  questionItemId: number,
  filePath: string,
  durationMs: number,
  fileName: string
): Promise<SpeechUploadResult> {
  return new Promise((resolve, reject) => {
    const wxApi = (globalThis as Record<string, unknown>).wx as
      | {
          uploadFile: (o: Record<string, unknown>) => { abort(): void };
        }
      | undefined;
    if (!wxApi?.uploadFile) {
      reject(new Error("wx.uploadFile is not available"));
      return;
    }
    const url = `${BASE_URL}/api/v1/sessions/${encodeURIComponent(sessionId)}/assets/speech`;
    const task = wxApi.uploadFile({
      url,
      filePath,
      name: "file",
      formData: {
        question_item_id: String(questionItemId),
        duration_ms: String(durationMs),
      },
      success(res: { statusCode: number; data: string }) {
        if (res.statusCode >= 400) {
          reject(new Error(`Upload failed with status ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(res.data) as SpeechUploadResult);
        } catch {
          reject(new Error("Upload returned invalid JSON"));
        }
      },
      fail(err: { errMsg: string }) {
        reject(new Error(err.errMsg || "upload failed"));
      },
    });
    void task;
    void fileName;
  });
}

// ---- Streaming helper ----

interface StreamOpts {
  signal?: { aborted: boolean };
  requestId?: string;
  onQuestion?: (question: ItemData) => void;
}

const OPTION_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function normalizeQuestionType(
  value: unknown,
  question: Record<string, unknown>
): ItemData["question_type"] {
  const raw = String(value || "").trim();
  if (raw === "single" || raw === "single_choice") return "multiple_choice";
  if (raw === "multiple" || raw === "multi_choice") return "multiple_select";
  if (raw === "judge" || raw === "true_or_false") return "true_false";
  if (raw === "blank" || raw === "fill") return "fill_in_blank";
  if (
    raw === "listening" ||
    raw === "listening_comprehension" ||
    raw === "listening_choice"
  ) {
    return "listening_comprehension";
  }
  if (
    raw === "speaking" ||
    raw === "speaking_response" ||
    raw === "oral_response" ||
    raw === "read_aloud"
  ) {
    return "speaking_response";
  }
  if (raw === "reading" || raw === "read") {
    return Array.isArray(question.options) && question.options.length > 0
      ? "multiple_choice"
      : "reading_comprehension";
  }
  if (
    raw === "multiple_choice" ||
    raw === "multiple_select" ||
    raw === "true_false" ||
    raw === "fill_in_blank" ||
    raw === "reading_comprehension"
  ) {
    return raw;
  }
  return "unknown";
}

function normalizeResponseMode(
  value: unknown,
  questionType: ItemData["question_type"]
): ItemData["response_mode"] {
  const raw = String(value || "").trim();
  if (
    raw === "choice" ||
    raw === "text" ||
    raw === "speech" ||
    raw === "handwriting" ||
    raw === "upload"
  ) {
    return raw;
  }
  if (
    raw === "single" ||
    raw === "multiple" ||
    raw === "select" ||
    raw === "multiple_choice" ||
    raw === "multiple_select" ||
    raw === "true_false" ||
    raw === "listening" ||
    raw === "listening_comprehension"
  ) {
    return "choice";
  }
  if (
    raw === "speaking" ||
    raw === "speaking_response" ||
    raw === "oral_response" ||
    raw === "read_aloud"
  ) {
    return "speech";
  }
  if (
    questionType === "multiple_choice" ||
    questionType === "multiple_select" ||
    questionType === "true_false" ||
    questionType === "listening_comprehension"
  ) {
    return "choice";
  }
  if (questionType === "speaking_response") {
    return "speech";
  }
  return "text";
}

function normalizeOptions(value: unknown): QuestionOption[] {
  if (!Array.isArray(value)) return [];
  return value.map((opt, i) => {
    const fallbackIndex = OPTION_LABELS[i] || String(i + 1);
    if (typeof opt === "string") {
      return { index: fallbackIndex, text: opt };
    }
    const record = (opt || {}) as Record<string, unknown>;
    return {
      index: String(record.index || record.label || fallbackIndex),
      text:
        typeof record.text === "string"
          ? record.text
          : typeof record.content === "string"
            ? record.content
            : undefined,
      media_id:
        typeof record.media_id === "string" ? record.media_id : undefined,
      answer_behavior:
        typeof record.answer_behavior === "string"
          ? record.answer_behavior
          : undefined,
      modality:
        typeof record.modality === "string" ? record.modality : undefined,
    };
  });
}

function normalizeMedia(value: unknown): MediaAsset[] {
  return Array.isArray(value) ? (value as MediaAsset[]) : [];
}

function normalizeStreamQuestion(
  rawQuestion: Record<string, unknown>,
  eventData: Record<string, unknown>
): ItemData {
  const questionType = normalizeQuestionType(
    rawQuestion.question_type || rawQuestion.type,
    rawQuestion
  );
  return {
    ...rawQuestion,
    question_type: questionType,
    response_mode: normalizeResponseMode(
      rawQuestion.response_mode,
      questionType
    ),
    media: normalizeMedia(rawQuestion.media),
    options: normalizeOptions(rawQuestion.options),
    scene: String(rawQuestion.scene || ""),
    grammar_focus: String(rawQuestion.grammar_focus || ""),
    target_level: String(rawQuestion.target_level || ""),
    question_text: String(rawQuestion.question_text || ""),
    batch_id: eventData.batch_id as string,
    batch_index: eventData.batch_index as number,
    batch_total: eventData.batch_total as number,
    modality:
      typeof rawQuestion.modality === "string"
        ? rawQuestion.modality
        : undefined,
    skill_dimension: eventData.skill_dimension as
      | "vocabulary"
      | "grammar"
      | "reading"
      | "listening"
      | "speaking",
  } as ItemData;
}

function streamRequest<T>(
  url: string,
  method: string,
  body: unknown | undefined,
  onThinking: (step: ThinkingStep) => void,
  resolveOn: string,
  opts?: StreamOpts
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (opts?.signal?.aborted) {
      reject(new Error("Request aborted"));
      return;
    }

    const rawSteps: { agent: string; label: string; output: string }[] = [];
    let resolved = false;

    startSseRequest(
      {
        url,
        method,
        data: body,
        header: { "Content-Type": "application/json" },
      },
      {
        signal: opts?.signal,
        onEvent(eventType, data) {
          if (eventType === "thinking") {
            rawSteps.push({
              agent: (data.agent as string) || "",
              label: (data.label as string) || "",
              output: (data.output as string) || "",
            });
            const steps = toThinkingSteps(rawSteps);
            if (steps.length > 0) {
              onThinking(steps[steps.length - 1]);
            }
          } else if (eventType === resolveOn) {
            resolved = true;
            resolve(data as unknown as T);
            return false;
          } else if (eventType === "error") {
            resolved = true;
            const msg =
              (data.error as string) ||
              (data.message as string) ||
              "Stream error";
            reject(new Error(msg));
            return false;
          }
          return;
        },
        onComplete(err) {
          if (err) {
            resolved = true;
            reject(err);
          } else if (!resolved) {
            reject(
              new Error(
                "Stream ended without expected event — the server closed the connection before sending the expected data. Please retry."
              )
            );
          }
        },
      }
    );
  });
}

// streamQuestion has special logic: the backend sends multiple question
// events (one per skill dimension), each wrapping the real ItemData inside
// a "question" field. We collect them all and return a batch.
export function streamQuestion(
  sessionId: string,
  onThinking: (step: ThinkingStep) => void,
  opts?: StreamOpts
): Promise<{ questions: ItemData[]; batch_id: string }> {
  const requestId = opts?.requestId || "";
  let url = `${BASE_URL}/api/v1/sessions/${encodeURIComponent(sessionId)}/question`;
  if (requestId) {
    url += `?request_id=${encodeURIComponent(requestId)}`;
  }

  return new Promise((resolve, reject) => {
    if (opts?.signal?.aborted) {
      reject(new Error("Request aborted"));
      return;
    }

    const questions: ItemData[] = [];
    let batchId = "";
    const rawSteps: { agent: string; label: string; output: string }[] = [];
    let resolved = false;

    startSseRequest(
      { url, method: "GET", header: { "Content-Type": "application/json" } },
      {
        signal: opts?.signal,
        onEvent(eventType, data) {
          if (eventType === "thinking") {
            rawSteps.push({
              agent: (data.agent as string) || "",
              label: (data.label as string) || "",
              output: (data.output as string) || "",
            });
            const steps = toThinkingSteps(rawSteps);
            if (steps.length > 0) {
              onThinking(steps[steps.length - 1]);
            }
          } else if (eventType === "question") {
            const qData = (data.question as Record<string, unknown>) || {};
            const question = normalizeStreamQuestion(qData, data);
            questions.push(question);
            opts?.onQuestion?.(question);
            batchId = (data.batch_id as string) || batchId;
          } else if (eventType === "error") {
            resolved = true;
            const msg =
              (data.error as string) ||
              (data.message as string) ||
              "Stream error";
            reject(new Error(msg));
            return false;
          }
          return;
        },
        onComplete(err) {
          if (err) {
            resolved = true;
            reject(err);
          } else if (!resolved) {
            if (questions.length === 0) {
              reject(
                new Error(
                  "Stream ended without question data — the backend question generator may have failed. Please retry."
                )
              );
            } else {
              resolved = true;
              resolve({ questions, batch_id: batchId });
            }
          }
        },
      }
    );
  });
}

export function streamSubmitAnswer(
  sessionId: string,
  answer: string,
  onThinking: (step: ThinkingStep) => void,
  opts?: StreamOpts
): Promise<{
  item_id: number;
  is_correct: boolean;
  feedback: string;
  confidence: number;
  accuracy: number;
  auto_stop?: boolean;
  stop_reason?: string;
}> {
  const url = `${BASE_URL}/api/v1/sessions/${encodeURIComponent(sessionId)}/stream_answer`;
  return streamRequest(url, "POST", { answer }, onThinking, "answer", opts);
}

export function batchSubmitAnswer(
  sessionId: string,
  answers: Array<{ question_index: number; answer: string }>,
  onThinking: (step: ThinkingStep) => void,
  opts?: StreamOpts & { submissionId?: string }
): Promise<{
  results: Array<Record<string, unknown>>;
  confidence: number;
  accuracy: number;
  auto_stop?: boolean;
  stop_reason?: string;
}> {
  const url = `${BASE_URL}/api/v1/sessions/${encodeURIComponent(sessionId)}/batch_answer`;
  const body: Record<string, unknown> = { answers };
  if (opts?.submissionId) {
    body.submission_id = opts.submissionId;
  }
  return streamRequest(url, "POST", body, onThinking, "answer", opts);
}

export function streamColdStart(
  sessionId: string,
  onThinking: (step: ThinkingStep) => void,
  opts?: StreamOpts
): Promise<
  | { cold_start: boolean; round: number; label: string; question: string }
  | { cold_start_complete: boolean; initial_vector: unknown }
> {
  const url = `${BASE_URL}/api/v1/sessions/${encodeURIComponent(sessionId)}/cold_start`;
  return streamRequest(url, "GET", undefined, onThinking, "question", opts);
}

export function streamColdStartAnswer(
  sessionId: string,
  answer: string,
  responseTime: number,
  onThinking: (step: ThinkingStep) => void,
  opts?: StreamOpts
): Promise<{
  cold_start_complete: boolean;
  feedback: string;
  observer_output: string;
  grade_output: string;
  initial_vector?: unknown;
}> {
  const url = `${BASE_URL}/api/v1/sessions/${encodeURIComponent(sessionId)}/cold_start_answer`;
  return streamRequest(
    url,
    "POST",
    { answer, response_time: responseTime },
    onThinking,
    "answer",
    opts
  );
}
