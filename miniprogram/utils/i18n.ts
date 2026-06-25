export type SupportedLocale = "en" | "zh";

export const STORAGE_KEY = "evaluater-locale";
export const DEFAULT_LOCALE: SupportedLocale = "en";
export const FALLBACK_LOCALE: SupportedLocale = "en";

export type LocaleMessages = Record<string, unknown>;

function isSupportedLocale(value: string): value is SupportedLocale {
  return value === "en" || value === "zh";
}

function getWx() {
  return (globalThis as Record<string, unknown>).wx as
    | {
        getStorageSync?: (key: string) => unknown;
        setStorageSync?: (key: string, value: unknown) => void;
      }
    | undefined;
}

export function readStoredLocale(): SupportedLocale {
  const wx = getWx();
  if (!wx) return DEFAULT_LOCALE;
  try {
    const raw = wx.getStorageSync?.(STORAGE_KEY);
    if (typeof raw === "string" && isSupportedLocale(raw)) {
      return raw;
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_LOCALE;
}

export function writeStoredLocale(locale: SupportedLocale): void {
  const wx = getWx();
  if (!wx) return;
  try {
    wx.setStorageSync?.(STORAGE_KEY, locale);
  } catch {
    // ignore storage errors
  }
}

export function getValueByPath(
  messages: LocaleMessages,
  path: string
): string | undefined {
  const parts = path.split(".");
  let current: unknown = messages;
  for (const part of parts) {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

export function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

export function createI18n(messages: Record<SupportedLocale, LocaleMessages>) {
  let currentLocale: SupportedLocale = readStoredLocale();

  function getLocale(): SupportedLocale {
    return currentLocale;
  }

  function setLocale(locale: SupportedLocale): void {
    currentLocale = locale;
    writeStoredLocale(locale);
  }

  function t(key: string, params?: Record<string, string | number>): string {
    const value =
      getValueByPath(messages[currentLocale], key) ??
      getValueByPath(messages[FALLBACK_LOCALE], key);
    if (typeof value !== "string") return key;
    return interpolate(value, params);
  }

  return { getLocale, setLocale, t };
}
