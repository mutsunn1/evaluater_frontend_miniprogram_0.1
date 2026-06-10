import { describe, it, expect } from "vitest";
import type { MediaAsset } from "../../types";

// The media-prompt-block component derives display state from a MediaAsset.
// These tests verify the derivation logic — the WXML branches on these values.

interface MediaDisplay {
  isImage: boolean;
  isAudio: boolean;
  isVideo: boolean;
  hasAlt: boolean;
  altText: string;
}

function deriveDisplay(asset: MediaAsset): MediaDisplay {
  return {
    isImage: asset.type === "image",
    isAudio: asset.type === "audio",
    isVideo: asset.type === "video",
    hasAlt: !!asset.alt,
    altText: asset.alt || "",
  };
}

const imageAsset: MediaAsset = {
  id: "img1",
  type: "image",
  role: "prompt",
  source: "prepared",
  url: "https://example.test/test.png",
  alt: "测试图片",
};

const audioAsset: MediaAsset = {
  id: "aud1",
  type: "audio",
  role: "prompt",
  source: "generated",
  url: "https://example.test/test.mp3",
  alt: "音频提示",
};

const videoAsset: MediaAsset = {
  id: "vid1",
  type: "video",
  role: "prompt",
  source: "prepared",
  url: "https://example.test/test.mp4",
  alt: "视频提示",
};

const noAltAsset: MediaAsset = {
  id: "img2",
  type: "image",
  role: "prompt",
  source: "prepared",
  url: "https://example.test/no-alt.png",
};

describe("media-prompt-block derivation", () => {
  it("image type → isImage true, isAudio false, isVideo false", () => {
    const d = deriveDisplay(imageAsset);
    expect(d.isImage).toBe(true);
    expect(d.isAudio).toBe(false);
    expect(d.isVideo).toBe(false);
  });

  it("audio type → isAudio true, others false", () => {
    const d = deriveDisplay(audioAsset);
    expect(d.isImage).toBe(false);
    expect(d.isAudio).toBe(true);
    expect(d.isVideo).toBe(false);
  });

  it("video type → isVideo true, others false", () => {
    const d = deriveDisplay(videoAsset);
    expect(d.isImage).toBe(false);
    expect(d.isAudio).toBe(false);
    expect(d.isVideo).toBe(true);
  });

  it("renders alt text when present", () => {
    const d = deriveDisplay(imageAsset);
    expect(d.hasAlt).toBe(true);
    expect(d.altText).toBe("测试图片");
  });

  it("audio has alt text", () => {
    const d = deriveDisplay(audioAsset);
    expect(d.hasAlt).toBe(true);
    expect(d.altText).toBe("音频提示");
  });

  it("video has alt text", () => {
    const d = deriveDisplay(videoAsset);
    expect(d.hasAlt).toBe(true);
    expect(d.altText).toBe("视频提示");
  });

  it("no alt → hasAlt false, altText empty", () => {
    const d = deriveDisplay(noAltAsset);
    expect(d.hasAlt).toBe(false);
    expect(d.altText).toBe("");
  });
});
