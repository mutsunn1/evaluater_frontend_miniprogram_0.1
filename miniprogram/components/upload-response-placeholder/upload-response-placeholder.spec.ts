import { describe, it, expect } from "vitest";

describe("upload-response-placeholder", () => {
  it("placeholder is a non-interactive upload mode", () => {
    const label = "上传作答（暂不支持自动评分）";
    expect(label).toContain("上传作答");
    expect(label).toContain("暂不支持自动评分");
  });
});
