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
  },

  observers: {
    subQuestions: function () {
      this.setData({ answers: {}, canSubmit: false });
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
    onConfirm() {
      const subQs = this.properties.subQuestions as SubQuestion[];
      const lines = subQs.map(
        (q) => `[${q.sub_id}] ${this.data.answers[q.sub_id] || ""}`
      );
      this.triggerEvent("answer", { text: lines.join("\n") });
    },
  },
});
