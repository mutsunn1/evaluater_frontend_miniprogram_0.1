import type { ItemData, MediaAsset, SubQuestion } from "../../types";

import i18nBehavior from "../../behaviors/i18n";
import { buildI18n } from "../../utils/i18n-data";

const questionI18nMap = {
  scene: "chat.question.scene",
  grammar: "chat.question.grammar",
  unsupported: "chat.question.unsupported",
};

function buildQuestionI18n() {
  return buildI18n(questionI18nMap);
}

interface Option {
  index: string;
  text?: string;
  media_id?: string;
}

function formatTargetLevel(value: string | undefined): string {
  const text = String(value || "").trim();
  if (!text) return "";
  return /^HSK/i.test(text) ? text : `HSK ${text}`;
}

interface QuestionSegment {
  type: "text" | "image";
  content?: string;
  src?: string;
  alt?: string;
  style?: string;
}

function parseQuestionText(text: string): QuestionSegment[] {
  const segments: QuestionSegment[] = [];
  const imgRegex = /<img\s+([^>]+)>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }

    const attrText = match[1];
    const src = /src\s*=\s*["']([^"']+)["']/i.exec(attrText)?.[1] || "";
    const alt = /alt\s*=\s*["']([^"']*)["']/i.exec(attrText)?.[1] || "";
    const style = /style\s*=\s*["']([^"']*)["']/i.exec(attrText)?.[1] || "";

    segments.push({ type: "image", src, alt, style });
    lastIndex = imgRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}

function derive(
  itemData: ItemData,
  labels: ReturnType<typeof buildQuestionI18n>
) {
  const questionText = itemData.question_text || "";
  return {
    qType: itemData.question_type || "unknown",
    scene: itemData.scene || "",
    sceneLabel: itemData.scene ? labels.scene : "",
    grammarFocus: itemData.grammar_focus || "",
    grammarLabel: itemData.grammar_focus ? labels.grammar : "",
    targetLevel: formatTargetLevel(itemData.target_level),
    questionText,
    questionSegments: parseQuestionText(questionText),
    options: (itemData.options || []) as Option[],
    media: Array.isArray(itemData.media)
      ? (itemData.media as MediaAsset[])
      : ([] as MediaAsset[]),
    blankCount: itemData.blank_count || 1,
    readingPassage: itemData.reading_passage || "",
    subQuestions: (itemData.sub_questions || []) as SubQuestion[],
    unsupportedLabel: labels.unsupported,
  };
}

Component({
  behaviors: [i18nBehavior],

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
        media: [],
        reading_passage: "",
        sub_questions: [],
        blank_count: 0,
      } as ItemData,
    },
  },

  data: derive(
    {
      question_type: "unknown",
      scene: "",
      grammar_focus: "",
      target_level: "",
      question_text: "",
      options: [],
      media: [],
      reading_passage: "",
      sub_questions: [],
      blank_count: 0,
    },
    buildQuestionI18n()
  ),

  observers: {
    "itemData, locale": function (d: ItemData) {
      if (d) this.setData(derive(d, this.data.i18n));
    },
  },

  lifetimes: {
    attached() {
      const d = this.properties.itemData as ItemData;
      if (d) this.setData(derive(d, this.data.i18n));
    },
  },

  methods: {
    refreshI18n() {
      this.setData({ i18n: buildQuestionI18n() });
    },

    onAnswer(e: WechatMiniprogram.CustomEvent) {
      this.triggerEvent("answer", e.detail, { bubbles: true, composed: true });
    },
  },
});
