import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "/tmp/glitchboard-performance");
const projectsDir = join(root, "projects");
const workspaceDir = join(root, "workspace");
await mkdir(projectsDir, { recursive: true });
await mkdir(join(workspaceDir, ".vscode"), { recursive: true });
const files = [];
let firstTaskId = "";
for (let projectIndex = 0; projectIndex < 5; projectIndex++) {
  const events = [];
  for (let eventIndex = 0; eventIndex < 20; eventIndex++) {
    const stories = [];
    for (let storyIndex = 0; storyIndex < 10; storyIndex++) {
      const tasks = [];
      for (let taskIndex = 0; taskIndex < 3; taskIndex++) {
        const id = randomUUID();
        if (!firstTaskId) firstTaskId = id;
        tasks.push(`          - id: ${id}\n            name: Task ${taskIndex + 1}\n            points: 3\n`);
      }
      stories.push(`      - id: ${randomUUID()}\n        name: Story ${storyIndex + 1}\n        tasks:\n${tasks.join("")}`);
    }
    const due = new Date(Date.UTC(2026, 10, 10 + (eventIndex % 20))).toISOString().slice(0, 10);
    events.push(`  - id: ${randomUUID()}\n    name: Event ${eventIndex + 1}\n    due: ${due}\n    stories:\n${stories.join("")}`);
  }
  const file = `projects/${String(projectIndex + 1).padStart(4, "0")}_project.yaml`;
  files.push(file);
  await writeFile(join(root, file), `id: ${randomUUID()}\nname: Project ${projectIndex + 1}\ncolor: '#4c8dff'\nevents:\n${events.join("")}`);
}
const managePath = join(root, "manage.yaml");
await writeFile(managePath, `settings:\n  workdays_off: [sat, sun]\n  public_holidays: true\nprojects:\n${files.map((file) => `  - file: ${file}\n    load: true\n`).join("")}`);
await writeFile(join(workspaceDir, ".vscode", "settings.json"), JSON.stringify({ "glitchboard.manageFile": managePath }, null, 2));
await writeFile(join(root, "manifest.json"), JSON.stringify({ root, workspaceDir, managePath, firstTaskId, projects: 5, events: 100, stories: 1000, tasks: 3000 }, null, 2));
process.stdout.write(`${root}\n`);
