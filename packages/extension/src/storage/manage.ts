import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { Document, parseDocument } from "yaml";
import {
  type Project,
  projectSchema,
} from "../../../shared/src/domain/index.js";
import {
  type Manage,
  manageSchema,
} from "../../../shared/src/domain/manage.js";
import { parseProjectYaml } from "./project.js";

function documentFrom(source: string, path: string): Document.Parsed {
  const document = parseDocument(source, { uniqueKeys: true });
  if (document.errors.length) {
    throw new Error(
      `${path}: ${document.errors.map((error) => error.message).join("; ")}`,
    );
  }
  return document;
}

function safeProjectPath(managePath: string, file: string): string {
  if (isAbsolute(file)) throw new Error(`絶対パスは指定できない: ${file}`);
  const root = dirname(resolve(managePath));
  const target = resolve(root, file);
  const rel = relative(root, target);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`)) {
    throw new Error(`管理ディレクトリ外のProject: ${file}`);
  }
  return target;
}

/** 読み込みを外したProjectでも抽出条件用の名前だけを取得する。 */
export async function readProjectName(
  managePath: string,
  file: string,
): Promise<string> {
  const path = safeProjectPath(managePath, file);
  const document = documentFrom(await readFile(path, "utf8"), path);
  const name = document.get("name");
  if (typeof name !== "string" || !name.trim())
    throw new Error(`${path}: Project名がない`);
  return name;
}

async function atomicWrite(path: string, content: string): Promise<void> {
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, content, { flag: "wx" });
  await rename(temp, path);
}

/** REQ-002/REQ-003/REQ-004: manage.yamlを基準に読込対象だけを解決する。 */
export async function loadManageFile(
  managePath: string,
): Promise<{ manage: Manage; loadedProjects: Project[] }> {
  if (!isAbsolute(managePath))
    throw new Error("manage.yamlには絶対パスを指定する");
  const source = await readFile(managePath, "utf8");
  const document = documentFrom(source, managePath);
  const manage = manageSchema.parse(document.toJS());
  const loadedProjects: Project[] = [];
  for (const entry of manage.projects) {
    if (!entry.load) continue;
    const path = safeProjectPath(managePath, entry.file);
    try {
      loadedProjects.push(parseProjectYaml(await readFile(path, "utf8")));
    } catch (error) {
      throw new Error(
        `${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return { manage, loadedProjects };
}

/** REQ-005: Project名からファイル名に使える安定した名前部分を作る。 */
export function projectSlug(name: string): string {
  return (
    name
      .normalize("NFC")
      .replace(/[\\/:*?"<>|\s\p{Cc}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

/** REQ-002/REQ-005: 最大の既存番号の次にProjectを追加する。 */
export async function createProject(
  managePath: string,
  name: string,
  color: string,
): Promise<string> {
  if (!isAbsolute(managePath))
    throw new Error("manage.yamlには絶対パスを指定する");
  const source = await readFile(managePath, "utf8");
  const document = documentFrom(source, managePath);
  const manage = manageSchema.parse(document.toJS());
  const projectsDir = join(dirname(managePath), "projects");
  await mkdir(projectsDir, { recursive: true });
  const diskFiles = await readdir(projectsDir);
  const paths = [...diskFiles, ...manage.projects.map((entry) => entry.file)];
  const numbers = paths.map((path) =>
    /(?:^|\/)\d{4}_[^/]+\.yaml$/.exec(path)
      ? Number(/(?:^|\/)(\d{4})_/.exec(path)?.[1])
      : 0,
  );
  const next = Math.max(0, ...numbers) + 1;
  if (next > 9999) throw new Error("Project番号の上限9999に達した");
  const file = `projects/${String(next).padStart(4, "0")}_${projectSlug(name)}.yaml`;
  const project = projectSchema.parse({
    id: randomUUID(),
    name,
    color,
    events: [],
  });
  const projectPath = safeProjectPath(managePath, file);
  const projectDocument = new Document(project);
  await writeFile(projectPath, String(projectDocument), { flag: "wx" });
  try {
    document.addIn(["projects"], { file, load: true });
    manageSchema.parse(document.toJS());
    await atomicWrite(managePath, String(document));
  } catch (error) {
    // Projectファイルは作成済みのため、呼出元が修復できるように場所を示す。
    throw new Error(
      `manage.yamlの更新に失敗した。作成済み: ${projectPath}; ${String(error)}`,
    );
  }
  return file;
}

/** REQ-003: 読込対象をmanage.yamlに保存する。 */
export async function setProjectLoaded(
  managePath: string,
  file: string,
  load: boolean,
): Promise<void> {
  if (!isAbsolute(managePath))
    throw new Error("manage.yamlには絶対パスを指定する");
  const source = await readFile(managePath, "utf8");
  const document = documentFrom(source, managePath);
  const manage = manageSchema.parse(document.toJS());
  const index = manage.projects.findIndex((entry) => entry.file === file);
  if (index < 0) throw new Error(`Projectが見つからない: ${file}`);
  document.setIn(["projects", index, "load"], load);
  manageSchema.parse(document.toJS());
  await atomicWrite(managePath, String(document));
}
