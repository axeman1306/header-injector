// Firefox exposes the promise-based `browser` global; Chrome only has the
// callback-based `chrome` global. Wrap the handful of calls we use so the
// rest of the codebase can `await` uniformly on both.
//
// Resolved lazily (a function, not a module-level const) rather than once at
// import time: a module-level binding would capture whatever `chrome`/
// `browser` happened to exist the FIRST time this module was imported, which
// is fine in a real browser (the global never changes) but breaks test
// isolation — bun runs every test file in one process sharing one module
// cache, so a later test's chrome stub would be silently ignored.
declare const browser: typeof chrome | undefined;

function getRoot(): typeof chrome {
  return typeof browser !== "undefined" ? browser : chrome;
}

function isNative(): boolean {
  return typeof browser !== "undefined";
}

function callback<T>(fn: (cb: (result: T) => void) => void): Promise<T> {
  if (isNative()) return fn as unknown as Promise<T>;
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
    const root = getRoot();
    if (isNative()) return root.storage.local.get(null);
    return callback((cb) => root.storage.local.get(null, cb));
  },
  async set(items: Record<string, unknown>): Promise<void> {
    const root = getRoot();
    if (isNative()) return root.storage.local.set(items);
    return callback((cb) => root.storage.local.set(items, () => cb(undefined as void)));
  },
  get onChanged(): chrome.storage.StorageChangedEvent {
    return getRoot().storage.onChanged;
  },
};

export function getDnr(): typeof chrome.declarativeNetRequest {
  return getRoot().declarativeNetRequest;
}

export function getAction(): typeof chrome.action {
  return getRoot().action;
}
