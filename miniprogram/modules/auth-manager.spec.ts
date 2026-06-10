import { describe, it, expect, beforeEach } from "vitest";

// We mock wx.storage APIs
const storage = new Map<string, unknown>();

function mockWx() {
  (globalThis as Record<string, unknown>).wx = {
    getStorageSync(key: string) {
      return storage.get(key) ?? null;
    },
    setStorageSync(key: string, value: unknown) {
      storage.set(key, value);
    },
    removeStorageSync(key: string) {
      storage.delete(key);
    },
  };
}

function clearWx() {
  delete (globalThis as Record<string, unknown>).wx;
}

describe("auth-manager", () => {
  beforeEach(() => {
    storage.clear();
  });

  it("getUserId returns null when no stored ID", async () => {
    mockWx();
    const { getUserId } = await import("./auth-manager");
    expect(getUserId()).toBeNull();
    clearWx();
  });

  it("setUserId and getUserId round-trip", async () => {
    mockWx();
    const { setUserId, getUserId } = await import("./auth-manager");
    setUserId("test-user-123");
    expect(getUserId()).toBe("test-user-123");
    clearWx();
  });

  it("clearUserId removes stored ID", async () => {
    mockWx();
    const { setUserId, clearUserId, getUserId } =
      await import("./auth-manager");
    setUserId("test-user-123");
    clearUserId();
    expect(getUserId()).toBeNull();
    clearWx();
  });

  it("getUserId returns null when wx is unavailable", async () => {
    // Don't set up wx
    const { getUserId } = await import("./auth-manager");
    expect(getUserId()).toBeNull();
  });

  it("setUserId does not throw when wx is unavailable", async () => {
    const { setUserId } = await import("./auth-manager");
    expect(() => setUserId("test")).not.toThrow();
  });
});
