import { getDnr } from "./browser-api";
import type { HeaderRule, MatchType, RuleSet } from "./types";

// Chrome exposes chrome.declarativeNetRequest.{RuleActionType,HeaderOperation,
// ResourceType} as real runtime objects; Firefox implements the DNR functions
// but leaves those enum helpers undefined. Use the literal string values from
// the spec directly (asserted to the enum types for TS) instead of reading
// enum members at runtime, so this works on both browsers.
const RESOURCE_TYPES = [
  "main_frame",
  "sub_frame",
  "stylesheet",
  "script",
  "image",
  "font",
  "object",
  "xmlhttprequest",
  "ping",
  "csp_report",
  "media",
  "websocket",
  "other",
] as chrome.declarativeNetRequest.ResourceType[];

// declarativeNetRequest rule ids must be positive integers, stable only for
// the duration of one sync. We fully replace the dynamic rule set on every
// change, so re-numbering 1..n each time is simpler and safer than trying to
// keep a persistent string-id -> number mapping in sync.
function toCondition(matchType: MatchType, matchValue: string): chrome.declarativeNetRequest.RuleCondition {
  switch (matchType) {
    case "hostname":
      return { requestDomains: [matchValue], resourceTypes: RESOURCE_TYPES };
    case "urlContains":
      return { urlFilter: matchValue, resourceTypes: RESOURCE_TYPES };
    case "urlRegex":
      return { regexFilter: matchValue, resourceTypes: RESOURCE_TYPES };
    case "all":
    default:
      return { resourceTypes: RESOURCE_TYPES };
  }
}

function toHeaderOp(rule: HeaderRule): chrome.declarativeNetRequest.ModifyHeaderInfo {
  return rule.action === "set"
    ? {
        header: rule.headerName,
        operation: "set" as chrome.declarativeNetRequest.HeaderOperation,
        value: rule.headerValue,
      }
    : {
        header: rule.headerName,
        operation: "remove" as chrome.declarativeNetRequest.HeaderOperation,
      };
}

function toDnrRule(rule: HeaderRule, id: number): chrome.declarativeNetRequest.Rule {
  const op = toHeaderOp(rule);
  return {
    id,
    priority: 1,
    action: {
      type: "modifyHeaders" as chrome.declarativeNetRequest.RuleActionType,
      ...(rule.target === "response" ? { responseHeaders: [op] } : { requestHeaders: [op] }),
    },
    condition: toCondition(rule.matchType, rule.matchValue),
  };
}

/** Returns the number of rules actually applied, for the toolbar badge count. */
export async function syncDynamicRules(ruleSet: RuleSet): Promise<number> {
  const dnr = getDnr();
  const existing = await dnr.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);

  const active = ruleSet.masterEnabled
    ? ruleSet.rules.filter((r) => r.enabled && r.headerName.trim().length > 0)
    : [];
  const addRules = active.map((rule, i) => toDnrRule(rule, i + 1));

  await dnr.updateDynamicRules({ removeRuleIds, addRules });
  return active.length;
}
