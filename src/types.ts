export type MatchType = "all" | "hostname" | "urlContains" | "urlRegex";

export interface HeaderRule {
  /** Stable string id (crypto.randomUUID). Never reused as a DNR numeric rule id. */
  id: string;
  enabled: boolean;
  headerName: string;
  /** Ignored when action is "remove". */
  headerValue: string;
  action: "set" | "remove";
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
    matchType: "all",
    matchValue: "",
  };
}
