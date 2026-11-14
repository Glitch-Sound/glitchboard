import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, expect } from "@playwright/test";
import { build } from "vite";
import { parse } from "../packages/extension/node_modules/yaml/dist/index.js";
const artifacts=resolve("artifacts/ui-review");await mkdir(artifacts,{recursive:true});
const runtime=await mkdtemp(resolve(tmpdir(),"gb-ui-review-runtime-"));
await build({configFile:false,logLevel:"error",ssr:{noExternal:true},build:{ssr:resolve("packages/extension/src/session.ts"),outDir:runtime,rollupOptions:{output:{entryFileNames:"session.mjs"}}}});
const {BoardSession}=await import(pathToFileURL(resolve(runtime,"session.mjs")).href);
const browser=await chromium.launch({headless:true}),results=[];
const reviewCheck=process.env.REVIEW_CHECK ?? "all";
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
try {
for(const theme of ["dark","light"]){
 const root=await mkdtemp(resolve(tmpdir(),"gb-ui-review-")),errors=[],requests=[],pages=[],unsubs=[],captures=[],visuals={rows:{},title:[]};let failNext=false;
 const source={id:id(1),name:"個人プロジェクト",color:"#4c8dff",events:[
  {id:id(2),name:"小さなリリース",due:"2026-11-20",note:"リリース準備\n検証してから公開する",tasks:[{id:id(3),name:"画面の配色をそろえる",points:5},{id:id(4),name:"未見積の調査"},{id:id(5),name:"完了した作業",points:3,doneAt:"2026-11-13"},{id:id(6),name:"初回の完了",points:8,doneAt:"2026-10-01"}],stories:[{id:id(7),name:"まとめて進める作業",note:"任意のグループ",tasks:[{id:id(8),name:"補足のある作業",points:8,note:"操作を検証する"}]}]},
  {id:id(9),name:"期限を過ぎた確認",due:"2026-11-10",tasks:[{id:id(10),name:"確認待ち",points:2}],stories:[]},
  {id:id(11),name:"次の計画",due:"2026-11-25",tasks:[],stories:[]}
 ]};
 const file=resolve(root,"A.yaml"),manage=resolve(root,"manage.yaml");await writeFile(file,"# 表示検証のコメント\n"+JSON.stringify(source));
 await writeFile(manage,JSON.stringify({settings:{workdays_off:["sat","sun"],public_holidays:true},projects:[{file:"A.yaml",load:true}]}));
 const session=new BoardSession(manage);await session.reload();session.selectEvent(id(2),"A.yaml");
 let board;
 const dispatch=(page,data)=>page.evaluate(message=>window.dispatchEvent(new MessageEvent("message",{data:message})),data);
 const snap=()=>({type:"snapshot",payload:session.snapshot()});
 const css=`:root{--vscode-font-family:-apple-system,BlinkMacSystemFont,sans-serif;--vscode-font-size:13px;--vscode-foreground:${theme==="dark"?"#d4d4d4":"#333"};--vscode-editor-background:${theme==="dark"?"#181818":"#fff"};--vscode-sideBar-background:${theme==="dark"?"#202020":"#f3f3f3"};--vscode-input-background:${theme==="dark"?"#222":"#fff"};--vscode-panel-border:${theme==="dark"?"#454545":"#ccc"};--vscode-descriptionForeground:${theme==="dark"?"#a3a3a3":"#616161"};--vscode-focusBorder:#007fd4;--vscode-charts-blue:#4c8dff;--vscode-charts-red:#e35b5b;--vscode-charts-green:#3a995c;--vscode-charts-yellow:#e5c76b;--vscode-list-activeSelectionBackground:${theme==="dark"?"#264f78":"#cce5ff"};--vscode-list-activeSelectionForeground:${theme==="dark"?"#fff":"#111"};--vscode-list-hoverBackground:${theme==="dark"?"#292f38":"#eee"};--vscode-button-background:#0078d4;--vscode-button-foreground:#fff;--vscode-button-secondaryBackground:${theme==="dark"?"#313131":"#e5e5e5"};--vscode-button-secondaryForeground:${theme==="dark"?"#ccc":"#333"};--vscode-errorForeground:${theme==="dark"?"#f48771":"#c72e0f"}}`;
 async function open(surface){
  const page=await browser.newPage({viewport:{width:surface==="board"?1440:280,height:900}});pages.push(page);page.setDefaultTimeout(7000);await page.clock.install({time:new Date("2026-11-14T03:00:00Z")});page.on("pageerror",error=>errors.push(error.message));
  let ready=false;unsubs.push(session.subscribe(surface,()=>{if(ready)void dispatch(page,snap()).catch(error=>errors.push(error.message));}));
  await page.exposeFunction("extensionMessage",async message=>{
   requests.push({surface,...message});
   if(message.type==="ready"){ready=true;await dispatch(page,snap());return;}
   if(surface==="events"&&message.type==="selectEvent"){await dispatch(board,{type:"navigateRecord",payload:{kind:"event",id:message.eventId,projectFile:message.projectFile,openDetail:message.openDetail??false}});return;}
   if(message.type==="chooseManage"||message.type==="createManage"){await dispatch(page,{type:"operationResult",requestId:message.requestId,payload:{ok:true}});return;}
   const result=failNext&&message.type==="editItem"?(failNext=false,{ok:false,error:"検証用の保存失敗"}):await session.handleOperation(message);
   await dispatch(page,{type:"operationResult",requestId:message.requestId,payload:result});
  });
  await page.addInitScript(()=>{window.acquireVsCodeApi=()=>({getState:()=>JSON.parse(sessionStorage.getItem("layout")??"{}"),setState:value=>sessionStorage.setItem("layout",JSON.stringify(value)),postMessage:message=>{void window.extensionMessage(message);}});});
  await page.route("http://ui-review.test/**",async route=>{const name=new URL(route.request().url()).pathname.slice(1);if(!name)return route.fulfill({contentType:"text/html",body:`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>${css}</style></head><body><div id="root"></div><script type="module" src="/${surface}.js"></script></body></html>`});const asset=resolve("packages/extension/dist/webview",name);assert.ok(asset.startsWith(resolve("packages/extension/dist/webview")+"/"));return route.fulfill({contentType:name.endsWith("css")?"text/css":"text/javascript",body:await readFile(asset)});});
  await page.goto("http://ui-review.test/");return page;
 }
 const capture=async(page,name)=>{captures.push(name);return page.screenshot({path:resolve(artifacts,`${theme}-${name}.png`)});};
 try{
  board=await open("board");const sidebar=await open("events");await expect(board.getByRole("region",{name:"Event詳細"})).toContainText("小さなリリース");
  // REQ-019-S03 REQ-019-S04: 実際の幅、詳細ボタンの形、危険色を検証する。
  if(reviewCheck !== "title"){
   for(const width of [240,280]){
    await sidebar.setViewportSize({width,height:900});
    const dimensions=await sidebar.locator(".event-row").first().evaluate(row=>{
     const name=row.querySelector(".event-row-name").getBoundingClientRect(),select=row.querySelector(".event-row-select").getBoundingClientRect(),detail=row.querySelector(".detail-button").getBoundingClientRect();
     return {controlSize:parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--gb-control-size")),nameWidth:name.width,detailWidth:detail.width,detailHeight:detail.height,selectionRight:select.right,detailLeft:detail.left};
    });
    visuals.rows[width]=dimensions;
    assert.ok(dimensions.nameWidth > dimensions.detailWidth*2,JSON.stringify(dimensions));
    assert.ok(Math.abs(dimensions.detailWidth-dimensions.detailHeight)<1,JSON.stringify(dimensions));
    assert.ok(Math.abs(dimensions.detailWidth-dimensions.controlSize)<1,JSON.stringify(dimensions));
    assert.ok(dimensions.selectionRight<=dimensions.detailLeft+1,JSON.stringify(dimensions));
    assert.equal(await sidebar.locator(".event-group-overdue .event-row-name").first().evaluate(node=>getComputedStyle(node).color),theme==="dark"?"rgb(244, 135, 113)":"rgb(199, 46, 15)");
   }
  }
  // REQ-019-S04 REQ-021-S02: 余白、名前、詳細の領域は独立して1回ずつ作用する。
  const later=sidebar.locator(".event-row").filter({hasText:"次の計画"});
  let selections=requests.filter(request=>request.surface==="events"&&request.type==="selectEvent").length;
  await later.click({position:{x:2,y:2}});await expect(board.getByRole("region",{name:"Event詳細"})).toContainText("次の計画");
  assert.equal(requests.filter(request=>request.surface==="events"&&request.type==="selectEvent").length,++selections);
  await later.locator(".event-row-select").click();assert.equal(requests.filter(request=>request.surface==="events"&&request.type==="selectEvent").length,++selections);
  await later.getByRole("button",{name:"次の計画の詳細",exact:true}).click();await expect(board.locator(".detail-target")).toHaveText("EVENT : 次の計画");assert.equal(requests.filter(request=>request.surface==="events"&&request.type==="selectEvent").length,++selections);
  await board.getByRole("button",{name:"詳細を閉じる",exact:true}).click();await sidebar.locator(".event-row-select").filter({hasText:"小さなリリース"}).click();
  // REQ-042: 実追加、色のコード指定、無効値、保存失敗、取消と再読込。
  await board.getByRole("button",{name:"Projectを追加",exact:true}).click();await board.getByRole("textbox",{name:"名前",exact:true}).fill("コードで追加");
  let code=board.getByRole("textbox",{name:"カラーコード",exact:true});await code.fill("#ABC");await board.getByRole("button",{name:"追加",exact:true}).click();assert.equal(requests.filter(r=>r.type==="createProject").length,0);await expect(code).toHaveValue("#ABC");
  const widthSlider=board.getByRole("slider",{name:"Project列幅",exact:true});await widthSlider.fill(await widthSlider.getAttribute("min"));await expect(widthSlider).toHaveValue(await widthSlider.getAttribute("min"));await capture(board,"project-add-invalid");
  await code.fill(" #AaBbCc ");await code.press("Enter");await expect(board.getByRole("button",{name:"コードで追加の詳細",exact:true})).toBeVisible();
  const created=session.snapshot().projectEntries.find(entry=>entry.name==="コードで追加");assert.ok(created);assert.equal(parse(await readFile(resolve(root,created.file),"utf8")).color,"#aabbcc");
  await board.getByRole("slider",{name:"Project列幅",exact:true}).fill("260");
  await board.getByRole("button",{name:"個人プロジェクトの詳細",exact:true}).click();const detail=board.getByRole("dialog",{name:"詳細パネル",exact:true});code=detail.getByRole("textbox",{name:"カラーコード",exact:true});
  await code.fill(" #ABCDEF ");assert.equal(parse(await readFile(file,"utf8")).color,"#4c8dff");await code.press("Enter");await expect.poll(async()=>parse(await readFile(file,"utf8")).color).toBe("#abcdef");
  await expect(sidebar.locator(".event-project-marker i").first()).toHaveCSS("background-color","rgb(171, 205, 239)");
  await code.fill("#123");await detail.getByRole("button",{name:"色を保存",exact:true}).click();await expect(code).toHaveAttribute("aria-invalid","true");await capture(board,"project-color-invalid");
  // REQ-026-S04: 保存色を保ったままタイトルを背景から区別する。
  if(reviewCheck !== "rows"){
   for(const accent of ["#ffffff","#000000","#abcdef"]){
    const measured=await detail.evaluate((panel,accent)=>{
     const previous=panel.style.getPropertyValue("--detail-accent");panel.style.setProperty("--detail-accent",accent);
     const canvas=document.createElement("canvas"),context=canvas.getContext("2d");canvas.width=canvas.height=1;
     const rgb=value=>{context.clearRect(0,0,1,1);context.fillStyle=value;context.fillRect(0,0,1,1);return [...context.getImageData(0,0,1,1).data].slice(0,3);};
     const foreground=rgb(getComputedStyle(panel.querySelector(".detail-title")).color),background=rgb(getComputedStyle(panel).backgroundColor);
     panel.style.setProperty("--detail-accent",previous);
     const luminance=channels=>channels.map(value=>{const s=value/255;return s<=0.04045?s/12.92:((s+0.055)/1.055)**2.4;}).reduce((sum,value,index)=>sum+value*[0.2126,0.7152,0.0722][index],0);
     const first=luminance(foreground),second=luminance(background);return {foreground,background,contrast:(Math.max(first,second)+0.05)/(Math.min(first,second)+0.05)};
    },accent);
    visuals.title.push({accent,...measured});
    assert.ok(measured.contrast>=4.5,`${theme} ${accent}: ${JSON.stringify(measured)}`);
   }
  }

  await code.press("Escape");await expect(code).toHaveValue("#abcdef");
  await code.fill("#654321");failNext=true;await detail.getByRole("button",{name:"色を保存",exact:true}).click();await expect(board.getByRole("alert").first()).toContainText("失敗");await expect(code).toHaveValue("#654321");await capture(board,"color-save-error");
  await detail.getByRole("button",{name:"色を保存",exact:true}).click();await expect.poll(async()=>parse(await readFile(file,"utf8")).color).toBe("#654321");
  await detail.getByRole("button",{name:"編集",exact:true}).click();await detail.getByLabel("名前",{exact:true}).fill("個人プロジェクト 改訂");await code.fill("#4C8DFF");
  await board.getByRole("button",{name:"コードで追加の詳細",exact:true}).click();await expect(board.getByRole("alertdialog",{name:"未保存の編集"})).toBeVisible();await board.getByRole("button",{name:"キャンセル",exact:true}).click();await expect(code).toHaveValue("#4C8DFF");
  await board.getByRole("button",{name:"コードで追加の詳細",exact:true}).click();await board.getByRole("button",{name:"保存して進む",exact:true}).click();await expect.poll(async()=>parse(await readFile(file,"utf8")).color).toBe("#4c8dff");assert.equal(parse(await readFile(file,"utf8")).name,"個人プロジェクト 改訂");
  await board.reload();await board.getByRole("button",{name:"個人プロジェクト 改訂の詳細",exact:true}).click();await expect(detail.getByRole("textbox",{name:"カラーコード",exact:true})).toHaveValue("#4c8dff");await capture(board,"project-detail");
  // REQ-042-S07: 補足と同時保存した色を、成功後に未保存として残さない。
  await detail.getByRole("button",{name:"+ 補足を追加",exact:true}).click();await detail.getByLabel("補足",{exact:true}).fill("色と同時保存の確認");await detail.getByRole("textbox",{name:"カラーコード",exact:true}).fill(" #4C8DFF ");await detail.getByRole("button",{name:"補足を保存",exact:true}).click();await expect(detail.getByRole("textbox",{name:"カラーコード",exact:true})).toHaveValue("#4c8dff");await expect(detail.getByRole("button",{name:"色を保存",exact:true})).toHaveCount(0);

  // ここから全画面の観察用キャプチャと操作。
  await detail.getByRole("button",{name:"詳細を閉じる",exact:true}).click();await capture(board,"board");await capture(sidebar,"events");
  // REQ-020-S04: Escape、枠外終了と Project 全非読込の実操作。
  const filters=sidebar.getByRole("button",{name:"抽出条件",exact:true});await filters.click();await capture(sidebar,"filters");assert.notEqual(await sidebar.locator(".filter-popover").evaluate(node=>getComputedStyle(node).backgroundColor),"rgba(0, 0, 0, 0)","抽出条件の背景が透明");await sidebar.keyboard.press("Escape");await expect(filters).toHaveAttribute("aria-expanded","false");await expect(filters).toBeFocused();
  await filters.click();await sidebar.getByRole("button",{name:"すべて",exact:true}).click();await sidebar.getByRole("heading",{name:"EVENT",exact:true}).click();await expect(filters).toHaveAttribute("aria-expanded","false");await capture(sidebar,"all-events");
  await filters.click();await sidebar.getByRole("button",{name:"未完了 + 今後",exact:true}).click();
  const toggleProject=async(name,checked)=>{const checkbox=sidebar.getByRole("checkbox",{name,exact:true});await checkbox.click();await expect(checkbox).toBeChecked({checked});};
  await toggleProject("個人プロジェクト 改訂",false);await toggleProject("コードで追加",false);
  await expect(board.getByRole("heading",{name:"Project の読み込みを選びましょう",exact:true})).toBeVisible();await capture(board,"unloaded-board");await filters.click();await capture(sidebar,"unloaded-events");
  await filters.click();await toggleProject("個人プロジェクト 改訂",true);await toggleProject("コードで追加",true);await sidebar.keyboard.press("Escape");await sidebar.locator(".event-row-select").filter({hasText:"小さなリリース"}).click();

  await sidebar.getByRole("button",{name:"小さなリリースの詳細",exact:true}).click();await capture(board,"event-detail");
  await detail.getByRole("button",{name:"編集",exact:true}).click();await detail.getByLabel("名前",{exact:true}).fill("取消する名前");
  await detail.locator(".date-picker-trigger").click();await capture(board,"event-edit-calendar");await board.keyboard.press("Escape");await capture(board,"event-edit");
  await detail.getByRole("button",{name:"取消",exact:true}).click();await detail.getByRole("button",{name:"詳細を閉じる",exact:true}).click();
  await board.getByRole("button",{name:"まとめて進める作業の詳細",exact:true}).click();await capture(board,"story-detail");await detail.getByRole("button",{name:"詳細を閉じる",exact:true}).click();
  await board.getByRole("button",{name:"補足のある作業の詳細",exact:true}).click();await capture(board,"task-detail");await detail.getByRole("button",{name:"8pt",exact:true}).click();await capture(board,"task-points");await board.keyboard.press("Escape");await detail.getByRole("button",{name:"編集",exact:true}).click();await capture(board,"task-edit");await detail.getByRole("button",{name:"取消",exact:true}).click();await detail.getByRole("button",{name:"削除",exact:true}).click();await capture(board,"delete-confirm");await board.getByRole("button",{name:"キャンセル",exact:true}).click();await detail.getByRole("button",{name:"詳細を閉じる",exact:true}).click();
  await sidebar.getByRole("button",{name:"Eventを追加",exact:true}).click();await capture(sidebar,"event-add");await sidebar.getByRole("textbox",{name:"名前",exact:true}).fill("取消する");await sidebar.keyboard.press("Escape");
  const empty={...session.snapshot(),projects:[],selectedEventId:null,selectedProjectFile:null,projectEntries:[]};await dispatch(board,{type:"snapshot",payload:empty});await dispatch(sidebar,{type:"snapshot",payload:empty});await capture(board,"empty-board");await capture(sidebar,"empty-events");
  // REQ-043-S03 REQ-043-S04: Event 自体がない状態と抽出だけの0件を分ける。
  const emptyProject=session.snapshot().projects.find(project=>project.name==="コードで追加");
  const noEvents={...empty,projects:[emptyProject],projectEntries:[created]};await dispatch(board,{type:"snapshot",payload:noEvents});await dispatch(sidebar,{type:"snapshot",payload:noEvents});
  await expect(board.getByRole("heading",{name:"Event を追加しましょう",exact:true})).toBeVisible();await expect(sidebar.getByRole("heading",{name:"表示できる Event がありません",exact:true})).toBeVisible();await capture(board,"event-empty-board");await capture(sidebar,"event-empty-events");
  const completeProject={...session.snapshot().projects[0],events:[{...source.events[0],id:id(20),name:"完了済み Event",tasks:source.events[0].tasks.filter(task=>task.doneAt),stories:[]}]};
  await dispatch(sidebar,{type:"snapshot",payload:{...empty,projects:[completeProject],projectEntries:[session.snapshot().projectEntries[0]]}});await expect(sidebar.getByRole("heading",{name:"表示できる Event がありません",exact:true})).toBeVisible();await capture(sidebar,"filtered-empty-events");
  await dispatch(sidebar,{type:"unconfigured"});await capture(sidebar,"setup");await sidebar.getByRole("button",{name:"manage.yamlを選ぶ",exact:true}).click();await sidebar.getByRole("button",{name:"新しく作る",exact:true}).click();
  await dispatch(sidebar,{type:"snapshot",payload:{...empty,manageAvailability:{status:"missing",path:"/検証用/manage.yaml"},error:"管理ファイルが見つからない"}});await capture(sidebar,"missing");
  await dispatch(board,snap());await dispatch(sidebar,snap());const valid=await readFile(file,"utf8");await writeFile(file,"broken: [");await session.reload();await expect(board.getByRole("alert").first()).toBeVisible();// REQ-014-S03: 長いパスも本文を失わず、実際の幅へ収める。
  const longError=`/${"長いパスの検証".repeat(20)}/A.yaml: ${session.snapshot().error}`;
  await dispatch(board,{type:"snapshot",payload:{...session.snapshot(),error:longError}});await dispatch(sidebar,{type:"snapshot",payload:{...session.snapshot(),error:longError}});
  for(const page of pages){const notice=page.locator(".operation-error");await expect(notice).toHaveText(longError);assert.equal(await notice.locator('svg[aria-hidden="true"]').count(),1);assert.ok(await notice.locator("span").evaluate(node=>node.scrollWidth<=node.clientWidth+1));}
  await capture(board,"yaml-error");await capture(sidebar,"yaml-error-events");await writeFile(file,valid);await session.reload();
  for(const page of pages){assert.equal(await page.locator("button button").count(),0);const unnamed=await page.locator("button").evaluateAll(buttons=>buttons.filter(button=>!button.textContent.trim()&&!button.getAttribute("aria-label")&&!button.getAttribute("title")).map(button=>button.outerHTML));assert.deepEqual(unnamed,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),"ページ全体の横はみ出し");}
  assert.deepEqual(errors,[]);assert.ok((await readFile(file,"utf8")).includes("表示検証のコメント"));
  results.push({theme,reviewCheck,visuals,passed:true,hexCreateEditReload:true,invalidCancelFailure:true,combinedDirtyGuard:true,sidebarColorSynced:true,screenshots:captures.length,captures,unnamedButtons:0,nestedButtons:0,pageOverflow:false,errors});console.log(`${theme}: hex input, persistence and whole UI walkthrough passed`);
 }finally{unsubs.forEach(unsubscribe=>unsubscribe());await Promise.all(pages.map(page=>page.close()));await rm(root,{recursive:true,force:true});}
}
await writeFile(resolve(artifacts,"browser-results.json"),JSON.stringify({verifiedAt:new Date().toISOString(),browser:browser.version(),results},null,2)+"\n");
}finally{await browser.close();await rm(runtime,{recursive:true,force:true});}
