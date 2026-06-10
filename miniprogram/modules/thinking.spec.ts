import { describe, it, expect } from "vitest";
import { selectVisibleThinkingSteps } from "./thinking";

function step(agent: string, output: string, label?: string) {
  return { agent, output, label };
}

describe("selectVisibleThinkingSteps", () => {
  it("returns all steps when length <= limit", () => {
    const steps = [step("A", "output1"), step("B", "output2")];
    expect(selectVisibleThinkingSteps(steps)).toEqual(steps);
    expect(selectVisibleThinkingSteps(steps, 2)).toEqual(steps);
    expect(selectVisibleThinkingSteps(steps, 3)).toEqual(steps);
  });

  it("returns exactly limit steps", () => {
    const steps = [
      step("A", "a"),
      step("B", "b"),
      step("C", "c"),
      step("D", "d"),
    ];
    expect(selectVisibleThinkingSteps(steps, 2)).toHaveLength(2);
    expect(selectVisibleThinkingSteps(steps, 3)).toHaveLength(3);
  });

  it("prioritizes high-value title keywords", () => {
    const steps = [
      step("普通步骤", "一般内容"),
      step("题目摘要", "本题围绕语法点出题"),
      step("另一个普通", "其他"),
    ];
    const result = selectVisibleThinkingSteps(steps, 2);
    // The "题目摘要" step should be included
    expect(result.some((s) => s.agent === "题目摘要")).toBe(true);
  });

  it("prioritizes high-value output keywords", () => {
    const steps = [
      step("A", "一般内容"),
      step("B", "综合观察发现用户需要"),
      step("C", "其他内容"),
    ];
    const result = selectVisibleThinkingSteps(steps, 2);
    expect(result.some((s) => s.agent === "B")).toBe(true);
  });

  it("deprioritizes low-value completion messages", () => {
    const steps = [
      step("A", "题目生成完成"),
      step("B", "有意义的分析内容"),
      step("C", "题目质量检查完成"),
      step("D", "另一个普通步骤"),
    ];
    const result = selectVisibleThinkingSteps(steps, 2);
    // B (high value) should be included; D (default score) beats A and C (low score) on tie-break by recency
    expect(result.some((s) => s.agent === "A")).toBe(false);
    expect(result.some((s) => s.agent === "C")).toBe(false);
    expect(result.some((s) => s.agent === "B")).toBe(true);
    expect(result.some((s) => s.agent === "D")).toBe(true);
  });

  it("preserves original chronological order in output", () => {
    const steps = [
      step("first", "x"),
      step("题目摘要", "高价值"),
      step("second", "y"),
      step("third", "z"),
    ];
    const result = selectVisibleThinkingSteps(steps, 2);
    const indicies = result.map((s) => steps.indexOf(s));
    expect(indicies[0]).toBeLessThan(indicies[1]);
  });

  it("returns empty array for empty input", () => {
    expect(selectVisibleThinkingSteps([], 2)).toEqual([]);
  });
});
