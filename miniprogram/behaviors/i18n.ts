import { createI18n } from "../utils/i18n";
import en from "../locales/en";
import zh from "../locales/zh";

export const i18n = createI18n({ en, zh });

function getCurrentPagesSafe() {
  try {
    return getCurrentPages();
  } catch {
    return [];
  }
}

const localeListeners = new Set<Record<string, unknown>>();

function setLocaleOnInstance(instance: unknown, locale: "en" | "zh") {
  if (
    instance &&
    typeof (instance as Record<string, unknown>).setData === "function"
  ) {
    (instance as Record<string, unknown>).setData({ locale });
  }
}

function refreshI18nOnInstance(instance: unknown) {
  if (!instance) return;
  const refresh = (instance as Record<string, unknown>).refreshI18n;
  if (typeof refresh === "function") {
    refresh.call(instance);
  }
}

function broadcastLocale(locale: "en" | "zh") {
  const pages = getCurrentPagesSafe();
  const seen = new Set<unknown>();
  for (const page of pages) {
    if (seen.has(page)) continue;
    seen.add(page);
    setLocaleOnInstance(page, locale);
    refreshI18nOnInstance(page);
  }
  for (const listener of localeListeners) {
    if (seen.has(listener)) continue;
    seen.add(listener);
    setLocaleOnInstance(listener, locale);
    refreshI18nOnInstance(listener);
  }
}

export function switchLocale(locale: "en" | "zh") {
  i18n.setLocale(locale);
  broadcastLocale(locale);
}

function t(key: string, params?: Record<string, string | number>): string {
  return i18n.t(key, params);
}

const makeBehavior =
  typeof Behavior === "function"
    ? Behavior
    : (definition: object) => definition;

const i18nBehavior = makeBehavior({
  data: {
    locale: i18n.getLocale(),
  },

  observers: {
    locale: function () {
      const refresh = (this as Record<string, unknown>).refreshI18n;
      if (typeof refresh === "function") {
        refresh.call(this);
      }
    },
  },

  lifetimes: {
    attached() {
      this.setData({ locale: i18n.getLocale() });
      localeListeners.add(this as unknown as Record<string, unknown>);
      const refresh = (this as Record<string, unknown>).refreshI18n;
      if (typeof refresh === "function") {
        refresh.call(this);
      }
    },
    detached() {
      localeListeners.delete(this as unknown as Record<string, unknown>);
    },
  },

  methods: {
    t,
    switchLocale(locale: "en" | "zh") {
      switchLocale(locale);
    },
  },
});

export default i18nBehavior;
