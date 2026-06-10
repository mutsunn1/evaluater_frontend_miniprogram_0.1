Component({
  properties: {
    blankCount: { type: Number, value: 1 },
  },

  data: {
    blanks: [] as number[],
    answers: [] as string[],
    singleAnswer: "",
    canSubmit: false,
  },

  observers: {
    blankCount: function (n: number) {
      if (n > 1) {
        const blanks = Array.from({ length: n }, (_, i) => i);
        this.setData({
          blanks,
          answers: new Array(n).fill(""),
          canSubmit: false,
        });
      } else {
        this.setData({ blanks: [], singleAnswer: "", canSubmit: false });
      }
    },
  },

  methods: {
    onInput(e: WechatMiniprogram.InputEvent) {
      const idx = e.currentTarget.dataset.idx as number;
      const answers = [...this.data.answers];
      answers[idx] = e.detail.value;
      const canSubmit = answers.every((a) => a.trim().length > 0);
      this.setData({ answers, canSubmit });
    },
    onSingleInput(e: WechatMiniprogram.InputEvent) {
      const val = e.detail.value;
      this.setData({ singleAnswer: val, canSubmit: val.trim().length > 0 });
    },
    onConfirm() {
      const answer =
        this.properties.blankCount > 1
          ? this.data.answers.join(",")
          : this.data.singleAnswer.trim();
      this.triggerEvent("answer", { text: answer });
    },
  },
});
