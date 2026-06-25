import { i18n } from "../behaviors/i18n";

export function buildI18n<T extends Record<string, string>>(
  map: T
): { [K in keyof T]: string } {
  const out = {} as { [K in keyof T]: string };
  for (const key in map) {
    out[key] = i18n.t(map[key]);
  }
  return out;
}
