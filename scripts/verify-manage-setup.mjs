import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const artifacts = resolve("artifacts/manage-setup");
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const theme of ["dark", "light"]) for (const surface of ["board", "events"]) {
    const page = await browser.newPage({ viewport: { width: surface === "board" ? 1280 : 240, height: 720 } });
    const colors = theme === "dark"
      ? { foreground: "#cccccc", background: "#1f1f1f", border: "#454545", secondary: "#313131", secondaryHover: "#454545", description: "#9d9d9d" }
      : { foreground: "#333333", background: "#ffffff", border: "#cccccc", secondary: "#e5e5e5", secondaryHover: "#cccccc", description: "#616161" };
    const css = `:root{--vscode-font-family:-apple-system,BlinkMacSystemFont,sans-serif;--vscode-foreground:${colors.foreground};--vscode-editor-background:${colors.background};--vscode-panel-border:${colors.border};--vscode-descriptionForeground:${colors.description};--vscode-button-background:#0078d4;--vscode-button-foreground:#ffffff;--vscode-button-hoverBackground:#026ec1;--vscode-button-secondaryBackground:${colors.secondary};--vscode-button-secondaryForeground:${colors.foreground};--vscode-button-secondaryHoverBackground:${colors.secondaryHover};--vscode-focusBorder:#007fd4;--vscode-errorForeground:#d13438}`;
    await page.route("http://manage.test/**", async (route) => {
      const name = new URL(route.request().url()).pathname.slice(1);
      if (!name) return route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>${css}</style></head><body data-surface="${surface}"><div id="root"></div><script type="module" src="/${surface}.js"></script></body></html>` });
      return route.fulfill({ contentType: name.endsWith("css") ? "text/css" : "text/javascript", body: await readFile(resolve("packages/extension/dist/webview", name)) });
    });
    await page.addInitScript(() => {
      window.requests = [];
      window.acquireVsCodeApi = () => ({ postMessage(message) {
        window.requests.push(message);
        if (message.type === "ready") setTimeout(() => window.dispatchEvent(new MessageEvent("message", { data: { type: "unconfigured" } })), 0);
      } });
    });
    await page.goto("http://manage.test/");
    const choose = page.getByRole("button", { name: "manage.yamlを選ぶ", exact: true });
    const create = page.getByRole("button", { name: "新しく作る", exact: true });
    await choose.waitFor();
    for (const mode of ["unset", "missing"]) {
      if (mode === "missing") await page.evaluate(() => window.dispatchEvent(new MessageEvent("message", { data: { type: "snapshot", payload: {
        version: 1, projects: [], selectedEventId: null, error: null,
        settings: { workdays_off: ["sat", "sun"], public_holidays: true }, projectEntries: [],
        manageAvailability: { status: "missing", path: `/data/${"long-directory/".repeat(8)}manage.yaml` },
      } } })));
      await choose.waitFor();
      await page.screenshot({ path: `${artifacts}/${surface}-${theme}-${mode}.png` });
      for (const button of [choose, create]) {
        const initial = await button.evaluate((node) => {
          const style = getComputedStyle(node); const box = node.getBoundingClientRect();
          return { background: style.backgroundColor, padding: parseFloat(style.paddingLeft), border: parseFloat(style.borderTopWidth), left: box.left, right: box.right };
        });
        assert.notEqual(initial.background, "rgba(0, 0, 0, 0)");
        assert.ok(initial.border > 0 && initial.padding > 0);
        assert.ok(initial.left >= 0 && initial.right <= page.viewportSize().width);
        await button.hover();
        const hover = await button.evaluate((node) => getComputedStyle(node).backgroundColor);
        assert.notEqual(hover, initial.background);
        await page.mouse.move(0, 0);
      }
      await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
      await page.keyboard.press("Tab");
      await choose.focus();
      await page.keyboard.press("Tab");
      assert.equal(await create.evaluate((node) => node === document.activeElement), true);
      assert.equal(await create.evaluate((node) => node.matches(":focus-visible")), true);
      assert.ok(await create.evaluate((node) => parseFloat(getComputedStyle(node).outlineWidth) > 0));
      await page.screenshot({ path: `${artifacts}/${surface}-${theme}-${mode}-focus.png` });
      await page.keyboard.press("Space");
      await choose.focus(); await page.keyboard.press("Enter");
      const operations = await page.evaluate(() => window.requests.slice(-2).map((item) => item.type));
      assert.deepEqual(operations, ["createManage", "chooseManage"]);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      results.push({ scenario: "REQ-029-S01/REQ-029-S02/REQ-029-S09", theme, surface, mode, passed: true });
    }
    await page.close();
  }
  await writeFile(`${artifacts}/browser-results.json`, JSON.stringify({ date: "2026-11-11", results }, null, 2));
  console.log(`${results.length} theme/surface/state combinations passed`);
} finally { await browser.close(); }
