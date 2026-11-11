import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import { parse } from "../packages/extension/node_modules/yaml/dist/index.js";

const artifacts = resolve("artifacts/board-layout");
await mkdir(artifacts, { recursive: true });
const example = resolve("examples/readme-demo");
const manage = parse(await readFile(resolve(example, "manage.yaml"), "utf8"));
const projects = await Promise.all(manage.projects.filter((p) => p.load).map(async (p) => parse(await readFile(resolve(example, p.file), "utf8"))));
const snapshot = {
  version: 1, projects, selectedEventId: projects[0].events[0].id, error: null,
  settings: manage.settings,
  projectEntries: manage.projects.filter((p) => p.load).map((p, i) => ({ ...p, name: projects[i].name, color: projects[i].color })),
};
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const theme of ["dark", "light"]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const dark = theme === "dark";
    const css = `:root{--vscode-font-family:-apple-system,BlinkMacSystemFont,sans-serif;--vscode-foreground:${dark ? "#d4d4d4" : "#333333"};--vscode-editor-background:${dark ? "#181818" : "#ffffff"};--vscode-sideBar-background:${dark ? "#202020" : "#f3f3f3"};--vscode-panel-border:${dark ? "#454545" : "#cccccc"};--vscode-descriptionForeground:${dark ? "#a3a3a3" : "#616161"};--vscode-focusBorder:#007fd4;--vscode-charts-blue:#4c8dff;--vscode-charts-red:#e35b5b;--vscode-charts-green:#3a995c;--vscode-charts-yellow:#e5c76b;--vscode-list-hoverBackground:${dark ? "#292f38" : "#eeeeee"}}`;
    await page.route("http://board.test/**", async (route) => {
      const name = new URL(route.request().url()).pathname.slice(1);
      if (!name) return route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="ja"><head><meta charset="utf-8"><link rel="stylesheet" href="/style.css"><style>${css}</style></head><body><div id="root"></div><script type="module" src="/board.js"></script></body></html>` });
      return route.fulfill({ contentType: name.endsWith("css") ? "text/css" : "text/javascript", body: await readFile(resolve("packages/extension/dist/webview", name)) });
    });
    await page.addInitScript((payload) => {
      const RealDate = Date;
      window.Date = class extends RealDate {
        constructor(...args) { if (args.length) super(...args); else super("2026-11-06T03:00:00Z"); }
        static now() { return RealDate.parse("2026-11-06T03:00:00Z"); }
      };
      window.snapshot = payload;
      window.requests = [];
      window.acquireVsCodeApi = () => ({ postMessage(message) {
        window.requests.push(message);
        if (message.type === "moveProject") {
          const from = window.snapshot.projects.findIndex((p) => p.id === message.projectId);
          const [project] = window.snapshot.projects.splice(from, 1);
          const to = window.snapshot.projects.findIndex((p) => p.id === message.targetProjectId);
          window.snapshot.projects.splice(to + (message.placement === "after" ? 1 : 0), 0, project);
          window.snapshot.version++;
        }
        if (message.type === "ready" || message.type === "moveProject") setTimeout(() => {
          window.dispatchEvent(new MessageEvent("message", { data: { type: "snapshot", payload: window.snapshot } }));
          if (message.requestId) window.dispatchEvent(new MessageEvent("message", { data: { type: "operationResult", requestId: message.requestId, payload: { ok: true } } }));
        }, 0);
      } });
    }, snapshot);
    await page.goto("http://board.test/");
    await page.locator(".project-row").first().waitFor();
    const heights = () => page.evaluate(() => {
      const top = document.querySelector(".timeline-panel").getBoundingClientRect().height;
      const bottom = document.querySelector(".board-details-panel").getBoundingClientRect().height;
      return { top, bottom, ratio: top / (top + bottom) };
    });
    // REQ-031-S01: 境界を除いた3:2。
    const initial = await heights();
    assert.ok(Math.abs(initial.ratio - 0.6) < 0.002, JSON.stringify(initial));
    const rowHeights = await page.locator(".project-row").evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height));
    assert.ok(rowHeights.every((h) => h <= 44.1), JSON.stringify(rowHeights));
    // REQ-016-S01〜S05: 全期間の行高と既存の詳細操作。
    const periodRows = {};
    for (const [label, period] of [["3日", "three-days"], ["月", "month"], ["1週間", "week"]]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(page.locator(`.timeline-${period}`)).toBeVisible();
      periodRows[period] = await page.locator(".project-row").evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height));
      assert.ok(periodRows[period].every((h) => Math.abs(h - 44) < 0.1), JSON.stringify(periodRows));
      await page.locator(".project-actions .detail-button").first().click();
      await expect(page.getByRole("dialog", { name: "詳細パネル", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "詳細を閉じる", exact: true }).click();
      await page.screenshot({ path: `${artifacts}/${theme}-${period}.png` });
    }
    await page.screenshot({ path: `${artifacts}/${theme}-default.png` });
    const separator = page.getByRole("separator", { name: "タイムラインと詳細の高さ" });
    // REQ-031-S02: 選択を保ったまま連続調整し、解放後は固定する。
    const selectionBefore = await page.locator(".event-summary").textContent();
    const box = await separator.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 120, { steps: 10 });
    await page.mouse.up();
    const expanded = await heights();
    assert.equal(await page.locator(".event-summary").textContent(), selectionBefore);
    await page.mouse.move(20, 20);
    assert.deepEqual(await heights(), expanded);
    assert.ok(Math.abs(expanded.top - initial.top - 120) < 2);
    // REQ-031-S04: 両方向のキーを5ポイントずつ使える。
    await separator.focus();
    await page.keyboard.press("ArrowUp");
    assert.ok(Math.abs((await heights()).ratio - (expanded.ratio - 0.05)) < 0.002);
    await page.keyboard.press("ArrowDown");
    assert.ok(Math.abs((await heights()).ratio - expanded.ratio) < 0.002);
    await separator.dblclick();
    assert.ok(Math.abs((await heights()).ratio - 0.6) < 0.002);
    // REQ-032-S02: 下半分への実ドラッグ。
    const target = page.locator(".project-row").nth(2);
    await page.locator(".project-drag-handle").first().dragTo(target, { targetPosition: { x: 200, y: 40 } });
    await page.waitForFunction(() => window.requests.some((r) => r.type === "moveProject"));
    const move = await page.evaluate(() => window.requests.find((r) => r.type === "moveProject"));
    assert.equal(move.projectId, projects[0].id);
    assert.equal(move.targetProjectId, projects[2].id);
    assert.equal(move.placement, "after");
    await page.waitForFunction((id) => document.querySelectorAll(".project-row")[2].dataset.projectId === id, projects[0].id);
    assert.equal(await page.evaluate(() => window.requests.some((r) => r.type === "selectEvent")), false);
    await page.locator(".project-drag-handle").nth(2).focus();
    await page.keyboard.press("ArrowUp");
    await page.waitForFunction(() => window.requests.filter((r) => r.type === "moveProject").length === 2);
    await page.waitForFunction((id) => document.querySelectorAll(".project-row")[1].dataset.projectId === id, projects[0].id);
    // REQ-032-S01/S02/S06: 前後への実ドラッグ、上下キー、両端と選択維持。
    await page.locator(".project-drag-handle").nth(2).dragTo(page.locator(".project-row").first(), { targetPosition: { x: 200, y: 4 } });
    await page.waitForFunction((id) => document.querySelector(".project-row").dataset.projectId === id, projects[2].id);
    const beforeMove = await page.evaluate(() => window.requests.filter((r) => r.type === "moveProject").at(-1));
    assert.equal(beforeMove.placement, "before");
    await page.locator(".project-drag-handle").first().focus();
    await page.keyboard.press("ArrowDown");
    await page.waitForFunction((id) => document.querySelectorAll(".project-row")[1].dataset.projectId === id, projects[2].id);
    const countBeforeEdges = await page.evaluate(() => window.requests.filter((r) => r.type === "moveProject").length);
    await page.locator(".project-drag-handle").first().focus(); await page.keyboard.press("ArrowUp");
    await page.locator(".project-drag-handle").last().focus(); await page.keyboard.press("ArrowDown");
    assert.equal(await page.evaluate(() => window.requests.filter((r) => r.type === "moveProject").length), countBeforeEdges);
    assert.equal(await page.locator(".event-summary").textContent(), selectionBefore);
    const many = [...projects, ...Array.from({ length: 20 }, (_, i) => ({ id: randomUUID(), name: `追加プロジェクト ${i + 1}`, color: "#47b8c3", events: [] }))];
    await page.evaluate((items) => {
      window.snapshot.projects = items;
      window.snapshot.version++;
      window.dispatchEvent(new MessageEvent("message", { data: { type: "snapshot", payload: window.snapshot } }));
    }, many);
    await page.waitForFunction(() => document.querySelectorAll(".project-row").length > 20);
    assert.equal(await page.locator(".timeline-panel").evaluate((el) => el.scrollHeight > el.clientHeight), true);
    assert.ok(Math.abs((await heights()).ratio - 0.6) < 0.002);
    await page.setViewportSize({ width: 1100, height: 640 });
    assert.ok(Math.abs((await heights()).ratio - 0.6) < 0.002);
    const smallBox = await separator.boundingBox();
    await page.mouse.move(smallBox.x + 100, smallBox.y + 6);
    await page.mouse.down();
    await page.mouse.move(smallBox.x + 100, 0, { steps: 10 });
    await page.mouse.up();
    const minimized = await heights();
    assert.ok(minimized.top >= 79 && minimized.bottom >= 79);
    assert.equal(await page.locator(".board-content").evaluate((el) => el.classList.contains("board-resizing")), false);
    await separator.focus();
    await page.keyboard.press("Home");
    assert.ok(Math.abs((await heights()).ratio - 0.6) < 0.002);
    // REQ-031-S03: 上下両端の80px下限と、極小画面の40%下限。
    const dragBoundary = async (y) => {
      const rect = await separator.boundingBox();
      await page.mouse.move(rect.x + 100, rect.y + 6);
      await page.mouse.down();
      await page.mouse.move(rect.x + 100, y, { steps: 8 });
      await page.mouse.up();
    };
    await dragBoundary(640);
    assert.ok(Math.abs((await heights()).bottom - 80) < 0.1);
    await page.setViewportSize({ width: 1100, height: 280 });
    await separator.focus(); await page.keyboard.press("Home");
    await dragBoundary(0);
    const tiny = await heights();
    assert.ok(Math.abs(tiny.ratio - 0.4) < 0.002);
    await dragBoundary(280);
    assert.ok(Math.abs((await heights()).ratio - 0.6) < 0.002);
    // REQ-031-S02: Pointer Cancelでも移動を終える。
    const cancelBox = await separator.boundingBox();
    await page.mouse.move(cancelBox.x + 100, cancelBox.y + 6);
    await page.mouse.down();
    await separator.evaluate((node) => node.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 1, bubbles: true })));
    const cancelled = await heights();
    await page.mouse.move(30, 30); await page.mouse.up();
    assert.deepEqual(await heights(), cancelled);
    assert.equal(await page.locator(".board-content").evaluate((node) => node.classList.contains("board-resizing")), false);
    // REQ-031-S05: 詳細3列をそれぞれスクロールできる。
    for (const panel of await page.locator(".event-details > *").all()) {
      assert.equal(await panel.evaluate((node) => node.scrollHeight > node.clientHeight), true);
      assert.ok(await panel.evaluate((node) => { node.scrollTop = 500; return node.scrollTop; }) > 0);
    }
    assert.deepEqual(errors, []);
    results.push({ theme, date: "2026-11-11", browser: browser.version(), scenarios: ["REQ-016-S05", "REQ-031-S01", "REQ-031-S02", "REQ-031-S03", "REQ-031-S04", "REQ-031-S05", "REQ-032-S01", "REQ-032-S02", "REQ-032-S06"], initial, rowHeights, periodRows, expanded, minimized, tiny, cancelled, reorderOperations: countBeforeEdges, passed: true });
    await page.close();
  }
  await writeFile(`${artifacts}/results.json`, JSON.stringify(results, null, 2));
  console.log(`Both themes passed: 3:2 split, drag/keyboard resizing, compact rows, drag/keyboard reorder, scrolling, viewport resize, minimum heights. ${artifacts}`);
} finally {
  await browser.close();
}
