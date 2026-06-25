import { getNavLayout } from "../../modules/nav-helper";
import i18nBehavior from "../../behaviors/i18n";
import { buildI18n } from "../../utils/i18n-data";

const navI18nMap = {
  openProfile: "common.openProfile",
  appTitle: "common.appTitle",
  langZh: "common.language.zh",
  langEn: "common.language.en",
  endEvaluation: "common.endEvaluation",
  logout: "common.logout",
};

function buildNavI18n() {
  return buildI18n(navI18nMap);
}

Component({
  behaviors: [i18nBehavior],

  properties: {
    userId: { type: String, value: "" },
    profileOpen: { type: Boolean, value: false },
  },

  data: {
    layout: {
      statusBarHeight: 0,
      navBarHeight: 64,
      totalHeight: 64,
      capsuleLeft: 0,
      capsuleWidth: 0,
      capsuleBottom: 0,
      businessBarTop: 0,
      businessBarHeight: 64,
    },
    i18n: buildNavI18n(),
  },

  lifetimes: {
    attached() {
      const layout = getNavLayout();
      this.setData({ layout, i18n: buildNavI18n() });
    },
  },

  methods: {
    refreshI18n() {
      this.setData({ i18n: buildNavI18n() });
    },
    onEndTap() {
      this.triggerEvent("end");
    },
    onExitTap() {
      this.triggerEvent("exit");
    },
    onProfileTap() {
      this.triggerEvent("profiletoggle");
    },
    onLangTap() {
      const next = this.data.locale === "en" ? "zh" : "en";
      this.switchLocale(next);
      this.triggerEvent("langchange", { locale: next });
    },
  },
});
