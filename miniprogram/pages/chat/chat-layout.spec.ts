import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(__dirname);

function read(name: string): string {
  return readFileSync(resolve(dir, name), "utf8");
}

describe("chat page layout contract", () => {
  it("keeps the bottom input area visible while the message list grows", () => {
    const wxss = read("chat.wxss");

    expect(wxss).toContain(".chat-area");
    expect(wxss).toContain("flex: 1");
    expect(wxss).toContain("height: 0");
    expect(wxss).not.toContain("height: 100%");
    expect(wxss).toContain("box-sizing: border-box");
  });
});
