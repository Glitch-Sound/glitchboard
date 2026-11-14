import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, expect } from "@playwright/test";
import { build } from "vite";
import { parse } from "../packages/extension/node_modules/yaml/dist/index.js";

const artifacts = resolve("artifacts/point-readability");
await mkdir(artifacts, { recursive: true });
const phase = process.env.POINT_CONTRAST_PHASE ?? "after";
const runtime = await mkdtemp(resolve(tmpdir(), "gb-point-runtime-"));
await build({ configFile: false, logLevel: "error", ssr: { noExternal: true }, build: { ssr: resolve("packages/extension/src/session.ts"), outDir: runtime, rollupOptions: { output: { entryFileNames: "session.mjs" } } } });
const { BoardSession } = await import(pathToFileURL(resolve(runtime, "session.mjs")).href);
const browser = await chromium.launch({ headless: true });
const results = [], failures = [], stateFailures = [];
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const values = [8, 13, 21, 1, 2, 3, 5, undefined];
const label = value => value === undefined ? "未見積" : `${value}pt`;

// NREQ-003-S02 NREQ-003-S03 NREQ-003-S04:
// CSS 色を読むだけではなく、全祖先の背景と group opacity を合成する。
async function contrast(locator) {
  return locator.evaluate(element => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const rgba = value => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const channels = [...context.getImageData(0, 0, 1, 1).data];
      return [...channels.slice(0, 3), channels[3] / 255];
    };
    const over = (front, back) => {
      const alpha = front[3] + back[3] * (1 - front[3]);
      return [...[0, 1, 2].map(i => alpha ? (front[i] * front[3] + back[i] * back[3] * (1 - front[3])) / alpha : 0), alpha];
    };
    const path = [];
    for (let node = element; node; node = node.parentElement) path.unshift(node);
    const composite = (index, text) => {
      const style = getComputedStyle(path[index]);
      let result = rgba(style.backgroundColor);
      if (index + 1 < path.length) result = over(composite(index + 1, text), result);
      else if (text) result = over(rgba(style.color), result);
      result[3] *= Number(style.opacity);
      return result;
    };
    const foreground = over(composite(0, true), [255, 255, 255, 1]);
    const background = over(composite(0, false), [255, 255, 255, 1]);
    const luminance = channels => channels.slice(0, 3).map(value => {
      const s = value / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
    const a = luminance(foreground), b = luminance(background);
    return { text: element.textContent, foreground, background, contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), opacity: getComputedStyle(element).opacity, border: getComputedStyle(element).borderStyle };
  });
}

