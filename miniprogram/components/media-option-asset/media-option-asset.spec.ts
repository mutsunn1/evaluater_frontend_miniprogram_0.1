import { describe, it, expect } from "vitest";
import type { MediaAsset } from "../../types";

// media-option-asset renders a thumbnail for option media assets.
// Only images get a visible thumbnail in phase 1; audio gets an icon.

interface OptionMediaDisplay {
  isImage: boolean;
  isAudio: boolean;
  isVideo: boolean;
  hasMedia: boolean;
}

function deriveOptionMedia(asset: MediaAsset | undefined): OptionMediaDisplay {
  if (!asset)
    return { isImage: false, isAudio: false, isVideo: false, hasMedia: false };
  return {
    isImage: asset.type === "image",
    isAudio: asset.type === "audio",
    isVideo: asset.type === "video",
    hasMedia: true,
  };
}

const imgAsset: MediaAsset = {
  id: "opt_img",
  type: "image",
  role: "option",
  source: "prepared",
  url: "https://example.test/apple.png",
  alt: "苹果",
};

const audioAsset: MediaAsset = {
  id: "opt_aud",
  type: "audio",
  role: "option",
  source: "prepared",
  url: "https://example.test/word.mp3",
  alt: "单词发音",
};

describe("media-option-asset derivation", () => {
  it("image asset → isImage true", () => {
    const d = deriveOptionMedia(imgAsset);
    expect(d.hasMedia).toBe(true);
    expect(d.isImage).toBe(true);
    expect(d.isAudio).toBe(false);
  });

  it("audio asset → isAudio true", () => {
    const d = deriveOptionMedia(audioAsset);
    expect(d.hasMedia).toBe(true);
    expect(d.isImage).toBe(false);
    expect(d.isAudio).toBe(true);
  });

  it("undefined asset → hasMedia false", () => {
    const d = deriveOptionMedia(undefined);
    expect(d.hasMedia).toBe(false);
  });
});
