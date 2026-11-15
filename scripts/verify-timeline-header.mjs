import { timelineDimensions } from "../packages/webview/src/widgets/timeline/model/dimensions.ts";
const timelineMinimumOperationHeight=timelineDimensions.height.min;
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import { parse } from "../packages/extension/node_modules/yaml/dist/index.js";

const artifacts=resolve(process.env.GLITCHBOARD_HEADER_ARTIFACTS??"artifacts/timeline-header");await mkdir(artifacts,{recursive:true});
const manage=parse(await readFile("examples/readme-demo/manage.yaml","utf8"));
const source=parse(await readFile(resolve("examples/readme-demo",manage.projects[0].file),"utf8"));
const browser=await chromium.launch({headless:true});const results=[];
try{
 for(const theme of ["dark","light"]){
  const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route("http://header.test/**",async route=>{const name=new URL(route.request().url()).pathname.slice(1);if(!name)return route.fulfill({contentType:"text/html",body:`<!doctype html><html><head><link rel="stylesheet" href="/style.css"><style>:root{--vscode-font-family:Arial;--vscode-foreground:${theme==="dark"?"#d4d4d4":"#333"};--vscode-editor-background:${theme==="dark"?"#181818":"#fff"};--vscode-sideBar-background:${theme==="dark"?"#202020":"#f3f3f3"};--vscode-panel-border:#888;--vscode-descriptionForeground:${theme==="dark"?"#aaa":"#616161"};--vscode-focusBorder:#007fd4;--vscode-charts-blue:#4c8dff;--vscode-charts-red:#e35b5b;--vscode-charts-yellow:#e5c76b}</style></head><body><div id="root"></div><script type="module" src="/board.js"></script></body></html>`});return route.fulfill({contentType:name.endsWith("css")?"text/css":"text/javascript",body:await readFile(resolve("packages/extension/dist/webview",name))});});
  await page.addInitScript(({source,settings})=>{const projects=Array.from({length:16},(_,i)=>({...structuredClone(source),id:`00000000-0000-4000-8000-${String(i).padStart(12,"0")}`,name:`確認Project ${i+1}`,events:source.events.map((e,j)=>({...structuredClone(e),id:`10000000-0000-4000-8000-${String(i*100+j).padStart(12,"0")}`}))}));window.snapshot={version:1,projects,selectedEventId:projects[0].events[0].id,error:null,settings,projectEntries:projects.map((p,i)=>({file:`projects/${i}.yaml`,name:p.name,color:p.color,load:true}))};window.requests=[];window.acquireVsCodeApi=()=>({getState:()=>({}),setState:()=>{},postMessage(m){window.requests.push(m);if(m.type==="ready")setTimeout(()=>window.dispatchEvent(new MessageEvent("message",{data:{type:"snapshot",payload:window.snapshot}})),0);if(m.type==="saveTimelineLayout")setTimeout(()=>window.dispatchEvent(new MessageEvent("message",{data:{type:"timelineLayoutResult",requestId:m.requestId,ok:true}})),0);}});},{source,settings:manage.settings});
  await page.goto("http://header.test/");if(process.env.GLITCHBOARD_HEADER_NEGATIVE)await page.addStyleTag({content:".timeline-heading th{position:relative!important}"});if(process.env.GLITCHBOARD_CHART_HOVER_NEGATIVE)await page.addStyleTag({content:".required-chart:hover .chart-max{opacity:0!important}"});await expect(page.locator(".project-row")).toHaveCount(16);
  const panel=page.locator(".timeline-panel");
  const inspect=()=>page.evaluate(()=>{const p=document.querySelector(".timeline-panel"),h=document.querySelector(".timeline-heading th"),d=document.querySelector(".timeline-heading th[data-date]"),c=document.querySelector(".project-row td");return {top:p.getBoundingClientRect().top,header:h.getBoundingClientRect().top,date:d.getBoundingClientRect().top,dateX:d.getBoundingClientRect().left,cellX:c.getBoundingClientRect().left,scrollTop:p.scrollTop,background:getComputedStyle(h).backgroundColor,height:h.getBoundingClientRect().height};});
  // REQ-044-S01: 複数行を縦にスクロールしても見出しが固定される。
  await panel.evaluate(n=>n.scrollTop=350);await expect.poll(async()=>Math.abs((await inspect()).header-(await inspect()).top)).toBeLessThan(2);
  // REQ-046-S01: グラフは先頭、途中と末尾でも下端に留まる。
  const footer=()=>page.evaluate(()=>{const p=document.querySelector(".timeline-panel").getBoundingClientRect(),f=document.querySelector(".pace-row").getBoundingClientRect(),h=document.querySelector(".timeline-heading th").getBoundingClientRect(),chart=document.querySelector(".pace-row td").getBoundingClientRect(),first=document.querySelector(".timeline-heading th[data-date]").getBoundingClientRect(),last=[...document.querySelectorAll(".timeline-heading th[data-date]")].at(-1).getBoundingClientRect(),label=document.querySelector(".chart-max")?.getBoundingClientRect();return {panelBottom:p.bottom,top:f.top,bottom:f.bottom,headerBottom:h.bottom,chartLeft:chart.left,chartRight:chart.right,dateLeft:first.left,dateRight:last.right,labelTop:label?.top,labelBottom:label?.bottom};});
  // REQ-046-S01: ホバーでもラベルと線、描画サイズを保つ。
  const chart=page.locator(".required-chart"),label=page.locator(".chart-max");
  // REQ-017-S03: 最大値は枠と塗りを持たず、固定セルの背景に対して読める。
  const sampleLabel=()=>label.evaluate(element=>{
    const style=getComputedStyle(element),cell=getComputedStyle(element.closest("td"));
    const canvas=document.createElement("canvas");canvas.width=canvas.height=1;const ctx=canvas.getContext("2d");
    const rgba=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};
    const luminance=color=>rgba(color).slice(0,3).map(v=>{const c=v/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
    const a=luminance(style.color),b=luminance(cell.backgroundColor);
    const svg=element.closest(".required-chart").querySelector("svg"),rect=svg.getBoundingClientRect(),path=svg.querySelector(".required-step"),y=Math.min(...[...path.getAttribute("d").matchAll(/[ML][\d.]+,([\d.]+)/g)].map(m=>Number(m[1])));
    return {text:element.textContent,backgroundAlpha:rgba(style.backgroundColor)[3],border:[style.borderTopWidth,style.borderRightWidth,style.borderBottomWidth,style.borderLeftWidth],shadow:style.boxShadow,contrast:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05),labelBottom:element.getBoundingClientRect().bottom,lineTop:rect.top+y/svg.viewBox.baseVal.height*rect.height};
  });
  const labelSample=await sampleLabel();assert.equal(labelSample.backgroundAlpha,0);assert.deepEqual(labelSample.border,["0px","0px","0px","0px"]);assert.equal(labelSample.shadow,"none");assert.ok(labelSample.contrast>=4.5,JSON.stringify(labelSample));assert.ok(labelSample.labelBottom<labelSample.lineTop,JSON.stringify(labelSample));
  const labelText=await label.textContent();const chartHeight=await chart.evaluate(n=>n.getBoundingClientRect().height);
  const footerHeight=await page.locator(".pace-row").evaluate(n=>n.getBoundingClientRect().height);
  assert.equal(await chart.locator("svg").evaluate(n=>n.getBoundingClientRect().height),chartHeight);
  const pathBefore=await page.locator(".required-step").getAttribute("d");
  await chart.hover();await expect(label).toBeVisible();await expect(label).toHaveCSS("opacity","1");assert.equal(await label.textContent(),labelText);assert.equal(await chart.evaluate(n=>n.getBoundingClientRect().height),chartHeight);assert.equal(await page.locator(".required-step").getAttribute("d"),pathBefore);
  const hoverBounds=await footer();assert.ok(hoverBounds.labelTop>=hoverBounds.top&&hoverBounds.labelBottom<=hoverBounds.bottom);await page.mouse.move(0,0);

  for(const scroll of [0,350,99999]){await panel.evaluate((n,scroll)=>n.scrollTop=scroll,scroll);await expect.poll(async()=>Math.abs((await footer()).bottom-(await footer()).panelBottom)).toBeLessThan(2);const f=await footer();assert.ok(f.top>=f.headerBottom);assert.ok(f.labelTop===undefined||f.labelTop>=f.top);assert.ok(f.labelBottom===undefined||f.labelBottom<=f.bottom);assert.equal(await page.locator(".required-step").getAttribute("d"),pathBefore);}
  await panel.evaluate(n=>n.scrollTop=350);
  let g=await inspect();assert.ok(g.scrollTop>0);assert.ok(Math.abs(g.date-g.top)<2);assert.notEqual(g.background,"rgba(0, 0, 0, 0)");
  // REQ-044-S02: 狭幅、横スクロール、期間と寸法を変えても列が一致する。
  await page.setViewportSize({width:320,height:740});await panel.evaluate(n=>n.scrollLeft=90);g=await inspect();assert.ok(await panel.evaluate(n=>n.scrollLeft)>0);assert.ok(Math.abs(g.dateX-g.cellX)<1);
  await page.getByRole("separator",{name:"Project列幅",exact:true}).press("ArrowRight");await page.getByRole("button",{name:"月",exact:true}).click();await panel.evaluate(n=>n.scrollTop=400);g=await inspect();assert.ok(Math.abs(g.dateX-g.cellX)<1);assert.ok(Math.abs(g.header-g.top)<2);
  // REQ-046-S02: 横方向は日付全列とグラフの左右端が一致する。
  let f=await footer();assert.ok(Math.abs(f.chartLeft-f.dateLeft)<1);assert.ok(Math.abs(f.chartRight-f.dateRight)<1);
  await page.setViewportSize({width:1440,height:900});
  // REQ-044-S03: キーで移った行の操作は固定見出しの下に見える。
  await panel.evaluate(n=>n.scrollTop=400);const target=page.locator(".project-row").nth(2).locator(".project-drag-handle");await target.focus();await target.press("Tab");
  const focused=await page.evaluate(()=>{const r=document.activeElement.getBoundingClientRect(),h=document.querySelector(".timeline-heading th").getBoundingClientRect();return {top:r.top,headerBottom:h.bottom};});assert.ok(focused.top>=focused.headerBottom-1,JSON.stringify(focused));
  // REQ-031-S07 REQ-046-S03: 最小上部でも上下の固定部分と行操作を分離する。
  const split=page.getByRole("separator",{name:"タイムラインと詳細の高さ",exact:true});for(let i=0;i<20;i++)await split.press("ArrowUp");
  await panel.evaluate(n=>n.scrollTop=99999);await page.locator(".project-row").last().locator(".project-drag-handle").focus();await page.keyboard.press("Tab");
  f=await footer();const active=await page.evaluate(()=>{const r=document.activeElement.getBoundingClientRect();return {top:r.top,bottom:r.bottom};});assert.ok(active.top>=f.headerBottom-1&&active.bottom<=f.top+1,JSON.stringify({active,f}));
  await page.setViewportSize({width:1100,height:280});await expect.poll(async()=>{const f=await footer();return f.top-f.headerBottom;}).toBeGreaterThanOrEqual(timelineMinimumOperationHeight);
  await page.screenshot({path:`${artifacts}/${theme}-minimum.png`});await page.setViewportSize({width:1440,height:900});await split.press("Home");
  await page.screenshot({path:`${artifacts}/${theme}-scrolled.png`});
  // REQ-017-S01 REQ-017-S03: 学習中の通常文字も狭幅で同じ条件を満たす。
  await page.setViewportSize({width:320,height:740});await page.evaluate(()=>{for(const p of window.snapshot.projects)for(const e of p.events){for(const t of e.tasks??[])delete t.doneAt;for(const s of e.stories)for(const t of s.tasks)delete t.doneAt;}window.snapshot.version++;window.dispatchEvent(new MessageEvent("message",{data:{type:"snapshot",payload:window.snapshot}}));});
  await expect(page.locator(".chart-max-overload")).toHaveCount(0);const normalSample=await sampleLabel();assert.equal(normalSample.backgroundAlpha,0);assert.deepEqual(normalSample.border,["0px","0px","0px","0px"]);assert.ok(normalSample.contrast>=4.5,JSON.stringify(normalSample));assert.ok(normalSample.labelBottom<normalSample.lineTop);
  await chart.hover();await expect(label).toHaveCSS("opacity","1");const narrowBounds=await label.boundingBox(),footerBounds=await page.locator(".pace-row").boundingBox();assert.ok(narrowBounds.x>=footerBounds.x&&narrowBounds.x+narrowBounds.width<=footerBounds.x+footerBounds.width);await page.screenshot({path:`${artifacts}/${theme}-text-label-narrow.png`});await page.setViewportSize({width:1440,height:900});
  for(const count of [1,0]){await page.evaluate(count=>{window.snapshot.projects=window.snapshot.projects.slice(0,count);window.snapshot.projectEntries=window.snapshot.projectEntries.slice(0,count);window.snapshot.version++;window.dispatchEvent(new MessageEvent("message",{data:{type:"snapshot",payload:window.snapshot}}));},count);await expect(page.locator(".project-row")).toHaveCount(count);await page.getByRole("separator",{name:"Project列幅",exact:true}).focus();await expect(page.getByRole("separator",{name:"Project列幅",exact:true})).toBeInViewport();}
  assert.deepEqual(await page.evaluate(()=>window.requests.filter(r=>!["ready","saveTimelineLayout"].includes(r.type))),[]);assert.deepEqual(errors,[]);results.push({theme,vertical:true,horizontal:true,focus:true,counts:[16,1,0],fixedFooter:true,hover:true,chartHeight,footerHeight,labelSample,normalSample,passed:true});await page.close();
 }
 await writeFile(`${artifacts}/results.json`,JSON.stringify(results,null,2)+"\n");console.log(JSON.stringify(results));
}finally{await browser.close();}
