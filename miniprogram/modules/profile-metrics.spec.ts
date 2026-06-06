import { describe, it, expect } from 'vitest';
import type { UserProfileData } from '../types';
import { buildProfileSkillRows } from './profile-metrics';

function profile(overrides: Partial<UserProfileData> = {}): UserProfileData {
  return {
    user_id: '1',
    hsk_level: 3,
    skill_levels: { hsk: 3, vocabulary: 1.34, grammar: 1.13, reading: 0.26 },
    native_language: null,
    stubborn_errors: [],
    strengths: [],
    next_focus: [],
    updated_at: null,
    ...overrides,
  };
}

describe('profile metrics', () => {
  it('formats HSK dimensions as web-style percentages with stable color keys', () => {
    const rows = buildProfileSkillRows(profile());

    expect(rows.map(row => row.key)).toEqual(['overall', 'vocabulary', 'grammar', 'reading']);
    expect(rows.map(row => row.name)).toEqual(['综合', '词汇', '语法', '阅读']);
    expect(rows.map(row => row.colorKey)).toEqual(['blue', 'purple', 'green', 'orange']);
    expect(rows[0].display).toBe('50%');
    expect(rows[1].display).toBe('22.3%');
  });
});
