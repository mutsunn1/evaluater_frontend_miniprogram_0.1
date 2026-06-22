import { uploadSpeechRecording } from "../../modules/api-adapter";

const MAX_SECONDS = 60;

Component({
  properties: {
    sessionId: { type: String, value: "" },
    questionItemId: { type: Number, value: 0 },
  },

  data: {
    state: "idle" as
      | "idle"
      | "recording"
      | "recorded"
      | "transcribed"
      | "failed",
    elapsedSeconds: 0,
    elapsedDisplay: "0:00",
    progressPct: 0,
    transcript: "",
    error: "",
    assetId: "",
    isPlaying: false,
  },

  lifetimes: {
    detached() {
      this._clear();
    },
  },

  methods: {
    _formatTime(s: number): string {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${m}:${String(sec).padStart(2, "0")}`;
    },

    startRecording() {
      const recorderManager = wx.getRecorderManager();
      recorderManager.onStart(() => {
        this.setData({
          state: "recording",
          elapsedSeconds: 0,
          elapsedDisplay: "0:00",
          progressPct: 0,
        });
        this._elapsedTimer = setInterval(() => {
          const next = (this.data.elapsedSeconds || 0) + 1;
          this.setData({
            elapsedSeconds: next,
            elapsedDisplay: this._formatTime(next),
            progressPct: Math.min(100, Math.round((next / MAX_SECONDS) * 100)),
          });
          if (next >= MAX_SECONDS) this.stopRecording();
        }, 1000);
      });

      recorderManager.onStop((res) => {
        if (this._elapsedTimer) {
          clearInterval(this._elapsedTimer);
          this._elapsedTimer = null;
        }
        this._recordedPath = res.tempFilePath;
        this.setData({ state: "recorded" });
      });

      recorderManager.onError((err) => {
        if (this._elapsedTimer) {
          clearInterval(this._elapsedTimer);
          this._elapsedTimer = null;
        }
        this.setData({ state: "failed", error: err.errMsg || "录音失败" });
      });

      recorderManager.start({
        duration: MAX_SECONDS * 1000,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 48000,
        format: "mp3",
      });
    },

    stopRecording() {
      wx.getRecorderManager().stop();
    },

    playRecording() {
      if (!this._recordedPath) return;
      this.setData({ isPlaying: true });
      const innerAudio = wx.createInnerAudioContext();
      innerAudio.src = this._recordedPath;
      innerAudio.onEnded(() => {
        this.setData({ isPlaying: false });
      });
      innerAudio.onError(() => {
        this.setData({ isPlaying: false });
      });
      innerAudio.play();
      this._innerAudio = innerAudio;
    },

    stopPlayback() {
      if (this._innerAudio) {
        this._innerAudio.stop();
        this._innerAudio.destroy();
        this._innerAudio = null;
      }
      this.setData({ isPlaying: false });
    },

    deleteRecording() {
      this._clear();
      this.setData({
        state: "idle",
        elapsedSeconds: 0,
        elapsedDisplay: "0:00",
        progressPct: 0,
        transcript: "",
        error: "",
        assetId: "",
        isPlaying: false,
      });
    },

    async uploadRecording() {
      if (!this._recordedPath) return;
      wx.showLoading({ title: "转写中..." });
      try {
        // wx.uploadFile streams the temp file directly as multipart, so we do
        // NOT need to read it into memory or build a Blob (which does not exist
        // in the mini-program runtime anyway). The previous code threw on
        // `new Blob(...)` before any upload could happen.
        const sessionId =
          (this.properties as { sessionId?: string }).sessionId ||
          this.data.sessionId;
        const questionItemId =
          (this.properties as { questionItemId?: number }).questionItemId ||
          this.data.questionItemId;
        const result = await uploadSpeechRecording(
          sessionId,
          questionItemId,
          this._recordedPath,
          (this.data.elapsedSeconds || 0) * 1000,
          "answer.mp3"
        );
        if (result.status === "transcribed") {
          this.setData({
            state: "transcribed",
            transcript: result.transcript || "",
            assetId: result.asset_id,
          });
        } else {
          this.setData({ state: "failed", error: result.error || "转写失败" });
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "上传失败";
        this.setData({ state: "failed", error: msg });
      } finally {
        wx.hideLoading();
      }
    },

    confirmTranscript() {
      this.triggerEvent("answer", this.data.assetId || "");
    },

    _clear() {
      if (this._elapsedTimer) {
        clearInterval(this._elapsedTimer);
        this._elapsedTimer = null;
      }
      if (this._innerAudio) {
        this._innerAudio.destroy();
        this._innerAudio = null;
      }
      this._recordedPath = "";
    },

    _elapsedTimer: null as any,
    _innerAudio: null as any,
    _recordedPath: "",
  },
});
