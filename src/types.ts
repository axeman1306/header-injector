export type MatchType = "all" | "hostname" | "urlContains" | "urlRegex";
export type HeaderTarget = "request" | "response";

export interface HeaderRule {
  /** Stable string id (crypto.randomUUID). Never reused as a DNR numeric rule id. */
  id: string;
  enabled: boolean;
  headerName: string;
  /** Ignored when action is "remove". */
  headerValue: string;
  action: "set" | "remove";
  /** Whether this modifies the outgoing request or the incoming response. */
  target: HeaderTarget;
  matchType: MatchType;
  /** Hostname to match, substring for urlContains, or regex source for urlRegex. Unused for "all". */
  matchValue: string;
}

export interface RuleSet {
  /** Global on/off switch, independent of per-rule enabled flags. */
  masterEnabled: boolean;
  rules: HeaderRule[];
}

export const EMPTY_RULE_SET: RuleSet = { masterEnabled: true, rules: [] };

export function newRule(): HeaderRule {
  return {
    id: crypto.randomUUID(),
    enabled: true,
    headerName: "",
    headerValue: "",
    action: "set",
    target: "request",
    matchType: "all",
    matchValue: "",
  };
}

/** Fills in fields added after a rule was first saved/exported (e.g. `target`). */
export function normalizeRule(rule: Partial<HeaderRule>): HeaderRule {
  return { ...newRule(), ...rule, id: rule.id ?? crypto.randomUUID() };
}
