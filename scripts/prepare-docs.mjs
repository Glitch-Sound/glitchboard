import { readFile, writeFile, mkdir, copyFile, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// 通常のデスクトップ表示で画像間の文字の縮尺を揃える。
export const readmeImageScale = 0.85;
export function packagedReadme(source, version) {
  const end = source.indexOf("\n## 開発\n");
  if (end < 0) throw new Error("README の末尾に開発案内がない");
  const repository = `https://github.com/Glitch-Sound/glitchboard/blob/v${version}/packages/extension/`;
  const images = `https://raw.githubusercontent.com/Glitch-Sound/glitchboard/v${version}/packages/extension/media/readme/`;
  return source.slice(0, end).trimEnd()
    .replaceAll("packages/extension/media/readme/", images)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (all, label, path) => /^https:\/\//.test(path) ? all : `[${label}](${new URL(path, repository).href})`) + "\n";
}
export async function prepareDocs() {
  let readme = await readFile("README.md", "utf8");
  const images = [...readme.matchAll(/!\[([^\]]*)\]\((packages\/extension\/media\/readme\/[^)]+)\)|<a href="(packages\/extension\/media\/readme\/[^\"]+)"><img[^>]*alt="([^\"]*)"[^>]*><\/a>/g)];
  for (const match of images) {
    const path = match[2] ?? match[3], alt = match[1] ?? match[4];
    const png = await readFile(path), width = Math.floor(png.readUInt32BE(16) * readmeImageScale);
    readme = readme.replace(match[0], `<a href="${path}"><img src="${path}" width="${width}" alt="${alt}"></a>`);
  }
  const formatted = spawnSync("node_modules/.bin/biome", ["format", "--stdin-file-path=packages/extension/README.md"], { input: readme, encoding: "utf8" });
  if (formatted.status !== 0) throw new Error(formatted.stderr);
  readme = formatted.stdout;
  await writeFile("README.md", readme);
  const { version } = JSON.parse(await readFile("packages/extension/package.json", "utf8"));
  await writeFile("packages/extension/README.md", packagedReadme(readme, version));
  await copyFile("CHANGELOG.md", "packages/extension/CHANGELOG.md");
  const target = "packages/extension/examples/readme-guide";
  await rm(target, { recursive: true, force: true });
  for (const file of ["manage.yaml", "projects/0001_Webサイト.yaml", "projects/0002_記事制作.yaml", "projects/0003_学習メモ.yaml"]) {
    await mkdir(dirname(target + "/" + file), { recursive: true });
    await copyFile("examples/readme-guide/" + file, target + "/" + file);
  }
  console.log("利用者向け README とサンプルを配布用へ同期した");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepareDocs();
