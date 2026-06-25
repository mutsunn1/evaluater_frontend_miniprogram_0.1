import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(__dirname);

function read(name: string): string {
  return readFileSync(resolve(dir, name), "utf8");
}

describe("nav-bar layout contract", () => {
  it("renders the mobile web business bar without fixed overlay spacing", () => {
    const wxss = read("nav-bar.wxss");
    const wxml = read("nav-bar.wxml");

    expect(wxml).toContain("{{i18n.appTitle}}");
    expect(wxml).toContain("{{i18n.endEvaluation}}");
    expect(wxml).toContain("{{i18n.logout}}");
    expect(wxss).not.toContain("position: fixed");
    expect(wxml).not.toContain('height: {{layout.totalHeight}}px;"></view>');
  });

  it("keeps action buttons compact so they cannot cover the title area", () => {
    const wxss = read("nav-bar.wxss");
    const wxml = read("nav-bar.wxml");

    expect(wxml).not.toContain('<button class="profile-btn"');
    expect(wxml).not.toContain('<button class="action-btn');
    expect(wxss).toContain("grid-template-columns: 72rpx minmax(0, 1fr) auto");
    expect(wxss).toContain("max-width: 72rpx");
    expect(wxss).toContain("width: 156rpx");
    expect(wxss).toContain("width: 100rpx");
    expect(wxss).toContain("overflow: hidden");
  });
});
