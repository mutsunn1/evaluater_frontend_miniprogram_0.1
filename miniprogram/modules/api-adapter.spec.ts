import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

  it("createSession URL 携带 locale query 参数", async () => {
    setupWx({ session_id: "s1", user_id: "u1", hsk_level: 3 });
    const { createSession } = await import("./api-adapter");
    await createSession("u1");
    const opts = mockWxRequest.mock.calls[0][0];
    expect(opts.url).toContain("locale=en");
  });

  it("createSession calls POST with user_id query param", async () => {
    setupWx({ session_id: "s1", user_id: "u1", hsk_level: 3 });
    const { createSession } = await import("./api-adapter");
    const result = await createSession("u1");
    expect(result).toEqual({ session_id: "s1", user_id: "u1", hsk_level: 3 });
    const opts = mockWxRequest.mock.calls[0][0];
    expect(opts.url).toContain("/api/v1/sessions");
    expect(opts.url).toContain("user_id=u1");
    expect(opts.url).toContain("locale=en");
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

  it("streamQuestion URL 携带 locale query 参数", async () => {
    let capturedUrl = "";
    vi.doMock("./sse-parser", () => ({
      startSseRequest(
        opts: { url: string },
        config: {
          onEvent?: (
            type: string,
            data: Record<string, unknown>
          ) => boolean | void;
          onComplete?: () => void;
        }
      ) {
        capturedUrl = opts.url;
        queueMicrotask(() => {
          config.onEvent?.("question", {
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
          });
          config.onComplete?.();
        });
        return { abort() {} };
      },
    }));
    const { streamQuestion } = await import("./api-adapter");
    await streamQuestion("s1", vi.fn());
    expect(capturedUrl).toContain("locale=en");
  });

  it("streamQuestion URL 携带 locale 和 request_id 参数", async () => {
    let capturedUrl = "";
    vi.doMock("./sse-parser", () => ({
      startSseRequest(
        opts: { url: string },
        config: {
          onEvent?: (
            type: string,
            data: Record<string, unknown>
          ) => boolean | void;
          onComplete?: () => void;
        }
      ) {
        capturedUrl = opts.url;
        queueMicrotask(() => {
          config.onEvent?.("question", {
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
          });
          config.onComplete?.();
        });
        return { abort() {} };
      },
    }));
    const { streamQuestion } = await import("./api-adapter");
    await streamQuestion("s1", vi.fn(), { requestId: "req-123" });
    expect(capturedUrl).toContain("request_id=req-123");
    expect(capturedUrl).toContain("locale=en");
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
          skill_dimension: "listening",
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

  it("streamQuestion normalizes relative media URLs to absolute URLs", async () => {
    mockSseParser([
      {
        type: "question",
        data: {
          question: {
            question_type: "listening_comprehension",
            question_text: "听音频选择",
            scene: "",
            grammar_focus: "",
            target_level: "",
            media: [
              {
                id: "tts_1",
                type: "audio",
                role: "prompt",
                source: "generated",
                url: "/api/v1/media/assets/tts_1/content",
              },
            ],
          },
          batch_id: "b1",
          batch_index: 0,
          skill_dimension: "listening",
        },
      },
    ]);

    const { streamQuestion } = await import("./api-adapter");
    const result = await streamQuestion("s1", vi.fn());

    expect(result.questions[0].media?.[0].url).toBe(
      "https://evalapi.mutsum1.xyz/api/v1/media/assets/tts_1/content"
    );
  });

  it("normalizes options with nested media.media_id", async () => {
    mockSseParser([
      {
        type: "question",
        data: {
          question: {
            question_type: "multiple_choice",
            question_text: "选图",
            options: [
              { text: "苹果", media: { media_id: "openmoji_apple" } },
              { text: "香蕉", media: { media_id: "openmoji_banana" } },
            ],
            scene: "",
            grammar_focus: "",
            target_level: "",
          },
          batch_id: "b1",
          batch_index: 0,
          skill_dimension: "vocabulary",
        },
      },
    ]);

    const { streamQuestion } = await import("./api-adapter");
    const result = await streamQuestion("s1", vi.fn());

    expect(result.questions[0].options).toEqual([
      { index: "A", text: "苹果", media_id: "openmoji_apple" },
      { index: "B", text: "香蕉", media_id: "openmoji_banana" },
    ]);
  });
  it("streamQuestion preserves already absolute media URLs", async () => {
    mockSseParser([
      {
        type: "question",
        data: {
          question: {
            question_type: "listening_comprehension",
            question_text: "听音频选择",
            scene: "",
            grammar_focus: "",
            target_level: "",
            media: [
              {
                id: "aud1",
                type: "audio",
                role: "prompt",
                source: "prepared",
                url: "https://cdn.example.com/audio.mp3",
              },
            ],
          },
          batch_id: "b1",
          batch_index: 0,
          skill_dimension: "listening",
        },
      },
    ]);

    const { streamQuestion } = await import("./api-adapter");
    const result = await streamQuestion("s1", vi.fn());

    expect(result.questions[0].media?.[0].url).toBe(
      "https://cdn.example.com/audio.mp3"
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

  it("streamQuestion preserves listening skip option metadata", async () => {
    mockSseParser([
      {
        type: "question",
        data: {
          question: {
            question_type: "listening_comprehension",
            question_text: "听音频，选择你听到的词。",
            modality: "listening",
            options: [
              { index: "A", text: "苹果" },
              {
                index: "Z",
                text: "现在先不做听力题",
                answer_behavior: "skip_modality",
                modality: "listening",
              },
            ],
            scene: "听力",
            grammar_focus: "水果词汇",
            target_level: "HSK2",
          },
          batch_id: "b1",
          batch_index: 0,
          skill_dimension: "listening",
        },
      },
    ]);

    const { streamQuestion } = await import("./api-adapter");
    const result = await streamQuestion("s1", vi.fn());

    expect(result.questions[0].question_type).toBe("listening_comprehension");
    expect(result.questions[0].response_mode).toBe("choice");
    expect(result.questions[0].skill_dimension).toBe("listening");
    expect(result.questions[0].modality).toBe("listening");
    expect(result.questions[0].options?.[1]).toEqual({
      index: "Z",
      text: "现在先不做听力题",
      answer_behavior: "skip_modality",
      modality: "listening",
      media_id: undefined,
    });
  });

  it("streamQuestion normalizes short_answer to fill_in_blank to avoid unknown fallback", async () => {
    mockSseParser([
      {
        type: "question",
        data: {
          question: {
            question_type: "short_answer",
            question_text: "请简述你的答案。",
            scene: "",
            grammar_focus: "",
            target_level: "",
          },
          batch_id: "b1",
          batch_index: 0,
          skill_dimension: "reading",
        },
      },
    ]);

    const { streamQuestion } = await import("./api-adapter");
    const result = await streamQuestion("s1", vi.fn());

    expect(result.questions[0].question_type).not.toBe("unknown");
    expect(result.questions[0].question_type).toBe("fill_in_blank");
  });

  it("streamQuestion normalizes image_description to speaking_response", async () => {
    mockSseParser([
      {
        type: "question",
        data: {
          question: {
            question_type: "image_description",
            question_text: "请描述图片内容。",
            scene: "",
            grammar_focus: "",
            target_level: "",
          },
          batch_id: "b1",
          batch_index: 0,
          skill_dimension: "speaking",
        },
      },
    ]);

    const { streamQuestion } = await import("./api-adapter");
    const result = await streamQuestion("s1", vi.fn());

    expect(result.questions[0].question_type).toBe("speaking_response");
    expect(result.questions[0].response_mode).toBe("speech");
  });
  it('streamQuestion normalizes backend question_type "short_reading" with options to multiple_choice', async () => {
    mockSseParser([
      {
        type: "question",
        data: {
          question: {
            question_type: "short_reading",
            question_text: "短文\n\n问题：正确答案是？",
            options: ["选项一", "选项二", "选项三", "选项四"],
            scene: "",
            grammar_focus: "",
            target_level: "",
          },
          batch_id: "b1",
          batch_index: 0,
          skill_dimension: "reading",
        },
      },
    ]);

    const { streamQuestion } = await import("./api-adapter");
    const result = await streamQuestion("s1", vi.fn());

    expect(result.questions[0].question_type).not.toBe("unknown");
    expect(result.questions[0].question_type).toBe("multiple_choice");
  });

  it('streamQuestion normalizes backend question_type "short_reading" without options to reading_comprehension', async () => {
    mockSseParser([
      {
        type: "question",
        data: {
          question: {
            question_type: "short_reading",
            question_text: "短文\n\n问题：请简述答案。",
            scene: "",
            grammar_focus: "",
            target_level: "",
          },
          batch_id: "b1",
          batch_index: 0,
          skill_dimension: "reading",
        },
      },
    ]);

    const { streamQuestion } = await import("./api-adapter");
    const result = await streamQuestion("s1", vi.fn());

    expect(result.questions[0].question_type).not.toBe("unknown");
    expect(result.questions[0].question_type).toBe("reading_comprehension");
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

  it("streamSubmitAnswer URL 携带 locale query 参数", async () => {
    let capturedUrl = "";
    vi.doMock("./sse-parser", () => ({
      startSseRequest(
        opts: { url: string },
        config: {
          onEvent?: (
            type: string,
            data: Record<string, unknown>
          ) => boolean | void;
          onComplete?: () => void;
        }
      ) {
        capturedUrl = opts.url;
        queueMicrotask(() => {
          config.onEvent?.("answer", {
            item_id: 1,
            is_correct: true,
            feedback: "good",
            confidence: 0.9,
            accuracy: 0.8,
          });
          config.onComplete?.();
        });
        return { abort() {} };
      },
    }));
    const { streamSubmitAnswer } = await import("./api-adapter");
    await streamSubmitAnswer("s1", "A", vi.fn());
    expect(capturedUrl).toContain("locale=en");
  });

  it("batchSubmitAnswer URL 携带 locale query 参数", async () => {
    let capturedUrl = "";
    vi.doMock("./sse-parser", () => ({
      startSseRequest(
        opts: { url: string },
        config: {
          onEvent?: (
            type: string,
            data: Record<string, unknown>
          ) => boolean | void;
          onComplete?: () => void;
        }
      ) {
        capturedUrl = opts.url;
        queueMicrotask(() => {
          config.onEvent?.("answer", {
            results: [{ item_id: 1 }],
            confidence: 0.9,
            accuracy: 0.85,
            auto_stop: false,
          });
          config.onComplete?.();
        });
        return { abort() {} };
      },
    }));
    const { batchSubmitAnswer } = await import("./api-adapter");
    await batchSubmitAnswer(
      "s1",
      [{ question_index: 0, answer: "A" }],
      vi.fn()
    );
    expect(capturedUrl).toContain("locale=en");
  });

  it("streamColdStart URL 携带 locale query 参数", async () => {
    let capturedUrl = "";
    vi.doMock("./sse-parser", () => ({
      startSseRequest(
        opts: { url: string },
        config: {
          onEvent?: (
            type: string,
            data: Record<string, unknown>
          ) => boolean | void;
          onComplete?: () => void;
        }
      ) {
        capturedUrl = opts.url;
        queueMicrotask(() => {
          config.onEvent?.("question", {
            cold_start: true,
            round: 1,
            label: "intro",
            question: "Tell me...",
          });
          config.onComplete?.();
        });
        return { abort() {} };
      },
    }));
    const { streamColdStart } = await import("./api-adapter");
    await streamColdStart("s1", vi.fn());
    expect(capturedUrl).toContain("locale=en");
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

  it("streamQuestion falls back to multiple_choice when question_type is missing but response_mode is choice", async () => {
    mockSseParser([
      {
        type: "question",
        data: {
          question: {
            response_mode: "choice",
            question_text: "请选择语法正确的句子。",
            options: ["A. 我把作业做完了。", "B. 我做完把作业了。"],
            scene: "选择语法正确的句子",
            grammar_focus: "把字句结构",
            target_level: "HSK4",
          },
          batch_id: "b1",
          batch_index: 0,
          skill_dimension: "grammar",
        },
      },
    ]);

    const { streamQuestion } = await import("./api-adapter");
    const result = await streamQuestion("s1", vi.fn());

    expect(result.questions[0].question_type).toBe("multiple_choice");
    expect(result.questions[0].response_mode).toBe("choice");
  });

  it("streamQuestion normalizes question_type casing and whitespace", async () => {
    mockSseParser([
      {
        type: "question",
        data: {
          question: {
            question_type: "  Multiple_Choice  ",
            question_text: "Q",
            scene: "",
            grammar_focus: "",
            target_level: "",
          },
          batch_id: "b1",
          batch_index: 0,
          skill_dimension: "vocabulary",
        },
      },
    ]);

    const { streamQuestion } = await import("./api-adapter");
    const result = await streamQuestion("s1", vi.fn());

    expect(result.questions[0].question_type).toBe("multiple_choice");
  });

  it("streamQuestion unwraps event_type/event_data wrapper inside question field", async () => {
    mockSseParser([
      {
        type: "question",
        data: {
          question: {
            event_type: "question",
            event_data: {
              question_type: "multiple_choice",
              question_text: "wrapped",
              options: ["A", "B"],
              scene: "s",
              grammar_focus: "g",
              target_level: "HSK3",
            },
          },
          batch_id: "b1",
          batch_index: 0,
          skill_dimension: "grammar",
        },
      },
    ]);

    const { streamQuestion } = await import("./api-adapter");
    const result = await streamQuestion("s1", vi.fn());

    expect(result.questions[0].question_type).toBe("multiple_choice");
    expect(result.questions[0].question_text).toBe("wrapped");
    expect(result.questions[0].options).toHaveLength(2);
  });
});
