import type { ChatMessage, QuestionOption } from "../../types";
import {
  buildBatchAnswerPayload,
  getSkipModalityOption,
  resolveResponseMode,
} from "../../modules/response-utils";

import i18nBehavior from "../../behaviors/i18n";
import { buildI18n } from "../../utils/i18n-data";

const messageI18nMap = {
  loadingText: "chat.loading.text",
  submitAll: "chat.question.submitAll",
};

function buildMessageI18n() {
  return buildI18n(messageI18nMap);
}

Component({
  behaviors: [i18nBehavior],

  properties: {
    message: { type: Object, value: {} as ChatMessage },
    showTime: { type: Boolean, value: true },
    sessionId: { type: String, value: "" },
  },

  data: {
    isTextRole: false,
    displayContent: "",
    batchAnswers: {} as Record<number, string>,
    canBatchSubmit: false,
    formattedTime: "",
    itemModes: [] as string[],
    skipOptions: [] as Array<QuestionOption | undefined>,
    i18n: buildMessageI18n(),
  },

  observers: {
    "message.timestamp": function (ts: string) {
      if (ts) {
        this.setData({
          formattedTime: new Date(ts).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
      }
    },
    "message.role, message.content, message.source, locale": function () {
      this.updateDisplayContent();
    },
    "message.id": function () {
      this.setData({
        batchAnswers: {},
        canBatchSubmit: false,
        itemModes: [],
        skipOptions: [],
      });
    },
    "message.batch_questions": function () {
      this.setData({ batchAnswers: {}, canBatchSubmit: false });
      this.resolveItemModes();
      this.checkSubmitEnabled({});
    },
  },

  lifetimes: {
    attached() {
      const msg = this.properties.message as ChatMessage;
      if (msg) {
        const updates: Record<string, unknown> = {};
        if (msg.timestamp) {
          updates.formattedTime = new Date(msg.timestamp).toLocaleTimeString(
            "zh-CN",
            { hour: "2-digit", minute: "2-digit" }
          );
        }
        updates.isTextRole = msg.role === "system" || msg.role === "cold_start";
        this.setData(updates);
        this.updateDisplayContent();
        this.resolveItemModes();
      }
    },
  },

  methods: {
    refreshI18n() {
      this.setData({ i18n: buildMessageI18n() });
    },

    updateDisplayContent() {
      const msg = this.properties.message as ChatMessage;
      if (!msg) return;
      const shouldTranslate = msg.source === "system";
      const content = shouldTranslate ? this.t(msg.content) : msg.content;
      this.setData({ displayContent: content });
    },

    resolveItemModes() {
      const msg = this.properties.message as ChatMessage;
      const qs = msg.batch_questions || [];
      this.setData({
        itemModes: qs.map((q) => resolveResponseMode(q)),
        skipOptions: qs.map((q) => getSkipModalityOption(q)),
      });
    },

    onSingleAnswer(e: WechatMiniprogram.CustomEvent) {
      this.triggerEvent("answer", e.detail, { bubbles: true, composed: true });
    },

    onBatchQuestionAnswer(e: WechatMiniprogram.CustomEvent) {
      const qidx = e.currentTarget.dataset.qidx as number;
      const text = (e.detail as { text: string }).text;
      const answers = { ...this.data.batchAnswers, [qidx]: text };
      this.setData({ batchAnswers: answers });
      this.checkSubmitEnabled(answers);
    },

    checkSubmitEnabled(answers: Record<number, string>) {
      const msg = this.properties.message as ChatMessage;
      const qs = msg.batch_questions || [];
      const canSubmit = qs.every((q, i) => {
        const mode = resolveResponseMode(q);
        const hasAnswer = Boolean((answers[i] || "").trim());
        if (mode === "speech" || mode === "handwriting" || mode === "upload") {
          return getSkipModalityOption(q) ? hasAnswer : true;
        }
        return hasAnswer;
      });
      this.setData({ canBatchSubmit: canSubmit });
    },

    onSkipModality(e: WechatMiniprogram.TouchEvent) {
      const qidx = e.currentTarget.dataset.qidx as number;
      const answer = e.currentTarget.dataset.answer as string;
      const answers = { ...this.data.batchAnswers, [qidx]: answer };
      this.setData({ batchAnswers: answers });
      this.checkSubmitEnabled(answers);
    },

    onSpeechAsset(e: WechatMiniprogram.CustomEvent) {
      // speech-recorder triggers "answer" with the uploaded asset_id.
      // Store it keyed by the batch item index so buildBatchAnswerPayload can
      // route it into response_asset_ids for the backend grader.
      const qidx = (e.currentTarget.dataset.qidx as number) ?? 0;
      const assetId = (e.detail as string) || "";
      const answers = { ...this.data.batchAnswers, [qidx]: assetId };
      this.setData({ batchAnswers: answers });
      this.checkSubmitEnabled(answers);
    },

    onBatchSubmit() {
      const msg = this.properties.message as ChatMessage;
      const qs = msg.batch_questions || [];
      const answers = buildBatchAnswerPayload(qs, this.data.batchAnswers);
      this.triggerEvent(
        "batchsubmit",
        { answers },
        { bubbles: true, composed: true }
      );
    },

    onOpenThinking(e: WechatMiniprogram.CustomEvent) {
      this.triggerEvent("openthinking", e.detail, {
        bubbles: true,
        composed: true,
      });
    },
  },
});
