import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  readStoredLocale,
  writeStoredLocale,
  getValueByPath,
  interpolate,
  createI18n,
  STORAGE_KEY,
  DEFAULT_LOCALE,
} from "./i18n";

function setWxStorage(store: Record<string, unknown>) {
  (globalThis as Record<string, unknown>).wx = {
    getStorageSync: (key: string) => store[key],
    setStorageSync: (key: string, value: unknown) => {
      store[key] = value;
    },
  };
}

function clearWx() {
  delete (globalThis as Record<string, unknown>).wx;
}

describe("i18n helper", () => {
  beforeEach(() => {
    vi.resetModules();
    clearWx();
  });

  it("returns default locale when wx is unavailable", () => {
    expect(readStoredLocale()).toBe(DEFAULT_LOCALE);
  });

  it("reads supported locale from storage", () => {
    setWxStorage({ [STORAGE_KEY]: "zh" });
    expect(readStoredLocale()).toBe("zh");
  });

  it("falls back to default when stored locale is unsupported", () => {
    setWxStorage({ [STORAGE_KEY]: "fr" });
    expect(readStoredLocale()).toBe(DEFAULT_LOCALE);
  });

  it("writes locale to storage", () => {
    const store: Record<string, unknown> = {};
    setWxStorage(store);
    writeStoredLocale("zh");
    expect(store[STORAGE_KEY]).toBe("zh");
  });

  it("reads nested value by dot path", () => {
    const messages = { chat: { send: "Send" } };
    expect(getValueByPath(messages, "chat.send")).toBe("Send");
  });

  it("returns undefined for missing nested path", () => {
    const messages = { chat: { send: "Send" } };
    expect(getValueByPath(messages, "chat.missing")).toBeUndefined();
  });

  it("interpolates named placeholders", () => {
    expect(interpolate("Round {current}/{max}", { current: 3, max: 10 })).toBe(
      "Round 3/10"
    );
  });

  it("keeps unmatched placeholders as-is", () => {
    expect(interpolate("Hello {name}")).toBe("Hello {name}");
  });

  it("translates using current locale", () => {
    const { t } = createI18n({
      en: { chat: { send: "Send" } },
      zh: { chat: { send: "发送" } },
    });
    expect(t("chat.send")).toBe("Send");
  });

  it("falls back to en when key is missing in current locale", () => {
    const { t } = createI18n({
      en: { chat: { send: "Send" } },
      zh: { chat: {} },
    });
    expect(t("chat.send")).toBe("Send");
  });

  it("supports parameter interpolation in translation", () => {
    const { t } = createI18n({
      en: { chat: { round: "Round {current}/{max}" } },
      zh: { chat: { round: "第 {current}/{max} 轮" } },
    });
    expect(t("chat.round", { current: 3, max: 10 })).toBe("Round 3/10");
  });

  it("returns key when value is missing in both locales", () => {
    const { t } = createI18n({ en: {}, zh: {} });
    expect(t("missing.key")).toBe("missing.key");
  });

  it("updates current locale via setLocale", () => {
    const i18n = createI18n({
      en: { chat: { send: "Send" } },
      zh: { chat: { send: "发送" } },
    });
    i18n.setLocale("zh");
    expect(i18n.getLocale()).toBe("zh");
    expect(i18n.t("chat.send")).toBe("发送");
  });
});
