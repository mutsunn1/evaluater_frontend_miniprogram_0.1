import { describe, it, expect } from "vitest";
import { resolveResponseMode, buildBatchAnswerPayload } from "./response-utils";
import type { ItemData } from "../types";

function makeItem(overrides: Partial<ItemData> = {}): ItemData {
  return {
    question_type: "fill_in_blank",
    scene: "",
    grammar_focus: "",
    target_level: "",
    question_text: "",
    ...overrides,
  };
}

// ================================================================
//  resolveResponseMode
// ================================================================

describe("resolveResponseMode", () => {
  it("legacy multiple_choice without response_mode → choice", () => {
    expect(
      resolveResponseMode(makeItem({ question_type: "multiple_choice" }))
    ).toBe("choice");
  });

  it("legacy multiple_select without response_mode → choice", () => {
    expect(
      resolveResponseMode(makeItem({ question_type: "multiple_select" }))
    ).toBe("choice");
  });

  it("legacy true_false without response_mode → choice", () => {
    expect(resolveResponseMode(makeItem({ question_type: "true_false" }))).toBe(
      "choice"
    );
  });

  it("legacy fill_in_blank without response_mode → text", () => {
    expect(
      resolveResponseMode(makeItem({ question_type: "fill_in_blank" }))
    ).toBe("text");
  });

  it("legacy reading_comprehension without response_mode → text", () => {
    expect(
      resolveResponseMode(makeItem({ question_type: "reading_comprehension" }))
    ).toBe("text");
  });

  it('explicit response_mode "speech" takes precedence', () => {
    expect(
      resolveResponseMode(
        makeItem({
          question_type: "fill_in_blank",
          response_mode: "speech",
        })
      )
    ).toBe("speech");
  });

  it('explicit response_mode "handwriting" takes precedence', () => {
    expect(
      resolveResponseMode(
        makeItem({
          question_type: "multiple_choice",
          response_mode: "handwriting",
        })
      )
    ).toBe("handwriting");
  });

  it('explicit response_mode "upload" takes precedence', () => {
    expect(
      resolveResponseMode(
        makeItem({
          question_type: "true_false",
          response_mode: "upload",
        })
      )
    ).toBe("upload");
  });

  it('explicit response_mode "choice" takes precedence', () => {
    expect(
      resolveResponseMode(
        makeItem({
          question_type: "fill_in_blank",
          response_mode: "choice",
        })
      )
    ).toBe("choice");
  });

  it('explicit response_mode "text" takes precedence', () => {
    expect(
      resolveResponseMode(
        makeItem({
          question_type: "multiple_choice",
          response_mode: "text",
        })
      )
    ).toBe("text");
  });
});

// ================================================================
//  buildBatchAnswerPayload
// ================================================================

describe("buildBatchAnswerPayload", () => {
  const qs = [
    makeItem({ question_type: "multiple_choice", response_mode: "choice" }),
    makeItem({ question_type: "fill_in_blank", response_mode: "text" }),
    makeItem({ question_type: "fill_in_blank", response_mode: "speech" }),
    makeItem({ question_type: "fill_in_blank", response_mode: "handwriting" }),
    makeItem({ question_type: "fill_in_blank", response_mode: "upload" }),
  ];

  const answers: Record<number, string> = {
    0: "A",
    1: "我喜欢学习中文",
    2: "",
    3: "",
    4: "",
  };

  it("choice mode uses answer text", () => {
    const payload = buildBatchAnswerPayload(qs, answers);
    expect(payload[0]).toEqual({ question_index: 0, answer: "A" });
  });

  it("text mode uses answer text", () => {
    const payload = buildBatchAnswerPayload(qs, answers);
    expect(payload[1]).toEqual({
      question_index: 1,
      answer: "我喜欢学习中文",
      response_mode: "text",
      response_asset_ids: [],
    });
  });

  it("speech placeholder submits empty answer with response_mode and empty asset_ids", () => {
    const payload = buildBatchAnswerPayload(qs, answers);
    expect(payload[2]).toEqual({
      question_index: 2,
      answer: "",
      response_mode: "speech",
      response_asset_ids: [],
    });
  });

  it("handwriting placeholder submits empty answer with response_mode and empty asset_ids", () => {
    const payload = buildBatchAnswerPayload(qs, answers);
    expect(payload[3]).toEqual({
      question_index: 3,
      answer: "",
      response_mode: "handwriting",
      response_asset_ids: [],
    });
  });

  it("upload placeholder submits empty answer with response_mode and empty asset_ids", () => {
    const payload = buildBatchAnswerPayload(qs, answers);
    expect(payload[4]).toEqual({
      question_index: 4,
      answer: "",
      response_mode: "upload",
      response_asset_ids: [],
    });
  });

  it("empty batch returns empty array", () => {
    expect(buildBatchAnswerPayload([], {})).toEqual([]);
  });

  it("legacy multiple_choice (no response_mode) inferred as choice, uses answer", () => {
    const legacyQs = [makeItem({ question_type: "multiple_choice" })];
    const payload = buildBatchAnswerPayload(legacyQs, { 0: "B" });
    expect(payload[0]).toEqual({ question_index: 0, answer: "B" });
  });

  it("legacy true_false (no response_mode) inferred as choice, uses answer", () => {
    const legacyQs = [makeItem({ question_type: "true_false" })];
    const payload = buildBatchAnswerPayload(legacyQs, { 0: "false" });
    expect(payload[0]).toEqual({ question_index: 0, answer: "false" });
  });

  it("legacy fill_in_blank (no response_mode) inferred as text, includes answer", () => {
    const legacyQs = [makeItem({ question_type: "fill_in_blank" })];
    const payload = buildBatchAnswerPayload(legacyQs, { 0: "我的答案" });
    expect(payload[0]).toEqual({
      question_index: 0,
      answer: "我的答案",
      response_mode: "text",
      response_asset_ids: [],
    });
  });

  // Regression: batch_index mismatch — answers keyed by local qi, not batch_index
  it("uses local array index as question_index regardless of batch_index value", () => {
    const qs = [
      makeItem({ question_type: "multiple_choice", batch_index: 0 }),
      makeItem({ question_type: "multiple_choice", batch_index: 1 }),
      makeItem({ question_type: "multiple_choice", batch_index: 2 }),
    ];
    const answers: Record<number, string> = { 0: "A", 1: "B", 2: "C" };
    const payload = buildBatchAnswerPayload(qs, answers);
    expect(payload[0].question_index).toBe(0);
    expect(payload[1].question_index).toBe(1);
    expect(payload[2].question_index).toBe(2);
  });

  it("answers keyed by local index map correctly even with non-zero-based batch_index", () => {
    const qs = [
      makeItem({ question_type: "multiple_choice", batch_index: 5 }),
      makeItem({ question_type: "multiple_choice", batch_index: 6 }),
    ];
    const answers: Record<number, string> = { 0: "X", 1: "Y" };
    const payload = buildBatchAnswerPayload(qs, answers);
    expect(payload[0]).toEqual({ question_index: 0, answer: "X" });
    expect(payload[1]).toEqual({ question_index: 1, answer: "Y" });
  });
});
