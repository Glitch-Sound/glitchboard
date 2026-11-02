import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const page = browser.contexts().flatMap((context) => context.pages())[0];
if (!page) throw new Error("VS Code window not found");
const mode = process.argv[2] ?? "inspect";
if (mode === "inspect") {
  process.stdout.write(`${page.url()}\n`);
  process.stdout.write(`${(await page.locator("body").innerText()).slice(0, 2500)}\n`);
  process.stdout.write(`BUTTONS ${JSON.stringify((await page.getByRole("button").allTextContents()).slice(0, 70))}\n`);
  process.stdout.write(`INPUTS ${JSON.stringify(await page.locator("input").evaluateAll((nodes) => nodes.filter((node) => node.getClientRects().length).map((node) => node.outerHTML).slice(0, 20)))}\n`);
  for (const frame of page.frames()) process.stdout.write(`FRAME ${frame.url()}\n`);
} else if (mode === "manage") {
  await page.getByText("Manage", { exact: true }).first().click();
  process.stdout.write(`${(await page.locator("body").innerText()).slice(-1600)}\n`);
} else if (mode === "dismiss") {
  await page.getByText("Continue without Signing In", { exact: true }).click();
  process.stdout.write(`${(await page.locator("body").innerText()).slice(-1200)}\n`);
} else if (mode === "start") {
  await page.getByText("Get Started", { exact: true }).click();
  process.stdout.write(`${(await page.locator("body").innerText()).slice(0, 1200)}\n`);
} else if (mode === "trust") {
  await page.getByRole("button", { name: "Trust", exact: true }).click();
  process.stdout.write(`${(await page.locator("body").innerText()).slice(-900)}\n`);
} else if (mode === "open") {
  const quick = page.locator(".quick-input-widget input");
  if (!(await quick.isVisible())) await page.keyboard.press("Meta+Shift+P");
  await quick.fill(">GlitchBoardを開く");
  process.stdout.write(`${(await page.locator("body").innerText()).slice(-500)}\n`);
} else if (mode === "reload") {
  const quick = page.locator(".quick-input-widget input");
  if (!(await quick.isVisible())) await page.keyboard.press("Meta+Shift+P");
  await quick.fill(">Developer: Reload Window");
  await page.keyboard.press("Enter");
  process.stdout.write("Reload requested\n");
} else if (mode === "execute") {
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  process.stdout.write(`${(await page.locator("body").innerText()).slice(-1400)}\n`);
  for (const frame of page.frames()) process.stdout.write(`FRAME ${frame.url()}\n`);
} else if (mode === "frames") {
  for (const frame of page.frames()) process.stdout.write(`FRAME ${frame.url()}\n${(await frame.locator("body").innerText().catch(() => "unavailable")).slice(0, 1300)}\n`);
} else if (mode === "select") {
  let frame;
  for (const item of page.frames()) {
    if ((await item.locator('body[data-surface="board"]').count()) > 0) frame = item;
  }
  if (!frame) throw new Error("Board frame missing");
  await frame.getByRole("button", { name: "月", exact: true }).click();
  await frame.getByRole("button", { name: "Event 1", exact: true }).first().click();
  process.stdout.write(`${(await frame.locator("body").innerText()).slice(-2000)}\n`);
} else if (mode === "findsidebar") {
  process.stdout.write(`${JSON.stringify(await page.locator('[aria-label*="GlitchBoard"]').evaluateAll((nodes) => nodes.map((node) => node.outerHTML.slice(0, 500))))}\n`);
} else if (mode === "sidebar") {
  await page.getByRole("tab", { name: "GlitchBoard", exact: true }).first().click();
  await page.waitForTimeout(800);
  for (const frame of page.frames()) process.stdout.write(`FRAME ${frame.url()}\n${(await frame.locator("body").innerText().catch(() => "unavailable")).slice(0, 600)}\n`);
} else if (mode === "theme-options") {
  await page.keyboard.press("Meta+Shift+P");
  await page.locator(".quick-input-widget input").fill(">Preferences: Color Theme");
  await page.waitForTimeout(300);
  process.stdout.write(`${(await page.locator("body").innerText()).slice(-2500)}\n`);
  await page.getByText("Preferences: Color Theme", { exact: true }).click();
  process.stdout.write(`OPTIONS\n${(await page.locator("body").innerText()).slice(-2500)}\n`);
} else if (mode === "light" || mode === "dark") {
  const theme = mode === "light" ? "Light Modern" : "Dark Modern";
  const quick = page.locator(".quick-input-widget input");
  await quick.fill(theme);
  await page.waitForTimeout(200);
  process.stdout.write(`${(await page.locator("body").innerText()).slice(-1300)}\n`);
  await page.getByText(theme, { exact: true }).click();
  process.stdout.write(`Theme: ${await page.locator("body").getAttribute("class")}\n`);
  for (const frame of page.frames()) {
    if (!(await frame.locator("body[data-surface]").count())) continue;
    process.stdout.write(`${await frame.locator("body[data-surface]").getAttribute("data-surface")}: ${await frame.locator("body[data-surface]").getAttribute("class")}\n`);
  }
} else if (mode === "theme-state") {
  await page.keyboard.press("Escape");
  process.stdout.write(`Workbench: ${await page.locator("body").getAttribute("class")}\n`);
  for (const frame of page.frames()) {
    if (!(await frame.locator("body[data-surface]").count())) continue;
    process.stdout.write(`${await frame.locator("body[data-surface]").getAttribute("data-surface")}: ${await frame.locator("body[data-surface]").getAttribute("class")}\n`);
  }
} else if (mode === "screenshot") {
  const path = process.argv[3] ?? "/tmp/glitchboard-light.png";
  for (const frame of page.frames()) {
    const point = frame.getByText("21pt", { exact: true });
    if ((await point.count()) > 0) {
      await point.first().scrollIntoViewIfNeeded();
      break;
    }
  }
  await page.screenshot({ path, fullPage: false });
  process.stdout.write(`${path}\n`);
} else if (mode === "measure") {
  const benchmarkRoot = process.argv[3] ?? "/tmp/glitchboard-perf-20261103";
  const frames = page.frames().filter((item) => item.url().startsWith("vscode-webview:") && item.url().includes("index.html"));
  let board;
  let sidebar;
  for (const frame of frames) {
    if ((await frame.locator('body[data-surface="board"]').count()) > 0) board = frame;
    if ((await frame.locator('body[data-surface="events"]').count()) > 0) sidebar = frame;
  }
  if (!board || !sidebar || board === sidebar) throw new Error("Both webviews must be visible");
  const checkbox = board.getByRole("checkbox", { name: "Task 1の完了" }).first();
  const { firstTaskId } = JSON.parse(await readFile(`${benchmarkRoot}/manifest.json`, "utf8"));
  const durations = [];
  for (let index = 0; index < 30; index++) {
    const before = await checkbox.isChecked();
    const expectedDone = !before;
    await board.evaluate(({ taskId, expected }) => {
      window.__benchStart = 0;
      window.__benchDone = new Promise((resolve) => {
        const clicked = (event) => {
          if (event.target instanceof HTMLInputElement && event.target.type === "checkbox") {
            window.__benchStart = Date.now();
            window.removeEventListener("click", clicked, true);
          }
        };
        const updated = (event) => {
          if (event.data?.type !== "snapshot") return;
          const task = event.data.payload.projects.flatMap((project) => project.events).flatMap((event) => event.stories).flatMap((story) => story.tasks).find((item) => item.id === taskId);
          if (!task || Boolean(task.doneAt) !== expected) return;
          window.removeEventListener("message", updated);
          requestAnimationFrame(() => requestAnimationFrame(() => resolve({ version: event.data.payload.version, done: Date.now() })));
        };
        window.addEventListener("click", clicked, true);
        window.addEventListener("message", updated);
      });
    }, { taskId: firstTaskId, expected: expectedDone });
    await sidebar.evaluate(({ taskId, expected }) => {
      window.__benchDone = new Promise((resolve) => {
        const updated = (event) => {
          if (event.data?.type !== "snapshot") return;
          const task = event.data.payload.projects.flatMap((project) => project.events).flatMap((event) => event.stories).flatMap((story) => story.tasks).find((item) => item.id === taskId);
          if (!task || Boolean(task.doneAt) !== expected) return;
          window.removeEventListener("message", updated);
          requestAnimationFrame(() => requestAnimationFrame(() => resolve({ version: event.data.payload.version, done: Date.now() })));
        };
        window.addEventListener("message", updated);
      });
    }, { taskId: firstTaskId, expected: expectedDone });
    await checkbox.click();
    const [boardAck, sidebarAck, start] = await Promise.all([
      board.evaluate(() => window.__benchDone),
      sidebar.evaluate(() => window.__benchDone),
      board.evaluate(() => window.__benchStart),
    ]);
    const after = await checkbox.isChecked();
    if (before === after || boardAck.version !== sidebarAck.version) throw new Error(`Update ${index + 1} failed: ${JSON.stringify({ before, after, boardAck, sidebarAck })}`);
    durations.push(Math.max(boardAck.done, sidebarAck.done) - start);
    await page.waitForTimeout(100);
  }
  const ordered = [...durations].sort((a, b) => a - b);
  const report = { environment: "Apple M4, 24GB RAM, VS Code 1.144.0 stable", projects: 5, events: 100, stories: 1000, tasks: 3000, toggles: 30, durationsMs: durations, p95Ms: ordered[Math.ceil(0.95 * ordered.length) - 1], maxMs: ordered.at(-1), measuredAt: new Date().toISOString(), criterion: "provisional; 16GB baseline pending" };
  await writeFile(`${benchmarkRoot}/result.json`, JSON.stringify(report, null, 2));
  process.stdout.write(`${JSON.stringify({ p95Ms: report.p95Ms, maxMs: report.maxMs, toggles: report.toggles })}\n`);
} else {
  throw new Error(`Unknown mode: ${mode}`);
}
await browser.close();
