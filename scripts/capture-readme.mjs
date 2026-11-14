import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { _electron, expect } from "@playwright/test";
import { stringify } from "../packages/extension/node_modules/yaml/dist/index.js";

const images = resolve("packages/extension/media/readme"), artifacts = resolve("artifacts/readme");
await mkdir(images, { recursive: true }); await mkdir(artifacts, { recursive: true });
const sample = resolve("examples/readme-guide"); await mkdir(join(sample, "projects"), { recursive: true });
const today = new Date().toLocaleDateString("sv-SE");
const day = offset => { const date = new Date(`${today}T12:00:00`); date.setDate(date.getDate() + offset); return date.toLocaleDateString("sv-SE"); };
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const project = { id: id(1), name: "Webサイト", color: "#4c8dff", note: "サイトの公開と改善を進める", events: [
 { id: id(2), name: "サイト公開", due: day(6), note: "公開前に画面と導線を確認する。\n使い方の説明も一緒に用意する。", tasks: [
  { id: id(3), name: "入力フォームを確認する", points: 8, note: "入力、保存、キャンセルを確認する。\nキーボードでも操作できるか確かめる。" },
  { id: id(4), name: "紹介文を仕上げる", points: 3 }, { id: id(5), name: "画面の見え方を確認する", points: 5 },
  { id: id(6), name: "公開手順を調べる" }, { id: id(7), name: "見出しを整理する", points: 2, doneAt: day(-1) }
 ], stories: [{ id: id(8), name: "公開後の改善", note: "必要になった作業をまとめる", tasks: [{ id: id(9), name: "利用時の気づきを記録する", points: 3 }] }] },
 { id: id(10), name: "リンクの見直し", due: day(-2), tasks: [{ id: id(11), name: "案内先を確認する", points: 2 }], stories: [] }
] };
const writing = { id: id(20), name: "記事制作", color: "#c586c0", events: [
 { id: id(21), name: "使い方ガイド", due: day(4), tasks: [{ id: id(22), name: "構成を作る", points: 3, doneAt: day(-3) }, { id: id(23), name: "説明を見直す", points: 5 }], stories: [] },
 { id: id(24), name: "次の記事", due: day(10), tasks: [{ id: id(25), name: "題材をまとめる", points: 3 }], stories: [] }
] };
const history = { id: id(30), name: "学習メモ", color: "#4ec9b0", events: [{ id: id(31), name: "これまでの作業", due: day(-1), tasks: [-35,-12,-10,-8,-5,-4,-2].map((offset,index) => ({ id: id(40+index), name: `完了した作業 ${index+1}`, points: [3,5,3,5,8,3,5][index], doneAt: day(offset) })), stories: [] }] };
await writeFile(join(sample, "manage.yaml"), 'settings:\n  workdays_off: [sat, sun]\n  public_holidays: true\nprojects:\n  - { file: projects/0001_Webサイト.yaml, load: true }\n  - { file: projects/0002_記事制作.yaml, load: true }\n  - { file: projects/0003_学習メモ.yaml, load: true }\n');
for (const [name,data] of [["0001_Webサイト.yaml",project],["0002_記事制作.yaml",writing],["0003_学習メモ.yaml",history]]) await writeFile(join(sample,"projects",name),stringify(data));
const root=await mkdtemp(join(tmpdir(),"glitchboard-readme-"));
await mkdir(join(root,"user/User"),{recursive:true}); await cp(sample,join(root,"glitchboard-demo"),{recursive:true});
const settings={"workbench.startupEditor":"none","workbench.colorTheme":"Default Dark Modern","workbench.secondarySideBar.defaultVisibility":"hidden","window.zoomLevel":0,"window.restoreWindows":"none","security.workspace.trust.enabled":false,"telemetry.telemetryLevel":"off","update.mode":"none","extensions.autoUpdate":false,"extensions.autoCheckUpdates":false};
const settingsPath=join(root,"user/User/settings.json"); await writeFile(settingsPath,JSON.stringify(settings));
let app;
const captures=[];
try {
 app=await _electron.launch({executablePath:process.env.VSCODE_EXECUTABLE ?? "/Applications/Visual Studio Code.app/Contents/MacOS/Code",args:[`--user-data-dir=${join(root,"user")}`,`--extensions-dir=${join(root,"extensions")}`,`--extensionDevelopmentPath=${resolve("packages/extension")}`,"--skip-welcome","--skip-release-notes","--disable-workspace-trust","--new-window",join(root,"glitchboard-demo")],timeout:30000});
 const page=await app.firstWindow(); page.setDefaultTimeout(15000); await page.waitForSelector(".monaco-workbench");
 await app.evaluate(({BrowserWindow})=>{BrowserWindow.getAllWindows()[0].setBounds({width:1320,height:860});});
 const command=async name=>{await page.keyboard.press("Meta+Shift+P");const input=page.locator(".quick-input-widget input");await input.fill(`>${name}`);await input.press("Enter");};
 const findFrame=async selector=>{let found;await expect.poll(async()=>{for(const frame of page.frames()){if(await frame.locator(selector).count()){found=frame;return true;}}return false;},{timeout:20000}).toBe(true);return found;};
 const capture=async(name,locator,height)=>{const box=await locator.boundingBox();assert.ok(box);const clip={x:Math.floor(box.x),y:Math.floor(box.y),width:Math.ceil(box.width),height:Math.ceil(height ?? box.height)};await page.screenshot({path:join(images,name+".png"),clip,scale:"css"});captures.push({name,clip,scale:"css",resized:false});};
 await command("GlitchBoardを開く");
 const setup=await findFrame(".manage-setup");await capture("setup",setup.locator(".manage-setup"));
 await writeFile(settingsPath,JSON.stringify({...settings,"glitchboard.manageFile":join(root,"glitchboard-demo/manage.yaml")}));
 await expect.poll(async()=>{for(const frame of page.frames())if(await frame.locator(".event-row").count())return true;return false;},{timeout:20000}).toBe(true);
 await command("GlitchBoardを開く");const board=await findFrame(".board-page");const events=await findFrame(".event-list");
 await events.locator(".event-row").filter({has:events.getByRole("button",{name:"サイト公開を選択",exact:true})}).locator(".event-row-select").click();
 await expect(board.getByRole("region",{name:"Event詳細"})).toContainText("サイト公開");
 // 正規のキーボード操作で上段の余白を減らし、Task の行を見せる。
 const separator=board.getByRole("separator",{name:"タイムラインと詳細の高さ",exact:true});for(let i=0;i<2;i++)await separator.press("ArrowUp");
 await page.keyboard.press("Escape");
 await board.getByRole("heading",{name:"GlitchBoard",exact:true}).click();
 const timelineBox=await board.locator(".timeline-panel").boundingBox(),chartBox=await board.locator(".required-chart").boundingBox();
 assert.ok(chartBox.y+chartBox.height<=timelineBox.y+timelineBox.height+1,"必要ペースを切らない");
 const tasksBox=await board.locator(".event-details").boundingBox(),lastTask=await board.locator(".task-line").last().boundingBox();
 assert.ok(lastTask.y+lastTask.height<=tasksBox.y+tasksBox.height+1,"完了行を切らない");
 const sidebarBox=await page.locator(".part.sidebar").boundingBox(),editorBox=await page.locator(".part.editor").boundingBox();assert.ok(sidebarBox&&editorBox);
 const overview={x:Math.floor(editorBox.x),y:Math.floor(editorBox.y),width:Math.floor(editorBox.width),height:Math.floor(editorBox.height)};
 await page.screenshot({path:join(images,"overview.png"),clip:overview,scale:"css"});captures.push({name:"overview",clip:overview,scale:"css",resized:false});
 await capture("tasks",board.locator(".event-details"));
 await board.getByRole("button",{name:"入力フォームを確認するの詳細",exact:true}).click();
 const detail=board.getByRole("dialog",{name:"詳細パネル",exact:true});await detail.getByRole("button",{name:"8pt",exact:true}).click();await expect(board.locator(".point-options")).toBeVisible();
 const panel=await detail.boundingBox(),menu=await board.locator(".point-options").boundingBox();await capture("task-points",detail,menu.y+menu.height-panel.y+16);
 await page.keyboard.press("Escape");await detail.getByRole("button",{name:"詳細を閉じる",exact:true}).click();
 await events.getByRole("button",{name:"Eventを追加",exact:true}).click();await events.getByRole("textbox",{name:"名前",exact:true}).fill("動作の最終確認");await events.getByRole("button",{name:"期限を選ぶ",exact:true}).click();
 const form=await events.locator(".inline-add-embedded form").boundingBox(),calendar=await events.getByRole("dialog",{name:"期限のカレンダー",exact:true}).boundingBox();
 const eventClip={x:Math.floor(Math.min(form.x,calendar.x)),y:Math.floor(form.y),width:Math.ceil(Math.max(form.x+form.width,calendar.x+calendar.width)-Math.min(form.x,calendar.x)),height:Math.ceil(calendar.y+calendar.height-form.y+8)};
 await page.screenshot({path:join(images,"event-add.png"),clip:eventClip,scale:"css"});captures.push({name:"event-add",clip:eventClip,scale:"css",resized:false});
 await page.keyboard.press("Escape");await page.keyboard.press("Escape");
 const appearance=await board.locator("body").evaluate(node=>({fontFamily:getComputedStyle(node).fontFamily,fontSize:getComputedStyle(node).fontSize,theme:document.body.dataset.vscodeThemeName,devicePixelRatio:window.devicePixelRatio}));
 assert.equal(appearance.fontSize,"13px");
 await expect(board.locator(".operation-error")).toHaveCount(0);
 await expect(events.locator(".operation-error")).toHaveCount(0);
 // README の5枚はダークに揃えたまま、実 VS Code の両テーマでも選択とフォーカスを確認する。
 const selectionArtifacts=resolve("artifacts/selection-surfaces");await mkdir(selectionArtifacts,{recursive:true});
 const native=[];
 for(const theme of ["Default Dark Modern","Default Light Modern"]){
  await writeFile(settingsPath,JSON.stringify({...settings,"workbench.colorTheme":theme,"glitchboard.manageFile":join(root,"glitchboard-demo/manage.yaml")}));
  await expect.poll(()=>board.locator("body").getAttribute("data-vscode-theme-name")).toBe(theme.replace("Default ",""));
  const selected=board.locator(".story-choice.selected"),unselected=board.locator(".story-choice:not(.selected)").first();
  const readStyle=locator=>locator.evaluate(node=>{const s=getComputedStyle(node);return {background:s.backgroundColor,outline:s.outlineStyle};});
  const story=await readStyle(selected);assert.equal(story.background,(await readStyle(unselected)).background);assert.equal(story.outline,"none");
  const summary=await readStyle(board.locator(".event-summary.selected")),event=await readStyle(events.locator(".event-row.selected")),task=await readStyle(board.locator(".task-line.selected"));
  for(const row of [summary,event,task])assert.equal(row.outline,"none");
  const taskName=board.getByRole("button",{name:"入力フォームを確認する",exact:true});await taskName.focus();await taskName.press("Tab");await page.keyboard.press("Shift+Tab");await expect(taskName).toBeFocused();
  const focus=await readStyle(taskName);assert.notEqual(focus.outline,"none");
  await page.screenshot({path:join(selectionArtifacts,`native-${theme.includes("Dark")?"dark":"light"}.png`),clip:overview,scale:"css"});
  native.push({theme,story,summary,event,task,keyboardFocus:focus});
 }
 await writeFile(join(selectionArtifacts,"native-results.json"),JSON.stringify({hostVersion:await app.evaluate(({app})=>app.getVersion()),source:"実 VS Code Extension Development Host",results:native},null,2)+"\n");
 await writeFile(join(artifacts,"capture-results.json"),JSON.stringify({capturedAt:new Date().toISOString(),sampleDate:today,source:"実 VS Code Extension Development Host",hostVersion:await app.evaluate(({app})=>app.getVersion()),sample:"examples/readme-guide/manage.yaml",sampleDateBasis:"撮影した Mac のローカル日付",theme:settings["workbench.colorTheme"],zoomLevel:0,appearance,captures,profileIsolated:true,userDataTouched:false,sampleContainsPrivateData:false},null,2)+"\n");
 console.log(JSON.stringify({appearance,captures},null,2));
} finally {if(app)await app.close();await rm(root,{recursive:true,force:true});}
