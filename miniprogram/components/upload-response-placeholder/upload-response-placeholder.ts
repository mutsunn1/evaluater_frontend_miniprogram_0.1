import i18nBehavior from "../../behaviors/i18n";
import { buildI18n } from "../../utils/i18n-data";

const uploadI18nMap = {
  click: "chat.upload.click",
  notScored: "chat.upload.notScored",
};

function buildUploadI18n() {
  return buildI18n(uploadI18nMap);
}

Component({
  behaviors: [i18nBehavior],

  data: {
    i18n: buildUploadI18n(),
  },

  methods: {
    refreshI18n() {
      this.setData({ i18n: buildUploadI18n() });
    },
  },
});
