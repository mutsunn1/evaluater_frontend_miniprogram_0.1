import { describe, it, expect, vi, beforeEach } from 'vitest';

interface MockRequestTask {
  onChunkReceived: (cb: (res: { data: ArrayBuffer }) => void) => void;
  abort: () => void;
}

interface MockWx {
  request: (opts: Record<string, unknown>) => MockRequestTask;
}

const mockWx: MockWx = {
  request: () => ({ onChunkReceived: () => {}, abort: () => {} }),
};

(globalThis as Record<string, unknown>).wx = mockWx;

async function importParser() {
  return await import('./sse-parser');
}

function toArrayBuffer(chunks: string[]): ArrayBuffer[] {
  return chunks.map(s => new TextEncoder().encode(s).buffer as ArrayBuffer);
}

function setupMock(chunks: ArrayBuffer[], failErr?: string) {
  let chunkCb: ((res: { data: ArrayBuffer }) => void) | null = null;
  let successCb: ((res: Record<string, unknown>) => void) | null = null;
  let failCb: ((err: Record<string, unknown>) => void) | null = null;
  let ended = false;
  let failed = false;

  const task: MockRequestTask = {
    onChunkReceived(cb) {
      chunkCb = cb;
      if (chunkCb && !ended) {
        // Defer chunk delivery so onChunkReceived is fully registered
        queueMicrotask(() => {
          if (ended) return;
          for (const chunk of chunks) {
            if (ended) return;
            chunkCb!({ data: chunk });
          }
          ended = true;
          if (!failed && successCb) {
            successCb({ statusCode: 200, data: {} });
          }
        });
      }
    },
    abort() {
      if (!ended) {
        ended = true;
        failed = true;
        if (failCb) failCb({ errMsg: 'request:fail abort' });
      }
    },
  };

  mockWx.request = vi.fn().mockImplementation((opts: Record<string, unknown>) => {
    successCb = opts.success as (res: Record<string, unknown>) => void;
    failCb = opts.fail as (err: Record<string, unknown>) => void;
    return task;
  });

  return { task };
}

