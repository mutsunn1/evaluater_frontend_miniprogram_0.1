import i18nBehavior from "../../behaviors/i18n";
import { buildI18n } from "../../utils/i18n-data";

const speechPlaceholderI18nMap = {
  start: "chat.speech.start",
  notScored: "chat.speech.notScored",
};

function buildSpeechPlaceholderI18n() {
  return buildI18n(speechPlaceholderI18nMap);
}

Component({
  behaviors: [i18nBehavior],

  data: {
    i18n: buildSpeechPlaceholderI18n(),
  },

  methods: {
    refreshI18n() {
      this.setData({ i18n: buildSpeechPlaceholderI18n() });
    },
  },
});
