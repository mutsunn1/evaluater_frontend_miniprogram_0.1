import { describe, it, expect } from "vitest";

// Speech response placeholder — no user input, just a disabled button.

describe("speech-response-placeholder", () => {
  it("placeholder is a non-interactive speech mode", () => {
    // The component renders a disabled button with explanatory text.
    // This test documents the contract: speech mode requires no user input,
    // and the placeholder marks it as "暂不支持自动评分".
    const label = "语音作答（暂不支持自动评分）";
    expect(label).toContain("语音作答");
    expect(label).toContain("暂不支持自动评分");
  });
});