describe('startSseRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('dispatches a single complete event from one chunk', async () => {
    const { startSseRequest } = await importParser();
    const onEvent = vi.fn();
    const chunk = 'event: question\ndata: {"x": 1}\n\n';

    const p = new Promise<void>(resolve => {
      setupMock(toArrayBuffer([chunk]));
      startSseRequest({ url: 'https://example.com/sse' }, {
        onEvent,
        onComplete: () => resolve(),
      });
    });

    await p;
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith('question', { x: 1 });
  });

  it('dispatches event split across two chunks', async () => {
    const { startSseRequest } = await importParser();
    const onEvent = vi.fn();
    const chunk1 = 'event: thinking\nda';
    const chunk2 = 'ta: {"agent": "A", "output": "hi"}\n\n';

    const p = new Promise<void>(resolve => {
      setupMock(toArrayBuffer([chunk1, chunk2]));
      startSseRequest({ url: 'https://example.com/sse' }, {
        onEvent,
        onComplete: () => resolve(),
      });
    });

    await p;
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith('thinking', { agent: 'A', output: 'hi' });
  });

  it('dispatches multiple events in a single chunk', async () => {
    const { startSseRequest } = await importParser();
    const onEvent = vi.fn();
    const chunk = 'event: thinking\ndata: {"a": 1}\n\nevent: question\ndata: {"q": 2}\n\n';

    const p = new Promise<void>(resolve => {
      setupMock(toArrayBuffer([chunk]));
      startSseRequest({ url: 'https://example.com/sse' }, {
        onEvent,
        onComplete: () => resolve(),
      });
    });

    await p;
    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent).toHaveBeenNthCalledWith(1, 'thinking', { a: 1 });
    expect(onEvent).toHaveBeenNthCalledWith(2, 'question', { q: 2 });
  });

  it('handles multi-line data field', async () => {
    const { startSseRequest } = await importParser();
    const onEvent = vi.fn();
    // Multi-line data concatenates with newlines — use valid JSON split across lines
    const chunk = 'data: {"a":\ndata: 1}\n\n';

    const p = new Promise<void>(resolve => {
      setupMock(toArrayBuffer([chunk]));
      startSseRequest({ url: 'https://example.com/sse' }, {
        onEvent,
        onComplete: () => resolve(),
      });
    });

    await p;
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith('message', { a: 1 });
  });

  it('skips malformed JSON silently', async () => {
    const { startSseRequest } = await importParser();
    const onEvent = vi.fn();
    const chunk = 'data: {broken json}\n\nevent: ok\ndata: {"good": true}\n\n';

    const p = new Promise<void>(resolve => {
      setupMock(toArrayBuffer([chunk]));
      startSseRequest({ url: 'https://example.com/sse' }, {
        onEvent,
        onComplete: () => resolve(),
      });
    });

    await p;
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith('ok', { good: true });
  });

  it('handles Chinese characters split across chunks', async () => {
    const { startSseRequest } = await importParser();
    const onEvent = vi.fn();
    const encoder = new TextEncoder();
    const full = encoder.encode('event: msg\ndata: {"text": "你好"}\n\n');
    // Split in the middle of "你" (E4 BD A0) — first byte of 你
    const prefixLen = encoder.encode('event: msg\ndata: {"text": "').length + 1;
    const chunk1 = full.slice(0, prefixLen);
    const chunk2 = full.slice(prefixLen);

    const p = new Promise<void>(resolve => {
      setupMock([chunk1.buffer as ArrayBuffer, chunk2.buffer as ArrayBuffer]);
      startSseRequest({ url: 'https://example.com/sse' }, {
        onEvent,
        onComplete: () => resolve(),
      });
    });

    await p;
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith('msg', { text: '你好' });
  });

  it('strips BOM from first chunk', async () => {
    const { startSseRequest } = await importParser();
    const onEvent = vi.fn();
    const encoder = new TextEncoder();
    const data = encoder.encode('data: {"x": 1}\n\n');
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const withBom = new Uint8Array(bom.length + data.length);
    withBom.set(bom, 0);
    withBom.set(data, bom.length);

    const p = new Promise<void>(resolve => {
      setupMock([withBom.buffer as ArrayBuffer]);
      startSseRequest({ url: 'https://example.com/sse' }, {
        onEvent,
        onComplete: () => resolve(),
      });
    });

    await p;
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith('message', { x: 1 });
  });

  it('ignores comment lines', async () => {
    const { startSseRequest } = await importParser();
    const onEvent = vi.fn();
    const chunk = ': this is a comment\ndata: {"x": 1}\n\n';

    const p = new Promise<void>(resolve => {
      setupMock(toArrayBuffer([chunk]));
      startSseRequest({ url: 'https://example.com/sse' }, {
        onEvent,
        onComplete: () => resolve(),
      });
    });

    await p;
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith('message', { x: 1 });
  });

  it('flushes trailing partial line on stream end', async () => {
    const { startSseRequest } = await importParser();
    const onEvent = vi.fn();
    const chunk = 'data: {"x": 1}\n\ndata: partial';

    const p = new Promise<void>(resolve => {
      setupMock(toArrayBuffer([chunk]));
      startSseRequest({ url: 'https://example.com/sse' }, {
        onEvent,
        onComplete: () => resolve(),
      });
    });

    await p;
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith('message', { x: 1 });
  });

  it('calls onComplete with error on network failure', async () => {
    const { startSseRequest } = await importParser();
    const onEvent = vi.fn();
    const onComplete = vi.fn();

    // Override mock to fail
    mockWx.request = vi.fn().mockImplementation((opts: Record<string, unknown>) => {
      const failCb = opts.fail as (err: Record<string, unknown>) => void;
      queueMicrotask(() => failCb({ errMsg: 'network error' }));
      return { onChunkReceived: () => {}, abort: () => {} };
    });

    const p = new Promise<void>(resolve => {
      startSseRequest({ url: 'https://example.com/sse' }, {
        onEvent,
        onComplete: () => {
          onComplete();
          resolve();
        },
      });
    });

    await p;
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('resets event type between events', async () => {
    const { startSseRequest } = await importParser();
    const onEvent = vi.fn();
    const chunk = 'event: thinking\ndata: {"t": 1}\n\ndata: {"m": 2}\n\n';

    const p = new Promise<void>(resolve => {
      setupMock(toArrayBuffer([chunk]));
      startSseRequest({ url: 'https://example.com/sse' }, {
        onEvent,
        onComplete: () => resolve(),
      });
    });

    await p;
    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent).toHaveBeenNthCalledWith(1, 'thinking', { t: 1 });
    expect(onEvent).toHaveBeenNthCalledWith(2, 'message', { m: 2 });
  });

  it('onEvent returning false stops the stream early', async () => {
    const { startSseRequest } = await importParser();
    const onEvent = vi.fn().mockReturnValue(false);
    const onComplete = vi.fn();
    const chunk = 'data: {"a":1}\n\ndata: {"b":2}\n\ndata: {"c":3}\n\n';

    const p = new Promise<void>(resolve => {
      setupMock(toArrayBuffer([chunk]));
      startSseRequest({ url: 'https://example.com/sse' }, {
        onEvent,
        onComplete: () => {
          onComplete();
          resolve();
        },
      });
    });

    await p;
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('signal.aborted prevents stream start', async () => {
    const { startSseRequest } = await importParser();
    const onEvent = vi.fn();
    const onComplete = vi.fn();

    const p = new Promise<void>(resolve => {
      startSseRequest({ url: 'https://example.com/sse' }, {
        onEvent,
        onComplete: () => {
          onComplete();
          resolve();
        },
        signal: { aborted: true },
      });
    });

    await p;
    expect(onEvent).toHaveBeenCalledTimes(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
