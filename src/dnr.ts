import { dnr } from "./browser-api";
import type { HeaderRule, MatchType, RuleSet } from "./types";

// declarativeNetRequest rule ids must be positive integers, stable only for
// the duration of one sync. We fully replace the dynamic rule set on every
// change, so re-numbering 1..n each time is simpler and safer than trying to
// keep a persistent string-id -> number mapping in sync.
function toCondition(matchType: MatchType, matchValue: string): chrome.declarativeNetRequest.RuleCondition {
  const resourceTypes = Object.values(
    chrome.declarativeNetRequest.ResourceType,
  ) as chrome.declarativeNetRequest.ResourceType[];

  switch (matchType) {
    case "hostname":
      return { requestDomains: [matchValue], resourceTypes };
    case "urlContains":
      return { urlFilter: matchValue, resourceTypes };
    case "urlRegex":
      return { regexFilter: matchValue, resourceTypes };
    case "all":
    default:
      return { resourceTypes };
  }
}

function toDnrRule(rule: HeaderRule, id: number): chrome.declarativeNetRequest.Rule {
  return {
    id,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      requestHeaders: [
        rule.action === "set"
          ? {
              header: rule.headerName,
              operation: chrome.declarativeNetRequest.HeaderOperation.SET,
              value: rule.headerValue,
            }
          : {
              header: rule.headerName,
              operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
            },
      ],
    },
    condition: toCondition(rule.matchType, rule.matchValue),
  };
}

export async function syncDynamicRules(ruleSet: RuleSet): Promise<void> {
  const existing = await dnr.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);

  const active = ruleSet.masterEnabled
    ? ruleSet.rules.filter((r) => r.enabled && r.headerName.trim().length > 0)
    : [];
  const addRules = active.map((rule, i) => toDnrRule(rule, i + 1));

  await dnr.updateDynamicRules({ removeRuleIds, addRules });
}
