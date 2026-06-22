/**
 * 运行时配置：按微信小程序环境解析 API 基址。
 *
 * 解析顺序（前者优先）：
 *   1. 本地存储覆盖（wx.getStorageSync(API_BASE_URL_STORAGE_KEY)）
 *      —— 真机调试时可用 wx.setStorageSync 临时换址，不必改源码。
 *   2. wx.getAccountInfoSync().miniProgram.envVersion
 *        release        → 生产地址
 *        develop/trial  → 开发地址（localhost:8000，开发者工具模拟器/真机调试）
 *   3. wx 不可用或缺字段 → 生产地址（兜底，保证不抛错）
 *
 * 注意：真机上 localhost 指手机本身而非开发机，真机调试需通过存储覆盖
 * 指向内网穿透地址（如 cpolar/ngrok 暴露的 URL）。
 */

const PROD_BASE_URL = "https://evalapi.mutsum1.xyz";
const DEV_BASE_URL = "http://localhost:8000";

export const API_BASE_URL_STORAGE_KEY = "evaluator_api_base_url";

type WxLike = {
  getAccountInfoSync?: () => {
    miniProgram?: { envVersion?: "develop" | "trial" | "release" };
  };
  getStorageSync?: (key: string) => unknown;
};

function getWx(): WxLike | undefined {
  return (globalThis as Record<string, unknown>).wx as WxLike | undefined;
}

function readStorageOverride(wx: WxLike): string | undefined {
  try {
    const raw = wx.getStorageSync?.(API_BASE_URL_STORAGE_KEY);
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  } catch {
    // 存储读取异常时忽略，走 envVersion 解析
  }
  return undefined;
}

function resolveByEnvVersion(wx: WxLike): string {
  try {
    const info = wx.getAccountInfoSync?.();
    const env = info?.miniProgram?.envVersion;
    if (env === "develop" || env === "trial") return DEV_BASE_URL;
  } catch {
    // envVersion 读取异常时回退到生产地址
  }
  return PROD_BASE_URL;
}

function resolveBaseUrl(): string {
  const wx = getWx();
  if (!wx) return PROD_BASE_URL;
  return readStorageOverride(wx) ?? resolveByEnvVersion(wx);
}

export const API_BASE_URL: string = resolveBaseUrl();
