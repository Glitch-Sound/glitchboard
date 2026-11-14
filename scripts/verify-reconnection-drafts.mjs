import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, expect } from "@playwright/test";
import { build } from "vite";
import { parse } from "../packages/extension/node_modules/yaml/dist/index.js";
const runtime = await mkdtemp(resolve(tmpdir(), "gb-reconnect-runtime-"));
await build({ configFile: false, logLevel: "error", ssr: { noExternal: true }, build: { ssr: resolve("packages/extension/src/session.ts"), outDir: runtime, rollupOptions: { output: { entryFileNames: "session.mjs" } } } });
const { BoardSession } = await import(pathToFileURL(resolve(runtime, "session.mjs")).href);
const browser = await chromium.launch({ headless: true });
const results = [];
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
try {
  for (const theme of ["dark", "light"]) {
    const root = await mkdtemp(resolve(tmpdir(), "gb-reconnect-ui-"));
    const manage = "settings: {workdays_off: [], public_holidays: false}\nprojects: [{file: A.yaml, load: true}]\n";
    const sessions = [];
    for (const name of ["Alpha", "Beta"]) {
      const directory = resolve(root, name); await mkdir(directory);
      await writeFile(resolve(directory, "manage.yaml"), manage);
      await writeFile(resolve(directory, "A.yaml"), JSON.stringify({id: id(1), name, color: "#123456", events: [1, 2].map(n => ({id: id(n+1), name: `${name} Event ${n}`, due: "2099-01-01", tasks: [], stories: [1,2].map(k=>({id:id(n*10+k),name:`Story ${k}`,tasks:[]}))}))}));
      const session = new BoardSession(resolve(directory, "manage.yaml")); await session.reload(); sessions.push(session);
    }
    let active=sessions[0], connected=true, ready=false, requestId=0, pending;
    const page = await browser.newPage({viewport:{width:1440,height:900}}), errors=[], requests=[];
    const dispatch = data => page.evaluate(message=>window.dispatchEvent(new MessageEvent("message",{data:message})),data);
    const snapshot = session => ({type:"snapshot",payload:{...session.snapshot(),connectionId:session.managePath}});
    const unsubs = sessions.map(session=>session.subscribe("board",()=>{if(ready&&active===session)void dispatch(snapshot(session));}));
    const beginChange = async target => {
      const response = new Promise(done=>{pending={id:++requestId,done,target};});
      await dispatch({type:"prepareConnectionChange",requestId});
      return response;
    };
    try {
      page.on("pageerror",error=>errors.push(error.message));
      await page.exposeFunction("extensionMessage",async message=>{
        requests.push(message);
        if(message.type==="ready"){ready=true;await dispatch(snapshot(active));return;}
        if(message.type==="connectionChangeResult"){
          if(pending?.id===message.requestId){
            const current=pending;pending=undefined;
            if(message.ok){active=current.target;connected=true;await dispatch(snapshot(active));}
            await dispatch({type:"connectionChangeSettled",requestId:current.id});
            current.done(message.ok);
          }
          return;
        }
        const result=(!connected&&!pending)?{ok:false,error:"manage.yamlが未設定"}:await active.handleOperation(message);
        await dispatch({type:"operationResult",requestId:message.requestId,payload:result});
      });
      await page.addInitScript(()=>{window.acquireVsCodeApi=()=>({getState:()=>JSON.parse(sessionStorage.getItem("layout")??"{}"),setState:value=>sessionStorage.setItem("layout",JSON.stringify(value)),postMessage:message=>{void window.extensionMessage(message);}});});
      const css=`:root{--vscode-font-family:sans-serif;--vscode-foreground:${theme==="dark"?"#ddd":"#222"};--vscode-editor-background:${theme==="dark"?"#181818":"#fff"};--vscode-sideBar-background:${theme==="dark"?"#222":"#eee"};--vscode-panel-border:#777;--vscode-descriptionForeground:#888;--vscode-focusBorder:#007fd4;--vscode-charts-blue:#4c8dff;--vscode-button-background:#0078d4;--vscode-button-foreground:#fff}`;
      await page.route("http://reconnect.test/**",async route=>{
        const name=new URL(route.request().url()).pathname.slice(1);
        if(!name)return route.fulfill({contentType:"text/html",body:`<!doctype html><html lang="ja"><head><meta charset="utf-8"><link rel="stylesheet" href="/style.css"><style>${css}</style></head><body><div id="root"></div><script type="module" src="/board.js"></script></body></html>`});
        const file=resolve("packages/extension/dist/webview",name);assert.ok(file.startsWith(resolve("packages/extension/dist/webview")+"/"));
        await route.fulfill({contentType:name.endsWith("css")?"text/css":"text/javascript",body:await readFile(file)});
      });
      await page.goto("http://reconnect.test/");
      await expect(page.getByRole("region",{name:"Event詳細"})).toContainText("Alpha Event 1");
      await dispatch({type:"navigateRecord",payload:{kind:"event",id:id(3),projectFile:"A.yaml",connectionId:active.managePath,openDetail:false}});
      await expect(page.getByRole("region",{name:"Event詳細"})).toContainText("Alpha Event 2");
      await expect.poll(()=>active.snapshot().selectedEventId).toBe(id(3));
      await page.locator(".story-select").filter({hasText:"Story 2"}).click();
      await page.getByRole("button",{name:"Taskを追加",exact:true}).click();
      const taskInput=page.getByRole("region",{name:"Task一覧"}).getByRole("textbox",{name:"名前",exact:true});
      await taskInput.fill("Reconnect task");
      await page.getByRole("button",{name:"Story 2の詳細",exact:true}).click();
      const detail=page.getByRole("dialog",{name:"詳細パネル",exact:true});
      await detail.getByRole("button",{name:"編集",exact:true}).click();
      await detail.getByLabel("名前",{exact:true}).fill("Reconnect story");
      connected=false;await dispatch({type:"unconfigured"});
      for(let count=0;count<2;count++){
        await active.reload();connected=true;await dispatch(snapshot(active));
        await expect(taskInput).toHaveValue("Reconnect task");await expect(detail.getByLabel("名前",{exact:true})).toHaveValue("Reconnect story");
        assert.equal(active.snapshot().selectedEventId,id(3));
        connected=false;await dispatch({type:"unconfigured"});
      }
      // 詳細確認の取消は Task の入力にも影響しない。
      let change=beginChange(sessions[1]);
      const editPrompt=page.getByRole("alertdialog",{name:"未保存の編集",exact:true});
      await expect(editPrompt.getByRole("button",{name:"キャンセル",exact:true})).toBeFocused();
      await page.keyboard.press("Escape");assert.equal(await change,false);
      await expect(taskInput).toHaveValue("Reconnect task");await expect(detail.getByLabel("名前",{exact:true})).toHaveValue("Reconnect story");
      // 元のファイルへの詳細保存後、Task 保存だけを欠落で失敗させる。
      change=beginChange(sessions[1]);
      await editPrompt.getByRole("button",{name:"保存して進む",exact:true}).click();
      const inlinePrompt=page.getByRole("alertdialog",{name:"未保存の追加入力",exact:true});await expect(inlinePrompt).toBeVisible();
      await rm(active.managePath);
      await inlinePrompt.getByRole("button",{name:"追加して進む",exact:true}).click();
      await expect(inlinePrompt.getByRole("alert")).toContainText("失敗");await expect(taskInput).toHaveValue("Reconnect task");
      assert.equal(active,sessions[0]);
      await writeFile(active.managePath,manage);
      await inlinePrompt.getByRole("button",{name:"追加して進む",exact:true}).click();assert.equal(await change,true);
      await expect(page.getByRole("region",{name:"Event詳細"})).toContainText("Beta Event 1");
      const source=parse(await readFile(resolve(root,"Alpha/A.yaml"),"utf8")),target=parse(await readFile(resolve(root,"Beta/A.yaml"),"utf8"));
      assert.equal(source.events[1].stories[1].name,"Reconnect story");assert.deepEqual(source.events[1].stories[1].tasks.map(task=>task.name),["Reconnect task"]);assert.deepEqual(target.events[1].stories[1].tasks,[]);
      // 新しい Project 確認のフォーカス、Tab循環、Escapeと破棄を確認する。
      await page.getByRole("button",{name:"Projectを追加",exact:true}).click();
      const projectInput=page.getByRole("textbox",{name:"名前",exact:true});await projectInput.fill("Project draft");
      change=beginChange(sessions[0]);const projectPrompt=page.getByRole("alertdialog",{name:"未保存の Project 追加",exact:true});
      await expect(projectPrompt.getByRole("button",{name:"キャンセル",exact:true})).toBeFocused();await page.keyboard.press("Tab");await expect(projectPrompt.getByRole("button",{name:"追加して進む",exact:true})).toBeFocused();
      await page.keyboard.press("Escape");assert.equal(await change,false);await expect(projectInput).toHaveValue("Project draft");
      change=beginChange(sessions[0]);await projectPrompt.getByRole("button",{name:"破棄して進む",exact:true}).click();assert.equal(await change,true);
      // 別接続の欠落で残る古い表示は inert とし、復元後だけ入力を再開する。
      await rm(sessions[1].managePath);await sessions[1].reload();
      change=beginChange(sessions[1]);assert.equal(await change,true);
      await expect(page.locator(".board-interaction")).toHaveAttribute("inert", "");
      await expect(page.getByRole("status",{name:"管理ファイルの接続状態"})).toContainText("前の接続の表示は読み取り専用です。");
      await assert.rejects(page.locator('button[aria-label="Taskを追加"]').click({timeout:300}),/Timeout/);
      await writeFile(sessions[1].managePath,manage);await sessions[1].reload();
      await expect(page.getByRole("region",{name:"Event詳細"})).toContainText("Beta Event 1");
      await expect(page.locator(".board-interaction")).not.toHaveAttribute("inert", "");
      await page.getByRole("button",{name:"Taskを追加",exact:true}).click();await page.getByRole("region",{name:"Task一覧"}).getByRole("textbox",{name:"名前",exact:true}).fill("New connection input");await page.keyboard.press("Escape");
      assert.deepEqual(errors,[]);
      results.push({theme,passed:true,sameFileRepeated:true,nondefaultEventAndStory:true,detailCancelKeepsTask:true,saveFailureRetry:true,originalFileSavedOnce:true,otherFileUntouched:true,projectFocusTabEscapeDiscard:true,staleMissingReadOnlyAndRestore:true,errors});
      console.log(`${theme}: reconnection input protection passed`);
    } finally {unsubs.forEach(unsubscribe=>unsubscribe());await page.close();await rm(root,{recursive:true,force:true});}
  }
  await mkdir("artifacts/reconnection-drafts",{recursive:true});
  await writeFile("artifacts/reconnection-drafts/browser-results.json",JSON.stringify({verifiedAt:new Date().toISOString(),browser:browser.version(),results},null,2)+"\n");
} finally {await browser.close();await rm(runtime,{recursive:true,force:true});}
