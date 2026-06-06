export interface Utf8Decoder {
  decode(chunk: Uint8Array): string;
  flush(): string;
}

function createTextDecoder(): Utf8Decoder {
  const td = new TextDecoder('utf-8', { fatal: false });
  return {
    decode(chunk: Uint8Array): string {
      return td.decode(chunk, { stream: true });
    },
    flush(): string {
      return td.decode();
    },
  };
}

function createFallbackDecoder(): Utf8Decoder {
  let residual = new Uint8Array(0);

  function decodeChunk(data: Uint8Array): { text: string; remainder: Uint8Array } {
    // Prepend residual bytes from previous chunk
    const bytes = new Uint8Array(residual.length + data.length);
    bytes.set(residual, 0);
    bytes.set(data, residual.length);

    const chars: string[] = [];
    let i = 0;

    while (i < bytes.length) {
      const b = bytes[i];

      // Determine sequence length from leading byte
      let seqLen: number;
      if ((b & 0x80) === 0) {
        seqLen = 1;
      } else if ((b & 0xe0) === 0xc0) {
        seqLen = 2;
      } else if ((b & 0xf0) === 0xe0) {
        seqLen = 3;
      } else if ((b & 0xf8) === 0xf0) {
        seqLen = 4;
      } else {
        // Continuation byte or invalid leading byte — skip
        i++;
        continue;
      }

      // Check if we have enough bytes for this sequence
      if (i + seqLen > bytes.length) {
        break; // incomplete — becomes residual
      }

      // Validate continuation bytes
      let valid = true;
      for (let j = 1; j < seqLen; j++) {
        if ((bytes[i + j] & 0xc0) !== 0x80) {
          valid = false;
          break;
        }
      }

      if (!valid) {
        // Overlong encoding or invalid sequence — skip leading byte, retry
        i++;
        continue;
      }

      // Decode code point
      let cp: number;
      if (seqLen === 1) {
        cp = b;
      } else if (seqLen === 2) {
        cp = ((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f);
      } else if (seqLen === 3) {
        cp = ((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f);
      } else {
        cp = ((b & 0x07) << 18) | ((bytes[i + 1] & 0x3f) << 12) | ((bytes[i + 2] & 0x3f) << 6) | (bytes[i + 3] & 0x3f);
      }

      // Reject overlong encodings and surrogates
      if (
        (seqLen === 2 && cp < 0x80) ||
        (seqLen === 3 && cp < 0x800) ||
        (seqLen === 4 && cp < 0x10000) ||
        (cp >= 0xd800 && cp <= 0xdfff)
      ) {
        i++;
        continue;
      }

      chars.push(String.fromCodePoint(cp));
      i += seqLen;
    }

    const remainder = bytes.slice(i);
    return { text: chars.join(''), remainder };
  }

  return {
    decode(chunk: Uint8Array): string {
      const { text, remainder } = decodeChunk(chunk);
      residual = remainder;
      return text;
    },
    flush(): string {
      const { text, remainder } = decodeChunk(new Uint8Array(0));
      // Any leftover incomplete bytes → replacement characters
      const rchars: string[] = [];
      for (let i = 0; i < remainder.length; i++) {
        rchars.push('�');
      }
      residual = new Uint8Array(0);
      return text + rchars.join('');
    },
  };
}

export function createUtf8Decoder(): Utf8Decoder {
  if (typeof TextDecoder !== 'undefined') {
    try {
      return createTextDecoder();
    } catch {
      // TextDecoder exists but constructor threw — use fallback
    }
  }
  return createFallbackDecoder();
}

// Exported separately for testing the fallback path
export { createFallbackDecoder };
