import { selectVisibleThinkingSteps } from "../../modules/thinking";
import type { ThinkingStep } from "../../types";

interface VisibleStep extends ThinkingStep {
  preview: string;
  _origIndex: number;
}

Component({
  properties: {
    steps: {
      type: Array,
      value: [] as ThinkingStep[],
    },
    limit: {
      type: Number,
      value: 2,
    },
  },

  data: {
    visibleSteps: [] as VisibleStep[],
    allCount: 0,
  },

  observers: {
    steps: function (steps: ThinkingStep[]) {
      if (!steps || !steps.length) {
        this.setData({ visibleSteps: [], allCount: 0 });
        return;
      }
      const all = steps.map((s, i) => ({
        ...s,
        preview: (s.output || "").slice(0, 60),
        _origIndex: i,
      }));

      const picked = selectVisibleThinkingSteps(
        all,
        this.properties.limit
      ) as VisibleStep[];
      this.setData({ visibleSteps: picked, allCount: all.length });
    },
  },

  methods: {
    onTapStep(e: WechatMiniprogram.TouchEvent) {
      const idx = e.currentTarget.dataset.index as number;
      const step = this.data.visibleSteps.find((s) => s._origIndex === idx);
      if (step) {
        this.triggerEvent("open", { steps: [step], index: idx });
      }
    },
    onExpandAll() {
      this.triggerEvent("open", { steps: this.properties.steps, index: 0 });
    },
  },
});
