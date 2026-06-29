import { describe, it, expect, vi } from "vitest";
import {
  getThinkingLabelI18nKey,
  getThinkingLabelKeys,
  getTranslatedThinkingLabel,
} from "./thinking-labels";

describe("thinking-labels", () => {
  it("maps known backend labels to i18n keys", () => {
    expect(getThinkingLabelI18nKey("Question Planning")).toBe(
      "chat.thinking.labels.planning"
    );
    expect(getThinkingLabelI18nKey("出题规划")).toBe(
      "chat.thinking.labels.planning"
    );
    expect(getThinkingLabelI18nKey("Vocabulary Question")).toBe(
      "chat.thinking.labels.vocabularyQuestion"
    );
    expect(getThinkingLabelI18nKey("词汇出题")).toBe(
      "chat.thinking.labels.vocabularyQuestion"
    );
    expect(getThinkingLabelI18nKey("vocabulary出题")).toBe(
      "chat.thinking.labels.vocabularyQuestion"
    );
    expect(getThinkingLabelI18nKey("Grammar Question")).toBe(
      "chat.thinking.labels.grammarQuestion"
    );
    expect(getThinkingLabelI18nKey("语法出题")).toBe(
      "chat.thinking.labels.grammarQuestion"
    );
    expect(getThinkingLabelI18nKey("grammar出题")).toBe(
      "chat.thinking.labels.grammarQuestion"
    );
    expect(getThinkingLabelI18nKey("Reading Question")).toBe(
      "chat.thinking.labels.readingQuestion"
    );
    expect(getThinkingLabelI18nKey("阅读出题")).toBe(
      "chat.thinking.labels.readingQuestion"
    );
    expect(getThinkingLabelI18nKey("reading出题")).toBe(
      "chat.thinking.labels.readingQuestion"
    );
    expect(getThinkingLabelI18nKey("Listening Question")).toBe(
      "chat.thinking.labels.listeningQuestion"
    );
    expect(getThinkingLabelI18nKey("听力出题")).toBe(
      "chat.thinking.labels.listeningQuestion"
    );
    expect(getThinkingLabelI18nKey("listening出题")).toBe(
      "chat.thinking.labels.listeningQuestion"
    );
    expect(getThinkingLabelI18nKey("Speaking Question")).toBe(
      "chat.thinking.labels.speakingQuestion"
    );
    expect(getThinkingLabelI18nKey("口语出题")).toBe(
      "chat.thinking.labels.speakingQuestion"
    );
    expect(getThinkingLabelI18nKey("speaking出题")).toBe(
      "chat.thinking.labels.speakingQuestion"
    );
    expect(getThinkingLabelI18nKey("Agent Analysis")).toBe(
      "chat.thinking.labels.agentAnalysis"
    );
    expect(getThinkingLabelI18nKey("智能体分析")).toBe(
      "chat.thinking.labels.agentAnalysis"
    );
    expect(getThinkingLabelI18nKey("Question Compensation")).toBe(
      "chat.thinking.labels.compensation"
    );
    expect(getThinkingLabelI18nKey("出题补偿")).toBe(
      "chat.thinking.labels.compensation"
    );
    expect(getThinkingLabelI18nKey("Question Summary")).toBe(
      "chat.thinking.labels.questionSummary"
    );
    expect(getThinkingLabelI18nKey("题目摘要")).toBe(
      "chat.thinking.labels.questionSummary"
    );
    expect(getThinkingLabelI18nKey("Question Generation Summary")).toBe(
      "chat.thinking.labels.questionGenerationSummary"
    );
    expect(getThinkingLabelI18nKey("题目生成摘要")).toBe(
      "chat.thinking.labels.questionGenerationSummary"
    );
    expect(getThinkingLabelI18nKey("Quality Check Agent")).toBe(
      "chat.thinking.labels.qaAgent"
    );
    expect(getThinkingLabelI18nKey("质检智能体")).toBe(
      "chat.thinking.labels.qaAgent"
    );
    expect(getThinkingLabelI18nKey("Master Agent")).toBe(
      "chat.thinking.labels.masterAgent"
    );
    expect(getThinkingLabelI18nKey("Cold Start Agent")).toBe(
      "chat.thinking.labels.coldStartAgent"
    );
    expect(getThinkingLabelI18nKey("冷启动智能体")).toBe(
      "chat.thinking.labels.coldStartAgent"
    );
    expect(getThinkingLabelI18nKey("Behavior Observer")).toBe(
      "chat.thinking.labels.behaviorObserver"
    );
    expect(getThinkingLabelI18nKey("行为观察智能体")).toBe(
      "chat.thinking.labels.behaviorObserver"
    );
    expect(getThinkingLabelI18nKey("Grading Agent")).toBe(
      "chat.thinking.labels.gradingAgent"
    );
    expect(getThinkingLabelI18nKey("评分智能体")).toBe(
      "chat.thinking.labels.gradingAgent"
    );
    expect(getThinkingLabelI18nKey("System")).toBe(
      "chat.thinking.labels.system"
    );
    expect(getThinkingLabelI18nKey("系统")).toBe("chat.thinking.labels.system");
  });

  it("returns undefined for unknown labels", () => {
    expect(getThinkingLabelI18nKey("未知标签")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(getThinkingLabelI18nKey("")).toBeUndefined();
  });

  it("exposes all mapped labels", () => {
    expect(getThinkingLabelKeys()).toHaveLength(36);
    expect(getThinkingLabelKeys()).toContain("Question Planning");
  });

  it("translates known labels via the provided t function", () => {
    const t = vi.fn((key) =>
      key === "chat.thinking.labels.planning" ? "Question Planning" : key
    );
    expect(getTranslatedThinkingLabel("Question Planning", t)).toBe(
      "Question Planning"
    );
    expect(t).toHaveBeenCalledWith("chat.thinking.labels.planning");
  });

  it("returns original label when no mapping exists", () => {
    const t = vi.fn((key) => key);
    expect(getTranslatedThinkingLabel("未知标签", t)).toBe("未知标签");
    expect(t).not.toHaveBeenCalled();
  });
});
