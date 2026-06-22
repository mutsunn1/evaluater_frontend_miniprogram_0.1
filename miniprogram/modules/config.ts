/**
 * 运行时配置：按微信小程序环境解析 API 基址，并做域名安全校验。
 *
 * 解析顺序（前者优先）：
 *   1. release 模式 → 强制使用生产地址（忽略任何存储覆盖，防止线上被改址）
 *   2. develop/trial 模式下的本地存储覆盖（wx.getStorageSync）
 *      —— 值必须在 ALLOWED_API_BASE_URLS 白名单内，否则忽略
 *   3. wx.getAccountInfoSync().miniProgram.envVersion
 *        release        → 生产地址
 *        develop/trial  → 生产地址（默认直连已登记域名，避免 localhost 域名不合法）
 *   4. wx 不可用或缺字段 → 生产地址兜底
 *
 * 安全约束：
 *   - 所有可能访问的 API 基址必须登记在 ALLOWED_API_BASE_URLS 中
 *   - 请求前可调用 assertApiUrlAllowed(url) 拦截未登记域名
 *   - release 模式强制 HTTPS，非 release 才允许 HTTP 开发地址
 *
 * 本地开发：在微信开发者工具开启「不校验合法域名」，或执行
 *   wx.setStorageSync(API_BASE_URL_STORAGE_KEY, "http://localhost:8000")
 * 真机调试：使用白名单内的内网穿透地址（通过 wx.setStorageSync 设置）。
 */

const PROD_BASE_URL = "https://evalapi.mutsum1.xyz";
const DEV_BASE_URL = "http://localhost:8000";

/**
 * 允许小程序请求的后端 API 基址白名单。
 * 管理后台「request 合法域名」必须逐一包含这些域名，否则真机请求会被微信拦截。
 */
export const ALLOWED_API_BASE_URLS: readonly string[] = [
  PROD_BASE_URL,
  DEV_BASE_URL,
  // 真机调试/体验版可在此追加内网穿透地址，并同步登记到小程序后台
];

export const API_BASE_URL_STORAGE_KEY = "evaluator_api_base_url";

type EnvVersion = "develop" | "trial" | "release";

type WxLike = {
  getAccountInfoSync?: () => {
    miniProgram?: { envVersion?: EnvVersion };
  };
  getStorageSync?: (key: string) => unknown;
};

function getWx(): WxLike | undefined {
  return (globalThis as Record<string, unknown>).wx as WxLike | undefined;
}

function getEnvVersion(wx: WxLike): EnvVersion | undefined {
  try {
    return wx.getAccountInfoSync?.()?.miniProgram?.envVersion;
  } catch {
    return undefined;
  }
}

function isAllowedUrl(url: string): boolean {
  return ALLOWED_API_BASE_URLS.some(
    (allowed) => url === allowed || url.startsWith(`${allowed}/`)
  );
}

function readStorageOverride(wx: WxLike): string | undefined {
  try {
    const raw = wx.getStorageSync?.(API_BASE_URL_STORAGE_KEY);
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed && isAllowedUrl(trimmed)) return trimmed;
    }
  } catch {
    // 存储读取异常时忽略，走 envVersion 解析
  }
  return undefined;
}

function resolveByEnvVersion(env: EnvVersion | undefined): string {
  // develop/trial 默认也走生产域名，避免开发者工具报 localhost 不合法。
  // 本地开发可通过白名单存储覆盖指向 localhost 或内网穿透地址。
  return PROD_BASE_URL;
}

function resolveBaseUrl(): string {
  const wx = getWx();
  if (!wx) return PROD_BASE_URL;

  const env = getEnvVersion(wx);

  // release 模式强制生产地址，不接受任何覆盖，避免线上被改址或审核风险
  if (env === "release") return PROD_BASE_URL;

  // develop/trial 模式：白名单内的存储覆盖优先
  return readStorageOverride(wx) ?? resolveByEnvVersion(env);
}

/**
 * 请求前调用，确保 URL 命中 ALLOWED_API_BASE_URLS 白名单。
 * 在 release 模式下同时强制 HTTPS。
 *
 * 使用场景：api-adapter 的 request/streamRequest 入口、uploadSpeechRecording 等。
 * 拦截到未登记域名时抛出明确错误，避免向微信未报备域名发起请求。
 */
export function assertApiUrlAllowed(url: string): void {
  if (!url) {
    throw new Error("[API 安全] 请求 URL 为空");
  }

  const wx = getWx();
  const env = getEnvVersion(wx);
  const isRelease = env === "release";

  // release 模式强制 HTTPS（微信生产域名必须备案 HTTPS，也避免明文传输）
  if (isRelease && !url.startsWith("https://")) {
    throw new Error(`[API 安全] release 模式下必须使用 HTTPS 访问后端: ${url}`);
  }

  if (!isAllowedUrl(url)) {
    throw new Error(
      `[API 安全] 请求域名未在小程序后台登记，且不在 ALLOWED_API_BASE_URLS 白名单内: ${url}\n` +
        `请先在 mp.weixin.qq.com → 开发 → 开发管理 → 服务器域名 → request 合法域名中添加该域名，\n` +
        `再将域名加入 miniprogram/modules/config.ts 的 ALLOWED_API_BASE_URLS。`
    );
  }
}

export const API_BASE_URL: string = resolveBaseUrl();
