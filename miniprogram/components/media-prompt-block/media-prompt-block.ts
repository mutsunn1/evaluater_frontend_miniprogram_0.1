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
  },

  methods: {
    derive(a: MediaAsset) {
      this.setData({
        isImage: a.type === "image",
        isAudio: a.type === "audio",
        isVideo: a.type === "video",
        hasAlt: !!a.alt,
        altText: a.alt || "",
      });
    },
  },
});
