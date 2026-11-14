import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import { parse, stringify } from "../packages/extension/node_modules/yaml/dist/index.js";

// REQ-016/031/032: 実際のExtensionとWebviewで保存・失敗・再表示を検証する。
const repository = resolve(import.meta.dirname, "..");
const artifacts = resolve(repository, "artifacts/board-layout");
const root = await mkdtemp("/private/tmp/gb-layout-vscode-");
const data = resolve(root, "data");
const workspace = resolve(root, "workspace");
const settingsPath = resolve(root, "user/User/settings.json");
const managePath = resolve(data, "manage.yaml");
await Promise.all([mkdir(data), mkdir(resolve(workspace, ".vscode"), { recursive: true }), mkdir(resolve(root, "user/User"), { recursive: true }), mkdir(artifacts, { recursive: true })]);
const example = resolve(repository, "examples/readme-demo");
const originalManage = parse(await readFile(resolve(example, "manage.yaml"), "utf8"));
const entries = originalManage.projects.filter((p) => p.load);
const projects = await Promise.all(entries.map(async (entry) => parse(await readFile(resolve(example, entry.file), "utf8"))));
const names = projects.map((p) => p.name);
await Promise.all(projects.map((project, index) => writeFile(resolve(data, `${index}.yaml`), stringify(project))));
await writeFile(managePath, `# layout verification\n${stringify({ settings: originalManage.settings, projects: projects.map((_, i) => ({ file: `${i}.yaml`, load: true })) })}`);
await writeFile(resolve(workspace, ".vscode/settings.json"), JSON.stringify({ "glitchboard.manageFile": managePath }));
const settings = { "workbench.colorTheme": "Dark Modern", "workbench.startupEditor": "none", "window.zoomLevel": 0, "security.workspace.trust.enabled": false, "telemetry.telemetryLevel": "off", "update.mode": "none", "extensions.autoCheckUpdates": false, "workbench.tips.enabled": false };
await writeFile(settingsPath, JSON.stringify(settings));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const executable = "/Applications/Visual Studio Code.app/Contents/MacOS/Code";
const child = spawn(executable, ["--user-data-dir", resolve(root, "user"), "--extensions-dir", resolve(root, "extensions"), "--extensionDevelopmentPath", resolve(repository, "packages/extension"), "--skip-welcome", "--skip-release-notes", "--disable-workspace-trust", "--remote-debugging-port=9237", "--new-window", workspace], { env, stdio: ["ignore", "ignore", "pipe"] });
let log = "";
child.stderr.on("data", (bytes) => { log = (log + bytes).slice(-4000); });
let browser;
const steps = [];
const results = [];
try {
  for (let attempt = 0; attempt < 60 && !browser; attempt++) {
    try { browser = await chromium.connectOverCDP("http://127.0.0.1:9237", { timeout: 500 }); }
    catch { await new Promise((done) => setTimeout(done, 250)); }
  }
  assert.ok(browser, log);
  let page;
  await expect.poll(() => { page = browser.contexts().flatMap((c) => c.pages())[0]; return !!page; }).toBe(true);
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1500, height: 1000 });
  const command = async (name) => {
    await page.locator(".part.editor").click({ position: { x: 100, y: 100 } });
    await page.keyboard.press("Meta+Shift+P");
    const input = page.locator(".quick-input-widget input");
    await input.fill(`>${name}`);
    await page.getByText(name, { exact: true }).click();
  };
  await command("GlitchBoardを開く");
  const boardFrame = async () => {
    let found;
    await expect.poll(async () => {
      for (const frame of page.frames()) {
        if (await frame.locator('body[data-surface="board"]').count().catch(() => 0)) { found = frame; return true; }
      }
      return false;
    }, { timeout: 15000 }).toBe(true);
    await found.locator(".project-row").first().waitFor();
    return found;
  };
  let board = await boardFrame();
  const order = () => board.locator(".project-name").allTextContents();
  const savedOrder = async () => parse(await readFile(managePath, "utf8")).projects.map((p) => names[Number(p.file.split(".")[0])]);
  const savedFiles = await Promise.all(projects.map((_, i) => readFile(resolve(data, `${i}.yaml`), "utf8")));
  const separator = () => board.getByRole("separator", { name: "タイムラインと詳細の高さ" });
  const heights = () => board.evaluate(() => {
    const top = document.querySelector(".timeline-panel").getBoundingClientRect().height;
    const bottom = document.querySelector(".board-details-panel").getBoundingClientRect().height;
    return { top, bottom, ratio: top / (top + bottom) };
  });
  const row = (name) => board.locator(".project-row").filter({ has: board.locator(".project-name", { hasText: name }) });
  for (const theme of ["dark", "light"]) {
    settings["workbench.colorTheme"] = theme === "dark" ? "Dark Modern" : "Light Modern";
    await writeFile(settingsPath, JSON.stringify(settings));
    await expect(board.locator("body")).toHaveClass(new RegExp(`vscode-${theme}`));
    const periodRows = {};
    for (const label of ["3日", "月", "1週間"]) {
      await board.getByRole("button", { name: label, exact: true }).click();
      periodRows[label] = await board.locator(".project-row").evaluateAll((rows) => rows.map((r) => r.getBoundingClientRect().height));
      assert.ok(periodRows[label].every((h) => Math.abs(h - 44) < 0.1), JSON.stringify(periodRows));
    }
    await separator().focus(); await page.keyboard.press("Home");
    const initial = await heights();
    assert.ok(Math.abs(initial.ratio - 0.6) < 0.002);
    const selectedBefore = await board.locator(".event-summary h2").textContent();
    const box = await separator().boundingBox();
    await page.mouse.move(box.x + 100, box.y + 6); await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y + 86, { steps: 10 }); await page.mouse.up();
    const expanded = await heights();
    assert.ok(Math.abs(expanded.top - initial.top - 80) < 1);
    assert.equal(await board.locator(".event-summary h2").textContent(), selectedBefore);
    await separator().dblclick();
    assert.ok(Math.abs((await heights()).ratio - 0.6) < 0.002);
    steps.push(`${theme}: REQ-016-S05 / REQ-031-S01/S02/S04 actual rows, pointer resize, reset`);
    const before = await order();
    await row(before[0]).locator(".project-drag-handle").dragTo(row(before[2]), { targetPosition: { x: 200, y: 40 } });
    await expect.poll(savedOrder).toEqual([before[1], before[2], before[0]]);
    await expect.poll(order).toEqual([before[1], before[2], before[0]]);
    assert.equal(await board.locator(".event-summary h2").textContent(), selectedBefore);
    const after = await order();
    await row(after[2]).locator(".project-drag-handle").dragTo(row(after[0]), { targetPosition: { x: 200, y: 4 } });
    await expect.poll(savedOrder).toEqual([after[2], after[0], after[1]]);
    await expect.poll(order).toEqual([after[2], after[0], after[1]]);
    steps.push(`${theme}: REQ-032-S01/S02/S03 native drag before and after saved through extension`);
    await page.screenshot({ path: resolve(artifacts, `vscode-${theme}.png`) });
    results.push({ theme, initial, expanded, periodRows, savedOrder: await savedOrder() });
  }
  const beforeFailure = await order();
  const bytesBeforeFailure = await readFile(managePath, "utf8");
  try {
    await chmod(data, 0o555);
    const first = row(beforeFailure[0]).locator(".project-drag-handle");
    await first.focus(); await page.keyboard.press("ArrowDown");
    await expect(board.getByRole("alert")).toContainText("EACCES");
    assert.deepEqual(await order(), beforeFailure);
    assert.equal(await readFile(managePath, "utf8"), bytesBeforeFailure);
    await expect(first).toBeEnabled();
    await page.screenshot({ path: resolve(artifacts, "vscode-save-error.png") });
  } finally { await chmod(data, 0o755); }
  await row(beforeFailure[0]).locator(".project-drag-handle").focus(); await page.keyboard.press("ArrowDown");
  await expect.poll(savedOrder).toEqual([beforeFailure[1], beforeFailure[0], beforeFailure[2]]);
  await expect(board.getByRole("alert")).toHaveCount(0);
  steps.push("REQ-032-S05/S06 actual EACCES preserves state, keyboard retry saves and clears error");
  const beforeReload = await savedOrder();
  await page.reload();
  await command("GlitchBoardを開く");
  board = await boardFrame();
  await expect.poll(order).toEqual(beforeReload);
  assert.deepEqual(await Promise.all(projects.map((_, i) => readFile(resolve(data, `${i}.yaml`), "utf8"))), savedFiles);
  assert.ok((await readFile(managePath, "utf8")).includes("# layout verification"));
  steps.push("REQ-032-S03 real window reload preserves order and Project bytes/comments");
  assert.deepEqual(errors, []);
  const version = JSON.parse(await readFile("/Applications/Visual Studio Code.app/Contents/Resources/app/package.json", "utf8")).version;
  await writeFile(resolve(artifacts, "vscode-results.json"), JSON.stringify({ date: "2026-11-11", environment: `VS Code ${version} stable, macOS ${process.arch}, isolated development host`, fixture: root, steps, results, finalOrder: beforeReload, errors }, null, 2));
  console.log(JSON.stringify({ passed: true, fixture: root, steps }));
  await page.close();
} catch (error) {
  console.error(log);
  if (browser) {
    const page = browser.contexts().flatMap((c) => c.pages())[0];
    if (page) {
      await page.screenshot({ path: resolve(artifacts, "vscode-diagnostic.png") }).catch(() => {});
      console.error((await page.locator("body").innerText()).slice(-2000));
    }
  }
  throw error;
} finally {
  await chmod(data, 0o755);
  if (browser) await browser.close();
  child.kill();
}
