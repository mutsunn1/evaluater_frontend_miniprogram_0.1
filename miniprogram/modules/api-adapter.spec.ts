import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock wx.request for non-streaming calls
let mockWxRequest: ReturnType<typeof vi.fn>;

function setupWx(successData?: unknown, statusCode = 200) {
  mockWxRequest = vi
    .fn()
    .mockImplementation((opts: Record<string, unknown>) => {
      const successCb = opts.success as
        | ((res: Record<string, unknown>) => void)
        | undefined;
      const failCb = opts.fail as
        | ((err: Record<string, unknown>) => void)
        | undefined;
      queueMicrotask(() => {
        if (statusCode >= 400 && failCb) {
          failCb({ errMsg: `HTTP ${statusCode}` });
        } else if (successCb) {
          successCb({ statusCode, data: successData ?? {} });
        }
      });
      return { onChunkReceived: vi.fn(), abort: vi.fn() };
    });
  (globalThis as Record<string, unknown>).wx = { request: mockWxRequest };
}

function setupWxFail(errMsg: string) {
  mockWxRequest = vi
    .fn()
    .mockImplementation((opts: Record<string, unknown>) => {
      const failCb = opts.fail as
        | ((err: Record<string, unknown>) => void)
        | undefined;
      queueMicrotask(() => failCb?.({ errMsg }));
      return { onChunkReceived: vi.fn(), abort: vi.fn() };
    });
  (globalThis as Record<string, unknown>).wx = { request: mockWxRequest };
}

// Mock SSE parser: simulate events and stream end
function mockSseParser(
  events: Array<{ type: string; data: Record<string, unknown> }>
) {
  vi.doMock("./sse-parser", () => ({
    startSseRequest(
      _opts: unknown,
      config: {
        onEvent: (
          type: string,
          data: Record<string, unknown>
        ) => boolean | void;
        onComplete?: (err?: Error) => void;
        signal?: { aborted: boolean };
      }
    ) {
      if (config.signal?.aborted) {
        queueMicrotask(() => config.onComplete?.());
        return { abort() {} };
      }
      queueMicrotask(() => {
        for (const ev of events) {
          const result = config.onEvent(ev.type, ev.data);
          if (result === false) break;
        }
        config.onComplete?.();
      });
      return { abort() {} };
    },
  }));
}

describe("api-adapter — non-streaming", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("createSession calls POST with user_id query param", async () => {
    setupWx({ session_id: "s1", user_id: "u1", hsk_level: 3 });
    const { createSession } = await import("./api-adapter");
    const result = await createSession("u1");
    expect(result).toEqual({ session_id: "s1", user_id: "u1", hsk_level: 3 });
    const opts = mockWxRequest.mock.calls[0][0];
    expect(opts.url).toContain("/api/v1/sessions");
    expect(opts.url).toContain("user_id=u1");
    expect(opts.method).toBe("POST");
  });

  it("endSession calls POST to correct endpoint", async () => {
    setupWx({ session_id: "s1", summary: { total: 5 } });
    const { endSession } = await import("./api-adapter");
    const result = await endSession("s1");
    expect(result).toEqual({ session_id: "s1", summary: { total: 5 } });
    const opts = mockWxRequest.mock.calls[0][0];
    expect(opts.url).toContain("/api/v1/sessions/s1/end");
    expect(opts.method).toBe("POST");
  });

  it("getConfidence calls GET to correct endpoint", async () => {
    setupWx({
      accuracy: 0.8,
      confidence: 0.9,
      sample_size: 10,
      should_stop: false,
    });
    const { getConfidence } = await import("./api-adapter");
    const result = await getConfidence("s1");
    expect(result.accuracy).toBe(0.8);
    const opts = mockWxRequest.mock.calls[0][0];
    expect(opts.url).toContain("/api/v1/sessions/s1/confidence");
    expect(opts.method).toBe("GET");
  });

  it("getUserProfile calls GET with user_id", async () => {
    setupWx({ user_id: "u1", hsk_level: 4, skill_levels: {} });
    const { getUserProfile } = await import("./api-adapter");
    const result = await getUserProfile("u1");
    expect(result.user_id).toBe("u1");
    const opts = mockWxRequest.mock.calls[0][0];
    expect(opts.url).toContain("/api/v1/users/u1/profile");
  });

  it("throws on HTTP error status", async () => {
    setupWx({ detail: "not found" }, 404);
    const { getConfidence } = await import("./api-adapter");
    await expect(getConfidence("s1")).rejects.toThrow(/404/);
  });

  it("throws on network failure", async () => {
    setupWxFail("network error");
    const { createSession } = await import("./api-adapter");
    await expect(createSession("u1")).rejects.toThrow(/network error/);
  });
});

