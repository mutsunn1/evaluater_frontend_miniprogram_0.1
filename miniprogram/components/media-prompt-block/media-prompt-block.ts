import type { MediaAsset } from "../../types";

Component({
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
  },

  observers: {
    asset: function (a: MediaAsset) {
      if (a) this.derive(a);
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
    derive(a: MediaAsset) {
      this.stopAudio();
      this.setData({
        isImage: a.type === "image",
        isAudio: a.type === "audio",
        isVideo: a.type === "video",
        hasAlt: !!a.alt,
        altText: a.alt || "",
        isPlaying: false,
        audioError: false,
      });
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
