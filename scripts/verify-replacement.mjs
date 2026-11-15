import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, expect } from "@playwright/test";
import { build } from "vite";
import { parse } from "../packages/extension/node_modules/yaml/dist/index.js";

// 実ビルドのUIと実BoardSessionを接続する。VS Code APIとWebview transportだけを置き換える。
const artifacts = resolve("artifacts/replacement");
await mkdir(artifacts, { recursive: true });
await mkdir(resolve(artifacts,"setup"),{recursive:true});
const runtime = await mkdtemp(resolve(tmpdir(), "glitchboard-replacement-runtime-"));
await build({ configFile: false, logLevel: "error", ssr: { noExternal: true }, build: { ssr: resolve("packages/extension/src/session.ts"), outDir: runtime, rollupOptions: { output: { entryFileNames: "session.mjs" } } } });
const { BoardSession } = await import(pathToFileURL(resolve(runtime, "session.mjs")).href);
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const theme of ["dark", "light"]) {
    const dataRoot = await mkdtemp(resolve(tmpdir(), "glitchboard-replacement-data-"));
    const projectId = randomUUID(), eventId = randomUUID();
    const grouped = { id: randomUUID(), name: "別EventのStory", note: "グループ補足", tasks: [{ id: randomUUID(), name: "グループTask", points: 5, doneAt: "2026-11-03", note: "グループTask補足" }] };
    const project = { id: projectId, name: "個人プロジェクト", color: "#4c8dff", events: [{ id: eventId, name: "小さなリリース", due: "2026-11-20", tasks: [], stories: [] }, { id: randomUUID(), name: "既存Event", due: "2026-11-25", stories: [grouped] }] };
    const path = resolve(dataRoot, "project.yaml");
    await writeFile(path, `# 検証コメント\n${JSON.stringify(project, null, 2)}\n`);
    await writeFile(resolve(dataRoot, "manage.yaml"), JSON.stringify({ settings: { workdays_off: ["sat", "sun"], public_holidays: true }, projects: [{ file: "project.yaml", load: true }] }));
    const session = new BoardSession(resolve(dataRoot, "manage.yaml"));
    await session.reload(); session.selectEvent(eventId);
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(7000);
    await page.clock.install({ time: new Date("2026-11-14T03:00:00Z") });
    const errors = [], requests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let ready = false;
    const dispatch = (data) => page.evaluate((message) => window.dispatchEvent(new MessageEvent("message", { data: message })), data);
    const unsubscribe = session.subscribe("board", (snapshot) => { if (ready) void dispatch({ type: "snapshot", payload: snapshot }).catch((e) => errors.push(e.message)); });
    await page.exposeFunction("extensionMessage", async (message) => {
      requests.push(message);
      if (message.type === "ready") { ready = true; await dispatch({ type: "snapshot", payload: session.snapshot() }); return; }
      const result = await session.handleOperation(message);
      await dispatch({ type: "operationResult", requestId: message.requestId, payload: result });
    });
    await page.addInitScript(() => { window.acquireVsCodeApi = () => ({ postMessage: (message) => { void window.extensionMessage(message); } }); });
    const dark = theme === "dark";
    const css = `:root{--vscode-font-family:-apple-system,BlinkMacSystemFont,sans-serif;--vscode-foreground:${dark ? "#d4d4d4" : "#333333"};--vscode-editor-background:${dark ? "#181818" : "#ffffff"};--vscode-sideBar-background:${dark ? "#202020" : "#f3f3f3"};--vscode-input-background:${dark ? "#222222" : "#ffffff"};--vscode-panel-border:${dark ? "#454545" : "#cccccc"};--vscode-descriptionForeground:${dark ? "#a3a3a3" : "#616161"};--vscode-focusBorder:#007fd4;--vscode-charts-blue:#4c8dff;--vscode-charts-red:#e35b5b;--vscode-charts-green:#3a995c;--vscode-charts-yellow:#e5c76b;--vscode-list-activeSelectionBackground:${dark ? "#264f78" : "#cce5ff"};--vscode-list-activeSelectionForeground:${dark ? "#ffffff" : "#111111"};--vscode-list-hoverBackground:${dark ? "#292f38" : "#eeeeee"};--vscode-button-background:#0078d4;--vscode-button-foreground:#ffffff;--vscode-button-secondaryBackground:${dark ? "#313131" : "#e5e5e5"};--vscode-button-secondaryForeground:${dark ? "#cccccc" : "#333333"};--vscode-errorForeground:${dark ? "#f48771" : "#c72e0f"}}`;
    await page.route("http://replacement.test/**", async (route) => {
      const name = new URL(route.request().url()).pathname.slice(1);
      if (!name) return route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>${css}</style></head><body><div id="root"></div><script type="module" src="/board.js"></script></body></html>` });
      const asset = resolve("packages/extension/dist/webview", name);
      assert.ok(asset.startsWith(resolve("packages/extension/dist/webview") + "/"));
      return route.fulfill({ contentType: name.endsWith("css") ? "text/css" : "text/javascript", body: await readFile(asset) });
    });
    try {
      await page.goto("http://replacement.test/");
      const tasks = page.getByRole("region", { name: "Task一覧", exact: true });
      const groups = page.getByRole("region", { name: "Story一覧", exact: true });
      // REQ-033-S01 / REQ-033-S04: 空EventからTaskを3件連続追加し、毎回取消も確認する。
      for (const name of ["調査", "実装", "検証"]) {
        await tasks.getByRole("button", { name: "Taskを追加", exact: true }).click();
        await tasks.getByRole("textbox", { name: "名前", exact: true }).fill("破棄する");
        await page.keyboard.press("Escape");
        await expect(tasks.getByRole("textbox")).toHaveCount(0);
        await tasks.getByRole("button", { name: "Taskを追加", exact: true }).click();
        await expect(tasks.getByRole("textbox")).toHaveValue("");
        await tasks.getByRole("textbox").fill(name);
        await tasks.getByRole("textbox").press("Enter");
        await expect(tasks.getByRole("textbox")).toHaveCount(0);
        await expect(tasks.getByRole("button", { name, exact: true })).toBeVisible();
      }
      const savedProject = () => readFile(path, "utf8").then(parse);
      let saved = await savedProject();
      assert.equal(saved.events[0].stories.length, 0);
      assert.deepEqual(saved.events[0].tasks.map((task) => task.name), ["調査", "実装", "検証"]);
      assert.deepEqual(saved.events[1].stories, [grouped]);
      // 実ファイルのEACCESから復帰する。UIは入力を残して再送する。
      await tasks.getByRole("button", { name: "Taskを追加", exact: true }).click();
      await tasks.getByRole("textbox").fill("失敗から復帰");
      await chmod(dataRoot, 0o555);
      await tasks.getByRole("textbox").press("Enter");
      await expect(page.getByRole("alert")).toContainText(/EACCES|permission denied/i);
      await expect(tasks.getByRole("textbox")).toHaveValue("失敗から復帰");
      await chmod(dataRoot, 0o755);
      await tasks.getByRole("textbox").press("Enter");
      await expect(tasks.getByRole("textbox")).toHaveCount(0);
      // REQ-035-S01 / REQ-036-S01/S02/S03: 名前から詳細、取消、実保存失敗、補足、再編集。
      const taskName = tasks.getByRole("button", { name: "調査", exact: true });
      await tasks.getByRole("button", {name:"調査の詳細",exact:true}).click();
      const detail = page.getByRole("dialog", { name: "詳細パネル", exact: true });
      await detail.getByRole("button", { name: "編集", exact: true }).click();
      await detail.getByLabel("名前", { exact: true }).fill("取り消す名前");
      await page.keyboard.press("Escape");
      await page.getByRole("button",{name:"破棄して進む",exact:true}).click();
      await expect(detail).toBeVisible();
      await detail.getByRole("button", { name: "編集", exact: true }).click();
      await expect(detail.getByLabel("名前", { exact: true })).toHaveValue("調査");
      await detail.getByLabel("名前", { exact: true }).fill("調査完了へ");
      await chmod(dataRoot, 0o555);
      await detail.getByRole("button", { name: "保存", exact: true }).click();
      await expect(detail.getByRole("alert")).toContainText("保存に失敗");
      await expect(detail.getByLabel("名前", { exact: true })).toHaveValue("調査完了へ");
      await chmod(dataRoot, 0o755);
      await detail.getByRole("button", { name: "保存", exact: true }).click();
      await expect(detail.getByLabel("名前", { exact: true })).toHaveCount(0);
      await detail.getByRole("button", { name: "+ 補足を追加", exact: true }).click();
      await detail.getByRole("textbox", { name: "補足", exact: true }).fill("メモ\n- 確認事項");
      await detail.getByRole("button", { name: "補足を保存", exact: true }).click();
      await expect(detail.locator(".detail-note")).toHaveText("メモ\n- 確認事項");
      await detail.getByRole("button", { name: "削除", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "削除確認", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(detail).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(detail).toHaveCount(0);
      await expect(tasks.getByRole("button", { name: "調査完了への詳細", exact: true })).toBeFocused();
      // ポイント、完了、解除は詳細を開かずに保存する。
      const line = tasks.locator(".task-line").filter({ has: page.getByRole("button", { name: "調査完了へ", exact: true }) });
      await line.getByRole("button", { name: "未見積", exact: true }).click();
      await page.getByRole("button", { name: "8", exact: true }).click();
      await expect(line.getByRole("button", { name: "8pt", exact: true })).toBeVisible();
      await line.getByRole("checkbox").click();
      await expect(line.getByRole("checkbox")).toBeChecked();
      await expect(line.locator(".task-name")).toHaveCSS("text-decoration-line", "line-through");
      await line.getByRole("checkbox").click();
      await expect(line.getByRole("checkbox")).not.toBeChecked();
      // 通常Storyの追加と選択。データ更新で選択と入力を保つ。
      await groups.getByRole("button", { name: "Storyを追加", exact: true }).click();
      await groups.getByRole("textbox").fill("必要な作業グループ");
      await groups.getByRole("textbox").press("Enter");
      await expect(groups.getByRole("textbox")).toHaveCount(0);
      await groups.locator(".story-select").filter({ hasText: "必要な作業グループ" }).click();
      await tasks.getByRole("button", { name: "Taskを追加", exact: true }).click();
      await tasks.getByRole("textbox").fill("通常StoryのTask");
      await session.reload();
      await expect(tasks.getByRole("textbox")).toHaveValue("通常StoryのTask");
      await tasks.getByRole("textbox").press("Enter");
      await expect(tasks.getByRole("button", { name: "通常StoryのTask", exact: true })).toBeVisible();
      // REQ-034-S05/S06: 名前と余白は同じ確認を通し、詳細の確認取消でも追加下書きを守る。
      await tasks.getByRole("button", {name:"Taskを追加",exact:true}).click();
      await tasks.getByRole("textbox").fill("移動下書き");
      const beforeDraft=await readFile(path,"utf8");
      await groups.getByRole("button",{name:"Taksを選択",exact:true}).click({position:{x:4,y:10}});
      const draftPrompt=page.getByRole("alertdialog",{name:"未保存の追加入力",exact:true});
      await draftPrompt.getByRole("button",{name:"キャンセル",exact:true}).click();
      await expect(tasks.getByRole("textbox")).toHaveValue("移動下書き");
      await groups.getByRole("button",{name:"必要な作業グループの詳細",exact:true}).click();
      await detail.getByRole("button",{name:"編集",exact:true}).click();
      await detail.getByLabel("名前",{exact:true}).fill("捨てない詳細");
      await groups.locator(".story-select").filter({hasText:"Taks"}).click();
      await page.getByRole("alertdialog",{name:"未保存の編集",exact:true}).getByRole("button",{name:"キャンセル",exact:true}).click();
      await expect(detail.getByLabel("名前",{exact:true})).toHaveValue("捨てない詳細");
      await expect(tasks.getByRole("textbox")).toHaveValue("移動下書き");
      assert.equal(await readFile(path,"utf8"),beforeDraft);
      await detail.getByRole("button",{name:"取消",exact:true}).click();
      await detail.getByRole("button",{name:"詳細を閉じる",exact:true}).click();
      // REQ-034-S07: 実EACCESの失敗でも元Storyを保ち、同じ追加先へ再送する。
      await groups.getByRole("button",{name:"Taksを選択",exact:true}).click({position:{x:4,y:10}});
      await chmod(dataRoot,0o555);
      await draftPrompt.getByRole("button",{name:"追加して進む",exact:true}).click();
      await expect(draftPrompt.getByRole("alert")).toContainText("追加に失敗");
      await expect(tasks.getByRole("textbox")).toHaveValue("移動下書き");
      assert.equal(await readFile(path,"utf8"),beforeDraft);
      await chmod(dataRoot,0o755);
      await draftPrompt.getByRole("button",{name:"追加して進む",exact:true}).click();
      await expect(draftPrompt).toHaveCount(0);
      const afterDraft=await savedProject();
      assert.equal(afterDraft.events[0].tasks.length,4);
      assert.deepEqual(afterDraft.events[0].stories[0].tasks.map(task=>task.name),["通常StoryのTask","移動下書き"]);
      assert.deepEqual(afterDraft.events[1].stories,[grouped]);
      await groups.locator(".story-select").filter({hasText:"必要な作業グループ"}).click();
      await tasks.getByRole("button",{name:"移動下書きの詳細",exact:true}).click();
      await detail.getByRole("button",{name:"削除",exact:true}).click();
      await page.getByRole("button",{name:"削除する",exact:true}).click();
      await expect(tasks.getByRole("button",{name:"移動下書き",exact:true})).toHaveCount(0);
      // 追加の回帰で使った削除の件数を、以下の元の削除確認とは別に数える。
      const draftDeleteCount=requests.filter(request=>request.type === "deleteItem").length;
      // REQ-031-S06: 端へ調整後の縮小でも上下下限を維持する。
      const handle = page.getByRole("separator", { name: "タイムラインと詳細の高さ", exact: true });
      await handle.focus();
      for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowDown");
      await page.setViewportSize({ width: 1100, height: 640 });
      await expect.poll(() => page.locator(".board-details-panel").evaluate((node) => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(79.9);
      await page.keyboard.press("Home");
      await page.setViewportSize({ width: 1440, height: 900 });
      // 再読込後も追加、名前、ポイント、補足が一致する。
      await page.reload();
      await expect(tasks.getByRole("button", { name: "調査完了へ", exact: true })).toBeVisible();
      // REQ-029-S03/S11/S12: 既存メインの下書きは欠落と設定解除でも保持し、設定案内を重ねない。
      await tasks.getByRole("button",{name:"Taskを追加",exact:true}).click();
      await tasks.getByRole("textbox").fill("起動状態下書き");
      const managePath=resolve(dataRoot,"manage.yaml"), manageBytes=await readFile(managePath,"utf8");
      const projectBeforeMissing=await readFile(path,"utf8");
      await rm(managePath);await session.reload();
      await expect(tasks.getByRole("textbox")).toHaveValue("起動状態下書き");
      await expect(page.getByRole("region",{name:"manage.yamlの設定",exact:true})).toHaveCount(0);
      await expect(page.getByRole("status",{name:"管理ファイルの接続状態",exact:true})).toContainText("左の EVENT 一覧");
      await tasks.getByRole("textbox").press("Enter");
      await expect(page.getByRole("alert")).toContainText(/manage.yaml|ENOENT/);
      await expect(tasks.getByRole("textbox")).toHaveValue("起動状態下書き");
      assert.equal(await readFile(path,"utf8"),projectBeforeMissing);
      await page.screenshot({path:resolve(artifacts,"setup",`existing-main-${theme}.png`)});
      await writeFile(managePath,manageBytes);await session.reload();
      await dispatch({type:"unconfigured"});
      await expect(tasks.getByRole("textbox")).toHaveValue("起動状態下書き");
      await expect(page.getByRole("button",{name:"manage.yamlを選ぶ",exact:true})).toHaveCount(0);
      await session.reload();await expect(tasks.getByRole("textbox")).toHaveValue("起動状態下書き");
      await tasks.getByRole("textbox").press("Escape");
      saved = await savedProject();
      const direct = saved.events[0];
      assert.equal(direct.tasks.length, 4);
      assert.deepEqual(direct.tasks[0], { id: direct.tasks[0].id, name: "調査完了へ", points: 8, note: "メモ\n- 確認事項" });
      assert.deepEqual(saved.events[1].stories, [grouped]);
      assert.ok((await readFile(path, "utf8")).includes("# 検証コメント"));
      assert.equal(requests.filter((request) => request.type === "addEventTask").length, 6); // 成功4件、失敗2件(EACCESと管理ファイル不在)。
      await page.screenshot({ path: resolve(artifacts, `board-${theme}.png`) });
      await tasks.getByRole("button", { name: "調査完了への詳細", exact: true }).click();
      // REQ-026-S03: CSSまで含め、一覧と詳細のポイント配色が一致する。
      const listPoint = tasks.getByRole("button",{name:"8pt",exact:true});
      const detailPoint = detail.getByRole("button",{name:"8pt",exact:true});
      const color = node => getComputedStyle(node).color;
      assert.equal(await detailPoint.evaluate(color),await listPoint.evaluate(color));
      await detailPoint.click();
      await page.getByRole("button",{name:"13",exact:true}).click();
      await expect(detail.getByRole("button",{name:"13pt",exact:true})).toBeVisible();
      await detail.getByRole("button",{name:"13pt",exact:true}).click();
      await page.getByRole("button",{name:"8",exact:true}).click();
      await expect.poll(async()=> (await savedProject()).events[0].tasks[0].points).toBe(8);
      await page.screenshot({ path: resolve(artifacts, `detail-${theme}.png`) });
      await page.keyboard.press("Escape");
      // REQ-037-S01: ボード上部には追加を置かず、左のEVENT一覧へ集める。
      await expect(page.getByRole("button",{name:"Eventを追加",exact:true})).toHaveCount(0);
      const eventSummary = page.getByRole("region", { name: "Event詳細", exact: true });
      await eventSummary.getByRole("button", { name: "小さなリリースの詳細", exact: true }).click();
      await detail.getByRole("button", { name: "削除", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "削除確認", exact: true })).toContainText("ストーリー 1件、タスク 5件も削除されます。");
      await page.getByRole("button", { name: "キャンセル", exact: true }).click();
      assert.equal(requests.filter((request) => request.type === "deleteItem").length, draftDeleteCount);
      await page.keyboard.press("Escape");
      await tasks.getByRole("button", { name: "実装の詳細", exact: true }).click();
      await detail.getByRole("button", { name: "削除", exact: true }).click();
      await page.getByRole("button", { name: "削除する", exact: true }).click();
      await expect(tasks.getByRole("button", { name: "実装", exact: true })).toHaveCount(0);
      await eventSummary.getByRole("button", { name: "小さなリリースの詳細", exact: true }).click();
      await detail.getByRole("button", { name: "削除", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "削除確認", exact: true })).toContainText("ストーリー 1件、タスク 4件も削除されます。");
      await page.getByRole("button", { name: "削除する", exact: true }).click();
      await expect.poll(async () => (await savedProject()).events.some((event) => event.id === eventId)).toBe(false);
      assert.deepEqual(errors, []);
      results.push({ theme, passed: true, realYamlPersistence: true, realWriteFailureRecovery: true, addEventTaskRequests: 6, groupedTasksPreserved: true, inlineDraftProtection: true, singleSetupGuidance:true, missingAndUnsetPreserveDraft:true, pageErrors: errors });
      console.log(`${theme}: repeated operations, cancellation, persistence and recovery passed`);
    } finally {
      unsubscribe(); ready = false;
      await chmod(dataRoot, 0o755);
      await page.close();
      await rm(dataRoot, { recursive: true, force: true });
    }
  }
  await writeFile(resolve(artifacts, "browser-results.json"), JSON.stringify({ verifiedAt: new Date().toISOString(), browser: browser.version(), results }, null, 2) + "\n");
} finally {
  await browser.close();
  await rm(runtime, { recursive: true, force: true });
}
