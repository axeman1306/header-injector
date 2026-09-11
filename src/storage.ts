import { storage } from "./browser-api";
import { EMPTY_RULE_SET, type RuleSet } from "./types";

const KEY = "ruleSet";

export async function loadRuleSet(): Promise<RuleSet> {
  const data = await storage.get();
  const stored = data[KEY] as RuleSet | undefined;
  if (!stored || !Array.isArray(stored.rules)) return { ...EMPTY_RULE_SET };
  return stored;
}

export async function saveRuleSet(ruleSet: RuleSet): Promise<void> {
  await storage.set({ [KEY]: ruleSet });
}
