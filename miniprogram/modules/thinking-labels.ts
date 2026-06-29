const LABEL_TO_I18N_KEY: Record<string, string> = {
  "Question Planning": "chat.thinking.labels.planning",
  出题规划: "chat.thinking.labels.planning",
  "Vocabulary Question": "chat.thinking.labels.vocabularyQuestion",
  词汇出题: "chat.thinking.labels.vocabularyQuestion",
  vocabulary出题: "chat.thinking.labels.vocabularyQuestion",
  "Grammar Question": "chat.thinking.labels.grammarQuestion",
  语法出题: "chat.thinking.labels.grammarQuestion",
  grammar出题: "chat.thinking.labels.grammarQuestion",
  "Reading Question": "chat.thinking.labels.readingQuestion",
  阅读出题: "chat.thinking.labels.readingQuestion",
  reading出题: "chat.thinking.labels.readingQuestion",
  "Listening Question": "chat.thinking.labels.listeningQuestion",
  听力出题: "chat.thinking.labels.listeningQuestion",
  listening出题: "chat.thinking.labels.listeningQuestion",
  "Speaking Question": "chat.thinking.labels.speakingQuestion",
  口语出题: "chat.thinking.labels.speakingQuestion",
  speaking出题: "chat.thinking.labels.speakingQuestion",
  "Agent Analysis": "chat.thinking.labels.agentAnalysis",
  智能体分析: "chat.thinking.labels.agentAnalysis",
  "Question Compensation": "chat.thinking.labels.compensation",
  出题补偿: "chat.thinking.labels.compensation",
  "Question Summary": "chat.thinking.labels.questionSummary",
  题目摘要: "chat.thinking.labels.questionSummary",
  "Question Generation Summary":
    "chat.thinking.labels.questionGenerationSummary",
  题目生成摘要: "chat.thinking.labels.questionGenerationSummary",
  "Quality Check Agent": "chat.thinking.labels.qaAgent",
  质检智能体: "chat.thinking.labels.qaAgent",
  "Master Agent": "chat.thinking.labels.masterAgent",
  "Cold Start Agent": "chat.thinking.labels.coldStartAgent",
  冷启动智能体: "chat.thinking.labels.coldStartAgent",
  "Behavior Observer": "chat.thinking.labels.behaviorObserver",
  行为观察智能体: "chat.thinking.labels.behaviorObserver",
  "Grading Agent": "chat.thinking.labels.gradingAgent",
  评分智能体: "chat.thinking.labels.gradingAgent",
  System: "chat.thinking.labels.system",
  系统: "chat.thinking.labels.system",
};

export function getThinkingLabelI18nKey(label: string): string | undefined {
  return LABEL_TO_I18N_KEY[label];
}

export function getThinkingLabelKeys(): string[] {
  return Object.keys(LABEL_TO_I18N_KEY);
}

export function getTranslatedThinkingLabel(
  label: string,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const key = getThinkingLabelI18nKey(label);
  return key ? t(key) : label;
}