try {
  for (const theme of ["dark", "light"]) {
    const root = await mkdtemp(resolve(tmpdir(), "gb-point-")), errors = [], samples = [];
    const tasks = values.flatMap((points, index) => [false, true].map(done => ({
      id: id(10 + index * 2 + Number(done)), name: `${done ? "完了" : "通常"} ${label(points)}`,
      ...(points === undefined ? {} : { points }), ...(done ? { doneAt: "2026-11-13" } : {}),
    })));
    const source = { id: id(1), name: "ポイントの可読性", color: "#4c8dff", events: [{ id: id(2), name: "7段階と完了状態", due: "2026-11-20", tasks, stories: [] }] };
    const file = resolve(root, "A.yaml"), manage = resolve(root, "manage.yaml");
    await writeFile(file, JSON.stringify(source));
    await writeFile(manage, JSON.stringify({ settings: { workdays_off: ["sat", "sun"], public_holidays: true }, projects: [{ file: "A.yaml", load: true }] }));
    const original = await readFile(file, "utf8");
    const session = new BoardSession(manage);
    await session.reload(); session.selectEvent(id(2), "A.yaml");
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    page.setDefaultTimeout(7000); page.on("pageerror", error => errors.push(error.message));
    await page.clock.install({ time: new Date("2026-11-14T03:00:00Z") });
    const dispatch = data => page.evaluate(message => window.dispatchEvent(new MessageEvent("message", { data: message })), data);
    let ready = false;
    const unsubscribe = session.subscribe("board", () => { if (ready) void dispatch({ type: "snapshot", payload: session.snapshot() }).catch(error => errors.push(error.message)); });
    try {
      await page.exposeFunction("extensionMessage", async message => {
        if (message.type === "ready") { ready = true; return dispatch({ type: "snapshot", payload: session.snapshot() }); }
        const payload = await session.handleOperation(message);
        return dispatch({ type: "operationResult", requestId: message.requestId, payload });
      });
      await page.addInitScript(() => { window.acquireVsCodeApi = () => ({ getState: () => ({}), setState: () => {}, postMessage: message => { void window.extensionMessage(message); } }); });
      const css = `:root{--vscode-font-family:-apple-system,BlinkMacSystemFont,sans-serif;--vscode-font-size:13px;--vscode-foreground:${theme === "dark" ? "#d4d4d4" : "#333333"};--vscode-editor-background:${theme === "dark" ? "#181818" : "#ffffff"};--vscode-input-background:${theme === "dark" ? "#222222" : "#ffffff"};--vscode-panel-border:${theme === "dark" ? "#454545" : "#cccccc"};--vscode-descriptionForeground:${theme === "dark" ? "#a3a3a3" : "#616161"};--vscode-focusBorder:#007fd4;--vscode-charts-blue:#4c8dff;--vscode-charts-green:#3a995c;--vscode-list-activeSelectionBackground:${theme === "dark" ? "#264f78" : "#cce5ff"};--vscode-list-hoverBackground:${theme === "dark" ? "#292f38" : "#eeeeee"};--vscode-button-background:#0078d4;--vscode-button-foreground:#ffffff;--vscode-button-secondaryBackground:${theme === "dark" ? "#313131" : "#e5e5e5"};--vscode-button-secondaryForeground:${theme === "dark" ? "#cccccc" : "#333333"}}`;
      await page.route("http://point-review.test/**", async route => {
        const name = new URL(route.request().url()).pathname.slice(1);
        if (!name) return route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="ja"><head><meta charset="utf-8"><link rel="stylesheet" href="/style.css"><style>${css}</style></head><body><div id="root"></div><script type="module" src="/board.js"></script></body></html>` });
        const asset = resolve("packages/extension/dist/webview", name);
        assert.ok(asset.startsWith(resolve("packages/extension/dist/webview") + "/"));
        return route.fulfill({ contentType: name.endsWith("css") ? "text/css" : "text/javascript", body: await readFile(asset) });
      });
      await page.goto("http://point-review.test/");
      await expect(page.locator(".task-line")).toHaveCount(16);
      const separator = page.getByRole("separator", { name: "タイムラインと詳細の高さ", exact: true });
      for (let i = 0; i < 10; i++) await separator.press("ArrowUp");
      const capture = name => page.screenshot({ path: resolve(artifacts, `${phase}-${theme}-${name}.png`) });
      const record = name => page.locator(".task-line").filter({ has: page.getByRole("button", { name, exact: true }) });
      const sample = async (locator, context) => {
        const value = { context, ...await contrast(locator) }; samples.push(value);
        if (context.startsWith("list-完了") || context.startsWith("detail-完了")) {
          if (value.opacity !== "1" || value.border !== "dashed") stateFailures.push({ theme, ...value });
        }
        if (value.contrast < 4.5) failures.push({ theme, ...value });
        return value;
      };
      // NREQ-003-S02 NREQ-003-S03: 全7値と未見積を通常、完了、一覧、詳細で観測する。
      for (const points of values) for (const done of [false, true]) {
        const name = `${done ? "完了" : "通常"} ${label(points)}`, row = record(name);
        await expect(row.getByRole("checkbox")).toBeChecked({ checked: done });
        if (done) await expect(row.locator(".point-selector > button")).toBeDisabled();
        else await expect(row.locator(".point-selector > button")).toBeEnabled();
        if (done) await expect(row.locator(".task-name")).toHaveCSS("text-decoration-line", "line-through");
        await sample(row.locator(".point-selector > button"), `list-${name}`);
        await row.getByRole("button", { name: `${name}の詳細`, exact: true }).click();
        const detail = page.getByRole("dialog", { name: "詳細パネル", exact: true });
        if (done) await expect(detail.locator(".detail-points .point-selector > button")).toBeDisabled();
        else await expect(detail.locator(".detail-points .point-selector > button")).toBeEnabled();
        await sample(detail.locator(".detail-points .point-selector > button"), `detail-${name}`);
        if (points === 8) await capture(done ? "completed-detail" : "normal-detail");
        await detail.getByRole("button", { name: "詳細を閉じる", exact: true }).click();
      }
      await record("通常 8pt").scrollIntoViewIfNeeded();
      await capture("list");
      await record("通常 8pt").getByRole("button", { name: "通常 8pt", exact: true }).click();
      await sample(record("通常 8pt").locator(".point-selector > button"), "list-selected-focused");
      const normal = record("通常 8pt").locator(".point-selector > button");
      await normal.scrollIntoViewIfNeeded();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await normal.click();
      await expect(page.locator(".point-current")).toBeVisible();
      await sample(page.locator(".point-current"), "menu-current");
      for (const option of ["1", "2", "3", "5", "8", "13", "21", "未見積"]) await sample(page.locator(".point-options").getByRole("button", { name: option, exact: true }), `menu-${option}`);
      await capture("options"); await page.keyboard.press("Escape");
      // NREQ-003-S04: Project 色とチャート色の変更は、独立して境界を確かめる。
      for (const color of ["#ffffff", "#000000"]) {
        const result = await session.handleOperation({ type: "editItem", kind: "project", id: id(1), projectFile: "A.yaml", patch: { color } });
        assert.equal(result.ok, true);
        for (const done of [false, true]) await sample(record(`${done ? "完了" : "通常"} 8pt`).locator(".point-selector > button"), `project-${color}-${done}`);
      }
      for (const color of ["#ffffff", "#000000", "#808080"]) {
        await page.evaluate(color => { for (const token of ["blue", "green", "orange", "purple"]) document.documentElement.style.setProperty(`--vscode-charts-${token}`, color); }, color);
        for (const points of [1, 3, 8, 21, undefined]) for (const done of [false, true]) await sample(record(`${done ? "完了" : "通常"} ${label(points)}`).locator(".point-selector > button"), `chart-${color}-${done}-${label(points)}`);
        await capture(`palette-${color.slice(1)}`);
      }
      await page.evaluate(() => { for (const token of ["blue", "green", "orange", "purple"]) document.documentElement.style.removeProperty(`--vscode-charts-${token}`); });
      assert.deepEqual(parse(await readFile(file, "utf8")).events, source.events, "配色と表示の変更はポイント、完了日と下位データを変えない");
      // NREQ-003-S03: 完了の解除後は同じセレクターが再び操作できる。
      const completed = record("完了 8pt"); await completed.getByRole("checkbox").click();
      await expect(completed.getByRole("checkbox")).not.toBeChecked();
      await expect(completed.locator(".point-selector > button")).toBeEnabled();
      await completed.locator(".point-selector > button").click();
      await page.locator(".point-options").getByRole("button", { name: "13", exact: true }).click();
      await expect(completed.locator(".point-selector > button")).toHaveText("13pt");
      await completed.locator(".point-selector > button").click();
      await page.locator(".point-options").getByRole("button", { name: "8", exact: true }).click();
      await completed.getByRole("checkbox").click();
      await expect(completed.getByRole("checkbox")).toBeChecked();
      await expect(completed.locator(".point-selector > button")).toBeDisabled();
      await session.handleOperation({ type: "editItem", kind: "project", id: id(1), projectFile: "A.yaml", patch: { color: source.color } });
      const final = session.snapshot().projects[0];
      // 色の変更や再描画でポイントと完了日を変えない。明示的な解除、再完了の日付だけ除外する。
      assert.deepEqual(final.events[0].tasks.map(task => ({ name: task.name, points: task.points })), tasks.map(task => ({ name: task.name, points: task.points })));
      const persisted = await readFile(file, "utf8");
      assert.equal(parse(persisted).color, parse(original).color);
      assert.deepEqual(errors, []);
      results.push({ theme, samples, minimum: Math.min(...samples.map(value => value.contrast)), errors, uncheckAndEdit: true });
      console.log(`${theme}: ${samples.length} contrast samples, minimum ${results.at(-1).minimum.toFixed(3)}:1`);
    } finally { unsubscribe(); await page.close(); await rm(root, { recursive: true, force: true }); }
  }
  await writeFile(resolve(artifacts, `${phase}-results.json`), JSON.stringify({ verifiedAt: new Date().toISOString(), browser: browser.version(), threshold: 4.5, failures, stateFailures, results }, null, 2) + "\n");
  assert.deepEqual(failures, [], `${failures.length} point labels below 4.5:1`);
  assert.deepEqual(stateFailures, [], "完了ポイントは不透明で点線の枠を使う");
} finally { await browser.close(); await rm(runtime, { recursive: true, force: true }); }
