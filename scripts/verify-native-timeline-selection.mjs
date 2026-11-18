import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { _electron, expect } from "@playwright/test";
import { parse } from "../packages/extension/node_modules/yaml/dist/index.js";
const root=await mkdtemp(join(tmpdir(),"gb-native-timeline-")),artifacts=resolve("artifacts/timeline-selection");await mkdir(artifacts,{recursive:true});await mkdir(join(root,"user/User"),{recursive:true});
const today=new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Tokyo"});const day=n=>{const d=new Date(`${today}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const sample={id:id(1),name:"Sample Project",color:"#4c8dff",events:[{id:id(2),name:"Single Event",due:day(1),stories:[],tasks:[{id:id(3),name:"Original Task",points:3}]},{id:id(4),name:"Pair A",due:day(2),stories:[],tasks:[]},{id:id(5),name:"Pair B",due:day(2),stories:[],tasks:[]}]};
const file=join(root,"project.yaml"),manage=join(root,"manage.yaml"),manageSource="settings: {workdays_off: [], public_holidays: false}\nprojects: [{file: project.yaml, load: true}]\n";await writeFile(file,JSON.stringify(sample));await writeFile(manage,manageSource);
const settingsPath=join(root,"user/User/settings.json"),settings={"workbench.startupEditor":"none","workbench.colorTheme":"Default Dark Modern","workbench.secondarySideBar.defaultVisibility":"hidden","window.zoomLevel":0,"window.restoreWindows":"none","update.mode":"none","extensions.autoUpdate":false,"extensions.autoCheckUpdates":false,"glitchboard.manageFile":manage};await writeFile(settingsPath,JSON.stringify(settings));let app;const results=[];
try{
 app=await _electron.launch({executablePath:process.env.VSCODE_EXECUTABLE??"/Applications/Visual Studio Code.app/Contents/MacOS/Code",args:[`--user-data-dir=${join(root,"user")}`,`--extensions-dir=${join(root,"extensions")}`,`--extensionDevelopmentPath=${resolve("packages/extension")}`,"--locale=en","--skip-welcome","--skip-release-notes","--new-window"],timeout:30000});const page=await app.firstWindow();page.setDefaultTimeout(12000);await page.waitForSelector(".monaco-workbench");
 const bounds=width=>app.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows()[0].setBounds({width,height:900}),width);
 const command=async name=>{await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].focus());await page.bringToFront();await page.keyboard.press("F1");const input=page.locator(".quick-input-widget input");await input.fill(`>${name}`);await expect(page.locator(".quick-input-list").getByText(name,{exact:true}).first()).toBeVisible();await input.press("Enter");};
 const find=async selector=>{let result;await expect.poll(async()=>{for(const f of page.frames()){if(f.isDetached())continue;try{if(await f.locator(selector).count()){result=f;return true;}}catch(error){if(!f.isDetached())throw error;}}return false;},{timeout:20000}).toBe(true);return result;};
 await bounds(1320);await command("GlitchBoardを開く");const frame=await find(".board-page"),events=await find(".events-page");
 for(const theme of ["Default Dark Modern","Default Light Modern"]){
  const suffix=theme.includes("Dark")?"dark":"light";await writeFile(settingsPath,JSON.stringify({...settings,"workbench.colorTheme":theme}));await writeFile(file,JSON.stringify(sample));await expect.poll(()=>frame.locator("body").getAttribute("data-vscode-theme-name")).toBe(theme.replace("Default ",""));
  await bounds(1320);await events.locator(".event-row").filter({hasText:"Single Event"}).locator(".event-row-select").click();
  // REQ-016-S06: 全表示期間のホバーとキーボード。日付セルには補助詳細を残さない。
  for(const period of ["3日","1週間","月"]){
    await frame.getByRole("button",{name:period,exact:true}).click();const marker=frame.locator(".timeline").getByRole("button",{name:"Single Event",exact:true});await marker.hover();await marker.focus();await marker.press("Enter");
    await expect(frame.locator(".timeline td .detail-button")).toHaveCount(0);await expect(frame.getByRole("dialog",{name:"詳細パネル",exact:true})).toHaveCount(0);
    const multi=frame.getByRole("button",{name:"2件のEvent",exact:true});await multi.focus();await multi.press("Enter");await expect(frame.getByRole("listbox").locator(".detail-button")).toHaveCount(0);const option=frame.getByRole("option",{name:"Pair B",exact:true});await option.focus();await option.press("Enter");await expect(frame.getByRole("region",{name:"Event詳細",exact:true})).toContainText("Pair B");
  }
  await bounds(1040);await frame.locator(".timeline").getByRole("button",{name:"Single Event",exact:true}).focus();await page.screenshot({path:join(artifacts,`${suffix}-month.png`),scale:"css"});await bounds(1320);
  // REQ-035-S01/S03: 残る Project と左 Event の詳細は同じパネルを開く。
  await frame.getByRole("button",{name:"1週間",exact:true}).click();await frame.getByRole("button",{name:"Sample Projectの詳細",exact:true}).click();await expect(frame.locator(".detail-target")).toHaveText("PROJECT : Sample Project");await frame.getByRole("button",{name:"詳細を閉じる",exact:true}).click();
  await events.getByRole("button",{name:"Single Eventの詳細",exact:true}).click();await expect(frame.locator(".detail-target")).toHaveText("EVENT : Single Event");await frame.getByRole("button",{name:"詳細を閉じる",exact:true}).click();
  await frame.getByRole("button",{name:"Original Taskの詳細",exact:true}).click();const panel=frame.getByRole("dialog",{name:"詳細パネル",exact:true});await panel.getByRole("button",{name:"編集",exact:true}).click();await panel.getByRole("textbox",{name:"名前",exact:true}).fill("Saved Task");
  const choosePair=async()=>{await frame.getByRole("button",{name:"2件のEvent",exact:true}).click();await frame.getByRole("option",{name:"Pair B",exact:true}).click();};await choosePair();await frame.getByRole("button",{name:"キャンセル",exact:true}).click();await expect(panel.getByRole("textbox",{name:"名前",exact:true})).toHaveValue("Saved Task");await expect(panel.locator(".detail-target")).toHaveText("TASK : Original Task");
  await choosePair();await frame.getByRole("button",{name:"保存して進む",exact:true}).click();await expect(panel.locator(".detail-target")).toHaveText("EVENT : Pair B");assert.deepEqual(parse(await readFile(file,"utf8")),{...sample,events:sample.events.map((e,i)=>i?e:{...e,tasks:[{...e.tasks[0],name:"Saved Task"}]})});
  await panel.getByRole("button",{name:"詳細を閉じる",exact:true}).click();await frame.getByRole("button",{name:"1週間",exact:true}).click();await page.screenshot({path:join(artifacts,`${suffix}-week.png`),scale:"css"});await expect(frame.locator(".operation-error")).toHaveCount(0);assert.equal(await readFile(manage,"utf8"),manageSource);results.push({theme,periods:3,dateDetailButtons:0,keyboardSelection:true,projectDetailPreserved:true,sidebarDetailPreserved:true,cancelPreservesDraft:true,saveOriginalTarget:true,passed:true});
 }
 const hostVersion=await app.evaluate(({app})=>app.getVersion());await writeFile(join(artifacts,"native-results.json"),JSON.stringify({hostVersion,isolatedProfile:true,userDataTouched:false,results},null,2)+"\n");console.log(JSON.stringify({hostVersion,results}));
}finally{if(app)await app.close();await rm(root,{recursive:true,force:true});}
