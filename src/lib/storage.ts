type StorageValue = string | null;

function isBrowser() {
  return typeof window !== "undefined";
}

export const appStorage = {
  get(key: string): StorageValue {
    if (!isBrowser()) return null;

    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    if (!isBrowser()) return;

    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Persistence is helpful, but the UI should keep working if storage is blocked.
    }
  },
  remove(key: string) {
    if (!isBrowser()) return;

    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore unavailable storage; callers keep their in-memory state.
    }
  },
};
