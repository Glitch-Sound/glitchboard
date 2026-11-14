import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve, dirname, basename } from "node:path";
import { packagedReadme, readmeImageScale } from "./prepare-docs.mjs";

const root = resolve(process.argv[2] ?? ".");
const read = path => readFile(resolve(root, path), "utf8");
const readme = await read("README.md"), packaged = await read("packages/extension/README.md");
assert.equal(packaged, packagedReadme(readme), "配布用 README が最新でない: npm run docs:prepare");
const manifest = JSON.parse(await read("package.json"));
const capture = JSON.parse(await read("artifacts/readme/capture-results.json"));
assert.equal(capture.zoomLevel, 0); assert.equal(capture.appearance.fontSize, "13px");
assert.equal(capture.theme, "Default Dark Modern");
let links = 0, images = 0;
for (const file of ["README.md", "DEVELOPMENT.md", "packages/extension/README.md"]) {
  const source = await read(file), text = source.replace(/```[\s\S]*?```/g, "");
  const refs = [...text.matchAll(/!?\[[^\]]*\]\(([^)\s]+)\)/g)].map(match => match[1]);
  refs.push(...[...text.matchAll(/\b(?:src|href)="([^\"]+)"/g)].map(match => match[1]));
  for (const ref of refs) {
    if (/^https:\/\//.test(ref)) continue;
    assert.ok(!/^https?:/.test(ref), `HTTPS 以外の外部リンク: ${ref}`);
    const path = resolve(dirname(resolve(root, file)), decodeURIComponent(ref.split("#")[0]));
    assert.ok(path.startsWith(root + "/"), `作業先外のリンク: ${ref}`);
    assert.ok((await stat(path)).isFile(), `${file}: リンク先がない: ${ref}`); links++;
  }
  for (const match of text.matchAll(/<img src="([^\"]+)" width="(\d+)" alt="([^\"]+)">/g)) {
    const path = resolve(dirname(resolve(root,file)),match[1]), png = await readFile(path);
    assert.equal(png.subarray(0,8).toString("hex"), "89504e470d0a1a0a", "実画像は PNG とする");
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    assert.equal(Number(match[2]), Math.floor(width * readmeImageScale), "画像の表示倍率が異なる");
    const evidence = capture.captures.find(item => item.name === basename(path,".png"));
    assert.ok(evidence); assert.equal(width, evidence.clip.width); assert.equal(height, evidence.clip.height);
    assert.equal(evidence.scale,"css"); assert.equal(evidence.resized,false); images++;
  }
  for (const command of source.matchAll(/npm run ([\w:-]+)/g)) assert.ok(manifest.scripts[command[1]], `存在しないコマンド: ${command[0]}`);
}
assert.equal(images, 10, "ルートと配布用に同じ5画像を参照する");
const sample = "examples/readme-guide/";
for (const file of ["manage.yaml","projects/0001_Webサイト.yaml","projects/0002_記事制作.yaml","projects/0003_学習メモ.yaml"]) {
  assert.equal(await read(sample+file), await read("packages/extension/"+sample+file), `サンプルが不一致: ${file}`);
}
console.log(`文書検査成功: ローカル参照 ${links}、画像 ${images}、表示倍率 ${readmeImageScale}、サンプル4ファイル、コマンドと README 同期`);
