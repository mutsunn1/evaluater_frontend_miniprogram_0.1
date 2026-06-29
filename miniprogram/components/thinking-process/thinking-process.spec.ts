import { describe, it, expect } from "vitest";
import {
  selectVisibleThinkingSteps,
  THINKING_FORBIDDEN_PATTERNS,
} from "../../modules/thinking";
import { getTranslatedThinkingLabel } from "../../modules/thinking-labels";

describe("thinking-process rendering logic", () => {
  it("preserves original thinking output text when locale changes", () => {
    const steps = [
      {
        agent: "智能体分析",
        agent_key: "thinking_coordinator",
        output: "正在分析出题计划",
      },
    ];

    const visible = selectVisibleThinkingSteps(steps).map((s, i) => ({
      ...s,
      preview: (s.output || "").slice(0, 60),
      displayAgent: getTranslatedThinkingLabel(
        s.agent,
        (key: string) => key // identity translator
      ),
      _origIndex: i,
      _key: `${s.agent_key || s.agent || "step"}-${i}`,
    }));

    // Simulate locale switch: displayAgent would be re-translated, but output/preview must stay the same.
    const afterLocaleSwitch = visible.map((s) => ({
      ...s,
      displayAgent: getTranslatedThinkingLabel(s.agent, () => "Agent Analysis"),
    }));

    expect(afterLocaleSwitch[0].preview).toBe("正在分析出题计划");
    expect(afterLocaleSwitch[0].output).toBe("正在分析出题计划");
    expect(afterLocaleSwitch[0].displayAgent).toBe("Agent Analysis");
  });
});
