import type { ItemData, SubQuestion } from "../../types";

interface Option {
  index: string;
  text: string;
}

function derive(itemData: ItemData) {
  return {
    qType: itemData.question_type || "unknown",
    scene: itemData.scene || "",
    grammarFocus: itemData.grammar_focus || "",
    targetLevel: itemData.target_level || "",
    questionText: itemData.question_text || "",
    options: (itemData.options || []) as Option[],
    blankCount: itemData.blank_count || 1,
    readingPassage: itemData.reading_passage || "",
    subQuestions: (itemData.sub_questions || []) as SubQuestion[],
  };
}

Component({
  properties: {
    itemData: {
      type: Object,
      value: {
        question_type: "unknown",
        scene: "",
        grammar_focus: "",
        target_level: "",
        question_text: "",
        options: [],
        reading_passage: "",
        sub_questions: [],
        blank_count: 0,
      } as ItemData,
    },
  },

  data: derive({
    question_type: "unknown",
    scene: "",
    grammar_focus: "",
    target_level: "",
    question_text: "",
    options: [],
    reading_passage: "",
    sub_questions: [],
    blank_count: 0,
  }),

  observers: {
    itemData: function (d: ItemData) {
      if (d) this.setData(derive(d));
    },
  },

  lifetimes: {
    attached() {
      const d = this.properties.itemData as ItemData;
      if (d) this.setData(derive(d));
    },
  },

  methods: {
    onAnswer(e: WechatMiniprogram.CustomEvent) {
      this.triggerEvent("answer", e.detail, { bubbles: true, composed: true });
    },
  },
});
