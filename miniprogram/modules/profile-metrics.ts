import type { UserProfileData } from "../types";

export interface ProfileSkillRow {
  nameKey: string;
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
  displayName?: string;
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
      nameKey: "hsk",
      key: "overall",
      colorKey: "blue",
      value: levels.hsk || profile.hsk_level,
    },
    {
      nameKey: "vocabulary",
      key: "vocabulary",
      colorKey: "purple",
      value: levels.vocabulary,
    },
    {
      nameKey: "grammar",
      key: "grammar",
      colorKey: "green",
      value: levels.grammar,
    },
    {
      nameKey: "reading",
      key: "reading",
      colorKey: "orange",
      value: levels.reading,
    },
    {
      nameKey: "listening",
      key: "listening",
      colorKey: "pink",
      value: levels.listening,
    },
    {
      nameKey: "speaking",
      key: "speaking",
      colorKey: "cyan",
      value: levels.speaking,
    },
  ];

  return rows.map((row) => {
    const pct = toPct(row.value);
    return {
      nameKey: row.nameKey,
      key: row.key,
      colorKey: row.colorKey,
      pct,
      display: formatPct(pct),
    };
  });
}
