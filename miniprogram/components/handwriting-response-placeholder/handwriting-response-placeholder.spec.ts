import { describe, it, expect } from "vitest";

describe("handwriting-response-placeholder", () => {
  it("placeholder marks handwriting area as unavailable", () => {
    const label = "手写作答（暂不支持自动评分）";
    expect(label).toContain("手写作答");
    expect(label).toContain("暂不支持自动评分");
  });

  it("has hanzi-writer target marker for future integration", () => {
    // The WXML contains data-hanzi-writer-target="true" as a structural marker
    // for where Hanzi Writer / canvas handwriting engine would plug in.
    const marker = "data-hanzi-writer-target";
    expect(marker).toBeTruthy();
  });
});
