import { storage } from "./browser-api";
import { syncDynamicRules } from "./dnr";
import { loadRuleSet } from "./storage";

async function resync(): Promise<void> {
  const ruleSet = await loadRuleSet();
  await syncDynamicRules(ruleSet);
}

// Apply whatever was last saved as soon as the extension starts or updates.
resync();

storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && "ruleSet" in changes) resync();
});
