import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, expect } from "@playwright/test";
import { build } from "vite";
import { parse } from "../packages/extension/node_modules/yaml/dist/index.js";
const runtime = await mkdtemp(resolve(tmpdir(), "gb-scope-runtime-"));
await build({ configFile: false, logLevel: "error", ssr: { noExternal: true }, build: { ssr: resolve("packages/extension/src/session.ts"), outDir: runtime, rollupOptions: { output: { entryFileNames: "session.mjs" } } } });
const { BoardSession } = await import(pathToFileURL(resolve(runtime, "session.mjs")).href);
const browser = await chromium.launch({ headless: true });
const results = [];
const ids = { project: "11111111-1111-4111-8111-111111111111", event: "22222222-2222-4222-8222-222222222222", task: "44444444-4444-4444-8444-444444444444" };
try {
  for (const theme of ["dark", "light"]) {
    const root = await mkdtemp(resolve(tmpdir(), "gb-scope-ui-"));
    const sources = ["A", "B"].map((name) => JSON.stringify({ id: ids.project, name, color: "#123456", events: [{ id: ids.event, name: `${name} Event`, due: "2026-11-20", tasks: [{ id: ids.task, name: `${name} Task`, points: 3 }], stories: [] }] }));
    for (const [i, name] of ["A", "B"].entries()) await writeFile(resolve(root, `${name}.yaml`), sources[i]);
    const managePath = resolve(root, "manage.yaml");
    await writeFile(managePath, JSON.stringify({ settings: { workdays_off: [], public_holidays: false }, projects: [{ file: "A.yaml", load: true }, { file: "B.yaml", load: true }] }));
    const session = new BoardSession(managePath); await session.reload();
    let boardPage;
    const pages = [], unsubs = [], errors = [], requests = [];
    const css = `:root{--vscode-font-family:sans-serif;--vscode-foreground:${theme === "dark" ? "#ddd" : "#222"};--vscode-editor-background:${theme === "dark" ? "#181818" : "#fff"};--vscode-sideBar-background:${theme === "dark" ? "#222" : "#eee"};--vscode-panel-border:#777;--vscode-descriptionForeground:#888;--vscode-focusBorder:#007fd4;--vscode-charts-blue:#4c8dff;--vscode-button-background:#0078d4;--vscode-button-foreground:#fff}`;
    async function open(surface) {
      const page = await browser.newPage({ viewport: { width: surface === "board" ? 1440 : 280, height: 900 } }); pages.push(page);
      await page.clock.install({ time: new Date("2026-11-14T03:00:00Z") });
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error" && message.text().includes("same key")) errors.push(message.text()); });
      let ready = false;
      const dispatch = (data) => page.evaluate((message) => window.dispatchEvent(new MessageEvent("message", { data: message })), data);
      unsubs.push(session.subscribe(surface, (snapshot) => { if (ready) void dispatch({ type: "snapshot", payload: snapshot }).catch((error) => errors.push(error.message)); }));
      await page.exposeFunction("extensionMessage", async (message) => {
        requests.push(message);
        if (message.type === "ready") { ready = true; await dispatch({ type: "snapshot", payload: session.snapshot() }); return; }
        if (surface === "events" && message.type === "selectEvent") {
          await boardPage.evaluate((message) => window.dispatchEvent(new MessageEvent("message",{data:{type:"navigateRecord",payload:{kind:"event",id:message.eventId,projectFile:message.projectFile,openDetail:message.openDetail ?? false}}})),message);
          return;
        }
        const result = await session.handleOperation(message);
        await dispatch({ type: "operationResult", requestId: message.requestId, payload: result });
      });
      await page.addInitScript(() => { window.acquireVsCodeApi = () => ({getState:()=>JSON.parse(sessionStorage.getItem("vscodeState") ?? "{}"),setState:state=>sessionStorage.setItem("vscodeState",JSON.stringify(state)), postMessage: (message) => { void window.extensionMessage(message); } }); });
      await page.route("http://scope.test/**", async (route) => {
        const name = new URL(route.request().url()).pathname.slice(1);
        if (!name) return route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="ja"><head><meta charset="utf-8"><link rel="stylesheet" href="/style.css"><style>${css}</style></head><body><div id="root"></div><script type="module" src="/${surface}.js"></script></body></html>` });
        const file = resolve("packages/extension/dist/webview", name); assert.ok(file.startsWith(resolve("packages/extension/dist/webview") + "/"));
        return route.fulfill({ contentType: name.endsWith("css") ? "text/css" : "text/javascript", body: await readFile(file) });
      });
      await page.goto("http://scope.test/"); return page;
    }
    const savedB = () => readFile(resolve(root, "B.yaml"), "utf8").then(parse);
    try {
      const board = await open("board"); boardPage=board; const sidebar = await open("events");
      await sidebar.locator(".event-row-select").filter({hasText:"B Event"}).click();
      await expect(board.getByRole("button", { name: "B Task", exact: true })).toBeVisible();
      assert.equal(session.snapshot().selectedProjectFile, "B.yaml");
      await board.getByRole("checkbox", { name: "B Taskの完了", exact: true }).click();
      await expect.poll(async () => Boolean((await savedB()).events[0].tasks[0].doneAt)).toBe(true);
      assert.equal(await readFile(resolve(root, "A.yaml"), "utf8"), sources[0]);
      await board.getByRole("checkbox", { name: "B Taskの完了", exact: true }).click();
      await expect.poll(async () => (await savedB()).events[0].tasks[0].doneAt).toBeUndefined();
      await board.getByRole("button", { name: "B Taskの詳細", exact: true }).click();
      const detail = board.getByRole("dialog", { name: "詳細パネル", exact: true });
      await detail.getByRole("button", { name: "編集", exact: true }).click();
      await detail.getByLabel("名前", { exact: true }).fill("Changed B");
      await detail.getByRole("button", { name: "保存", exact: true }).click();
      await expect.poll(async () => (await savedB()).events[0].tasks[0].name).toBe("Changed B");
      // REQ-041-S04: 左の詳細からの切替も保存前に選択を変えない。
      await detail.getByRole("button",{name:"編集",exact:true}).click();
      await detail.getByLabel("名前",{exact:true}).fill("未保存のB");
      await sidebar.getByRole("button",{name:"A Eventの詳細",exact:true}).click();
      await expect(board.getByRole("alertdialog",{name:"未保存の編集"})).toBeVisible();
      assert.equal(session.snapshot().selectedProjectFile,"B.yaml");
      await board.getByRole("button",{name:"キャンセル",exact:true}).click();
      await expect(detail.getByLabel("名前",{exact:true})).toHaveValue("未保存のB");
      await sidebar.locator(".event-row-select").filter({hasText:"A Event"}).click();
      await board.getByRole("button",{name:"破棄して進む",exact:true}).click();
      await expect(detail.locator(".detail-target")).toHaveText("EVENT : A Event");
      await sidebar.getByRole("button",{name:"B Eventの詳細",exact:true}).click();
      await expect(detail.locator(".detail-target")).toHaveText("EVENT : B Event");
      assert.equal((await savedB()).events[0].tasks[0].name,"Changed B");
      // REQ-041-S01: 開いている詳細を、見えているTask名の選択で切り替える。
      await board.getByRole("button",{name:"Changed B",exact:true}).click({position:{x:4,y:4}});
      await detail.getByRole("button",{name:"+ 補足を追加",exact:true}).click();
      await detail.getByLabel("補足",{exact:true}).fill("sidebar guard save");
      await sidebar.getByRole("button",{name:"A Eventの詳細",exact:true}).click();
      await board.getByRole("button",{name:"保存して進む",exact:true}).click();
      await expect(detail.locator(".detail-target")).toHaveText("EVENT : A Event");
      assert.equal((await savedB()).events[0].tasks[0].note,"sidebar guard save");
      assert.equal(await readFile(resolve(root,"A.yaml"),"utf8"),sources[0]);
      await sidebar.getByRole("button",{name:"B Eventの詳細",exact:true}).click();
      await expect(detail.locator(".detail-target")).toHaveText("EVENT : B Event");
      await board.keyboard.press("Escape");
      await board.getByRole("button", { name: "Bを並べ替え", exact: true }).focus(); await board.keyboard.press("ArrowUp");
      await expect.poll(async () => parse(await readFile(managePath, "utf8")).projects.map((entry) => entry.file)).toEqual(["B.yaml", "A.yaml"]);
      // REQ-040: キーによる調整と再表示、上下限、全行への適用。
      const width=board.getByRole("slider",{name:"Project列幅",exact:true}), height=board.getByRole("slider",{name:"Project行高",exact:true});
      await width.focus();await board.keyboard.press("ArrowRight");
      await height.focus();await board.keyboard.press("ArrowRight");
      const layout={width:await width.inputValue(),height:await height.inputValue()};
      const rows=await board.locator(".project-row").evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
      assert.ok(rows.every(value=>Math.abs(value-Number(layout.height)) < 1),JSON.stringify(rows));
      await board.reload();await expect(width).toHaveValue(layout.width);await expect(height).toHaveValue(layout.height);
      await height.focus();await board.keyboard.press("End");
      assert.equal(await height.inputValue(),await height.getAttribute("max"));
      const maximumHeight=Number(await height.inputValue());
      assert.ok((await board.locator(".project-row").evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height))).every(value=>Math.abs(value-maximumHeight)<1));
      await height.press("Home");
      await width.focus();await board.keyboard.press("End");
      assert.equal(await width.inputValue(),await width.getAttribute("max"));
      const maximumWidth=Number(await width.inputValue());
      await board.setViewportSize({width:600,height:900});
      await expect.poll(async()=>Number(await width.inputValue())).toBeLessThan(maximumWidth);
      const effectiveWidth=Number(await width.inputValue());
      assert.ok((await board.locator(".project-col").boundingBox()).width <= effectiveWidth+1);
      await board.setViewportSize({width:1440,height:900});
      await width.press("Home");
      await board.reload(); await expect(board.getByRole("button", { name: "Changed B", exact: true })).toBeVisible();
      await board.getByRole("button", { name: "Changed Bの詳細", exact: true }).click();
      await detail.getByRole("button", { name: "削除", exact: true }).click();
      await board.getByRole("button", { name: "削除する", exact: true }).click();
      await expect.poll(async () => (await savedB()).events[0].tasks).toEqual([]);
      await board.getByRole("button", { name: "Bの詳細", exact: true }).click();
      await detail.getByRole("button", { name: "削除", exact: true }).click();
      await board.getByRole("button", { name: "削除する", exact: true }).click();
      await expect.poll(async () => parse(await readFile(managePath, "utf8")).projects.map((entry) => entry.file)).toEqual(["A.yaml"]);
      await assert.rejects(readFile(resolve(root, "B.yaml"), "utf8"));
      assert.equal(await readFile(resolve(root, "A.yaml"), "utf8"), sources[0]);
      assert.deepEqual(errors, []);
      assert.ok(requests.filter((request) => ["setTaskDone", "editItem", "deleteItem"].includes(request.type)).every((request) => request.projectFile === "B.yaml"));
      results.push({ theme, passed: true, duplicateProjectEventTaskUuids: true, untouchedABytes: true, sidebarSelection: true, editDoneDeleteReorderReload: true, guardedSidebarNavigation:true, dimensionsPersisted:true, errors });
      console.log(`${theme}: duplicate UUID scope passed with real YAML and both surfaces`);
    } finally { unsubs.forEach((unsubscribe) => unsubscribe()); await Promise.all(pages.map((page) => page.close())); await rm(root, { recursive: true, force: true }); }
  }
  await mkdir("artifacts/review", { recursive: true });
  await writeFile("artifacts/review/project-scope-results.json", JSON.stringify({ verifiedAt: new Date().toISOString(), browser: browser.version(), results }, null, 2) + "\n");
} finally { await browser.close(); await rm(runtime, { recursive: true, force: true }); }
