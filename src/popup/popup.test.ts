import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

// popup.ts queries the DOM at module load time, so the document (and the
// chrome stub storage.ts depends on) must exist before each dynamic import.
// bun:test has no module-cache reset between tests, so every test imports
// popup.ts with a fresh cache-busting query param to re-run its top-level
// setup against that test's own fresh document.
let importCounter = 0;

const RULE_TEMPLATE = `
  <div class="rule" data-id="">
    <div class="rule-row">
      <input type="checkbox" class="f-enabled" title="Enabled" />
      <select class="f-action">
        <option value="set">Set</option>
        <option value="remove">Remove</option>
      </select>
      <input type="text" class="f-name" placeholder="Header name" />
      <input type="text" class="f-value" placeholder="Value" />
      <button type="button" class="remove-rule" title="Delete rule">&times;</button>
    </div>
    <div class="rule-row">
      <select class="f-target">
        <option value="request">Request</option>
        <option value="response">Response</option>
      </select>
      <select class="f-matchtype">
        <option value="all">All URLs</option>
        <option value="hostname">Hostname is</option>
        <option value="urlContains">URL contains</option>
        <option value="urlRegex">URL matches regex</option>
      </select>
      <input type="text" class="f-matchvalue" placeholder="example.com" />
    </div>
  </div>
`;

function setupDom(seedRuleSet: Record<string, unknown>) {
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `
    <header>
      <label class="master-toggle"><input type="checkbox" id="master-enabled" /></label>
    </header>
    <div id="rules"></div>
    <button id="add-rule" type="button">+ Add header</button>
    <footer>
      <button id="export-btn" type="button">Export JSON</button>
      <input type="file" id="import-input" />
    </footer>
    <template id="rule-template">${RULE_TEMPLATE}</template>
  `;

  (globalThis as any).window = window;
  (globalThis as any).document = document;
  (globalThis as any).HTMLTemplateElement = (window as any).HTMLTemplateElement;
  (globalThis as any).HTMLInputElement = (window as any).HTMLInputElement;
  (globalThis as any).HTMLSelectElement = (window as any).HTMLSelectElement;
  (globalThis as any).HTMLButtonElement = (window as any).HTMLButtonElement;
  (globalThis as any).HTMLElement = (window as any).HTMLElement;

  const setCalls: any[] = [];
  (globalThis as any).chrome = {
    storage: {
      local: {
        get: (_keys: unknown, cb: (r: unknown) => void) => cb({ ruleSet: seedRuleSet }),
        set: (items: unknown, cb: () => void) => {
          setCalls.push(items);
          cb();
        },
      },
      onChanged: { addListener: () => {} },
    },
    declarativeNetRequest: {},
    runtime: { lastError: undefined },
  };

  return { document, setCalls };
}

async function loadPopup() {
  importCounter += 1;
  await import(`./popup.ts?t=${importCounter}`);
  // loadRuleSet().then(render) resolves as a microtask; flush it.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("popup UI", () => {
  test("renders one .rule element per stored rule, with fields populated", async () => {
    const { document } = setupDom({
      masterEnabled: true,
      rules: [
        { id: "r1", enabled: true, headerName: "X-Test", headerValue: "abc", action: "set", target: "request", matchType: "hostname", matchValue: "example.com" },
      ],
    });
    await loadPopup();

    const rules = document.querySelectorAll(".rule");
    expect(rules.length).toBe(1);
    expect((document.querySelector(".f-name") as HTMLInputElement).value).toBe("X-Test");
    expect((document.querySelector(".f-value") as HTMLInputElement).value).toBe("abc");
    expect((document.querySelector(".f-target") as HTMLSelectElement).value).toBe("request");
    expect((document.getElementById("master-enabled") as HTMLInputElement).checked).toBe(true);
  });

  test("clicking + Add header appends an empty rule and persists it", async () => {
    const { document, setCalls } = setupDom({ masterEnabled: true, rules: [] });
    await loadPopup();

    (document.getElementById("add-rule") as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.querySelectorAll(".rule").length).toBe(1);
    expect(setCalls.length).toBeGreaterThan(0);
    const lastSaved = setCalls[setCalls.length - 1].ruleSet;
    expect(lastSaved.rules).toHaveLength(1);
    expect(lastSaved.rules[0].target).toBe("request");
  });

  test("toggling the enabled checkbox updates and persists rule.enabled", async () => {
    const { document, setCalls } = setupDom({
      masterEnabled: true,
      rules: [{ id: "r1", enabled: true, headerName: "X-A", headerValue: "1", action: "set", target: "request", matchType: "all", matchValue: "" }],
    });
    await loadPopup();

    const checkbox = document.querySelector(".f-enabled") as HTMLInputElement;
    checkbox.checked = false;
    checkbox.dispatchEvent(new (globalThis as any).window.Event("change"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const lastSaved = setCalls[setCalls.length - 1].ruleSet;
    expect(lastSaved.rules[0].enabled).toBe(false);
    expect(document.querySelector(".rule")!.classList.contains("disabled")).toBe(true);
  });

  test("clicking remove-rule deletes that rule and persists the shorter list", async () => {
    const { document, setCalls } = setupDom({
      masterEnabled: true,
      rules: [
        { id: "keep", enabled: true, headerName: "X-Keep", headerValue: "", action: "set", target: "request", matchType: "all", matchValue: "" },
        { id: "drop", enabled: true, headerName: "X-Drop", headerValue: "", action: "set", target: "request", matchType: "all", matchValue: "" },
      ],
    });
    await loadPopup();

    const removeButtons = document.querySelectorAll(".remove-rule");
    (removeButtons[1] as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.querySelectorAll(".rule").length).toBe(1);
    const lastSaved = setCalls[setCalls.length - 1].ruleSet;
    expect(lastSaved.rules).toHaveLength(1);
    expect(lastSaved.rules[0].id).toBe("keep");
  });

  test("switching action to 'remove' hides the value field", async () => {
    const { document } = setupDom({
      masterEnabled: true,
      rules: [{ id: "r1", enabled: true, headerName: "X-A", headerValue: "v", action: "set", target: "request", matchType: "all", matchValue: "" }],
    });
    await loadPopup();

    const actionSelect = document.querySelector(".f-action") as HTMLSelectElement;
    actionSelect.value = "remove";
    actionSelect.dispatchEvent(new (globalThis as any).window.Event("change"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((document.querySelector(".f-value") as HTMLInputElement).hidden).toBe(true);
  });
});
