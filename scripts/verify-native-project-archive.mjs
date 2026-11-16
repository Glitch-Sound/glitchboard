import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { _electron, expect } from "@playwright/test";
import { parse } from "../packages/extension/node_modules/yaml/dist/index.js";

const root = await mkdtemp(join(tmpdir(), "gb-native-archive-"));
const artifacts = resolve("artifacts/project-archive");
await mkdir(artifacts, { recursive: true });
await mkdir(join(root, "user/User"), { recursive: true });
const manage = join(root, "manage.yaml");
const settingsPath = join(root, "user/User/settings.json");
const projects = ["Alpha", "Beta"].map((name, i) => ({
  id: `11111111-1111-4111-8111-11111111111${i}`, name, color: i ? "#2d8b57" : "#4f8cff", note: "検証用サンプル",
  events: [{ id: `22222222-2222-4222-8222-22222222222${i}`, name: `${name} Event`, due: "2099-11-20", tasks: [{ id: `33333333-3333-4333-8333-33333333333${i}`, name: `${name} Task`, points: 3 }], stories: [] }],
}));
const files = projects.map(p => join(root, `${p.name}.yaml`));
const sources = projects.map(p => `# 保持するコメント\n${JSON.stringify(p, null, 2)}\n`);
const manageSource = "settings: {workdays_off: [sat, sun], public_holidays: false}\nprojects: [{file: Alpha.yaml, load: true}, {file: Beta.yaml, load: true}]\n";
await writeFile(manage, manageSource);
const settings = { "workbench.startupEditor": "none", "workbench.colorTheme": "Default Dark Modern", "workbench.secondarySideBar.defaultVisibility": "hidden", "window.zoomLevel": 0, "editor.fontSize": 13, "window.restoreWindows": "none", "update.mode": "none", "extensions.autoUpdate": false, "extensions.autoCheckUpdates": false, "glitchboard.manageFile": manage };
await writeFile(settingsPath, JSON.stringify(settings));
await Promise.all(files.map((file, i) => writeFile(file, sources[i])));
let app;
const results = [];
try {
  app = await _electron.launch({ executablePath: process.env.VSCODE_EXECUTABLE ?? "/Applications/Visual Studio Code.app/Contents/MacOS/Code", args: [`--user-data-dir=${join(root,"user")}`, `--extensions-dir=${join(root,"extensions")}`, `--extensionDevelopmentPath=${resolve("packages/extension")}`, "--locale=en", "--skip-welcome", "--skip-release-notes", "--new-window"], timeout: 30000 });
  const page = await app.firstWindow(); page.setDefaultTimeout(12000);
  await page.waitForSelector(".monaco-workbench");
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ width: 1320, height: 900 }));
  const command = async name => { await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].focus()); await page.bringToFront(); await page.keyboard.press("F1"); const input=page.locator(".quick-input-widget input"); await input.fill(`>${name}`); await expect(page.locator(".quick-input-list").getByText(name,{exact:true}).first()).toBeVisible(); await input.press("Enter"); };
  const findFrame = async selector => { let result; await expect.poll(async()=>{for(const f of page.frames()){if(f.isDetached())continue;try{if(await f.locator(selector).count()){result=f;return true;}}catch(error){if(!f.isDetached())throw error;}}return false;},{timeout:20000}).toBe(true);return result; };
  await command("GlitchBoardを開く");
  for (const theme of ["Default Dark Modern", "Default Light Modern"]) {
    await writeFile(settingsPath, JSON.stringify({...settings, "workbench.colorTheme":theme}));
    // 各テーマは独立したサンプルへ戻す。実利用者の管理ファイルは使わない。
    await Promise.all(files.map((file,i)=>writeFile(file,sources[i])));
    let frame=await findFrame(".board-page");let events=await findFrame(".events-page");
    await expect(frame.locator(".project-row")).toHaveCount(2);
    await expect.poll(()=>frame.locator("body").getAttribute("data-vscode-theme-name")).toBe(theme.replace("Default ",""));
    const selectBeta=()=>events.locator(".event-row").filter({hasText:"Beta Event"}).locator(".event-row-select").click();
    await selectBeta(); await expect(frame.getByRole("region",{name:"Event詳細"})).toContainText("Beta Event");
    await frame.getByRole("button",{name:"Betaの詳細",exact:true}).click();
    const panel=frame.getByRole("dialog",{name:"詳細パネル",exact:true});
    await panel.getByRole("button",{name:"編集",exact:true}).click();
    const checkbox=panel.getByRole("checkbox",{name:"アーカイブ",exact:true});
    // REQ-047-S03: Space、フォーカス、取消と未保存移動の接続。
    await checkbox.focus();await checkbox.press("Space");await expect(checkbox).toBeChecked();
    await expect(checkbox).toBeFocused();
    const focus=await checkbox.evaluate(n=>{const s=getComputedStyle(n);return {outline:s.outlineStyle,width:s.outlineWidth};}); assert.notEqual(focus.outline,"none");
    await page.screenshot({path:join(artifacts,`${theme.includes("Dark")?"dark":"light"}-editing.png`),scale:"css"});
    await panel.getByRole("button",{name:"取消",exact:true}).click();
    assert.equal(await readFile(files[1],"utf8"),sources[1]);
    await panel.getByRole("button",{name:"編集",exact:true}).click();await expect(checkbox).not.toBeChecked();await checkbox.check();
    await panel.getByRole("button",{name:"詳細を閉じる",exact:true}).click();
    await frame.getByRole("button",{name:"キャンセル",exact:true}).click();await expect(checkbox).toBeChecked();
    // REQ-047-S01: 保存前は残り、保存結果で行だけが消える。
    const headerBefore=await frame.locator(".board-header").textContent();const summaryBefore=await frame.getByRole("region",{name:"Event詳細"}).textContent();
    await expect(frame.locator(".project-row")).toHaveCount(2);
    await panel.getByRole("button",{name:"保存",exact:true}).click();
    await expect(frame.locator(".project-row")).toHaveCount(1);await expect(panel.getByText("アーカイブ済み",{exact:true})).toBeVisible();
    assert.equal(await frame.locator(".board-header").textContent(),headerBefore);assert.equal(await frame.getByRole("region",{name:"Event詳細"}).textContent(),summaryBefore);
    const saved=await readFile(files[1],"utf8");assert.deepEqual(parse(saved),{...projects[1],archived:true});assert.ok(saved.includes("# 保持するコメント"));
    assert.equal(await readFile(files[0],"utf8"),sources[0]);assert.equal(await readFile(manage,"utf8"),manageSource);
    await panel.getByRole("button",{name:"編集",exact:true}).click();await expect(checkbox).toHaveCount(0);await panel.getByRole("button",{name:"取消",exact:true}).click();
    await panel.getByRole("button",{name:"詳細を閉じる",exact:true}).click();
    await command("View: Close Editor");await command("GlitchBoardを開く");frame=await findFrame(".board-page");await expect(frame.locator(".project-row")).toHaveCount(1);
    await Promise.all([page.waitForEvent("framenavigated",{predicate:f=>f===page.mainFrame(),timeout:20000}),command("Developer: Reload Window")]);await page.waitForLoadState("domcontentloaded");await page.waitForSelector(".monaco-workbench");await command("GlitchBoardを開く");frame=await findFrame(".board-page");events=await findFrame(".events-page");
    await expect(frame.locator(".project-row")).toHaveCount(1);await selectBeta();await expect(frame.getByRole("checkbox",{name:"Beta Taskの完了",exact:true})).toBeVisible();
    // REQ-047-S05: 全件アーカイブでも必要ペース、追加、左 EVENT からの詳細と Task 操作を残す。
    await frame.getByRole("button",{name:"Alphaの詳細",exact:true}).click();const alpha=frame.getByRole("dialog",{name:"詳細パネル",exact:true});await alpha.getByRole("button",{name:"編集",exact:true}).click();await alpha.getByRole("checkbox",{name:"アーカイブ",exact:true}).check();await alpha.getByRole("button",{name:"保存",exact:true}).click();
    await expect(frame.locator(".project-row")).toHaveCount(0);await alpha.getByRole("button",{name:"詳細を閉じる",exact:true}).click();
    await expect(frame.getByRole("button",{name:"Projectを追加",exact:true})).toBeVisible();await expect(frame.getByRole("img",{name:"日別必要ペース",exact:true})).toBeVisible();
    await events.getByRole("button",{name:"Beta Eventの詳細",exact:true}).click();await expect(frame.locator(".detail-target")).toHaveText("EVENT : Beta Event");await frame.getByRole("button",{name:"詳細を閉じる",exact:true}).click();
    await frame.getByRole("checkbox",{name:"Beta Taskの完了",exact:true}).click();await expect(frame.getByRole("checkbox",{name:"Beta Taskの完了",exact:true})).toBeChecked();await expect.poll(async()=>parse(await readFile(files[1],"utf8")).events[0].tasks[0].doneAt).not.toBeUndefined();
    await page.screenshot({path:join(artifacts,`${theme.includes("Dark")?"dark":"light"}-archived.png`),scale:"css"});
    await expect(frame.locator(".operation-error")).toHaveCount(0);
    assert.equal(await readFile(manage,"utf8"),manageSource);
    results.push({theme,passed:true,archivePersisted:true,tabReopen:true,extensionRestart:true,eventRetained:true,allArchivedTaskEditable:true,keyboardFocus:focus});
  }
  const hostVersion=await app.evaluate(({app})=>app.getVersion());
  await writeFile(join(artifacts,"native-results.json"),JSON.stringify({hostVersion,isolatedProfile:true,userDataTouched:false,results},null,2)+"\n");
  console.log(JSON.stringify({hostVersion,results}));
} finally {if(app)await app.close();await rm(root,{recursive:true,force:true});}
