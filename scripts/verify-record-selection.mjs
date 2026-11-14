import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, expect } from "@playwright/test";
import { build } from "vite";
import { parse } from "../packages/extension/node_modules/yaml/dist/index.js";
const phase = process.env.SELECTION_PHASE ?? "after";
const artifacts = resolve("artifacts/selection-backgrounds"); await mkdir(artifacts, { recursive: true });
const runtime = await mkdtemp(resolve(tmpdir(), "gb-selection-runtime-"));
await build({ configFile: false, logLevel: "error", ssr: { noExternal: true }, build: { ssr: resolve("packages/extension/src/session.ts"), outDir: runtime, rollupOptions: { output: { entryFileNames: "session.mjs" } } } });
const { BoardSession } = await import(pathToFileURL(resolve(runtime, "session.mjs")).href);
const browser = await chromium.launch({ headless: true }), results = [], failures = [];
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const style = locator => locator.evaluate(node => { const s = getComputedStyle(node); return { color: s.color, background: s.backgroundColor, outline: s.outline, outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, border: s.border, cursor: s.cursor, decoration: s.textDecorationLine }; });
try {
 for (const theme of ["dark", "light"]) {
  const root = await mkdtemp(resolve(tmpdir(), "gb-selection-")), pages = [], unsubs = [], errors = [], requests = [], samples = {}, captures = [], story = {};
  const selectedInk = theme === "dark" ? "rgb(255, 255, 255)" : "rgb(17, 17, 17)";
  const source = { id: id(1), name: "制作プロジェクト", color: "#4c8dff", note: "プロジェクトの補足", events: [
   { id: id(2), name: "公開準備", due: "2026-11-16", note: "元の補足", tasks: [{ id: id(4), name: "通常の作業", points: 8, note: "作業の補足" }, { id: id(5), name: "完了の作業", points: 3, doneAt: "2026-11-13" }], stories: [{ id: id(7), name: "実装", tasks: [{ id: id(8), name: "Storyの作業", points: 5 }] }] },
   { id: id(3), name: "次の準備", due: "2026-11-16", tasks: [], stories: [] },
  ] };
  const other = { id: id(1), name: "検証プロジェクト", color: "#d08228", events: [{ id: id(2), name: "別Projectの予定", due: "2026-11-19", tasks: [{ id: id(4), name: "別の作業", points: 1 }], stories: [] }] };
  const a = resolve(root, "A.yaml"), b = resolve(root, "B.yaml"), manage = resolve(root, "manage.yaml");
  await writeFile(a, JSON.stringify(source)); await writeFile(b, JSON.stringify(other));
  await writeFile(resolve(root, "C.yaml"), JSON.stringify({ id: id(1), name: "空のProject", color: "#44aa77", events: [] }));
  await writeFile(manage, JSON.stringify({ settings: { workdays_off: ["sat", "sun"], public_holidays: true }, projects: [{ file: "A.yaml", load: true }, { file: "B.yaml", load: true }, { file: "C.yaml", load: true }] }));
  const session = new BoardSession(manage); await session.reload(); session.selectEvent(id(2), "A.yaml");
  let board, failNext = false;
  const dispatch = (page, data) => page.evaluate(message => window.dispatchEvent(new MessageEvent("message", { data: message })), data);
  const snap = () => ({ type: "snapshot", payload: session.snapshot() });
  const css = `:root{--vscode-font-family:-apple-system,BlinkMacSystemFont,sans-serif;--vscode-font-size:13px;--vscode-foreground:${theme === "dark" ? "#d4d4d4" : "#333333"};--vscode-editor-background:${theme === "dark" ? "#181818" : "#ffffff"};--vscode-sideBar-background:${theme === "dark" ? "#202020" : "#f3f3f3"};--vscode-input-background:${theme === "dark" ? "#222222" : "#ffffff"};--vscode-panel-border:${theme === "dark" ? "#454545" : "#cccccc"};--vscode-descriptionForeground:${theme === "dark" ? "#a3a3a3" : "#616161"};--vscode-focusBorder:#007fd4;--vscode-charts-blue:#4c8dff;--vscode-charts-green:#3a995c;--vscode-list-activeSelectionBackground:${theme === "dark" ? "#264f78" : "#cce5ff"};--vscode-list-activeSelectionForeground:${theme === "dark" ? "#ffffff" : "#111111"};--vscode-list-inactiveSelectionBackground:${theme === "dark" ? "#303440" : "#e4e6f1"};--vscode-list-hoverBackground:${theme === "dark" ? "#292f38" : "#eeeeee"};--vscode-button-background:#0078d4;--vscode-button-foreground:#ffffff;--vscode-button-secondaryBackground:${theme === "dark" ? "#313131" : "#e5e5e5"};--vscode-button-secondaryForeground:${theme === "dark" ? "#cccccc" : "#333333"};--vscode-errorForeground:${theme === "dark" ? "#f48771" : "#c72e0f"}}`;
  async function open(surface) {
   const page = await browser.newPage({ viewport: { width: surface === "board" ? 1440 : 280, height: 900 } }); pages.push(page); page.setDefaultTimeout(7000);
   await page.clock.install({ time: new Date("2026-11-14T03:00:00Z") }); page.on("pageerror", error => errors.push(error.message));
   let ready = false; unsubs.push(session.subscribe(surface, () => { if (ready) void dispatch(page, snap()).catch(error => errors.push(error.message)); }));
   await page.exposeFunction("extensionMessage", async message => {
    requests.push({ surface, ...message });
    if (message.type === "ready") { ready = true; return dispatch(page, snap()); }
    if (surface === "events" && message.type === "selectEvent") return dispatch(board, { type: "navigateRecord", payload: { kind: "event", id: message.eventId, projectFile: message.projectFile, openDetail: message.openDetail ?? false } });
    const payload = failNext && message.type === "editItem" ? (failNext = false, { ok: false, error: "検証用の保存失敗" }) : await session.handleOperation(message);
    return dispatch(page, { type: "operationResult", requestId: message.requestId, payload });
   });
   await page.addInitScript(() => { window.acquireVsCodeApi = () => ({ getState: () => ({}), setState: () => {}, postMessage: message => { void window.extensionMessage(message); } }); });
   await page.route("http://record-selection.test/**", async route => { const name = new URL(route.request().url()).pathname.slice(1); if (!name) return route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="ja"><head><meta charset="utf-8"><link rel="stylesheet" href="/style.css"><style>${css}</style></head><body><div id="root"></div><script type="module" src="/${surface}.js"></script></body></html>` }); const asset = resolve("packages/extension/dist/webview", name); assert.ok(asset.startsWith(resolve("packages/extension/dist/webview") + "/")); return route.fulfill({ contentType: name.endsWith("css") ? "text/css" : "text/javascript", body: await readFile(asset) }); });
   await page.goto("http://record-selection.test/"); return page;
  }
  const verify = (condition, message) => { if (!condition) failures.push({ theme, message }); };
  const noSelectionFrame = async (locator, label) => { const s = await style(locator); verify(s.outlineStyle === "none", `${label}: 選択した行に枠を出さない`); return s; };
  const capture = async (page, name) => { captures.push(name); await page.screenshot({ path: resolve(artifacts, `${phase}-${theme}-${name}.png`) }); };
  try {
   board = await open("board"); const sidebar = await open("events");
   const detail = board.getByRole("dialog", { name: "詳細パネル", exact: true });
   const project = name => board.locator('th[scope="row"]').filter({ has: board.getByRole("button", { name, exact: true }) });
   const eventRow = name => sidebar.locator(".event-row").filter({ has: sidebar.getByRole("button", { name: `${name}を選択`, exact: true }) });
   const task = name => board.locator(".task-line").filter({ has: board.getByRole("button", { name, exact: true }) });
   const group = name => board.locator(".story-choice").filter({ has: board.locator(".story-name").getByText(name, { exact: true }) });
   const focus = async locator => { await locator.focus(); await locator.press("Tab"); await locator.page().keyboard.press("Shift+Tab"); await expect(locator).toBeFocused(); const s = await style(locator); verify(s.outlineStyle !== "none" && Number.parseFloat(s.outlineWidth) > 0, "キーボードのフォーカス枠"); };
   await expect(board.getByRole("region", { name: "Event詳細" })).toContainText("公開準備");
   // REQ-030-S02 REQ-035-S01: 仮想 Taks と通常 Story の背景、選択枠、詳細とキーボードを分ける。
   story.directSelected = { row: await style(group("Taks")), button: await style(group("Taks").locator(".story-select")) };
   story.optionalUnselected = { row: await style(group("実装")), detail: await style(group("実装").locator(".detail-button")) };
   await group("実装").locator(".story-select").hover(); story.optionalHover = await style(group("実装").locator(".story-select"));
   await focus(group("実装").locator(".story-select")); story.optionalFocus = await style(group("実装").locator(".story-select"));
   await group("実装").locator(".story-select").press("Enter"); await expect(board.getByRole("button", { name: "Storyの作業", exact: true })).toBeVisible();
   story.optionalSelected = { row: await style(group("実装")), detail: await style(group("実装").locator(".detail-button")) };
   await noSelectionFrame(group("実装"), "通常 Story");
   verify(story.optionalSelected.row.background !== story.optionalUnselected.row.background && story.optionalSelected.row.background === (await style(eventRow("公開準備"))).background, "通常 Story は他の選択行と同じ明るい背景にする");
   verify(story.directSelected.row.background === story.optionalSelected.row.background && story.directSelected.row.outlineStyle === "none", "Taks も通常 Story と同じ選択背景にし、選択枠を付けない");
   verify(story.optionalSelected.detail.color === selectedInk, "Story の選択詳細を強調する");
   const storyNameBox = await group("実装").locator(".story-name").boundingBox(), progressBox = await group("実装").locator("progress").boundingBox();
   verify(progressBox.y + progressBox.height / 2 > storyNameBox.y + storyNameBox.height / 2, "Story の進捗バーを名前より下へ配置する");
   await capture(board, "story-reference");
   await board.getByRole("heading", { name: "GlitchBoard", exact: true }).click();
   await noSelectionFrame(group("実装").locator(".story-select"), "フォーカスを外した選択 Story のボタン");
   await capture(board, "story-selected");
   await focus(group("Taks").locator(".record-hitbox")); await capture(board, "story-hitbox-focus");
   await group("Taks").locator(".record-hitbox").press("Enter");
   await expect(board.getByRole("button", { name: "通常の作業", exact: true })).toBeVisible();
   // REQ-035-S02: Project の名前、余白、左線と選択詳細。
   samples.projectCellUnselected = await style(project("検証プロジェクト"));
   samples.projectUnselected = await style(project("検証プロジェクト").locator(".detail-button"));
   await project("検証プロジェクト").getByRole("button", { name: "検証プロジェクト", exact: true }).hover();
   verify((await style(project("検証プロジェクト").getByRole("button", { name: "検証プロジェクト", exact: true }))).decoration === "none", "Project 名のホバーに下線を出さない");
   await project("検証プロジェクト").hover({ position: { x: 3, y: 3 } });
   verify((await style(project("検証プロジェクト"))).cursor === "pointer", "Project セルの余白はポインター");
   await capture(board, "project-unselected-hover");
   const projectName = project("検証プロジェクト").getByRole("button", { name: "検証プロジェクト", exact: true }); await focus(projectName); verify(!(await style(project("検証プロジェクト"))).outline.includes("none"), "Project 名のフォーカスを省略表示で切らずセル内側にも示す"); await capture(board, "project-focus");
   await projectName.press("Enter"); await expect(board.getByRole("region", { name: "Event詳細" })).toContainText("別Projectの予定");
   samples.projectSelected = await style(project("検証プロジェクト").locator(".detail-button"));
   samples.projectCellSelected = await style(project("検証プロジェクト"));
   verify(samples.projectSelected.color === selectedInk, "選択 Project の詳細を選択前景にする");
   verify(await project("検証プロジェクト").evaluate(node => getComputedStyle(node).borderInlineStartColor) === "rgb(208, 130, 40)", "Project の選択左線は設定色");
   verify((await style(project("制作プロジェクト").locator(".detail-button"))).color === "rgb(76, 141, 255)", "未選択 Project の補足色を保持する");
   await capture(board, "project-selected");
   // REQ-035-S03: 別 Project の同じ UUID を選んでも左の1行だけを選択する。
   samples.sidebarSelected = await style(eventRow("別Projectの予定")); samples.sidebarUnselected = await style(eventRow("公開準備"));
   verify(await eventRow("別Projectの予定").evaluate(node => node.classList.contains("selected")), "左の対象 Event を選択表示");
   verify(!await eventRow("公開準備").evaluate(node => node.classList.contains("selected")), "同じ UUID の別 Project を強調しない");
   verify((await style(eventRow("別Projectの予定").locator(".detail-button"))).color === selectedInk, "左の選択 Event の詳細色");
   await capture(sidebar, "events-selected");
   const eventSelect = eventRow("公開準備").locator(".event-row-select"); await eventSelect.hover(); await capture(sidebar, "event-unselected-hover"); await focus(eventSelect); await capture(sidebar, "event-focus"); await eventSelect.press("Enter");
   await expect(board.getByRole("region", { name: "Event詳細" })).toContainText("公開準備");
   await sidebar.getByRole("heading", { name: "EVENT", exact: true }).hover();
   await sidebar.getByRole("button", { name: "抽出条件", exact: true }).focus();
   samples.eventSelected = await style(eventRow("公開準備"));
   verify(samples.eventSelected.background !== samples.sidebarUnselected.background, "ホバーとフォーカスが外れても Event の選択背景を保持する");
   await noSelectionFrame(eventRow("公開準備"), "左の Event");
   samples.eventSummarySelected = await noSelectionFrame(board.locator(".event-summary"), "Event 要約");
   verify(samples.eventSummarySelected.background === "rgba(0, 0, 0, 0)", "下部 Event 要約には選択背景を付けない");
   await focus(board.locator(".event-summary > .record-hitbox")); await capture(board, "event-hitbox-focus");
   verify((await style(eventRow("公開準備").locator(".detail-button"))).color === selectedInk, "補足がある選択 Event も詳細を強調");
   verify((await style(sidebar.locator(".event-row-name").getByText("公開準備", { exact: true }))).color === (theme === "dark" ? "rgb(244, 135, 113)" : "rgb(199, 46, 15)"), "選択しても危険色を保持");
   verify((await style(board.locator(".event-summary .detail-button"))).color === selectedInk, "要約の Event の詳細を強調");
   const marker = board.locator(".marker-wrap").filter({ has: board.getByRole("button", { name: "2件のEvent", exact: true }) });
   verify(await marker.evaluate(node => node.classList.contains("selected")), "選択 Event を含む同日マーカーを強調");
   samples.markerSelected = await noSelectionFrame(marker, "Event マーカー");
   await marker.getByRole("button", { name: "2件のEvent", exact: true }).click();
   const option = board.locator(".marker-list > div").filter({ has: board.getByRole("option", { name: "公開準備", exact: true }) });
   samples.markerOptionSelected = await noSelectionFrame(option, "同日 Event の行");
   await focus(option.getByRole("option", { name: "公開準備", exact: true }));
   verify((await style(option.locator(".detail-button"))).color === selectedInk, "同日一覧の選択詳細を強調"); await capture(board, "event-same-day");
   await board.getByRole("option", { name: "公開準備", exact: true }).click();
   // REQ-035-S04: 通常と完了の下線、選択詳細と独立操作。
   const normalName = task("通常の作業").getByRole("button", { name: "通常の作業", exact: true });
   samples.taskUnselected = await style(task("通常の作業"));
   await normalName.hover(); verify((await style(normalName)).decoration === "none", "Task のホバー下線を出さない"); await capture(board, "task-unselected-hover");
   await focus(normalName); await capture(board, "task-focus"); await normalName.press("Enter");
   samples.taskSelected = await noSelectionFrame(task("通常の作業"), "Task の行");
   await focus(task("通常の作業").locator(".record-hitbox")); await capture(board, "task-hitbox-focus");
   await task("通常の作業").locator(".record-hitbox").press("Enter");
   await noSelectionFrame(task("通常の作業"), "Task の余白をキーボードで選択した行");
   await task("通常の作業").click({ position: { x: 3, y: 3 } });
   await noSelectionFrame(task("通常の作業"), "Task の余白をクリックした行");
   await board.getByRole("heading", { name: "GlitchBoard", exact: true }).click();
   await noSelectionFrame(task("通常の作業").locator(".record-hitbox"), "フォーカスを外した選択 Task の余白ボタン");
   verify((await style(task("通常の作業").locator(".detail-button"))).color === selectedInk, "選択 Task の詳細を強調");
   const completedName = task("完了の作業").getByRole("button", { name: "完了の作業", exact: true }); await completedName.hover(); samples.taskCompletedHover = await style(task("完了の作業")); verify((await style(completedName)).decoration === "line-through", "完了 Task の取り消し線を保持"); await capture(board, "task-selected");
   await task("通常の作業").getByRole("button", { name: "通常の作業の詳細", exact: true }).click(); await expect(board.locator(".detail-target")).toHaveText("TASK : 通常の作業");
   await detail.getByRole("button", { name: "詳細を閉じる", exact: true }).click();
   const before = requests.filter(r => r.surface === "board" && r.type === "selectEvent").length;
   await task("通常の作業").getByRole("button", { name: "8pt", exact: true }).click(); await board.keyboard.press("Escape");
   assert.equal(requests.filter(r => r.surface === "board" && r.type === "selectEvent").length, before);
   // REQ-041-S04: 左からの移動確認、キャンセルと保存失敗でも確定前の選択を保つ。
   await eventRow("公開準備").getByRole("button", { name: "公開準備の詳細", exact: true }).click(); await expect(board.locator(".detail-target")).toHaveText("EVENT : 公開準備");
   await detail.getByRole("button", { name: "編集", exact: true }).click(); await detail.getByLabel("名前", { exact: true }).fill("保存する公開準備");
   await eventRow("別Projectの予定").locator(".event-row-select").click(); await expect(board.getByRole("alertdialog", { name: "未保存の編集", exact: true })).toBeVisible();
   await capture(board, "pending-change");
   verify(await eventRow("公開準備").evaluate(node => node.classList.contains("selected")), "移動確認中は元の選択色");
   await board.getByRole("button", { name: "キャンセル", exact: true }).click(); await expect(detail.getByLabel("名前", { exact: true })).toHaveValue("保存する公開準備");
   verify(await eventRow("公開準備").evaluate(node => node.classList.contains("selected")), "キャンセル後も元の選択色");
   await eventRow("別Projectの予定").locator(".event-row-select").click(); failNext = true; await board.getByRole("button", { name: "保存して進む", exact: true }).click();
   await expect(board.getByRole("alertdialog", { name: "未保存の編集", exact: true })).toContainText("失敗");
   verify(await eventRow("公開準備").evaluate(node => node.classList.contains("selected")), "保存失敗後も元の選択色");
   await board.getByRole("button", { name: "保存して進む", exact: true }).click(); await expect(board.locator(".detail-target")).toHaveText("EVENT : 別Projectの予定");
   assert.equal(parse(await readFile(a, "utf8")).events[0].name, "保存する公開準備"); assert.deepEqual(parse(await readFile(b, "utf8")), other);
   verify(await eventRow("別Projectの予定").evaluate(node => node.classList.contains("selected")), "保存成功後に選択色が移る");
   await capture(sidebar, "events-after-save"); await detail.getByRole("button", { name: "詳細を閉じる", exact: true }).click();
   // REQ-035-S05: 空の Project は元の Event を左へ残さず、確認取消では解除しない。
   await eventRow("別Projectの予定").getByRole("button", { name: "別Projectの予定の詳細", exact: true }).click();
   await detail.getByRole("button", { name: "編集", exact: true }).click(); await detail.getByLabel("名前", { exact: true }).fill("破棄する下書き");
   await project("空のProject").getByRole("button", { name: "空のProject", exact: true }).click();
   await expect(board.getByRole("alertdialog", { name: "未保存の編集", exact: true })).toBeVisible();
   await board.getByRole("button", { name: "キャンセル", exact: true }).click();
   await expect(detail.getByLabel("名前", { exact: true })).toHaveValue("破棄する下書き");
   verify(await eventRow("別Projectの予定").evaluate(node => node.classList.contains("selected")), "空 Project への移動取消は元の選択を維持");
   await project("空のProject").getByRole("button", { name: "空のProject", exact: true }).click();
   await board.getByRole("button", { name: "破棄して進む", exact: true }).click();
   await expect(board.locator(".detail-target")).toHaveText("PROJECT : 空のProject");
   await expect(board.getByRole("region", { name: "Event詳細" })).toHaveCount(0);
   await expect.poll(() => session.snapshot().selectedEventId).toBe(null);
   await dispatch(board, snap());
   await board.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
   verify(await sidebar.locator(".event-row.selected").count() === 0, "空 Project の選択確定は左の Event 選択を解除");
   verify(await project("空のProject").evaluate(node => getComputedStyle(node).borderInlineStartColor) === "rgb(68, 170, 119)", "解除の応答後も空 Project の選択左線を保持");
   verify((await style(project("空のProject").locator(".detail-button"))).color === selectedInk, "解除の応答後も空 Project の詳細を強調");
   assert.deepEqual(parse(await readFile(b, "utf8")), other);
   assert.deepEqual(parse(await readFile(resolve(root, "C.yaml"), "utf8")), { id: id(1), name: "空のProject", color: "#44aa77", events: [] });
   await capture(board, "empty-project"); await capture(sidebar, "events-cleared");
   if (phase === "after") {
    const baseline = JSON.parse(await readFile(resolve(artifacts, "before-results.json"), "utf8")).results.find(r => r.theme === theme);
    for (const key of ["projectCellUnselected", "projectCellSelected", "projectUnselected", "projectSelected", "sidebarSelected", "sidebarUnselected", "eventSelected", "markerSelected", "markerOptionSelected", "taskUnselected", "taskSelected", "taskCompletedHover"]) assert.deepEqual(samples[key], baseline.samples[key], `${key}: 変更前の表示を維持する`);
    for (const key of ["optionalUnselected", "optionalHover", "optionalFocus"]) assert.deepEqual(story[key], baseline.story[key], `Story ${key}: 未選択、ホバー、フォーカスを維持する`);
    assert.deepEqual(story.optionalSelected.detail, baseline.story.optionalSelected.detail, "Story の詳細の強調を維持する");
    const { background: currentBackground, ...currentSummary } = samples.eventSummarySelected, { background: previousBackground, ...previousSummary } = baseline.samples.eventSummarySelected;
    assert.deepEqual(currentSummary, previousSummary, "Event 要約は背景だけを変更する");
   }
   assert.deepEqual(errors, []); results.push({ theme, samples, story, captures, errors, guardedSelection: true });
   console.log(`${theme}: selection states, keyboard, independent operations and edit guards verified`);
  } finally { unsubs.forEach(unsubscribe => unsubscribe()); await Promise.all(pages.map(page => page.close())); await rm(root, { recursive: true, force: true }); }
 }
 await writeFile(resolve(artifacts, `${phase}-results.json`), JSON.stringify({ verifiedAt: new Date().toISOString(), browser: browser.version(), results, failures }, null, 2) + "\n");
 assert.deepEqual(failures, [], `${failures.length} selection presentation checks failed`);
} finally { await browser.close(); await rm(runtime, { recursive: true, force: true }); }
