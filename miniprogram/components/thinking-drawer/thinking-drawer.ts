import { getTranslatedThinkingLabel } from "../../modules/thinking-labels";
import type { ThinkingStep } from "../../types";
import i18nBehavior from "../../behaviors/i18n";
import { buildI18n } from "../../utils/i18n-data";

const drawerI18nMap = {
  title: "chat.thinking.title",
  empty: "chat.thinking.empty",
};

function buildDrawerI18n() {
  return buildI18n(drawerI18nMap);
}

interface DrawerStep extends ThinkingStep {
  displayAgent: string;
  _key: string;
}

Component({
  behaviors: [i18nBehavior],

  properties: {
    open: { type: Boolean, value: false },
    steps: {
      type: Array,
      value: [] as ThinkingStep[],
    },
  },

  data: {
    drawerSteps: [] as DrawerStep[],
    i18n: buildDrawerI18n(),
  },

  observers: {
    "steps, locale": function (steps: ThinkingStep[]) {
      this.setData({
        drawerSteps: (steps || []).map((s, i) => ({
          ...s,
          displayAgent: getTranslatedThinkingLabel(s.agent, this.t.bind(this)),
          _key: `${s.agent_key || s.agent || "step"}-${i}`,
        })),
      });
    },
  },

  lifetimes: {
    attached() {
      this.setData({ i18n: buildDrawerI18n() });
    },
  },

  methods: {
    refreshI18n() {
      this.setData({ i18n: buildDrawerI18n() });
    },
    onClose() {
      this.triggerEvent("close");
    },
  },
});
