export type SafeLink =
  | { kind: "url"; target: string }
  | { kind: "file"; target: string };

/** REQ-028: http/httpsまたは管理リポジトリ内の相対パスだけを許可する。 */
export function classifyLinkTarget(target: string): SafeLink | null {
  const value = target.trim();
  if (!value || value.includes("\0")) return null;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:"
        ? { kind: "url", target: url.toString() }
        : null;
    } catch {
      return null;
    }
  }
  if (
    value.startsWith("/") ||
    value.startsWith("\\") ||
    value.includes("\\") ||
    /^[a-z][a-z0-9+.-]*:/i.test(value)
  )
    return null;
  const parts: string[] = [];
  for (const part of value.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (parts.length === 0) return null;
      parts.pop();
    } else parts.push(part);
  }
  return parts.length ? { kind: "file", target: parts.join("/") } : null;
}
