import type { MediaAsset } from "../../types";
import i18nBehavior from "../../behaviors/i18n";
import { buildI18n } from "../../utils/i18n-data";

const mediaI18nMap = {
  audioPlay: "chat.speech.play",
  audioPause: "chat.speech.pause",
  audioError: "common.audioLoadFailed",
};

function buildMediaI18n() {
  return buildI18n(mediaI18nMap);
}

Component({
  behaviors: [i18nBehavior],

  properties: {
    asset: { type: Object, value: {} as MediaAsset },
  },

  data: {
    isImage: false,
    isAudio: false,
    isVideo: false,
    hasAlt: false,
    altText: "",
    isPlaying: false,
    audioError: false,
    i18n: buildMediaI18n(),
    audioLabel: "",
  },

  observers: {
    asset: function (a: MediaAsset) {
      if (a) this.derive(a);
    },
    "isPlaying, audioError, locale": function () {
      this.updateAudioLabel();
    },
  },

  lifetimes: {
    attached() {
      const a = this.properties.asset as MediaAsset;
      if (a) this.derive(a);
    },
    detached() {
      this.stopAudio();
    },
  },

  methods: {
    refreshI18n() {
      this.setData({ i18n: buildMediaI18n() });
      this.updateAudioLabel();
    },

    updateAudioLabel() {
      const label = this.data.audioError
        ? this.data.i18n.audioError
        : this.data.isPlaying
          ? this.data.i18n.audioPause
          : this.data.i18n.audioPlay;
      this.setData({ audioLabel: label });
    },

    derive(a: MediaAsset) {
      this.stopAudio();
      this.setData(
        {
          isImage: a.type === "image",
          isAudio: a.type === "audio",
          isVideo: a.type === "video",
          hasAlt: !!a.alt,
          altText: a.alt || "",
          isPlaying: false,
          audioError: false,
        },
        () => this.updateAudioLabel()
      );
    },

    toggleAudio() {
      if (this.data.isPlaying) {
        this.stopAudio();
      } else {
        this.playAudio();
      }
    },

    playAudio() {
      const asset = this.properties.asset as MediaAsset | undefined;
      if (!asset?.url) return;

      this.stopAudio();
      const innerAudio = wx.createInnerAudioContext();
      innerAudio.src = asset.url;
      innerAudio.onPlay(() => {
        this.setData({ isPlaying: true, audioError: false });
      });
      innerAudio.onEnded(() => {
        this.setData({ isPlaying: false });
        this._innerAudio = null;
      });
      innerAudio.onError(() => {
        this.setData({ isPlaying: false, audioError: true });
        this._innerAudio = null;
      });
      innerAudio.onStop(() => {
        this.setData({ isPlaying: false });
      });
      innerAudio.play();
      this._innerAudio = innerAudio;
    },

    stopAudio() {
      if (this._innerAudio) {
        this._innerAudio.stop();
        this._innerAudio.destroy();
        this._innerAudio = null;
      }
      this.setData({ isPlaying: false });
    },

    _innerAudio: null as WechatMiniprogram.InnerAudioContext | null,
  },
});
