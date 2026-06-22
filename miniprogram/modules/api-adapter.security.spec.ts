import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const PROD_URL = "https://evalapi.mutsum1.xyz";

function setupWx(requestMock?: unknown, uploadMock?: unknown) {
  const wx: Record<string, unknown> = {
    getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
    getStorageSync: () => undefined,
    setStorageSync: () => undefined,
  };
  if (requestMock !== undefined) wx.request = requestMock;
  if (uploadMock !== undefined) wx.uploadFile = uploadMock;
  (globalThis as Record<string, unknown>).wx = wx;
}

describe("api-adapter — 域名安全校验", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).wx;
    delete (globalThis as Record<string, unknown>).__storage;
    vi.doUnmock("./config");
    vi.doUnmock("./sse-parser");
  });

  it("request 入口在 URL 未通过校验时拒绝且不调用 wx.request", async () => {
    vi.doMock("./config", () => ({
      API_BASE_URL: "https://attacker.example.com",
      assertApiUrlAllowed(url: string) {
        const allowed = [PROD_URL];
        const ok = allowed.some((a) => url === a || url.startsWith(`${a}/`));
        if (!ok) throw new Error(`[API 安全] 未登记域名: ${url}`);
      },
    }));
    const requestMock = vi.fn();
    setupWx(requestMock);

    const { createSession } = await import("./api-adapter");
    await expect(createSession("u1")).rejects.toThrow(/未登记域名/);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("uploadSpeechRecording 在 URL 未通过校验时拒绝且不调用 wx.uploadFile", async () => {
    vi.doMock("./config", () => ({
      API_BASE_URL: "https://attacker.example.com",
      assertApiUrlAllowed(url: string) {
        const allowed = [PROD_URL];
        const ok = allowed.some((a) => url === a || url.startsWith(`${a}/`));
        if (!ok) throw new Error(`[API 安全] 未登记域名: ${url}`);
      },
    }));
    const uploadMock = vi.fn();
    setupWx(undefined, uploadMock);

    const { uploadSpeechRecording } = await import("./api-adapter");
    await expect(
      uploadSpeechRecording("s1", 1, "tmp.mp3", 1200, "rec.mp3")
    ).rejects.toThrow(/未登记域名/);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("streamRequest 在 URL 未通过校验时拒绝且不启动 SSE 流", async () => {
    vi.doMock("./config", () => ({
      API_BASE_URL: "https://attacker.example.com",
      assertApiUrlAllowed(url: string) {
        const allowed = [PROD_URL];
        const ok = allowed.some((a) => url === a || url.startsWith(`${a}/`));
        if (!ok) throw new Error(`[API 安全] 未登记域名: ${url}`);
      },
    }));
    const sseMock = vi.fn();
    vi.doMock("./sse-parser", () => ({ startSseRequest: sseMock }));
    setupWx();

    const { batchSubmitAnswer } = await import("./api-adapter");
    await expect(
      batchSubmitAnswer("s1", [{ question_index: 0, answer: "x" }], vi.fn())
    ).rejects.toThrow(/未登记域名/);
    expect(sseMock).not.toHaveBeenCalled();
  });

  it("streamQuestion 在 URL 未通过校验时拒绝且不启动 SSE 流", async () => {
    vi.doMock("./config", () => ({
      API_BASE_URL: "https://attacker.example.com",
      assertApiUrlAllowed(url: string) {
        const allowed = [PROD_URL];
        const ok = allowed.some((a) => url === a || url.startsWith(`${a}/`));
        if (!ok) throw new Error(`[API 安全] 未登记域名: ${url}`);
      },
    }));
    const sseMock = vi.fn();
    vi.doMock("./sse-parser", () => ({ startSseRequest: sseMock }));
    setupWx();

    const { streamQuestion } = await import("./api-adapter");
    await expect(streamQuestion("s1", vi.fn())).rejects.toThrow(/未登记域名/);
    expect(sseMock).not.toHaveBeenCalled();
  });
});
