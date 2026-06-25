import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { LocaleMessages } from "../utils/i18n";

const en: LocaleMessages = { common: { appTitle: "Title" } };
const zh: LocaleMessages = { common: { appTitle: "标题" } };

beforeEach(() => {
  (globalThis as Record<string, unknown>).Behavior = vi.fn((def) => def);
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).Behavior;
});

function mockWxStorage(store: Record<string, unknown>) {
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

async function importBehavior() {
  return import("./i18n");
}

describe("i18n behavior", () => {
  beforeEach(() => {
    vi.resetModules();
    clearWx();
    (globalThis as Record<string, unknown>).Behavior = vi.fn((def) => def);
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).Behavior;
  });

  it("exports i18n instance initialized from storage", async () => {
    mockWxStorage({ "evaluater-locale": "zh" });
    const { i18n } = await importBehavior();
    expect(i18n.getLocale()).toBe("zh");
  });

  it("switchLocale updates locale and broadcasts to current pages", async () => {
    mockWxStorage({});
    const pages = [{ setData: vi.fn() }, { setData: vi.fn() }] as Array<{
      setData: ReturnType<typeof vi.fn>;
    }>;
    (globalThis as Record<string, unknown>).getCurrentPages = () => pages;

    const { switchLocale, i18n } = await importBehavior();
    switchLocale("zh");

    expect(i18n.getLocale()).toBe("zh");
    for (const page of pages) {
      expect(page.setData).toHaveBeenCalledWith({ locale: "zh" });
    }

    delete (globalThis as Record<string, unknown>).getCurrentPages;
  });

  it("switchLocale broadcasts locale to behavior listeners", async () => {
    mockWxStorage({});
    (globalThis as Record<string, unknown>).getCurrentPages = () => [];

    const { switchLocale, i18n } = await importBehavior();
    const setData = vi.fn();
    const component = { setData, refreshI18n: vi.fn() };

    // Register listener directly via the exposed behavior definition callback.
    // In real runtime, attached() adds `this` to the listener set.
    const addListener = (
      (globalThis as Record<string, unknown>).Behavior as ReturnType<
        typeof vi.fn
      >
    ).mock.calls[0][0] as Record<string, unknown>;
    const attached = (addListener.lifetimes as Record<string, () => void>)
      ?.attached;
    attached?.call(component);

    switchLocale("zh");

    expect(i18n.getLocale()).toBe("zh");
    expect(setData).toHaveBeenCalledWith({ locale: "zh" });

    delete (globalThis as Record<string, unknown>).getCurrentPages;
  });
});
