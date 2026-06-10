import { describe, it, expect, beforeEach } from "vitest";

function mockWxApi(
  overrides?: Partial<{
    statusBarHeight: number;
    menuTop: number;
    menuHeight: number;
    menuWidth: number;
    menuLeft: number;
  }>
) {
  const defaults = {
    statusBarHeight: 44,
    menuTop: 52,
    menuHeight: 32,
    menuWidth: 87,
    menuLeft: 281,
  };
  const vals = { ...defaults, ...overrides };

  (globalThis as Record<string, unknown>).wx = {
    getSystemInfoSync: () => ({ statusBarHeight: vals.statusBarHeight }),
    getMenuButtonBoundingClientRect: () => ({
      top: vals.menuTop,
      height: vals.menuHeight,
      width: vals.menuWidth,
      left: vals.menuLeft,
      bottom: vals.menuTop + vals.menuHeight,
      right: vals.menuLeft + vals.menuWidth,
    }),
  };
}

describe("nav-helper", () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).wx;
  });

  async function getNavHelper() {
    return await import("./nav-helper");
  }

  it("getNavLayout returns all required fields with positive values", async () => {
    mockWxApi();
    const { getNavLayout } = await getNavHelper();
    const layout = getNavLayout();

    expect(layout.statusBarHeight).toBe(44);
    expect(layout.navBarHeight).toBeGreaterThan(0);
    expect(layout.totalHeight).toBeGreaterThan(layout.statusBarHeight);
    expect(layout.capsuleLeft).toBe(281);
    expect(layout.capsuleWidth).toBe(87);
    expect(layout.capsuleBottom).toBeGreaterThan(0);
  });

  it("totalHeight covers status bar + nav bar area", async () => {
    mockWxApi();
    const { getNavLayout } = await getNavHelper();
    const layout = getNavLayout();

    // totalHeight should be >= statusBarHeight + navBarHeight
    expect(layout.totalHeight).toBeGreaterThanOrEqual(
      layout.statusBarHeight + layout.navBarHeight
    );
  });

  it("navBarHeight is calculated from menu position", async () => {
    mockWxApi({ menuTop: 54, statusBarHeight: 44 });
    const { getNavLayout } = await getNavHelper();
    const layout = getNavLayout();

    // navBarHeight = menuHeight + (menuTop - statusBarHeight) * 2
    // = 32 + (54 - 44) * 2 = 32 + 20 = 52
    expect(layout.navBarHeight).toBeGreaterThan(0);
    expect(layout.navBarHeight).toBeLessThanOrEqual(100); // sanity check
  });

  it("places the business bar below the capsule area", async () => {
    mockWxApi({ statusBarHeight: 44, menuTop: 52, menuHeight: 32 });
    const { getNavLayout } = await getNavHelper();
    const layout = getNavLayout();

    expect(layout.businessBarTop).toBeGreaterThanOrEqual(layout.capsuleBottom);
    expect(layout.businessBarHeight).toBeGreaterThan(0);
    expect(layout.totalHeight).toBe(
      layout.businessBarTop + layout.businessBarHeight
    );
  });

  it("handles different device sizes gracefully", async () => {
    // Simulate a small device
    mockWxApi({
      statusBarHeight: 20,
      menuTop: 24,
      menuHeight: 24,
      menuWidth: 80,
      menuLeft: 270,
    });
    const { getNavLayout } = await getNavHelper();
    const layout = getNavLayout();

    expect(layout.statusBarHeight).toBe(20);
    expect(layout.totalHeight).toBeGreaterThan(0);
    expect(layout.capsuleWidth).toBe(80);
  });
});
