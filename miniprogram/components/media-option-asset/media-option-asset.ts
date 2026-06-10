import type { MediaAsset } from "../../types";

Component({
  properties: {
    asset: { type: Object, value: null as MediaAsset | null },
  },

  data: {
    isImage: false,
    isAudio: false,
    hasMedia: false,
  },

  observers: {
    asset: function (a: MediaAsset | null) {
      if (a) this.derive(a);
      else this.setData({ isImage: false, isAudio: false, hasMedia: false });
    },
  },

  lifetimes: {
    attached() {
      const a = this.properties.asset as MediaAsset | null;
      if (a) this.derive(a);
    },
  },

  methods: {
    derive(a: MediaAsset) {
      this.setData({
        isImage: a.type === "image",
        isAudio: a.type === "audio",
        hasMedia: true,
      });
    },
  },
});
