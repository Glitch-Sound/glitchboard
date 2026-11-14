import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium, expect } from "@playwright/test";
import { readmeImageScale } from "./prepare-docs.mjs";
const require = createRequire(import.meta.resolve("@vscode/vsce"));
const MarkdownIt = require("markdown-it");
const markdown = new MarkdownIt({ html: true });
const root = resolve("."), output = resolve("artifacts/readme"); await mkdir(output,{recursive:true});
const contentWidth = 830, wideContentWidth = 1100;
const readme=await readFile("README.md","utf8");
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:960,height:900},deviceScaleFactor:1});
 await page.route("http://readme.test/**",async route=>{
  const path=decodeURIComponent(new URL(route.request().url()).pathname);
  if(path==="/")return route.fulfill({contentType:"text/html",body:`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>GlitchBoard README</title><style>body{margin:0;background:#fff;color:#24292f;font:16px/1.7 -apple-system,BlinkMacSystemFont,sans-serif}article{width:${contentWidth}px;margin:auto;padding:32px 0}h1,h2{line-height:1.4;border-bottom:1px solid #d0d7de;padding-bottom:8px}p{margin:16px 0}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%}th,td{border:1px solid #d0d7de;padding:8px;text-align:left}pre{padding:16px;background:#f6f8fa;overflow:auto}code{font-size:.9em}a{color:#0969da}</style></head><body><article>${markdown.render(readme)}</article></body></html>`});
  const file=resolve(root,"."+path);assert.ok(file.startsWith(root+"/"));
  return route.fulfill({body:await readFile(file),contentType:extname(file)===".png"?"image/png":"text/plain"});
 });
 await page.goto("http://readme.test/");await expect(page.locator("img")).toHaveCount(5);
 await expect.poll(()=>page.locator("img").evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0))).toBe(true);
 const images=await page.locator("img").evaluateAll(images=>images.map(image=>({src:image.getAttribute("src"),alt:image.alt,naturalWidth:image.naturalWidth,declaredWidth:Number(image.getAttribute("width")),displayWidth:image.getBoundingClientRect().width,scale:image.getBoundingClientRect().width/image.naturalWidth})));
 for(const entry of images){assert.ok(entry.alt);assert.equal(entry.declaredWidth,Math.floor(entry.naturalWidth*readmeImageScale));assert.equal(entry.displayWidth,Math.min(entry.declaredWidth,contentWidth),"指定倍率と本文幅に従って表示する");}
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),"本文の横はみ出し");
 await page.screenshot({path:resolve(output,"readme-preview.png"),fullPage:true});
 for(let index=0;index<images.length;index++)await page.locator("img").nth(index).screenshot({path:resolve(output,`rendered-${index+1}.png`)});
 await page.setViewportSize({width:1240,height:900});await page.locator("article").evaluate((node,width)=>node.style.width=`${width}px`,wideContentWidth);
 const wideImages=await page.locator("img").evaluateAll(images=>images.map(image=>({src:image.getAttribute("src"),displayWidth:image.getBoundingClientRect().width})));
 for(let index=0;index<images.length;index++)assert.equal(wideImages[index].displayWidth,Math.min(images[index].declaredWidth,wideContentWidth));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.locator("img").first().screenshot({path:resolve(output,"rendered-overview-wide.png")});
 await writeFile(resolve(output,"preview-results.json"),JSON.stringify({browser:browser.version(),viewport:960,contentWidth,images,wide:{viewport:1240,contentWidth:wideContentWidth,images:wideImages},passed:true,horizontalOverflow:false},null,2)+"\n");
 console.log("README 表示成功: 5画像が読込済み、共通指定倍率と本文幅への適合、横はみ出しなしを確認した");
}finally{await browser.close();}
