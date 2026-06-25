import { getUserProfile } from "../../modules/api-adapter";
import {
  buildProfileSkillRows,
  type ProfileSkillRow,
} from "../../modules/profile-metrics";
import type { UserProfileData } from "../../types";
import i18nBehavior from "../../behaviors/i18n";
import { buildI18n } from "../../utils/i18n-data";

const profileI18nMap = {
  levelLabelCurrent: "profile.currentLevel",
  levelLabelWaiting: "profile.waitingEvaluation",
  loadFailed: "profile.loadFailed",
};

function buildProfileI18n() {
  return buildI18n(profileI18nMap);
}

const POLL_INTERVAL = 30000;

Component({
  behaviors: [i18nBehavior],

  properties: {
    userId: { type: String, value: "" },
    open: { type: Boolean, value: false },
  },

  data: {
    profile: {
      user_id: "",
      hsk_level: 1,
      skill_levels: {
        hsk: 1,
        vocabulary: 1,
        grammar: 1,
        reading: 1,
        listening: 1,
        speaking: 1,
      },
      native_language: null,
      stubborn_errors: [] as string[],
      strengths: [] as string[],
      next_focus: [] as string[],
      updated_at: null,
    } as UserProfileData,
    skills: [] as ProfileSkillRow[],
    fetchFailed: false,
    masteredLabel: "",
    suggestedFocusLabel: "",
    updatedAtText: "",
    levelLabel: "",
    i18n: buildProfileI18n(),
  },

  observers: {
    "userId, open": function (uid: string, isOpen: boolean) {
      if (uid && isOpen) {
        this.startPolling();
      } else {
        this.stopPolling();
      }
    },
    "profile, locale": function () {
      this.refreshLabels();
    },
  },

  lifetimes: {
    attached() {
      (this as Record<string, unknown>)._pollTimer = null;
      this.refreshLabels();
    },
    detached() {
      this.stopPolling();
    },
  },

  methods: {
    refreshI18n() {
      this.setData({ i18n: buildProfileI18n() });
    },

    refreshLabels() {
      const p = this.data.profile;
      this.setData({
        levelLabel:
          p.hsk_level > 1
            ? this.data.i18n.levelLabelCurrent
            : this.data.i18n.levelLabelWaiting,
        masteredLabel: this.t("profile.mastered", { items: "" }),
        suggestedFocusLabel: this.t("profile.suggestedFocus", { items: "" }),
        updatedAtText: p.updated_at
          ? this.t("profile.updatedAt", { time: p.updated_at })
          : "",
        skills: this.data.skills.map((row) => ({
          ...row,
          displayName: this.t(`profile.skills.${row.key}`),
        })),
      });
    },

    startPolling() {
      this.stopPolling();
      this.fetchProfile();
      (this as Record<string, unknown>)._pollTimer = setInterval(() => {
        if (this.properties.open && this.properties.userId) {
          this.fetchProfile();
        }
      }, POLL_INTERVAL);
    },

    stopPolling() {
      const timer = (this as Record<string, unknown>)._pollTimer as ReturnType<
        typeof setInterval
      > | null;
      if (timer) {
        clearInterval(timer);
        (this as Record<string, unknown>)._pollTimer = null;
      }
    },

    async fetchProfile() {
      const uid = this.properties.userId;
      if (!uid) return;

      try {
        const p = await getUserProfile(uid);
        const skills = buildProfileSkillRows(p);
        this.setData({ profile: p, skills, fetchFailed: false });
        this.refreshLabels();
      } catch {
        this.setData({ fetchFailed: true });
      }
    },

    refresh() {
      this.fetchProfile();
    },
  },
});
