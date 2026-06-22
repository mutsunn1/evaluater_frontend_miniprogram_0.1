import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// config.ts 的 BASE_URL 解析契约：
// - release 环境 → 生产地址(强制，不接受存储覆盖)
// - develop / trial 环境 → 默认生产地址（避免 localhost 域名不合法）
// - 本地存储覆盖优先于 envVersion，但必须命中允许域名白名单
// - 存储覆盖的域名未在白名单内 → 忽略，回退到 envVersion 解析
// - wx 不可用时（纯 Node 测试 / vitest 无 wx）回退到生产地址，保证不抛错
// - assertApiUrlAllowed 在请求前拦截未登记域名，给出明确错误

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

async function importConfig() {
  return import("./config");
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
    const { API_BASE_URL } = await importConfig();
    expect(API_BASE_URL).toBe(PROD_URL);
  });

  it("develop 环境默认返回生产地址，避免 localhost 域名不合法", async () => {
    setEnvVersion("develop");
    const { API_BASE_URL } = await importConfig();
    expect(API_BASE_URL).toBe(PROD_URL);
  });

  it("trial 环境默认也返回生产地址", async () => {
    setEnvVersion("trial");
    const { API_BASE_URL } = await importConfig();
    expect(API_BASE_URL).toBe(PROD_URL);
  });

  it("release 模式不接受存储覆盖，强制使用生产地址", async () => {
    setEnvVersion("release");
    const wx = (globalThis as Record<string, unknown>).wx as Record<
      string,
      unknown
    >;
    // 即使是白名单内的开发地址，release 模式也强制忽略，防止线上被改址
    (wx.setStorageSync as (k: string, v: unknown) => void)(
      STORAGE_KEY,
      DEV_URL
    );
    const { API_BASE_URL } = await importConfig();
    expect(API_BASE_URL).toBe(PROD_URL);
  });

  it("develop/trial 模式下白名单内存储覆盖可指向本地开发地址", async () => {
    setEnvVersion("develop");
    const wx = (globalThis as Record<string, unknown>).wx as Record<
      string,
      unknown
    >;
    (wx.setStorageSync as (k: string, v: unknown) => void)(
      STORAGE_KEY,
      DEV_URL
    );
    const { API_BASE_URL } = await importConfig();
    expect(API_BASE_URL).toBe(DEV_URL);
  });

  it("存储覆盖为未登记域名时忽略，回退到 envVersion 解析", async () => {
    setEnvVersion("develop");
    const wx = (globalThis as Record<string, unknown>).wx as Record<
      string,
      unknown
    >;
    (wx.setStorageSync as (k: string, v: unknown) => void)(
      STORAGE_KEY,
      "https://attacker.example.com"
    );
    const { API_BASE_URL } = await importConfig();
    expect(API_BASE_URL).toBe(PROD_URL);
  });

  it("存储覆盖为空字符串时回退到 envVersion 解析", async () => {
    setEnvVersion("release");
    const wx = (globalThis as Record<string, unknown>).wx as Record<
      string,
      unknown
    >;
    (wx.setStorageSync as (k: string, v: unknown) => void)(STORAGE_KEY, "");
    const { API_BASE_URL } = await importConfig();
    expect(API_BASE_URL).toBe(PROD_URL);
  });

  it("wx 不可用时不抛错，回退到生产地址", async () => {
    clearWx();
    const { API_BASE_URL } = await importConfig();
    expect(API_BASE_URL).toBe(PROD_URL);
  });

  it("envVersion 缺失时回退到生产地址", async () => {
    (globalThis as Record<string, unknown>).wx = {
      getAccountInfoSync: () => ({ miniProgram: {} }),
      getStorageSync: () => undefined,
    };
    const { API_BASE_URL } = await importConfig();
    expect(API_BASE_URL).toBe(PROD_URL);
  });

  it("导出白名单和存储 key 供调用方使用", async () => {
    setEnvVersion("release");
    const { API_BASE_URL_STORAGE_KEY, ALLOWED_API_BASE_URLS } =
      await importConfig();
    expect(API_BASE_URL_STORAGE_KEY).toBe(STORAGE_KEY);
    expect(ALLOWED_API_BASE_URLS).toContain(PROD_URL);
    expect(ALLOWED_API_BASE_URLS).toContain(DEV_URL);
  });
});

describe("config — 运行时 URL 校验", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("assertApiUrlAllowed 允许已登记域名", async () => {
    setEnvVersion("release");
    const { assertApiUrlAllowed } = await importConfig();
    expect(() =>
      assertApiUrlAllowed(`${PROD_URL}/api/v1/sessions`)
    ).not.toThrow();
  });

  it("assertApiUrlAllowed 拒绝未登记域名", async () => {
    setEnvVersion("release");
    const { assertApiUrlAllowed } = await importConfig();
    expect(() =>
      assertApiUrlAllowed("https://attacker.example.com/api/v1/sessions")
    ).toThrow(/未.*登记|not.*allowed|not.*registered/i);
  });

  it("assertApiUrlAllowed 拒绝非 HTTPS 的生产请求", async () => {
    setEnvVersion("release");
    const { assertApiUrlAllowed } = await importConfig();
    expect(() =>
      assertApiUrlAllowed("http://evalapi.mutsum1.xyz/api/v1/sessions")
    ).toThrow(/HTTPS|https/i);
  });

  it("assertApiUrlAllowed 在 develop 模式下允许开发地址的 HTTP", async () => {
    setEnvVersion("develop");
    const { assertApiUrlAllowed } = await importConfig();
    expect(() =>
      assertApiUrlAllowed(`${DEV_URL}/api/v1/sessions`)
    ).not.toThrow();
  });
});
