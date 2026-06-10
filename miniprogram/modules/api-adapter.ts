import { startSseRequest } from "./sse-parser";
import { toThinkingSteps } from "./session-utils";
import type {
  ItemData,
  ThinkingStep,
  ConfidenceStats,
  UserProfileData,
} from "../types";

const BASE_URL = "https://evalapi.mutsum1.xyz";

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

// ---- Streaming helper ----

interface StreamOpts {
  signal?: { aborted: boolean };
  requestId?: string;
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
            questions.push({
              ...qData,
              batch_id: data.batch_id as string,
              batch_index: data.batch_index as number,
              batch_total: data.batch_total as number,
              skill_dimension: data.skill_dimension as
                | "vocabulary"
                | "grammar"
                | "reading",
            } as ItemData);
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
