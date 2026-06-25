import i18nBehavior from "../../behaviors/i18n";
import { buildI18n } from "../../utils/i18n-data";

const tfI18nMap = {
  trueLabel: "chat.question.trueFalse.true",
  falseLabel: "chat.question.trueFalse.false",
  confirm: "chat.question.confirm",
};

function buildTfI18n() {
  return buildI18n(tfI18nMap);
}

Component({
  behaviors: [i18nBehavior],

  data: {
    answer: "" as string,
    i18n: buildTfI18n(),
  },

  methods: {
    refreshI18n() {
      this.setData({ i18n: buildTfI18n() });
    },

    onTap(e: WechatMiniprogram.TouchEvent) {
      const val = e.currentTarget.dataset.val as string;
      this.setData({ answer: val });
    },
    onConfirm() {
      this.triggerEvent("answer", {
        text: this.data.answer === "true" ? "true" : "false",
      });
    },
  },
});
