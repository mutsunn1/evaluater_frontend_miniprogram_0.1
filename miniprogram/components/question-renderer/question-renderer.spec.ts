import { describe, it, expect } from "vitest";
import type { MediaAsset, QuestionOption } from "../../types";

interface QuestionSegment {
  type: "text" | "image";
  content?: string;
  src?: string;
  alt?: string;
  style?: string;
}

function parseQuestionText(text: string): QuestionSegment[] {
  const segments: QuestionSegment[] = [];
  const imgRegex = /<img\s+([^>]+)>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }

    const attrText = match[1];
    const src = /src\s*=\s*["']([^"']+)["']/i.exec(attrText)?.[1] || "";
    const alt = /alt\s*=\s*["']([^"']*)["']/i.exec(attrText)?.[1] || "";
    const style = /style\s*=\s*["']([^"']*)["']/i.exec(attrText)?.[1] || "";

    segments.push({ type: "image", src, alt, style });
    lastIndex = imgRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}

describe("parseQuestionText splits text and inline images", () => {
  it("returns a single text segment when no img tag", () => {
    const segments = parseQuestionText("请选择正确的词语。");
    expect(segments).toEqual([{ type: "text", content: "请选择正确的词语。" }]);
  });

  it("extracts img src, alt, and style", () => {
    const text =
      "请看图片：<img src='https://example.test/apple.png' alt='苹果' style='width:100px;height:100px;'> 选择词语";
    const segments = parseQuestionText(text);
    expect(segments).toEqual([
      { type: "text", content: "请看图片：" },
      {
        type: "image",
        src: "https://example.test/apple.png",
        alt: "苹果",
        style: "width:100px;height:100px;",
      },
      { type: "text", content: " 选择词语" },
    ]);
  });

  it("handles double quotes around attributes", () => {
    const text =
      'A<img src="https://example.test/b.png" alt="香蕉" style="width:80px;">B';
    const segments = parseQuestionText(text);
    expect(segments).toEqual([
      { type: "text", content: "A" },
      {
        type: "image",
        src: "https://example.test/b.png",
        alt: "香蕉",
        style: "width:80px;",
      },
      { type: "text", content: "B" },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(parseQuestionText("")).toEqual([]);
  });
});

describe("multiple-choice answer format", () => {
  function formatSingleChoice(selected: string): string {
    return selected || "";
  }

  function formatMultiSelect(selected: string[]): string {
    return selected.filter(Boolean).sort().join(",");
  }

  it("single choice returns the selected index", () => {
    expect(formatSingleChoice("A")).toBe("A");
    expect(formatSingleChoice("")).toBe("");
  });

  it("multi-select returns sorted comma-separated indices", () => {
    expect(formatMultiSelect(["B", "A"])).toBe("A,B");
    expect(formatMultiSelect([])).toBe("");
    expect(formatMultiSelect(["C"])).toBe("C");
  });
});

describe("true-false answer format", () => {
  function formatTF(val: string): string {
    return val === "true" ? "true" : "false";
  }

  it('emits "true" or "false" as string', () => {
    expect(formatTF("true")).toBe("true");
    expect(formatTF("false")).toBe("false");
    expect(formatTF("")).toBe("false");
  });
});

describe("fill-in-blank answer format", () => {
  function formatSingle(blank: string): string {
    return blank.trim();
  }

  function formatMulti(blanks: string[]): string {
    return blanks.map((b) => b.trim()).join(",");
  }

  it("single blank trims whitespace", () => {
    expect(formatSingle("  hello  ")).toBe("hello");
  });

  it("multi-blank joins with comma", () => {
    expect(formatMulti(["a", "b", "c"])).toBe("a,b,c");
  });

  it("multi-blank preserves empty strings", () => {
    expect(formatMulti(["a", "", "c"])).toBe("a,,c");
  });
});

describe("reading-comprehension answer format", () => {
  function formatAnswers(
    subIds: string[],
    answers: Record<string, string>
  ): string {
    return subIds.map((id) => `[${id}] ${answers[id] || ""}`).join("\n");
  }

  it("formats answers with sub_ids", () => {
    expect(formatAnswers(["s1", "s2"], { s1: "ans1", s2: "ans2" })).toBe(
      "[s1] ans1\n[s2] ans2"
    );
  });

  it("handles missing answers", () => {
    expect(formatAnswers(["s1"], {})).toBe("[s1] ");
  });
});

// ================================================================
//  Option media asset matching
// ================================================================

describe("option media asset matching", () => {
  function buildOptionAssets(
    options: QuestionOption[],
    media: MediaAsset[]
  ): Array<{ index: string; asset: MediaAsset | null }> {
    return options.map((opt) => ({
      index: opt.index,
      asset: opt.media_id
        ? media.find((m) => m.id === opt.media_id) || null
        : null,
    }));
  }

  const media: MediaAsset[] = [
    {
      id: "img_apple",
      type: "image",
      role: "option",
      source: "prepared",
      url: "https://example.test/apple.png",
      alt: "苹果",
    },
    {
      id: "aud_word",
      type: "audio",
      role: "option",
      source: "prepared",
      url: "https://example.test/word.mp3",
      alt: "发音",
    },
  ];

  it("matches option media_id to asset", () => {
    const opts: QuestionOption[] = [
      { index: "A", text: "苹果", media_id: "img_apple" },
      { index: "B", text: "香蕉", media_id: undefined },
    ];
    const result = buildOptionAssets(opts, media);
    expect(result[0].asset).not.toBeNull();
    expect(result[0].asset!.id).toBe("img_apple");
    expect(result[1].asset).toBeNull();
  });

  it("audio media_id matches to audio asset", () => {
    const opts: QuestionOption[] = [
      { index: "A", text: "播放", media_id: "aud_word" },
    ];
    const result = buildOptionAssets(opts, media);
    expect(result[0].asset).not.toBeNull();
    expect(result[0].asset!.type).toBe("audio");
  });

  it("nonexistent media_id returns null", () => {
    const opts: QuestionOption[] = [
      { index: "A", text: "幽灵", media_id: "ghost_id" },
    ];
    const result = buildOptionAssets(opts, media);
    expect(result[0].asset).toBeNull();
  });

  it("no media_id returns null asset", () => {
    const opts: QuestionOption[] = [{ index: "A", text: "无媒体" }];
    const result = buildOptionAssets(opts, []);
    expect(result[0].asset).toBeNull();
  });
});
