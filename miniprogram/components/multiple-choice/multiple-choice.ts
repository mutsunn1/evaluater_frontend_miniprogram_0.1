interface Option {
  index: string;
  text: string;
}

Component({
  properties: {
    options: { type: Array, value: [] as Option[] },
    multiSelect: { type: Boolean, value: false },
  },

  data: {
    selected: {} as Record<string, boolean>,
    hasSelection: false,
  },

  methods: {
    onTap(e: WechatMiniprogram.TouchEvent) {
      const idx = e.currentTarget.dataset.idx as string;
      const sel = this.properties.multiSelect
        ? { ...this.data.selected, [idx]: !this.data.selected[idx] }
        : { [idx]: true };

      const hasSelection = Object.values(sel).some(Boolean);
      this.setData({ selected: sel, hasSelection });
    },

    onConfirm() {
      const keys = Object.keys(this.data.selected).filter(k => this.data.selected[k]);
      const answer = this.properties.multiSelect
        ? keys.sort().join(',')
        : keys[0] || '';
      this.triggerEvent('answer', { text: answer });
    },
  },
});
