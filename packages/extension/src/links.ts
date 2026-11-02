import { dirname, relative, resolve, sep } from "node:path";
import { classifyLinkTarget } from "../../shared/src/domain/link.js";

/** REQ-028: 管理リポジトリ内のファイルかhttp/https URLをVS Codeのオープン処理に渡す。 */
export async function openLinkedTarget(
  managePath: string,
  target: string,
  openFile: (path: string) => void | Promise<void>,
  openUrl: (url: string) => void | Promise<void>,
): Promise<void> {
  const link = classifyLinkTarget(target);
  if (!link) throw new Error(`無効なリンク: ${target}`);
  if (link.kind === "url") return openUrl(link.target);
  const root = dirname(resolve(managePath));
  const path = resolve(root, link.target);
  const rel = relative(root, path);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`))
    throw new Error(`管理リポジトリ外のリンク: ${target}`);
  return openFile(path);
}
