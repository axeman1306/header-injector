import { describe, expect, test } from "bun:test";

// declarativeNetRequest's enums are runtime objects the real browser injects
// on the global `chrome`; outside a browser they don't exist, so tests supply
// the same string values Chrome actually uses (verified against the MV3 docs).
(globalThis as any).chrome = {
  declarativeNetRequest: {
    RuleActionType: { MODIFY_HEADERS: "modifyHeaders" },
    HeaderOperation: { SET: "set", REMOVE: "remove" },
    ResourceType: {
      MAIN_FRAME: "main_frame",
      SUB_FRAME: "sub_frame",
      XMLHTTPREQUEST: "xmlhttprequest",
      SCRIPT: "script",
      IMAGE: "image",
      STYLESHEET: "stylesheet",
      FONT: "font",
      OBJECT: "object",
      PING: "ping",
      CSP_REPORT: "csp_report",
      MEDIA: "media",
      WEBSOCKET: "websocket",
      OTHER: "other",
    },
    getDynamicRules: async () => [],
    updateDynamicRules: async () => {},
  },
  storage: { local: {}, onChanged: { addListener: () => {} } },
  runtime: { lastError: undefined },
};

const { syncDynamicRules } = await import("./dnr");
const { newRule } = await import("./types");

describe("syncDynamicRules", () => {
  test("maps a 'set' rule with hostname match to a DNR rule", async () => {
    const calls: any[] = [];
    (globalThis as any).chrome.declarativeNetRequest.updateDynamicRules = async (arg: any) => {
      calls.push(arg);
    };

    const rule = newRule();
    rule.headerName = "X-Test-Header";
    rule.headerValue = "hello-from-injector";
    rule.action = "set";
    rule.matchType = "hostname";
    rule.matchValue = "httpbin.org";

    await syncDynamicRules({ masterEnabled: true, rules: [rule] });

    expect(calls).toHaveLength(1);
    const { addRules } = calls[0];
    expect(addRules).toHaveLength(1);
    expect(addRules[0].action.type).toBe("modifyHeaders");
    expect(addRules[0].action.requestHeaders[0]).toEqual({
      header: "X-Test-Header",
      operation: "set",
      value: "hello-from-injector",
    });
    expect(addRules[0].condition.requestDomains).toEqual(["httpbin.org"]);
  });

  test("maps a 'remove' rule with no value field", async () => {
    const calls: any[] = [];
    (globalThis as any).chrome.declarativeNetRequest.updateDynamicRules = async (arg: any) => {
      calls.push(arg);
    };

    const rule = newRule();
    rule.headerName = "Referer";
    rule.action = "remove";
    rule.matchType = "all";

    await syncDynamicRules({ masterEnabled: true, rules: [rule] });

    const op = calls[0].addRules[0].action.requestHeaders[0];
    expect(op).toEqual({ header: "Referer", operation: "remove" });
    expect(calls[0].addRules[0].condition.requestDomains).toBeUndefined();
  });

  test("disabled rule and master-off both produce zero active rules", async () => {
    const calls: any[] = [];
    (globalThis as any).chrome.declarativeNetRequest.updateDynamicRules = async (arg: any) => {
      calls.push(arg);
    };

    const rule = newRule();
    rule.headerName = "X-Off";
    rule.enabled = false;
    await syncDynamicRules({ masterEnabled: true, rules: [rule] });
    expect(calls[0].addRules).toHaveLength(0);

    rule.enabled = true;
    await syncDynamicRules({ masterEnabled: false, rules: [rule] });
    expect(calls[1].addRules).toHaveLength(0);
  });

  test("removes previously-registered dynamic rule ids before adding new ones", async () => {
    (globalThis as any).chrome.declarativeNetRequest.getDynamicRules = async () => [
      { id: 1 },
      { id: 2 },
    ];
    const calls: any[] = [];
    (globalThis as any).chrome.declarativeNetRequest.updateDynamicRules = async (arg: any) => {
      calls.push(arg);
    };

    await syncDynamicRules({ masterEnabled: true, rules: [] });

    expect(calls[0].removeRuleIds).toEqual([1, 2]);
  });
});
