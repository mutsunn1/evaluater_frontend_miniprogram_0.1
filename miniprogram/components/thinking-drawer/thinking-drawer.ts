import type { ThinkingStep } from "../../types";

interface DrawerStep extends ThinkingStep {
  _key: string;
}

Component({
  properties: {
    open: { type: Boolean, value: false },
    steps: {
      type: Array,
      value: [] as ThinkingStep[],
    },
  },

  data: {
    drawerSteps: [] as DrawerStep[],
  },

  observers: {
    steps: function (steps: ThinkingStep[]) {
      this.setData({
        drawerSteps: (steps || []).map((s, i) => ({
          ...s,
          _key: `${s.agent_key || s.agent || "step"}-${i}`,
        })),
      });
    },
  },

  methods: {
    onClose() {
      this.triggerEvent("close");
    },
  },
});
