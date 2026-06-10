import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(__dirname);

function read(name: string): string {
  return readFileSync(resolve(dir, name), "utf8");
}

describe("profile-drawer layout contract", () => {
  it("participates in page flow instead of covering chat content", () => {
    const wxss = read("profile-drawer.wxss");
    const wxml = read("profile-drawer.wxml");

    expect(wxss).not.toContain("position: fixed");
    expect(wxml).not.toContain("topOffset");
  });

  it("uses the web mobile two-column skill layout and color semantics", () => {
    const wxss = read("profile-drawer.wxss");
    const wxml = read("profile-drawer.wxml");

    expect(wxml).toContain("skill-grid");
    expect(wxml).toContain("{{item.display}}");
    expect(wxss).toContain("grid-template-columns: 1fr 1fr");
    expect(wxss).toContain(".skill-purple");
    expect(wxss).toContain(".skill-green");
    expect(wxss).toContain(".skill-orange");
  });
});
