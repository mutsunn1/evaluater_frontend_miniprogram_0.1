import i18nBehavior from "../../behaviors/i18n";
import { buildI18n } from "../../utils/i18n-data";

const handwritingI18nMap = {
  area: "chat.handwriting.area",
  notScored: "chat.handwriting.notScored",
};

function buildHandwritingI18n() {
  return buildI18n(handwritingI18nMap);
}

Component({
  behaviors: [i18nBehavior],

  data: {
    i18n: buildHandwritingI18n(),
  },

  methods: {
    refreshI18n() {
      this.setData({ i18n: buildHandwritingI18n() });
    },
  },
});
