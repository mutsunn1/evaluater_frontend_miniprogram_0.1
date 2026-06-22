import { getUserProfile } from "../../modules/api-adapter";
import {
  buildProfileSkillRows,
  type ProfileSkillRow,
} from "../../modules/profile-metrics";
import type { UserProfileData } from "../../types";

const POLL_INTERVAL = 30000;

Component({
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
  },

  observers: {
    "userId, open": function (uid: string, isOpen: boolean) {
      if (uid && isOpen) {
        this.startPolling();
      } else {
        this.stopPolling();
      }
    },
  },

  lifetimes: {
    attached() {
      (this as Record<string, unknown>)._pollTimer = null;
    },
    detached() {
      this.stopPolling();
    },
  },

  methods: {
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
      } catch {
        this.setData({ fetchFailed: true });
      }
    },

    refresh() {
      this.fetchProfile();
    },
  },
});
