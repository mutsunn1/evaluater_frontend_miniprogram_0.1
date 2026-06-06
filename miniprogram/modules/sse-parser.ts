import { createUtf8Decoder } from './utf8-decoder';

interface SseRequestOptions {
  url: string;
  method?: string;
  data?: unknown;
  header?: Record<string, string>;
}

interface SseConfig {
  onEvent: (eventType: string, data: Record<string, unknown>) => boolean | void;
  onComplete?: (error?: Error) => void;
  signal?: { aborted: boolean };
}

interface SseRequestTask {
  abort(): void;
}

interface WxRequestTask {
  onChunkReceived(cb: (res: { data: ArrayBuffer }) => void): void;
  abort(): void;
}

interface WxRequestOptions {
  url: string;
  method?: string;
  data?: string | Record<string, unknown>;
  header?: Record<string, string>;
  enableChunked?: boolean;
  responseType?: string;
  success?: (res: { statusCode: number; data: unknown }) => void;
  fail?: (err: { errMsg: string }) => void;
}

declare function wxRequest(opts: WxRequestOptions): WxRequestTask;

function wxRequestAdapter(opts: WxRequestOptions): WxRequestTask {
  const wx = (globalThis as Record<string, unknown>).wx as {
    request: (o: WxRequestOptions) => WxRequestTask;
  } | undefined;
  if (wx?.request) {
    return wx.request(opts);
  }
  throw new Error('wx.request is not available');
}

export function startSseRequest(
  options: SseRequestOptions,
  config: SseConfig,
): SseRequestTask {
  const decoder = createUtf8Decoder();
  let aborted = false;
  let stopped = false;
  let task: WxRequestTask | null = null;

  const signal = config.signal;

  // SSE line parsing state
  let buffer = '';
  let eventType = 'message';
  const dataLines: string[] = [];
  let firstChunk = true;

  function dispatch() {
    if (stopped || dataLines.length === 0) return;

    const raw = dataLines.join('\n');
    dataLines.length = 0;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    const result = config.onEvent(eventType, parsed);
    if (result === false) {
      stopped = true;
      task?.abort();
    }
  }

  function processLine(line: string) {
    if (stopped) return;
    if (firstChunk && line.length > 0 && line.charCodeAt(0) === 0xfeff) {
      line = line.slice(1);
    }
    firstChunk = false;

    if (line === '') {
      dispatch();
      eventType = 'message';
    } else if (line.startsWith('event: ')) {
      eventType = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      dataLines.push(line.slice(6));
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5));
    }
    // Comment lines (starting with ':') and unknown fields are silently ignored
  }

  function feedChunk(chunk: ArrayBuffer) {
    if (aborted || stopped) return;
    const text = decoder.decode(new Uint8Array(chunk));
    buffer += text;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      processLine(line);
    }
  }

  function flushEnd() {
    if (aborted || stopped) return;
    const remaining = decoder.flush();
    buffer += remaining;
    if (buffer.length > 0) {
      const lines = buffer.split('\n');
      for (const line of lines) {
        processLine(line);
      }
      buffer = '';
    }
    // Final dispatch for any accumulated data
    dispatch();
  }

  // Check signal before starting
  if (signal?.aborted) {
    config.onComplete?.();
    return { abort() {} };
  }

  task = wxRequestAdapter({
    url: options.url,
    method: options.method || 'GET',
    data: options.data,
    header: options.header,
    enableChunked: true,
    responseType: 'text',
    success(_res) {
      if (aborted) return;
      flushEnd();
      config.onComplete?.();
    },
    fail(err) {
      if (aborted) return;
      config.onComplete?.(new Error(err.errMsg || 'request failed'));
    },
  });

  task.onChunkReceived((res: { data: ArrayBuffer }) => {
    if (signal?.aborted) {
      aborted = true;
      task?.abort();
      return;
    }
    feedChunk(res.data);
  });

  return {
    abort() {
      aborted = true;
      task?.abort();
    },
  };
}
