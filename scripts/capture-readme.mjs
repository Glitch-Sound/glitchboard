import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { parse } from "../packages/extension/node_modules/yaml/dist/index.js";

const repository = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(repository, "packages/extension/dist/webview");
const example = join(repository, "examples/readme-demo");
const artifacts = join(repository, "artifacts");
const manage = parse(await readFile(join(example, "manage.yaml"), "utf8"));
const projects = await Promise.all(
  manage.projects
    .filter((entry) => entry.load)
    .map(async (entry) => parse(await readFile(join(example, entry.file), "utf8"))),
);
const snapshot = {
  version: 1,
  projects,
  selectedEventId: projects[0].events[0].id,
  error: null,
  settings: manage.settings,
  projectEntries: manage.projects.map((entry, index) => ({
    ...entry,
    name: projects[index].name,
    color: projects[index].color,
  })),
};

const theme = `:root{--vscode-font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;--vscode-foreground:#d4d4d4;--vscode-editor-background:#181818;--vscode-sideBar-background:#202020;--vscode-panel-border:#353535;--vscode-descriptionForeground:#a3a3a3;--vscode-errorForeground:#f48771;--vscode-list-hoverBackground:#292f38;--vscode-list-activeSelectionBackground:#293e5b;--vscode-list-activeSelectionForeground:#fff;--vscode-button-secondaryBackground:#313131;--vscode-button-secondaryForeground:#d4d4d4;--vscode-menu-background:#252526;--vscode-menu-border:#454545;--vscode-widget-shadow:#0008;--vscode-focusBorder:#007fd4;--vscode-charts-blue:#4c8dff;--vscode-charts-red:#f48771;--vscode-charts-green:#4ebd91;--vscode-charts-yellow:#e5c76b;--vscode-progressBar-background:#4c8dff}`;
const shell = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#181818}body{display:grid;grid-template-columns:350px minmax(0,1fr)}.surface{display:flex;flex-direction:column;min-width:0;min-height:0;border-right:1px solid #353535}.caption{height:34px;flex:none;padding:8px 15px;border-bottom:1px solid #353535;background:#202020;color:#d4d4d4;font:12px -apple-system,BlinkMacSystemFont,sans-serif}iframe{display:block;width:100%;flex:1;min-height:0;border:0}</style></head><body><div class="surface"><div class="caption">GlitchBoard: EVENT一覧</div><iframe title="EVENT一覧" src="/events"></iframe></div><div class="surface"><div class="caption">GlitchBoard</div><iframe title="メインタブ" src="/board"></iframe></div></body></html>`;

const server = createServer(async (request, response) => {
  if (request.url === "/") {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(shell);
    return;
  }
  if (request.url === "/events" || request.url === "/board") {
    const surface = request.url.slice(1);
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>${theme}</style></head><body data-surface="${surface}"><div id="root"></div><script type="module" src="/${surface}.js"></script></body></html>`);
    return;
  }
  try {
    const file = join(dist, decodeURIComponent(request.url.slice(1)));
    const bytes = await readFile(file);
    response.setHeader(
      "content-type",
      extname(file) === ".css" ? "text/css" : "text/javascript",
    );
    response.end(bytes);
  } catch {
    response.writeHead(404).end();
  }
});

await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1000 },
    deviceScaleFactor: 1,
  });
  await page.addInitScript(() => {
    const RealDate = Date;
    const instant = "2026-11-06T03:00:00Z";
    window.Date = class extends RealDate {
      constructor(...args) {
        if (args.length) super(...args);
        else super(instant);
      }
      static now() {
        return RealDate.parse(instant);
      }
    };
    window.acquireVsCodeApi = () => ({ postMessage() {} });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const events = page.frame({ url: /\/events$/ });
  const board = page.frame({ url: /\/board$/ });
  if (!events || !board) throw new Error("画面を読み込めない");
  await events.getByText("読み込み中").waitFor();
  await board.getByRole("heading", { name: "GlitchBoard" }).waitFor();
  for (const frame of [events, board])
    await frame.evaluate(
      (payload) =>
        window.dispatchEvent(
          new MessageEvent("message", { data: { type: "snapshot", payload } }),
        ),
      snapshot,
    );
  await board.getByText("4.3pt/日").waitFor();
  await board.getByText("完了予測").waitFor();

  const capture = async (locator, name) =>
    locator.screenshot({ path: join(artifacts, name) });
  await page.screenshot({
    path: join(artifacts, "readme-board-full.png"),
    fullPage: false,
  });
  await capture(board.locator(".board-header"), "readme-header.png");
  await capture(board.locator(".timeline-panel"), "readme-timeline.png");
  await capture(board.locator(".event-summary"), "readme-event-summary.png");
  await capture(
    board.locator('.event-details > section[aria-label="Story一覧"]'),
    "readme-story-list.png",
  );
  await capture(
    board.locator('.event-details > section[aria-label="Task一覧"]'),
    "readme-task-list.png",
  );
  await capture(events.locator("body"), "readme-event-list.png");
  await events.getByRole("button", { name: "抽出条件" }).click();
  await capture(events.locator("body"), "readme-event-filters.png");
  await board.locator(".event-summary .detail-button").first().click();
  await capture(board.locator(".detail-panel"), "readme-detail-panel.png");
  process.stdout.write("README用の学習済み画面キャプチャ9枚を更新した。\n");
} finally {
  await browser.close();
  server.close();
}
