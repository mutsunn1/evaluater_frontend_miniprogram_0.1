import { describe, it, expect, vi, beforeEach } from "vitest";

function captureComponent() {
  (globalThis as Record<string, unknown>).Component = (
    cfg: Record<string, unknown>
  ) => {
    (globalThis as Record<string, unknown>).__readingCompComponent = cfg;
    return cfg;
  };
}

function getReadingCompConfig(): Record<string, unknown> {
  return (globalThis as Record<string, unknown>)
    .__readingCompComponent as Record<string, unknown>;
}

describe("reading-comprehension fallback input", () => {
  beforeEach(() => {
    vi.resetModules();
    captureComponent();
    delete (globalThis as Record<string, unknown>).__readingCompComponent;
  });

  it("exposes mainAnswer state for single reading questions", async () => {
    await import("./reading-comprehension");
    const cfg = getReadingCompConfig();
    const data = cfg.data as Record<string, unknown>;
    expect(data.mainAnswer).toBe("");
  });

  it("triggers answer event with main answer when no sub-questions", async () => {
    await import("./reading-comprehension");
    const cfg = getReadingCompConfig();
    const methods = cfg.methods as Record<
      string,
      (...args: unknown[]) => unknown
    >;

    const component = {
      properties: {
        passage: "小明今年十岁。",
        questionText: "小明几岁？",
        subQuestions: [],
      },
      data: { answers: {}, canSubmit: false, mainAnswer: "十岁" },
      setData: vi.fn(),
      triggerEvent: vi.fn(),
    };

    methods.onConfirm.call(component);

    expect(component.triggerEvent).toHaveBeenCalledWith(
      "answer",
      expect.objectContaining({ text: "十岁" })
    );
  });
});
