const STORAGE_KEY = "evaluator_user_id";

export function getUserId(): string | null {
  try {
    const wx = (globalThis as Record<string, unknown>).wx as
      | {
          getStorageSync: (key: string) => unknown;
        }
      | undefined;
    if (!wx?.getStorageSync) return null;
    const val = wx.getStorageSync(STORAGE_KEY);
    return typeof val === "string" && val.length > 0 ? val : null;
  } catch {
    return null;
  }
}

export function setUserId(id: string): void {
  try {
    const wx = (globalThis as Record<string, unknown>).wx as
      | {
          setStorageSync: (key: string, value: unknown) => void;
        }
      | undefined;
    wx?.setStorageSync?.(STORAGE_KEY, id);
  } catch {
    // Silently fail — storage is best-effort
  }
}

export function clearUserId(): void {
  try {
    const wx = (globalThis as Record<string, unknown>).wx as
      | {
          removeStorageSync: (key: string) => void;
        }
      | undefined;
    wx?.removeStorageSync?.(STORAGE_KEY);
  } catch {
    // Silently fail
  }
}
