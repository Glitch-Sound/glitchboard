import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { _electron, expect } from "@playwright/test";
import { timelineDimensions } from "../packages/webview/src/widgets/timeline/model/dimensions.ts";

const root=await mkdtemp(join(tmpdir(),"gb-native-cell-resize-"));
const artifacts=resolve(process.env.GLITCHBOARD_NATIVE_ARTIFACTS??"artifacts/project-cell-resize");await mkdir(artifacts,{recursive:true});
await cp("examples/readme-guide",join(root,"demo"),{recursive:true});
await mkdir(join(root,"user/User"),{recursive:true});
const settingsPath=join(root,"user/User/settings.json");
const settings={"workbench.startupEditor":"none","workbench.colorTheme":"Default Dark Modern","workbench.secondarySideBar.defaultVisibility":"hidden","window.zoomLevel":0,"window.restoreWindows":"none","update.mode":"none","extensions.autoUpdate":false,"extensions.autoCheckUpdates":false,"glitchboard.manageFile":join(root,"demo/manage.yaml")};
await writeFile(settingsPath,JSON.stringify(settings));
const files=["manage.yaml","projects/0001_Webサイト.yaml","projects/0002_記事制作.yaml","projects/0003_学習メモ.yaml"];
const originals=await Promise.all(files.map(async file=>({file,bytes:await readFile(join(root,"demo",file)),mtime:(await stat(join(root,"demo",file),{bigint:true})).mtimeNs})));
let app;const results=[];
try{
 app=await _electron.launch({executablePath:process.env.VSCODE_EXECUTABLE??"/Applications/Visual Studio Code.app/Contents/MacOS/Code",args:[`--user-data-dir=${join(root,"user")}`,`--extensions-dir=${join(root,"extensions")}`,`--extensionDevelopmentPath=${resolve("packages/extension")}`,"--locale=en","--skip-welcome","--skip-release-notes","--new-window"],timeout:30000});
 const page=await app.firstWindow();page.setDefaultTimeout(12000);await page.waitForSelector(".monaco-workbench");
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1320,height:860}));
 const command=async name=>{await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].focus());await page.bringToFront();await page.keyboard.press("F1");const input=page.locator(".quick-input-widget input");await input.fill(`>${name}`);await expect(page.locator(".quick-input-list").getByText(name,{exact:true}).first()).toBeVisible();await input.press("Enter");};
 const board=async()=>{let found;await expect.poll(async()=>{for(const frame of page.frames()){if(frame.isDetached())continue;try{if(await frame.locator(".project-row").count()){found=frame;return true;}}catch(error){if(!frame.isDetached())throw error;}}return false;},{timeout:20000}).toBe(true);return found;};
 await command("GlitchBoardを開く");
 for(const theme of ["Default Dark Modern","Default Light Modern"]){
  await writeFile(settingsPath,JSON.stringify({...settings,"workbench.colorTheme":theme}));
  let frame=await board();await expect.poll(()=>frame.locator("body").getAttribute("data-vscode-theme-name")).toBe(theme.replace("Default ",""));
  let width=frame.getByRole("separator",{name:"Project列幅",exact:true});
  let height=frame.locator(".project-row .timeline-cell-resize-height hr").first();
  await width.press("Home");await height.press("Home");
  const selectionBefore=await frame.getByRole("region",{name:"Event詳細"}).textContent();
  // REQ-040-S08/S09: 実 VS Code の Webview 内で両軸をドラッグする。
  const widthHandle=frame.locator(".project-row .timeline-cell-resize-width hr").first(),w=await widthHandle.boundingBox();
  await page.mouse.move(w.x+w.width/2,w.y+w.height/2);await page.mouse.down();await page.mouse.move(w.x+w.width/2+84,w.y+w.height/2,{steps:12});await page.mouse.up();
  const expectedWidth=timelineDimensions.width.initial+84;
  await expect(width).toHaveAttribute("aria-valuenow",String(expectedWidth));
  const h=await height.boundingBox();await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2,h.y+h.height/2+12,{steps:12});await page.mouse.up();
  const expectedHeight=timelineDimensions.height.initial+12;await expect(height).toHaveAttribute("aria-valuenow",String(expectedHeight));
  assert.ok((await frame.locator(".project-row").evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().height))).every(value=>Math.abs(value-expectedHeight)<1));
  assert.equal(await frame.getByRole("region",{name:"Event詳細"}).textContent(),selectionBefore);
  assert.equal(await frame.getByRole("slider",{name:"Project列幅",exact:true}).count(),0);
  assert.equal(await frame.getByRole("slider",{name:"Project行高",exact:true}).count(),0);
  // REQ-040-S11: 焦点と取消、表示設定保存の実接続。
  await width.press("ArrowRight");await width.press("Escape");await expect(width).toHaveAttribute("aria-valuenow",String(expectedWidth));
  await height.focus();await page.screenshot({path:join(artifacts,`native-${theme.includes("Dark")?"dark":"light"}.png`),scale:"css"});
  // REQ-040-S01: タブの破棄と拡張再起動のどちらも globalState から復元する。
  await command("View: Close Editor");await command("GlitchBoardを開く");frame=await board();
  await expect(frame.getByRole("separator",{name:"Project列幅",exact:true})).toHaveAttribute("aria-valuenow",String(expectedWidth));
  await expect(frame.locator(".project-row .timeline-cell-resize-height hr").first()).toHaveAttribute("aria-valuenow",String(expectedHeight));
  await Promise.all([page.waitForEvent("framenavigated",{predicate:frame=>frame===page.mainFrame(),timeout:20000}),command("Developer: Reload Window")]);await page.waitForLoadState("domcontentloaded");await page.waitForSelector(".monaco-workbench");await command("GlitchBoardを開く");frame=await board();
  await expect(frame.getByRole("separator",{name:"Project列幅",exact:true})).toHaveAttribute("aria-valuenow",String(expectedWidth));
  await expect(frame.locator(".project-row .timeline-cell-resize-height hr").first()).toHaveAttribute("aria-valuenow",String(expectedHeight));
  // REQ-044-S01/S03: 実 VS Code で複数行を縦スクロールして日付とフォーカスを確認する。
  const rowHeight=frame.locator(".project-row .timeline-cell-resize-height hr").first();await rowHeight.press("End");
  await frame.locator(".timeline-panel").evaluate(node=>node.scrollTop=300);
  await expect.poll(()=>frame.evaluate(()=>{const p=document.querySelector(".timeline-panel"),h=document.querySelector(".timeline-heading th");return Math.abs(p.getBoundingClientRect().top-h.getBoundingClientRect().top);})).toBeLessThan(2);
  const scroll=await frame.locator(".timeline-panel").evaluate(node=>node.scrollTop);assert.ok(scroll>0);
  // REQ-046-S01/S02: 実画面のグラフが縦位置によらず下端へ留まる。
  for(const y of [0,300,99999]){await frame.locator(".timeline-panel").evaluate((node,y)=>node.scrollTop=y,y);await expect.poll(()=>frame.evaluate(()=>{const p=document.querySelector(".timeline-panel").getBoundingClientRect(),f=document.querySelector(".pace-row").getBoundingClientRect();return Math.abs(p.bottom-f.bottom);})).toBeLessThan(2);}

  await page.screenshot({path:resolve(process.env.GLITCHBOARD_NATIVE_HEADER_ARTIFACTS??"artifacts/timeline-header",`native-${theme.includes("Dark")?"dark":"light"}.png`),scale:"css"});
  await rowHeight.press("Escape");
  // REQ-031-S07 REQ-046-S03: 最小上部でも見出しとグラフの間で行の詳細を操作する。
  const split=frame.getByRole("separator",{name:"タイムラインと詳細の高さ",exact:true});for(let i=0;i<20;i++)await split.press("ArrowUp");
  const detail=frame.locator(".project-row").last().locator(".project-actions .detail-button");await detail.focus();
  const geometry=await frame.evaluate(()=>{const a=document.activeElement.getBoundingClientRect(),h=document.querySelector(".timeline-heading th").getBoundingClientRect(),f=document.querySelector(".pace-row").getBoundingClientRect();return {top:a.top,bottom:a.bottom,head:h.bottom,foot:f.top};});assert.ok(geometry.top>=geometry.head-1&&geometry.bottom<=geometry.foot+1,JSON.stringify(geometry));
  await detail.press("Enter");await expect(frame.getByRole("dialog",{name:"詳細パネル",exact:true})).toBeVisible();await frame.getByRole("button",{name:"詳細を閉じる",exact:true}).click();await split.press("Home");

  await expect(frame.locator(".operation-error")).toHaveCount(0);
  results.push({theme,source:"実 VS Code Extension Development Host",width:expectedWidth,height:expectedHeight,tabReopen:true,extensionRestart:true,stickyHeader:true,fixedFooter:true,minimumOperations:true,chartHeight:await frame.locator(".required-chart").evaluate(n=>n.getBoundingClientRect().height),footerHeight:await frame.locator(".pace-row").evaluate(n=>n.getBoundingClientRect().height),labelAppearance:await frame.locator(".chart-max").evaluate(n=>{const s=getComputedStyle(n);return {text:n.textContent,background:s.backgroundColor,border:s.borderWidth,color:s.color};}),passed:true});
 }
 for(const original of originals){assert.deepEqual(await readFile(join(root,"demo",original.file)),original.bytes);assert.equal((await stat(join(root,"demo",original.file),{bigint:true})).mtimeNs,original.mtime);}
 const hostVersion=await app.evaluate(({app})=>app.getVersion());
 await writeFile(join(artifacts,"native-results.json"),JSON.stringify({hostVersion,isolatedProfile:true,userDataTouched:false,yamlUnchanged:true,results},null,2)+"\n");
 console.log(JSON.stringify({hostVersion,results,yamlUnchanged:true}));
}finally{if(app)await app.close();await rm(root,{recursive:true,force:true});}
