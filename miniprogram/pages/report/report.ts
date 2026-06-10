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

Page({
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
  },

  onLoad() {
    const sys = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight });

    const s = getState();
    if (s.sessionResult) {
      this.setData({ result: s.sessionResult });
    }
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
        content: result.needs_cold_start
          ? "欢迎！系统将通过几轮问答了解您的中文水平。"
          : `欢迎回来！当前 HSK 等级为 ${result.hsk_level} 级。`,
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
