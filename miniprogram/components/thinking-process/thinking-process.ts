import { selectVisibleThinkingSteps } from "../../modules/thinking";
import type { ThinkingStep } from "../../types";
import i18nBehavior from "../../behaviors/i18n";
import { buildI18n } from "../../utils/i18n-data";

const thinkingI18nMap = {
  viewAll: "chat.thinking.viewAll",
  title: "chat.thinking.title",
};

function buildThinkingI18n() {
  return buildI18n(thinkingI18nMap);
}

interface VisibleStep extends ThinkingStep {
  preview: string;
  _origIndex: number;
  _key: string;
}

Component({
  behaviors: [i18nBehavior],
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
    viewAllText: "",
    i18n: buildThinkingI18n(),
  },

  observers: {
    "steps, locale": function (steps: ThinkingStep[]) {
      if (!steps || !steps.length) {
        this.setData({ visibleSteps: [], allCount: 0, viewAllText: "" });
        return;
      }
      const all = steps.map((s, i) => ({
        ...s,
        preview: (s.output || "").slice(0, 60),
        _origIndex: i,
        _key: `${s.agent_key || s.agent || "step"}-${i}`,
      }));

      const picked = selectVisibleThinkingSteps(
        all,
        this.properties.limit
      ) as VisibleStep[];
      this.setData({
        visibleSteps: picked,
        allCount: all.length,
        viewAllText: this.t("chat.thinking.viewAll", { count: all.length }),
      });
    },
  },

  lifetimes: {
    attached() {
      const steps = (this.properties.steps as ThinkingStep[]) || [];
      if (steps.length) {
        this.setData({
          viewAllText: this.t("chat.thinking.viewAll", { count: steps.length }),
        });
      }
    },
  },

  methods: {
    refreshI18n() {
      this.setData({ i18n: buildThinkingI18n() });
    },
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
