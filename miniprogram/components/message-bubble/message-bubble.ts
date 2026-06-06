import type { ChatMessage } from '../../types';

Component({
  properties: {
    message: { type: Object, value: {} as ChatMessage },
    showTime: { type: Boolean, value: true },
  },

  data: {
    isTextRole: false,
    batchAnswers: {} as Record<number, string>,
    canBatchSubmit: false,
    formattedTime: '',
  },

  observers: {
    'message.timestamp': function (ts: string) {
      if (ts) {
        this.setData({
          formattedTime: new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        });
      }
    },
    'message.role': function (role: string) {
      this.setData({ isTextRole: role === 'system' || role === 'cold_start' });
    },
    'message.id': function () {
      this.setData({ batchAnswers: {}, canBatchSubmit: false });
    },
  },

  lifetimes: {
    attached() {
      const msg = this.properties.message as ChatMessage;
      if (msg) {
        const updates: Record<string, unknown> = {};
        if (msg.timestamp) {
          updates.formattedTime = new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }
        updates.isTextRole = msg.role === 'system' || msg.role === 'cold_start';
        this.setData(updates);
      }
    },
  },

  methods: {
    onSingleAnswer(e: WechatMiniprogram.CustomEvent) {
      this.triggerEvent('answer', e.detail, { bubbles: true, composed: true });
    },

    onBatchQuestionAnswer(e: WechatMiniprogram.CustomEvent) {
      const qidx = e.currentTarget.dataset.qidx as number;
      const text = (e.detail as { text: string }).text;
      const answers = { ...this.data.batchAnswers, [qidx]: text };
      const msg = this.properties.message as ChatMessage;
      const total = (msg.batch_questions || []).length;
      const filled = Object.keys(answers).length;
      this.setData({ batchAnswers: answers, canBatchSubmit: filled >= total });
    },

    onBatchSubmit() {
      const msg = this.properties.message as ChatMessage;
      const qs = msg.batch_questions || [];
      const answers = qs.map((_q, i) => ({
        question_index: i,
        answer: this.data.batchAnswers[i] || '',
      }));
      this.triggerEvent('batchsubmit', { answers }, { bubbles: true, composed: true });
    },

    onOpenThinking(e: WechatMiniprogram.CustomEvent) {
      this.triggerEvent('openthinking', e.detail, { bubbles: true, composed: true });
    },
  },
});
