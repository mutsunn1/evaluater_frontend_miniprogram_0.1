import { describe, it, expect, vi } from "vitest";

describe("debug i18n listener", () => {
  it("logs behavior registration", async () => {
    (globalThis as any).Behavior = (def: any) => def;
    (globalThis as any).wx = {
      getStorageSync: () => undefined,
      setStorageSync: () => {},
    };
    (globalThis as any).getCurrentPages = () => [];

    const mod = await import("./miniprogram/behaviors/i18n");
    const behaviorDef = (globalThis as any).Behavior({});
    const setData = vi.fn();
    const component = { setData, refreshI18n: vi.fn() };

    behaviorDef.lifetimes.attached.call(component);
    console.log("listeners attached, switching locale");
    mod.switchLocale("zh");
    console.log("setData calls:", setData.mock.calls);
    expect(setData).toHaveBeenCalledWith({ locale: "zh" });
  });
});
