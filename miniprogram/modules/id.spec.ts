import { describe, it, expect } from "vitest";
import { createClientId } from "./id";

describe("createClientId", () => {
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  it("returns a string matching UUID v4 format", () => {
    const id = createClientId();
    expect(id).toMatch(UUID_RE);
  });

  it("returns unique values across multiple calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => createClientId()));
    expect(ids.size).toBe(100);
  });

  it("does not throw when called repeatedly", () => {
    for (let i = 0; i < 1000; i++) {
      expect(() => createClientId()).not.toThrow();
    }
  });
});
