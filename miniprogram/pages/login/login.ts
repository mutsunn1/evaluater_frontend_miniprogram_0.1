import { getUserId, setUserId } from "../../modules/auth-manager";
import { createSession } from "../../modules/api-adapter";
import {
  setSessionId,
  setColdStart,
  addMessage,
  clearSession,
} from "../../modules/session-store";
import { createClientId } from "../../modules/id";
import i18nBehavior from "../../behaviors/i18n";

import { i18n } from "../../behaviors/i18n";

function buildLoginI18n() {
  return {
    appTitleFull: i18n.t("common.appTitleFull"),
    userId: i18n.t("common.userId"),
    userIdPlaceholder: i18n.t("common.userIdPlaceholder"),
    loggingIn: i18n.t("common.loggingIn"),
    startEvaluation: i18n.t("common.startEvaluation"),
    langZh: i18n.t("common.language.zh"),
    langEn: i18n.t("common.language.en"),
  };
}

Page({
  behaviors: [i18nBehavior],

  data: {
    inputId: "",
    loading: false,
    errorMsg: "",
    errorDisplay: "",
    i18n: buildLoginI18n(),
  },

  onLoad() {
    clearSession();
    const saved = getUserId();
    if (saved) {
      this.setData({ inputId: saved });
    }
    this.refreshI18n();
  },

  refreshI18n() {
    this.setData({ i18n: buildLoginI18n() });
  },

  updateErrorDisplay() {
    const { errorMsg } = this.data;
    this.setData({
      errorDisplay: errorMsg
        ? this.t("common.error.backend", { message: errorMsg })
        : "",
    });
  },

  onInputChange(e: { detail: { value: string } }) {
    this.setData({ inputId: e.detail.value, errorMsg: "" });
    this.updateErrorDisplay();
  },

  onSwitchLocale(e: WechatMiniprogram.TouchEvent) {
    const next = e.currentTarget.dataset.locale as "en" | "zh";
    this.switchLocale(next);
    this.refreshI18n();
    this.updateErrorDisplay();
  },

  async handleStart() {
    const id = this.data.inputId.trim();
    if (!id) return;

    setUserId(id);
    this.setData({ loading: true, errorMsg: "" });
    this.updateErrorDisplay();

    try {
      const result = await createSession(id);
      setSessionId(result.session_id);
      setColdStart(!!result.needs_cold_start);

      addMessage({
        id: createClientId(),
        role: "system",
        source: "system",
        content: result.needs_cold_start
          ? "chat.welcome.coldStart"
          : "chat.welcome.assessment",
        timestamp: new Date().toISOString(),
      });

      wx.redirectTo({ url: "/pages/chat/chat" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "error";
      this.setData({ errorMsg: msg, loading: false });
      this.updateErrorDisplay();
    }
  },
});
