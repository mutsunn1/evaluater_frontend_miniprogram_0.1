import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockInnerAudioContext = {
  play: vi.fn(),
  stop: vi.fn(),
  destroy: vi.fn(),
  onEnded: vi.fn(),
  onError: vi.fn(),
};

const mockRecorderManager = {
  start: vi.fn(),
  stop: vi.fn(),
  onStart: vi.fn(),
  onStop: vi.fn(),
  onError: vi.fn(),
};

function setupWx() {
  (globalThis as Record<string, unknown>).wx = {
    getRecorderManager: () => mockRecorderManager,
    createInnerAudioContext: () => ({ ...mockInnerAudioContext }),
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
    uploadFile: vi.fn(),
  };
}

function captureComponent() {
  (globalThis as Record<string, unknown>).Component = (
    cfg: Record<string, unknown>
  ) => {
    (globalThis as Record<string, unknown>).__speechRecorderComponent = cfg;
    return cfg;
  };
}

function getSpeechRecorderConfig(): Record<string, unknown> {
  return (globalThis as Record<string, unknown>)
    .__speechRecorderComponent as Record<string, unknown>;
}

describe("speech-recorder upload button wiring", () => {
  beforeEach(() => {
    vi.resetModules();
    setupWx();
    captureComponent();
    (globalThis as Record<string, unknown>).Behavior = vi.fn((def) => def);
    delete (globalThis as Record<string, unknown>).__speechRecorderComponent;
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).Behavior;
  });

  it("exposes uploadRecording method that can be bound to a button", async () => {
    await import("./speech-recorder");
    const cfg = getSpeechRecorderConfig();
    const methods = cfg.methods as Record<string, unknown>;
    expect(typeof methods.uploadRecording).toBe("function");
  });

  it("uploadRecording transitions state to transcribed on success", async () => {
    vi.doMock("../../modules/api-adapter", () => ({
      uploadSpeechRecording: vi.fn().mockResolvedValue({
        status: "transcribed",
        asset_id: "asset-123",
        transcript: "你好",
      }),
    }));

    await import("./speech-recorder");
    const cfg = getSpeechRecorderConfig();
    const methods = cfg.methods as Record<
      string,
      (...args: unknown[]) => unknown
    >;

    const component = {
      properties: { sessionId: "s1", questionItemId: 1 },
      data: {
        elapsedSeconds: 3,
        i18n: {
          uploading: "chat.speech.uploading",
          transcribeFailed: "chat.speech.transcribeFailed",
          uploadFailed: "chat.speech.uploadFailed",
        },
      },
      setData: vi.fn(),
      triggerEvent: vi.fn(),
      t: (key: string) => key,
      _recordedPath: "/tmp/rec.mp3",
    };

    await methods.uploadRecording.call(component);

    expect(component.setData).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "transcribed",
        transcript: "你好",
        assetId: "asset-123",
      })
    );
  });
});
