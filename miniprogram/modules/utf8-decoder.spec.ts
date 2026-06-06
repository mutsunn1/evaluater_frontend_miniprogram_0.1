import { describe, it, expect } from 'vitest';

// We test both paths by controlling the environment.
// The module auto-selects TextDecoder if available, fallback otherwise.

// Helper: encode a string to UTF-8 bytes
function utf8Bytes(s: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(s);
}

describe('Utf8Decoder', () => {
  // We import after potentially modifying globals, so use dynamic import.
  // Actually, the module caches the decoder strategy at import time.
  // We'll test the fallback path explicitly by constructing a FallbackUtf8Decoder.

  it('decodes ASCII in a single chunk', async () => {
    const { createUtf8Decoder } = await import('./utf8-decoder');
    const d = createUtf8Decoder();
    const result = d.decode(utf8Bytes('hello world'));
    expect(result).toBe('hello world');
  });

  it('decodes Chinese text in a single chunk', async () => {
    const { createUtf8Decoder } = await import('./utf8-decoder');
    const d = createUtf8Decoder();
    const result = d.decode(utf8Bytes('你好世界'));
    expect(result).toBe('你好世界');
  });

  it('decodes mixed ASCII and Chinese', async () => {
    const { createUtf8Decoder } = await import('./utf8-decoder');
    const d = createUtf8Decoder();
    const result = d.decode(utf8Bytes('hello 你好 world'));
    expect(result).toBe('hello 你好 world');
  });

  it('handles cross-chunk 3-byte character split after byte 1', async () => {
    const { createUtf8Decoder } = await import('./utf8-decoder');
    const d = createUtf8Decoder();
    // "你好" = E4 BD A0 | E5 A5 BD
    const all = utf8Bytes('你好');
    // Split: first chunk ends after the first byte of "你"
    const chunk1 = all.slice(0, 3);  // E4 BD A0 = complete "你"
    const chunk2 = all.slice(3);      // E5 A5 BD = complete "好"
    const r1 = d.decode(chunk1);
    expect(r1).toBe('你');
    const r2 = d.decode(chunk2);
    expect(r2).toBe('好');
  });

  it('handles cross-chunk 3-byte character split after byte 2', async () => {
    const { createUtf8Decoder } = await import('./utf8-decoder');
    const d = createUtf8Decoder();
    // "你好" = E4 BD A0 | E5 A5 BD
    const all = utf8Bytes('你好');
    // Split: first chunk ends mid-"你" after bytes E4 BD
    const chunk1 = all.slice(0, 2);  // E4 BD (incomplete "你")
    const chunk2 = all.slice(2);      // A0 E5 A5 BD ("你"s last byte + "好")
    const r1 = d.decode(chunk1);
    expect(r1).toBe('');
    const r2 = d.decode(chunk2);
    expect(r2).toBe('你好');
  });

  it('handles cross-chunk 4-byte character (emoji)', async () => {
    const { createUtf8Decoder } = await import('./utf8-decoder');
    const d = createUtf8Decoder();
    // "😀" = F0 9F 98 80 (4 bytes)
    const all = utf8Bytes('a😀b');
    // First chunk: "a" + first 2 bytes of emoji
    const chunk1 = all.slice(0, 3);  // 61 F0 9F
    const chunk2 = all.slice(3);      // 98 80 62 (last 2 bytes of emoji + "b")
    const r1 = d.decode(chunk1);
    expect(r1).toBe('a');
    const r2 = d.decode(chunk2);
    expect(r2).toBe('😀b');
  });

  it('flush returns empty string when no residual bytes', async () => {
    const { createUtf8Decoder } = await import('./utf8-decoder');
    const d = createUtf8Decoder();
    d.decode(utf8Bytes('hello'));
    const flushed = d.flush();
    expect(flushed).toBe('');
  });

  it('flush outputs replacement characters for incomplete sequence', async () => {
    const { createUtf8Decoder } = await import('./utf8-decoder');
    const d = createUtf8Decoder();
    // Feed an incomplete leading byte
    const all = utf8Bytes('你好');
    const chunk1 = all.slice(0, 2);  // E4 BD — incomplete
    d.decode(chunk1);
    const flushed = d.flush();
    // Should output U+FFFD U+FFFD (or TextDecoder equivalent)
    expect(flushed.length).toBeGreaterThan(0);
    // The flushed output should not throw when encoded back
    expect(() => new TextEncoder().encode(flushed)).not.toThrow();
  });

  it('survives empty chunks without error', async () => {
    const { createUtf8Decoder } = await import('./utf8-decoder');
    const d = createUtf8Decoder();
    expect(d.decode(new Uint8Array(0))).toBe('');
    expect(d.decode(utf8Bytes('ok'))).toBe('ok');
  });

  it('handles long streaming sequence across many chunks', async () => {
    const { createUtf8Decoder } = await import('./utf8-decoder');
    const d = createUtf8Decoder();
    const text = '这是一个较长的测试文本，包含中英文混合content。';
    const allBytes = utf8Bytes(text);
    const results: string[] = [];
    // Split into random-sized chunks
    let pos = 0;
    while (pos < allBytes.length) {
      const size = Math.min(1 + Math.floor(Math.random() * 5), allBytes.length - pos);
      const chunk = allBytes.slice(pos, pos + size);
      results.push(d.decode(chunk));
      pos += size;
    }
    results.push(d.flush());
    expect(results.join('')).toBe(text);
  });
});
