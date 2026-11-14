import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve, dirname, basename } from "node:path";
import { packagedReadme, readmeImageScale } from "./prepare-docs.mjs";

const root = resolve(process.argv[2] ?? ".");
const read = path => readFile(resolve(root, path), "utf8");
const readme = await read("README.md"), packaged = await read("packages/extension/README.md");
const extensionManifest = JSON.parse(await read("packages/extension/package.json"));
assert.equal(packaged, packagedReadme(readme, extensionManifest.version), "配布用 README が最新でない: npm run docs:prepare");
const manifest = JSON.parse(await read("package.json"));
assert.equal(await read("packages/extension/CHANGELOG.md"), await read("CHANGELOG.md"), "配布用の変更履歴が最新でない");
const publishedImageBase = `https://raw.githubusercontent.com/Glitch-Sound/glitchboard/v${extensionManifest.version}/packages/extension/media/readme/`;
assert.ok(packaged.includes(`<img src="${publishedImageBase}overview.png"`), "配布用画像は公開タグの HTTPS URL を使う");
assert.ok(packaged.includes(`<a href="${publishedImageBase}overview.png"`), "原寸へのリンクも公開画像へ向ける");
const capture = JSON.parse(await read("artifacts/readme/capture-results.json"));
assert.equal(capture.zoomLevel, 0); assert.equal(capture.appearance.fontSize, "13px");
assert.equal(capture.theme, "Default Dark Modern");
const overview = capture.captures.find(item => item.name === "overview");
assert.deepEqual(overview.surfaces, ["events", "board"], "全体画像は左の EVENT とメインを同時に含める");
assert.deepEqual(Object.keys(overview.regions).sort(), ["board", "events"]);
assert.ok(overview.regions.events.x < overview.regions.board.x);
for (const region of Object.values(overview.regions)) {
  assert.ok(region.width > 0 && region.height > 0);
  assert.ok(region.x >= overview.clip.x && region.y >= overview.clip.y);
  assert.ok(region.x + region.width <= overview.clip.x + overview.clip.width + 1);
  assert.ok(region.y + region.height <= overview.clip.y + overview.clip.height + 1);
}
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
    const ref = match[1];
    if (file === "packages/extension/README.md") assert.ok(ref.startsWith(publishedImageBase),"配布用の全画像を公開タグへ向ける");
    const path = /^https:\/\//.test(ref) ? resolve(root,"packages/extension/media/readme",basename(new URL(ref).pathname)) : resolve(dirname(resolve(root,file)),ref);
    if (/^https:\/\//.test(ref)) assert.equal(ref,publishedImageBase+basename(path),"配布用画像の URL は指定の公開タグに限定する");
    const png = await readFile(path);
    assert.equal(png.subarray(0,8).toString("hex"), "89504e470d0a1a0a", "実画像は PNG とする");
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    assert.equal(Number(match[2]), Math.floor(width * readmeImageScale), "画像の表示倍率が異なる");
    const evidence = capture.captures.find(item => item.name === basename(path,".png"));
    assert.ok(evidence); assert.equal(width, evidence.clip.width); assert.equal(height, evidence.clip.height);
    assert.equal(evidence.scale,"css"); assert.equal(evidence.resized,false); images++;
  }
  if (file === "packages/extension/README.md") {
    const pairs = [...text.matchAll(/<a href="([^\"]+)"><img src="([^\"]+)"/g)];
    assert.equal(pairs.length, 5);
    for (const pair of pairs) assert.equal(pair[1], pair[2], "原寸リンクを表示画像と同じ HTTPS URL にする");
  }
  for (const command of source.matchAll(/npm run ([\w:-]+)/g)) assert.ok(manifest.scripts[command[1]], `存在しないコマンド: ${command[0]}`);
}
assert.equal(images, 10, "ルートと配布用に同じ5画像を参照する");
const sample = "examples/readme-guide/";
for (const file of ["manage.yaml","projects/0001_Webサイト.yaml","projects/0002_記事制作.yaml","projects/0003_学習メモ.yaml"]) {
  assert.equal(await read(sample+file), await read("packages/extension/"+sample+file), `サンプルが不一致: ${file}`);
}
console.log(`文書検査成功: ローカル参照 ${links}、画像 ${images}、表示倍率 ${readmeImageScale}、サンプル4ファイル、コマンドと README 同期`);
