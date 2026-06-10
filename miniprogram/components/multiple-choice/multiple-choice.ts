import type { MediaAsset } from "../../types";

interface Option {
  index: string;
  text?: string;
  media_id?: string;
}

interface OptionAssetEntry {
  index: string;
  asset: MediaAsset | null;
}

function buildOptionAssets(
  options: Option[],
  media: MediaAsset[]
): OptionAssetEntry[] {
  return options.map((opt) => ({
    index: opt.index,
    asset: opt.media_id
      ? media.find((m) => m.id === opt.media_id) || null
      : null,
  }));
}

Component({
  properties: {
    options: { type: Array, value: [] as Option[] },
    multiSelect: { type: Boolean, value: false },
    media: { type: Array, value: [] as MediaAsset[] },
  },

  data: {
    selected: {} as Record<string, boolean>,
    hasSelection: false,
    optionAssets: [] as OptionAssetEntry[],
  },

  observers: {
    "options, media": function (opts: Option[], media: MediaAsset[]) {
      if (opts) {
        this.setData({ optionAssets: buildOptionAssets(opts, media || []) });
      }
    },
  },

  lifetimes: {
    attached() {
      const opts = this.properties.options as Option[];
      const media = (this.properties.media || []) as MediaAsset[];
      if (opts) {
        this.setData({ optionAssets: buildOptionAssets(opts, media) });
      }
    },
  },

  methods: {
    getAssetByIndex(idx: string): MediaAsset | null {
      const entry = this.data.optionAssets.find((e) => e.index === idx);
      return entry ? entry.asset : null;
    },

    onTap(e: WechatMiniprogram.TouchEvent) {
      const idx = e.currentTarget.dataset.idx as string;
      const sel = this.properties.multiSelect
        ? { ...this.data.selected, [idx]: !this.data.selected[idx] }
        : { [idx]: true };

      const hasSelection = Object.values(sel).some(Boolean);
      this.setData({ selected: sel, hasSelection });
    },

    onConfirm() {
      const keys = Object.keys(this.data.selected).filter(
        (k) => this.data.selected[k]
      );
      const answer = this.properties.multiSelect
        ? keys.sort().join(",")
        : keys[0] || "";
      this.triggerEvent("answer", { text: answer });
    },
  },
});
