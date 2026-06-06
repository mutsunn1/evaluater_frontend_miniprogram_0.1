let _v4: (() => string) | null = null;

function getV4(): () => string {
  if (_v4) return _v4;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const uuid = require('uuid');
    if (typeof uuid.v4 === 'function') {
      _v4 = uuid.v4;
      return _v4;
    }
  } catch {
    // uuid package unavailable — fall through to fallback
  }

  // Fallback: Math.random UUID v4 (not crypto-grade, but sufficient for client IDs)
  _v4 = function fallbackUuidV4(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
  return _v4;
}

export function createClientId(): string {
  return getV4()();
}
