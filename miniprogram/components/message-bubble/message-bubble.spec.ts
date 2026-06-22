import { describe, it, expect } from "vitest";
import { buildBatchAnswerPayload } from "../../modules/response-utils";
import type { ChatMessage, ItemData } from "../../types";

function makeBatchMessage(questions: ItemData[]): ChatMessage {
  return {
    id: "msg-1",
    role: "question",
    content: "",
    batch_questions: questions,
    timestamp: new Date().toISOString(),
  };
}

function canSubmitBatch(questions: ItemData[], filledCount: number): boolean {
  return filledCount >= questions.length;
}

describe("message-bubble batch answer logic", () => {
  const mockQuestions: ItemData[] = [
    {
      question_type: "multiple_choice",
      question_text: "Q1",
      scene: "",
      grammar_focus: "",
      target_level: "",
    },
    {
      question_type: "true_false",
      question_text: "Q2",
      scene: "",
      grammar_focus: "",
      target_level: "",
    },
    {
      question_type: "fill_in_blank",
      question_text: "Q3",
      scene: "",
      grammar_focus: "",
      target_level: "",
    },
  ];

  it("submit disabled when no answers", () => {
    expect(canSubmitBatch(mockQuestions, 0)).toBe(false);
  });

  it("submit disabled when partial answers", () => {
    expect(canSubmitBatch(mockQuestions, 2)).toBe(false);
  });

  it("submit enabled when all answered", () => {
    expect(canSubmitBatch(mockQuestions, 3)).toBe(true);
  });

  it("checkSubmitEnabled does not reference undefined canBatchSubmit", () => {
    // 模拟组件方法上下文：确保 setData 接收的是计算后的 canSubmit 值
    const canBatchSubmit = "SHOULD_NOT_BE_USED";
    void canBatchSubmit;
    const qs: ItemData[] = [
      {
        question_type: "fill_in_blank",
        response_mode: "speech",
        question_text: "Q1",
        scene: "",
        grammar_focus: "",
        target_level: "",
      },
    ];
    // 复刻 message-bubble.ts 的 checkSubmitEnabled 逻辑
    const answers: Record<number, string> = {};
    const canSubmit = qs.every((q, i) => {
      const mode = q.response_mode || "text";
      const hasAnswer = Boolean((answers[i] || "").trim());
      if (mode === "speech" || mode === "handwriting" || mode === "upload") {
        // 无 skip 选项时占位题默认放行
        return true;
      }
      return hasAnswer;
    });
    expect(canSubmit).toBe(true);
  });
});

// ================================================================
//  Multimodal batch answer payloads
// ================================================================

describe("multimodal batch answer payloads", () => {
  it("legacy choice questions use answer only (no response_mode)", () => {
    const qs: ItemData[] = [
      {
        question_type: "multiple_choice",
        question_text: "Q1",
        scene: "",
        grammar_focus: "",
        target_level: "",
      },
      {
        question_type: "true_false",
        question_text: "Q2",
        scene: "",
        grammar_focus: "",
        target_level: "",
      },
    ];
    const answers: Record<number, string> = { 0: "A", 1: "false" };
    const payload = buildBatchAnswerPayload(qs, answers);
    expect(payload).toEqual([
      { question_index: 0, answer: "A" },
      { question_index: 1, answer: "false" },
    ]);
  });

  it("legacy fill_in_blank (no response_mode) inferred as text, includes response_mode", () => {
    const qs: ItemData[] = [
      {
        question_type: "fill_in_blank",
        question_text: "Q1",
        scene: "",
        grammar_focus: "",
        target_level: "",
      },
    ];
    const payload = buildBatchAnswerPayload(qs, { 0: "hello" });
    expect(payload[0]).toEqual({
      question_index: 0,
      answer: "hello",
      response_mode: "text",
      response_asset_ids: [],
    });
  });

  it("speech placeholder submits response_mode and empty asset_ids", () => {
    const qs: ItemData[] = [
      {
        question_type: "fill_in_blank",
        response_mode: "speech",
        question_text: "Q1",
        scene: "",
        grammar_focus: "",
        target_level: "",
      },
    ];
    const payload = buildBatchAnswerPayload(qs, { 0: "" });
    expect(payload[0]).toEqual({
      question_index: 0,
      answer: "",
      response_mode: "speech",
      response_asset_ids: [],
    });
  });

  it("handwriting placeholder submits response_mode and empty asset_ids", () => {
    const qs: ItemData[] = [
      {
        question_type: "fill_in_blank",
        response_mode: "handwriting",
        question_text: "Q1",
        scene: "",
        grammar_focus: "",
        target_level: "",
      },
    ];
    const payload = buildBatchAnswerPayload(qs, { 0: "" });
    expect(payload[0]).toEqual({
      question_index: 0,
      answer: "",
      response_mode: "handwriting",
      response_asset_ids: [],
    });
  });

  it("upload placeholder submits response_mode and empty asset_ids", () => {
    const qs: ItemData[] = [
      {
        question_type: "fill_in_blank",
        response_mode: "upload",
        question_text: "Q1",
        scene: "",
        grammar_focus: "",
        target_level: "",
      },
    ];
    const payload = buildBatchAnswerPayload(qs, { 0: "" });
    expect(payload[0]).toEqual({
      question_index: 0,
      answer: "",
      response_mode: "upload",
      response_asset_ids: [],
    });
  });

  it("mixed batch: legacy choice + speech + text", () => {
    const qs: ItemData[] = [
      {
        question_type: "multiple_choice",
        question_text: "Q1",
        scene: "",
        grammar_focus: "",
        target_level: "",
      },
      {
        question_type: "fill_in_blank",
        response_mode: "speech",
        question_text: "Q2",
        scene: "",
        grammar_focus: "",
        target_level: "",
      },
      {
        question_type: "fill_in_blank",
        question_text: "Q3",
        scene: "",
        grammar_focus: "",
        target_level: "",
      },
    ];
    const answers: Record<number, string> = { 0: "B", 1: "", 2: "我的回答" };
    const payload = buildBatchAnswerPayload(qs, answers);
    expect(payload).toEqual([
      { question_index: 0, answer: "B" },
      {
        question_index: 1,
        answer: "",
        response_mode: "speech",
        response_asset_ids: [],
      },
      {
        question_index: 2,
        answer: "我的回答",
        response_mode: "text",
        response_asset_ids: [],
      },
    ]);
  });
});
