import { getState, clearSession } from "../../modules/session-store";
import { createSession } from "../../modules/api-adapter";
import {
  setSessionId,
  setColdStart,
  addMessage,
} from "../../modules/session-store";
import { createClientId } from "../../modules/id";
import { getUserId } from "../../modules/auth-manager";
import type { SessionResult } from "../../types";
import i18nBehavior from "../../behaviors/i18n";
import { buildI18n } from "../../utils/i18n-data";

const reportI18nMap = {
  title: "report.title",
  totalItems: "report.totalItems",
  averageScore: "report.averageScore",
  nextFocus: "report.nextFocus",
  stubbornErrors: "report.stubbornErrors",
  summary: "report.summary",
  newSession: "report.newSession",
  backHome: "report.backHome",
};

function buildReportI18n() {
  return buildI18n(reportI18nMap);
}

Page({
  behaviors: [i18nBehavior],
  data: {
    statusBarHeight: 0,
    result: {
      total_items: 0,
      average_score: 0,
      improved_areas: [] as string[],
      regressed_areas: [] as string[],
      next_focus: [] as string[],
      notable_sentences: [] as string[],
      stubborn_errors: [] as string[],
      interest_areas: [] as string[],
      hsk_adjustment: "",
      summary: "",
    } as SessionResult,
    i18n: buildReportI18n(),
  },

  onLoad() {
    const wxApi = wx as unknown as {
      getWindowInfo?: () => { statusBarHeight?: number };
      getSystemInfoSync?: () => { statusBarHeight?: number };
    };
    const windowInfo = wxApi.getWindowInfo?.();
    const fallbackInfo = windowInfo ? undefined : wxApi.getSystemInfoSync?.();
    this.setData({
      statusBarHeight:
        windowInfo?.statusBarHeight ?? fallbackInfo?.statusBarHeight ?? 0,
    });

    const s = getState();
    if (s.sessionResult) {
      this.setData({ result: s.sessionResult });
    }
  },

  refreshI18n() {
    this.setData({ i18n: buildReportI18n() });
  },

  async handleNewSession() {
    const userId = getUserId();
    if (!userId) {
      wx.reLaunch({ url: "/pages/login/login" });
      return;
    }
    try {
      clearSession();
      const result = await createSession(userId);
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
    } catch {
      wx.reLaunch({ url: "/pages/login/login" });
    }
  },

  handleBackHome() {
    clearSession();
    wx.reLaunch({ url: "/pages/login/login" });
  },
});
