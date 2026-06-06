import type { ThinkingStep } from '../../types';

Component({
  properties: {
    open: { type: Boolean, value: false },
    steps: {
      type: Array,
      value: [] as ThinkingStep[],
    },
  },

  methods: {
    onClose() {
      this.triggerEvent('close');
    },
  },
});
