import i18nBehavior from "../../behaviors/i18n";
import { buildI18n } from "../../utils/i18n-data";

const readingI18nMap = {
  readingPassage: "chat.question.readingPassage",
  fillBlank: "chat.question.fillBlank",
  confirm: "chat.question.confirm",
};

function buildReadingI18n() {
  return buildI18n(readingI18nMap);
}

interface SubQuestion {
  sub_id: string;
  question_text: string;
  answer_format: string;
  label?: string;
}

function labelSubQuestions(
  items: SubQuestion[],
  t: (key: string, params?: Record<string, string | number>) => string
): SubQuestion[] {
  return items.map((item) => ({
    ...item,
    label: t("chat.question.subQuestion", { id: item.sub_id }),
  }));
}

Component({
  behaviors: [i18nBehavior],

  properties: {
    passage: { type: String, value: "" },
    questionText: { type: String, value: "" },
    subQuestions: { type: Array, value: [] as SubQuestion[] },
  },

  data: {
    answers: {} as Record<string, string>,
    canSubmit: false,
    mainAnswer: "",
    labeledSubQuestions: [] as SubQuestion[],
    i18n: buildReadingI18n(),
  },

  observers: {
    "subQuestions, locale": function (items: SubQuestion[]) {
      this.setData({
        answers: {},
        canSubmit: false,
        mainAnswer: "",
        labeledSubQuestions: labelSubQuestions(items || [], this.t.bind(this)),
      });
    },
  },

  lifetimes: {
    attached() {
      const items = (this.properties.subQuestions as SubQuestion[]) || [];
      this.setData({
        labeledSubQuestions: labelSubQuestions(items, this.t.bind(this)),
      });
    },
  },

  methods: {
    refreshI18n() {
      this.setData({ i18n: buildReadingI18n() });
    },

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
