import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// config.ts 的 BASE_URL 解析契约：
// - release 环境 → 生产地址
// - develop / trial 环境 → 开发地址 (localhost:8000)
// - 本地存储覆盖优先（真机调试时改 storage 即可换址，不改源码）
// - wx 不可用时（纯 Node 测试 / vitest 无 wx）回退到生产地址，保证不抛错

const PROD_URL = "https://evalapi.mutsum1.xyz";
const DEV_URL = "http://localhost:8000";
const STORAGE_KEY = "evaluator_api_base_url";

function setEnvVersion(version: "develop" | "trial" | "release") {
  (globalThis as Record<string, unknown>).wx = {
    getAccountInfoSync: () => ({
      miniProgram: { envVersion: version },
    }),
    getStorageSync: (key: string) => {
      const store = (globalThis as Record<string, unknown>).__storage as
        | Record<string, unknown>
        | undefined;
      return store?.[key];
    },
    setStorageSync: (key: string, value: unknown) => {
      const g = globalThis as Record<string, unknown>;
      if (!g.__storage) g.__storage = {};
      g.__storage[key] = value;
    },
  };
}

function clearWx() {
  delete (globalThis as Record<string, unknown>).wx;
  delete (globalThis as Record<string, unknown>).__storage;
}

describe("config — BASE_URL 解析", () => {
  beforeEach(() => {
    vi.resetModules();
    (globalThis as Record<string, unknown>).__storage = {};
  });

  afterEach(() => {
    clearWx();
  });

  it("release 环境返回生产地址", async () => {
    setEnvVersion("release");
    const { API_BASE_URL } = await import("./config");
    expect(API_BASE_URL).toBe(PROD_URL);
  });

  it("develop 环境返回开发地址 localhost:8000", async () => {
    setEnvVersion("develop");
    const { API_BASE_URL } = await import("./config");
    expect(API_BASE_URL).toBe(DEV_URL);
  });

  it("trial 环境也返回开发地址（体验版通常连测试环境）", async () => {
    setEnvVersion("trial");
    const { API_BASE_URL } = await import("./config");
    expect(API_BASE_URL).toBe(DEV_URL);
  });

  it("本地存储覆盖优先于 envVersion", async () => {
    setEnvVersion("release");
    const wx = (globalThis as Record<string, unknown>).wx as Record<
      string,
      unknown
    >;
    (wx.setStorageSync as (k: string, v: unknown) => void)(
      STORAGE_KEY,
      "https://my-tunnel.example.com"
    );
    const { API_BASE_URL } = await import("./config");
    expect(API_BASE_URL).toBe("https://my-tunnel.example.com");
  });

  it("存储覆盖为空字符串时回退到 envVersion 解析", async () => {
    setEnvVersion("release");
    const wx = (globalThis as Record<string, unknown>).wx as Record<
      string,
      unknown
    >;
    (wx.setStorageSync as (k: string, v: unknown) => void)(STORAGE_KEY, "");
    const { API_BASE_URL } = await import("./config");
    expect(API_BASE_URL).toBe(PROD_URL);
  });

  it("wx 不可用时不抛错，回退到生产地址", async () => {
    clearWx();
    const { API_BASE_URL } = await import("./config");
    expect(API_BASE_URL).toBe(PROD_URL);
  });

  it("envVersion 缺失时回退到生产地址", async () => {
    (globalThis as Record<string, unknown>).wx = {
      getAccountInfoSync: () => ({ miniProgram: {} }),
      getStorageSync: () => undefined,
    };
    const { API_BASE_URL } = await import("./config");
    expect(API_BASE_URL).toBe(PROD_URL);
  });

  it("导出存储 key 供调试覆盖使用", async () => {
    setEnvVersion("release");
    const { API_BASE_URL_STORAGE_KEY } = await import("./config");
    expect(API_BASE_URL_STORAGE_KEY).toBe(STORAGE_KEY);
  });
});
