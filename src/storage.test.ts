import { describe, expect, test } from "bun:test";

(globalThis as any).chrome = {
  storage: {
    local: { get: undefined as any, set: undefined as any },
    onChanged: { addListener: () => {} },
  },
  runtime: { lastError: undefined },
};

const { loadRuleSet, saveRuleSet } = await import("./storage");

function stubGet(stored: Record<string, unknown>) {
  (globalThis as any).chrome.storage.local.get = (_keys: unknown, cb: (r: unknown) => void) => cb(stored);
}

describe("loadRuleSet", () => {
  test("returns the empty rule set when nothing is stored", async () => {
    stubGet({});
    const result = await loadRuleSet();
    expect(result).toEqual({ masterEnabled: true, rules: [] });
  });

  test("returns the empty rule set when stored.rules is malformed", async () => {
    stubGet({ ruleSet: { masterEnabled: true, rules: "not-an-array" } });
    const result = await loadRuleSet();
    expect(result.rules).toEqual([]);
  });

  test("backfills fields added after a rule was first saved (e.g. target)", async () => {
    stubGet({
      ruleSet: {
        masterEnabled: true,
        rules: [{ id: "old-1", enabled: true, headerName: "X-Old", headerValue: "v", action: "set", matchType: "all", matchValue: "" }],
      },
    });
    const result = await loadRuleSet();
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0]!.target).toBe("request");
    expect(result.rules[0]!.id).toBe("old-1");
  });
});

describe("saveRuleSet", () => {
  test("writes under the 'ruleSet' storage key", async () => {
    const calls: any[] = [];
    (globalThis as any).chrome.storage.local.set = (items: unknown, cb: () => void) => {
      calls.push(items);
      cb();
    };
    const ruleSet = { masterEnabled: false, rules: [] };
    await saveRuleSet(ruleSet);
    expect(calls).toEqual([{ ruleSet }]);
  });
});
