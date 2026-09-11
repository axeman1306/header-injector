import { loadRuleSet, saveRuleSet } from "../storage";
import { newRule, normalizeRule, type HeaderRule, type HeaderTarget, type MatchType, type RuleSet } from "../types";

let ruleSet: RuleSet = { masterEnabled: true, rules: [] };

const rulesEl = document.getElementById("rules") as HTMLDivElement;
const masterEl = document.getElementById("master-enabled") as HTMLInputElement;
const template = document.getElementById("rule-template") as HTMLTemplateElement;

async function persist(): Promise<void> {
  await saveRuleSet(ruleSet);
}

function render(): void {
  masterEl.checked = ruleSet.masterEnabled;
  rulesEl.innerHTML = "";
  for (const rule of ruleSet.rules) rulesEl.appendChild(renderRule(rule));
}

function renderRule(rule: HeaderRule): HTMLElement {
  const node = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
  node.dataset.id = rule.id;
  node.classList.toggle("disabled", !rule.enabled);

  const enabled = node.querySelector<HTMLInputElement>(".f-enabled")!;
  const action = node.querySelector<HTMLSelectElement>(".f-action")!;
  const name = node.querySelector<HTMLInputElement>(".f-name")!;
  const value = node.querySelector<HTMLInputElement>(".f-value")!;
  const target = node.querySelector<HTMLSelectElement>(".f-target")!;
  const matchType = node.querySelector<HTMLSelectElement>(".f-matchtype")!;
  const matchValue = node.querySelector<HTMLInputElement>(".f-matchvalue")!;
  const removeBtn = node.querySelector<HTMLButtonElement>(".remove-rule")!;

  enabled.checked = rule.enabled;
  action.value = rule.action;
  name.value = rule.headerName;
  value.value = rule.headerValue;
  target.value = rule.target;
  matchType.value = rule.matchType;
  matchValue.value = rule.matchValue;
  value.hidden = rule.action === "remove";
  matchValue.hidden = rule.matchType === "all";

  const update = (patch: Partial<HeaderRule>) => {
    Object.assign(rule, patch);
    node.classList.toggle("disabled", !rule.enabled);
    void persist();
  };

  enabled.addEventListener("change", () => update({ enabled: enabled.checked }));
  action.addEventListener("change", () => {
    const next = action.value as HeaderRule["action"];
    value.hidden = next === "remove";
    update({ action: next });
  });
  name.addEventListener("input", () => update({ headerName: name.value }));
  value.addEventListener("input", () => update({ headerValue: value.value }));
  target.addEventListener("change", () => update({ target: target.value as HeaderTarget }));
  matchType.addEventListener("change", () => {
    const next = matchType.value as MatchType;
    matchValue.hidden = next === "all";
    update({ matchType: next });
  });
  matchValue.addEventListener("input", () => update({ matchValue: matchValue.value }));
  removeBtn.addEventListener("click", () => {
    ruleSet.rules = ruleSet.rules.filter((r) => r.id !== rule.id);
    void persist();
    render();
  });

  return node;
}

masterEl.addEventListener("change", () => {
  ruleSet.masterEnabled = masterEl.checked;
  void persist();
});

document.getElementById("add-rule")!.addEventListener("click", () => {
  ruleSet.rules.push(newRule());
  void persist();
  render();
});

document.getElementById("export-btn")!.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(ruleSet, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "header-injector-rules.json";
  a.click();
  URL.revokeObjectURL(url);
});

const importInput = document.getElementById("import-input") as HTMLInputElement;
importInput.addEventListener("change", async () => {
  const file = importInput.files?.[0];
  importInput.value = "";
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text()) as Partial<RuleSet>;
    if (!Array.isArray(parsed.rules)) throw new Error("missing rules array");
    ruleSet = {
      masterEnabled: typeof parsed.masterEnabled === "boolean" ? parsed.masterEnabled : true,
      rules: parsed.rules.map(normalizeRule),
    };
    await persist();
    render();
  } catch (err) {
    alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
  }
});

loadRuleSet().then((loaded) => {
  ruleSet = loaded;
  render();
});
