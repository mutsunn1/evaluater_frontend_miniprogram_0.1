import { getUserId, setUserId } from "../../modules/auth-manager";
import { createSession } from "../../modules/api-adapter";
import {
  setSessionId,
  setColdStart,
  addMessage,
  clearSession,
} from "../../modules/session-store";
import { createClientId } from "../../modules/id";

Page({
  data: {
    inputId: "",
    loading: false,
    errorMsg: "",
  },

  onLoad() {
    clearSession();
    const saved = getUserId();
    if (saved) {
      this.setData({ inputId: saved });
    }
  },

  onInputChange(e: { detail: { value: string } }) {
    this.setData({ inputId: e.detail.value, errorMsg: "" });
  },

  async handleStart() {
    const id = this.data.inputId.trim();
    if (!id) return;

    setUserId(id);
    this.setData({ loading: true, errorMsg: "" });

    try {
      const result = await createSession(id);
      setSessionId(result.session_id);
      setColdStart(!!result.needs_cold_start);

      addMessage({
        id: createClientId(),
        role: "system",
        content: result.needs_cold_start
          ? "欢迎！系统将通过几轮问答了解您的中文水平，请简要回答以下问题。"
          : `欢迎回来！您的当前 HSK 等级为 ${result.hsk_level} 级。`,
        timestamp: new Date().toISOString(),
      });

      wx.redirectTo({ url: "/pages/chat/chat" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "创建会话失败，请重试";
      this.setData({ errorMsg: msg, loading: false });
    }
  },
});
