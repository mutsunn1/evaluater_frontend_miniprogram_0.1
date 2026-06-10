import type { ChatMessage } from "../../types";
import {
  buildBatchAnswerPayload,
  resolveResponseMode,
} from "../../modules/response-utils";

Component({
  properties: {
    message: { type: Object, value: {} as ChatMessage },
    showTime: { type: Boolean, value: true },
  },

  data: {
    isTextRole: false,
    batchAnswers: {} as Record<number, string>,
    canBatchSubmit: false,
    formattedTime: "",
    // Per-item resolved response modes for batch questions
    itemModes: [] as string[],
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
    "message.role": function (role: string) {
      this.setData({ isTextRole: role === "system" || role === "cold_start" });
    },
    "message.id": function () {
      this.setData({ batchAnswers: {}, canBatchSubmit: false, itemModes: [] });
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
        this.resolveItemModes();
      }
    },
  },

  methods: {
    resolveItemModes() {
      const msg = this.properties.message as ChatMessage;
      const qs = msg.batch_questions || [];
      this.setData({ itemModes: qs.map((q) => resolveResponseMode(q)) });
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
      // Placeholder modes (speech, handwriting, upload) count as pre-filled
      const required = qs.reduce((count, q, i) => {
        const mode = resolveResponseMode(q);
        return mode === "speech" || mode === "handwriting" || mode === "upload"
          ? count // placeholder — no user input needed
          : count + 1; // requires real answer
      }, 0);
      const filled = Object.entries(answers)
        .filter(([, v]) => v.trim())
        .filter(([k]) => {
          const q = qs[Number(k)];
          if (!q) return false;
          const mode = resolveResponseMode(q);
          return (
            mode !== "speech" && mode !== "handwriting" && mode !== "upload"
          );
        }).length;
      this.setData({ canBatchSubmit: filled >= required });
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
