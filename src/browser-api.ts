// Firefox exposes the promise-based `browser` global; Chrome only has the
// callback-based `chrome` global. Wrap the handful of calls we use so the
// rest of the codebase can `await` uniformly on both.
declare const browser: typeof chrome | undefined;

const root: typeof chrome = typeof browser !== "undefined" ? browser : chrome;
const isNative = typeof browser !== "undefined";

function callback<T>(fn: (cb: (result: T) => void) => void): Promise<T> {
  if (isNative) return fn as unknown as Promise<T>;
  return new Promise((resolve, reject) => {
    fn((result) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(result);
    });
  });
}

export const storage = {
  async get(): Promise<Record<string, unknown>> {
    if (isNative) return root.storage.local.get(null);
    return callback((cb) => root.storage.local.get(null, cb));
  },
  async set(items: Record<string, unknown>): Promise<void> {
    if (isNative) return root.storage.local.set(items);
    return callback((cb) => root.storage.local.set(items, () => cb(undefined as void)));
  },
  onChanged: root.storage.onChanged,
};

export const dnr = root.declarativeNetRequest;
export const action = root.action;
