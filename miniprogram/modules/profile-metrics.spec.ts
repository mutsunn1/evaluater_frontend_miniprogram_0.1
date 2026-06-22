import { describe, it, expect } from "vitest";
import type { UserProfileData } from "../types";
import { buildProfileSkillRows } from "./profile-metrics";

function profile(overrides: Partial<UserProfileData> = {}): UserProfileData {
  return {
    user_id: "1",
    hsk_level: 3,
    skill_levels: {
      hsk: 3,
      vocabulary: 1.34,
      grammar: 1.13,
      reading: 0.26,
      speaking: 0,
    },
    native_language: null,
    stubborn_errors: [],
    strengths: [],
    next_focus: [],
    updated_at: null,
    ...overrides,
  };
}

describe("profile metrics", () => {
  it("formats HSK dimensions as web-style percentages with stable color keys", () => {
    const rows = buildProfileSkillRows(profile());

    expect(rows.map((row) => row.key)).toEqual([
      "overall",
      "vocabulary",
      "grammar",
      "reading",
      "listening",
      "speaking",
    ]);
    expect(rows.map((row) => row.name)).toEqual([
      "综合",
      "词汇",
      "语法",
      "阅读",
      "听力",
      "口语",
    ]);
    expect(rows.map((row) => row.colorKey)).toEqual([
      "blue",
      "purple",
      "green",
      "orange",
      "pink",
      "cyan",
    ]);
    expect(rows[0].display).toBe("50%");
    expect(rows[1].display).toBe("22.3%");
  });

  it("renders the listening row from skill_levels.listening", () => {
    const rows = buildProfileSkillRows(
      profile({
        skill_levels: {
          hsk: 3,
          vocabulary: 1.34,
          grammar: 1.13,
          reading: 0.26,
          listening: 3,
          speaking: 0,
        },
      })
    );
    const listening = rows.find((row) => row.key === "listening");
    expect(listening).toBeDefined();
    expect(listening?.name).toBe("听力");
    expect(listening?.colorKey).toBe("pink");
    // level 3 (≤6 branch → 3/6*100 = 50%)
    expect(listening?.display).toBe("50%");
  });

  it("falls back to listening=0 when skill_levels.omits listening", () => {
    const rows = buildProfileSkillRows(profile());
    const listening = rows.find((row) => row.key === "listening");
    expect(listening?.display).toBe("0%");
  });
});
