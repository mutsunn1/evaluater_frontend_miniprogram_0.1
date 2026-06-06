Component({
  data: {
    answer: '' as string,
  },

  methods: {
    onTap(e: WechatMiniprogram.TouchEvent) {
      const val = e.currentTarget.dataset.val as string;
      this.setData({ answer: val });
    },
    onConfirm() {
      this.triggerEvent('answer', { text: this.data.answer === 'true' ? 'true' : 'false' });
    },
  },
});
