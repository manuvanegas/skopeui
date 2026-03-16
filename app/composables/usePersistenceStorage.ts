function parseStoredValue(rawValue: string | null): unknown {
  if (rawValue == null) {
    return null;
  }
  try {
    return JSON.parse(rawValue);
  } catch {
    return rawValue;
  }
}

function hasWindowStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function usePersistenceStorage() {
  function get(key: string): unknown {
    if (!hasWindowStorage()) {
      return null;
    }
    return parseStoredValue(window.localStorage.getItem(key));
  }

  function set(key: string, value: unknown): void {
    if (!hasWindowStorage()) {
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function remove(key: string): void {
    if (!hasWindowStorage()) {
      return;
    }
    window.localStorage.removeItem(key);
  }

  return {
    get,
    set,
    remove,
  };
}
