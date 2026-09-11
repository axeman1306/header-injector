import { getAction, storage } from "./browser-api";
import { syncDynamicRules } from "./dnr";
import { loadRuleSet } from "./storage";

const BADGE_COLOR = "#C60C30"; // Bills red

async function resync(): Promise<void> {
  const ruleSet = await loadRuleSet();
  const activeCount = await syncDynamicRules(ruleSet);
  const action = getAction();
  await action.setBadgeText({ text: activeCount > 0 ? String(activeCount) : "" });
  await action.setBadgeBackgroundColor({ color: BADGE_COLOR });
}

// Apply whatever was last saved as soon as the extension starts or updates.
resync();

storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && "ruleSet" in changes) resync();
});
