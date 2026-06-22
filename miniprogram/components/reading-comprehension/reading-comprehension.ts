interface SubQuestion {
  sub_id: string;
  question_text: string;
  answer_format: string;
}

Component({
  properties: {
    passage: { type: String, value: "" },
    questionText: { type: String, value: "" },
    subQuestions: { type: Array, value: [] as SubQuestion[] },
  },

  data: {
    answers: {} as Record<string, string>,
    canSubmit: false,
    mainAnswer: "",
  },

  observers: {
    subQuestions: function () {
      this.setData({ answers: {}, canSubmit: false, mainAnswer: "" });
    },
  },

  methods: {
    onInput(e: WechatMiniprogram.InputEvent) {
      const sid = e.currentTarget.dataset.sid as string;
      const answers = { ...this.data.answers, [sid]: e.detail.value };
      const subQs = this.properties.subQuestions as SubQuestion[];
      const canSubmit = subQs.every(
        (q) => (answers[q.sub_id] || "").trim().length > 0
      );
      this.setData({ answers, canSubmit });
    },
    onMainInput(e: WechatMiniprogram.InputEvent) {
      const mainAnswer = e.detail.value || "";
      const canSubmit = mainAnswer.trim().length > 0;
      this.setData({ mainAnswer, canSubmit });
    },
    onConfirm() {
      const subQs = this.properties.subQuestions as SubQuestion[];
      if (subQs.length > 0) {
        const lines = subQs.map(
          (q) => `[${q.sub_id}] ${this.data.answers[q.sub_id] || ""}`
        );
        this.triggerEvent("answer", { text: lines.join("\n") });
      } else {
        this.triggerEvent("answer", { text: this.data.mainAnswer });
      }
    },
  },
});
