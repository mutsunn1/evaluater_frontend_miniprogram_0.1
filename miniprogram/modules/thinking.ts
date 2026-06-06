type ThinkingLike = {
  agent: string;
  output: string;
  label?: string;
};

const HIGH_VALUE_TITLE_KEYWORDS = ['题目摘要', '题目生成摘要', '出题规划摘要', '智能体分析'];
const HIGH_VALUE_OUTPUT_KEYWORDS = ['本题围绕', '正在选择适合', '综合观察', '评分结果'];
const LOW_VALUE_OUTPUT_KEYWORDS = ['题目生成完成', '题目质量检查完成'];

function getTitle(step: ThinkingLike): string {
  return step.label || step.agent;
}

function scoreThinkingStep(step: ThinkingLike): number {
  const title = getTitle(step);
  if (
    HIGH_VALUE_TITLE_KEYWORDS.some(keyword => title.includes(keyword)) ||
    HIGH_VALUE_OUTPUT_KEYWORDS.some(keyword => step.output.includes(keyword))
  ) {
    return 2;
  }
  if (LOW_VALUE_OUTPUT_KEYWORDS.some(keyword => step.output.includes(keyword))) {
    return 0;
  }
  return 1;
}

export function selectVisibleThinkingSteps<T extends ThinkingLike>(steps: T[], limit = 2): T[] {
  if (steps.length <= limit) return steps;

  return steps
    .map((step, index) => ({ step, index, score: scoreThinkingStep(step) }))
    .sort((a, b) => b.score - a.score || b.index - a.index)
    .slice(0, limit)
    .sort((a, b) => a.index - b.index)
    .map(item => item.step);
}
