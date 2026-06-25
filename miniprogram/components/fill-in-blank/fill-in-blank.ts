import i18nBehavior from "../../behaviors/i18n";
import { buildI18n } from "../../utils/i18n-data";

const blankI18nMap = {
  blankLabel: "chat.question.blankLabel",
  fillBlank: "chat.question.fillBlank",
  confirm: "chat.question.confirm",
};

function buildBlankI18n() {
  return buildI18n(blankI18nMap);
}

interface BlankItem {
  index: number;
  label: string;
}

Component({
  behaviors: [i18nBehavior],

  properties: {
    blankCount: { type: Number, value: 1 },
  },

  data: {
    blanks: [] as BlankItem[],
    answers: [] as string[],
    singleAnswer: "",
    canSubmit: false,
    i18n: buildBlankI18n(),
  },

  observers: {
    "blankCount, locale": function (n: number) {
      if (n > 1) {
        const blanks: BlankItem[] = Array.from({ length: n }, (_, i) => ({
          index: i,
          label: this.t("chat.question.blankLabel", { n: i + 1 }),
        }));
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

  lifetimes: {
    attached() {
      const n = (this.properties.blankCount as number) || 1;
      if (n > 1) {
        const blanks: BlankItem[] = Array.from({ length: n }, (_, i) => ({
          index: i,
          label: this.t("chat.question.blankLabel", { n: i + 1 }),
        }));
        this.setData({
          blanks,
          answers: new Array(n).fill(""),
          canSubmit: false,
        });
      }
    },
  },

  methods: {
    refreshI18n() {
      this.setData({ i18n: buildBlankI18n() });
    },

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
