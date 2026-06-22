import type { UserProfileData } from "../types";

export interface ProfileSkillRow {
  name: string;
  key:
    | "overall"
    | "vocabulary"
    | "grammar"
    | "reading"
    | "listening"
    | "speaking";
  colorKey: "blue" | "purple" | "green" | "orange" | "pink" | "cyan";
  pct: number;
  display: string;
}

function toPct(value: number | undefined): number {
  const raw = Number(value || 0);
  if (raw <= 0) return 0;
  if (raw <= 6) return Math.min(100, (raw / 6) * 100);
  return Math.min(100, raw);
}

function formatPct(pct: number): string {
  const rounded = Math.round(pct * 10) / 10;
  return Number.isInteger(rounded)
    ? `${rounded.toFixed(0)}%`
    : `${rounded.toFixed(1)}%`;
}

export function buildProfileSkillRows(
  profile: UserProfileData
): ProfileSkillRow[] {
  const levels = profile.skill_levels || {
    hsk: profile.hsk_level,
    vocabulary: 0,
    grammar: 0,
    reading: 0,
    listening: 0,
    speaking: 0,
  };
  const rows: Array<
    Omit<ProfileSkillRow, "pct" | "display"> & { value: number | undefined }
  > = [
    {
      name: "综合",
      key: "overall",
      colorKey: "blue",
      value: levels.hsk || profile.hsk_level,
    },
    {
      name: "词汇",
      key: "vocabulary",
      colorKey: "purple",
      value: levels.vocabulary,
    },
    { name: "语法", key: "grammar", colorKey: "green", value: levels.grammar },
    { name: "阅读", key: "reading", colorKey: "orange", value: levels.reading },
    {
      name: "听力",
      key: "listening",
      colorKey: "pink",
      value: levels.listening,
    },
    {
      name: "口语",
      key: "speaking",
      colorKey: "cyan",
      value: levels.speaking,
    },
  ];

  return rows.map((row) => {
    const pct = toPct(row.value);
    return {
      name: row.name,
      key: row.key,
      colorKey: row.colorKey,
      pct,
      display: formatPct(pct),
    };
  });
}
