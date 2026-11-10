import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { build } from "vite";
import { chromium, expect } from "@playwright/test";

// REQ-022-S05..S09 / REQ-027-S03,S04: 実ビルドを操作する。ファイル保存はVS Code側で別途検証する。
const artifacts = resolve("artifacts/event-date-picker");
const fixtureDir = resolve(tmpdir(), "glitchboard-date-picker-fixture");
await mkdir(artifacts, { recursive: true });
await build({ configFile: resolve("packages/webview/vite.config.ts"), logLevel: "error", build: { outDir: fixtureDir, emptyOutDir: true, rollupOptions: { input: { fixture: resolve("scripts/fixtures/event-date-picker.tsx") } } } });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const timezoneId of ["Asia/Tokyo", "America/Los_Angeles"]) for (const theme of ["dark", "light"]) for (const surface of ["events", "fixture", "board"]) {
    console.log(timezoneId,theme,surface);
    const width = surface === "events" ? 240 : 1000;
    const context = await browser.newContext({ viewport: { width, height: 720 }, timezoneId });
    const page = await context.newPage(); page.setDefaultTimeout(5000);
    // 日本時間の年境界をローカルTZから独立して表示する。
    await page.clock.install({ time: new Date("2026-12-31T16:00:00Z") });
    const colors = theme === "dark" ? { fg: "#cccccc", bg: "#1f1f1f", border: "#454545", description: "#9d9d9d" } : { fg: "#333333", bg: "#ffffff", border: "#cccccc", description: "#616161" };
    const css = `:root{--vscode-font-family:-apple-system,BlinkMacSystemFont,sans-serif;--vscode-foreground:${colors.fg};--vscode-editor-background:${colors.bg};--vscode-panel-border:${colors.border};--vscode-descriptionForeground:${colors.description};--vscode-input-background:${colors.bg};--vscode-input-foreground:${colors.fg};--vscode-button-background:#0078d4;--vscode-button-foreground:#ffffff;--vscode-focusBorder:#007fd4;--vscode-errorForeground:#d13438}`;
    await page.route("http://datepicker.test/**", async route => {
      const name = new URL(route.request().url()).pathname.slice(1);
      if (!name) return route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>${css}</style></head><body data-surface="${surface}"><div id="root"></div><script type="module" src="/${surface}.js"></script></body></html>` });
      return route.fulfill({ contentType: name.endsWith("css") ? "text/css" : "text/javascript", body: await readFile(resolve(surface === "fixture" ? fixtureDir : "packages/extension/dist/webview", name)) });
    });
    await page.addInitScript(() => {
      window.requests = [];window.failSave = false;
      Object.defineProperty(HTMLInputElement.prototype, "showPicker", { value() { throw new DOMException("blocked", "SecurityError"); }, configurable: true });
      const snapshot = {version:1,projects:[{id:"11111111-1111-4111-8111-111111111111",name:"Alpha",color:"#123456",events:[{id:"22222222-2222-4222-8222-222222222222",name:"Release",due:"2026-11-10",stories:[]}]}],selectedEventId:"22222222-2222-4222-8222-222222222222",error:null,settings:{workdays_off:["sat","sun"],public_holidays:true},projectEntries:[]};
      window.acquireVsCodeApi = () => ({ postMessage(message) { window.requests.push(message);if(message.type === "ready") setTimeout(() => window.dispatchEvent(new MessageEvent("message", {data:{type:"snapshot",payload:snapshot}})),0);else if(message.requestId) setTimeout(() => window.dispatchEvent(new MessageEvent("message", {data:{type:"operationResult",requestId:message.requestId,payload:window.failSave?{ok:false,error:"検証用の保存失敗"}:{ok:true}}})),0); } });
      window.addEventListener("message", event => {if(event.data?.type === "fixtureAdd") window.requests.push(event.data);});
    });
    const errors = [];page.on("pageerror",e=>errors.push(e.message));
    await page.goto("http://datepicker.test/");
    if (surface === "board") {await page.getByRole("button",{name:"Releaseの詳細",exact:true}).click();await page.getByRole("button",{name:"編集",exact:true}).click();}
    else {await page.getByRole("button",{name:"Eventを追加",exact:true}).click();await page.getByLabel("名前",{exact:true}).fill("Calendar release");}
    const input = page.getByLabel("期限",{exact:true});
    const trigger = () => page.getByRole("button",{name:/^期限(?: |を選ぶ)/});
    const calendar = page.getByRole("dialog",{name:"期限のカレンダー",exact:true});
    const operations = () => page.evaluate(() => window.requests.filter(x=>["addEvent","editItem","fixtureAdd"].includes(x.type)));
    // Tabでボタンへ移動し、Enter/Spaceで開く。未選択は東京の当月。
    await input.focus();await page.keyboard.press("Tab");await expect(trigger()).toBeFocused();await page.keyboard.press("Enter");await expect(calendar).toBeVisible();
    if(surface !== "board") await expect(calendar).toContainText("2027年1月");
    else await expect(calendar.getByRole("button",{name:"2026-11-10",exact:true})).toHaveAttribute("aria-pressed","true");
    const bounds = async () => {const box=await calendar.boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=720,JSON.stringify(box));};
    await bounds();await page.keyboard.press("Escape");await expect(trigger()).toBeFocused();await expect(input).toBeVisible();
    await page.keyboard.press("Space");await expect(calendar).toBeVisible();await input.click();await expect(calendar).toHaveCount(0);
    // 明示入力から月・年境界、過去日・休日・祝日、うるう日を選択する。
    await input.fill("2026-12-31");await trigger().click();await page.getByRole("button",{name:"翌月",exact:true}).click();await page.getByRole("button",{name:"2027-01-01",exact:true}).click();await expect(input).toHaveValue("2027-01-01");
    await input.fill("2028-03-01");await trigger().click();await page.getByRole("button",{name:"前月",exact:true}).click();await page.getByRole("button",{name:"2028-02-29",exact:true}).click();await expect(input).toHaveValue("2028-02-29");
    await input.fill("2026-11-10");await trigger().click();await page.keyboard.press("ArrowRight");await page.keyboard.press("ArrowDown");await page.keyboard.press("Space");await expect(input).toHaveValue("2026-11-18");assert.equal((await operations()).length,0);
    // 画面端・スクロール。Portalがフォームのoverflowに切られない。
    await page.evaluate(() => {const form=document.querySelector(".date-picker").closest("form");form.style.marginTop="460px";form.style.overflow="auto";form.style.flexShrink="0";});
    await trigger().scrollIntoViewIfNeeded();await trigger().click();await bounds();await page.mouse.wheel(0,100);await page.waitForTimeout(100);await bounds();
    await page.keyboard.press("Escape");await page.evaluate(() => {const form=document.querySelector(".date-picker").closest("form");form.style.marginTop="";form.style.overflow="";form.style.flexShrink="";});await trigger().scrollIntoViewIfNeeded();
    await trigger().click();await expect(page.getByRole("button",{name:"2026-11-18",exact:true})).toBeFocused();
    assert.equal(await page.getByRole("button",{name:"2026-11-18",exact:true}).evaluate(n=>n.matches(":focus-visible")&&parseFloat(getComputedStyle(n).outlineWidth)>0),true);
    assert.notEqual(await page.getByRole("button",{name:"2026-11-18",exact:true}).evaluate(n=>getComputedStyle(n).backgroundColor),"rgba(0, 0, 0, 0)");
    if(timezoneId === "Asia/Tokyo") await page.screenshot({path:`${artifacts}/${surface}-${theme}-calendar.png`});
    await page.keyboard.press("Escape");
    const submit = page.getByRole("button",{name:surface === "board"?"保存":"追加",exact:true});
    await input.fill("");await input.press("Enter");await expect(calendar).toBeVisible();assert.equal((await operations()).length,0);await page.keyboard.press("Escape");
    await input.fill("2026-02-30");await submit.click();await expect(page.getByRole("alert")).toContainText("実在する日付");assert.equal((await operations()).length,0);
    await input.fill("2026-11-23");await trigger().click();await page.getByRole("button",{name:"2026-11-23",exact:true}).click();
    if(surface === "events" && timezoneId === "Asia/Tokyo") await page.screenshot({path:`${artifacts}/events-${theme}-form.png`});
    if(surface === "events") {await page.evaluate(()=>window.failSave=true);await submit.click();await expect(page.getByRole("alert")).toContainText("検証用の保存失敗");await expect(input).toHaveValue("2026-11-23");await expect(page.getByLabel("名前",{exact:true})).toHaveValue("Calendar release");await page.evaluate(()=>window.failSave=false);}
    await submit.click();await expect.poll(async()=> (await operations()).length).toBe(surface === "events"?2:1);
    const sent=(await operations()).at(-1);assert.equal(sent.patch?.due??sent.due,"2026-11-23");assert.deepEqual(errors,[]);
    results.push({timezoneId,theme,surface,passed:true,selectedDate:sent.patch?.due??sent.due});await context.close();
  }
  await writeFile(`${artifacts}/browser-results.json`,JSON.stringify({date:"2026-11-11",results},null,2));console.log(`${results.length} timezone/theme/surface combinations passed`);
} finally {await browser.close();}