describe("api-adapter — streaming", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("streamQuestion collects multiple question events", async () => {
    mockSseParser([
      { type: "thinking", data: { agent: "test", output: "thinking..." } },
      {
        type: "question",
        data: {
          question: {
            question_type: "multiple_choice",
            question_text: "Q1",
            scene: "",
            grammar_focus: "",
            target_level: "",
          },
          batch_id: "b1",
          batch_index: 0,
          skill_dimension: "vocabulary",
        },
      },
      {
        type: "question",
        data: {
          question: {
            question_type: "true_false",
            question_text: "Q2",
            scene: "",
            grammar_focus: "",
            target_level: "",
          },
          batch_id: "b1",
          batch_index: 1,
          skill_dimension: "reading",
        },
      },
    ]);
    const { streamQuestion } = await import("./api-adapter");
    const onThinking = vi.fn();
    const result = await streamQuestion("s1", onThinking, {
      requestId: "req-123",
    });
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].question_text).toBe("Q1");
    expect(result.questions[1].question_text).toBe("Q2");
    expect(onThinking).toHaveBeenCalledTimes(1);
  });

  it("streamQuestion normalizes legacy response mode aliases and missing media", async () => {
    const onQuestion = vi.fn();
    mockSseParser([
      {
        type: "question",
        data: {
          question: {
            question_type: "multiple_choice",
            response_mode: "single",
            question_text: "Q1",
            scene: "",
            grammar_focus: "",
            target_level: "",
          },
          batch_id: "b1",
          batch_index: 0,
          skill_dimension: "grammar",
        },
      },
    ]);

    const { streamQuestion } = await import("./api-adapter");
    const result = await streamQuestion("s1", vi.fn(), { onQuestion });

    expect(result.questions[0].response_mode).toBe("choice");
    expect(result.questions[0].media).toEqual([]);
    expect(onQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ response_mode: "choice", media: [] })
    );
  });

  it('streamQuestion normalizes backend question_type "reading" with options to multiple_choice', async () => {
    mockSseParser([
      {
        type: "question",
        data: {
          question: {
            question_type: "reading",
            response_mode: "choice",
            question_text: "阅读材料\n\n问题：正确答案是什么？",
            options: ["选项一", "选项二", "选项三", "选项四"],
            scene: "学习",
            grammar_focus: "学习",
            target_level: "HSK5",
          },
          batch_id: "b1",
          batch_index: 0,
          skill_dimension: "reading",
        },
      },
    ]);

    const { streamQuestion } = await import("./api-adapter");
    const result = await streamQuestion("s1", vi.fn());

    expect(result.questions[0].question_type).toBe("multiple_choice");
    expect(result.questions[0].options).toEqual([
      { index: "A", text: "选项一" },
      { index: "B", text: "选项二" },
      { index: "C", text: "选项三" },
      { index: "D", text: "选项四" },
    ]);
  });

  it("streamQuestion rejects when stream ends without question data", async () => {
    mockSseParser([
      { type: "thinking", data: { agent: "test", output: "just thinking..." } },
    ]);
    const { streamQuestion } = await import("./api-adapter");
    await expect(streamQuestion("s1", vi.fn())).rejects.toThrow(
      /without question/
    );
  });

  it("batchSubmitAnswer resolves with answer event", async () => {
    mockSseParser([
      {
        type: "answer",
        data: {
          results: [{ item_id: 1 }],
          confidence: 0.9,
          accuracy: 0.85,
          auto_stop: false,
        },
      },
    ]);
    const { batchSubmitAnswer } = await import("./api-adapter");
    const onThinking = vi.fn();
    const result = await batchSubmitAnswer(
      "s1",
      [{ question_index: 0, answer: "x" }],
      onThinking,
      { submissionId: "sub-1" }
    );
    expect(result.results).toHaveLength(1);
  });

  it("streamSubmitAnswer resolves with answer event", async () => {
    mockSseParser([
      {
        type: "answer",
        data: {
          item_id: 1,
          is_correct: true,
          feedback: "good",
          confidence: 0.9,
          accuracy: 0.8,
        },
      },
    ]);
    const { streamSubmitAnswer } = await import("./api-adapter");
    const onThinking = vi.fn();
    const result = await streamSubmitAnswer("s1", "answer text", onThinking);
    expect(result.is_correct).toBe(true);
  });

  it("streamColdStart resolves with question event", async () => {
    mockSseParser([
      {
        type: "question",
        data: {
          cold_start: true,
          round: 1,
          label: "intro",
          question: "Tell me...",
        },
      },
    ]);
    const { streamColdStart } = await import("./api-adapter");
    const onThinking = vi.fn();
    const result = await streamColdStart("s1", onThinking);
    expect(result.question).toBe("Tell me...");
  });

  it("streamColdStartAnswer resolves with answer event", async () => {
    mockSseParser([
      {
        type: "answer",
        data: { cold_start_complete: false, feedback: "nice" },
      },
    ]);
    const { streamColdStartAnswer } = await import("./api-adapter");
    const onThinking = vi.fn();
    const result = await streamColdStartAnswer(
      "s1",
      "cs answer",
      2500,
      onThinking
    );
    expect(result.feedback).toBe("nice");
  });

  it("streaming rejects on error event", async () => {
    mockSseParser([{ type: "error", data: { message: "backend error" } }]);
    const { streamQuestion } = await import("./api-adapter");
    await expect(streamQuestion("s1", vi.fn())).rejects.toThrow(
      /backend error/
    );
  });

  it("streaming rejects on stream complete with error", async () => {
    vi.doMock("./sse-parser", () => ({
      startSseRequest(
        _opts: unknown,
        config: { onComplete?: (err?: Error) => void }
      ) {
        queueMicrotask(() => config.onComplete?.(new Error("connection lost")));
        return { abort() {} };
      },
    }));
    const { streamQuestion } = await import("./api-adapter");
    await expect(streamQuestion("s1", vi.fn())).rejects.toThrow(
      /connection lost/
    );
  });

  it("abort signal rejects the promise", async () => {
    vi.doMock("./sse-parser", () => ({
      startSseRequest(
        _opts: unknown,
        config: {
          onComplete?: (err?: Error) => void;
          signal?: { aborted: boolean };
        }
      ) {
        // Signal is already aborted — resolve immediately
        queueMicrotask(() => config.onComplete?.());
        return { abort() {} };
      },
    }));
    const { streamQuestion } = await import("./api-adapter");
    await expect(
      streamQuestion("s1", vi.fn(), { signal: { aborted: true } })
    ).rejects.toThrow(/aborted/);
  });
});
